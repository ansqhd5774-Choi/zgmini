import test from 'node:test';
import assert from 'node:assert/strict';
import {newCoreCycleId,coreCycleIdFromEnv} from '../scripts/pc-writer/core-cycle-id.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {appendCollectionEvent} from '../scripts/pc-writer/collection-events.mjs';

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

test('existing private event preserves valid same-cycle key but does not certify Task origin',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-core-cycle-'));
 try{
  const key=newCoreCycleId();
  appendCollectionEvent(root,{at:'2026-11-21T00:00:00.000Z',lane:'core',status:'COMPLETE',coreCycleId:key});
  appendCollectionEvent(root,{at:'2026-11-21T00:05:00.000Z',lane:'core',status:'FAILED',coreCycleId:'invalid'});
  const rows=fs.readFileSync(path.join(root,'collection-events.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(rows.length,2);
  assert.equal(rows[0].coreCycleId,key);
  assert.equal(rows[1].coreCycleId,null);
  assert.equal(rows[0].taskOriginVerified,undefined);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
