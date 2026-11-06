import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {usProvisionalSlot,validUsIexProvisional} from '../lib/market-breadth/us-provisional-r1.mjs';
import {US_SIP_PREMARKET_KEY,US_SIP_PREMARKET_SOURCE,usSipPremarketSlot,
  US_SIP_PREMARKET_FILE,
  calculateUsSipPremarket,validUsSipPremarket,currentUsSipPremarket,
  usSipPublicPercentOnly} from '../lib/market-breadth/us-premarket-sip-r1.mjs';
import {collectUsSipPremarket,storedSipPremarketUniverse} from '../scripts/pc-writer/us-breadth-sip-premarket-cycle.mjs';
import {prepareUsSipPremarket,publishUsSipPremarket} from '../scripts/pc-writer/us-breadth-sip-premarket-publication.mjs';

test('SIP historical 15-minute embargo and DST, without modifying IEX regular slots',()=>{
  assert.equal(usSipPremarketSlot(Date.parse('2026-11-06T09:30:00Z')),null);
  assert.equal(usSipPremarketSlot(Date.parse('2026-11-06T09:31:00Z'))?.slotEndUtc,
    '2026-11-06T09:15:00.000Z'); // EST: 04:31 -> KST 18:31
  assert.equal(usSipPremarketSlot(Date.parse('2026-10-30T08:30:00Z')),null);
  assert.equal(usSipPremarketSlot(Date.parse('2026-10-30T08:31:00Z'))?.slotEndUtc,
    '2026-10-30T08:15:00.000Z'); // EDT: 04:31 -> KST 17:31
  assert.equal(usSipPremarketSlot(Date.parse('2026-11-06T14:45:00Z'))?.slotEndUtc,
    '2026-11-06T14:15:00.000Z');
  assert.equal(usSipPremarketSlot(Date.parse('2026-11-06T14:46:00Z')),null);
  assert.equal(usProvisionalSlot(Date.parse('2026-11-06T14:31:00Z')),null);
  assert.equal(usProvisionalSlot(Date.parse('2026-11-06T14:46:00Z'))?.slotEndUtc,
    '2026-11-06T14:45:00.000Z');
  for(const d of ['2026-11-07','2026-11-26','2026-12-25'])
    assert.equal(usSipPremarketSlot(Date.parse(d+'T09:31:00Z')),null);
});

test('SIP uses the newest saved membership at or before priorDate, never future or invalid snapshots',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'us-sip-universe-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  fs.mkdirSync(path.join(dir,'storage'));
  const db=new DatabaseSync(path.join(dir,'storage','core.sqlite'));
  const members=Array.from({length:503},(_,i)=>'T'+i);
  const insert=()=>db.prepare('INSERT INTO market_score_breadth_b1_r3_universe_v1(trade_date,members_json,member_count) VALUES (?,?,?)');
  db.exec('CREATE TABLE market_score_breadth_b1_r3_universe_v1(trade_date TEXT PRIMARY KEY,members_json TEXT NOT NULL,member_count INTEGER NOT NULL)');
  insert().run('2026-11-04',JSON.stringify(members),members.length);
  insert().run('2026-11-07',JSON.stringify(members),members.length);
  const fallback=storedSipPremarketUniverse(dir,'2026-11-05');
  assert.deepEqual(fallback,{members,universeAsOfDate:'2026-11-04'});
  assert.equal(fallback.members.length,503);
  assert.throws(()=>storedSipPremarketUniverse(dir,'2026-11-03'),/US_PROVISIONAL_UNIVERSE_MISSING/);
  insert().run('2026-11-05',JSON.stringify(members),members.length);
  assert.deepEqual(storedSipPremarketUniverse(dir,'2026-11-05'),{
    members,universeAsOfDate:'2026-11-05'});
  db.prepare('DELETE FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date=?').run('2026-11-05');
  db.prepare('UPDATE market_score_breadth_b1_r3_universe_v1 SET member_count=? WHERE trade_date=?')
    .run(502,'2026-11-04');
  assert.throws(()=>storedSipPremarketUniverse(dir,'2026-11-05'),/US_PROVISIONAL_UNIVERSE_INVALID/);
  db.close();
});

test('SIP collection preserves prior closing-price date when membership falls back',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'us-sip-fallback-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  fs.mkdirSync(path.join(dir,'storage'));
  const db=new DatabaseSync(path.join(dir,'storage','core.sqlite'));
  db.exec('CREATE TABLE market_score_breadth_b1_r3_universe_v1(trade_date TEXT PRIMARY KEY,members_json TEXT NOT NULL,member_count INTEGER NOT NULL)');
  const members=Array.from({length:503},(_,i)=>'T'+i);
  db.prepare('INSERT INTO market_score_breadth_b1_r3_universe_v1 VALUES (?,?,?)')
    .run('2026-11-04',JSON.stringify(members),members.length);
  db.close();
  const priorBars=Object.fromEntries(members.map(s=>[s,[{t:'2026-11-05T05:00:00Z',c:100,v:1}]]));
  const sipBars=Object.fromEntries(members.map(s=>[s,[{t:'2026-11-06T09:00:00Z',c:101,v:1}]]));
  const urls=[];
  const fetchImpl=async url=>{
    const q=new URL(url).searchParams;
    urls.push(q);
    assert.equal(q.get('feed'),'sip');
    if(q.get('timeframe')==='1Day'){
      assert.equal(q.get('start'),'2026-11-05T00:00:00Z');
      assert.equal(q.get('end'),'2026-11-06T00:00:00Z');
    }
    return {ok:true,status:200,json:async()=>({bars:q.get('timeframe')==='1Day'?priorBars:sipBars,
      next_page_token:null})};
  };
  const result=await collectUsSipPremarket(dir,{now:Date.parse('2026-11-06T09:31:00Z'),
    fetchImpl,authOverride:{APCA_API_KEY_ID:'fixture',APCA_API_SECRET_KEY:'fixture'}});
  assert.equal(result.status,'LOCAL_READY');
  assert.equal(result.universeAsOfDate,'2026-11-04');
  assert.equal(result.observedCount,503);
  assert.equal(result.providerCalls,2);
  assert.equal(urls.length,2);
  const state=JSON.parse(fs.readFileSync(path.join(dir,US_SIP_PREMARKET_FILE),'utf8'));
  assert.equal(state.raw.universeAsOfDate,'2026-11-04');
  assert.equal(state.raw.priorDate,'2026-11-05');
  assert.equal(state.raw.observationDate,'2026-11-06');
  assert.deepEqual(state.output.counts,{rising:503,unchanged:0,falling:0});
  assert.equal(Object.hasOwn(usSipPublicPercentOnly(state.output),'universeAsOfDate'),false);
});

test('historical SIP calls are page-limited; persist privately; publish only the SIP key',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'us-sip-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const oldIex='{"sentinel":"original IEX protected"}';
  const iexPath=path.join(dir,'local-us-breadth-iex-provisional.json');
  fs.writeFileSync(iexPath,oldIex);
  const members=Array.from({length:503},(_,i)=>'T'+i);
  const previous=Object.fromEntries(members.map(s=>[s,[{t:'2026-11-05T05:00:00Z',c:100,v:1}]]));
  const current=Object.fromEntries(members.slice(0,5).map((s,i)=>[s,[
    {t:'2026-11-06T09:00:00Z',c:i<3?101:99,v:1}]]));
  const urls=[];
  const fetchImpl=async url=>{
    urls.push(String(url));
    const params=new URL(url).searchParams;
    assert.equal(params.get('feed'),'sip');
    assert.equal(params.get('adjustment'),'split');
    if(params.get('timeframe')==='15Min'){
      assert.equal(params.get('end'),'2026-11-06T09:15:00.000Z');
    }
    return {ok:true,status:200,json:async()=>({bars:params.get('timeframe')==='1Day'?previous:current,
      next_page_token:null})};
  };
  const now=Date.parse('2026-11-06T09:31:00Z');
  const opts={now,fetchImpl,membersOverride:members,
    authOverride:{APCA_API_KEY_ID:'fixture',APCA_API_SECRET_KEY:'fixture'}};
  const result=await collectUsSipPremarket(dir,opts);
  assert.equal(result.status,'LOCAL_READY');
  assert.equal(result.providerCalls,2);
  assert.equal(fs.readFileSync(iexPath,'utf8'),oldIex);
  const state=JSON.parse(fs.readFileSync(path.join(dir,US_SIP_PREMARKET_FILE),'utf8'));
  assert.equal(state.raw.currentBars.T0.c,101);
  assert.equal(state.output.missingCount,498);
  assert.equal(state.output.counts.rising,3);
  assert.equal((await collectUsSipPremarket(dir,opts)).status,'ALREADY_ATTEMPTED_THIS_SLOT');
  assert.equal(urls.length,2);
  const prepared=prepareUsSipPremarket(dir,{now});
  assert.equal(prepared.prepared,true);
  const rows=new Map();
  const remote={async query(_db,_sql,[key]){const row=rows.get(key);return {results:row?[row]:[]};},
    async request(_db,statements){for(const {params} of statements){
      const [key,body,stored_at,prevAt,prevBody]=params;
      assert.equal(key,US_SIP_PREMARKET_KEY);
      const old=rows.get(key);
      if(!old||(old.stored_at===prevAt&&old.body===prevBody))rows.set(key,{body,stored_at});
    }}};
  assert.equal((await publishUsSipPremarket(remote,'core',prepared,{now})).status,'VERIFIED');
  assert.equal((await publishUsSipPremarket(remote,'core',prepared,{now})).status,'ALREADY_VERIFIED');
  assert.deepEqual([...rows.keys()],[US_SIP_PREMARKET_KEY]);
  assert.equal(fs.readFileSync(iexPath,'utf8'),oldIex);
});

test('SIP provider access denial is explicit, one attempt per slot and no IEX mutation',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'us-sip-denied-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const members=Array.from({length:503},(_,i)=>'T'+i);
  let calls=0;
  const opts={now:Date.parse('2026-11-06T09:31:00Z'),membersOverride:members,
    authOverride:{APCA_API_KEY_ID:'fixture',APCA_API_SECRET_KEY:'fixture'},
    fetchImpl:async()=>{calls++;return {ok:false,status:403};}};
  const failed=await collectUsSipPremarket(dir,opts);
  assert.equal(failed.status,'SIP_ACCESS_DENIED');
  assert.equal(failed.code,'US_PROVISIONAL_HTTP_403');
  assert.equal(failed.providerCalls,1);
  assert.equal((await collectUsSipPremarket(dir,opts)).status,'ALREADY_ATTEMPTED_THIS_SLOT');
  assert.equal(calls,1);
  assert.equal(prepareUsSipPremarket(dir,{now:opts.now}).prepared,false);
});

test('SIP source and sidecar are independent; missing premarket members remain missing',()=>{
  const members=Array.from({length:503},(_,i)=>'T'+i);
  const referenceBars=Object.fromEntries(members.map(s=>[s,{t:'2026-11-05T05:00:00Z',c:100,v:1}]));
  const currentBars=Object.fromEntries(members.slice(0,100).map((s,i)=>[s,
    {t:'2026-11-06T09:00:00Z',c:i<40?101:i<60?99:100,v:1}]));
  const now=Date.parse('2026-11-06T09:31:00Z');
  const slot=usSipPremarketSlot(now);
  const record=calculateUsSipPremarket({...slot,members,referenceBars,currentBars,
    collectedAt:new Date(now).toISOString(),referencePageComplete:true,
    currentPageComplete:true});
  assert.equal(US_SIP_PREMARKET_KEY,'public:market-breadth-premarket-sip-r1:usa');
  assert.equal(record.source,US_SIP_PREMARKET_SOURCE);
  assert.deepEqual(record.counts,{rising:40,unchanged:40,falling:20});
  assert.equal(record.missingCount,403);
  assert.equal(validUsSipPremarket(record),true);
  assert.equal(validUsIexProvisional(record),false);
  assert.equal(currentUsSipPremarket(record,now),true);
  assert.equal(currentUsSipPremarket(record,Date.parse('2026-11-07T09:31:00Z')),false);
  const pub=usSipPublicPercentOnly(record);
  assert.equal(pub.source,US_SIP_PREMARKET_SOURCE);
  assert.ok(Math.abs(pub.unobservedPct-403/503*100)<1e-9);
  assert.equal(Object.hasOwn(pub,'counts'),false);
  assert.equal(Object.hasOwn(pub,'currentBars'),false);
  assert.equal(validUsSipPremarket({...record,missingCount:0}),false);
});
