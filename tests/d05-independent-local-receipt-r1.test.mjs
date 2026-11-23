import test from 'node:test';
import assert from 'node:assert/strict';
import {projectD05IndependentLocalReceipt,verifyD05IndependentLocalReceipt}
 from '../lib/score-history/d05-independent-input-selector-witness-r1.mjs';
import {prepareD05LineageAfterStoredArchive}
 from '../lib/score-history/d05-lineage-after-archive-r1.mjs';
import {decideD05LineageAppend}
 from '../lib/score-history/d05-lineage-event-contract-r1.mjs';
import {COMPOSITE_OBSERVED_VERSION,compositeSampleFromVerified}
 from '../lib/composite-observed-history-r1.mjs';

const now=Date.UTC(2026,10,9,20,42,51),at=new Date(now).toISOString();
const a='a'.repeat(64),b='b'.repeat(64),c='c'.repeat(64),d='d'.repeat(64);
const paid={id:'breadth',name:'수급·폭',status:'READY',score:50,
 source:'MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY',
 methodologyVersion:'B1-R5-STORED-BREADTH-4FACTOR-EMA3-R2',
 observationDate:'2026-11-07',asOfDate:'2026-11-07',
 trend:[{label:'2026-11-07',value:50}],
 indicators:[41,42,43,44].map(n=>({id:'breadth-'+n,status:'READY',
  score:50,value:50,observationDate:'2026-11-07'})),
 paidSource:{version:'ZGMINI_BREADTH_PAID_B1_R5_V1',plan:'full',
  sourceVersion:b,pitSha256:c,inputSha256:[d],
  observationDate:'2026-11-07',sourceLatestDate:'2026-11-07',
  returnCoverage:1,tradingValueCoverage:1}};
const earnings={id:'earnings',status:'READY',score:61,methodologyVersion:'E1-R5',
 sourceVersion:'E1-R5-PRODUCTION-CYCLE-R1',asOfDate:'2026-11-09',noReweight:true,
 missing:[]};
const body={status:'SUCCESS',asOfDate:'2026-11-09',
 overall:{status:'READY',score:47.31578798432822},
 domains:[earnings,paid,...Array.from({length:10},(_,i)=>({
  id:'other-'+i,status:'READY',score:25+i,methodologyVersion:'R1',
  asOfDate:'2026-11-09'}))]};
const sourceKeys=['macro','credit','supply','fundFlows','bisDsr','bisTc','rates'];
const sources=sourceKeys.map((sourceKey,i)=>({sourceKey,status:'VERIFIED',
 batchKey:sourceKey+':2026-11-09',storedAt:now-i*1000,
 storedBodySha256:i.toString(16).padStart(64,'0'),
 selectionWitness:'READER_DIRECT_ID'}));
function witness(){
 return {status:'PARTIAL_INDEPENDENT_SELECTION_ONLY',
  earnings:{status:'COLLECT_INPUT_SELECTED_ONLY',methodologyVersion:'E1-R5',
   inputDescriptorFingerprint:a,
   inputDescriptorScope:'LOCAL_FILE_METADATA_AND_UNIVERSE_NOT_RAW_SHA',
   selectionEvidence:'REFERENCE_IDENTITY_AT_COLLECT_INPUT_MERGE',
   candidateReused:false,originalSecReleasePITVerified:false},
  breadth:{status:'VALIDATED_DERIVED_DOMAIN_SELECTED_ONLY',
   methodologyVersion:paid.methodologyVersion,sourceVersion:b,pitSha256:c,
   inputSha256:[d],observationDate:'2026-11-07',
   selectionEvidence:'VALIDATED_PAID_DERIVED_READER_RETURN',
   rawSourcePITVerified:false},
  earningsOutputMatched:true,breadthOutputMatched:true,
  bothDomainsOutputMatched:true,rawSecPITVerified:false,
  rawBreadthPITVerified:false,effectiveUseVerified:false,
  completeD05InputLineage:false,publicD1Verified:false,
  rawSecFacts:'PRIVATE_RAW_FACTS_DO_NOT_STORE'};
}
function fixture({actualBody=body,independentEvidence=witness()}={}){
 const sample=compositeSampleFromVerified(actualBody,now);
 let reads=0;
 const db={prepare(sql){
  assert.equal(sql,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?');
  return {bind(key){assert.equal(key,'composite-observed:2026-11-09');return {
   first:async()=>{reads++;return {body:JSON.stringify({
    version:COMPOSITE_OBSERVED_VERSION,date:'2026-11-09',points:[sample]}),
    stored_at:now};}}}};
 }};
 const capture={calculatedAt:at,asOfDate:actualBody.asOfDate,
  score:actualBody.overall.score,evidence:{status:'SHADOW_7_BATCHES_ONLY',
   verifiedCount:7,totalBatches:7,sources},independentEvidence};
 const args={db,now,marketBody:actualBody,capture,
  archiveResult:{status:'LOCAL_STORED',date:'2026-11-09',points:1},
  runtimeSourceSha:'1'.repeat(40),approvedSourceSha:'2'.repeat(40),
  recordedAt:new Date(now+1000).toISOString()};
 return {args,reads:()=>reads};
}

test('partial independent inputs are whitelisted without raw SEC or price data',()=>{
 const projected=projectD05IndependentLocalReceipt(witness(),at);
 assert.equal(projected.status,'D05_INDEPENDENT_SOURCE_SELECTION_PARTIAL_LOCAL_V1');
 assert.equal(projected.earnings.inputDescriptorFingerprint,a);
 assert.equal(projected.breadth.pitSha256,c);
 assert.equal(projected.completeD05InputLineage,false);
 assert.equal(projected.rawSecPITVerified,false);
 assert.equal(projected.rawBreadthPITVerified,false);
 assert.equal(projected.publicD1Verified,false);
 assert.equal(JSON.stringify(projected).includes('PRIVATE_RAW_FACTS'),false);
 assert.deepEqual(verifyD05IndependentLocalReceipt(projected,at),projected);
 assert.equal(verifyD05IndependentLocalReceipt({...projected,
  secret:'NEVER_PERSIST'},at),null);
});

test('new LOCAL_STORED score event links actual 7+2 partial selected identifiers only',async()=>{
 const f=fixture();
 const entry=await prepareD05LineageAfterStoredArchive(f.args);
 assert.equal(entry.status,'PREPARED_LOCAL_ONLY');
 assert.equal(entry.inputScope,'SELECTED_7_BATCHES_ONLY');
 assert.equal(entry.independentInputs?.breadth.sourceVersion,b);
 assert.equal(entry.independentInputs?.earnings.inputDescriptorFingerprint,a);
 assert.equal(entry.effectiveUseVerified,false);
 assert.equal(entry.completeD05InputLineage,false);
 assert.equal(entry.publicD1Verified,false);
 assert.equal(f.reads(),1);
 const decision=decideD05LineageAppend('',entry);
 assert.equal(decision.status,'APPEND_READY');
 assert.equal(JSON.parse(decision.line).eventId,entry.eventId);
 const repeated={...f.args,recordedAt:new Date(now+2000).toISOString()};
 const repeat=await prepareD05LineageAfterStoredArchive(repeated);
 assert.equal(decideD05LineageAppend(decision.line,repeat).status,'NOOP_SAME_EVENT');
 assert.equal(JSON.stringify(entry).includes('PRIVATE_RAW_FACTS'),false);
});

test('legacy 7 batch only events remain valid and cannot be retroactively rewritten',async()=>{
 const f=fixture({independentEvidence:null});
 const legacy=await prepareD05LineageAfterStoredArchive(f.args);
 assert.equal(legacy.status,'PREPARED_LOCAL_ONLY');
 assert.equal(Object.hasOwn(legacy,'independentInputs'),false);
 const prior=decideD05LineageAppend('',legacy);
 assert.equal(prior.status,'APPEND_READY');
 assert.equal(decideD05LineageAppend(prior.line,legacy).status,'NOOP_SAME_EVENT');
 const withExtra=await prepareD05LineageAfterStoredArchive(
  {...f.args,capture:{...f.args.capture,independentEvidence:witness()}});
 assert.equal(withExtra.status,'PREPARED_LOCAL_ONLY');
 assert.equal(decideD05LineageAppend(prior.line,withExtra).code,'EVENT_ID_CONFLICT');
});

test('forged witnesses, output mismatch, and future Breadth date do not enter event',async()=>{
 const f=fixture();
 const wrong={...witness(),breadth:{...witness().breadth,sourceVersion:a}};
 const mismatched=await prepareD05LineageAfterStoredArchive({...f.args,
  capture:{...f.args.capture,independentEvidence:wrong}});
 assert.equal(Object.hasOwn(mismatched,'independentInputs'),false);
 const future={...witness(),breadth:{...witness().breadth,
  observationDate:'2026-11-10'}};
 assert.equal(projectD05IndependentLocalReceipt(future,at),null);
 const forged={...witness(),bothDomainsOutputMatched:false};
 assert.equal(projectD05IndependentLocalReceipt(forged,at),null);
 const noPaid={...body,domains:body.domains.map(x=>x.id==='breadth'
  ?{...x,paidSource:null}:x)};
 const denied=await prepareD05LineageAfterStoredArchive(
  fixture({actualBody:noPaid}).args);
 assert.equal(Object.hasOwn(denied,'independentInputs'),false);
});

test('unexpected persisted private receipt fields fail existing ledger integrity checks',async()=>{
 const f=fixture();
 const entry=await prepareD05LineageAfterStoredArchive(f.args);
 assert.equal(decideD05LineageAppend('',{...entry,independentInputs:{
  ...entry.independentInputs,apiToken:'DO_NOT_RECORD'}}).code,'LINEAGE_EVENT_INVALID');
 assert.equal(decideD05LineageAppend('',{...entry,independentInputs:{
  ...entry.independentInputs,rawSecPITVerified:true}}).code,'LINEAGE_EVENT_INVALID');
 assert.equal(decideD05LineageAppend('',{...entry,independentInputs:{
  ...entry.independentInputs,breadth:{...entry.independentInputs.breadth,
   inputSha256:['incorrect']}}}).code,'LINEAGE_EVENT_INVALID');
});
