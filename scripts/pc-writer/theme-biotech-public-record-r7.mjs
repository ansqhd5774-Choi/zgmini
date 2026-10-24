// Pure biotech R6 -> versioned R2 public-record builder. No D1, provider, or
// task side effects. Publication must be an explicit separate opt-in action.
import {BIOTECH_CONTINUATION_PUBLIC_VERSION} from '../../worker/theme-biotech-continuation-r2.mjs';

const METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
const PRICE_MODE='UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12';
const TERMS_URL='https://getmarkethistory.com/docs/terms';
const RIGHTS_BASIS='OFFICIAL_TERMS_DERIVED_WORKS_ANONYMOUS_SCOPE_UNCONFIRMED';
const requireValid=(v,reason)=>{if(!v)throw Object.assign(new Error(reason),{code:reason});};

export function buildBiotechPublicR2({candidate,previous,candidateFileSha256,optIn=false,now=Date.now()}={}){
 requireValid(optIn===true,'BIOTECH_R7_PUBLICATION_NOT_OPTED_IN');
 requireValid(previous?.status==='READY'&&previous.methodologyVersion===METHOD&&previous.etfs?.join(',')==='IBB,XBI'&&
  previous.publicationAuthorized===true&&previous.licensingRiskAcceptedByPublisher===true&&
  previous.derivedOnlyNoRaw===true&&previous.anonymousScopeIndependentlyConfirmed===false&&
  previous.upstreamCommercialRightsVerified===false&&previous.derivedLicenseVerified===false&&
  previous.sourcePriceReconciled===false&&previous.fullHistoryIndependentlyReconciled===false&&
  previous.rightsBasis===RIGHTS_BASIS&&previous.sourceTermsUrl===TERMS_URL,
  'BIOTECH_R7_PRIOR_PUBLIC_AUTHORITY_UNVERIFIED');
 requireValid(candidate?.status==='PRIVATE_CONFIRMED_CONTINUATION_NOT_PUBLISHED'&&candidate.themeId==='biotech'&&
  /^BIOTECH_CONFIRMED_CONTINUATION_R6_[a-f0-9]{16}$/.test(candidate.revisionId??'')&&
  candidate.methodologyVersion===METHOD&&candidate.publicationAuthorized===false&&candidate.d1Writes===0&&
  candidate.provisional?.points?.length===0&&candidate.history?.length===252&&
  candidate.history.at(-1).date===candidate.observationDate&&
  Number.isFinite(candidate.score)&&candidate.score===candidate.history.at(-1).score&&
  /^[a-f0-9]{64}$/.test(candidateFileSha256??'')&&
  /^GMH_MANIFEST_SHA256_[a-f0-9]{64}$/.test(candidate.sourceLineage?.newPrivateSourceVersion??'')&&
  Number.isFinite(Date.parse(candidate.sourceLineage?.sourceReceivedThrough)),
  'BIOTECH_R7_CANDIDATE_INVALID');
 requireValid(candidate.sourceLineage.previousPublicObservationDate===previous.observationDate,
  'BIOTECH_R7_PUBLIC_BASE_CHANGED');
 const clock=Number(now),sourceTime=Date.parse(candidate.sourceLineage.sourceReceivedThrough);
 requireValid(Number.isSafeInteger(clock)&&clock>=sourceTime&&clock-sourceTime<8*86400000,
  'BIOTECH_R7_SOURCE_STALE');
 const at=new Date(clock).toISOString();
 return {status:'READY',version:BIOTECH_CONTINUATION_PUBLIC_VERSION,
  theme:'바이오테크',etfs:['IBB','XBI'],referenceSymbol:'SPY',methodologyVersion:METHOD,
  scoreMethod:'ETF_ONLY_PROXY',individualStocksUsed:0,sourcePriceMode:PRICE_MODE,
  sourceStoredAtKind:'VERIFIED_LOCAL_MARKET_BARS',sourceTimestampBasis:'MANIFEST_GET_REQUEST_AT',
  sourceVersion:candidate.sourceLineage.newPrivateSourceVersion,sourceStoredAt:candidate.sourceLineage.sourceReceivedThrough,
  publishedAt:at,asOf:at,
  publicationAuthorized:true,localBarsVerified:true,derivedOnlyNoRaw:true,
  licensingRiskAcceptedByPublisher:previous.licensingRiskAcceptedByPublisher,
  upstreamCommercialRightsVerified:previous.upstreamCommercialRightsVerified,
  derivedLicenseVerified:previous.derivedLicenseVerified,
  anonymousScopeIndependentlyConfirmed:previous.anonymousScopeIndependentlyConfirmed,
  sourcePriceReconciled:false,fullHistoryIndependentlyReconciled:false,
  rightsBasis:previous.rightsBasis,sourceTermsUrl:previous.sourceTermsUrl,
  candidateRevisionId:candidate.revisionId,candidateFileSha256,
  sourceLineage:candidate.sourceLineage,reconciliation:candidate.reconciliation,
  observationDate:candidate.observationDate,score:candidate.score,
  history:candidate.history.map(p=>({date:p.date,score:p.score})),phase:'CONFIRMED',provisional:{points:[]}};
}
