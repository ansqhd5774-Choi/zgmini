import test from 'node:test';
import assert from 'node:assert/strict';
import {probeProvider,validatePreview,SPACE_CANDIDATES} from '../scripts/pc-writer/theme-space-satellite-r12-provider-probe.mjs';

function fakeFetch({missing=[],bad=[]}={}){
  const calls=[];
  const fetchImpl=async url=>{
    const u=new URL(String(url)),ticker=u.searchParams.get('prefix')||
      u.pathname.match(/\/stocks\/([A-Z0-9.-]+)\/1h$/)?.[1];
    calls.push({path:u.pathname,query:Object.fromEntries(u.searchParams),ticker});
    const index=u.pathname.endsWith('/symbols');
    const data=index?{count:1,symbols:missing.includes(ticker)?[]:[{
      symbol:ticker,rows:70,first_timestamp:'2026-07-01T13:00:00Z',
      last_timestamp:'2026-10-23T20:00:00Z'}]}:{count:1,bars:[{
        symbol:bad.includes(ticker)?'WRONG':ticker,
        timestamp:'2026-10-23T13:00:00Z',close:12.5,is_gap:false}]};
    return {ok:true,status:200,text:async()=>JSON.stringify(data),
      headers:{get:key=>key==='x-data-through'?'2026-10-23T20:00:00Z':null}};
  };
  return {calls,fetchImpl};
}

test('R12 existing nine symbols are candidates, no two/three basket cap',async()=>{
  assert.equal(SPACE_CANDIDATES.length,9);
  const f=fakeFetch();const r=await probeProvider({symbols:SPACE_CANDIDATES,fetchImpl:f.fetchImpl});
  assert.equal(r.candidateCount,9);
  assert.equal(r.availabilityCount,9);
  assert.equal(r.providerCalls,18);
  assert.equal(f.calls.filter(c=>c.path.endsWith('symbols')).length,9);
  assert.ok(f.calls.filter(c=>c.path.endsWith('symbols')).every(c=>c.query.timeframe==='1m'));
  assert.ok(f.calls.filter(c=>c.path.includes('/bars/')).every(c=>c.query.limit==='3'&&c.path.endsWith('/1h')));
  assert.equal(r.rawFilesWritten,0);assert.equal(r.publicationAuthorized,false);
  assert.equal(r.sharedSpyCommonDatesAudited,false);
});

test('R12 preserves arbitrary candidate count: 1,2,4,9,25',async()=>{
  for(const n of [1,2,4,9,25]){
    const syms=Array.from({length:n},(_,i)=>`ETF${i}`);
    const r=await probeProvider({symbols:syms,fetchImpl:fakeFetch().fetchImpl});
    assert.equal(r.records.length,n);assert.equal(r.availabilityCount,n);
  }
});

test('R12 catalog listed and bar probe are distinct, no fallback fabricated',async()=>{
  const f=fakeFetch({missing:['MARS'],bad:['DIPR']});
  const r=await probeProvider({symbols:['MARS','DIPR','WSPC'],fetchImpl:f.fetchImpl});
  assert.deepEqual(r.records.map(x=>x.stage),
    ['NOT_IN_LIVE_CATALOG','PROBE_ERROR','LIVE_FREE_1H_PREVIEW_PASS']);
  assert.equal(r.providerCalls,5);
  assert.equal(r.availabilityCount,1);
  assert.equal(r.r2ScoresVerified,false);
});

test('R12 missing/non-trade only bars do not count as verified observations',()=>{
  const cat={symbol:'WSPC',rows:1,first_timestamp:'2026-10-23T13:00:00Z',
    last_timestamp:'2026-10-23T14:00:00Z'};
  const empty=validatePreview({ticker:'WSPC',date:'2026-10-23',catalog:cat,
    preview:{count:1,bars:[{symbol:'WSPC',timestamp:'2026-10-23T13:00:00Z',close:1,is_gap:true}]},through:null});
  assert.equal(empty.stage,'NO_NONGAP_1H_ON_LAST_UTC_DATE');
  assert.throws(()=>validatePreview({ticker:'WSPC',date:'2026-10-23',catalog:cat,
    preview:{count:1,bars:[{symbol:'WSPC',timestamp:'2026-10-22T13:00:00Z',close:1,is_gap:false}]},through:null}),/R12_PREVIEW_BAR_INVALID/);
});

test('R12 rejects duplicate or invalid tickers before any request',async()=>{
  for(const symbols of [[],['UFO','UFO'],['foo'],['ABC/DEF']]){
    const f=fakeFetch();
    await assert.rejects(probeProvider({symbols,fetchImpl:f.fetchImpl}),/R12_INVALID_SYMBOLS/);
    assert.equal(f.calls.length,0);
  }
});
