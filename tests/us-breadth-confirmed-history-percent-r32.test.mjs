import test from 'node:test';
import assert from 'node:assert/strict';
import {previousMarketSession} from '../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {US_BREADTH_CURRENT_KEY,US_BREADTH_DAILY_KEY_PREFIX}
 from '../lib/market-breadth/us-public-r1.mjs';
import {US_BREADTH_PROVISIONAL_KEY}
 from '../lib/market-breadth/us-provisional-r1.mjs';
import {US_FULL_MARKET_PUBLIC_KEY,US_FULL_MARKET_PUBLIC_DAILY_PREFIX}
 from '../lib/market-breadth/us-marketparquet-confirmed-reader-r2.mjs';
import {US_FULL_MARKET_STAGING_KEY}
 from '../lib/market-breadth/us-marketparquet-confirmed-public-r2.mjs';
import {US_FULL_MARKET_PERCENT_HISTORY_KEY,validFullMarketPercentHistoryRecord,
  readFullMarketPercentHistory}
 from '../lib/market-breadth/us-marketparquet-confirmed-history-percent-r32.mjs';

const now=Date.parse('2026-10-31T12:00:00Z');
const publishedAt='2026-10-30T23:00:00.000Z';

function makeRecord(days=249){
 let last='2026-10-30';
 const dates=[last];
 for(let i=1;i<days;i++){
  last=previousMarketSession(last);
  dates.unshift(last);
 }
 const points=dates.map(date=>({date,risingPct:26.42,fallingPct:67.78,
  unchangedPct:5.8}));
 return {version:2,market:'usa',phase:'CONFIRMED',status:'READY',
  publicationStage:'PUBLIC_FINAL',source:'MARKETPARQUET_STOCK_DAILY',
  universe:'US_MARKETPARQUET_ACTIVE_STOCKS',
  methodologyVersion:'ISSUE_DIRECTION_COUNTS_MISSING_AS_UNCHANGED_R2',
  priceMode:'SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED',
  finalizedAt:publishedAt,firstDate:dates[0],lastDate:dates.at(-1),points};
}

test('R32 public percent history key is independent of R1, provisional, staging and R2 current',()=>{
 const k=US_FULL_MARKET_PERCENT_HISTORY_KEY;
 for(const other of [US_BREADTH_CURRENT_KEY,US_BREADTH_PROVISIONAL_KEY,
  US_FULL_MARKET_STAGING_KEY,US_FULL_MARKET_PUBLIC_KEY])assert.notEqual(k,other);
 assert.equal(k.startsWith(US_BREADTH_DAILY_KEY_PREFIX),false);
 assert.equal(k.startsWith(US_FULL_MARKET_PUBLIC_DAILY_PREFIX),false);
});

test('R32 permits both 249 and 250 adjacent real NYSE session percentage points',()=>{
 for(const count of [249,250]){
  const r=makeRecord(count);
  assert.equal(r.points.length,count);
  assert.equal(validFullMarketPercentHistoryRecord(r),true);
  assert.equal(r.points.every(p=>Object.keys(p).sort().join(',')===
   'date,fallingPct,risingPct,unchangedPct'),true);
  assert.equal(JSON.stringify(r).includes('expectedCount'),false);
 }
 assert.equal(validFullMarketPercentHistoryRecord(makeRecord(248)),false);
});

test('R32 rejects raw stock counts, stock prices or any unexpected public fields',()=>{
 const r=makeRecord();
 assert.equal(validFullMarketPercentHistoryRecord({...r,expectedCount:6506}),false);
 assert.equal(validFullMarketPercentHistoryRecord({...r,counts:{rising:1719}}),false);
 assert.equal(validFullMarketPercentHistoryRecord({...r,imputedUnchangedCount:189}),false);
 assert.equal(validFullMarketPercentHistoryRecord({...r,points:r.points.map((p,i)=>
  i===0?{...p,rising:1719}:p)}),false);
 assert.equal(validFullMarketPercentHistoryRecord({...r,points:r.points.map((p,i)=>
  i===0?{...p,close:10.5}:p)}),false);
});

test('R32 rejects non-final or changed provider/method/price provenance',()=>{
 const r=makeRecord();
 for(const changed of [
  {status:'CANDIDATE'},{publicationStage:'STAGING_ONLY'},
  {source:'ALPACA_IEX'},{universe:'SP500'},
  {methodologyVersion:'COUNTS_R1'},
  {priceMode:'DIVIDEND_ADJUSTED'},
  {market:'korea'},{phase:'PROVISIONAL'},
  {finalizedAt:'invalid'},
 ])assert.equal(validFullMarketPercentHistoryRecord({...r,...changed}),false);
});

test('R32 percentages must be finite 0-100 and add to 100 within display rounding',()=>{
 const r=makeRecord();
 const modify=changed=>({...r,points:[{...r.points[0],...changed},...r.points.slice(1)]});
 for(const bad of [
  {risingPct:-1},{risingPct:101},{risingPct:NaN},{risingPct:Infinity},
  {fallingPct:0},{unchangedPct:55},
 ])assert.equal(validFullMarketPercentHistoryRecord(modify(bad)),false);
 assert.equal(validFullMarketPercentHistoryRecord(modify({risingPct:33.3,
  fallingPct:33.3,unchangedPct:33.3})),true);
});

test('R32 rejects a missing/interior duplicate day, reordered dates and mismatched endpoints',()=>{
 const r=makeRecord();
 const dates=[...r.points];
 dates[100]={...dates[100],date:dates[99].date};
 assert.equal(validFullMarketPercentHistoryRecord({...r,points:dates}),false);
 const reversed=[...r.points].reverse();
 assert.equal(validFullMarketPercentHistoryRecord({...r,points:reversed,
  firstDate:reversed[0].date,lastDate:reversed.at(-1).date}),false);
 assert.equal(validFullMarketPercentHistoryRecord({...r,firstDate:'2025-01-01'}),false);
 assert.equal(validFullMarketPercentHistoryRecord({...r,lastDate:'2026-11-02'}),false);
});

test('R32 reads only independent R2 history snapshot and returns no raw count fields',async()=>{
 const r=makeRecord();
 const keys=[];
 const result=await readFullMarketPercentHistory(async key=>{
  keys.push(key);
  return {body:JSON.stringify(r),stored_at:now-30_000};
 },{now});
 assert.equal(result.ok,true);
 assert.equal(result.httpStatus,200);
 assert.deepEqual(keys,[US_FULL_MARKET_PERCENT_HISTORY_KEY]);
 assert.deepEqual(result.body.points[0],r.points[0]);
 assert.equal(result.headers['Cache-Control'],'no-store');
 assert.equal(result.headers['x-data-snapshot-at'],new Date(now-30_000).toISOString());
 assert.doesNotMatch(JSON.stringify(result.body),
  /expectedCount|eligibleCount|imputedUnchangedCount|"counts"|"close"/);
});

test('R32 fails closed on absent, malformed, non-final, future and invalid stored snapshots',async()=>{
 const r=makeRecord();
 const read=async row=>readFullMarketPercentHistory(async()=>row,{now});
 assert.equal((await read(null)).reason,'FULL_MARKET_PERCENT_HISTORY_NOT_PUBLISHED');
 assert.equal((await read({body:'not-json',stored_at:now-1000})).reason,
  'FULL_MARKET_PERCENT_HISTORY_INVALID_JSON');
 assert.equal((await read({body:JSON.stringify({...r,status:'CANDIDATE'}),
  stored_at:now-1000})).reason,'FULL_MARKET_PERCENT_HISTORY_NOT_VERIFIED_FINAL');
 assert.equal((await read({body:JSON.stringify(r),stored_at:now+61_000})).reason,
  'FULL_MARKET_PERCENT_HISTORY_INVALID_PUBLICATION_TIME');
 assert.equal((await read({body:JSON.stringify(r),stored_at:0})).reason,
  'FULL_MARKET_PERCENT_HISTORY_INVALID_PUBLICATION_TIME');
 assert.equal((await readFullMarketPercentHistory(async()=>{throw Error('offline');},{now})).reason,
  'FULL_MARKET_PERCENT_HISTORY_STORAGE_UNAVAILABLE');
});

test('R32 old verified history remains readable without requiring latest 251st day',async()=>{
 const r=makeRecord(249);
 const later=Date.parse('2026-11-04T12:00:00Z');
 const result=await readFullMarketPercentHistory(async()=>({body:JSON.stringify(r),
  stored_at:now-30_000}),{now:later});
 assert.equal(result.ok,true);
 assert.equal(result.body.points.length,249);
});
