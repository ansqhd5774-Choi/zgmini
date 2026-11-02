import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {collectUsBreadthProvisional,fetchIexWindow,US_PROVISIONAL_FILE} from '../scripts/pc-writer/us-breadth-provisional-cycle.mjs';
import {calculateUsIexProvisional,currentUsIexProvisional,usProvisionalSlot,validUsIexProvisional,
  usIexPublicPercentOnly,
  US_BREADTH_PROVISIONAL_KEY} from '../lib/market-breadth/us-provisional-r1.mjs';
import {prepareUsProvisional,publishUsProvisional} from '../scripts/pc-writer/us-breadth-provisional-publication.mjs';

const members=Array.from({length:503},(_,i)=>'T'+i);
const at=Date.parse('2026-10-30T14:01:00Z'); // NY Friday 10:01; 10:00 bar just closed.
const previous=Object.fromEntries(members.map(t=>[t,[{t:'2026-10-29T04:00:00Z',c:100,v:10}]]));
const current=Object.fromEntries(members.slice(0,100).map((t,i)=>[t,[
  {t:'2026-10-30T13:45:00Z',c:i<60?101:i<90?99:100,v:10}]]));
const auth={APCA_API_KEY_ID:'fixture',APCA_API_SECRET_KEY:'fixture'};

function provider({partial=false,failCurrent=false}={}){
  const calls=[];
  const fetchImpl=async url=>{
    const p=new URL(url).searchParams,tf=p.get('timeframe');calls.push(tf);
    if(tf==='15Min'&&failCurrent)throw Error('EXTERNAL_UNAVAILABLE');
    return {ok:true,async json(){return {bars:tf==='1Day'?previous:current,
      next_page_token:tf==='15Min'&&partial?'unfinished':null};}};
  };
  return {fetchImpl,calls};
}

test('only 15-minute completed NY sessions collect; weekend, holiday and preopen skip',()=>{
  assert.equal(usProvisionalSlot(Date.parse('2026-11-01T16:00:00Z')),null);
  assert.equal(usProvisionalSlot(Date.parse('2026-12-25T16:00:00Z')),null);
  assert.equal(usProvisionalSlot(Date.parse('2026-10-30T13:44:00Z')),null);
  assert.equal(usProvisionalSlot(Date.parse('2026-10-30T13:45:00Z')),null);
  assert.equal(usProvisionalSlot(at).slotEndUtc,'2026-10-30T14:00:00.000Z');
  assert.equal(usProvisionalSlot(Date.parse('2026-12-01T15:01:00Z')).sessionStartUtc,
    '2026-12-01T14:30:00.000Z'); // DST transition safe
  assert.equal(usProvisionalSlot(Date.parse('2026-10-30T20:16:00Z')),null);
});

test('NYSE published 1 p.m. cash-equity early close stops IEX provisional slots after the final settled bar',()=>{
  // Nov 27 2026 (EST), Dec 24 2026 (EST): official NYSE early-close dates.
  for(const date of ['2026-11-27','2026-12-24']){
    const last=usProvisionalSlot(Date.parse(`${date}T18:01:00Z`));
    assert.equal(last?.slotEndUtc,`${date}T18:00:00.000Z`);
    assert.equal(usProvisionalSlot(Date.parse(`${date}T18:15:00Z`)),null);
    assert.equal(usProvisionalSlot(Date.parse(`${date}T19:01:00Z`)),null);
  }
  // July 3, 2028 early close is in daylight saving time, 17:00 UTC.
  assert.equal(usProvisionalSlot(Date.parse('2028-07-03T17:01:00Z'))?.slotEndUtc,
    '2028-07-03T17:00:00.000Z');
  assert.equal(usProvisionalSlot(Date.parse('2028-07-03T17:15:00Z')),null);
  assert.equal(usProvisionalSlot(Date.parse('2026-11-30T19:01:00Z'))?.slotEndUtc,
    '2026-11-30T19:00:00.000Z'); // Regular Monday remains open.
});

test('100/503 IEX observations are valid; 403 remain missing, never unchanged',()=>{
  const raw={members,priorDate:'2026-10-29',observationDate:'2026-10-30',
    sessionStartUtc:'2026-10-30T13:30:00Z',slotEndUtc:'2026-10-30T14:00:00Z',
    collectedAt:'2026-10-30T14:01:00Z',referencePageComplete:true,currentPageComplete:true,
    referenceBars:Object.fromEntries(Object.entries(previous).map(([k,v])=>[k,v[0]])),
    currentBars:Object.fromEntries(Object.entries(current).map(([k,v])=>[k,v[0]]))};
  const record=calculateUsIexProvisional(raw);
  assert.deepEqual(record.counts,{rising:60,unchanged:10,falling:30});
  assert.equal(record.observedCount,100);
  assert.equal(record.missingCount,403);
  assert.equal(record.coverage,100/503);
  assert.equal(record.status,'PROVISIONAL');
  assert.equal(validUsIexProvisional(record),true);
  const publicView=usIexPublicPercentOnly(record);
  assert.equal(publicView.phase,'PROVISIONAL');
  assert.ok(Math.abs(publicView.risingPct-60/503*100)<1e-9);
  assert.ok(Math.abs(publicView.fallingPct-30/503*100)<1e-9);
  assert.ok(Math.abs(publicView.unchangedPct-10/503*100)<1e-9);
  assert.ok(Math.abs(publicView.unobservedPct-403/503*100)<1e-9);
  assert.ok(Math.abs(publicView.risingPct+publicView.fallingPct+
    publicView.unchangedPct+publicView.unobservedPct-100)<1e-9);
  for(const excluded of ['expectedCount','counts','observedCount','missingCount',
    'sessionPriceObservedCount','referenceObservedCount','coverage'])
    assert.equal(Object.hasOwn(publicView,excluded),false,excluded);
  assert.equal(usIexPublicPercentOnly({...record,observedCount:503}),null);
  assert.equal(currentUsIexProvisional(record,at+60_000),true);
  assert.equal(currentUsIexProvisional(record,at+3_600_000),false);
  assert.equal(validUsIexProvisional({...record,missingCount:0}),false);
});

test('paginated collection continues by token and reports bounded incomplete pagination',async()=>{
  let call=0;
  const r=await fetchIexWindow({symbols:['T0','T1'],timeframe:'15Min',start:'2026-10-30T13:30:00Z',
    end:'2026-10-30T14:00:00Z',auth,fetchImpl:async url=>{
      const token=new URL(url).searchParams.get('page_token');call++;
      return {ok:true,json:async()=>({bars:token?{T1:current.T1}:{T0:current.T0},
        next_page_token:token?null:'next'})};
    },maxRequests:2});
  assert.equal(call,2);assert.equal(r.pageComplete,true);
  assert.deepEqual(Object.keys(r.bars).sort(),['T0','T1']);
  const short=await fetchIexWindow({symbols:['T0'],timeframe:'15Min',start:'a',end:'b',auth,
    fetchImpl:async()=>({ok:true,json:async()=>({bars:{T0:current.T0},next_page_token:'unfinished'})}),
    maxRequests:1});
  assert.equal(short.pageComplete,false);
});

test('Alpaca inclusive end cannot overwrite last completed 15-minute bar with an unfinished bar',async()=>{
  const finished={t:'2026-10-30T13:45:00Z',c:101,v:10};
  const unfinished={t:'2026-10-30T14:00:00Z',c:999,v:1};
  let calls=0;
  const result=await fetchIexWindow({symbols:['T0'],timeframe:'15Min',
    start:'2026-10-30T13:30:00Z',end:'2026-10-30T14:00:00Z',auth,
    maxRequests:1,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({
      bars:{T0:[finished,unfinished]},next_page_token:null})};}});
  assert.equal(calls,1);
  assert.equal(result.pageComplete,true);
  assert.deepEqual(result.bars.T0,finished);
});

test('one rolling PC sidecar stores raw first, calculates separately, gates 15m repeats',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'us-iex-r17-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const first=provider();
  const result=await collectUsBreadthProvisional(dir,{now:at,fetchImpl:first.fetchImpl,
    membersOverride:members,authOverride:auth});
  assert.equal(result.status,'LOCAL_READY');
  assert.deepEqual(first.calls,['1Day','15Min']);
  const stored=JSON.parse(fs.readFileSync(path.join(dir,US_PROVISIONAL_FILE),'utf8'));
  assert.equal(stored.raw.members.length,503);
  assert.deepEqual(stored.output.counts,{rising:60,unchanged:10,falling:30});
  assert.equal(stored.output.missingCount,403);
  const repeat=await collectUsBreadthProvisional(dir,{now:at+60_000,fetchImpl:first.fetchImpl,
    membersOverride:members,authOverride:auth});
  assert.equal(repeat.status,'ALREADY_ATTEMPTED_THIS_SLOT');
  assert.equal(first.calls.length,2);
  const next=provider();
  await collectUsBreadthProvisional(dir,{now:at+15*60_000,fetchImpl:next.fetchImpl,
    membersOverride:members,authOverride:auth});
  assert.deepEqual(next.calls,['15Min']); // unchanged prior IEX baseline is reused
});

test('partial pages are labelled, failures preserve the last count without 5m retries',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'us-iex-r17-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const p=provider({partial:true});
  const partial=await collectUsBreadthProvisional(dir,{now:at,fetchImpl:p.fetchImpl,
    membersOverride:members,authOverride:auth,maxRequests:2});
  assert.equal(partial.status,'LOCAL_READY');
  assert.equal(partial.collectionStatus,'INCOMPLETE_PAGINATION');
  const original=prepareUsProvisional(dir,{now:at+60_000}).body;
  const bad=provider({failCurrent:true});
  const failed=await collectUsBreadthProvisional(dir,{now:at+15*60_000,fetchImpl:bad.fetchImpl,
    membersOverride:members,authOverride:auth});
  assert.equal(failed.status,'FAILED_PREVIOUS_PROVISIONAL_PRESERVED');
  assert.deepEqual(prepareUsProvisional(dir,{now:at+16*60_000}).body,original);
  const retry=await collectUsBreadthProvisional(dir,{now:at+17*60_000,fetchImpl:bad.fetchImpl,
    membersOverride:members,authOverride:auth});
  assert.equal(retry.status,'ALREADY_ATTEMPTED_THIS_SLOT');
});

test('provisional D1 publication only touches distinct key with readback and monotonic slot',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'us-iex-r17-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const p=provider();
  await collectUsBreadthProvisional(dir,{now:at,fetchImpl:p.fetchImpl,
    membersOverride:members,authOverride:auth});
  const prepared=prepareUsProvisional(dir,{now:at+60_000});
  assert.equal(prepared.prepared,true);
  assert.equal(prepared.body.observedCount,100);
  const rows=new Map();
  const remote={async query(_db,_sql,[key]){const row=rows.get(key);return {results:row?[row]:[]};},
    async request(_db,statements){for(const {params} of statements){
      const [key,body,stored_at,priorAt,priorBody]=params;
      assert.equal(key,US_BREADTH_PROVISIONAL_KEY);
      const old=rows.get(key);
      if(!old||(old.stored_at===priorAt&&old.body===priorBody))rows.set(key,{body,stored_at});
    }}};
  const result=await publishUsProvisional(remote,'core',prepared,{now:at+60_000});
  assert.equal(result.status,'VERIFIED');
  assert.equal(rows.size,1);
  assert.equal((await publishUsProvisional(remote,'core',prepared,{now:at+120_000})).status,'ALREADY_VERIFIED');
  assert.equal(prepareUsProvisional(dir,{now:at+3_600_000}).prepared,false);
});
