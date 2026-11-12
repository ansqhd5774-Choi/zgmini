/**
 * V42 research-only score replay from already resolved R3 events.
 * Comparison is a what-if; no collector, DB, writer, public API or deploy.
 * Uses the *existing* R3 flow calculator and existing weights unchanged.
 */
import {buildReferenceFlowR3,validDate} from './reference-flow-r3.mjs';
import {reviewR3HeadlineV41} from './r3-liveblog-source-review-v41.mjs';
export const R3_V42_VERSION='IRAN_R3_LIVEBLOG_SHADOW_V42';
const num=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const pending=(reason,details={})=>({version:R3_V42_VERSION,status:'REPLAY_BLOCKED',
 reason,originalScore:null,candidateScore:null,scoreDelta:null,
 operatingChanged:false,published:false,dbWrites:0,providerCalls:0,...details});
const scoreMatch=(a,b)=>Math.abs(a-b)<1e-8;
const sameDomains=(a,b)=>a&&b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>num(b[k])&&scoreMatch(a[k],b[k]));
export function compareR3LiveblogCandidateV42({resolvedEvents,asOfDate,storedResult,heldCandidates=[]}={}){
 if(!Array.isArray(resolvedEvents)||resolvedEvents.length>10000||!validDate(asOfDate)||
  !storedResult||storedResult.version!=='IRAN_REFERENCE_FLOW_R3'||
  !num(storedResult.score)||!Number.isInteger(storedResult.eventCount)||
  storedResult.eventCount<1||!Array.isArray(heldCandidates))
  return pending('INPUT_CONTRACT_INVALID');
 let baseline;
 try{baseline=buildReferenceFlowR3(resolvedEvents,{asOfDate});}
 catch{return pending('BASELINE_CALCULATION_FAILED');}
 if(baseline.eventCount!==storedResult.eventCount||
  !scoreMatch(baseline.score,storedResult.score)||
  !sameDomains(baseline.domains,storedResult.domains))
  return pending('STORED_BASELINE_PARITY_MISMATCH',{
   storedScore:storedResult.score,recomputedBaselineScore:baseline.score,
   storedEventCount:storedResult.eventCount,recomputedEventCount:baseline.eventCount
  });
 const held=[],keep=[];
 for(const e of baseline.ledger){
  // An already scored event requires its original asserted headline for a
  // safe version-specific review. Do not silently treat missing evidence as clean.
  if(e.accepted!==true||typeof e.evidence!=='string'||e.evidence.length===0||
   typeof e.sourceUrl!=='string'||!validDate(e.date)||
   e.eventVerified===true)
   return pending('LEDGER_OR_HEADLINE_PROVENANCE_INCOMPLETE');
  let review;
  try{review=reviewR3HeadlineV41({title:e.evidence,date:e.date,
   sourceUrl:e.sourceUrl,summary:''});}
  catch{return pending('HEADLINE_REVIEW_FAILED');}
  if(review.candidateShouldBeHeldOnFutureClassifierRevision){
   if(review.originalR3.rule!==e.rule||review.originalR3.accepted!==true)
    return pending('RULE_IDENTITY_DRIFT');
   held.push(e);
  }else keep.push(e);
 }
 // Candidate is calculated from the *same* original R3 calculator. Do not
 // populate unresolved duplicate candidates into the scored ledger.
 const next=buildReferenceFlowR3(keep,{asOfDate});
 if(next.eventCount!==baseline.eventCount-held.length)
  return pending('CANDIDATE_REPLAY_COUNT_MISMATCH');
 const delta=Number((next.score-baseline.score).toFixed(2));
 const activeHeld=heldCandidates.filter(x=>x?.reason==='POSSIBLE_SAME_EVENT').length;
 const changes=baseline.history.map(p=>{
  const n=next.history.find(q=>q.date===p.date);
  return {articlePublicationDate:p.date,baseline:p.value,candidate:n?.value??null,
   // A missing candidate change point is not a missing public observation.
   candidateDateHasModelChange:Boolean(n)};
 });
 return {version:R3_V42_VERSION,status:held.length?'WHAT_IF_REPLAY_READY':'NO_LIVEBLOG_REVIEW_FLAGS',
  source:'STORED_R3_RESOLVED_LEDGER_ONLY',baselineMatched:true,
  asOfDate,originalScore:baseline.score,candidateScore:next.score,scoreDelta:delta,
  originalEventCount:baseline.eventCount,candidateEventCount:next.eventCount,
  flaggedCompositeHeadlineCount:held.length,
  flaggedSignals:held.map(e=>({publicationDate:e.date,rule:e.rule,type:e.type,
   weightedEffectOfExcludedRule:e.delta*(e.type==='MILITARY'?.2:e.type==='MARITIME'?.15:0)})),
  unresolvedHeldDuplicateCount:activeHeld,heldDuplicateAutoPromoted:false,
  baselineDomains:baseline.domains,candidateDomains:next.domains,
  articleDateModelReplay:changes,notActualPublicationHistory:true,
  candidateIsNotObservedWarTruth:true,
  originalR3WeightsUnchanged:true,originalR3RuleDeltasUnchanged:true,
  autoApplied:false,operatingChanged:false,published:false,dbWrites:0,providerCalls:0};
}
