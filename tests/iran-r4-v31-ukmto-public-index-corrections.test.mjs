import test from 'node:test';
import assert from 'node:assert/strict';
import {V31_PUBLIC_DELTA as leads,auditUkMtoPublicIndexV31 as audit} from '../lib/iran-progress/ukmto-public-index-corrections-v31.mjs';
const find=id=>leads.find(x=>x.id===`UKMTO_${id}_26`);
test('14 extra public snippets stay metadata, never 14 real R4 events',()=>{
 const x=audit();assert.equal(x.additionalIndexRows,14);assert.equal(x.newSinceV30Rows,11);
 assert.equal(x.v30OverlapRows,3);assert.equal(x.verifiedR4Events,0);
 assert.equal(x.computedR4Days,0);assert.equal(x.score,null);assert.equal(x.productionReady,false);
});
test('UKMTO 165 changed from suspicious to attack with unknown correction timestamp',()=>{
 const r=find(165);assert.deepEqual(r.sourceRevisionHistory.map(x=>x.kind),['SUSPICIOUS_ACTIVITY','ATTACK']);
 assert.ok(r.sourceRevisionHistory.every(x=>x.effectiveDay===null));
 assert.equal(audit().correctionWithUnknownEffectiveDateCount,1);
 assert.equal(audit().historicalDayBackfillFromCurrentRevisionForbidden,true);
});
test('166 listing on 12th explicitly reports occurrence 11th',()=>{
 assert.equal(find(166).publicIndexDay,'2026-10-12');
 assert.equal(find(166).reportedIncidentDay,'2026-10-11');
 assert.equal(audit().explicitIncidentDays.UKMTO_166_26,'2026-10-11');
});
test('unknown incident dates remain null for reports without occurrence-day evidence',()=>{
 for(const id of [162,164,165,167,168,169,170,171,172,173,174,175,176])assert.equal(find(id).reportedIncidentDay,null);
});
test('174 vs 175 are 68 vs 78 NM and projectile vs RPG, identity unresolved',()=>{
 assert.equal(find(174).distanceNm,68);assert.equal(find(175).distanceNm,78);
 assert.equal(find(174).reportedMethod,'UNKNOWN_PROJECTILE');assert.equal(find(175).reportedMethod,'RPG_FROM_SMALL_BOAT');
 assert.ok(audit().jubaylWarnings.every(x=>x.independentEventCount===null&&!x.duplicateResolved));
});
test('176 LNG tanker skiff shooting is not attributed to Houthis or automatically Red Sea',()=>{
 assert.equal(find(176).shipClass,'LNG_TANKER');assert.equal(find(176).location,'YEMEN_OFFSHORE');
 assert.equal(audit().routeMayNotBeInferredFromYemenCountryAlone,true);
 assert.equal(find(176).r4FrontLinkVerified,false);
});
test('Sohar at 165 is in Gulf of Oman, not strait of Hormuz by default',()=>{
 assert.equal(find(165).location,'GULF_OF_OMAN');assert.equal(find(165).r4FrontLinkVerified,false);
});
test('all publicly listed claims lack historical PC receipt and attacker confirmation',()=>{
 assert.ok(leads.every(x=>!x.pcSourceReceiptVerified&&!x.attackActorVerified&&!x.scoreEligible));
 assert.equal(audit().sourceOriginalPcReceipts,0);
});
test('duplicate UKMTO number fails closed',()=>assert.throws(()=>audit([leads[0],leads[0]]),/V31_INDEX_LEAD_INVALID/));
test('post-review listing dates and inaccurate calendar days fail closed',()=>{
 assert.throws(()=>audit([{...leads[0],publicIndexDay:'2026-10-21'}]),/V31_INDEX_LEAD_INVALID/);
 assert.throws(()=>audit([{...leads[0],publicIndexDay:'2026-02-30'}]),/V31_INDEX_LEAD_INVALID/);
});
test('prohibited verification flags fail closed',()=>{
 for(const key of ['pcSourceReceiptVerified','attackActorVerified','incidentIdentityResolved','r4FrontLinkVerified','complete28DayCoverage','scoreEligible'])
  assert.throws(()=>audit([{...leads[0],[key]:true}]),/V31_INDEX_LEAD_INVALID/);
});
test('invalid reported day and invalid method or location fail closed',()=>{
 for(const patch of [{reportedIncidentDay:'2026-10-19'},{reportedMethod:'CONCLUSIVE_HOUTHI_ATTACK'},
  {location:'RED_SEA_AND_HORMUZ'},{distanceNm:-1},{sourceUrl:'https://fake.example/recent-incidents'}])
  assert.throws(()=>audit([{...leads[0],...patch}]),/V31_INDEX_LEAD_INVALID/);
});
test('unresolved future revision cannot backdate a historical score',()=>{
 assert.equal(find(165).sourceRevisionHistory[1].effectiveDay,null);
 assert.equal(audit([]).score,null);assert.equal(audit([]).missingDayMayNotBeZeroFilled,true);
});
