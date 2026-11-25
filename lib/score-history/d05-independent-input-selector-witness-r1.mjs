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

const day=value=>typeof value==='string'&&/^20\d\d-\d\d-\d\d$/.test(value)&&
 Number.isFinite(Date.parse(value+'T00:00:00Z'))&&
 new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const utcDay=value=>typeof value==='string'&&/^20\d\d-\d\d-\d\dT/.test(value)&&
 Number.isFinite(Date.parse(value))?value.slice(0,10):null;

/**
 * Optional same-calculation **selection** metadata for NEW private D05 events.
 * It is deliberately NOT a raw SEC/Breadth PIT or full input-use attestation.
 * Return null unless both existing selector outputs match the scored domains.
 */
export function projectD05IndependentLocalReceipt(e,calculatedAt){
 const marketDate=utcDay(calculatedAt);
 const r=e?.earnings,b=e?.breadth;
 if(!marketDate||e?.status!=='PARTIAL_INDEPENDENT_SELECTION_ONLY'||
  e.earningsOutputMatched!==true||e.breadthOutputMatched!==true||
  e.bothDomainsOutputMatched!==true||
  e.rawSecPITVerified!==false||e.rawBreadthPITVerified!==false||
  e.completeD05InputLineage!==false||e.publicD1Verified!==false||
  r?.status!=='COLLECT_INPUT_SELECTED_ONLY'||r.methodologyVersion!=='E1-R5'||
  r.inputDescriptorScope!=='LOCAL_FILE_METADATA_AND_UNIVERSE_NOT_RAW_SHA'||
  r.selectionEvidence!=='REFERENCE_IDENTITY_AT_COLLECT_INPUT_MERGE'||
  r.originalSecReleasePITVerified!==false||
  typeof r.candidateReused!=='boolean'||!safeSha(r.inputDescriptorFingerprint)||
  b?.status!=='VALIDATED_DERIVED_DOMAIN_SELECTED_ONLY'||
  b.selectionEvidence!=='VALIDATED_PAID_DERIVED_READER_RETURN'||
  b.rawSourcePITVerified!==false||
  !safeSha(b.sourceVersion)||!safeSha(b.pitSha256)||
  !Array.isArray(b.inputSha256)||![1,3].includes(b.inputSha256.length)||
  !b.inputSha256.every(safeSha)||!day(b.observationDate)||
  b.observationDate>marketDate||typeof b.methodologyVersion!=='string'||
  b.methodologyVersion!=='B1-R5-STORED-BREADTH-4FACTOR-EMA3-R2')return null;
 return Object.freeze({
  status:'D05_INDEPENDENT_SOURCE_SELECTION_PARTIAL_LOCAL_V1',
  earnings:Object.freeze({methodologyVersion:'E1-R5',
   inputDescriptorFingerprint:r.inputDescriptorFingerprint,
   inputDescriptorScope:'LOCAL_FILE_METADATA_AND_UNIVERSE_NOT_RAW_SHA',
   candidateReused:r.candidateReused}),
  breadth:Object.freeze({methodologyVersion:b.methodologyVersion,
   sourceVersion:b.sourceVersion,pitSha256:b.pitSha256,
   inputSha256:Object.freeze([...b.inputSha256]),observationDate:b.observationDate}),
  rawSecPITVerified:false,rawBreadthPITVerified:false,
  effectiveUseVerified:false,completeD05InputLineage:false,publicD1Verified:false,
 });
}

/** Revalidate a stored partial receipt; never accept unknown persisted keys. */
export function verifyD05IndependentLocalReceipt(input,calculatedAt){
 if(input?.status!=='D05_INDEPENDENT_SOURCE_SELECTION_PARTIAL_LOCAL_V1'||
  input.rawSecPITVerified!==false||input.rawBreadthPITVerified!==false||
  input.effectiveUseVerified!==false||input.completeD05InputLineage!==false||
  input.publicD1Verified!==false)return null;
 const e=input.earnings,b=input.breadth;
 const fresh=projectD05IndependentLocalReceipt({
  status:'PARTIAL_INDEPENDENT_SELECTION_ONLY',
  earningsOutputMatched:true,breadthOutputMatched:true,bothDomainsOutputMatched:true,
  rawSecPITVerified:false,rawBreadthPITVerified:false,
  completeD05InputLineage:false,publicD1Verified:false,
  earnings:{status:'COLLECT_INPUT_SELECTED_ONLY',
   methodologyVersion:e?.methodologyVersion,
   inputDescriptorFingerprint:e?.inputDescriptorFingerprint,
   inputDescriptorScope:e?.inputDescriptorScope,
   selectionEvidence:'REFERENCE_IDENTITY_AT_COLLECT_INPUT_MERGE',
   originalSecReleasePITVerified:false,candidateReused:e?.candidateReused},
  breadth:{status:'VALIDATED_DERIVED_DOMAIN_SELECTED_ONLY',
   methodologyVersion:b?.methodologyVersion,sourceVersion:b?.sourceVersion,
   pitSha256:b?.pitSha256,inputSha256:b?.inputSha256,
   observationDate:b?.observationDate,
   selectionEvidence:'VALIDATED_PAID_DERIVED_READER_RETURN',
   rawSourcePITVerified:false},
 },calculatedAt);
 return fresh&&JSON.stringify(fresh)===JSON.stringify(input)?fresh:null;
}
