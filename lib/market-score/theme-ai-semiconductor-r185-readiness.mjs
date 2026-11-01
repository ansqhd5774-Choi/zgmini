// R185 — private, read-only candidate readiness review. Not a producer or publisher.
// The existing R144/R178 seven-theme public contract remains authoritative.
// No API/provider calls, score computations, file I/O, DB writes or schema changes.
export const AI_SEMICONDUCTOR_CANDIDATE=Object.freeze({
 canonicalTheme:'AI 반도체',
 displayName:'AI·반도체',
 candidateEtfs:Object.freeze(['SMH','SOXX']),
 methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',
 requiredHistorySessions:252,
 publicationAuthorized:false,
});
const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const isStamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const equals=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>x===b[i]);
export function reviewAiSemiconductorPrivateCandidate(candidate,{approvedSeven=null}={}){
 const failures=[];
 if(candidate?.theme!==AI_SEMICONDUCTOR_CANDIDATE.canonicalTheme)failures.push('THEME_ID');
 if(!equals(candidate?.etfs,AI_SEMICONDUCTOR_CANDIDATE.candidateEtfs))failures.push('CANDIDATE_PAIR');
 if(candidate?.methodologyVersion!==AI_SEMICONDUCTOR_CANDIDATE.methodologyVersion)failures.push('METHOD_DRIFT');
 if(candidate?.scoreMethod!=='ETF_ONLY_PROXY'||candidate?.individualStocksUsed!==0)failures.push('ETF_ONLY_REQUIRED');
 if(!isStamp(candidate?.sourceStoredAt)||typeof candidate?.sourceVersion!=='string'||!candidate.sourceVersion.trim())failures.push('SOURCE_PROVENANCE');
 if(candidate?.status!=='PRIVATE_SHADOW_NOT_PUBLIC'||candidate?.publicationAuthorized!==false)failures.push('PRIVATE_STATUS_REQUIRED');
 if(!Array.isArray(candidate?.history)||candidate.history.length!==252)failures.push('MISSING_252');
 const history=Array.isArray(candidate?.history)?candidate.history:[];
 if(history.some((p,i)=>!validDate(p?.date)||!number(p?.score)||(i>0&&p.date<=history[i-1].date)))failures.push('INVALID_HISTORY');
 if(!number(candidate?.score)||!history.length||Math.abs((history.at(-1)?.score??NaN)-candidate.score)>0.000001)failures.push('LATEST_SCORE_MISMATCH');
 if(!validDate(candidate?.observationDate)||history.at(-1)?.date!==candidate?.observationDate)failures.push('OBSERVATION_DATE');
 // Pair-specific shadow dates must be identical to seven approved production theme dates.
 const baseThemes=approvedSeven?.status==='READY'?approvedSeven.themes:null;
 const base=Array.isArray(baseThemes)&&baseThemes.length===7?baseThemes:null;
 if(!base||!Array.isArray(base[0]?.history)||base[0].history.length!==252)failures.push('SEVEN_BASE_REQUIRED');
 else if(!equals(history.map(p=>p.date),base[0].history.map(p=>p.date)))failures.push('DATE_ALIGNMENT');
 // Rights are *not* inferred from security listings, ETF issuer marketing, or other themes' attestations.
 // New ETF market-data terms, historical raw bars and provider timestamps require independent verification.
 const rightsVerified=candidate?.upstreamCommercialRightsVerified===true&&candidate?.derivedLicenseVerified===true;
 const sourceVerified=candidate?.localBarsVerified===true&&candidate?.sourcePriceReconciled===true;
 const candidateReady=failures.length===0;
 return Object.freeze({
  status:candidateReady&&rightsVerified&&sourceVerified?'PRIVATE_RESEARCH_READY_NO_PUBLICATION':'PRIVATE_RESEARCH_INCOMPLETE',
  candidateReady,rightsVerified,sourceVerified,
  failures:Object.freeze(failures),
  pending:Object.freeze([
   ...(!rightsVerified?['COMMERCIAL_MARKET_DATA_RIGHTS']:[]),
   ...(!sourceVerified?['LOCAL_BAR_COVERAGE_AND_RECONCILIATION']:[]),
   ...(!candidateReady?['252_DAY_APPROVED_FORMULA_SHADOW_SCORE']:[]),
   'SEPARATE_PUBLICATION_CONTRACT_APPROVAL',
  ]),
  providerCalls:0,dbWrites:0,publicEligible:false,
 });
}
