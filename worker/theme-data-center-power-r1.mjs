// Isolated tenth ETF-only theme sidecar. Reads only a separately approved D1
// derived-score row; never changes seven core themes or AI/biotech histories.
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';

export const DC_POWER_PUBLIC_KEY='theme-data-center-power-r1';
export const DC_POWER_PUBLIC_VERSION='THEME_DATA_CENTER_POWER_GMH_R1_PUBLIC_V1';
const METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
const PRICE_MODE='UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12';
const TERMS='https://getmarkethistory.com/docs/terms';
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const score=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
const time=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));

export function eligibleDcPower(record,base,{now=Date.now(),storedAt=now}={}){
 if(base?.status!=='READY'||!Array.isArray(base.themes)||base.themes.length<7||!validDate(base.observationDate))return false;
 if(!record||record.status!=='READY'||record.version!==DC_POWER_PUBLIC_VERSION||record.theme!=='데이터센터·전력'||
  record.etfs?.join(',')!=='DTCR,GRID'||record.referenceSymbol!=='SPY'||record.methodologyVersion!==METHOD||
  record.scoreMethod!=='ETF_ONLY_PROXY'||record.individualStocksUsed!==0||record.sourcePriceMode!==PRICE_MODE||
  record.phase!=='CONFIRMED'||record.provisional?.points?.length!==0)return false;
 // The provider's derived-work clause is conditional on an account in good
 // standing. Anonymous sample GET alone never establishes this permission.
 if(record.publicationAuthorized!==true||record.accountGoodStandingVerified!==true||
  record.upstreamCommercialRightsVerified!==true||record.derivedLicenseVerified!==true||
  record.derivedOnlyNoRaw!==true||record.localBarsVerified!==true||record.sourceTermsUrl!==TERMS)return false;
 if(record.sourceStoredAtKind!=='VERIFIED_LOCAL_MARKET_BARS'||record.sourceTimestampBasis!=='MANIFEST_GET_REQUEST_AT'||
  !/^GMH_MANIFEST_SHA256_[a-f0-9]{64}$/.test(record.sourceVersion??'')||
  !/^[a-f0-9]{64}$/.test(record.candidateFileSha256??''))return false;
 if(!time(record.sourceStoredAt)||!time(record.publishedAt)||!time(record.asOf)||!Number.isSafeInteger(Number(storedAt))||
  [storedAt,Date.parse(record.sourceStoredAt),Date.parse(record.publishedAt),Date.parse(record.asOf)]
   .some(t=>t>now||now-t>=PUBLIC_DISPLAY_MAX_AGE_MS))return false;
 if(!validDate(record.observationDate)||record.observationDate>base.observationDate||
  now-Date.parse(record.observationDate+'T23:59:59Z')>=PUBLIC_DISPLAY_MAX_AGE_MS||
  !score(record.score)||record.history?.length!==252||record.history.at(-1)?.date!==record.observationDate||
  record.history.some((p,i)=>!validDate(p?.date)||!score(p?.score)||(i>0&&p.date<=record.history[i-1].date))||
  Math.abs(record.history.at(-1).score-record.score)>0.000001)return false;
 const baseline=base.themes[0]?.history;
 if(!Array.isArray(baseline)||baseline.length!==252)return false;
 const baseDates=new Set(baseline.map(p=>p.date));
 const overlap=record.history.filter(p=>baseDates.has(p.date)).length;
 if(record.observationDate===base.observationDate&&overlap!==252)return false;
 if(record.observationDate!==base.observationDate&&overlap<240)return false;
 return true;
}

export async function addVerifiedDcPower(db,base,{now=Date.now()}={}){
 if(base?.status!=='READY'||!Array.isArray(base.themes)||base.themes.length<7)return base;
 let row;
 try{row=await db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'")
  .bind(DC_POWER_PUBLIC_KEY).first();}catch{return base;}
 if(!row)return base;
 let record;try{record=JSON.parse(row.body);}catch{return base;}
 if(!eligibleDcPower(record,base,{now,storedAt:Number(row.stored_at)}))return base;
 if(base.themes.some(item=>item.theme==='데이터센터·전력'))return base;
 return {...base,themes:[...base.themes,{theme:'데이터센터·전력',etfs:['DTCR','GRID'],
  score:record.score,history:record.history.map(p=>({date:p.date,score:p.score})),
  ...(record.observationDate!==base.observationDate?{observationDate:record.observationDate,delayed:true}:{})}]};
}
