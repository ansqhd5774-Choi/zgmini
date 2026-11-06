import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {identity} from '../scripts/pc-writer/theme-platform.mjs';
import {storedInputFingerprint,runStoredOperationalPrivate,replayCheckedStore,
 createStoredD1FeedReader,readStoredPublicR32Base,
 createTransientThemeCheckpointStore} from
 '../scripts/pc-writer/theme-platform-stored-run.mjs';

const memory=()=>{let state;return {load:async()=>structuredClone(state),
 save:async(_,next,prior)=>{assert.equal(prior,state?.revision??0);state=structuredClone(next);}};};
const validSha='e'.repeat(64);
const handlers=Object.fromEntries(['source','calculate','validate'].map(stage=>
 [stage,async({theme,completed})=>({status:'VERIFIED',artifactSha256:validSha,
  methodologyVersion:theme.methodologyVersion,definitionSha256:identity(theme),
  calculationSha256:completed.calculate?.artifactSha256})]));

test('private common entrypoint handles 10 without writing D1 or creating a schedule',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-stored-entry-'));
 t.after(()=>fs.rmSync(root,{recursive:true}));
 const result=await runStoredOperationalPrivate({dataRoot:root,adapters:handlers,store:memory()});
 assert.equal(result.status,'COMPLETE');
 assert.equal(result.publicTargetIds.length,10);
 assert.equal(result.executed,60);
 assert.equal(result.publicConnection,'NOT_ACTIVATED');
 assert.equal(result.schedulerWrites,0);
 assert.equal(result.inputFingerprint.length,64);
});

test('one-shot shadow replays all themes with CAS only in memory and leaves PC data unchanged',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-transient-shadow-'));
 t.after(()=>fs.rmSync(root,{recursive:true}));
 const store=createTransientThemeCheckpointStore();
 const result=await runStoredOperationalPrivate({dataRoot:root,adapters:handlers,store});
 assert.equal(result.status,'COMPLETE');
 assert.equal(result.checkpointPersistence,'TRANSIENT_MEMORY_ONLY');
 assert.equal(fs.existsSync(path.join(root,'theme-platform')),false);
 assert.equal(fs.existsSync(path.join(root,'theme-config')),false);
 assert.equal(result.executed,60);
});

test('in-memory shadow checkpoint still rejects a conflicting revision',async()=>{
 const store=createTransientThemeCheckpointStore(),key='a'.repeat(64);
 await store.save(key,{fingerprint:key,revision:1,tasks:{}},0);
 const loaded=await store.load(key);
 loaded.tasks['one:confirmed']={completed:{}};
 assert.equal((await store.load(key)).tasks['one:confirmed'],undefined);
 await assert.rejects(store.save(key,{fingerprint:key,revision:2,tasks:{}},0),
  /THEME_TRANSIENT_CHECKPOINT_CAS_CONFLICT|THEME_TRANSIENT_CHECKPOINT_IDENTITY/);
});

test('run identity follows actual stored-manifest SHA rather than one fixed daily ID',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-stored-input-'));
 t.after(()=>fs.rmSync(root,{recursive:true}));
 const first=storedInputFingerprint({dataRoot:root});
 const dir=path.join(root,'themes','legacy-nine-r23');
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'raw-manifest.json'),'{"version":1}\n');
 const second=storedInputFingerprint({dataRoot:root});
 assert.notEqual(first,second);
 assert.equal(second,storedInputFingerprint({dataRoot:root}));
});

test('NY-window observation hour changes the checkpoint identity, without a new schedule',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-stored-hour-'));
 t.after(()=>fs.rmSync(root,{recursive:true}));
 const observed=[];
 const saved={load:async key=>{observed.push(key);return null;},save:async()=>{}};
 await runStoredOperationalPrivate({dataRoot:root,adapters:handlers,store:saved,
  now:new Date('2026-11-07T22:59:00Z')});
 await runStoredOperationalPrivate({dataRoot:root,adapters:handlers,store:saved,
  now:new Date('2026-11-07T23:00:00Z')});
 assert.equal(observed.length,2);
 assert.notEqual(observed[0],observed[1]);
});

test('checkpoint resume replays stored artifact proof and fails closed if tampered',async()=>{
 const theme={id:'robotics'};
 const state={fingerprint:'key',revision:1,tasks:{'robotics:confirmed':{
  completed:{source:{status:'VERIFIED',artifactSha256:validSha,
   methodologyVersion:'R32',definitionSha256:validSha,
   observationDate:'2026-10-28',sourceVersion:'SOURCE_SHA'}}}}};
 let proof=validSha;
 const guard=replayCheckedStore({store:{load:async()=>state,save:async()=>{}},
  registry:{themes:[theme]},adapters:{validate:async()=>({
   ...state.tasks['robotics:confirmed'].completed.source,artifactSha256:proof})}});
 assert.deepEqual(await guard.load('key'),state);
 proof='f'.repeat(64);
 await assert.rejects(guard.load('key'),/THEME_STORED_CHECKPOINT_PROOF_STALE/);
});

test('approved fixed-key public reader issues SELECT only and returns D1 readback without writes',async()=>{
 const calls=[],body={status:'READY',phase:'CONFIRMED'};
 const read=createStoredD1FeedReader({dataRoot:'fixture',query:async(sql,params,options)=>{
  calls.push({sql,params,options});
  return {results:[{body:JSON.stringify(body),stored_at:Date.parse('2026-10-28T01:00:00Z')}]};
 }});
 assert.deepEqual(await read('theme-data-center-power-r1'),{
  body,storedAt:Date.parse('2026-10-28T01:00:00Z')});
 assert.equal(calls.length,1);
 assert.match(calls[0].sql,/^SELECT body,stored_at FROM public_feed_snapshots_v1/);
 assert.deepEqual(calls[0].params,['theme-data-center-power-r1']);
 assert.deepEqual(calls[0].options,{write:false});
 await assert.rejects(read('another-account-secret'),/THEME_STORED_D1_FEED_NOT_APPROVED/);
 assert.equal(calls.length,1);
});

test('public D1 reader initializes lazily and cannot block unrelated saved calculations',async()=>{
 const read=createStoredD1FeedReader({dataRoot:'does-not-read-before-first-key'});
 await assert.rejects(read('unauthorized'),/THEME_STORED_D1_FEED_NOT_APPROVED/);
 // No config.json, token or D1 client is required until one approved key is read.
 assert.equal(typeof read,'function');
});

test('R88 reads the existing public API projection rather than manufacturing D1 metadata',async()=>{
 const urls=[],publicBody={status:'READY',modelRevision:'R37_PUBLIC_VERSION',
  r32ProvisionalReaderVersion:'R88_PUBLIC_VERSION'};
 const body=await readStoredPublicR32Base({now:Date.parse('2026-10-30T00:00:00Z'),
  fetchImpl:async(url,options)=>{urls.push({url,options});return {
   ok:true,json:async()=>publicBody};}});
 assert.deepEqual(body,publicBody);
 assert.match(urls[0].url,/^https:\/\/zgmini\.kr\/api\/theme-fear-greed\?ten_r88=/);
 assert.equal(urls[0].options.redirect,'error');
 assert.deepEqual(urls[0].options.headers,{'cache-control':'no-cache'});
});
