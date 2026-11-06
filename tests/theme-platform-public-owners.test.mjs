import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createExistingPublicOwnerAdapters,readExistingThemePublic} from
 '../scripts/pc-writer/theme-platform-public-owners.mjs';
import {loadOperationalSources} from
 '../scripts/pc-writer/theme-platform-operational.mjs';
import {planPublicPhysicalCycle,runPublicPhysicalCycle} from
 '../scripts/pc-writer/theme-platform-public-cycle.mjs';
import {R88_VERSION} from '../worker/theme-nine-r88-provisional.mjs';

const plan=planPublicPhysicalCycle();
const base={status:'READY',confirmedObservationDate:'2026-11-05',
 r32ProvisionalReaderVersion:R88_VERSION};
const context=Object.fromEntries(plan.groups.map(g=>[g.feedKey,{
 selectionVerified:true,formulaVerified:true,inputVerified:true,
 rightsEvidenceValid:true,publicationApprovalValid:true,readerCompatible:true}]));
const grant=JSON.parse(fs.readFileSync(new URL('../config/theme-platform-delegation.json',import.meta.url)));
const by=(family,kind)=>plan.groups.find(g=>g.family===family&&g.kind===kind);
const call=async(owners,group)=>owners[group.feedKey]({feedKey:group.feedKey,
 family:group.family,kind:group.kind,methodologyVersion:group.methodologyVersion});
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-theme-stage4-owner-'));
 const consent=path.join(dir,'pc-writer','theme-nine-r54');
 const parquet=path.join(dir,'theme-market-history-r131','marketparquet-r165');
 fs.mkdirSync(consent,{recursive:true});fs.mkdirSync(parquet,{recursive:true});
 fs.writeFileSync(path.join(consent,'PUBLISHER_CONSENT_TEN_R88.txt'),
  'APPROVED_TEN_THEMES_TWO_SOURCE_PROVISIONAL_20261030\n');
 fs.writeFileSync(path.join(parquet,'etf_daily_2026-11-06.parquet'),Buffer.from('test-only'));
 return {dir,parquet,cleanup(){fs.rmSync(dir,{recursive:true,force:true});}};
}
function mocked(trace){
 const report={status:'PUBLIC_API_VERIFIED',d1Writes:1,providerCalls:0,schedulerWrites:0};
 return {
  token:async()=>{trace.push(['token']);return 'NON_SECRET_TEST_TOKEN';},
  query:options=>{trace.push(['query',Object.keys(options)]);return async()=>({results:[]});},
  dcDb:options=>{trace.push(['dcDb',Object.keys(options)]);return {};},
  runR37:async args=>{trace.push(['r37',args]);return report;},
  buildR88:async args=>{trace.push(['buildR88',args]);return {record:{
   observationDate:args.targetDate,confirmedObservationDate:args.base.confirmedObservationDate}};},
  publishR88:async args=>{trace.push(['publishR88',args]);
   return {status:'WRITTEN_AND_READBACK_VERIFIED',d1Writes:1};},
  runDc:async args=>{trace.push(['dc',args]);return report;},
  runSpace:async args=>{trace.push(['space',args]);return report;},
  runDcR8:async args=>{trace.push(['dcR8',args]);return report;},
  runSpaceR8:async args=>{trace.push(['spaceR8',args]);return report;},
 };
}

test('existing public reader uses canonical trailing slash with redirect disallowed',async()=>{
 const trace=[];
 const result=await readExistingThemePublic({now:123,fetchImpl:async(url,options)=>{
  trace.push({url,options});return {ok:true,json:async()=>({status:'READY'})};
 }});
 assert.equal(result.status,'READY');
 assert.equal(trace[0].url,'https://zgmini.kr/api/theme-fear-greed/?theme_stage4=123');
 assert.equal(trace[0].options.redirect,'error');
});

test('six exact existing owners: one per physical D1 key, stored-only, no eight-theme R37 slice',async()=>{
 const f=fixture();try{
  const trace=[];
  const owners=createExistingPublicOwnerAdapters({dataRoot:f.dir,allowPublish:true,
   anonymousLicenseRiskAccepted:true,
   publicRead:async()=>base,operations:mocked(trace)});
  assert.deepEqual(Object.keys(owners).sort(),plan.groups.map(g=>g.feedKey).sort());
  for(const group of plan.groups){
   const report=await call(owners,group);
   assert.equal(report.d1Writes,1);
   assert.equal(report.providerCalls,0);
   assert.ok(report.schedulerWrites===undefined||report.schedulerWrites===0);
  }
  const writes=trace.filter(row=>['r37','publishR88','dc','space','dcR8','spaceR8']
   .includes(row[0]));
  assert.deepEqual(writes.map(row=>row[0]).sort(),
   ['r37','publishR88','dc','space','dcR8','spaceR8'].sort());
  const r37=writes.find(row=>row[0]==='r37')[1];
  assert.equal(r37.publisherConsent,true);
  assert.equal(Object.hasOwn(r37,'record'),false);
  assert.equal(Object.hasOwn(r37,'themes'),false);
  assert.equal(trace.find(row=>row[0]==='dc')[1].allowCollect,false);
  assert.equal(trace.find(row=>row[0]==='dc')[1].acceptAnonymousLicenseRisk,true);
  assert.equal(trace.find(row=>row[0]==='space')[1].allowPublish,true);
  assert.equal(trace.find(row=>row[0]==='buildR88')[1].targetDate,'2026-11-06');
 }finally{f.cleanup();}
});

test('data-center source risk acknowledgement is independent from general publish opt-in',async()=>{
 const f=fixture();try{
  const trace=[];
  const owners=createExistingPublicOwnerAdapters({dataRoot:f.dir,allowPublish:true,
   publicRead:async()=>base,operations:mocked(trace)});
  await assert.rejects(()=>call(owners,by('data-center','confirmed')),
   {code:'DC_POWER_R3_EXPLICIT_ANONYMOUS_RISK_ACKNOWLEDGEMENT_REQUIRED'});
  assert.equal(trace.some(row=>row[0]==='token'||row[0]==='dc'),false);
 }finally{f.cleanup();}
});

test('default does not opt into any operational mutation or token lookup',async()=>{
 const f=fixture();try{
  const trace=[];
  const owners=createExistingPublicOwnerAdapters({dataRoot:f.dir,
   publicRead:async()=>base,operations:mocked(trace)});
  await assert.rejects(()=>call(owners,plan.groups[0]),
   {code:'THEME_STAGE4_PUBLISH_NOT_OPTED_IN'});
  assert.deepEqual(trace,[]);
 }finally{f.cleanup();}
});

test('no new archived provisional input returns WAIT without D1 or token operation',async()=>{
 const f=fixture();try{
  fs.unlinkSync(path.join(f.parquet,'etf_daily_2026-11-06.parquet'));
  const trace=[];
  const owners=createExistingPublicOwnerAdapters({dataRoot:f.dir,allowPublish:true,
   publicRead:async()=>base,operations:mocked(trace)});
  const status=await call(owners,by('r37','provisional'));
  assert.equal(status.status,'WAIT_PROVISIONAL_SOURCE');
  assert.equal(status.d1Writes,0);
  assert.deepEqual(trace,[]);
 }finally{f.cleanup();}
});

test('missing R88 raw archive or exact approval evidence fails closed',async()=>{
 const f=fixture();try{
  const trace=[];
  const owners=createExistingPublicOwnerAdapters({dataRoot:f.dir,allowPublish:true,
   publicRead:async()=>base,operations:mocked(trace)});
  fs.renameSync(f.parquet,f.parquet+'-absent');
  await assert.rejects(()=>call(owners,by('r37','provisional')),
   {code:'R88_ARCHIVE_MISSING'});
  fs.unlinkSync(path.join(f.dir,'pc-writer','theme-nine-r54',
   'PUBLISHER_CONSENT_TEN_R88.txt'));
  await assert.rejects(()=>call(owners,by('r37','provisional')),
   {code:'R88_TEN_SCOPE_CONSENT_REQUIRED'});
  assert.deepEqual(trace,[]);
 }finally{f.cleanup();}
});

test('unrecognized key or mismatched owner request cannot invoke a writer',async()=>{
 const f=fixture();try{
  const trace=[];
  const owners=createExistingPublicOwnerAdapters({dataRoot:f.dir,allowPublish:true,
   publicRead:async()=>base,operations:mocked(trace)});
  const group=plan.groups[0];
  await assert.rejects(()=>owners[group.feedKey]({...group,kind:'provisional'}),
   {code:'THEME_STAGE4_OWNER_REQUEST_MISMATCH'});
  assert.equal(owners['theme-unapproved-new-key'],undefined);
  assert.deepEqual(trace,[]);
 }finally{f.cleanup();}
});

test('changed physical D1 key is refused before any operation',()=>{
 const sources=structuredClone(loadOperationalSources());
 sources.bindings.families.r37.confirmed='new-unapproved-d1-key';
 assert.throws(()=>createExistingPublicOwnerAdapters({sources,allowPublish:true}),
  {code:'THEME_STAGE4_EXISTING_OWNER_BINDINGS_CHANGED'});
});

test('grant rights separation prevents invocation of blocked existing owner',async()=>{
 const f=fixture();try{
  const trace=[];
  const owners=createExistingPublicOwnerAdapters({dataRoot:f.dir,allowPublish:true,
   publicRead:async()=>base,operations:mocked(trace)});
  const gate=structuredClone(context);gate[plan.groups[0].feedKey].rightsEvidenceValid=false;
  const result=await runPublicPhysicalCycle({grant,allowPublish:true,
   contextByFeed:gate,owners});
  assert.equal(result.results[0].reason,'RIGHTS_EVIDENCE_MISSING');
  assert.equal(trace.some(row=>row[0]==='r37'),false);
 }finally{f.cleanup();}
});

test('uncertain D1 follow-up stops subsequent physical owner calls',async()=>{
 const f=fixture();try{
  const trace=[];
  const mocks=mocked(trace);
  mocks.runR37=async()=>({status:'D1_WRITE_COMPLETED_FOLLOWUP_FAILED',
   d1Writes:1,providerCalls:0});
  const owners=createExistingPublicOwnerAdapters({dataRoot:f.dir,allowPublish:true,
   publicRead:async()=>base,operations:mocks});
  const result=await runPublicPhysicalCycle({grant,allowPublish:true,
   contextByFeed:context,owners});
  assert.equal(result.status,'STATE_UNKNOWN_STOPPED');
  assert.equal(result.completedGroups,1);
  assert.equal(trace.some(row=>['dc','space','publishR88'].includes(row[0])),false);
 }finally{f.cleanup();}
});

test('optional writer missing its provider effect count cannot be certified zero',async()=>{
 const f=fixture();try{
  const trace=[];
  const mocks=mocked(trace);
  mocks.runDc=async()=>({status:'PUBLIC_API_VERIFIED',d1Writes:1});
  const owners=createExistingPublicOwnerAdapters({dataRoot:f.dir,allowPublish:true,
   anonymousLicenseRiskAccepted:true,
   publicRead:async()=>base,operations:mocks});
  const result=await runPublicPhysicalCycle({grant,allowPublish:true,
   contextByFeed:context,owners});
  assert.equal(result.status,'STATE_UNKNOWN_STOPPED');
  assert.equal(result.completedGroups,2);
  assert.equal(result.results[1].reason,'PUBLIC_OWNER_EFFECT_UNVERIFIED');
 }finally{f.cleanup();}
});
