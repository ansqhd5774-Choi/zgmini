import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {identity} from '../scripts/pc-writer/theme-platform.mjs';
import {storedInputFingerprint,runStoredOperationalPrivate,replayCheckedStore} from
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
