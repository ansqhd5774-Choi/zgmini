/**
 * V41 research-only R3 source-revision and composite-headline review.
 * Does NOT change existing R3 classification, weights, saved history or publication.
 */
import {classifyR3Article,validDate} from './reference-flow-r3.mjs';
export const VERSION='IRAN_R3_LIVEBLOG_SOURCE_REVIEW_V41';
const validText=s=>typeof s==='string'&&s.length>0&&s.length<=500;
const time=x=>Number.isSafeInteger(x)&&x>0;
const liveIntro=/^\s*(?:iran|israel|middle east|gaza)(?:[\s-]+(?:war|conflict|crisis))?\s+live(?:\s+updates?)?\s*:/i;
const signature=e=>Object.freeze({
 accepted:e.accepted===true,rule:e.rule??null,actor:e.actor??null,
 target:e.target??null,location:e.location??null,date:e.date??null
});
export function reviewR3HeadlineV41(article){
 if(!article||!validText(article.title)||!validDate(article.date)||
  typeof article.sourceUrl!=='string'||article.sourceUrl.length>2048)
  throw Error('V41_HEADLINE_INPUT_INVALID');
 const title=article.title.normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
 const old=classifyR3Article({...article,title});
 const isLive=liveIntro.test(title);
 const substantive=isLive?title.replace(liveIntro,'').trim():title;
 const clauses=substantive.split(/\s*;\s*|\s+\|\s+|\s+•\s+/).filter(Boolean);
 const compound=isLive&&clauses.length>1;
 const contextualIran=isLive&&/^\s*iran/i.test(title)&&
  !/\b(?:iran|iranian|irgc)\b/i.test(substantive);
 // A liveblog umbrella heading is NOT proof that Iran perpetrated every listed attack.
 const issues=[];
 if(compound)issues.push('LIVEBLOG_MULTIPLE_UNRESOLVED_CLAIMS');
 if(contextualIran&&old.actor==='IRAN')issues.push('GENERIC_HEADLINE_CONTEXT_MISREAD_AS_ATTACKER');
 if(isLive&&old.accepted===true&&clauses.length>1)
  issues.push('SINGLE_RULE_ASSIGNED_TO_COMPOUND_LIVEBLOG');
 const risk=old.accepted===true&&issues.length>0;
 return {version:VERSION,status:risk?'REVIEW_REQUIRED':'NO_NEW_R3_REVIEW_FLAG',
  originalR3:signature(old),issues,liveblogHeadline:isLive,
  independentClauseCount:clauses.length,claimOccurrenceVerified:false,
  attackerIndependentlyVerified:false,incidentDayVerified:false,
  sourceReceiptProvesIncident:false,
  candidateShouldBeHeldOnFutureClassifierRevision:risk,
  currentR3ScoreUnchanged:true,dbWrites:0,providerCalls:0,published:false};
}
export function reviewR3SourceVersionsV41(versions){
 if(!Array.isArray(versions)||versions.length===0||versions.length>20)throw Error('V41_VERSIONS_INVALID');
 let previous=null;
 const statuses=[];
 for(const v of versions){
  if(!v||!validText(v.title)||!validDate(v.date)||!time(v.storedAt)||
   !/^[a-f0-9]{12,64}$/i.test(v.receiptHash)||previous&&
   (v.storedAt<=previous.storedAt||v.date!==previous.date))
   throw Error('V41_VERSION_LINEAGE_INVALID');
  statuses.push({receiptHashPrefix:v.receiptHash.slice(0,12),storedAt:v.storedAt,
   date:v.date,headlineReview:reviewR3HeadlineV41(v)});
  previous=v;
 }
 return {version:VERSION,status:'PRESERVED_HEADLINE_VERSIONS_ONLY',
  variantCount:statuses.length,titleChanged:new Set(versions.map(v=>v.title)).size>1,
  decisionCanChangeAcrossStoredVersions:true,
  cannotBackdateSourceRevision:true,incidentIdentityResolved:false,
  releaseScoreCorrectionAuthorized:false,
  versions:statuses,score:null,dbWrites:0,published:false};
}
export function reviewR3HeldPairV41({heldDay,sourcePublicationDay,relatedPublicationDay,
 sourceReceiptPresent,relatedReceiptPresent,incidentIdentityVerified=false}={}){
 if(!validDate(heldDay)||!validDate(sourcePublicationDay)||
  !validDate(relatedPublicationDay)||sourceReceiptPresent!==true||
  relatedReceiptPresent!==true||incidentIdentityVerified!==false)
  throw Error('V41_HELD_LINEAGE_INPUT_INVALID');
 return {version:VERSION,status:'POSSIBLE_DUPLICATE_NOT_RESOLVED',
  heldDay,publicationDatesDiffer:sourcePublicationDay!==relatedPublicationDay,
  bothUnderlyingReceiptsLocated:true,
  sameIncidentProven:false,independentIncidentCount:null,
  noAutomaticDropOrAdd:true,
  noScoreChange:true,dbWrites:0,published:false};
}
