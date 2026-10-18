import test from 'node:test';
import assert from 'node:assert/strict';
import {buildR4PrimarySourceReview,IRAN_R4_V13_PUBLIC_SOURCE_RECORDS} from '../lib/iran-progress/r4-primary-source-temporal-review-v13.mjs';
const get=id=>IRAN_R4_V13_PUBLIC_SOURCE_RECORDS.find(r=>r.id===id);
const day=(r,d)=>r.history.find(x=>x.day===d);
test('all 14 days remain null without locally verified 28-day R4 inputs',()=>{
 const x=buildR4PrimarySourceReview();
 assert.equal(x.primarySourceClaims,9);assert.equal(x.history.length,14);
 assert.equal(x.r4ScoresComputed,0);assert.equal(x.fullyCoveredR4Dates,0);
 assert.ok(x.history.every(d=>d.r4Score===null&&!d.full28DayCoverageVerified&&d.independentlyVerifiedR4Events===0));
 assert.equal(x.productionReady,false);assert.equal(x.published,false);
});
test('two Oct 8 GACA airport attacks are separate claims and published Oct 9',()=>{
 const r=buildR4PrimarySourceReview();
 const c=day(r,'2026-10-08').incidentCandidates;
 assert.equal(c.length,2);assert.ok(c.every(x=>x.latePublication&&x.publicationDate==='2026-10-09'));
 assert.equal(day(r,'2026-10-09').sourceReportsPublished,3); // Two GACA incidents plus UN war-phase assessment.
});
test('Oct 9 Yemen full-war assessment is not falsely counted as new incident',()=>{
 const x=buildR4PrimarySourceReview();
 assert.equal(x.phaseReports,1);
 assert.equal(get('YEMEN_WAR_PHASE_1009').eventDate,null);
 assert.equal(day(x,'2026-10-09').incidentCandidates.length,0);
});
test('Oct 10 Riyadh UN report published Oct 11 is not Oct 11 new attack',()=>{
 const r=buildR4PrimarySourceReview();
 assert.equal(day(r,'2026-10-10').incidentCandidates.length,1);
 assert.equal(day(r,'2026-10-11').incidentCandidates.length,0);
 assert.equal(day(r,'2026-10-10').incidentCandidates[0].latePublication,true);
 assert.equal(get('RIYADH_KKIA_STRIKE_1010').actorClaim,'HOUTHI_REPORTED_BY_UN');
 assert.equal(get('RIYADH_KKIA_STRIKE_1010').incidentActorVerifiedForR4,false);
});
test('MPA confirms two different vessels; no inferred attacker or identical incident',()=>{
 const r=buildR4PrimarySourceReview();
 const a=get('GFS_PRIDE_1013'),b=get('GFS_GISELLE_1014');
 assert.notEqual(a.object,b.object);assert.equal(a.eventDate,'2026-10-13');
 assert.equal(a.publicationDate,'2026-10-14');assert.equal(b.eventDate,'2026-10-14');
 assert.equal(a.actorClaim,null);assert.equal(b.actorClaim,null);
 assert.equal(day(r,'2026-10-13').incidentCandidates.length,1);
 assert.equal(day(r,'2026-10-14').incidentCandidates.length,1);
});
test('MARAD advisories count as active risk context not day-specific incidents',()=>{
 const r=buildR4PrimarySourceReview();
 assert.equal(r.activeRiskAdvisories,2);
 assert.ok(r.claims.filter(x=>x.kind==='ACTIVE_ADVISORY').every(x=>x.eventDate===null));
 assert.equal(r.incidentReportCandidates,5); 
});
test('Qatar publication on 6th and PC receipt on 8th never become 6th known state',()=>{
 const r=buildR4PrimarySourceReview();
 assert.equal(get('QATAR_MEDIATION_1006').sourcePCStoredDay,'2026-10-08');
 assert.equal(day(r,'2026-10-06').localReceiptCandidatesKnownByDay,0);
 assert.equal(day(r,'2026-10-07').localReceiptCandidatesKnownByDay,0);
 assert.equal(day(r,'2026-10-08').localReceiptCandidatesKnownByDay,1);
 assert.equal(get('QATAR_MEDIATION_1006').scoreEligible,false);
});
test('rejects fabricated verified flags in source metadata',()=>{
 const rows=IRAN_R4_V13_PUBLIC_SOURCE_RECORDS.map(x=>({...x}));
 rows[0].independentlyVerifiedR4Event=true;
 assert.throws(()=>buildR4PrimarySourceReview(rows),/CONTRACT_INVALID/);
});
test('rejects duplicate incident identity even when source URL or claim ID differs',()=>{
 const rows=IRAN_R4_V13_PUBLIC_SOURCE_RECORDS.map(x=>({...x}));
 rows[1].object=rows[2].object;
 assert.throws(()=>buildR4PrimarySourceReview(rows),/DUPLICATE_INCIDENT_ID/);
});
test('rejects hindsight event dates and false attribution of a phase/advisory as attack',()=>{
 const a=IRAN_R4_V13_PUBLIC_SOURCE_RECORDS.map(x=>({...x}));
 a[1].eventDate='2026-10-11';
 assert.throws(()=>buildR4PrimarySourceReview(a),/CONTRACT_INVALID/);
 const b=IRAN_R4_V13_PUBLIC_SOURCE_RECORDS.map(x=>({...x}));
 b[3].eventDate='2026-10-09';
 assert.throws(()=>buildR4PrimarySourceReview(b),/V13_PHASE_CANNOT_BE_INCIDENT/);
 const c=IRAN_R4_V13_PUBLIC_SOURCE_RECORDS.map(x=>({...x}));
 c[7].eventDate='2026-09-09';
 assert.throws(()=>buildR4PrimarySourceReview(c),/V13_ADVISORY_NOT_DAILY_INCIDENT/);
});
test('all researched sources remain unverified PC receipts and score ineligible',()=>{
 const x=buildR4PrimarySourceReview();
 assert.equal(x.pcSourceReceiptUnobserved,8);
 assert.ok(x.claims.every(c=>c.sourcePageConfirmedAsOfResearchOnly===true&&!c.sourceOriginalPcProof&&!c.scoreEligible&&!c.independentlyVerifiedR4Event));
 assert.equal(x.latePublicationCount,4);
});
