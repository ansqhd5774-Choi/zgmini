import {isReadyEarningsE1R5} from '../market-score/earnings-e1-r5-production-domain.mjs';
import {isValidatedPaidBreadthDomain} from '../../worker/breadth-paid-contract.mjs';

// Future D05 event selection evidence, not an independent input proof.
// A complete PIT lineage also requires raw SEC/BEA/BLS acquisition/release
// checkpoints, the actual market batch use decision, and archive/D1 readback.
// No provider, filesystem, DB access, data publication or scoring mutation.
const SHA256=/^[a-f0-9]{64}$/;
const unproven=code=>Object.freeze({status:'UNPROVEN',code});
const safeSha=x=>typeof x==='string'&&SHA256.test(x)?x:null;

export function observeD05EarningsR5Selection({candidate,report,mergedInputs}={}){
 if(!isReadyEarningsE1R5(candidate)||
  mergedInputs?.external?.publicDomainScores?.earnings!==candidate)
  return unproven('E1_R5_NOT_SELECTED');
 // The R5 inputFingerprint is derived from source file metadata and an
 // issuer universe descriptor. It is NOT the hash of the original SEC facts.
 const digest=safeSha(candidate.inputFingerprint),receipt=safeSha(report?.inputFingerprint);
 if(!digest||!receipt||digest!==receipt||
  !['UPDATED','NOOP'].includes(report?.status))
  return unproven('E1_R5_INPUT_DESCRIPTOR_UNVERIFIED');
 return Object.freeze({
  status:'COLLECT_INPUT_SELECTED_ONLY',
  methodologyVersion:'E1-R5',inputDescriptorFingerprint:digest,
  selectionEvidence:'REFERENCE_IDENTITY_AT_COLLECT_INPUT_MERGE',
  inputDescriptorScope:'LOCAL_FILE_METADATA_AND_UNIVERSE_NOT_RAW_SHA',
  candidateReused:report.status==='NOOP',
  originalSecReleasePITVerified:false,
 });
}

export function observeD05PaidBreadthSelection(domain){
 if(!isValidatedPaidBreadthDomain(domain))
  return unproven('PAID_BREADTH_NOT_VALIDATED');
 const p=domain.paidSource;
 // These digests come from an already validated local derived publication;
 // no claim is made that each upstream row has its PIT availability clock.
 return Object.freeze({
  status:'VALIDATED_DERIVED_DOMAIN_SELECTED_ONLY',
  methodologyVersion:domain.methodologyVersion,
  sourceVersion:p.sourceVersion,pitSha256:p.pitSha256,
  inputSha256:Object.freeze([...p.inputSha256]),
  observationDate:p.observationDate,
  selectionEvidence:'VALIDATED_PAID_DERIVED_READER_RETURN',
  rawSourcePITVerified:false,
 });
}

function sameEarningsOutput(candidate,final){
 return final?.id==='earnings'&&final.status==='READY'&&
  final.methodologyVersion==='E1-R5'&&
  final.score===candidate?.score&&
  typeof candidate?.sourceVersion==='string'&&candidate.sourceVersion.length>0&&
  typeof candidate?.asOfDate==='string'&&/^20\d\d-\d\d-\d\d$/.test(candidate.asOfDate)&&
  final.sourceVersion===candidate.sourceVersion&&
  final.asOfDate===candidate.asOfDate;
}

function sameBreadthOutput(selected,final){
 return isValidatedPaidBreadthDomain(final)&&
  final.score===selected?.score&&
  final.methodologyVersion===selected?.methodologyVersion&&
  final.paidSource?.sourceVersion===selected?.paidSource?.sourceVersion&&
  final.paidSource?.pitSha256===selected?.paidSource?.pitSha256&&
  JSON.stringify(final.paidSource?.inputSha256)===JSON.stringify(selected?.paidSource?.inputSha256);
}

// Called only after the existing market scorer has produced a valid result.
// This correlates already selected domain outputs without re-reading inputs.
export function correlateD05IndependentInputs({earningsWitness,breadthWitness,
 earningsCandidate,breadthSelected,marketBody}={}){
 const domains=Array.isArray(marketBody?.domains)?marketBody.domains:[];
 const earnings=domains.filter(x=>x?.id==='earnings'),breadth=domains.filter(x=>x?.id==='breadth');
 const earningsOutputMatched=earnings.length===1&&
  earningsWitness?.status==='COLLECT_INPUT_SELECTED_ONLY'&&
  sameEarningsOutput(earningsCandidate,earnings[0]);
 const breadthOutputMatched=breadth.length===1&&
  breadthWitness?.status==='VALIDATED_DERIVED_DOMAIN_SELECTED_ONLY'&&
  sameBreadthOutput(breadthSelected,breadth[0]);
 return Object.freeze({
  status:'PARTIAL_INDEPENDENT_SELECTION_ONLY',
  earnings:earningsWitness??unproven('E1_R5_WITNESS_MISSING'),
  breadth:breadthWitness??unproven('PAID_BREADTH_WITNESS_MISSING'),
  earningsOutputMatched,breadthOutputMatched,
  // Output correlation alone does not establish the raw input release clock.
  bothDomainsOutputMatched:earningsOutputMatched&&breadthOutputMatched,
  rawSecPITVerified:false,rawBreadthPITVerified:false,
  effectiveUseVerified:false,completeD05InputLineage:false,publicD1Verified:false,
 });
}
