import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {R32} from '../scripts/pc-writer/theme-platform.mjs';
import {createTransientConfiguredCheckpointStore,configuredStoredFingerprint,
 runConfiguredStoredPrivateBatch} from '../scripts/pc-writer/theme-platform-configured-stored-run.mjs';

const sha=x=>x.repeat(64);
const dates=Array.from({length:252},(_,i)=>
 new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10));
const observed=dates.at(-1);

function fixture(t,n=1){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'w03-saved-batch-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const registrations=Array.from({length:n},(_,i)=>{
  const id='configured-fixture-'+i;
  const reg={sha256:sha('a'),internalId:'registered-'+id,
   definition:{schema:'ZGMINI_THEME_CONFIG_V2',id,label:'등록테마 '+i,
    etfs:['AAA'],benchmark:'SPY',profile:R32}};
  const home=path.join(root,'themes',reg.internalId);
  fs.mkdirSync(home,{recursive:true});
  fs.writeFileSync(path.join(home,'raw-manifest.json'),
   JSON.stringify({version:1,themeId:reg.internalId,files:[]})+'\n');
  return reg;
 });
 const counters={confirmed:0,provisional:0};
 const calc=({id})=>{
  counters.confirmed++;
  const r=registrations.find(r=>r.definition.id===id);
  return {artifactSha256:sha('b'),rows:[{
   label:r.definition.label,etfs:['AAA'],methodologyVersion:R32,
   observationDate:observed,score:50,history:dates.map(date=>({date,score:50})),
   sourceVersion:'GMH_MANIFEST_SHA256_'+sha('e')}]};
 };
 const provisional=({theme,confirmedResult})=>{
  counters.provisional++;
  assert.equal(confirmedResult.artifactSha256,sha('b'));
  return {artifactSha256:sha('c'),
   historicalReaderContract:'LOCAL_SAVED_R32_REPLAY_VERIFIED',
   currentVisibility:'UNKNOWN_D1_STORED_AT_NOT_READ',
   rows:[{label:theme.label,etfs:['AAA'],methodologyVersion:R32,
    observationDate:'2025-09-11',confirmedObservationDate:observed,
    score:51,points:[{date:'2025-09-11',score:51}],
    sourceVersion:'R32_PROVISIONAL_SHA256_'+sha('f')}]};
 };
 return {root,registrations,counters,calc,provisional};
}
test('configured-only private batch runs both saved phases for two registered themes and resumes',async t=>{
 const f=fixture(t,2),store=createTransientConfiguredCheckpointStore();
 const args={dataRoot:f.root,registrations:f.registrations,store,
  calculator:f.calc,provisionalCalculator:f.provisional};
 const first=await runConfiguredStoredPrivateBatch(args);
 assert.equal(first.status,'COMPLETE');
 assert.equal(first.executed,12);
 assert.equal(first.registeredThemes,2);
 assert.equal(first.providerCalls,'UNVERIFIED_INJECTED_CALCULATOR');
 assert.equal(first.d1Reads,'UNVERIFIED_INJECTED_CALCULATOR');
 assert.equal(first.d1Writes,'UNVERIFIED_INJECTED_CALCULATOR');
 assert.equal(first.schedulerWrites,'UNVERIFIED_INJECTED_CALCULATOR');
 assert.equal(first.publicConnection,'NOT_ACTIVATED');
 assert.equal(first.checkpointPersistence,'TRANSIENT_MEMORY_ONLY');
 assert.deepEqual(f.counters,{confirmed:2,provisional:2});
 const next=await runConfiguredStoredPrivateBatch(args);
 assert.equal(next.status,'COMPLETE');
 assert.equal(next.executed,0);
 assert.deepEqual(f.counters,{confirmed:4,provisional:4},
  'checkpoint proof must be rechecked against actual saved replay');
 assert.equal(fs.existsSync(path.join(f.root,'theme-platform')),false);
});
test('checkpoint refuses stale saved calculation and cannot quietly skip prior stages',async t=>{
 const f=fixture(t),store=createTransientConfiguredCheckpointStore();
 const args={dataRoot:f.root,registrations:f.registrations,store,
  calculator:f.calc,provisionalCalculator:f.provisional};
 const first=await runConfiguredStoredPrivateBatch(args);
 assert.equal(first.status,'COMPLETE');
 await assert.rejects(runConfiguredStoredPrivateBatch({...args,
  calculator:({id})=>({...f.calc({id}),artifactSha256:sha('d')})}),
  /THEME_CONFIGURED_CHECKPOINT_PROOF_STALE/);
});
test('source manifest mutation changes fingerprint so checkpoint cannot reuse previous evidence',async t=>{
 const f=fixture(t),store=createTransientConfiguredCheckpointStore();
 const args={dataRoot:f.root,registrations:f.registrations,store,
  calculator:f.calc,provisionalCalculator:f.provisional};
 const first=await runConfiguredStoredPrivateBatch(args);
 const file=path.join(f.root,'themes',f.registrations[0].internalId,'raw-manifest.json');
 fs.writeFileSync(file,JSON.stringify({version:1,themeId:f.registrations[0].internalId,files:[],
  observedAt:'2026-11-15'})+'\n');
 assert.notEqual(configuredStoredFingerprint({dataRoot:f.root,registrations:f.registrations}),
  first.inputFingerprint);
 const second=await runConfiguredStoredPrivateBatch(args);
 assert.equal(second.executed,6,'different saved source cannot reuse prior checkpoint');
});
test('without registrations, shadow returns no work and creates no files',async t=>{
 const f=fixture(t,0),result=await runConfiguredStoredPrivateBatch({
  dataRoot:f.root,registrations:[]});
 assert.equal(result.status,'NO_REGISTERED_THEMES');
 assert.equal(result.checkpointPersistence,'NONE');
 assert.equal(result.providerCalls,0);
 assert.equal(result.d1Writes,0);
});

test('approved local revision checkpoint implementation persists and resumes without a new scheduler',async t=>{
 const f=fixture(t);
 const {createThemeCheckpointStore}=await import('../scripts/pc-writer/theme-platform-store.mjs');
 const store=createThemeCheckpointStore({dataRoot:f.root});
 const args={dataRoot:f.root,registrations:f.registrations,store,
  calculator:f.calc,provisionalCalculator:f.provisional};
 const first=await runConfiguredStoredPrivateBatch(args);
 assert.equal(first.status,'COMPLETE');
 assert.equal(first.executed,6);
 assert.equal(first.publicConnection,'NOT_ACTIVATED');
 const home=path.join(f.root,'theme-platform','checkpoints',first.fingerprint);
 assert.ok(fs.existsSync(path.join(home,'revision-6.json')));
 assert.equal(fs.readdirSync(home).length,6);
 const next=await runConfiguredStoredPrivateBatch(args);
 assert.equal(next.executed,0);
 assert.equal(fs.readdirSync(home).length,6,'unchanged source must not write a revision');
 const priorSha=first.inputFingerprint;
 const raw=path.join(f.root,'themes',f.registrations[0].internalId,'raw-manifest.json');
 fs.appendFileSync(raw,' ');
 const changed=await runConfiguredStoredPrivateBatch(args);
 assert.equal(changed.executed,6);
 assert.notEqual(changed.inputFingerprint,priorSha);
 assert.ok(fs.existsSync(path.join(f.root,'theme-platform','checkpoints',
  changed.fingerprint,'revision-6.json')));
 assert.ok(fs.existsSync(path.join(home,'revision-6.json')),
  'original immutable history must not be overwritten');
});

test('bounded multi-theme stored batch resumes remaining stages without resetting history',async t=>{
 const f=fixture(t,2);
 const {createThemeCheckpointStore}=await import('../scripts/pc-writer/theme-platform-store.mjs');
 const store=createThemeCheckpointStore({dataRoot:f.root});
 const args={dataRoot:f.root,registrations:f.registrations,store,
  calculator:f.calc,provisionalCalculator:f.provisional};
 const first=await runConfiguredStoredPrivateBatch({...args,maxStages:5});
 assert.equal(first.status,'RUNNING');
 assert.equal(first.executed,5);
 assert.equal(first.publicConnection,'NOT_ACTIVATED');
 const current=path.join(f.root,'theme-platform','checkpoints',first.fingerprint);
 assert.ok(fs.existsSync(path.join(current,'revision-5.json')));
 const resumed=await runConfiguredStoredPrivateBatch({...args,maxStages:20});
 assert.equal(resumed.status,'COMPLETE');
 assert.equal(resumed.executed,7);
 assert.equal(resumed.fingerprint,first.fingerprint);
 assert.ok(fs.existsSync(path.join(current,'revision-12.json')));
 assert.ok(fs.existsSync(path.join(current,'revision-5.json')),
  'a resumed run must retain its earlier exact immutable revisions');
 const again=await runConfiguredStoredPrivateBatch(args);
 assert.equal(again.executed,0);
 assert.equal(fs.readdirSync(current).length,12);
});
