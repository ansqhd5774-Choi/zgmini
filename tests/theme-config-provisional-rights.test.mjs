import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {R32} from '../scripts/pc-writer/theme-platform.mjs';
import {publishConfiguredProvisional} from '../scripts/pc-writer/theme-config-provisional.mjs';
import {runConfiguredAutoPublish} from '../scripts/pc-writer/theme-config-auto-publish.mjs';

const now=Date.parse('2026-10-29T04:00:00Z');
function fixture(t,schema='ZGMINI_THEME_CONFIG_V2'){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'zg-w03-marketparquet-rights-'));
 t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const dir=path.join(home,'theme-config','definitions');
 fs.mkdirSync(dir,{recursive:true});
 const v2=schema==='ZGMINI_THEME_CONFIG_V2';
 const d={schema,id:'first',label:'저장 확정 테스트',provider:'getmarkethistory',
  profile:v2?R32:'ADAPTIVE_R2_PAIR_R3',
  etfs:v2?['BOTZ']:['BOTZ','ROBO'],benchmark:'SPY',
  startDate:'2026-10-01',
  ...(v2?{
   selectionEvidence:{path:'proof/selection.json',sha256:'a'.repeat(64)},
   aumEvidence:{path:'proof/aum.json',sha256:'b'.repeat(64)},
   provisionalPolicy:'GMH_CONFIRMED_MARKETPARQUET_PROVISIONAL_R8_OVERLAP_GUARD'
  }:{})};
 fs.writeFileSync(path.join(dir,'first.json'),JSON.stringify(d)+'\n');
 return {home,d};
}

test('W03 separate EOD provider rights block occurs before any D1 query, parquet or local writes',async t=>{
 const {home}=fixture(t);
 // A GMH-only operator record is not a MarketParquet-derived publication grant.
 const approvals=path.join(home,'theme-config','public-approvals');
 fs.mkdirSync(approvals);fs.writeFileSync(path.join(approvals,'first.json'),'{}\n');
 let queries=0,decodes=0;
 await assert.rejects(
  publishConfiguredProvisional({dataRoot:home,id:'first',now,
   query:async()=>{queries++;throw Error('D1 unexpectedly contacted');},
   decoder:async()=>{decodes++;throw Error('source unexpectedly decoded');}}),
  {code:'CONFIG_PROVISIONAL_INDEPENDENT_EOD_PUBLIC_RIGHTS_REQUIRED'}
 );
 assert.equal(queries,0);assert.equal(decodes,0);
 assert.deepEqual(fs.readdirSync(home).sort(),['theme-config']);
});

test('W03 legacy V1 configured themes keep existing no-op provisional contract',async t=>{
 const {home}=fixture(t,'ZGMINI_THEME_CONFIG_V1');
 const result=await publishConfiguredProvisional({
  dataRoot:home,id:'first',now,query:()=>{throw Error('D1 not allowed');}
 });
 assert.deepEqual(result,{status:'LEGACY_V1_UNCHANGED',written:0});
});

test('W03 auto-publish can retain separately approved GMH confirmed result but blocks MarketParquet provisional',async t=>{
 const {home,d}=fixture(t);
 const approvalPath=path.join(home,'theme-config','public-approvals');
 fs.mkdirSync(approvalPath);fs.writeFileSync(path.join(approvalPath,'first.json'),'{}\n');
 const sha='a'.repeat(64),proof={status:'PREFLIGHT_PASS_NO_REMOTE_ACCESS',
  candidateSha256:sha,approvalSha256:'c'.repeat(64),
  feedKey:'theme-configured:first',
  candidate:{observationDate:'2026-10-28',
   sourceVersion:'GMH_MANIFEST_SHA256_'+'b'.repeat(64)}};
 let d1Reads=0,confirmed=0;
 const report=await runConfiguredAutoPublish({dataRoot:home,now,
  registrations:[{definition:d}],preflight:()=>proof,
  prepareHandoff:()=>({status:'LOCAL_HANDOFF_MATCH_NOT_PUBLISHED',
   feedKey:proof.feedKey,scoreArtifactSha256:sha,
   localApprovalSha256:proof.approvalSha256,
   observationDate:proof.candidate.observationDate,
   sourceVersion:proof.candidate.sourceVersion,
   publicationExecuted:false,d1Writes:0}),
  readCapabilities:async()=>({supportedMethodologies:[R32],
   supportsSeparateR32Provisional:true}),
  tokenFn:()=>null,
  queryFactory:()=>async()=>{d1Reads++;return {results:[]};},
  publish:async()=>{confirmed++;return {status:'WRITTEN_AND_READBACK_VERIFIED',
   written:1,observationDate:'2026-10-28',storedAt:now};}
 });
 assert.equal(confirmed,1);
 assert.equal(d1Reads,1,'only confirmed CAS preflight, no provisional D1 access');
 assert.equal(report.providerCalls,0);
 assert.equal(report.d1Writes,1);
 assert.equal(report.status,'PUBLICATION_PARTIAL_REVIEW_REQUIRED');
 assert.equal(report.results[0].status,'WRITTEN_AND_READBACK_VERIFIED');
 assert.deepEqual(report.results[1],{id:'first',phase:'PROVISIONAL',
  status:'PUBLICATION_BLOCKED',
  reason:'CONFIG_PROVISIONAL_INDEPENDENT_EOD_PUBLIC_RIGHTS_REQUIRED'});
});
