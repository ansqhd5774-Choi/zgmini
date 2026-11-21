import {createHash} from 'node:crypto';
import {isMarketSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';

// No filesystem, provider, SQLite, D1, or publication side effects. A verified
// research receipt is necessary evidence, NEVER authorization to replace an
// approved R10 input or score. The operator must independently review and
// install the separately validated input release through the approved PC path.
export const R10_RELEASE_HANDOFF_METHOD='ASSET_R10_RELEASE_LINEAGE_REVIEW_R1';
const SHA=/^[0-9a-f]{64}$/;
const QUARTER=/^(\d{4})-Q([1-4])$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stop=(status,extra={})=>({status,method:R10_RELEASE_HANDOFF_METHOD,
  canPromote:false,productionEligible:false,approvedInputWrites:0,releaseWrites:0,
  sqliteWrites:0,d1Writes:0,providerRequests:0,...extra});
const validQuarter=value=>typeof value==='string'&&QUARTER.test(value);
const validDate=value=>typeof value==='string'&&DATE.test(value)&&
  !Number.isNaN(Date.parse(value+'T00:00:00Z'))&&
  new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const quarterIndex=value=>Number(value.slice(0,4))*4+Number(value.at(-1));
function lastMarketSessionOfMonth(month){
 const [y,m]=month.split('-').map(Number);
 const end=new Date(Date.UTC(y,m,0));
 for(let i=0;i<10;i++){
  const date=end.toISOString().slice(0,10);
  if(isMarketSession(date)&&date!=='2025-01-09')return date;
  end.setUTCDate(end.getUTCDate()-1);
 }
 return null;
}

function canonicalBHistory(rows){
 if(!Array.isArray(rows)||!rows.length)return null;
 const quarters=new Map();
 for(const row of rows){
  if(!validQuarter(row?.quarter)||quarters.has(row.quarter)||
    (row.breadthDivergence!==null&&(!Number.isFinite(row.breadthDivergence)||
      row.breadthDivergence<0||row.breadthDivergence>100)))return null;
  quarters.set(row.quarter,row.breadthDivergence);
 }
 return quarters;
}

function scoredTrend(rows){
 if(!Array.isArray(rows)||!rows.length)return null;
 const quarters=new Map();let prior=-Infinity;
 for(const row of rows){
  if(!validQuarter(row?.quarter)||!Number.isFinite(row?.value)||
     row.value<0||row.value>100||quarterIndex(row.quarter)<=prior)return null;
  prior=quarterIndex(row.quarter);quarters.set(row.quarter,row.value);
 }
 return quarters;
}

function checkMatureQuarter(value,quarter,asOfDate){
 if(value?.quarter!==quarter||!Array.isArray(value.months)||value.months.length!==3)return false;
 const seen=new Set();
 for(const month of value.months){
  if(typeof month?.month!=='string'||!/^\d{4}-\d{2}$/.test(month.month)||
    seen.has(month.month)||`${month.month.slice(0,4)}-Q${Math.ceil(Number(month.month.slice(5))/3)}`!==quarter||
    month.month>=asOfDate.slice(0,7)||
    !validDate(month.lastExpectedSession)||!validDate(month.lastObservedSession)||
    month.lastExpectedSession!==lastMarketSessionOfMonth(month.month)||
    month.lastObservedSession!==month.lastExpectedSession||
    month.rankObservations<252||!Number.isInteger(month.rankObservations)||
    month.windowSessions!==200||!Number.isInteger(month.validPriceWindowMembers)||
    !Number.isInteger(month.memberCount)||month.memberCount<490||month.memberCount>520||
    month.validPriceWindowMembers>month.memberCount||
    month.validPriceWindowMembers/month.memberCount<.98||
    !Number.isFinite(month.researchSafetyScore)||month.researchSafetyScore<0||
    month.researchSafetyScore>100)return false;
  seen.add(month.month);
 }
 return true;
}

function existingHistoryUntouched(approved,candidate,priorQuarter){
 for(const [quarter,value] of approved){
  if(quarterIndex(quarter)>quarterIndex(priorQuarter))return false;
  if(!candidate.has(quarter)||candidate.get(quarter)!==value)return false;
 }
 return true;
}

// R38 may research an unpriced *slot*, not rename PSKY/SKYD or repair PIT.
// The original 500-ish member denominator is preserved. Such evidence can
// support a research review packet only, never a production promotion permit.
function quarantineLineageMatches(quarantine,pit,quarterMaturity){
 if(quarantine?.status!=='CANDIDATE_WITH_ONE_UNRESOLVED_SECURITY_RESEARCH_ONLY'||
    quarantine.canPromote!==false||quarantine.productionEligible!==false||
    quarantine.identityAuditStatus!=='PIT_LABEL_IDENTITY_AUDITED_NOT_PROMOTABLE'||
    !Array.isArray(quarantine.unresolvedSymbols)||
    quarantine.unresolvedSymbols.length!==1||quarantine.unresolvedSymbols[0]!=='SKYD'||
    !Array.isArray(quarantine.candidateRows)||quarantine.candidateRows.length<3||
    !Number.isInteger(quarantine.overlapChecked)||quarantine.overlapChecked<1||
    !Number.isInteger(quarantine.quarantinedOverlapDays)||quarantine.quarantinedOverlapDays<1||
    !SHA.test(quarantine.officialPitDigest??'')||
    pit?.status!=='PIT_LABEL_IDENTITY_AUDITED_NOT_PROMOTABLE'||
    !SHA.test(pit.sourceEventDigest??'')||
    !SHA.test(pit.approvedMemberSeriesHash??'')||
    !SHA.test(pit.officialMemberSeriesHash??'')||
    pit.sourceEventDigest!==quarantine.officialPitDigest||
    pit.overlapDays!==quarantine.overlapChecked||
    pit.counts?.other!==0||
    pit.counts.preMerger+pit.counts.backcast+pit.counts.postRename!==quarantine.quarantinedOverlapDays||
    pit.counts.preMerger+pit.counts.backcast+pit.counts.postRename<1)
  return false;

 const byDate=new Map();
 for(const row of quarantine.candidateRows){
  if(!validDate(row?.observationDate)||byDate.has(row.observationDate)||
     !Number.isInteger(row.memberCount)||row.memberCount<490||row.memberCount>520||
     !Number.isInteger(row.valid200)||row.valid200<0||row.valid200>=row.memberCount||
     row.unresolvedIdentityCount!==1||
     row.coverage!==row.valid200/row.memberCount||row.coverage<.98)
    return false;
  byDate.set(row.observationDate,row);
 }
 return quarterMaturity.months.every(month=>{
  const row=byDate.get(month.lastExpectedSession);
  return !!row&&row.memberCount===month.memberCount&&
    row.valid200===month.validPriceWindowMembers;
 });
}

/**
 * Verify lineage/replay evidence before even submitting a research candidate
 * for operator review. All proof objects are independently produced upstream.
 * A READY review packet remains explicitly NOT promotable by this function.
 */
export function assessR10ReleaseLineageGate({
  approvedRelease,candidateRelease,approvedBHistory,candidateBHistory,
  pitProof,researchReadback,priceBasisProof,calculationReplay,
  quarterMaturity,asOfDate,identityQuarantineResearch=null,
}={}){
 if(!validDate(asOfDate)||!validQuarter(approvedRelease?.scoreObservationQuarter)||
    !validQuarter(candidateRelease?.scoreObservationQuarter)||
    !validDate(approvedRelease?.asOfDate)||!validDate(candidateRelease?.asOfDate)||
    !Number.isFinite(approvedRelease?.score)||!Number.isFinite(candidateRelease?.score)||
    typeof approvedRelease?.sourceVersion!=='string'||!approvedRelease.sourceVersion||
    typeof candidateRelease?.sourceVersion!=='string'||!candidateRelease.sourceVersion||
    !Number.isFinite(approvedRelease?.sourceStoredAt)||
    !Number.isFinite(candidateRelease?.sourceStoredAt))
  return stop('STOP_RELEASE_BASELINE_INVALID');
 if(approvedRelease.methodologyVersion!=='ASSET_BUBBLE_R10_CANDIDATE'||
    candidateRelease.methodologyVersion!==approvedRelease.methodologyVersion||
    approvedRelease.historyMode!=='CURRENT_VINTAGE_ONLY'||
    candidateRelease.historyMode!==approvedRelease.historyMode||
    candidateRelease.lookAheadSafe!==false||
    candidateRelease.publicationPolicy!==approvedRelease.publicationPolicy||
    candidateRelease.rightsStatus!==approvedRelease.rightsStatus)
  return stop('STOP_R10_APPROVED_CONTRACT_DRIFT');
 const approved=canonicalBHistory(approvedBHistory),candidate=canonicalBHistory(candidateBHistory);
 if(!approved||!candidate)return stop('STOP_B_HISTORY_INVALID');
 if(approved.get('2025-Q2')!==null||approved.get('2025-Q3')!==null||
    candidate.get('2025-Q2')!==null||candidate.get('2025-Q3')!==null)
  return stop('STOP_APPROVED_EARLY_B_NULL_REWRITTEN');
 if(!existingHistoryUntouched(approved,candidate,approvedRelease.scoreObservationQuarter))
  return stop('STOP_APPROVED_B_HISTORY_REWRITTEN');
 const previousScores=scoredTrend(approvedRelease.trend),nextScores=scoredTrend(candidateRelease.trend);
 if(!previousScores||!nextScores||
    previousScores.get(approvedRelease.scoreObservationQuarter)!==approvedRelease.score||
    nextScores.get(candidateRelease.scoreObservationQuarter)!==candidateRelease.score||
    !existingHistoryUntouched(previousScores,nextScores,approvedRelease.scoreObservationQuarter))
  return stop('STOP_APPROVED_SCORE_TREND_REWRITTEN');
 if(candidateRelease.sourceStoredAt<approvedRelease.sourceStoredAt||
    candidateRelease.asOfDate<approvedRelease.asOfDate||
    candidateRelease.asOfDate>asOfDate)
  return stop('STOP_RELEASE_CHECKPOINT_REGRESSION');
 const previousQ=quarterIndex(approvedRelease.scoreObservationQuarter);
 const nextQ=quarterIndex(candidateRelease.scoreObservationQuarter);
 if(nextQ<previousQ)return stop('STOP_RELEASE_QUARTER_REGRESSION');
 if(nextQ===previousQ)return stop('NO_NEW_COMPLETED_QUARTER',{
  score:approvedRelease.score,quarter:approvedRelease.scoreObservationQuarter});
 if(nextQ!==previousQ+1)return stop('STOP_UNRECONCILED_QUARTER_GAP');
 if(candidateRelease.sourceVersion===approvedRelease.sourceVersion||
    candidateRelease.sourceStoredAt===approvedRelease.sourceStoredAt)
  return stop('STOP_UNCHANGED_RELEASE_LINEAGE_CHECKPOINT');
 const q=candidateRelease.scoreObservationQuarter;
 if(!candidate.has(q)||candidate.get(q)===null)
  return stop('STOP_NEW_B_QUARTER_MISSING');
 if(!checkMatureQuarter(quarterMaturity,q,asOfDate))
  return stop('STOP_B_200MA_252PAIR_THREE_MONTH_EVIDENCE');
 const average=quarterMaturity.months.reduce((n,m)=>n+m.researchSafetyScore,0)/3;
 if(Math.abs(average-candidate.get(q))>1e-9)
  return stop('STOP_B_QUARTER_ARITHMETIC_PARITY');
 const strictPit=pitProof?.status==='PIT_TIME_EFFECTIVE_IDENTITIES_VERIFIED'&&
    SHA.test(pitProof.eventDigest??'')&&SHA.test(pitProof.memberSeriesDigest??'')&&
    pitProof.membershipLookAheadSafe===true;
 const quarantinedPit=identityQuarantineResearch!==null&&
    quarantineLineageMatches(identityQuarantineResearch,pitProof,quarterMaturity);
 // Never silently discard an explicitly submitted (possibly forged)
 // quarantine receipt, even if a separate strict PIT proof is present.
 if(identityQuarantineResearch!==null&&!quarantinedPit)
  return stop('STOP_RESEARCH_QUARANTINE_LINEAGE_INVALID');
 if(!strictPit&&!quarantinedPit)
  return stop('STOP_TIME_EFFECTIVE_PIT_PROOF_MISSING');
 const pitEventDigest=strictPit?pitProof.eventDigest:pitProof.sourceEventDigest;
 if(researchReadback?.status!=='STAGED_RESEARCH_READBACK_VERIFIED_NOT_PROMOTABLE'||
    researchReadback.canPromote!==false||researchReadback.productionEligible!==false||
    !SHA.test(researchReadback.planAuditDigest??'')||
    !SHA.test(researchReadback.manifestSha256??'')||
    !Array.isArray(researchReadback.capturedSymbols)||
    !researchReadback.capturedSymbols.length)
  return stop('STOP_IMMUTABLE_RESEARCH_READBACK_MISSING');
 if(priceBasisProof?.status!=='PRICE_BASIS_AND_RIGHTS_INDEPENDENTLY_REVIEWED'||
    priceBasisProof.planAuditDigest!==researchReadback.planAuditDigest||
    priceBasisProof.manifestSha256!==researchReadback.manifestSha256||
    priceBasisProof.pitEventDigest!==pitEventDigest||
    !SHA.test(priceBasisProof.rightsEvidenceSha256??'')||
    !SHA.test(priceBasisProof.corporateActionPriceBasisSha256??''))
  return stop('STOP_PRICE_RIGHTS_OR_CORPORATE_ACTION_PROOF_MISSING');
 const replayBody={candidateRelease,candidateBHistory,quarterMaturity};
 if(calculationReplay?.status!=='R10_APPROVED_FORMULA_REPLAY_INDEPENDENTLY_VERIFIED'||
    calculationReplay.candidateDigest!==fingerprint(replayBody)||
    calculationReplay.pitEventDigest!==pitEventDigest||
    calculationReplay.manifestSha256!==researchReadback.manifestSha256||
    calculationReplay.recomputedScore!==candidateRelease.score||
    calculationReplay.recomputedBScore!==candidate.get(q))
  return stop('STOP_R10_FORMULA_REPLAY_OR_SCORE_PARITY_MISSING');
 // Deliberate boundary: this audit cannot authorize an installation, provider
 // collection, replacement of the approved three B files, or D1 publication.
 return stop(quarantinedPit?'REVIEW_PACKET_UNRESOLVED_PIT_SLOT_NOT_AUTOPROMOTABLE':
   'REVIEW_PACKET_READY_NOT_AUTOPROMOTABLE',{
  approvedQuarter:approvedRelease.scoreObservationQuarter,candidateQuarter:q,
  candidateScore:candidateRelease.score,candidateBScore:candidate.get(q),
  sourceVersion:candidateRelease.sourceVersion,
  researchManifestSha256:researchReadback.manifestSha256,
  candidateDigest:fingerprint(replayBody),
  ...(quarantinedPit?{unresolvedIdentitySymbols:identityQuarantineResearch.unresolvedSymbols,
    quarantinedOverlapDays:identityQuarantineResearch.quarantinedOverlapDays,
    nextAction:'VERIFY_UNRESOLVED_PIT_SLOT_AND_APPROVED_PRICE_RIGHTS_BEFORE_PC_INSTALL'}:
   {nextAction:'INDEPENDENT_OPERATOR_REVIEW_AND_APPROVED_PC_INSTALL_REQUIRED'}),
 });
}
