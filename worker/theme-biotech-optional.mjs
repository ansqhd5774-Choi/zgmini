import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';

// Ninth theme is an optional, stored-derived-only sidecar. Neither a visitor
// GET nor a missing/unverified candidate can calculate, backfill, or publish.
export const BIOTECH_THEME_PUBLIC_KEY='theme-biotech-optional-r1';
export const BIOTECH_THEME_PUBLIC_VERSION='THEME_BIOTECH_OPTIONAL_R1_PUBLIC_V1';
const METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
const MODE='UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12';
// The historical eight-theme release used a limited independent price sample.
// Keep the fully attested path, and permit a separately disclosed owner-approved
// terms-interpretation path. Never label the latter as independently licensed or
// fully price-reconciled: those assertions remain false in the stored evidence.
const TERMS_URL='https://getmarkethistory.com/docs/terms';
const LIMITED_EVIDENCE='R3_703_R4_R158_EXACT_R5_ISSUER_3_OF_3';
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>x===b[i]);
const datesFrom=rows=>rows.map(x=>x.date);

export function eligibleBiotechTheme(record,base,{now=Date.now(),storedAt=now}={}){
 if(base?.status!=='READY'||base.methodologyVersion!==METHOD||base.themes?.length!==8||base.themes[7]?.theme!=='AI 반도체'||!date(base.observationDate))return false;
 const baseline=base.themes[0]?.history;
 if(!Array.isArray(baseline)||baseline.length!==252||!same(base.themes[7]?.history?.map(x=>x.date),datesFrom(baseline)))return false;
 if(!record||record.status!=='READY'||record.version!==BIOTECH_THEME_PUBLIC_VERSION||record.theme!=='바이오테크'||!same(record.etfs,['IBB','XBI']))return false;
 if(record.methodologyVersion!==METHOD||record.individualStocksUsed!==0||record.scoreMethod!=='ETF_ONLY_PROXY'||record.referenceSymbol!=='SPY'||record.sourcePriceMode!==MODE)return false;
 const fullyAttested=record.upstreamCommercialRightsVerified===true&&record.derivedLicenseVerified===true&&record.sourcePriceReconciled===true;
 const transparentlyLimited=record.upstreamCommercialRightsVerified===false&&record.derivedLicenseVerified===false&&record.sourcePriceReconciled===false&&
  record.rightsBasis==='OFFICIAL_TERMS_DERIVED_WORKS_ANONYMOUS_SCOPE_UNCONFIRMED'&&record.sourceTermsUrl===TERMS_URL&&
  record.anonymousScopeIndependentlyConfirmed===false&&record.licensingRiskAcceptedByPublisher===true&&
  record.priceValidationBasis===LIMITED_EVIDENCE&&record.issuerSpotChecksPassed===3&&record.fullHistoryIndependentlyReconciled===false&&record.derivedOnlyNoRaw===true;
 if(record.publicationAuthorized!==true||record.localBarsVerified!==true||!(fullyAttested||transparentlyLimited)||
   !Number.isInteger(record.priceSessions)||record.priceSessions<628)return false;
 if(record.sourceStoredAtKind!=='LOCAL_BIOTECH_RAW_FILE_MTIME_NOT_PROVIDER_TIMESTAMP'||record.sourceTimestampBasis!=='FILE_MTIME_NOT_PROVIDER_TIMESTAMP')return false;
 if(!/^BIOTECH_R1_SHA256_[a-f0-9]{64}$/.test(record.sourceVersion??'')||record.sourceFileSha256!==record.sourceVersion.slice('BIOTECH_R1_SHA256_'.length))return false;
 if(!stamp(record.sourceStoredAt)||!stamp(record.asOf)||!stamp(record.publishedAt)||!Number.isSafeInteger(Number(storedAt)))return false;
 if([storedAt,Date.parse(record.sourceStoredAt),Date.parse(record.asOf),Date.parse(record.publishedAt)].some(t=>t>now||now-t>=PUBLIC_DISPLAY_MAX_AGE_MS))return false;
 if(record.observationDate!==base.observationDate||now-Date.parse(record.observationDate+'T23:59:59Z')>=PUBLIC_DISPLAY_MAX_AGE_MS||!score(record.score)||!Array.isArray(record.history)||record.history.length!==252)return false;
 if(!same(datesFrom(record.history),datesFrom(baseline))||record.history.some((p,i)=>!date(p?.date)||!score(p?.score)||(i>0&&p.date<=record.history[i-1].date)))return false;
 if(Math.abs(record.history.at(-1).score-record.score)>0.000001)return false;
 const pending=base.phase==='PROVISIONAL'?base.provisional?.points??[]:[];
 const candidatePending=record.provisional?.points??[];
 if(!Array.isArray(candidatePending)||!same(candidatePending.map(p=>p?.date),pending.map(p=>p?.date)))return false;
 if(candidatePending.some((p,i)=>!date(p.date)||p.date<=record.observationDate||!score(p.score)||(i>0&&p.date<=candidatePending[i-1].date)))return false;
 if(record.phase!==(pending.length?'PROVISIONAL':'CONFIRMED'))return false;
 return true;
}

export async function addVerifiedBiotechTheme(db,base,{now=Date.now()}={}){
 if(base?.status!=='READY'||base.themes?.length!==8)return base;
 let row;
 try{row=await db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").bind(BIOTECH_THEME_PUBLIC_KEY).first()}
 catch{return base}
 if(!row)return base;
 let record;try{record=JSON.parse(row.body)}catch{return base}
 if(!eligibleBiotechTheme(record,base,{now,storedAt:Number(row.stored_at)}))return base;
 // The persisted record keeps its original contract key/name. Only the public
 // presentation label changes; existing D1 data needs no rewrite or rerun.
 const biotech={theme:'바이오·신약',etfs:['IBB','XBI'],score:record.score,
  history:record.history.map(p=>({date:p.date,score:p.score}))};
 const augmented={...base,themes:[...base.themes,biotech]};
 if(base.phase==='PROVISIONAL'&&base.provisional?.points?.length){
  augmented.provisional={...base.provisional,points:base.provisional.points.map((p,i)=>({...p,
   scores:{...p.scores,'바이오·신약':record.provisional.points[i].score}}))};
 }
 return augmented;
}
