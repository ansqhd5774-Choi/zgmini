import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRetiredRoute} from './helpers/load-retired-route.mjs';
import {MARKETPARQUET_REMOVED_CODE} from '../lib/marketparquet-retirement.mjs';
test('removed R2 alias short-circuits before D1, default R1 and existing IEX',async()=>{
 let reads=0;const db={prepare(){reads++;throw Error('RETIRED_DB_READ');}};
 const {GET}=await loadRetiredRoute(new URL('../app/api/market-breadth/route.ts',import.meta.url),{DB_CORE:db,DB:db});
 const response=await GET(new Request('https://zgmini.test/api/market-breadth?market=usa&phase=confirmed-r2'));
 assert.equal(response.status,503);assert.equal((await response.json()).reason,MARKETPARQUET_REMOVED_CODE);assert.equal(reads,0);
});
test('independent IEX and R1 missing-binding reasons are not relabeled as retired source',async()=>{
 const {GET}=await loadRetiredRoute(new URL('../app/api/market-breadth/route.ts',import.meta.url));
 for(const phase of ['provisional','confirmed']){
  const response=await GET(new Request('https://zgmini.test/api/market-breadth?market=usa&phase='+phase));
  assert.equal(response.status,503);assert.notEqual((await response.json()).reason,MARKETPARQUET_REMOVED_CODE);
 }
 assert.equal((await GET(new Request('https://zgmini.test/api/market-breadth?market=korea'))).status,404);
});
