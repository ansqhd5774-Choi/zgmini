import test from 'node:test';
import assert from 'node:assert/strict';
import {
 IRAN_R4_SHADOW_VERSION,IRAN_R4_FRONT_IDS,IRAN_R4_BANDS,
 calculateIranR4RealityShadow,assessR4ScoreAgainstReality,
 militarySeverityScore,verifyR4Front
} from '../lib/iran-progress/reality-shadow-r4.mjs';

// Synthetic fixtures ONLY. These URLs are placeholders, never reports of real events.
const DAY=86400000,HOUR=3600000;
const now=Date.parse('2026-10-18T04:00:00Z');
const evidence=(at=now)=>[{sourceId:'TEST_FIXTURE',sourceKind:'OFFICIAL',url:'https://example.invalid/fixture',
 verified:true,observedAt:at-2*HOUR,verifiedAt:at-HOUR}];
function front(id,at=now){
 return {id,phase:'ACTIVE_COMBAT',phaseVerified:true,phaseObservedAt:at-2*HOUR,phaseVerifiedAt:at-HOUR,
  phaseEvidence:evidence(at),coverageThrough:at-HOUR,
  military:{verified:true,eventsDeduplicated:true,fullCoverageVerified:true,coverageFrom:at-28*DAY,
   coverageThrough:at-HOUR,coverageEvidence:evidence(at),recentSeverity:14,priorSeverity:21},
  diplomacyStage:1,ceasefireStatus:'ACTIVE_COMBAT'};
}
function maritimeRoute(id,at=now){
 return {id,incidentCoverage:{verified:true,eventsDeduplicated:true,complete28Days:true,from:at-28*DAY,through:at-HOUR,
  recentSeverity:6,priorSeverity:10,recentMajorIncidentVerified:false,evidence:evidence(at)},
  restriction:{verified:true,state:'MAJOR_RESTRICTIONS',officialStateVerified:true,
   observedAt:at-2*HOUR,verifiedAt:at-HOUR,evidence:evidence(at)}};
}
function snapshot(at=now){
 return {fronts:Object.fromEntries(IRAN_R4_FRONT_IDS.map(id=>[id,front(id,at)])),
  maritime:{routes:Object.fromEntries(['HORMUZ','RED_SEA'].map(id=>[id,maritimeRoute(id,at)]))},
  nuclear:{verified:true,score:20,observedAt:at-2*HOUR,verifiedAt:at-HOUR,evidence:evidence(at)}};
}
function phaseOf(s,id,phase){
 const f=s.fronts[id];f.phase=phase;
 if(phase==='FULL_SCALE_WAR')f.fullScaleWarVerified=true;
 if(phase==='CRITICAL_ESCALATION')f.criticalEscalationVerified=true;
}
function verifiedTruce(s,id,days,{ended=false,peaceFramework=false}={}){
 const f=s.fronts[id];
 f.phase=ended?'ENDED':peaceFramework?'PEACE_IMPLEMENTATION':days>=14?'CEASEFIRE_SUSTAINED':'CEASEFIRE_EARLY';
 f.mutualCeasefireVerified=true;f.postCeasefireObservationVerified=true;f.postCeasefireViolationVerified=false;f.ceasefireStatus=ended?'ENDED':'EFFECTIVE';
 f.ceasefireEffectiveAt=now-(days+1)*DAY;f.ceasefireVerifiedDays=days;
 f.peaceFrameworkVerified=peaceFramework;f.endedVerified=ended;f.implementationVerified=ended;
 f.diplomacyStage=ended?5:4;
 f.military.recentSeverity=0;f.military.priorSeverity=days<28?10:0;
}
test('R4 shadow is a separate version with fixed explicit front membership and phase intervals',()=>{
 assert.equal(IRAN_R4_SHADOW_VERSION,'IRAN_R4_REALITY_ANCHOR_SHADOW_V1');
 assert.deepEqual(IRAN_R4_FRONT_IDS,['IRN_USA','IRN_ISR','YEMEN_HOUTHI']);
 assert.deepEqual(IRAN_R4_BANDS.FULL_SCALE_WAR,{min:10,max:24});
 assert.deepEqual(IRAN_R4_BANDS.CEASEFIRE_SUSTAINED,{min:75,max:89});
});
test('a verified full-scale Yemen front prevents a synthetic 50 or 80 despite favorable other axes',()=>{
 const s=snapshot();phaseOf(s,'YEMEN_HOUTHI','FULL_SCALE_WAR');
 s.fronts.IRN_USA.diplomacyStage=5;s.nuclear.score=100;
 const r=calculateIranR4RealityShadow(s,now);
 assert.equal(r.status,'SHADOW_READY');assert.equal(r.productionReady,false);
 assert.equal(r.phase,'FULL_SCALE_WAR');
 assert.ok(r.score>=10&&r.score<=24);
 assert.equal(assessR4ScoreAgainstReality(50,s,now).status,'INCOMPATIBLE');
 assert.equal(assessR4ScoreAgainstReality(80,s,now).status,'INCOMPATIBLE');
 assert.equal(assessR4ScoreAgainstReality(10,s,now).status,'COMPATIBLE');
});
test('active military operations cannot be described as a 50- or 80-point truce',()=>{
 const s=snapshot();
 const r=calculateIranR4RealityShadow(s,now);
 assert.deepEqual(r.allowedRange,{min:25,max:39});
 assert.equal(assessR4ScoreAgainstReality(50,s,now).status,'INCOMPATIBLE');
 assert.equal(assessR4ScoreAgainstReality(80,s,now).status,'INCOMPATIBLE');
});
test('14-30 days of verified ceasefire on ALL fronts supports 80-range, not automatic 100',()=>{
 const s=snapshot();
 for(const id of IRAN_R4_FRONT_IDS)verifiedTruce(s,id,20);
 s.nuclear.score=80;
 const r=calculateIranR4RealityShadow(s,now);
 assert.equal(r.phase,'CEASEFIRE_SUSTAINED');
 assert.ok(r.score>=75&&r.score<=89);
 assert.equal(assessR4ScoreAgainstReality(80,s,now).status,'COMPATIBLE');
 assert.equal(assessR4ScoreAgainstReality(100,s,now).status,'INCOMPATIBLE');
});
test('a single ongoing front cannot be hidden behind other fronts marking a peace transition',()=>{
 const s=snapshot();
 verifiedTruce(s,'IRN_USA',35,{peaceFramework:true});
 verifiedTruce(s,'IRN_ISR',35,{peaceFramework:true});
 phaseOf(s,'YEMEN_HOUTHI','FULL_SCALE_WAR');
 assert.deepEqual(calculateIranR4RealityShadow(s,now).allowedRange,{min:10,max:24});
});
test('official end in all three fronts is required for 100',()=>{
 const s=snapshot();for(const id of IRAN_R4_FRONT_IDS)verifiedTruce(s,id,40,{ended:true});
 for(const route of Object.values(s.maritime.routes)){route.incidentCoverage.recentSeverity=0;route.incidentCoverage.priorSeverity=0;}
 const good=calculateIranR4RealityShadow(s,now);
 assert.equal(good.score,100);assert.equal(good.phase,'ENDED');
 const f=s.fronts.YEMEN_HOUTHI;f.endedVerified=false;
 assert.equal(calculateIranR4RealityShadow(s,now).status,'SHADOW_PENDING');
});
test('all fronts formally ended cannot produce 100 while verified shipping attacks continue',()=>{
 const s=snapshot();for(const id of IRAN_R4_FRONT_IDS)verifiedTruce(s,id,40,{ended:true});
 const r=calculateIranR4RealityShadow(s,now);
 assert.equal(r.status,'SHADOW_PENDING');
 assert.equal(r.reason,'OFFICIAL_END_CONTRADICTED_BY_MARITIME_ATTACKS');
 assert.equal(r.score,null);
});
test('missing a single front never imputes 50 points',()=>{
 const s=snapshot();delete s.fronts.YEMEN_HOUTHI;
 const r=calculateIranR4RealityShadow(s,now);
 assert.equal(r.score,null);
 assert.equal(r.status,'SHADOW_PENDING');
 assert.equal(r.missing[0].front,'YEMEN_HOUTHI');
});
test('stale official war evidence cannot be used as if it describes the current day',()=>{
 const s=snapshot(now-9*DAY);
 const r=calculateIranR4RealityShadow(s,now);
 assert.equal(r.status,'SHADOW_PENDING');
 assert.equal(assessR4ScoreAgainstReality(39.1,s,now).status,'UNASSESSABLE');
});
test('no maritime observations or nuclear status means no composite score',()=>{
 const s=snapshot();delete s.maritime;delete s.nuclear;
 const r=calculateIranR4RealityShadow(s,now);
 assert.equal(r.status,'SHADOW_PENDING');
 assert.equal(r.missing.filter(x=>x.domain).length,2);
});
test('news title and Ollama-only analysis cannot substitute for verified saved phase inputs',()=>{
 const s=snapshot();
 s.fronts.YEMEN_HOUTHI.phaseEvidence=[{sourceId:'OLLAMA',sourceKind:'MODEL',url:'https://example.invalid/model',
  verified:false,observedAt:now-2*HOUR,verifiedAt:now-HOUR}];
 assert.equal(calculateIranR4RealityShadow(s,now).status,'SHADOW_PENDING');
});
test('de-escalation requires real 7/21 observation trend and an explicit verified state',()=>{
 const s=snapshot();
 const f=s.fronts.IRN_USA;f.phase='VERIFIED_DEESCALATION';f.deescalationVerified=true;
 assert.equal(verifyR4Front(f,now),'DEESCALATION_NOT_VERIFIED');
 f.military.recentSeverity=1;f.military.priorSeverity=21;
 assert.equal(verifyR4Front(f,now),null);
});
test('sustained ceasefire conflicts with any new verified event in the same scope',()=>{
 const s=snapshot();verifiedTruce(s,'IRN_USA',20);
 s.fronts.IRN_USA.military.recentSeverity=10;
 assert.equal(verifyR4Front(s.fronts.IRN_USA,now),'SUSTAINED_CEASEFIRE_CONTRADICTED_BY_VERIFIED_ATTACKS');
});
test('one verified ceasefire violation invalidates the claimed 80-range',()=>{
 const s=snapshot();for(const id of IRAN_R4_FRONT_IDS)verifiedTruce(s,id,20);
 s.fronts.IRN_USA.postCeasefireViolationVerified=true;
 const r=calculateIranR4RealityShadow(s,now);
 assert.equal(r.status,'SHADOW_PENDING');
 assert.equal(assessR4ScoreAgainstReality(80,s,now).status,'UNASSESSABLE');
});
test('an unverified unilateral promise does not justify a 50-point phase',()=>{
 const s=snapshot();const f=s.fronts.IRN_USA;
 f.phase='FRAGILE_TRUCE';f.ceasefireStatus='UNILATERAL';
 assert.equal(verifyR4Front(f,now),'FRAGILE_TRUCE_NOT_VERIFIED');
 f.partialCessationVerified=true;
 assert.equal(verifyR4Front(f,now),null);
});
test('missing 28-day military coverage cannot falsely imply peace',()=>{
 const s=snapshot();s.fronts.IRN_ISR.military.fullCoverageVerified=false;
 assert.equal(calculateIranR4RealityShadow(s,now).status,'SHADOW_PENDING');
});
test('zero recent attacks is not evidence of active full-scale war',()=>{
 const s=snapshot();phaseOf(s,'YEMEN_HOUTHI','FULL_SCALE_WAR');
 s.fronts.YEMEN_HOUTHI.military.recentSeverity=0;
 assert.equal(verifyR4Front(s.fronts.YEMEN_HOUTHI,now),'ACTIVE_WAR_LACKS_VERIFIED_RECENT_EVENTS');
});
test('military severity is monotonic and never invents negative intensity',()=>{
 assert.equal(militarySeverityScore(0,0),100);
 assert.ok(militarySeverityScore(7,0)>militarySeverityScore(70,0));
 assert.ok(militarySeverityScore(14,21)<100);
});
