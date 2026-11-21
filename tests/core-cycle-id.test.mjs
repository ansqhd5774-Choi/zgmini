import test from 'node:test';
import assert from 'node:assert/strict';
import {newCoreCycleId,coreCycleIdFromEnv} from '../scripts/pc-writer/core-cycle-id.mjs';

test('one Core cycle receives a bounded UUID v4 correlation key',()=>{
 const a=newCoreCycleId(),b=newCoreCycleId();
 assert.notEqual(a,b);
 assert.equal(coreCycleIdFromEnv({ZGMINI_CORE_CYCLE_ID:a}),a);
 assert.equal(coreCycleIdFromEnv({ZGMINI_CORE_CYCLE_ID:b.toUpperCase()}),b);
});
test('untrusted or missing cycle ids never enter a local report',()=>{
 for(const value of [undefined,null,'', 'manual', 'a'.repeat(400),'12345678-1234-1234-1234-123456789abc',newCoreCycleId()+'\nsecret']){
  assert.equal(coreCycleIdFromEnv({ZGMINI_CORE_CYCLE_ID:value}),null);
 }
 assert.equal(coreCycleIdFromEnv({}),null);
});
