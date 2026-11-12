import test from 'node:test';
import assert from 'node:assert/strict';
import {R4_V24_PUBLIC_SOURCE_LEADS as source,auditR4OfficialSourceLeadsV24 as audit}
 from '../lib/iran-progress/official-claim-reconciliation-v24.mjs';

test('official UKMTO incident numbers are warning leads, not verified attributed attacks',()=>{
 const x=audit();assert.equal(x.officialAttackWarnings,5);assert.equal(x.suspiciousAdvisories,1);
 assert.equal(x.verifiedR4Events,0);assert.equal(x.score,null);assert.equal(x.attackerAttributionEstablished,false);
});
test('156 and 157 remain two warnings with unresolved incident identity',()=>{
 const x=audit().provisionalClusters.find(x=>x.key==='HORMUZ_OCT05_TWO_WARNINGS_UNRESOLVED');
 assert.deepEqual(x.sourceIds,['UKMTO_156_26','UKMTO_157_26']);
 assert.equal(x.numberOfIndependentAttacks,null);assert.equal(x.identityResolved,false);
});
test('136 military targets cannot be converted into 136 independent attack events',()=>{
 const r=source.find(x=>x.id==='SPA_HOUTHI_TARGETS_1010');assert.equal(r.reportedTargetCount,136);
 const x=audit();assert.equal(x.kindCounts.CAMPAIGN_TARGET_AGGREGATE,1);
 assert.equal(x.officialTargetsAreNotAttackCounts,true);assert.equal(x.verifiedR4Events,0);
});
test('war-state, intercept, contested territory and suspicious IRGC action are not attack confirmations',()=>{
 const x=audit();assert.equal(x.kindCounts.WAR_STATE_SUMMARY,1);
 assert.equal(x.kindCounts.INTERCEPT_REPORT,1);assert.equal(x.kindCounts.CONTESTED_TERRITORY_CLAIM,1);
 assert.equal(x.kindCounts.SUSPICIOUS_ACTIVITY,1);
});
test('isolated reports cannot establish 42-day collection or 28-day rolling completeness',()=>{
 const x=audit();assert.equal(x.coverageWindow.days,42);
 assert.deepEqual(x.publicReportedAttackDays,['2026-10-05','2026-10-06','2026-10-07','2026-10-09']);
 assert.equal(x.coverageWindow.frontCoverageCertifiedDays,0);
 assert.equal(x.coverageWindow.maritimeRouteCoverageCertifiedDays,0);assert.equal(x.scoreDaysComputed,0);
});
test('fail closed on dishonest promotion, duplicates and invalid dates',()=>{
 for(const patch of [{scoreEligible:true},{actorIndependentlyVerified:true},{pcOriginalReceiptVerified:true},
   {incidentIdentityIndependentlyResolved:true},{occurrenceDay:'2026-10-20'},{url:'http://www.ukmto.org/foo'}])
  assert.throws(()=>audit([{...source[1],...patch}]),/SOURCE_INVALID/);
 assert.throws(()=>audit([source[1],source[1]]),/SOURCE_INVALID/);
 assert.throws(()=>audit([source[1],{...source[2],reference:'156-26'}]),/DUPLICATE_REFERENCE/);
 assert.throws(()=>audit(source,{end:'2026-10-22'}),/INPUT_INVALID/);
});
test('only 136 target aggregate is allowed to carry non-event reported quantity',()=>{
 assert.throws(()=>audit([{...source[1],reportedTargetCount:136,reportedTargetUnit:'MILITARY_TARGETS'}]),/SOURCE_INVALID/);
 assert.throws(()=>audit([{...source[7],reportedTargetUnit:'ATTACKS'}]),/SOURCE_INVALID/);
});
test('empty source list cannot be treated as zero attacks or complete observation',()=>{
 const x=audit([]);assert.equal(x.publicSourceLeads,0);assert.equal(x.verifiedR4Events,0);
 assert.equal(x.coverageWindow.absenceOfEventsCertified,false);assert.equal(x.score,null);
});