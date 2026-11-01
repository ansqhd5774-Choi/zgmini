// Read-only biotech continuation sidecar, independent of AI and the seven-theme
// collector. R1 remains an untouched fallback; visitor GET never computes.
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';

export const BIOTECH_CONTINUATION_PUBLIC_KEY='theme-biotech-optional-r2';
export const BIOTECH_CONTINUATION_PUBLIC_VERSION='THEME_BIOTECH_GMH_CONTINUATION_R2_PUBLIC_V1';
const METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
const MODE='UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12';
const RIGHTS_BASIS='OFFICIAL_TERMS_DERIVED_WORKS_ANONYMOUS_SCOPE_UNCONFIRMED';
const TERMS_URL='https://getmarkethistory.com/docs/terms';
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const validStamp=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const validScore=s=>typeof s==='number'&&Number.isFinite(s)&&s>=0&&s<=100;

export function eligibleBiotechContinuationR2(record,base,{now=Date.now(),storedAt=now}={}){
 if(base?.status!=='READY'||!Array.isArray(base.themes)||base.themes.length<7||!validDate(base.observationDate))return false;
 if(!record||record.status!=='READY'||record.version!==BIOTECH_CONTINUATION_PUBLIC_VERSION||
  record.theme!=='바이오테크'||record.etfs?.join(',')!=='IBB,XBI'||record.referenceSymbol!=='SPY'||
  record.methodologyVersion!==METHOD||record.individualStocksUsed!==0||record.scoreMethod!=='ETF_ONLY_PROXY'||
  record.sourcePriceMode!==MODE||record.phase!=='CONFIRMED'||record.provisional?.points?.length!==0)return false;
 if(record.publicationAuthorized!==true||record.localBarsVerified!==true||record.derivedOnlyNoRaw!==true||
  record.licensingRiskAcceptedByPublisher!==true||record.anonymousScopeIndependentlyConfirmed!==false||
  record.upstreamCommercialRightsVerified!==false||record.derivedLicenseVerified!==false||
  record.sourcePriceReconciled!==false||record.fullHistoryIndependentlyReconciled!==false||
  record.rightsBasis!==RIGHTS_BASIS||record.sourceTermsUrl!==TERMS_URL)return false;
 if(record.sourceStoredAtKind!=='VERIFIED_LOCAL_MARKET_BARS'||record.sourceTimestampBasis!=='MANIFEST_GET_REQUEST_AT'||
  !/^GMH_MANIFEST_SHA256_[a-f0-9]{64}$/.test(record.sourceVersion??'')||
  !/^BIOTECH_CONFIRMED_CONTINUATION_R6_[a-f0-9]{16}$/.test(record.candidateRevisionId??'')||
  !/^[a-f0-9]{64}$/.test(record.candidateFileSha256??''))return false;
 if(!validStamp(record.sourceStoredAt)||!validStamp(record.asOf)||!validStamp(record.publishedAt)||
  !Number.isSafeInteger(Number(storedAt))||[storedAt,Date.parse(record.sourceStoredAt),Date.parse(record.asOf),Date.parse(record.publishedAt)].some(t=>
   t>now||now-t>=PUBLIC_DISPLAY_MAX_AGE_MS))return false;
 if(!validDate(record.observationDate)||record.observationDate>base.observationDate||
  now-Date.parse(record.observationDate+'T23:59:59Z')>=PUBLIC_DISPLAY_MAX_AGE_MS||
  !validScore(record.score)||!Array.isArray(record.history)||record.history.length!==252)return false;
 if(record.history.at(-1)?.date!==record.observationDate||
  record.history.some((p,i)=>!validDate(p?.date)||!validScore(p?.score)||(i>0&&p.date<=record.history[i-1].date))||
  Math.abs(record.history.at(-1).score-record.score)>0.000001)return false;
 const line=record.sourceLineage,proof=record.reconciliation;
 if(!line||line.mode!=='PRESERVED_OLD_PUBLISHED_SCORES_PLUS_NEW_GMH_CONFIRMED'||
  !validDate(line.previousPublicObservationDate)||line.previousPublicObservationDate>=record.observationDate||
  !validDate(line.firstNewDate)||line.firstNewDate<=line.previousPublicObservationDate||
  line.newPrivateSourceVersion!==record.sourceVersion||line.sourceReceivedThrough!==record.sourceStoredAt||
  !proof||!Number.isInteger(proof.existingOverlappingDatesPreserved)||proof.existingOverlappingDatesPreserved<1||
  !Number.isInteger(proof.newConfirmedDates)||proof.newConfirmedDates<1||
  proof.existingOverlappingDatesPreserved+proof.newConfirmedDates!==252)return false;
 return true;
}

export async function addVerifiedBiotechContinuationR2(db,base,{now=Date.now()}={}){
 if(base?.status!=='READY'||!Array.isArray(base.themes)||base.themes.length<7)return base;
 let row;
 try{row=await db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").bind(BIOTECH_CONTINUATION_PUBLIC_KEY).first()}
 catch{return base}
 if(!row)return base;
 let record;try{record=JSON.parse(row.body)}catch{return base}
 if(!eligibleBiotechContinuationR2(record,base,{now,storedAt:Number(row.stored_at)}))return base;
 const old=base.themes.findIndex((theme,i)=>i>=7&&(theme.theme==='바이오·신약'||theme.theme==='바이오테크'));
 if(old>=0&&base.themes[old].observationDate>record.observationDate)return base;
 const biotech={theme:'바이오·신약',etfs:['IBB','XBI'],score:record.score,
  history:record.history.map(p=>({date:p.date,score:p.score})),
  ...(record.observationDate!==base.observationDate?{observationDate:record.observationDate,delayed:true}:{})};
 const themes=[...base.themes];if(old>=0)themes[old]=biotech;else themes.push(biotech);
 return {...base,themes};
}
