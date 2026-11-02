import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {assessR10BInputBridgeReadOnly} from '../scripts/pc-writer/asset-r10-b-input-bridge-readonly-r1.mjs';

const H='a'.repeat(64),J='b'.repeat(64),K='c'.repeat(64),L='d'.repeat(64);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const approvedB=[
 {quarter:'2025-Q2',breadthDivergence:null},
 {quarter:'2025-Q3',breadthDivergence:null},
 {quarter:'2025-Q4',breadthDivergence:19},
 {quarter:'2026-Q1',breadthDivergence:20},
 {quarter:'2026-Q2',breadthDivergence:21},
];

function fixture(){
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
 const quarterMaturity={quarter:'2026-Q3',months:[
  {month:'2026-07',lastExpectedSession:'2026-07-31',lastObservedSession:'2026-07-31',
   rankObservations:278,windowSessions:200,validPriceWindowMembers:495,memberCount:503,researchSafetyScore:20},
  {month:'2026-08',lastExpectedSession:'2026-08-31',lastObservedSession:'2026-08-31',
   rankObservations:279,windowSessions:200,validPriceWindowMembers:496,memberCount:503,researchSafetyScore:30},
  {month:'2026-09',lastExpectedSession:'2026-09-30',lastObservedSession:'2026-09-30',
   rankObservations:280,windowSessions:200,validPriceWindowMembers:497,memberCount:503,researchSafetyScore:40},
 ]};
 const pcPreflight={revision:'ASSET_R10_PIT_QUARANTINE_PC_READONLY_R1',
  status:'CANDIDATE_WITH_ONE_UNRESOLVED_SECURITY_RESEARCH_ONLY',
  readOnly:true,canPromote:false,productionEligible:false,providerCalls:0,
  pcInputWrites:0,sqliteWrites:0,d1Writes:0,coreTaskChanges:0,lockPidActions:0,
  officialPitDigest:H,overlapChecked:501,quarantinedOverlapDays:501,
  identityAuditStatus:'PIT_LABEL_IDENTITY_AUDITED_NOT_PROMOTABLE',
  unresolvedSymbols:['SKYD'],
  evidence:{approvedPitSha256:J,officialPitSha256:K,
   baseGroupsSha256:L,incrementalGroupsSha256:L,
   baseGroupCount:1,incrementalGroupCount:1},
  pitRefreshEvidence:{sqliteStatus:'DATE_VERIFIED_READONLY',
   sqliteUniverseDate:'2026-10-30',officialPitCurrentDate:'2026-10-30',
   latestProspectiveStatus:'PASS',latestProspectiveAt:'2026-11-02T05:00:00.000Z',
   latestRunPitRefreshed:true},
  candidateRows:quarterMaturity.months.map(m=>({observationDate:m.lastExpectedSession,
   memberCount:m.memberCount,valid200:m.validPriceWindowMembers,
   coverage:m.validPriceWindowMembers/m.memberCount,unresolvedIdentityCount:1}))};
 const pit501Proof={status:'PIT_501_SESSION_SOURCE_VERIFIED_INDEPENDENT',
  sessionCount:501,firstTradeDate:'2024-10-30',lastTradeDate:'2026-10-30',
  approvedPitSha256:J,officialPitSha256:K,officialPitEventDigest:H,
  otherMembershipDrift:0,symbolSubstitutionOccurred:false};
 const pitProof={status:'PIT_LABEL_IDENTITY_AUDITED_NOT_PROMOTABLE',
  sourceEventDigest:H,approvedMemberSeriesHash:J,officialMemberSeriesHash:K,
  overlapDays:501,counts:{preMerger:200,backcast:301,postRename:0,exact:0,other:0}};
 const researchReadback={status:'STAGED_RESEARCH_READBACK_VERIFIED_NOT_PROMOTABLE',
  canPromote:false,productionEligible:false,planAuditDigest:L,
  manifestSha256:H,capturedSymbols:['SKYD']};
 const priceBasisProof={status:'PRICE_BASIS_AND_RIGHTS_INDEPENDENTLY_REVIEWED',
  planAuditDigest:L,manifestSha256:H,pitEventDigest:H,
  rightsEvidenceSha256:J,corporateActionPriceBasisSha256:K};
 const releaseEvidence={approvedRelease,candidateRelease,
  approvedBHistory:structuredClone(approvedB),
  candidateBHistory:[...structuredClone(approvedB),
   {quarter:'2026-Q3',breadthDivergence:30}],
  quarterMaturity,pitProof,researchReadback,priceBasisProof,
  asOfDate:'2026-11-02'};
 refreshReplay(releaseEvidence);
 return {pcPreflight,pit501Proof,releaseEvidence,asOfDate:'2026-11-02'};
}
function refreshReplay(e){
 e.calculationReplay={status:'R10_APPROVED_FORMULA_REPLAY_INDEPENDENTLY_VERIFIED',
  candidateDigest:hash({candidateRelease:e.candidateRelease,
   candidateBHistory:e.candidateBHistory,quarterMaturity:e.quarterMaturity}),
  pitEventDigest:e.pitProof.sourceEventDigest,
  manifestSha256:e.researchReadback.manifestSha256,
  recomputedScore:e.candidateRelease.score,
  recomputedBScore:e.candidateBHistory.at(-1).breadthDivergence};
}
const assess=x=>assessR10BInputBridgeReadOnly(x);
const status=x=>assess(x).status;

test('full independently reviewed R7-to-R10 B packet remains research-only and immutable',()=>{
 const input=fixture(),prior=structuredClone(input);
 const result=assess(input);
 assert.equal(result.status,'B_INPUT_REVIEW_PACKET_READY_NOT_AUTOPROMOTABLE');
 assert.equal(result.candidateQuarter,'2026-Q3');
 assert.equal(result.candidateBScore,30);
 assert.deepEqual(result.unresolvedIdentitySymbols,['SKYD']);
 assert.match(result.sourceWitnessDigest,/^[a-f0-9]{64}$/);
 assert.equal(result.canPromote,false);
 assert.equal(result.productionEligible,false);
 assert.equal(result.readOnly,true);
 for(const field of ['providerCalls','approvedInputWrites','sqliteWrites','releaseWrites',
  'd1Reads','d1Writes','taskChanges','lockPidActions'])assert.equal(result[field],0);
 assert.deepEqual(input,prior);
 assert.deepEqual(assess(input),result);
});

test('no verified actual PC R38 candidate is always a STOP',()=>{
 const x=fixture();x.pcPreflight.status='PIT_OVERLAP_MEMBERSHIP_DRIFT';
 assert.equal(status(x),'STOP_PC_R38_RESEARCH_RECEIPT_MISSING_OR_INVALID');
 const y=fixture();y.pcPreflight.canPromote=true;
 assert.equal(status(y),'STOP_PC_R38_RESEARCH_RECEIPT_MISSING_OR_INVALID');
});
test('receipt with missing grouped price SHA or forged write count is rejected',()=>{
 const x=fixture();delete x.pcPreflight.evidence.incrementalGroupsSha256;
 assert.equal(status(x),'STOP_PC_R38_RESEARCH_RECEIPT_MISSING_OR_INVALID');
 const y=fixture();y.pcPreflight.sqliteWrites=1;
 assert.equal(status(y),'STOP_PC_R38_RESEARCH_RECEIPT_MISSING_OR_INVALID');
});
test('R7 prospective must be a recent actual PASS and match read-only SQLite PIT date',()=>{
 const x=fixture();x.pcPreflight.pitRefreshEvidence.latestProspectiveStatus='WAITING_PIT_UNIVERSE';
 assert.equal(status(x),'STOP_PC_R7_LATEST_RUN_OR_SQLITE_PIT_DATE_UNVERIFIED');
 const y=fixture();y.pcPreflight.pitRefreshEvidence.officialPitCurrentDate='2026-10-29';
 assert.equal(status(y),'STOP_PC_R7_LATEST_RUN_OR_SQLITE_PIT_DATE_UNVERIFIED');
 const z=fixture();z.pcPreflight.pitRefreshEvidence.latestProspectiveAt='2026-10-25T05:00:00.000Z';
 assert.equal(status(z),'STOP_PC_R7_LATEST_RUN_OR_SQLITE_PIT_DATE_UNVERIFIED');
});
test('a prior R7 success with unknown refresh flag does not assert natural Core execution',()=>{
 const x=fixture();x.pcPreflight.pitRefreshEvidence.latestRunPitRefreshed=null;
 assert.equal(status(x),'STOP_PC_R7_LATEST_RUN_OR_SQLITE_PIT_DATE_UNVERIFIED');
});
test('candidate cannot invent independent 501-day PIT source or substitute a security',()=>{
 const x=fixture();delete x.pit501Proof;
 assert.equal(status(x),'STOP_INDEPENDENT_501_SESSION_PIT_SOURCE_AUDIT_MISSING');
 const y=fixture();y.pit501Proof.symbolSubstitutionOccurred=true;
 assert.equal(status(y),'STOP_INDEPENDENT_501_SESSION_PIT_SOURCE_AUDIT_MISSING');
 const z=fixture();z.pit501Proof.sessionCount=500;
 assert.equal(status(z),'STOP_INDEPENDENT_501_SESSION_PIT_SOURCE_AUDIT_MISSING');
});
test('501-session proof must bind to actual PC PIT bytes and R7 event digest',()=>{
 const x=fixture();x.pit501Proof.approvedPitSha256=H;
 assert.equal(status(x),'STOP_INDEPENDENT_501_SESSION_PIT_SOURCE_AUDIT_MISSING');
 const y=fixture();y.pit501Proof.officialPitEventDigest=L;
 assert.equal(status(y),'STOP_INDEPENDENT_501_SESSION_PIT_SOURCE_AUDIT_MISSING');
 const z=fixture();z.pit501Proof.otherMembershipDrift=1;
 assert.equal(status(z),'STOP_INDEPENDENT_501_SESSION_PIT_SOURCE_AUDIT_MISSING');
});
test('caller cannot replace quarantined PIT receipt with arbitrary Release research data',()=>{
 const x=fixture();x.releaseEvidence.identityQuarantineResearch={status:'PASS'};
 assert.equal(status(x),'STOP_RELEASE_BRIDGE_EVIDENCE_SCOPE_INVALID');
 const y=fixture();y.releaseEvidence.asOfDate='2026-11-01';
 assert.equal(status(y),'STOP_RELEASE_BRIDGE_EVIDENCE_SCOPE_INVALID');
});
test('early Q2/Q3 null and prior B history remain immutable',()=>{
 const x=fixture();x.releaseEvidence.candidateBHistory[0].breadthDivergence=22;
 refreshReplay(x.releaseEvidence);
 const r=assess(x);
 assert.equal(r.status,'STOP_R10_B_APPROVED_LINEAGE_GATE');
 assert.equal(r.firstFail,'STOP_APPROVED_EARLY_B_NULL_REWRITTEN');
});
test('200 actual sessions, 252 observations, 98% denominator, 3 complete months remain required',()=>{
 const x=fixture();x.releaseEvidence.quarterMaturity.months[0].windowSessions=199;
 refreshReplay(x.releaseEvidence);
 assert.equal(assess(x).firstFail,'STOP_B_200MA_252PAIR_THREE_MONTH_EVIDENCE');
 const y=fixture();y.releaseEvidence.quarterMaturity.months[2].rankObservations=251;
 refreshReplay(y.releaseEvidence);
 assert.equal(assess(y).firstFail,'STOP_B_200MA_252PAIR_THREE_MONTH_EVIDENCE');
 const z=fixture();z.releaseEvidence.quarterMaturity.months[1].validPriceWindowMembers=490;
 refreshReplay(z.releaseEvidence);
 assert.equal(assess(z).firstFail,'STOP_B_200MA_252PAIR_THREE_MONTH_EVIDENCE');
});
test('missing real Alpaca rights evidence or wrong corporate-action basis blocks handoff',()=>{
 const x=fixture();x.releaseEvidence.priceBasisProof.rightsEvidenceSha256=null;
 assert.equal(assess(x).firstFail,'STOP_PRICE_RIGHTS_OR_CORPORATE_ACTION_PROOF_MISSING');
 const y=fixture();y.releaseEvidence.priceBasisProof.corporateActionPriceBasisSha256=null;
 assert.equal(assess(y).firstFail,'STOP_PRICE_RIGHTS_OR_CORPORATE_ACTION_PROOF_MISSING');
});
test('independent replay cannot be a relabeled unverified number',()=>{
 const x=fixture();x.releaseEvidence.calculationReplay.recomputedScore=24.9;
 assert.equal(assess(x).firstFail,'STOP_R10_FORMULA_REPLAY_OR_SCORE_PARITY_MISSING');
});
