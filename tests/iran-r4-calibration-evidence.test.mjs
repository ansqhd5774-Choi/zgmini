import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateR4Episodes} from '../lib/iran-progress/calibration-evidence-r4.mjs';
const DAY=86400000,HOUR=3600000,now=Date.parse('2026-10-18T05:00:00Z');
const refs=()=>[{verified:true,sourceKind:'OFFICIAL',sourceId:'SYNTHETIC_ONLY',
 url:'https://example.invalid/fixture',observedAt:now-2*HOUR,verifiedAt:now-HOUR}];
function front(id,truce){
 return {id,phase:truce?'CEASEFIRE_SUSTAINED':'ACTIVE_COMBAT',
 phaseVerified:true,phaseObservedAt:now-2*HOUR,phaseVerifiedAt:now-HOUR,phaseEvidence:refs(),
 coverageThrough:now-HOUR,diplomacyStage:truce?4:1,ceasefireStatus:truce?'EFFECTIVE':'ACTIVE_COMBAT',
 mutualCeasefireVerified:truce,postCeasefireObservationVerified:truce,
 postCeasefireViolationVerified:false,ceasefireEffectiveAt:now-22*DAY,ceasefireVerifiedDays:21,
 military:{verified:true,eventsDeduplicated:true,fullCoverageVerified:true,
 coverageFrom:now-28*DAY,coverageThrough:now-HOUR,coverageEvidence:refs(),
 recentSeverity:truce?0:7,priorSeverity:truce?7:21}};
}
function route(id){
 return {id,incidentCoverage:{verified:true,eventsDeduplicated:true,complete28Days:true,
 from:now-28*DAY,through:now-HOUR,recentSeverity:0,priorSeverity:0,evidence:refs()},
 restriction:{verified:true,state:'MAJOR_RESTRICTIONS',officialStateVerified:true,
 observedAt:now-2*HOUR,verifiedAt:now-HOUR,evidence:refs()}};
}
const input=truce=>({fronts:Object.fromEntries(['IRN_USA','IRN_ISR','YEMEN_HOUTHI'].map(id=>[id,front(id,truce)])),
 maritime:{routes:{HORMUZ:route('HORMUZ'),RED_SEA:route('RED_SEA')}},
 nuclear:{verified:true,score:50,observedAt:now-2*HOUR,verifiedAt:now-HOUR,evidence:refs()}});
const observation=()=>[{reviewStatus:'SOURCE_TEXT_REVIEWED',reportedAsOngoing:true,
 front:'YEMEN_HOUTHI',condition:'ACTIVE_COMBAT',
 sourceKind:'INDEPENDENT_REPORT',sourceId:'SYNTHETIC_OBSERVED_COMBAT',
 sourceUrl:'https://example.invalid/independent-report',
 observationAt:now-3*HOUR,publishedAt:now-2*HOUR,reviewedAt:now-HOUR}];
test('independent war observation vetoes fictitious 80-range truce in held-out episode',()=>{
 const r=evaluateR4Episodes([{id:'scenario-high-score',asOf:now,input:input(true),observations:observation()}]);
 assert.equal(r.status,'UNAPPROVED_SHADOW_DIAGNOSTIC');
 assert.equal(r.episodes[0].consistency,'CONTRADICTED_BY_OBSERVATION');
 assert.ok(r.episodes[0].candidateScore>=75);
 assert.equal(r.episodes[0].independentUpperBound,39);
 assert.equal(r.contradictions,1);
 assert.equal(r.exactScoreCalibration,'NOT_EVALUATED');
});
test('coherent active-war observation does not establish that 18 is the exact score',()=>{
 const r=evaluateR4Episodes([{id:'scenario-combat',asOf:now,input:input(false),observations:observation()}]);
 assert.equal(r.calculated,1);
 assert.equal(r.episodes[0].consistency,'NOT_CONTRADICTED_UNCALIBRATED');
 assert.equal(r.exactScoreCalibration,'NOT_EVALUATED');
});
test('incomplete source remains null, and future observation cannot be included retroactively',()=>{
 const missing=input(false);delete missing.fronts.IRN_USA;
 const future=observation().map(x=>({...x,observationAt:now+HOUR,publishedAt:now+HOUR,reviewedAt:now+HOUR}));
 const r=evaluateR4Episodes([
  {id:'incomplete',asOf:now,input:missing,observations:observation()},
  {id:'future-excluded',asOf:now,input:input(false),observations:future}]);
 assert.equal(r.episodes[0].consistency,'UNCOMPUTED');
 assert.equal(r.episodes[0].candidateScore,null);
 assert.equal(r.episodes[1].consistency,'NO_INDEPENDENT_CONSTRAINT');
 assert.equal(r.groups.UNCOMPUTED,1);
 assert.equal(r.groups.NO_INDEPENDENT_CONSTRAINT,1);
});
test('duplicate sample IDs are rejected to prevent false benchmark inflation',()=>{
 const x={id:'duplicate',asOf:now,input:input(false),observations:[]};
 assert.throws(()=>evaluateR4Episodes([x,x]),/DUPLICATE/);
});
