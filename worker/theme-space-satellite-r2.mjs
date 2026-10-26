// Separate immutable R32 publication key. R1 stays readable as a safe fallback.
// Visitor requests only read a verified D1 snapshot; no calculation or writes.
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';

export const SPACE_SATELLITE_R2_PUBLIC_KEY='theme-space-satellite-r2';
export const SPACE_SATELLITE_R2_PUBLIC_VERSION='THEME_SPACE_SATELLITE_R2_PUBLIC_V1';
export const SPACE_SATELLITE_R2_PUBLIC_METHOD=
 'ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_AUM_DATE_ELIGIBLE_SINGLE_R32';
export const SPACE_SATELLITE_R2_HISTORY_MODE=
 'CURRENT_ROSTER_DATE_ELIGIBLE_AUM_WITH_REAL_SINGLE_ETF_HISTORY';
export const SPACE_SATELLITE_R2_SINGLE_POLICY=
 'LONGEST_VERIFIED_SESSIONS_TIE_CURRENT_AUM';
const MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
 Number.isFinite(Date.parse(v+'T00:00:00Z'))&&
 new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const score=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
const validTime=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));

export function eligibleSpaceSatelliteR2(record,base,{now=Date.now(),storedAt=now}={}){
 if(base?.status!=='READY'||!Array.isArray(base.themes)||base.themes.length<7||
  !validDate(base.observationDate)||base.themes[0]?.history?.length!==252)return false;
 if(!record||record.status!=='READY'||
  record.version!==SPACE_SATELLITE_R2_PUBLIC_VERSION||record.theme!=='우주·위성'||
  !Array.isArray(record.etfs)||record.etfs.length<3||
  new Set(record.etfs).size!==record.etfs.length||
  record.etfs.some(s=>typeof s!=='string'||
   !/^[A-Z][A-Z0-9.-]{0,15}$/.test(s)||s==='SPY')||
  record.referenceSymbol!=='SPY'||
  record.methodologyVersion!==SPACE_SATELLITE_R2_PUBLIC_METHOD||
  record.weighting!=='APPROVED_NORMALIZED_CURRENT_ISSUER_AUM_FOR_THREE_PLUS'||
  record.historicalWeightMode!==SPACE_SATELLITE_R2_HISTORY_MODE||
  record.historyFallbackPolicy!==SPACE_SATELLITE_R2_SINGLE_POLICY||
  record.sourcePriceMode!==MODE||record.individualStocksUsed!==0||
  record.publicationAuthorized!==true||record.approvedBasket!==true||
  record.derivedOnlyNoRaw!==true||record.priceManifestShaVerified!==true||
  record.phase!=='CONFIRMED'||record.provisional?.points?.length!==0)return false;
 if(!/^GMH_MANIFEST_SHA256_[a-f0-9]{64}_SPY_SHA256_[a-f0-9]{64}$/.test(
  record.sourceVersion??'')||!/^[a-f0-9]{64}$/.test(record.candidateFileSha256??''))return false;
 if(!validTime(record.sourceStoredAt)||!validTime(record.publishedAt)||
  !Number.isSafeInteger(Number(storedAt)))return false;
 const clocks=[Number(storedAt),Date.parse(record.sourceStoredAt),
  Date.parse(record.publishedAt)];
 if(clocks.some(t=>t>now||now-t>=PUBLIC_DISPLAY_MAX_AGE_MS))return false;
 if(!validDate(record.observationDate)||record.observationDate>base.observationDate||
  now-Date.parse(record.observationDate+'T23:59:59Z')>=PUBLIC_DISPLAY_MAX_AGE_MS||
  !score(record.score)||record.history?.length!==252||
  record.history.at(-1)?.date!==record.observationDate||
  !score(record.history.at(-1)?.score)||
  Math.abs(record.history.at(-1).score-record.score)>0.000001)return false;
 if(record.history.some((point,i)=>!validDate(point?.date)||
  !(point.score===null||score(point.score))||
  (i>0&&point.date<=record.history[i-1].date)))return false;
 const scoredDays=record.history.filter(point=>score(point.score)).length;
 if(scoredDays<1||record.scoredDays!==scoredDays)return false;
 if(!record.aumAsOf||typeof record.aumAsOf!=='object'||
  !record.etfs.every(symbol=>validDate(record.aumAsOf[symbol])&&
   record.aumAsOf[symbol]<=record.observationDate))return false;
 const baseDates=new Set(base.themes[0].history.map(row=>row.date));
 const overlapping=record.history.filter(point=>baseDates.has(point.date)).length;
 return record.observationDate===base.observationDate?
  overlapping===252:overlapping>=240;
}

export async function addVerifiedSpaceSatelliteR2(db,base,{now=Date.now()}={}){
 if(base?.status!=='READY'||!Array.isArray(base.themes)||base.themes.length<7||
  base.themes.some(item=>item.theme==='우주·위성'))return base;
 let row;
 try{row=await db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'")
  .bind(SPACE_SATELLITE_R2_PUBLIC_KEY).first();}catch{return base;}
 if(!row)return base;
 let record;try{record=JSON.parse(row.body);}catch{return base;}
 if(!eligibleSpaceSatelliteR2(record,base,{now,storedAt:Number(row.stored_at)}))return base;
 return {...base,themes:[...base.themes,{theme:'우주·위성',etfs:[...record.etfs],
  score:record.score,history:record.history.map(point=>({date:point.date,
   score:point.score})),
  ...(record.observationDate!==base.observationDate?{
   observationDate:record.observationDate,delayed:true}:{})}]};
}
