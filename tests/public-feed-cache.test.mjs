import test from 'node:test';
import assert from 'node:assert/strict';
import {cachePublicFeed} from '../lib/public-feed-cache.mjs';

test('coalesces simultaneous feed reads and preserves observation data until expiry',async()=>{
  let calls=0,time=0;
  const handler=cachePublicFeed(async()=>{calls++;return Response.json({score:35.3,observedAt:'2026-09-23'});},{now:()=>time});
  const results=await Promise.all([handler(),handler(),handler()]);
  assert.equal(calls,1);
  for(const r of results){assert.equal(r.headers.get('X-Robots-Tag'),'noindex');assert.deepEqual(await r.json(),{score:35.3,observedAt:'2026-09-23'});}
  time=59999;await handler();assert.equal(calls,1);
  time=60000;await handler();assert.equal(calls,2);
});
test('does not cache failures or serve expired success after an upstream failure',async()=>{
  let calls=0,time=0;
  const handler=cachePublicFeed(async()=>{calls++;return calls===1?Response.json({score:40}):Response.json({score:null},{status:503});},{now:()=>time});
  await handler();time=60000;
  assert.equal((await handler()).status,503);
  assert.equal((await handler()).status,503);
  assert.equal(calls,3);
});
