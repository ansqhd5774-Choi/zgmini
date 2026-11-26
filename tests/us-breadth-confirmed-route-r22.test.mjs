import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRetiredRoute} from './helpers/load-retired-route.mjs';
import {MARKETPARQUET_REMOVED_CODE} from '../lib/marketparquet-retirement.mjs';
test('confirmed R2 reads only the paid D1 key; missing paid store never reuses free rows',async()=>{
 let reads=0;
 const db={prepare(sql){
  reads++;
  assert.match(sql,/public_feed_snapshots_v1/);
  assert.doesNotMatch(sql,/market_public_snapshots_v1/);
  return {bind(key){
   assert.equal(key,'us-breadth-paid-r2-v1');
   return {first:async()=>{throw Error('PAID_D1_UNAVAILABLE');}};
  }};
 }};
 const {GET}=await loadRetiredRoute(new URL('../app/api/market-breadth/route.ts',import.meta.url),{DB_CORE:db,DB:db});
 const response=await GET(new Request('https://zgmini.test/api/market-breadth?market=usa&phase=confirmed-r2'));
 assert.equal(response.status,503);
 assert.equal((await response.json()).reason,'US_PAID_R2_D1_UNAVAILABLE');
 assert.equal(reads,1);
});
test('independent IEX and R1 missing-binding reasons are not relabeled as retired source',async()=>{
 const {GET}=await loadRetiredRoute(new URL('../app/api/market-breadth/route.ts',import.meta.url));
 for(const phase of ['provisional','confirmed']){
  const response=await GET(new Request('https://zgmini.test/api/market-breadth?market=usa&phase='+phase));
  assert.equal(response.status,503);assert.notEqual((await response.json()).reason,MARKETPARQUET_REMOVED_CODE);
 }
 assert.equal((await GET(new Request('https://zgmini.test/api/market-breadth?market=korea'))).status,404);
});
