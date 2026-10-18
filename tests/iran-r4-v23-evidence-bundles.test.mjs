import test from 'node:test';
import assert from 'node:assert/strict';
import {auditR4EvidenceCandidateBundles as audit} from '../lib/iran-progress/evidence-bundles-v23.mjs';
const row=(id,key,kind,reportDay,eventDay,pcStoredDay)=>({id,incidentKey:key,kind,reportDay,eventDay,pcStoredDay,
 sourceUrl:'https://example.org/'+id,verified:false,scoreEligible:false});
const fixture=[
 row('guardian','YEMEN_OCT5_GOV_OFFENSIVE','INDEPENDENT_REPORT','2026-10-05','2026-10-05',null),
 row('jpost','YEMEN_OCT5_GOV_OFFENSIVE','INDEPENDENT_REPORT','2026-10-05','2026-10-05',null),
 row('ukmto156','UKMTO_156_26','OFFICIAL_INCIDENT','2026-10-05','2026-10-05','2026-10-08'),
 row('ukmto158','UKMTO_158_26','OFFICIAL_INCIDENT','2026-10-07','2026-10-07','2026-10-08'),
 row('qatar','QATAR_MEDIATION','DIPLOMACY','2026-10-06','2026-10-06','2026-10-08'),
 row('marad','MARAD_HORMUZ','ADVISORY','2026-09-09',null,null)
];
test('two newspapers about same offensive are only one unverified research bundle',()=>{
 const r=audit(fixture);assert.equal(r.sourceRows,6);assert.equal(r.storyBundles,5);
 const x=r.cases.find(x=>x.incidentKey==='YEMEN_OCT5_GOV_OFFENSIVE');
 assert.equal(x.sourceCount,2);assert.equal(x.independentVerifiedR4Event,false);
 assert.equal(r.scoreDaysComputed,0);assert.equal(r.score,null);
});
test('UKMTO originals stored October 8 cannot be claimed known locally October 5 or 7',()=>{
 const r=audit(fixture);
 for(const id of ['UKMTO_156_26','UKMTO_158_26']){
  const x=r.cases.find(y=>y.incidentKey===id);
  assert.equal(x.firstPcStored,'2026-10-08');
  assert.equal(x.contemporaneousPCReceiptProven,false);
 }
});
test('MARAD warning and Qatar diplomacy cannot become independent attack',()=>{
 const r=audit(fixture);
 for(const id of ['MARAD_HORMUZ','QATAR_MEDIATION']){
  const x=r.cases.find(y=>y.incidentKey===id);
  assert.equal(x.onlyContext,true);assert.equal(x.possibleCombat,false);
 }
});
test('conflicting incident days do not silently resolve',()=>{
 const rows=[row('a','CLUSTER','INDEPENDENT_REPORT','2026-10-12','2026-10-11',null),
  row('b','CLUSTER','INDEPENDENT_REPORT','2026-10-12','2026-10-12',null)];
 const x=audit(rows).cases[0];assert.equal(x.conflictingEventDays,true);assert.equal(x.eventDateCandidate,null);
});
test('report date later than candidate event is not a verified as-of record',()=>{
 const x=audit([row('late','CASE','OFFICIAL_INCIDENT','2026-10-14','2026-10-13',null)]).cases[0];
 assert.equal(x.reportAfterCandidateEvent,true);assert.equal(x.independentVerifiedR4Event,false);
});
test('fail closed on attempts to promote score, fake URLs, duplicate IDs and invalid dates',()=>{
 assert.throws(()=>audit([{...fixture[0],scoreEligible:true}]),/RECORD_INVALID/);
 assert.throws(()=>audit([{...fixture[0],sourceUrl:'http://example.org/test'}]),/RECORD_INVALID/);
 assert.throws(()=>audit([fixture[0],fixture[0]]),/RECORD_INVALID/);
 assert.throws(()=>audit([{...fixture[0],eventDay:'2026-10-15'}]),/RECORD_INVALID/);
});
test('source observations do not constitute 28-day complete input contract',()=>{
 const r=audit(fixture);assert.equal(r.verifiedR4Events,0);
 assert.equal(r.complete28DayCoverage,false);assert.equal(r.productionReady,false);
 assert.ok(r.cases.every(x=>!x.actorVerified&&!x.occurrenceVerified&&!x.duplicateResolutionVerified));
});
