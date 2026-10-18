import test from 'node:test';
import assert from 'node:assert/strict';
import {crosscheckIranR4ShadowAgainstReports} from '../lib/iran-progress/reality-crosscheck-r4.mjs';
import {IRAN_R4_FRONT_IDS} from '../lib/iran-progress/reality-shadow-r4.mjs';
const DAY=86400000,HOUR=3600000,now=Date.parse('2026-10-18T05:00:00Z');
const evidence=()=>[{sourceId:'FIXTURE_OFFICIAL',sourceKind:'OFFICIAL',url:'https://example.invalid/official-fixture',
 verified:true,observedAt:now-2*HOUR,verifiedAt:now-HOUR}];
const front=id=>({id,phase:'ACTIVE_COMBAT',phaseVerified:true,phaseObservedAt:now-2*HOUR,
 phaseVerifiedAt:now-HOUR,phaseEvidence:evidence(),coverageThrough:now-HOUR,
 military:{verified:true,eventsDeduplicated:true,fullCoverageVerified:true,
 coverageFrom:now-28*DAY,coverageThrough:now-HOUR,coverageEvidence:evidence(),
 recentSeverity:14,priorSeverity:21},
 diplomacyStage:1,ceasefireStatus:'ACTIVE_COMBAT'});
const route=id=>({id,incidentCoverage:{verified:true,eventsDeduplicated:true,complete28Days:true,
 from:now-28*DAY,through:now-HOUR,recentSeverity:2,priorSeverity:6,evidence:evidence()},
 restriction:{verified:true,state:'MAJOR_RESTRICTIONS',officialStateVerified:true,
 observedAt:now-2*HOUR,verifiedAt:now-HOUR,evidence:evidence()}});
function fixture(){
 return {fronts:Object.fromEntries(IRAN_R4_FRONT_IDS.map(id=>[id,front(id)])),
  maritime:{routes:{HORMUZ:route('HORMUZ'),RED_SEA:route('RED_SEA')}},
  nuclear:{verified:true,score:20,observedAt:now-2*HOUR,verifiedAt:now-HOUR,evidence:evidence()}};
}
const combatReport=[{sourceId:'REUTERS_2026_10_17_EGYPT_SAUDI',
 sourceUrl:'https://www.reuters.com/world/middle-east/egypts-sisi-seeks-parliaments-backing-help-defend-saudi-arabia-if-asked-2026-10-17/',
 sourceKind:'INDEPENDENT_REPORT',reviewStatus:'SOURCE_TEXT_REVIEWED',
 front:'YEMEN_HOUTHI',condition:'ACTIVE_COMBAT',reportedAsOngoing:true,
 observationAt:Date.parse('2026-10-17T14:23:00Z'),publishedAt:Date.parse('2026-10-17T14:23:00Z'),
 reviewedAt:Date.parse('2026-10-18T04:00:00Z')}];
test('even consistent current-war inputs do not become a Production number without calibration',()=>{
 const r=crosscheckIranR4ShadowAgainstReports(fixture(),combatReport,now);
 assert.equal(r.status,'SHADOW_UNCALIBRATED');
 assert.equal(r.score,null);
 assert.ok(r.candidateScore>=25&&r.candidateScore<=39);
 assert.equal(r.productionReady,false);
});
test('a synthetic 14-day ceasefire contradicts independently reported Yemen fighting',()=>{
 const s=fixture();
 for(const f of Object.values(s.fronts)){
  f.phase='CEASEFIRE_SUSTAINED';f.ceasefireStatus='EFFECTIVE';
  f.diplomacyStage=4;f.mutualCeasefireVerified=true;
  f.postCeasefireObservationVerified=true;f.postCeasefireViolationVerified=false;
  f.ceasefireVerifiedDays=20;f.ceasefireEffectiveAt=now-21*DAY;
  f.military.recentSeverity=0;f.military.priorSeverity=10;
 }
 const r=crosscheckIranR4ShadowAgainstReports(s,combatReport,now);
 assert.equal(r.status,'SHADOW_CONTRADICTED');
 assert.equal(r.score,null);
 assert.ok(r.candidateScore>=75);
 assert.equal(r.maximumCompatibleScore,39);
});
test('stale or unverified war inputs never output a candidate score',()=>{
 const s=fixture();delete s.fronts.IRN_USA;
 const r=crosscheckIranR4ShadowAgainstReports(s,combatReport,now);
 assert.equal(r.status,'SHADOW_PENDING');
 assert.equal(r.score,null);
 assert.equal(r.candidateScore,undefined);
});
test('without independently checked current reporting, no exact score is validated',()=>{
 const r=crosscheckIranR4ShadowAgainstReports(fixture(),[],now);
 assert.equal(r.status,'SHADOW_UNCALIBRATED');
 assert.equal(r.score,null);
 assert.equal(r.reason,'INDEPENDENT_REALITY_CHECK_UNAVAILABLE');
});
