import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../scripts/iran-progress/store.mjs';
import {IRAN_R4_14D_CASEBOOK,IRAN_R4_14D_SOURCES,auditR4FourteenDayResearch}
 from '../lib/iran-progress/fourteen-day-evidence-r4.mjs';
import {auditIranR4FourteenDayLocal}
 from '../scripts/iran-progress/fourteen-day-local-audit-r4.mjs';
const DAY=86400000,HOUR=3600000;
const now=Date.parse('2026-10-18T09:00:00Z');
const ts=date=>Date.parse(date+'T00:00:00Z');
const evidence=t=>[{sourceId:'OFFICIAL_SYNTHETIC_SOURCE',sourceKind:'OFFICIAL',
 url:'https://example.invalid/source',verified:true,observedAt:t-2*HOUR,verifiedAt:t-HOUR}];
function fixture(at){
 const front=id=>({id,phase:'ACTIVE_COMBAT',phaseVerified:true,phaseObservedAt:at-2*HOUR,
 phaseVerifiedAt:at-HOUR,phaseEvidence:evidence(at),coverageThrough:at-HOUR,
 diplomacyStage:1,ceasefireStatus:'ACTIVE_COMBAT',military:{verified:true,
 eventsDeduplicated:true,fullCoverageVerified:true,coverageFrom:at-28*DAY,
 coverageThrough:at-HOUR,coverageEvidence:evidence(at),recentSeverity:5,priorSeverity:12}});
 const route=id=>({id,incidentCoverage:{verified:true,eventsDeduplicated:true,
 complete28Days:true,from:at-28*DAY,through:at-HOUR,recentSeverity:1,priorSeverity:5,
 evidence:evidence(at)},restriction:{verified:true,state:'MAJOR_RESTRICTIONS',
 officialStateVerified:true,observedAt:at-2*HOUR,verifiedAt:at-HOUR,evidence:evidence(at)}});
 return {fronts:Object.fromEntries(['IRN_USA','IRN_ISR','YEMEN_HOUTHI'].map(id=>[id,front(id)])),
 maritime:{routes:{HORMUZ:route('HORMUZ'),RED_SEA:route('RED_SEA')}},
 nuclear:{verified:true,score:50,observedAt:at-2*HOUR,verifiedAt:at-HOUR,evidence:evidence(at)}};
}
function event(id,date,verifiedAt){
 return {eventId:id,revision:1,axis:'YEMEN_HOUTHI',status:'VERIFIED',
 eventAt:ts(date)+10*HOUR,verifiedAt,severity:3,occurrenceVerified:true,
 actorVerified:true,connectionVerified:true,severityVerified:true};
}
test('all fourteen calendar dates Oct 5–18 are reviewed without filling artificial R3 50',()=>{
 const out=auditR4FourteenDayResearch();
 assert.equal(out.days.length,14);
 assert.deepEqual(out.days.map(x=>x.date),IRAN_R4_14D_CASEBOOK.map(x=>x.date));
 assert.equal(new Set(out.days.map(x=>x.date)).size,14);
 assert.ok(out.days.every(x=>x.r4Score===null&&x.pointInTimeStatus==='LOCAL_R4_VERIFIED_INPUT_REQUIRED'));
 assert.equal(out.verifiedRealityScores,0);
 assert.ok(out.uniquePublicReports>=14);
});
test('dated discovery does not allow Saudi–Iran contacts to pass as direct US–Iran talks',()=>{
 const r=IRAN_R4_14D_SOURCES.find(x=>x.id==='REUTERS_SAUDI_IRAN_TALKS_1011');
 assert.equal(r.front,'SAUDI_IRAN');
 assert.equal(r.kind,'REGIONAL_DIPLOMACY_ONLY');
});
test('maritime tactic coverage cannot be mistaken for direct Iran-US military attack',()=>{
 const r=IRAN_R4_14D_SOURCES.find(s=>s.id==='REUTERS_SHIPPING_TACTICS_1014');
 assert.equal(r.front,'HORMUZ_MARITIME');
 assert.equal(r.eventDate,null);
 assert.equal(r.kind,'MARITIME_TREND_REPORT');
});
test('6th research record reports the prior day; it is not a verified 6th October attack',()=>{
 const row=IRAN_R4_14D_SOURCES.find(x=>x.id==='SAUDI_GAZETTE_HODEIDAH_1006');
 assert.equal(row.publishedDate,'2026-10-06');
 assert.equal(row.eventDate,'2026-10-05');
 assert.equal(row.kind,'PRIOR_DAY_REPORT');
});
test('PC read-only audit returns all 14 dates, with missing raw verification expressed as null',()=>{
 const db=openStore(':memory:');
 try{
  const x=auditIranR4FourteenDayLocal(db.db,{now});
  assert.equal(x.daysChecked,14);
  assert.equal(x.dailyR4Scored,0);
  assert.equal(x.status,'SHADOW_14D_PARTIAL');
  assert.equal(x.unscoredDays.length,14);
  assert.ok(x.days.every(r=>r.r4Score===null&&r.localVerifiedThatDay!==null));
  assert.equal(x.dbWrites,0);
  assert.equal(x.providerCalls,0);
  assert.equal(x.published,false);
 }finally{db.close();}
});
test('event on October 8 verified on October 12 cannot contaminate October 8 as-of result',()=>{
 const db=openStore(':memory:');
 try{
  db.putEvent(event('event-late','2026-10-08',ts('2026-10-12')+HOUR));
  const r=auditIranR4FourteenDayLocal(db.db,{now});
  assert.equal(r.days.find(x=>x.date==='2026-10-08').localVerifiedThatDay.YEMEN_HOUTHI.verifiedThatDay,0);
  assert.equal(r.days.find(x=>x.date==='2026-10-12').localVerifiedThatDay.YEMEN_HOUTHI.verifiedThatDay,0);
  assert.equal(r.days.find(x=>x.date==='2026-10-08').r4Score,null);
 }finally{db.close();}
});
test('only independently verified saved daily R4 input creates a score for that one day',()=>{
 const db=openStore(':memory:');
 try{
  const day='2026-10-15',at=ts(day)+18*HOUR;
  db.checkpoint('r4-shadow-verified-asof-v1:'+day,{asOf:at,input:fixture(at)});
  const r=auditIranR4FourteenDayLocal(db.db,{now});
  assert.equal(r.dailyR4Scored,1);
  const x=r.days.find(p=>p.date===day);
  assert.equal(x.r4ScoreStatus,'SHADOW_READY');
  assert.equal(x.military28DayCoverageProven,true);
  assert.ok(x.r4Score>=25&&x.r4Score<=39);
  assert.equal(r.unscoredDays.length,13);
  assert.equal(r.days.find(p=>p.date==='2026-10-18').r4Score,null);
 }finally{db.close();}
});
test('a future or wrong-day saved checkpoint is unusable and does not infer an analyst 18 anchor',()=>{
 const db=openStore(':memory:');
 try{
  db.checkpoint('r4-shadow-verified-asof-v1:2026-10-09',{asOf:ts('2026-10-12'),input:fixture(ts('2026-10-12'))});
  const r=auditIranR4FourteenDayLocal(db.db,{now});
  assert.equal(r.days.find(x=>x.date==='2026-10-09').r4ScoreStatus,'R4_ASOF_CHECKPOINT_DATE_INVALID');
  assert.equal(r.days.find(x=>x.date==='2026-10-09').r4Score,null);
  assert.equal(r.days.find(x=>x.date==='2026-10-18').analystAnchorApplied,false);
 }finally{db.close();}
});
