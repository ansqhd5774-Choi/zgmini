import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {calculateStoredConfiguredConfirmed,createConfiguredStoredPrivateAdapters} from
 '../scripts/pc-writer/theme-platform-stored-configured.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const id='test-configured',internalId='registered-'+id,hash='a'.repeat(64);
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-w03-conf-stored-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const definition={id,label:'등록테마',etfs:['AAA'],profile:'R32_TEST'};
 const registration={definition,sha256:hash,internalId};
 const dates=Array.from({length:252},(_,i)=>
  new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10));
 const record={status:'PRIVATE_SCORE_READY',themeId:id,profile:definition.profile,
  definitionSha256:hash,publicationAuthorized:false,etfs:[...definition.etfs],
  label:definition.label,sourceVersion:'GMH_MANIFEST_SHA256_'+hash,
  observationDate:dates.at(-1),score:50,
  history:dates.map(date=>({date,score:50}))};
 const dir=path.join(root,'themes',internalId,'derived');
 fs.mkdirSync(dir,{recursive:true});
 const bytes=Buffer.from(JSON.stringify(record,null,2)+'\n'),digest=sha(bytes);
 const file=path.join(dir,'score-'+digest+'.json');fs.writeFileSync(file,bytes);
 const read=overrides=>calculateStoredConfiguredConfirmed({
  dataRoot:root,id,registrationReader:()=>registration,
  scoreCalculator:()=>({...record,...overrides})
 });
 return {root,record,file,read,digest};
}
test('saved-only confirmed configured reader verifies and returns existing immutable score',t=>{
 const f=fixture(t),r=f.read();
 assert.equal(r.artifactSha256,f.digest);
 assert.equal(r.rows.length,1);
 assert.equal(r.rows[0].observationDate,f.record.observationDate);
 assert.equal(r.rows[0].score,50);
 assert.equal(r.rows[0].history.length,252);
});
test('absence, modification and symlink of saved result fail closed',t=>{
 const f=fixture(t);
 fs.appendFileSync(f.file,'tamper');
 assert.throws(()=>f.read(),/THEME_CONFIG_STORED_SCORE_REPLAY_MISMATCH/);
 fs.unlinkSync(f.file);
 assert.throws(()=>f.read(),/THEME_CONFIG_STORED_SCORE_NOT_SAVED/);
 const data=Buffer.from(JSON.stringify(f.record,null,2)+'\n');
 const target=path.join(f.root,'outside.json');fs.writeFileSync(target,data);
 fs.symlinkSync(target,f.file);
 assert.throws(()=>f.read(),/THEME_CONFIG_STORED_SCORE_REPLAY_MISMATCH/);
});
test('unapproved or drifting saved score cannot become stage VERIFIED',t=>{
 const f=fixture(t);
 for(const changes of [{publicationAuthorized:true},{definitionSha256:'b'.repeat(64)},
  {score:null},{observationDate:'2025-11-30'},{status:'PRIVATE_HISTORY_PENDING'},
  {etfs:['WRONG']}])
  assert.throws(()=>f.read(changes),/THEME_CONFIG_STORED_SCORE_CONTRACT/);
});

test('registered confirmed theme runs three shared private stages once without publisher',async()=>{
 const {R32,runThemeBatch}=await import('../scripts/pc-writer/theme-platform.mjs');
 const {OPERATIONAL_METHODS}=await import('../scripts/pc-writer/theme-platform-operational.mjs');
 const t={id,label:'등록테마',enabled:true,public:false,
  methodologyVersion:R32,etfs:['AAA'],benchmark:'SPY',
  approvalSha256:hash,inputs:{
   confirmed:{adapter:'saved-gmh',priceMode:'RAW'},
   provisional:{adapter:'saved-gmh',priceMode:'RAW'}
  },publication:{confirmed:'logical:'+id+':confirmed',
   provisional:'logical:'+id+':provisional'},
  operational:{family:'configured',owner:'configured-existing'}};
 const registry={schema:'ZGMINI_THEME_PLATFORM_V1',themes:[t]};
 let called=0,stored;
 const configured=createConfiguredStoredPrivateAdapters({
  dataRoot:'fixture',provisionalCalculator:async()=>{
   throw Object.assign(new Error('APPROVAL_MISSING'),
    {code:'THEME_CONFIG_PROVISIONAL_APPROVAL_OR_SOURCE_MISSING'});
  },calculator:()=>{called++;return {
   artifactSha256:hash,rows:[{label:t.label,etfs:t.etfs,
    methodologyVersion:R32,observationDate:'2026-10-28',
    score:50,sourceVersion:'GMH_MANIFEST_'+hash,
    history:Array.from({length:252},(_,i)=>({
     date:i===251?'2026-10-28':
      new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),
     score:50
    }))}]
  };}});
 const store={load:async()=>structuredClone(stored??null),
  save:async(_,value,revision)=>{
   assert.equal(revision,stored?.revision??0);
   stored=structuredClone(value);
  }};
 const a=await runThemeBatch({registry,adapters:configured,store,runKey:'configured-only',
  formulas:OPERATIONAL_METHODS});
 assert.equal(called,1,'confirmed replay must be shared across all three stages');
 assert.equal(a.status,'PARTIAL','missing publication rights must fail closed');
 assert.equal(a.results[0].status,'COMPLETE');
 assert.equal(a.results[1].code,'THEME_CONFIG_PROVISIONAL_APPROVAL_OR_SOURCE_MISSING');
 assert.equal(stored.tasks[id+':confirmed'].completed.validate.publicationAuthorized,false);
 const b=await runThemeBatch({registry,adapters:configured,store,runKey:'configured-only',
  formulas:OPERATIONAL_METHODS});
 assert.equal(b.executed,1,'only blocked provisional should retry');
 assert.equal(called,1);
});

test('stored confirmed and provisional replay each once via common checkpoint with no D1',async()=>{
 const {R32,runThemeBatch}=await import('../scripts/pc-writer/theme-platform.mjs');
 const {OPERATIONAL_METHODS}=await import('../scripts/pc-writer/theme-platform-operational.mjs');
 const theme={id,label:'등록테마',enabled:true,public:false,
  methodologyVersion:R32,etfs:['AAA'],benchmark:'SPY',
  approvalSha256:hash,inputs:{
   confirmed:{adapter:'saved-gmh',priceMode:'RAW'},
   provisional:{adapter:'saved-parquet',priceMode:'SPLIT_ADJUSTED'}
  },publication:{confirmed:'logical:'+id+':confirmed',
   provisional:'logical:'+id+':provisional'},
  operational:{family:'configured',owner:'configured-existing'}};
 const confirmedHistory=Array.from({length:252},(_,i)=>({
  date:i===251?'2026-10-28':
   new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),
  score:50
 }));
 const savedConfirmed={artifactSha256:hash,rows:[{
  label:theme.label,etfs:theme.etfs,methodologyVersion:R32,
  observationDate:'2026-10-28',score:50,
  sourceVersion:'GMH_MANIFEST_'+hash,history:confirmedHistory
 }]};
 const savedProvisional={artifactSha256:'b'.repeat(64),
  historicalReaderContract:'LOCAL_SAVED_R32_REPLAY_VERIFIED',
  currentVisibility:'UNKNOWN_D1_STORED_AT_NOT_READ',rows:[{
   label:theme.label,etfs:theme.etfs,methodologyVersion:R32,
   observationDate:'2026-10-29',confirmedObservationDate:'2026-10-28',
   score:51,sourceVersion:'R32_PROVISIONAL_SHA256_'+'c'.repeat(64),
   points:[{date:'2026-10-29',score:51}]
  }]};
 let confirmedCalls=0,provisionalCalls=0,state;
 const adapters=createConfiguredStoredPrivateAdapters({dataRoot:'fixture',
  calculator:()=>{confirmedCalls++;return savedConfirmed;},
  provisionalCalculator:({confirmedResult,theme:t})=>{
   provisionalCalls++;
   assert.equal(t,theme);
   assert.equal(confirmedResult,savedConfirmed);
   return savedProvisional;
  }});
 const store={load:async()=>structuredClone(state??null),
  save:async(_,value,revision)=>{
   assert.equal(revision,state?.revision??0);
   state=structuredClone(value);
  }};
 const args={registry:{schema:'ZGMINI_THEME_PLATFORM_V1',themes:[theme]},
  adapters,store,runKey:'registered-stored-provisional',
  formulas:OPERATIONAL_METHODS};
 const first=await runThemeBatch(args);
 assert.equal(first.status,'COMPLETE');
 assert.equal(first.executed,6);
 assert.equal(confirmedCalls,1);
 assert.equal(provisionalCalls,1);
 assert.equal(state.tasks[id+':provisional'].completed.validate.publicationAuthorized,false);
 assert.equal(state.tasks[id+':provisional'].completed.validate.currentVisibility,
  'UNKNOWN_D1_STORED_AT_NOT_READ');
 const resumed=await runThemeBatch(args);
 assert.equal(resumed.executed,0);
 assert.equal(confirmedCalls,1);
 assert.equal(provisionalCalls,1);
});

test('provisional cannot claim VERIFIED without saved private replay and unknown D1 visibility',async()=>{
 const {R32}=await import('../scripts/pc-writer/theme-platform.mjs');
 const theme={id,label:'등록테마',etfs:['AAA'],methodologyVersion:R32,
  operational:{family:'configured'}};
 const prior={artifactSha256:hash,rows:[{label:theme.label,etfs:theme.etfs,
  methodologyVersion:R32,observationDate:'2026-10-28',score:50,
  sourceVersion:'GMH_MANIFEST_'+hash,
  history:Array.from({length:252},(_,i)=>({
   date:i===251?'2026-10-28':
    new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),
   score:50
  }))}]};
 const a=createConfiguredStoredPrivateAdapters({dataRoot:'fixture',
  calculator:()=>prior,provisionalCalculator:()=>({
   artifactSha256:'b'.repeat(64),currentVisibility:'READY',
   historicalReaderContract:'LOCAL_SAVED_R32_REPLAY_VERIFIED',
   rows:[{label:theme.label,etfs:theme.etfs,methodologyVersion:R32,
    observationDate:'2026-10-29',confirmedObservationDate:'2026-10-28',
    score:51,sourceVersion:'R32_PROVISIONAL_SHA256_'+'c'.repeat(64),
    points:[{date:'2026-10-29',score:51}]}]
  })});
 await assert.rejects(a.source({theme,kind:'provisional',stage:'source',completed:{}}),
  /THEME_CONFIG_STORED_PROJECTION_MISMATCH/);
});
