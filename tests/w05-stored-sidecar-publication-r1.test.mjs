// Offline-only contracts for the W05 three-key reusable PC publication adapter.
// These tests never connect to a live Provider, SQLite instance or D1.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
 W05_SAVED_KEYS,W05_SAVED_IDS,latestStoredBeaNipaSha,
 prepareW05StoredSidecar,publishW05StoredSidecar,
} from '../scripts/pc-writer/w05-stored-sidecar-publication-r1.mjs';

const NOW=Date.parse('2026-11-24T01:00:00.000Z');
const VERSION='a'.repeat(64);
const SOURCE=NOW-10_000;
const payload=()=>({status:'READY',sourceVersion:VERSION,sourceStoredAt:SOURCE,
 indicator:{value:0.25}});
const prepared=()=>({status:'READY',payload:payload()});

function fakeRemote({result='READBACK_VERIFIED',badReadback=false,missing=false}={}){
 let row=null,writes=0,queries=0,adapters=0;
 const remote={
  adapter(db,opts){
   assert.equal(db,'d1-core');
   assert.deepEqual(opts,{allowWrites:true});adapters++;
   return {marker:'approved-existing-d1-adapter'};
  },
  async query(db,sql,args){
   assert.equal(db,'d1-core');
   assert.equal(sql,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?');
   assert.equal(args.length,1);queries++;
   return {results:missing?[]:[row].filter(Boolean)};
  },
 };
 const factory=(id,db)=>{
  assert.equal(db.marker,'approved-existing-d1-adapter');
  assert.ok(W05_SAVED_IDS.includes(id));
  return {async write(p,{storedAt}){
   if(result==='READBACK_VERIFIED')writes++;
   row={body:JSON.stringify({payload:p,projection:{
    status:'READY',sourceVersion:p.sourceVersion,sourceStoredAt:p.sourceStoredAt,
    builtAt:badReadback?storedAt+1:result==='ALREADY_STORED'?storedAt-1000:storedAt,
   }}),stored_at:result==='ALREADY_STORED'?storedAt-1000:storedAt};
   return {status:result,key:W05_SAVED_KEYS[id],storedAt:row.stored_at};
  }};
 };
 return {remote,factory,stats:()=>({writes,queries,adapters})};
}

test('exact three independent informational sidecar keys, never core market or scored keys',()=>{
 assert.deepEqual(W05_SAVED_IDS,['wpsfd42','qfr','bea']);
 assert.deepEqual(Object.values(W05_SAVED_KEYS),[
  'detail:earnings-recession-indicators:bls-wpsfd42:v1',
  'detail:earnings-recession-indicators:census-qfr-mfg-margin:v1',
  'detail:earnings-bea-unit-profit:v1',
 ]);
 assert.equal(new Set(Object.values(W05_SAVED_KEYS)).size,3);
});

test('source directory absent is SKIPPED without creating PC root, SQLite or archive',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'w05-saved-missing-'));
 const absent=path.join(root,'not-present');
 try{
  assert.equal(latestStoredBeaNipaSha(absent,{now:NOW}),null);
  for(const id of W05_SAVED_IDS)
   assert.equal(prepareW05StoredSidecar({id,pcHome:absent,now:NOW}).status,
    'SKIPPED_SOURCE_NOT_STORED');
  assert.equal(fs.existsSync(absent),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('no source or stale source never opens a write-capable D1 adapter',async()=>{
 const f=fakeRemote();
 for(const status of ['SKIPPED_SOURCE_NOT_STORED','SKIPPED_SOURCE_STALE']){
  const output=await publishW05StoredSidecar({
   id:'bea',pcHome:'never-opened',coreDb:'d1-core',remote:f.remote,now:NOW,
   prepare:()=>({status}),makeWriter:f.factory,
  });
  assert.equal(output.status,status);
  assert.equal(output.d1Writes,0);
 }
 assert.deepEqual(f.stats(),{writes:0,queries:0,adapters:0});
});

test('each sidecar reuses the exact D1 key and independent verified readback',async()=>{
 for(const id of W05_SAVED_IDS){
  const f=fakeRemote();
  const result=await publishW05StoredSidecar({
   id,pcHome:'fixture',coreDb:'d1-core',remote:f.remote,now:NOW,
   prepare:prepared,makeWriter:f.factory,
  });
  assert.equal(result.status,'READBACK_VERIFIED');
  assert.equal(result.key,W05_SAVED_KEYS[id]);
  assert.equal(result.sourceVersion,VERSION);
  assert.equal(result.sourceStoredAt,SOURCE);
  assert.equal(result.publishedAt,NOW);
  assert.equal(result.d1Writes,1);
  assert.equal(result.providerCalls,0);
  assert.equal(result.sqliteWrites,0);
  assert.equal(result.schedulerWrites,0);
  assert.deepEqual(f.stats(),{writes:1,queries:1,adapters:1});
 }
});

test('ALREADY_STORED preserves prior published timestamp and reports zero D1 writes',async()=>{
 const f=fakeRemote({result:'ALREADY_STORED'});
 const result=await publishW05StoredSidecar({
  id:'qfr',pcHome:'fixture',coreDb:'d1-core',remote:f.remote,now:NOW,
  prepare:prepared,makeWriter:f.factory,
 });
 assert.equal(result.status,'ALREADY_STORED');
 assert.equal(result.publishedAt,NOW-1000);
 assert.equal(result.d1Writes,0);
 assert.deepEqual(f.stats(),{writes:0,queries:1,adapters:1});
});

test('incorrect or missing D1 readback fails closed without retrying the write',async()=>{
 for(const opts of [{badReadback:true},{missing:true}]){
  const f=fakeRemote(opts);
  await assert.rejects(publishW05StoredSidecar({
   id:'wpsfd42',pcHome:'fixture',coreDb:'d1-core',remote:f.remote,now:NOW,
   prepare:prepared,makeWriter:f.factory,
  }),/W05_SAVED_REMOTE_READBACK_(INVALID|MISSING)/);
  assert.equal(f.stats().writes,1,'no automatic retry after an uncertain D1 effect');
 }
});

test('invalid sidecar, clock, database or unverified prepared source fails before D1 writes',async()=>{
 const f=fakeRemote();
 await assert.rejects(publishW05StoredSidecar({
  id:'market',pcHome:'fixture',coreDb:'d1-core',remote:f.remote,now:NOW,
  prepare:prepared,makeWriter:f.factory,
 }),/W05_SAVED_KEY_DENIED/);
 await assert.rejects(publishW05StoredSidecar({
  id:'bea',pcHome:'fixture',coreDb:'d1-core',remote:f.remote,now:-5,
  prepare:prepared,makeWriter:f.factory,
 }),/W05_SAVED_PUBLICATION_ARGUMENTS_INVALID/);
 await assert.rejects(publishW05StoredSidecar({
  id:'bea',pcHome:'fixture',coreDb:'d1-core',remote:f.remote,now:NOW,
  prepare:()=>({status:'READY',payload:{...payload(),sourceVersion:'not-a-hash'}}),
  makeWriter:f.factory,
 }),/W05_SAVED_PREVIEW_INVALID/);
 assert.deepEqual(f.stats(),{writes:0,queries:0,adapters:0});
});
