import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {assessR10ReleaseLineageGate} from '../scripts/pc-writer/asset-r10-release-lineage-gate-r1.mjs';

const H='a'.repeat(64), J='b'.repeat(64), K='c'.repeat(64);
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const approvedB=[
 {quarter:'2025-Q2',breadthDivergence:null},
 {quarter:'2025-Q3',breadthDivergence:null},
 {quarter:'2025-Q4',breadthDivergence:19},
 {quarter:'2026-Q1',breadthDivergence:20},
 {quarter:'2026-Q2',breadthDivergence:21},
];

function make(){
 const approvedRelease={methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',
  scoreObservationQuarter:'2026-Q2',score:22.57324252737245,
  historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,
  rightsStatus:'USER_ACCEPTED_UNVERIFIED',
  publicationPolicy:'USER_APPROVED_CURRENT_VINTAGE_UNVERIFIED_SOURCES',
  sourceVersion:'macro:2026-11-01:'+H,sourceStoredAt:1793500000000,
  asOfDate:'2026-10-30',trend:[
   {quarter:'2025-Q4',value:20},{quarter:'2026-Q1',value:21},
   {quarter:'2026-Q2',value:22.57324252737245}]};
 const candidateRelease={...approvedRelease,scoreObservationQuarter:'2026-Q3',score:25,
  sourceVersion:'macro:2026-11-02:'+J,sourceStoredAt:1793593807265,
  asOfDate:'2026-11-02',trend:[...structuredClone(approvedRelease.trend),
   {quarter:'2026-Q3',value:25}]};
 const candidateBHistory=[...structuredClone(approvedB),{quarter:'2026-Q3',breadthDivergence:30}];
 const quarterMaturity={quarter:'2026-Q3',months:[
  {month:'2026-07',lastExpectedSession:'2026-07-31',lastObservedSession:'2026-07-31',rankObservations:278,windowSessions:200,validPriceWindowMembers:495,memberCount:503,researchSafetyScore:20},
  {month:'2026-08',lastExpectedSession:'2026-08-31',lastObservedSession:'2026-08-31',rankObservations:279,windowSessions:200,validPriceWindowMembers:496,memberCount:503,researchSafetyScore:30},
  {month:'2026-09',lastExpectedSession:'2026-09-30',lastObservedSession:'2026-09-30',rankObservations:280,windowSessions:200,validPriceWindowMembers:497,memberCount:503,researchSafetyScore:40},
 ]};
 const pitProof={status:'PIT_TIME_EFFECTIVE_IDENTITIES_VERIFIED',membershipLookAheadSafe:true,
  eventDigest:H,memberSeriesDigest:J};
 const researchReadback={status:'STAGED_RESEARCH_READBACK_VERIFIED_NOT_PROMOTABLE',
  canPromote:false,productionEligible:false,planAuditDigest:K,
  manifestSha256:H,capturedSymbols:['SKYD']};
 const priceBasisProof={status:'PRICE_BASIS_AND_RIGHTS_INDEPENDENTLY_REVIEWED',
  planAuditDigest:K,manifestSha256:H,pitEventDigest:H,
  rightsEvidenceSha256:J,corporateActionPriceBasisSha256:K};
 const ctx={approvedRelease,candidateRelease,approvedBHistory:structuredClone(approvedB),
  candidateBHistory,quarterMaturity,pitProof,researchReadback,priceBasisProof,
  asOfDate:'2026-11-02'};
 return replay(ctx);
}
function replay(ctx){
 ctx.calculationReplay={status:'R10_APPROVED_FORMULA_REPLAY_INDEPENDENTLY_VERIFIED',
  candidateDigest:sha({candidateRelease:ctx.candidateRelease,
   candidateBHistory:ctx.candidateBHistory,quarterMaturity:ctx.quarterMaturity}),
  pitEventDigest:ctx.pitProof.eventDigest,
  manifestSha256:ctx.researchReadback.manifestSha256,
  recomputedScore:ctx.candidateRelease.score,
  recomputedBScore:ctx.candidateBHistory.at(-1).breadthDivergence};
 return ctx;
}
const status=value=>assessR10ReleaseLineageGate(value).status;

function quarantined(){
 const v=make(),months=v.quarterMaturity.months;
 v.pitProof={status:'PIT_LABEL_IDENTITY_AUDITED_NOT_PROMOTABLE',
  sourceEventDigest:H,approvedMemberSeriesHash:J,officialMemberSeriesHash:K,
  overlapDays:501,counts:{preMerger:200,backcast:301,postRename:0,exact:0,other:0}};
 v.identityQuarantineResearch={
  status:'CANDIDATE_WITH_ONE_UNRESOLVED_SECURITY_RESEARCH_ONLY',
  canPromote:false,productionEligible:false,
  officialPitDigest:H,overlapChecked:501,quarantinedOverlapDays:501,
  identityAuditStatus:'PIT_LABEL_IDENTITY_AUDITED_NOT_PROMOTABLE',
  unresolvedSymbols:['SKYD'],
  candidateRows:months.map(month=>({observationDate:month.lastExpectedSession,
   memberCount:month.memberCount,valid200:month.validPriceWindowMembers,
   coverage:month.validPriceWindowMembers/month.memberCount,unresolvedIdentityCount:1})),
 };
 replay(v);v.calculationReplay.pitEventDigest=H;
 return v;
}

test('valid independently replayed packet is STILL never a promotion permit',()=>{
 const result=assessR10ReleaseLineageGate(make());
 assert.equal(result.status,'REVIEW_PACKET_READY_NOT_AUTOPROMOTABLE');
 assert.equal(result.canPromote,false);
 assert.equal(result.productionEligible,false);
 for(const field of ['approvedInputWrites','releaseWrites','sqliteWrites','d1Writes','providerRequests'])
  assert.equal(result[field],0);
 assert.equal(result.candidateBScore,30);
});
test('missing candidate baseline is rejected',()=>{
 const v=make();delete v.candidateRelease.sourceVersion;
 assert.equal(status(v),'STOP_RELEASE_BASELINE_INVALID');
});
test('formula/version/rights contract changes are rejected',()=>{
 const v=make();v.candidateRelease.rightsStatus='VERIFIED';replay(v);
 assert.equal(status(v),'STOP_R10_APPROVED_CONTRACT_DRIFT');
});
test('2025-Q2/Q3 real nulls must not be overwritten',()=>{
 const v=make();v.candidateBHistory[0].breadthDivergence=42;replay(v);
 assert.equal(status(v),'STOP_APPROVED_EARLY_B_NULL_REWRITTEN');
});
test('existing completed-quarter B history is immutable',()=>{
 const v=make();v.candidateBHistory[4].breadthDivergence=40;replay(v);
 assert.equal(status(v),'STOP_APPROVED_B_HISTORY_REWRITTEN');
});
test('same approved quarter preserves score without an update',()=>{
 const v=make();v.candidateRelease.scoreObservationQuarter='2026-Q2';
 v.candidateRelease.score=v.approvedRelease.score;
 v.candidateRelease.trend.pop();replay(v);
 assert.equal(status(v),'NO_NEW_COMPLETED_QUARTER');
});
test('source checkpoint may never regress',()=>{
 const v=make();v.candidateRelease.sourceStoredAt=3;replay(v);
 assert.equal(status(v),'STOP_RELEASE_CHECKPOINT_REGRESSION');
});
test('quarter gaps are not auto-created',()=>{
 const v=make();v.candidateRelease.scoreObservationQuarter='2026-Q4';
 v.candidateRelease.trend.at(-1).quarter='2026-Q4';replay(v);
 assert.equal(status(v),'STOP_UNRECONCILED_QUARTER_GAP');
});
test('prior score trend is preserved, not silently revised',()=>{
 const v=make();v.candidateRelease.trend[1].value=44;replay(v);
 assert.equal(status(v),'STOP_APPROVED_SCORE_TREND_REWRITTEN');
});
test('new quarter needs a new source checkpoint',()=>{
 const v=make();v.candidateRelease.sourceVersion=v.approvedRelease.sourceVersion;replay(v);
 assert.equal(status(v),'STOP_UNCHANGED_RELEASE_LINEAGE_CHECKPOINT');
});
test('maturity requires 200-session/252-pair/98%-coverage/three months',()=>{
 const v=make();v.quarterMaturity.months[0].validPriceWindowMembers=490;replay(v);
 assert.equal(status(v),'STOP_B_200MA_252PAIR_THREE_MONTH_EVIDENCE');
 v.quarterMaturity.months[0].validPriceWindowMembers=495;
 v.quarterMaturity.months[2].rankObservations=251;replay(v);
 assert.equal(status(v),'STOP_B_200MA_252PAIR_THREE_MONTH_EVIDENCE');
 v.quarterMaturity.months[2].rankObservations=280;
 v.quarterMaturity.months[1].windowSessions=199;replay(v);
 assert.equal(status(v),'STOP_B_200MA_252PAIR_THREE_MONTH_EVIDENCE');
});
test('month must reach the last actual trading session (not just a calendar date)',()=>{
 const v=make();v.quarterMaturity.months[0].lastExpectedSession='2026-07-30';
 v.quarterMaturity.months[0].lastObservedSession='2026-07-30';replay(v);
 assert.equal(status(v),'STOP_B_200MA_252PAIR_THREE_MONTH_EVIDENCE');
});
test('future month-end and unchecked baseline dates cannot pass',()=>{
 const v=make();v.quarterMaturity.months[2].lastObservedSession='2026-10-01';replay(v);
 assert.equal(status(v),'STOP_B_200MA_252PAIR_THREE_MONTH_EVIDENCE');
 const x=make();x.approvedRelease.asOfDate='2026-99-99';
 assert.equal(status(x),'STOP_RELEASE_BASELINE_INVALID');
});
test('three scores must reproduce the quarterly B average exactly',()=>{
 const v=make();v.quarterMaturity.months[0].researchSafetyScore=23;replay(v);
 assert.equal(status(v),'STOP_B_QUARTER_ARITHMETIC_PARITY');
});
test('no release gate with unverified PIT identity',()=>{
 const v=make();v.pitProof.status='PIT_LABEL_IDENTITY_AUDITED_NOT_PROMOTABLE';replay(v);
 assert.equal(status(v),'STOP_TIME_EFFECTIVE_PIT_PROOF_MISSING');
});
test('raw research capture receipt alone is insufficient',()=>{
 const v=make();v.researchReadback.status='RESEARCH_CAPTURED_NOT_PROMOTABLE';replay(v);
 assert.equal(status(v),'STOP_IMMUTABLE_RESEARCH_READBACK_MISSING');
});
test('independent rights/price basis evidence must match manifest and PIT lineage',()=>{
 const v=make();v.priceBasisProof.manifestSha256=J;replay(v);
 assert.equal(status(v),'STOP_PRICE_RIGHTS_OR_CORPORATE_ACTION_PROOF_MISSING');
});
test('replay score parity rejects stale or tampered candidate',()=>{
 const v=make();v.calculationReplay.recomputedScore=99;
 assert.equal(status(v),'STOP_R10_FORMULA_REPLAY_OR_SCORE_PARITY_MISSING');
});
test('future or invalid dates do not pass a runtime checkpoint',()=>{
 const v=make();v.asOfDate='2026-20-50';
 assert.equal(status(v),'STOP_RELEASE_BASELINE_INVALID');
});

test('R38 quarantined identity research can reach review only, never publish or alter approved B',()=>{
 const v=quarantined(),snapshot=structuredClone(v),result=assessR10ReleaseLineageGate(v);
 assert.equal(result.status,'REVIEW_PACKET_UNRESOLVED_PIT_SLOT_NOT_AUTOPROMOTABLE');
 assert.equal(result.canPromote,false);assert.equal(result.productionEligible,false);
 assert.deepEqual(result.unresolvedIdentitySymbols,['SKYD']);
 assert.equal(result.quarantinedOverlapDays,501);
 assert.equal(result.candidateScore,25);assert.equal(result.candidateBScore,30);
 for(const field of ['approvedInputWrites','releaseWrites','sqliteWrites','d1Writes','providerRequests'])
  assert.equal(result[field],0);
 assert.deepEqual(v,snapshot);
});
test('unverified R38 overlap proof cannot bypass strict PIT gate',()=>{
 const v=quarantined();delete v.identityQuarantineResearch;
 assert.equal(status(v),'STOP_TIME_EFFECTIVE_PIT_PROOF_MISSING');
});
test('quarantine never hides a second independent membership drift',()=>{
 const v=quarantined();v.pitProof.counts.other=1;
 assert.equal(status(v),'STOP_RESEARCH_QUARANTINE_LINEAGE_INVALID');
});
test('quarantine event digest and exact 501-day overlap must match original PIT audit',()=>{
 const v=quarantined();v.identityQuarantineResearch.officialPitDigest=J;
 assert.equal(status(v),'STOP_RESEARCH_QUARANTINE_LINEAGE_INVALID');
 v.identityQuarantineResearch.officialPitDigest=H;
 v.identityQuarantineResearch.quarantinedOverlapDays=500;
 assert.equal(status(v),'STOP_RESEARCH_QUARANTINE_LINEAGE_INVALID');
});
test('quarantined member is included in fixed denominator but not valid-price numerator',()=>{
 const v=quarantined();v.identityQuarantineResearch.candidateRows[0].valid200++;
 assert.equal(status(v),'STOP_RESEARCH_QUARANTINE_LINEAGE_INVALID');
 const x=quarantined();x.identityQuarantineResearch.candidateRows[0].unresolvedIdentityCount=0;
 assert.equal(status(x),'STOP_RESEARCH_QUARANTINE_LINEAGE_INVALID');
});
test('quarantine cannot make 97-percent coverage a completed quarter',()=>{
 const v=quarantined();v.quarterMaturity.months[0].validPriceWindowMembers=480;
 replay(v);v.calculationReplay.pitEventDigest=H;
 assert.equal(status(v),'STOP_B_200MA_252PAIR_THREE_MONTH_EVIDENCE');
});
test('quarantined PIT still needs the full 200-session and 252-pair monthly proofs',()=>{
 const v=quarantined();v.quarterMaturity.months[2].windowSessions=199;
 replay(v);v.calculationReplay.pitEventDigest=H;
 assert.equal(status(v),'STOP_B_200MA_252PAIR_THREE_MONTH_EVIDENCE');
 const w=quarantined();w.quarterMaturity.months[1].rankObservations=251;
 replay(w);w.calculationReplay.pitEventDigest=H;
 assert.equal(status(w),'STOP_B_200MA_252PAIR_THREE_MONTH_EVIDENCE');
});
test('quarantined PIT does not waive immutable Alpaca readback or independent price rights',()=>{
 const v=quarantined();v.researchReadback.status='NOT_CAPTURED';
 assert.equal(status(v),'STOP_IMMUTABLE_RESEARCH_READBACK_MISSING');
 const w=quarantined();w.priceBasisProof.manifestSha256=J;
 assert.equal(status(w),'STOP_PRICE_RIGHTS_OR_CORPORATE_ACTION_PROOF_MISSING');
});
test('quarantine result cannot promote with a forged independent score replay',()=>{
 const v=quarantined();v.calculationReplay.recomputedScore=26;
 assert.equal(status(v),'STOP_R10_FORMULA_REPLAY_OR_SCORE_PARITY_MISSING');
});
test('invalid optional quarantine receipt is never ignored behind otherwise strict PIT proof',()=>{
 const v=make();v.identityQuarantineResearch={status:'CANDIDATE_WITH_ONE_UNRESOLVED_SECURITY_RESEARCH_ONLY'};
 assert.equal(status(v),'STOP_RESEARCH_QUARANTINE_LINEAGE_INVALID');
});
