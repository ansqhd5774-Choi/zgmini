import test from 'node:test';
import assert from 'node:assert/strict';
import {previousMarketSession} from '../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {classifyPublicBreadthBody,inspectUsBreadthLiveContractR45}
  from '../scripts/pc-writer/us-breadth-live-contract-r45.mjs';

const confirmed={market:'usa',phase:'CONFIRMED',status:'READY',publicationStage:'PUBLIC_FINAL',
  source:'MARKETPARQUET_STOCK_DAILY',universe:'US_MARKETPARQUET_ACTIVE_STOCKS',
  methodologyVersion:'ISSUE_DIRECTION_COUNTS_MISSING_AS_UNCHANGED_R2',
  observationDate:'2026-10-30',previousDate:'2026-10-29',
  risingPct:26.4217645250538,fallingPct:67.78358438364587,
  unchangedPct:5.794651091300338};
const provisional={market:'usa',phase:'PROVISIONAL',status:'PROVISIONAL',
  source:'ALPACA_IEX_15MIN_SPLIT',referenceSource:'ALPACA_IEX_1DAY_SPLIT',
  methodologyVersion:'OBSERVED_ISSUE_DIRECTION_COUNTS_R1',
  observationDate:'2026-11-02',priorDate:'2026-10-30',
  slotEndUtc:'2026-11-02T15:00:00Z',collectedAt:'2026-11-02T15:01:00Z',
  collectionStatus:'INCOMPLETE_PAGINATION',risingPct:11,fallingPct:9,
  unchangedPct:0,unobservedPct:80};
function history(){
  const dates=['2026-10-30'];
  for(let i=1;i<249;i++)dates.unshift(previousMarketSession(dates[0]));
  return {version:2,market:'usa',phase:'CONFIRMED',status:'READY',
    publicationStage:'PUBLIC_FINAL',source:'MARKETPARQUET_STOCK_DAILY',
    universe:'US_MARKETPARQUET_ACTIVE_STOCKS',
    methodologyVersion:'ISSUE_DIRECTION_COUNTS_MISSING_AS_UNCHANGED_R2',
    priceMode:'SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED',
    finalizedAt:'2026-11-02T06:01:00.000Z',firstDate:dates[0],lastDate:dates.at(-1),
    points:dates.map(date=>({date,risingPct:25,fallingPct:70,unchangedPct:5}))};
}
const mockFetch=bodies=>async (url,options)=>{
  assert.equal(options.method,'GET');
  assert.equal(options.redirect,'error');
  assert.equal(options.cache,'no-store');
  assert.equal(options.body,undefined);
  const u=new URL(url);
  assert.equal(u.origin,'https://zgmini.kr');
  if(u.pathname.endsWith('/market-breadth-r2-history'))return bodies.history;
  if(u.searchParams.get('phase')==='provisional')return bodies.provisional;
  if(u.searchParams.get('phase')==='confirmed-r2')return bodies.confirmed;
  throw Error('unexpected endpoint');
};
const response=(value,status=200)=>Response.json(value,{status});

test('R45 three public GETs verify exact percent-only R2, IEX, history contracts',async()=>{
  const r=await inspectUsBreadthLiveContractR45({fetchImpl:mockFetch({
    confirmed:response(confirmed),provisional:response(provisional),
    history:response(history())})});
  assert.equal(r.status,'ALL_PUBLIC_CONTRACTS_VERIFIED');
  assert.equal(r.ok,true);
  assert.equal(r.publicGets,3);
  assert.equal(r.d1Writes,0);
  assert.equal(r.providerCalls,0);
  assert.equal(r.localWrites,0);
  assert.equal(r.coreTaskChanges,0);
  assert.deepEqual(Object.values(r.results).map(x=>x.status),[
    'PERCENT_ONLY_VERIFIED','PERCENT_ONLY_VERIFIED','PERCENT_ONLY_VERIFIED']);
  assert.doesNotMatch(JSON.stringify(r),/expectedCount|eligibleCount|"counts"/);
});

test('R45 catches 200 legacy R1 body under both new phase aliases',async()=>{
  const legacy={version:1,market:'usa',source:'MARKETPARQUET_STOCK_DAILY',
    observationDate:'2026-10-30',counts:{rising:101,falling:200,unchanged:202},
    expectedCount:503};
  const r=await inspectUsBreadthLiveContractR45({fetchImpl:mockFetch({
    confirmed:response(legacy),provisional:response(legacy),
    history:response({reason:'not found'},404)})});
  assert.equal(r.status,'PUBLIC_CONTRACTS_NOT_READY');
  assert.equal(r.results.confirmed.status,'LEGACY_OR_COUNT_BEARING_PUBLIC_BODY');
  assert.equal(r.results.provisional.status,'LEGACY_OR_COUNT_BEARING_PUBLIC_BODY');
  assert.equal(r.results.history.status,'PUBLIC_ROUTE_NOT_DEPLOYED');
  assert.equal(r.results.history.httpStatus,404);
  assert.doesNotMatch(JSON.stringify(r),/expectedCount|"counts"|503\b/);
});

test('R45 differentiates 503 stored stale versus missing and never guesses success',async()=>{
  const r=await inspectUsBreadthLiveContractR45({fetchImpl:mockFetch({
    confirmed:response({reason:'FULL_MARKET_STALE_OBSERVATION'},503),
    provisional:response({reason:'PROVISIONAL_NOT_CURRENT'},503),
    history:response({reason:'FULL_MARKET_PERCENT_HISTORY_NOT_PUBLISHED'},503)})});
  assert.equal(r.ok,false);
  assert.equal(r.results.confirmed.status,'STORED_RESULT_STALE');
  assert.equal(r.results.provisional.status,'STORED_RESULT_STALE');
  assert.equal(r.results.history.status,'STORED_RESULT_NOT_READY');
});

test('R45 refuses counts, unexpected JSON fields, wrong phase or percentage sum',()=>{
  for(const wrong of [
    {...confirmed,counts:{rising:1}},
    {...confirmed,expectedCount:6506},
  ])assert.equal(classifyPublicBreadthBody('confirmed',wrong).status,
    'LEGACY_OR_COUNT_BEARING_PUBLIC_BODY');
  for(const wrong of [
    {...confirmed,phase:'PROVISIONAL'},
    {...confirmed,untrustedField:1},
    {...confirmed,unchangedPct:75},
  ])assert.equal(classifyPublicBreadthBody('confirmed',wrong).ok,false);
  assert.equal(classifyPublicBreadthBody('provisional',{
    ...provisional,unobservedPct:0}).ok,false);
  assert.equal(classifyPublicBreadthBody('history',{
    ...history(),points:history().points.map((point,i)=>
      i===0?{...point,counts:1}:point)}).ok,false);
});

test('R45 handles read failures, non-JSON or malformed 200 without secrets',async()=>{
  const fetchImpl=mockFetch({
    confirmed:Response.redirect('https://example.com',302),
    provisional:new Response('<html>not-json</html>',{status:200,
      headers:{'content-type':'text/html'}}),
    history:new Response('{broken',{status:200,
      headers:{'content-type':'application/json'}}),
  });
  const r=await inspectUsBreadthLiveContractR45({fetchImpl});
  assert.equal(r.results.confirmed.status,'PUBLIC_HTTP_UNEXPECTED');
  assert.equal(r.results.provisional.status,'PUBLIC_NOT_JSON');
  assert.equal(r.results.history.status,'PUBLIC_INVALID_JSON');
  const net=await inspectUsBreadthLiveContractR45({fetchImpl:async()=>{throw Error('secret');}});
  assert.equal(net.status,'PUBLIC_CONTRACTS_NOT_READY');
  assert.deepEqual(Object.values(net.results).map(x=>x.status),
    Array(3).fill('PUBLIC_HTTP_UNAVAILABLE'));
  assert.equal(JSON.stringify(net).includes('secret'),false);
});
