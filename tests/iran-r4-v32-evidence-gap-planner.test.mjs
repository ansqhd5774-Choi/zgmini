import test from 'node:test';
import assert from 'node:assert/strict';
import {R4_LANES,auditIranR4EvidenceGapsV32 as audit}
 from '../lib/iran-progress/evidence-gap-planner-v32.mjs';
const row=(id,kind,lane,claimFrom,claimThrough,documentDay='2026-10-18')=>({
 id,kind,lane,claimFrom,claimThrough,documentDay,
 sourceUrl:'https://www.ukmto.org/ukmto-products/weekly-reports',
 pcOriginalStoredDay:null,independentFullCoverageVerified:false,scoreEligible:false
});
test('42 UTC calendar days and five distinct R4 lanes have 210 uncovered lane-days',()=>{
 const x=audit();assert.equal(x.period.days,42);assert.equal(R4_LANES.length,5);
 assert.equal(x.laneDaySlots,210);assert.equal(x.laneDaySlotsWithCandidateDocuments,0);
 assert.equal(x.laneDaySlotsWithoutCandidateDocuments,210);
 assert.equal(x.lanes.HORMUZ.missingCandidateDateIntervals[0].days,42);
 assert.equal(x.score,null);assert.equal(x.computedR4Days,0);
});
test('UKMTO weekly seven-day summary would yield only Hormuz discovery candidates, not 28-day proof',()=>{
 const x=audit([row('WK01','OFFICIAL_WEEKLY_SUMMARY','HORMUZ','2026-10-05','2026-10-11')]);
 assert.equal(x.lanes.HORMUZ.candidateDocumentDays,7);
 assert.equal(x.lanes.RED_SEA.candidateDocumentDays,0);
 assert.equal(x.lanes.IRN_USA.candidateDocumentDays,0);
 assert.equal(x.laneDaySlotsWithoutCandidateDocuments,203);
 assert.equal(x.fullCoverageProven,false);assert.equal(x.lanes.HORMUZ.independentlyVerifiedCoverageDays,0);
});
test('overlapping official warnings count one candidate day, not two attacks',()=>{
 const a=row('UK_156','OFFICIAL_WARNING','HORMUZ','2026-10-05','2026-10-05','2026-10-05');
 const b=row('UK_157','OFFICIAL_WARNING','HORMUZ','2026-10-05','2026-10-05','2026-10-05');
 const x=audit([a,b]);assert.equal(x.sourceCandidateCount,2);
 assert.equal(x.lanes.HORMUZ.candidateDocumentDays,1);
 assert.equal(x.verifiedR4EventsPromoted,0);assert.equal(x.fullCoverageProven,false);
});
test('published October 12 for incident October 11 cannot prove October 11 PC as-of',()=>{
 const r=row('UK_166','OFFICIAL_WARNING','HORMUZ','2026-10-11','2026-10-11','2026-10-12');
 const x=audit([r]);assert.equal(x.lanes.HORMUZ.candidateDocumentDays,1);
 assert.equal(x.pcOriginalReceiptMissingForAnySourceDoesNotBecomeAsOfEvidence,true);
 assert.equal(x.latestRevisionCannotBeBackdated,true);
});
test('weekly and daily summaries overlapping preserve unique sorted day intervals',()=>{
 const r=row('WK_A','OFFICIAL_WEEKLY_SUMMARY','RED_SEA','2026-10-05','2026-10-11');
 const s=row('DAY_A','OFFICIAL_DAILY_SUMMARY','RED_SEA','2026-10-10','2026-10-10');
 const t=row('DAY_B','OFFICIAL_DAILY_SUMMARY','RED_SEA','2026-10-13','2026-10-13');
 const x=audit([r,s,t]);assert.equal(x.lanes.RED_SEA.candidateDocumentDays,8);
 assert.deepEqual(x.lanes.RED_SEA.candidateDateIntervals,
 [{from:'2026-10-05',through:'2026-10-11',days:7},{from:'2026-10-13',through:'2026-10-13',days:1}]);
});
test('official UKMTO material cannot attest Iranian military fronts',()=>{
 assert.throws(()=>audit([row('WK_FRONT','OFFICIAL_WEEKLY_SUMMARY','IRN_USA','2026-10-05','2026-10-11')]),/SOURCE_SCOPE_INVALID/);
});
test('fail closed on spoofed authority, score promotion, or alleged independent proof',()=>{
 for(const patch of [{sourceUrl:'http://www.ukmto.org/report'},
   {sourceUrl:'https://localhost/report'},
   {scoreEligible:true},{independentFullCoverageVerified:true}])
   assert.throws(()=>audit([{...row('TEST_A','OFFICIAL_WARNING','HORMUZ','2026-10-11','2026-10-11'),...patch}]),/EVIDENCE_INVALID/);
});
test('weekly and daily coverage date limits enforced',()=>{
 const w=row('WK_LONG','OFFICIAL_WEEKLY_SUMMARY','RED_SEA','2026-10-01','2026-10-09');
 const d=row('DAY_LONG','OFFICIAL_DAILY_SUMMARY','RED_SEA','2026-10-09','2026-10-10');
 assert.throws(()=>audit([w]),/EVIDENCE_INVALID/);
 assert.throws(()=>audit([d]),/EVIDENCE_INVALID/);
});
test('future correction and incomplete timestamp provenance fail closed',()=>{
 const r=row('CORR','OFFICIAL_WARNING','HORMUZ','2026-10-11','2026-10-11','2026-10-12');
 assert.throws(()=>audit([{...r,pcOriginalStoredDay:'2026-10-10'}]),/EVIDENCE_INVALID/);
 assert.throws(()=>audit([{...r,pcOriginalStoredDay:'2026-10-22'}]),/EVIDENCE_INVALID/);
 assert.throws(()=>audit([{...r,claimThrough:'2026-10-13'}]),/EVIDENCE_INVALID/);
});
test('duplicate source IDs and impossible dates fail closed',()=>{
 const r=row('DUP_001','OFFICIAL_WARNING','HORMUZ','2026-10-11','2026-10-11');
 assert.throws(()=>audit([r,r]),/EVIDENCE_INVALID/);
 assert.throws(()=>audit([],{from:'2026-09-31'}),/INPUT_INVALID/);
 assert.throws(()=>audit([],{from:'2026-10-19',through:'2026-10-18'}),/INPUT_INVALID/);
});
test('even a candidate row for every day cannot become production R4 coverage',()=>{
 const all=Array.from({length:42},(_,i)=>{
  const day=new Date(Date.UTC(2026,8,7+i)).toISOString().slice(0,10);
  return row('WARNING_'+i,'OFFICIAL_WARNING','HORMUZ',day,day,day);
 });
 const x=audit(all);assert.equal(x.lanes.HORMUZ.candidateDocumentDays,42);
 assert.equal(x.lanes.HORMUZ.independentlyVerifiedCoverageDays,0);
 assert.equal(x.laneDaySlotsWithoutCandidateDocuments,168);
 assert.equal(x.productionReady,false);assert.equal(x.score,null);
});
