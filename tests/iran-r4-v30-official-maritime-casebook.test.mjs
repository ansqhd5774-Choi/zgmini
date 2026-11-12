import test from 'node:test';
import assert from 'node:assert/strict';
import {V30_UKMTO_LEADS as leads,auditOfficialMaritimeCasebookV30 as audit} from '../lib/iran-progress/official-maritime-casebook-v30.mjs';
const row=(reference)=>leads.find(x=>x.reference===reference);
test('public index includes 9 reported attack warnings and 1 suspicious activity',()=>{
 const out=audit();assert.equal(out.indexEntryCount,10);
 assert.equal(out.kinds.ATTACK_REPORT,9);assert.equal(out.kinds.SUSPICIOUS_ACTIVITY,1);
 assert.equal(out.verifiedR4Events,0);assert.equal(out.computedR4Days,0);assert.equal(out.score,null);
});
test('same-day warnings 156 and 157 do not automatically become two attacks',()=>{
 const x=audit().unresolvedIdentityClusters.find(x=>x.reviewCluster==='HORMUZ_1005_DUP_UNRESOLVED');
 assert.deepEqual(x.warningReferences,['UKMTO_156_26','UKMTO_157_26']);
 assert.equal(x.independentIncidentCount,null);assert.equal(x.duplicateResolved,false);
});
test('Saudi Jubayl offshore reports 174 and 175 remain unresolved, not Hormuz route incidents',()=>{
 for(const id of ['UKMTO_174_26','UKMTO_175_26'])assert.equal(row(id).routeHint,'OTHER_GULF');
 const x=audit().unresolvedIdentityClusters.find(x=>x.reviewCluster==='JUBAYL_1016_DUP_UNRESOLVED');
 assert.equal(x.warningReferences.length,2);assert.equal(x.independentIncidentCount,null);
});
test('suspicious activity is not an independently verified attack',()=>{
 assert.equal(row('UKMTO_152_26').kind,'SUSPICIOUS_ACTIVITY');
 assert.equal(audit().kinds.SUSPICIOUS_ACTIVITY,1);
});
test('index days are not inferred as attack occurrence dates for time-late reports',()=>{
 for(const id of ['UKMTO_160_26','UKMTO_174_26','UKMTO_175_26','UKMTO_176_26'])
  assert.equal(row(id).occurrenceDay,null);
 assert.equal(audit().explicitIncidentDatesInPublicIndex,6);
});
test('all entries remain research-only with no PC historic receipt or attribution',()=>{
 assert.ok(leads.every(x=>!x.pcHistoricalReceiptVerified&&!x.actorIndependentlyVerified&&!x.scoreEligible));
 assert.equal(audit().complete28DayCoverage,false);
});
test('invalid actor verification and attempts at promotion are rejected',()=>{
 for(const patch of [{scoreEligible:true},{actorIndependentlyVerified:true},{pcHistoricalReceiptVerified:true},
  {eventIdentityIndependentlyVerified:true},{occurrenceIndependentlyVerified:true},{routeCoverageVerified:true}])
  assert.throws(()=>audit([{...leads[0],...patch}]),/V30_LEAD_INVALID/);
});
test('duplicates, invalid date, mislabeled route and source mismatch fail closed',()=>{
 assert.throws(()=>audit([leads[1],leads[1]]),/V30_LEAD_INVALID/);
 for(const patch of [{occurrenceDay:'2026-10-31'},{routeHint:'RED_SEA_AND_HORMUZ'},
  {sourceUrl:'https://another.com/'},{listingDay:'2026-02-30'}])
  assert.throws(()=>audit([{...leads[1],...patch}]),/V30_LEAD_INVALID/);
});
test('42-day period represents needed research, not true complete observation',()=>{
 const out=audit();assert.equal(out.complete28DayCoverage,false);
 assert.equal(out.retrospectivelyDiscoveredIsNotHistoricallyStored,true);
 assert.equal(out.outOfWindowOrUnobservedDaysAreNotZeroAttacks,true);
});
test('empty public report list does not show zero real-world incidents',()=>{
 const out=audit([]);assert.equal(out.indexEntryCount,0);
 assert.equal(out.verifiedR4Events,0);assert.equal(out.complete28DayCoverage,false);
});
