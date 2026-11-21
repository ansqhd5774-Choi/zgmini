import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateInflation30PitEvidence}
 from '../lib/inflation-causal-30-pit-evidence-r1.mjs';

const t1='2026-03-01T00:00:00.000Z';
const t2='2026-04-01T00:00:00.000Z';
const t3='2026-05-01T00:00:00.000Z';
const row=(overrides={})=>({
 observationDate:'2026-02-01',
 availableAt:'2026-02-15T12:00:00.000Z',
 sourceStoredAt:'2026-02-15T12:01:00.000Z',
 value:0,sourceVersion:'real-source-v1',
 ...overrides,
});
const evaluate=(observationsById={},cutoffs=[t1,t2])=>
 evaluateInflation30PitEvidence({cutoffs,observationsById});
const candidate=(result,id)=>result.candidates.find(x=>x.id===id);

test('without actual raw/provenance evidence 26 sources stay PIT_UNVERIFIED',()=>{
 const out=evaluate();
 assert.equal(out.scope,'OFFLINE_PIT_EVIDENCE_ONLY_NOT_APPROVED');
 assert.equal(out.sourceCandidates,26);
 assert.equal(out.sourceCandidatesWithPITObservation,0);
 assert.equal(out.sourceCandidatesFullyObserved,0);
 assert.equal(candidate(out,'2').status,'PIT_UNVERIFIED');
 assert.equal(candidate(out,'2').firstFail.reason,'NO_ARCHIVED_OBSERVATIONS');
 assert.equal(out.candidates.length,30);
 assert.equal(out.selectedIndicators,0);
 assert.equal(out.approvedCompositeFormula,false);
});

test('value zero remains a measured observation, not missing',()=>{
 const out=evaluate({'2':[row()]});
 assert.equal(out.sourceCandidatesWithPITObservation,1);
 assert.equal(out.sourceCandidatesFullyObserved,1);
 assert.equal(candidate(out,'2').availableCutoffs,2);
 assert.equal(candidate(out,'2').status,'PIT_OBSERVABLE_AT_ALL_CUTOFFS');
 assert.equal(candidate(out,'2').lastObservationDate,'2026-02-01');
});

test('future release and later storage cannot leak backward to older cutoff',()=>{
 const out=evaluate({'2':[row({availableAt:'2026-03-10T00:00:00.000Z',
  sourceStoredAt:'2026-04-10T00:00:00.000Z'})]});
 assert.equal(candidate(out,'2').status,'PIT_UNVERIFIED');
 assert.equal(candidate(out,'2').firstFail.reason,'NOT_YET_AVAILABLE_AT_CUTOFF');
 const later=evaluate({'2':[row({availableAt:'2026-03-10T00:00:00.000Z',
  sourceStoredAt:'2026-04-10T00:00:00.000Z'})]},[t1,t2,t3]);
 assert.equal(candidate(later,'2').status,'PIT_PARTIAL');
 assert.equal(candidate(later,'2').availableCutoffs,1);
 assert.equal(candidate(later,'2').firstFail.cutoff,t1);
});

test('archival revisions only appear after their actual stored timestamp',()=>{
 const original=row({value:4.2,sourceVersion:'v1'});
 const revision=row({value:5.4,sourceVersion:'v2',
  sourceStoredAt:'2026-04-12T00:00:00.000Z'});
 const old=evaluate({'2':[original,revision]},[t1,t2]);
 assert.equal(candidate(old,'2').lastStoredAt,original.sourceStoredAt);
 const newResult=evaluate({'2':[original,revision]},[t1,t3]);
 assert.equal(candidate(newResult,'2').lastStoredAt,revision.sourceStoredAt);
});

test('no publication timestamp: use storage-limited evidence, never claim release time',()=>{
 const stored=evaluate({'2':[row({availableAt:null})]});
 assert.equal(candidate(stored,'2').availableCutoffs,2);
 assert.equal(candidate(stored,'2').releaseVerifiedCutoffs,0);
 assert.equal(candidate(stored,'2').storageOnlyCutoffs,2);
 assert.equal(stored.releaseTimeUnknownDoesNotImplyOriginalRelease,'STORED_SNAPSHOT_ONLY');
 const early=evaluate({'2':[row({availableAt:null,sourceStoredAt:t2})]},[t1,t2]);
 assert.equal(candidate(early,'2').availableCutoffs,1);
 assert.equal(candidate(early,'2').firstFail.reason,'NOT_YET_AVAILABLE_AT_CUTOFF');
 const noStore=evaluate({'2':[row({availableAt:null,sourceStoredAt:null})]});
 assert.equal(candidate(noStore,'2').firstFail.reason,'PIT_STORE_TIME_UNVERIFIED');
});
test('missing data is not zero and release/store ordering remains protected',()=>{
 const nullValue=evaluate({'2':[row({value:null})]});
 assert.equal(candidate(nullValue,'2').firstFail.reason,'MISSING_VALUE_NOT_ZERO');
 const badOrder=row({sourceStoredAt:'2026-02-14T00:00:00.000Z'});
 assert.throws(()=>evaluate({'2':[badOrder]}),
  e=>e.code==='W01_PIT_PROVENANCE_ORDER_STOP');
});

test('historical observations dated after the decision cutoff stay unavailable',()=>{
 const out=evaluate({'2':[row({observationDate:'2026-05-01',
  availableAt:'2026-05-02T00:00:00.000Z',
  sourceStoredAt:'2026-05-02T01:00:00.000Z'})]});
 assert.equal(candidate(out,'2').status,'PIT_UNVERIFIED');
 assert.equal(candidate(out,'2').firstFail.reason,'NOT_YET_AVAILABLE_AT_CUTOFF');
});

test('duplicate same archived snapshot with conflicting values is rejected',()=>{
 const a=row({value:5}),b=row({value:6});
 assert.throws(()=>evaluate({'2':[a,b]}),
  e=>e.code==='W01_PIT_CONFLICTING_REVISION_STOP');
});

test('no unauthorized series, duplicates, or derived series can be supplied as raw',()=>{
 for(const id of ['20','27','15','30','99']){
  assert.throws(()=>evaluate({[id]:[row()]}),
   e=>e.code==='W01_PIT_SOURCE_SCOPE_STOP');
 }
});

test('CPI #22/#23 may be observed but must never become leading predictors',()=>{
 const out=evaluate({'22':[row()], '23':[row()]});
 assert.equal(candidate(out,'22').availableCutoffs,2);
 assert.equal(candidate(out,'23').eligibleAsPredictor,false);
 assert.equal(candidate(out,'22').eligibleAsPredictor,false);
 assert.equal(candidate(out,'24').eligibleAsPredictor,true);
 assert.deepEqual(out.excludedFromCausalPredictors,
  ['15','17','22','23','27','30']);
});

test('date/cutoff/scope shape and time order must be exact',()=>{
 assert.throws(()=>evaluate({},[t2,t1]),
  e=>e.code==='W01_PIT_CUTOFF_CONTRACT_STOP');
 assert.throws(()=>evaluate({},[]),
  e=>e.code==='W01_PIT_CUTOFF_CONTRACT_STOP');
 assert.throws(()=>evaluate({'2':[row({observationDate:'2026-02-30'})]}),
  e=>e.code==='W01_PIT_OBSERVATION_CONTRACT_STOP');
 assert.throws(()=>evaluate({'2':[row({availableAt:'2026-02-15'})]}),
  e=>e.code==='W01_PIT_OBSERVATION_CONTRACT_STOP');
 assert.throws(()=>evaluate({'2':[row({sourceVersion:'',value:NaN})]}),
  e=>e.code==='W01_PIT_OBSERVATION_CONTRACT_STOP');
});

test('zero evidence for three unresolved definitions and #27 duplicate',()=>{
 const out=evaluate({'2':[row()]});
 for(const id of ['15','17','30']){
  assert.equal(candidate(out,id).status,'DEFINITION_NOT_APPROVED');
  assert.equal(candidate(out,id).availableCutoffs,0);
 }
 assert.equal(candidate(out,'27').status,'MERGED_NO_NEW_RAW_SOURCE');
 assert.equal(candidate(out,'27').availableCutoffs,0);
});

test('old 1972 Fed observations are historically valid without retroactive release',()=>{
 const vintage=row({observationDate:'1972-01-01',availableAt:null});
 const out=evaluate({'29':[vintage]});
 assert.equal(candidate(out,'29').availableCutoffs,2);
 assert.equal(candidate(out,'29').releaseVerifiedCutoffs,0);
 assert.equal(candidate(out,'29').storageOnlyCutoffs,2);
});

test('a raw document cannot claim an observation stored before observation period',()=>{
 const future=row({observationDate:'2026-05-01',availableAt:null});
 assert.throws(()=>evaluate({'29':[future]}),
  e=>e.code==='W01_PIT_FUTURE_OBSERVATION_STOP');
});

test('known release metadata is counted separately from storage-only proof',()=>{
 const out=evaluate({'24':[row()]});
 assert.equal(candidate(out,'24').releaseVerifiedCutoffs,2);
 assert.equal(candidate(out,'24').storageOnlyCutoffs,0);
});
