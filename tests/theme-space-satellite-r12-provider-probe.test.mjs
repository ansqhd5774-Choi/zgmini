import test from 'node:test';
import assert from 'node:assert/strict';
import {
  probeProvider,validatePreview,SPACE_CANDIDATES,
} from '../scripts/pc-writer/theme-space-satellite-r12-provider-probe.mjs';

test('R12 source-only discovery requests modern 2026-11 dataset and full stocks/us preview path',async()=>{
 const calls=[];
 const fakeFetch=async input=>{
  const url=new URL(String(input));
  calls.push({path:url.pathname,query:url.search});
  assert.equal(url.origin,'https://getmarkethistory.com');
  // Act like the current public API: a pre-November "source=" alias is
  // rejected, and the incomplete /bars/stocks/TICKER path does not exist.
  if(url.searchParams.has('source')||url.searchParams.has('symbol')||
    url.pathname.includes('/bars/stocks/ARKX/')||
    url.searchParams.get('dataset')==='stocks'){
   return new Response(JSON.stringify({code:'renamed_parameter'}),{status:400});
  }
  if(url.pathname==='/api/v1/symbols'){
   assert.equal(url.searchParams.get('dataset'),'stocks/us');
   assert.equal(url.searchParams.get('timeframe'),'1m');
   assert.equal(url.searchParams.get('limit'),'10');
   const symbol=url.searchParams.get('prefix');
   assert.ok(['ARKX','UFO'].includes(symbol));
   return new Response(JSON.stringify({
    symbols:symbol==='ARKX'?[
     {symbol:'ARKX',first_timestamp:'2018-01-01T00:00:00Z',
      last_timestamp:'2026-11-12T21:00:00Z',rows:5000},
    ]:[],
   }),{status:200,headers:{'content-type':'application/json'}});
  }
  if(url.pathname==='/api/v1/bars/stocks/us/ARKX/1h'){
   assert.equal(url.searchParams.get('start'),'2026-11-12');
   assert.equal(url.searchParams.get('end'),'2026-11-12');
   assert.equal(url.searchParams.get('limit'),'3');
   assert.equal(url.searchParams.get('format'),'json');
   // "symbol" in BAR DATA is unchanged; only query parameter names changed.
   return new Response(JSON.stringify({
    count:1,bars:[{symbol:'ARKX',timestamp:'2026-11-12T20:00:00Z',
      close:42.5,is_gap:false}],
   }),{status:200,headers:{'x-data-through':'2026-11-12T21:00:00Z'}});
  }
  return new Response(JSON.stringify({code:'unknown_route'}),{status:404});
 };
 const actual=await probeProvider({symbols:['ARKX','UFO'],fetchImpl:fakeFetch});
 assert.equal(actual.report,'SPACE_SATELLITE_R12_LIVE_AVAILABILITY');
 assert.equal(actual.status,'READ_ONLY_PROVIDER_PREFLIGHT_NOT_R2_SCORE_AUDIT');
 assert.equal(actual.providerCalls,3,'two requests for found ticker, one for missing ticker');
 assert.equal(calls.length,3);
 assert.deepEqual(calls.map(c=>c.path),[
  '/api/v1/symbols','/api/v1/bars/stocks/us/ARKX/1h','/api/v1/symbols']);
 assert.equal(actual.availabilityCount,1);
 assert.equal(actual.records[0].stage,'LIVE_FREE_1H_PREVIEW_PASS');
 assert.equal(actual.records[0].previewRows,1);
 assert.equal(actual.records[0].catalogMinuteRows,5000);
 assert.equal(actual.records[1].stage,'NOT_IN_LIVE_CATALOG');
 assert.equal(actual.rightsVerified,false);
 assert.equal(actual.finalBasketSelected,false);
 for(const key of ['publicWrites','d1Writes','schedulerWrites','rawFilesWritten'])
  assert.equal(actual[key],0,key);
});

test('R12 current API error stays a read-only PROBE_ERROR without retry or false eligibility',async()=>{
 let calls=0;
 const out=await probeProvider({symbols:['WARP'],fetchImpl:async input=>{
  calls++;
  const u=new URL(String(input));
  assert.equal(u.pathname,'/api/v1/symbols');
  return new Response(JSON.stringify({code:'temporarily_unavailable'}),{status:503});
 }});
 assert.equal(calls,1);
 assert.equal(out.providerCalls,1);
 assert.equal(out.availabilityCount,0);
 assert.equal(out.records.length,1);
 assert.equal(out.records[0].stage,'PROBE_ERROR');
 assert.equal(out.records[0].reason,'HTTP_503');
 assert.equal(out.publicWrites,0);
 assert.equal(out.rightsVerified,false);
});

test('R12 preview keeps original symbol data column and does not silently accept a renamed row',()=>{
 const base={ticker:'ARKX',date:'2026-11-12',through:null,
  catalog:{symbol:'ARKX',last_timestamp:'2026-11-12T21:00:00Z'},
  preview:{bars:[{symbol:'ARKX',timestamp:'2026-11-12T19:00:00Z',
   close:14.5,is_gap:false}],count:1}};
 assert.equal(validatePreview(base).stage,'LIVE_FREE_1H_PREVIEW_PASS');
 assert.throws(()=>validatePreview({...base,preview:{bars:[
  {...base.preview.bars[0],symbol:undefined}],count:1}}),
  /R12_PREVIEW_BAR_INVALID/);
 assert.ok(SPACE_CANDIDATES.includes('ARKX'));
});
