import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRetiredRoute} from './helpers/load-retired-route.mjs';
import {US_PAID_R2_FEED_KEY} from '../worker/us-breadth-paid-r2-contract.mjs';

// The historical *free* payload must never become an implicit paid fallback.
// Only the new paid feed key in the existing public output table is considered.
test('paid R2 history reads exactly its own key and returns missing when absent',async()=>{
 const calls=[];
 const db={prepare(sql){
   calls.push(['prepare',sql]);
   assert.match(sql,/public_feed_snapshots_v1/);
   assert.doesNotMatch(sql,/market_public_snapshots_v1/);
   return {bind(key){
     calls.push(['bind',key]);
     assert.equal(key,US_PAID_R2_FEED_KEY);
     return {first:async()=>null};
   }};
 }};
 const {GET}=await loadRetiredRoute(
   new URL('../app/api/market-breadth-r2-history/route.ts',import.meta.url),
   {DB_CORE:db,DB:db});
 const response=await GET(new Request(
   'https://zgmini.test/api/market-breadth-r2-history?market=usa'));
 assert.equal(response.status,503);
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.deepEqual(await response.json(),
   {status:'UNAVAILABLE',reason:'US_PAID_R2_NOT_PUBLISHED'});
 assert.deepEqual(calls.map(x=>x[0]),['prepare','bind']);
});

test('legacy free sample, even if stored, is not relabeled as paid',async()=>{
 const db={prepare(){return {bind(){return {first:async()=>({
   body:JSON.stringify({
     status:'READY',source:'MARKETPARQUET_FREE_SAMPLE',
     market:'usa',counts:{rising:42,unchanged:9,falling:11},
   }),
   stored_at:Date.parse('2026-11-20T22:00:00Z'),
 })};}};}};
 const {GET}=await loadRetiredRoute(
   new URL('../app/api/market-breadth-r2-history/route.ts',import.meta.url),
   {DB_CORE:db});
 const response=await GET(new Request(
   'https://zgmini.test/api/market-breadth-r2-history?market=usa'));
 assert.equal(response.status,503);
 assert.deepEqual(await response.json(),{
   status:'UNAVAILABLE',reason:'US_PAID_R2_INVALID_PAID_PUBLIC_RECORD',
 });
});

test('missing DB and unsupported market never request a provider',async()=>{
 const {GET}=await loadRetiredRoute(
   new URL('../app/api/market-breadth-r2-history/route.ts',import.meta.url));
 assert.equal((await GET(new Request(
   'https://zgmini.test/api/market-breadth-r2-history?market=usa'))).status,503);
 assert.equal((await GET(new Request(
   'https://zgmini.test/api/market-breadth-r2-history?market=korea'))).status,404);
});
