import {createHash} from 'node:crypto';
import {assessR10ReleaseLineageGate} from './asset-r10-release-lineage-gate-r1.mjs';

// Bridge between the scheduled R7 PIT/Alpaca evidence and the separately
// approved R10 B monthly/quarterly calculation. This module NEVER fabricates
// the missing B rows, installs sources, or modifies any publication input.
// A verified upstream receipt is not proof of its own authenticity: independent
// 501-session PIT/rights/formula reviews remain mandatory and operator-owned.
export const R10_B_INPUT_BRIDGE_METHOD='ASSET_R10_B_INPUT_READONLY_BRIDGE_R1';
const SHA=/^[a-f0-9]{64}$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validDate=value=>typeof value==='string'&&DATE.test(value)&&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`))&&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;
const result=(status,extra={})=>({method:R10_B_INPUT_BRIDGE_METHOD,status,
  readOnly:true,canPromote:false,productionEligible:false,
  providerCalls:0,approvedInputWrites:0,sqliteWrites:0,releaseWrites:0,
  d1Reads:0,d1Writes:0,taskChanges:0,lockPidActions:0,...extra});

function freshProspectiveEvidence(pc,asOfDate){
 const pit=pc?.pitRefreshEvidence;
 if(pit?.sqliteStatus!=='DATE_VERIFIED_READONLY'||
    !validDate(pit?.sqliteUniverseDate)||
    pit.sqliteUniverseDate!==pit.officialPitCurrentDate||
    pit.sqliteUniverseDate>asOfDate||
    pit.latestProspectiveStatus!=='PASS'||
    !Number.isFinite(Date.parse(pit.latestProspectiveAt??''))||
    typeof pit.latestRunPitRefreshed!=='boolean')return false;
 const at=Date.parse(pit.latestProspectiveAt);
 const asOfEnd=Date.parse(`${asOfDate}T23:59:59Z`);
 // This is a bounded recent receipt, not a claim of a live 5-minute task.
 return at<=asOfEnd&&asOfEnd-at<=48*60*60*1000;
}

function pcProofShape(pc){
 const e=pc?.evidence;
 return pc?.revision==='ASSET_R10_PIT_QUARANTINE_PC_READONLY_R1'&&
  pc?.status==='CANDIDATE_WITH_ONE_UNRESOLVED_SECURITY_RESEARCH_ONLY'&&
  pc.readOnly===true&&pc.canPromote===false&&
  pc.productionEligible===false&&pc.providerCalls===0&&
  pc.pcInputWrites===0&&pc.sqliteWrites===0&&pc.d1Writes===0&&
  pc.coreTaskChanges===0&&pc.lockPidActions===0&&
  SHA.test(pc.officialPitDigest??'')&&
  SHA.test(e?.approvedPitSha256??'')&&SHA.test(e?.officialPitSha256??'')&&
  SHA.test(e?.baseGroupsSha256??'')&&SHA.test(e?.incrementalGroupsSha256??'')&&
  Number.isInteger(e?.baseGroupCount)&&e.baseGroupCount>0&&
  Number.isInteger(e?.incrementalGroupCount)&&e.incrementalGroupCount>=0&&
  Number.isInteger(pc.overlapChecked)&&pc.overlapChecked>=1;
}

/**
 * A read-only *review packet* boundary, not an input conversion or promotion.
 * `pit501Proof` must come from an independent daily source audit, not from
 * the candidate itself. The release gate then checks approved quarter history,
 * 200-session/252-pair/98%-coverage/three-month maturity, Alpaca raw readback,
 * corporate-action rights and independent score replay.
 */
export function assessR10BInputBridgeReadOnly({pcPreflight,pit501Proof,
 releaseEvidence,asOfDate}={}){
 if(!validDate(asOfDate))return result('STOP_BRIDGE_ASOF_DATE_INVALID');
 if(!pcProofShape(pcPreflight))
  return result('STOP_PC_R38_RESEARCH_RECEIPT_MISSING_OR_INVALID');
 if(!freshProspectiveEvidence(pcPreflight,asOfDate))
  return result('STOP_PC_R7_LATEST_RUN_OR_SQLITE_PIT_DATE_UNVERIFIED');
 const e=pcPreflight.evidence;
 if(pit501Proof?.status!=='PIT_501_SESSION_SOURCE_VERIFIED_INDEPENDENT'||
    pit501Proof.sessionCount!==501||
    !validDate(pit501Proof.firstTradeDate)||
    pit501Proof.lastTradeDate!==pcPreflight.pitRefreshEvidence.sqliteUniverseDate||
    pit501Proof.firstTradeDate>=pit501Proof.lastTradeDate||
    pit501Proof.approvedPitSha256!==e.approvedPitSha256||
    pit501Proof.officialPitSha256!==e.officialPitSha256||
    pit501Proof.officialPitEventDigest!==pcPreflight.officialPitDigest||
    pit501Proof.otherMembershipDrift!==0||
    pit501Proof.symbolSubstitutionOccurred!==false)
  return result('STOP_INDEPENDENT_501_SESSION_PIT_SOURCE_AUDIT_MISSING',{
   missingGate:'INDEPENDENT_SOURCE_DAY_BY_DAY_501_PIT_IDENTITY'});
 if(!releaseEvidence||typeof releaseEvidence!=='object'||
    releaseEvidence.asOfDate!==asOfDate||
    Object.hasOwn(releaseEvidence,'identityQuarantineResearch'))
  return result('STOP_RELEASE_BRIDGE_EVIDENCE_SCOPE_INVALID');
 // The caller cannot submit a second, altered quarantine receipt. Its sole
 // source is the current read-only PC snapshot checked above.
 const assessed=assessR10ReleaseLineageGate({
  ...releaseEvidence,asOfDate,identityQuarantineResearch:pcPreflight,
 });
 if(assessed.status!=='REVIEW_PACKET_UNRESOLVED_PIT_SLOT_NOT_AUTOPROMOTABLE')
  return result('STOP_R10_B_APPROVED_LINEAGE_GATE',{
   firstFail:assessed.status,
   missingGate:'APPROVED_B_MONTHLY_FORMULA_PIT_PRICE_RIGHTS_SCORE_REPLAY',
  });
 return result('B_INPUT_REVIEW_PACKET_READY_NOT_AUTOPROMOTABLE',{
  candidateQuarter:assessed.candidateQuarter,
  candidateScore:assessed.candidateScore,
  candidateBScore:assessed.candidateBScore,
  unresolvedIdentitySymbols:assessed.unresolvedIdentitySymbols,
  pitCurrentDate:pcPreflight.pitRefreshEvidence.sqliteUniverseDate,
  sourceWitnessDigest:digest({approvedPitSha256:e.approvedPitSha256,
   officialPitSha256:e.officialPitSha256,baseGroupsSha256:e.baseGroupsSha256,
   incrementalGroupsSha256:e.incrementalGroupsSha256,
   officialPitEventDigest:pcPreflight.officialPitDigest,
   pit501Proof,releaseReviewDigest:assessed.candidateDigest}),
  nextGate:'OPERATOR_REVIEW_OF_REAL_PC_501_DAY_SOURCES_AND_APPROVED_INSTALL',
 });
}
