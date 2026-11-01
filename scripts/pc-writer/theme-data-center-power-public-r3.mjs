// Tenth-theme derived-score record. This mirrors the ninth theme's documented
// anonymous-terms-uncertain publication path, with a NEW explicit opt-in.
// It does not certify rights that have not been independently established.
import {eligibleDcPower,DC_POWER_PUBLIC_VERSION} from '../../worker/theme-data-center-power-r1.mjs';

const METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
const PRICE_MODE='UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12';
const TERMS='https://getmarkethistory.com/docs/terms';
const RIGHTS_BASIS='OFFICIAL_TERMS_DERIVED_WORKS_ANONYMOUS_SCOPE_UNCONFIRMED';
const check=(condition,code)=>{if(!condition)throw Object.assign(new Error(code),{code});};

export function buildDcPowerPublicR3({candidate,candidateFileSha256,sourceStoredAt,base,
 optIn=false,acceptAnonymousLicenseRisk=false,now=Date.now()}={}){
 check(optIn===true,'DC_POWER_R3_PUBLICATION_NOT_OPTED_IN');
 check(acceptAnonymousLicenseRisk===true,'DC_POWER_R3_PUBLISHER_RISK_ACKNOWLEDGEMENT_REQUIRED');
 check(candidate?.status==='PRIVATE_CANDIDATE_NOT_PUBLISHED'&&candidate.themeId==='data-center-power'&&
  candidate.theme==='데이터센터·전력'&&candidate.etfs?.join(',')==='DTCR,GRID'&&candidate.benchmark==='SPY'&&
  candidate.methodologyVersion===METHOD&&candidate.individualStocksUsed===0&&
  candidate.priceMode===PRICE_MODE&&candidate.publicationAuthorized===false&&
  candidate.d1Writes===0&&candidate.publicWrites===0&&candidate.history?.length===252&&
  candidate.history.at(-1)?.date===candidate.observationDate&&candidate.history.at(-1)?.score===candidate.score&&
  /^GMH_MANIFEST_SHA256_[a-f0-9]{64}$/.test(candidate.sourceVersion??'')&&
  /^[a-f0-9]{64}$/.test(candidateFileSha256??''),'DC_POWER_R3_CANDIDATE_INVALID');
 // The core reader validates the immutable seven; optional themes are allowed
 // to disappear from the public projection when their source ages out.
 check(base?.status==='READY'&&Array.isArray(base.themes)&&base.themes.length>=7&&
  typeof base.observationDate==='string'&&candidate.observationDate<=base.observationDate,
  'DC_POWER_R3_CORE_SEVEN_BASE_NOT_READY');
 const clock=Number(now),received=Date.parse(sourceStoredAt);
 check(Number.isSafeInteger(clock)&&Number.isFinite(received)&&received<=clock&&
  clock-received<8*86400000,'DC_POWER_R3_SOURCE_STALE');
 const stamp=new Date(clock).toISOString();
 const record={status:'READY',version:DC_POWER_PUBLIC_VERSION,theme:'데이터센터·전력',
  etfs:['DTCR','GRID'],referenceSymbol:'SPY',methodologyVersion:METHOD,
  scoreMethod:'ETF_ONLY_PROXY',individualStocksUsed:0,sourcePriceMode:PRICE_MODE,
  publicationAuthorized:true,localBarsVerified:true,derivedOnlyNoRaw:true,
  // No account was used. Preserve unknown licensing/price reconciliation as false.
  accountGoodStandingVerified:false,upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,
  anonymousScopeIndependentlyConfirmed:false,licensingRiskAcceptedByPublisher:true,
  sourcePriceReconciled:false,fullHistoryIndependentlyReconciled:false,
  rightsBasis:RIGHTS_BASIS,sourceTermsUrl:TERMS,
  sourceStoredAtKind:'VERIFIED_LOCAL_MARKET_BARS',sourceTimestampBasis:'MANIFEST_GET_REQUEST_AT',
  sourceVersion:candidate.sourceVersion,sourceStoredAt,publishedAt:stamp,asOf:stamp,
  candidateFileSha256,observationDate:candidate.observationDate,score:candidate.score,
  history:candidate.history.map(p=>({date:p.date,score:p.score})),phase:'CONFIRMED',provisional:{points:[]}};
 check(eligibleDcPower(record,base,{now:clock,storedAt:clock}),
  'DC_POWER_R3_PUBLIC_READER_NOT_ELIGIBLE');
 return record;
}
