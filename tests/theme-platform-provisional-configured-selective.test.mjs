import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {calculateStoredConfiguredProvisional} from
 '../scripts/pc-writer/theme-platform-provisional-configured.mjs';
import {R32} from '../scripts/pc-writer/theme-platform.mjs';
import {CONFIGURED_V2,CONFIGURED_PROVISIONAL_MODE} from
 '../worker/theme-configured-r32-contract.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const suffix=c=>c.repeat(64);
const id='registered-sample';
const label='등록 테마';
const sourceFiles=[
 {date:'2026-11-07',sha256:suffix('a')},
 {date:'2026-11-10',sha256:suffix('b')}];
const history=Array.from({length:252},(_,i)=>({
 date:new Date(Date.UTC(2026,10,7)-(251-i)*86400000).toISOString().slice(0,10),
 score:49,mode:'CONFIRMED',contributingETFs:['AAA'],
 weightsPercent:{AAA:100},issuerAumAsOf:{AAA:'2026-02-01'},
 datedOfficialAumUsed:false,excluded:[]}));

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-config-provisional-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const theme={id,label,etfs:['AAA'],methodologyVersion:R32,
  operational:{family:'configured'}};
 const registration={internalId:'registered-'+id,sha256:suffix('d'),
  definition:{schema:'ZGMINI_THEME_CONFIG_V2',id,label,etfs:['AAA'],
   profile:R32,aumEvidence:{path:'approval/test.json',sha256:suffix('f')}}};
 const confirmed={status:'READY',version:CONFIGURED_V2,themeId:id,
  etfs:['AAA'],methodologyVersion:R32,
  definitionSha256:registration.sha256,approvalSha256:suffix('e'),
  candidateSha256:suffix('c'),publicationAuthorized:true,
  sourceVersion:'GMH_MANIFEST_SHA256_'+suffix('1'),
  score:49,observationDate:'2026-11-07',history};
 const prior={rows:[{label,etfs:['AAA'],methodologyVersion:R32,
  observationDate:confirmed.observationDate,score:confirmed.score,
  sourceVersion:confirmed.sourceVersion,history}]};
 const record={...confirmed,phase:'PROVISIONAL',
  confirmedObservationDate:'2026-11-07',observationDate:'2026-11-10',
  sourceVersion:'R32_PROVISIONAL_SHA256_'+suffix('3'),
  sourceStoredAt:'2026-11-10T10:00:00.000Z',
  score:51,
  history:[{date:'2026-11-10',score:51,mode:'PROVISIONAL',
   contributingETFs:['AAA'],weightsPercent:{AAA:100},
   issuerAumAsOf:{AAA:'2026-11-07'},
   datedOfficialAumUsed:false,excluded:[]}],
  sourceFiles,sourcePriceMode:CONFIGURED_PROVISIONAL_MODE,
  sourcePriceReconciled:false,overlapPriceDifferences:{SPY:0.01,AAA:0.02}};
 const directory=path.join(root,'themes',registration.internalId,'derived');
 fs.mkdirSync(directory,{recursive:true});
 const save=(rec=record)=>{
  const bytes=Buffer.from(JSON.stringify(rec,null,2)+'\n');
  fs.writeFileSync(path.join(directory,'provisional-'+hash(bytes)+'.json'),bytes);
  return hash(bytes);
 };
 const artifactSha256=save();
 const calls={saved:0,calculated:0};
 const fake={
  dataRoot:root,theme,confirmedResult:prior,now:new Date('2026-11-15T01:00:00Z'),
  registrationReader:()=>registration,
  preflight:()=>({status:'PREFLIGHT_PASS_NO_REMOTE_ACCESS',candidate:confirmed}),
  sessionReader:()=>({sessions:new Map([['AAA',[]]])}),
  evidenceReader:()=>({rows:[]}),
  savedReader:async({dates})=>{
   calls.saved++;assert.deepEqual(dates,sourceFiles.map(f=>f.date));
   return {rows:new Map(dates.map(d=>[d,[]])),
    hashes:new Map(sourceFiles.map(f=>[f.date,f.sha256])),
    sourceStoredAt:record.sourceStoredAt};
  },
  calculate:({definition,confirmed:input,prior:old,sourceStoredAt})=>{
   calls.calculated++;
   assert.equal(definition.id,id);
   assert.equal(input,confirmed);
   assert.deepEqual(old.history,[]);
   assert.equal(sourceStoredAt,record.sourceStoredAt);
   return record;
  }
 };
 return {root,theme,confirmed,record,prior,registration,
  fake,save,calls,artifactSha256};
}

test('configured R32 provisional bridges exact already-saved candidate without public writes',async t=>{
 const f=fixture(t);
 const proof=await calculateStoredConfiguredProvisional(f.fake);
 assert.equal(proof.artifactSha256,f.artifactSha256);
 assert.equal(proof.currentVisibility,'UNKNOWN_D1_STORED_AT_NOT_READ');
 assert.equal(proof.historicalReaderContract,'LOCAL_SAVED_R32_REPLAY_VERIFIED');
 assert.deepEqual(proof.rows,[{label,etfs:['AAA'],methodologyVersion:R32,
  observationDate:'2026-11-10',score:51,confirmedObservationDate:'2026-11-07',
  points:[{date:'2026-11-10',score:51}],
  sourceVersion:f.record.sourceVersion}]);
 assert.deepEqual(f.calls,{saved:1,calculated:1});
});

test('configured replay rejects missing rights without reading saved prices',async t=>{
 const f=fixture(t);
 f.fake.preflight=()=>({status:'PREFLIGHT_BLOCKED'});
 await assert.rejects(calculateStoredConfiguredProvisional(f.fake),
  /THEME_CONFIG_PROVISIONAL_APPROVAL_OR_SOURCE_MISSING/);
 assert.equal(f.calls.saved,0);
});

test('configured replay rejects a changed raw SHA and never accepts cached scores',async t=>{
 const f=fixture(t);
 f.fake.savedReader=async()=>({rows:new Map(),hashes:new Map()});
 await assert.rejects(calculateStoredConfiguredProvisional(f.fake),
  /THEME_CONFIG_PROVISIONAL_RAW_SHA_MISMATCH/);
 assert.equal(f.calls.calculated,0);
});

test('configured replay rejects changed source observation time',async t=>{
 const f=fixture(t);
 f.fake.savedReader=async()=>({rows:new Map(),hashes:new Map(
  sourceFiles.map(x=>[x.date,x.sha256])),
  sourceStoredAt:'2026-11-11T10:00:00.000Z'});
 await assert.rejects(calculateStoredConfiguredProvisional(f.fake),
  /THEME_CONFIG_PROVISIONAL_SOURCE_TIME_MISMATCH/);
 assert.equal(f.calls.calculated,0);
});

test('configured replay rejects nonidentical replay and same-date ambiguous candidates',async t=>{
 const f=fixture(t);
 f.fake.calculate=()=>({...f.record,score:52});
 await assert.rejects(calculateStoredConfiguredProvisional(f.fake),
  /THEME_CONFIG_PROVISIONAL_REPLAY_MISMATCH/);
 f.save({...f.record,replayVariant:'DIFFERENT_SAVED_BYTES'});
 await assert.rejects(calculateStoredConfiguredProvisional(f.fake),
  /THEME_CONFIG_PROVISIONAL_SAME_DAY_AMBIGUOUS/);
});


test('MarketParquet private provisional must never publish under GMH-only rights',async()=>{
 const {publishConfiguredProvisional}=await import('../scripts/pc-writer/theme-config-provisional.mjs');
 let d1Queries=0;
 await assert.rejects(publishConfiguredProvisional({dataRoot:'fixture',id,
  query:async()=>{d1Queries++;throw Error('UNEXPECTED_D1_WRITE');}}),
  /CONFIG_PROVISIONAL_MARKETPARQUET_PUBLIC_RIGHTS_NOT_VERIFIED/);
 assert.equal(d1Queries,0);
});
