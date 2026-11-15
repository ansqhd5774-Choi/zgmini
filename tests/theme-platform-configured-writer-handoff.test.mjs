import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareConfiguredExistingWriterHandoff} from
 '../scripts/pc-writer/theme-platform-configured-writer-handoff.mjs';

const hash='a'.repeat(64),id='configured-fixture',date='2026-11-13';
const row={label:'Registered Fixture',etfs:['AAA'],methodologyVersion:
 'ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_DATED_ISSUER_AUM_R32',
 observationDate:date,score:58,sourceVersion:'GMH_MANIFEST_SHA256_'+hash,
 history:[{date,score:58}]};
const stored={artifactSha256:hash,rows:[row]};
const approved={status:'PREFLIGHT_PASS_NO_REMOTE_ACCESS',stage:'LOCAL_PREPARATION_COMPLETE',
 providerCalls:0,d1Queries:0,d1Writes:0,schedulerWrites:0,publicationExecuted:false,
 feedKey:'theme-configured:'+id,candidateSha256:hash,
 approvalSha256:'b'.repeat(64),candidate:{
  status:'READY',themeId:id,candidateSha256:hash,methodologyVersion:row.methodologyVersion,
  sourceVersion:row.sourceVersion,observationDate:date,score:58,
  etfs:[...row.etfs],history:[...row.history]
 }};
const args={dataRoot:'fixture',id,now:Date.parse('2026-11-15T09:00:00Z'),
 storedReader:()=>stored,preflight:()=>approved};

test('existing Writer handoff compares exact private stored result and does not publish',()=>{
 const r=prepareConfiguredExistingWriterHandoff(args);
 assert.equal(r.status,'LOCAL_HANDOFF_MATCH_NOT_PUBLISHED');
 assert.equal(r.scoreArtifactSha256,hash);
 assert.equal(r.feedKey,'theme-configured:'+id);
 assert.equal(r.independentProviderRightsVerified,false);
 assert.equal(r.writerOwner,'EXISTING_CONFIGURED_WRITER');
 assert.equal(r.providerCalls,0);
 assert.equal(r.d1Queries,0);
 assert.equal(r.d1Writes,0);
 assert.equal(r.schedulerWrites,0);
 assert.equal(r.publicationExecuted,false);
});

test('missing operator/publication approval yields BLOCKED without claiming saved result publication',()=>{
 const r=prepareConfiguredExistingWriterHandoff({...args,
  preflight:()=>({status:'PREFLIGHT_BLOCKED',stage:'OPERATOR_PUBLICATION_APPROVAL',
   reason:'PUBLIC_RIGHTS_EVIDENCE_REQUIRED'})});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.reason,'PUBLIC_RIGHTS_EVIDENCE_REQUIRED');
 assert.equal(r.d1Writes,0);
 assert.equal(r.publicationExecuted,false);
});

test('missing stored score never asks the existing Writer to publish',()=>{
 let called=0;
 const r=prepareConfiguredExistingWriterHandoff({...args,
  storedReader:()=>{throw Object.assign(Error('NO_SCORE'),{code:'THEME_CONFIG_STORED_SCORE_NOT_SAVED'});},
  preflight:()=>{called++;return approved;}});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.reason,'THEME_CONFIG_STORED_SCORE_NOT_SAVED');
 assert.equal(called,0);
});

test('same identity with different score, date or history is not a verified writer handoff',()=>{
 for(const variant of [
  {score:59},
  {observationDate:'2026-11-12'},
  {sourceVersion:'GMH_MANIFEST_SHA256_'+'c'.repeat(64)},
  {history:[{date,score:57}]},
  {etfs:['BBB']},
  {candidateSha256:'b'.repeat(64)},
 ]){
  const next={...approved,candidate:{...approved.candidate,...variant}};
  assert.throws(()=>prepareConfiguredExistingWriterHandoff({...args,
   preflight:()=>next}),/THEME_WRITER_SAVED_PREFLIGHT_MISMATCH/);
 }
});

test('candidate digest or operator approval digest absent blocks handoff',()=>{
 for(const overrides of [{candidateSha256:'x'}, {approvalSha256:'invalid'},
  {d1Writes:1}, {publicationExecuted:true}]){
  assert.throws(()=>prepareConfiguredExistingWriterHandoff({...args,
   preflight:()=>({...approved,...overrides})}),
   /THEME_WRITER_SAVED_PREFLIGHT_MISMATCH/);
 }
});
