import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRetiredRoute} from './helpers/load-retired-route.mjs';
import {MARKETPARQUET_REMOVED_CODE} from '../lib/marketparquet-retirement.mjs';
test('removed R2 history never reads D1 even when old stored data exist',async()=>{
 let reads=0;const db={prepare(){reads++;throw Error('RETIRED_DB_READ');}};
 const {GET}=await loadRetiredRoute(new URL('../app/api/market-breadth-r2-history/route.ts',import.meta.url),{DB_CORE:db,DB:db});
 const response=await GET(new Request('https://zgmini.test/api/market-breadth-r2-history?market=usa'));
 assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.deepEqual(await response.json(),{status:'UNAVAILABLE',reason:MARKETPARQUET_REMOVED_CODE});assert.equal(reads,0);
});
test('retirement is explicit without bindings; unsupported market remains 404',async()=>{
 const {GET}=await loadRetiredRoute(new URL('../app/api/market-breadth-r2-history/route.ts',import.meta.url));
 assert.equal((await GET(new Request('https://zgmini.test/api/market-breadth-r2-history?market=usa'))).status,503);
 assert.equal((await GET(new Request('https://zgmini.test/api/market-breadth-r2-history?market=korea'))).status,404);
});
