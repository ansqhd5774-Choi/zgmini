// Manually reviewed, source-independent official-event briefs.
// This contract must never become an R41 article annotation or an R5 score input.
export const IRAN_OFFICIAL_NEWS_BRIEF_VERSION_R1='IRAN_OFFICIAL_NEWS_BRIEFS_R1';
export const IRAN_OFFICIAL_NEWS_BRIEF_SCOPE_R1='INDEPENDENT_OFFICIAL_EVENTS';

const KOREAN=/[가-힣]/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const ID=/^OFFICIAL-\d{8}-\d{2}$/;
const SIGNALS=new Set(['diplomatic_positive','risk_persistent','risk_increase','mixed','neutral']);
const EVIDENCE_LEVELS=new Set(['ONE_PRIMARY_STATEMENT','MULTIPLE_PRIMARY_STATEMENTS']);
const ALLOWED_SOURCE_HOSTS=new Set([
 'www.gov.uk',
 'mofa.gov.qa',
 'new-york-un.diplo.de',
 'www.mfa.gov.lv',
 'www.imo.org',
 'www.fm.gov.om',
 'www.spa.gov.sa',
 'egypt.un.org',
 'www.presidency.eg',
]);
const EXACT_TOP_KEYS=new Set(['version','scope','asOfDate','publicationAuthorized','items']);
const EXACT_ITEM_KEYS=new Set([
 'id','eventDate','titleKo','facts','interpretationKo','signal',
 'signalReasonKo','evidenceLevel','sourceEvidence','status',
]);
const EXACT_FACT_KEYS=new Set(['textKo','sourceIndexes']);
const EXACT_EVIDENCE_KEYS=new Set(['organization','sourceDate','dateKind','url']);
const isObject=x=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x);
const exactKeys=(value,allowed)=>isObject(value)&&Object.keys(value).length===allowed.size&&
 Object.keys(value).every(key=>allowed.has(key));
const validDate=value=>{
 if(typeof value!=='string'||!DATE.test(value))return false;
 const date=new Date(`${value}T00:00:00.000Z`);
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
};
const korean=(value,min=15,max=800)=>typeof value==='string'&&
 value.length>=min&&value.length<=max&&KOREAN.test(value)&&value.trim()===value;

function officialUrl(value){
 if(typeof value!=='string'||value.length>400)return false;
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&url.username===''&&url.password===''&&
   url.port===''&&url.hash===''&&url.search===''&&url.href===value&&
   ALLOWED_SOURCE_HOSTS.has(url.hostname)&&url.pathname!=='/';
 }catch{return false;}
}

/** Strict source/evidence validation; no R41 article IDs or publisher body input. */
export function validateIranOfficialNewsBriefsR1(payload){
 if(!exactKeys(payload,EXACT_TOP_KEYS)||
  payload.version!==IRAN_OFFICIAL_NEWS_BRIEF_VERSION_R1||
  payload.scope!==IRAN_OFFICIAL_NEWS_BRIEF_SCOPE_R1||
  !validDate(payload.asOfDate)||payload.publicationAuthorized!==false||
  !Array.isArray(payload.items)||payload.items.length>100)return false;
 const ids=new Set();
 return payload.items.every(item=>{
  if(!exactKeys(item,EXACT_ITEM_KEYS)||!ID.test(item.id)||ids.has(item.id)||
   !validDate(item.eventDate)||item.eventDate>payload.asOfDate||
   !korean(item.titleKo,12,120)||!korean(item.interpretationKo,30)||
   !korean(item.signalReasonKo,25)||!SIGNALS.has(item.signal)||
   !EVIDENCE_LEVELS.has(item.evidenceLevel)||
   item.status!=='SOURCE_VERIFIED_CANDIDATE'||
   !Array.isArray(item.facts)||item.facts.length<2||item.facts.length>4||
   !Array.isArray(item.sourceEvidence)||item.sourceEvidence.length<1||
   item.sourceEvidence.length>4)return false;
  ids.add(item.id);
  const urls=new Set();
  for(const evidence of item.sourceEvidence){
   if(!exactKeys(evidence,EXACT_EVIDENCE_KEYS)||
    !korean(evidence.organization,2,100)||!validDate(evidence.sourceDate)||
    !['PUBLISHED','AS_OF'].includes(evidence.dateKind)||
    evidence.sourceDate>payload.asOfDate||!officialUrl(evidence.url)||
    urls.has(evidence.url))return false;
   urls.add(evidence.url);
  }
  if(!item.facts.every(fact=>exactKeys(fact,EXACT_FACT_KEYS)&&
   korean(fact.textKo,20,350)&&Array.isArray(fact.sourceIndexes)&&
   fact.sourceIndexes.length>=1&&fact.sourceIndexes.length<=item.sourceEvidence.length&&
   new Set(fact.sourceIndexes).size===fact.sourceIndexes.length&&
   fact.sourceIndexes.every(index=>Number.isSafeInteger(index)&&index>=0&&
    index<item.sourceEvidence.length)))return false;
  return item.evidenceLevel===(urls.size===1?'ONE_PRIMARY_STATEMENT':'MULTIPLE_PRIMARY_STATEMENTS');
 });
}

/** No autopromotion to R41 READY, article counts, publication or sentiment score. */
export function summarizeIranOfficialNewsBriefsR1(payload){
 if(!validateIranOfficialNewsBriefsR1(payload))throw Error('IRAN_OFFICIAL_NEWS_BRIEFS_INVALID');
 const signals={diplomatic_positive:0,risk_persistent:0,risk_increase:0,mixed:0,neutral:0};
 for(const item of payload.items)signals[item.signal]++;
 return Object.freeze({
  version:payload.version,asOfDate:payload.asOfDate,
  candidateCount:payload.items.length,publicationAuthorized:false,
  officialEvidenceOnly:true,articleReadyCountDelta:0,r5ScoreChanges:0,signals,
 });
}
