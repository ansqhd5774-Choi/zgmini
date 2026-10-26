// Optional, isolated approved space ETF theme. Visitor GET reads D1 only.
// Missing/invalid source never changes any of the existing theme histories.
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';

export const SPACE_SATELLITE_PUBLIC_KEY='theme-space-satellite-r1';
export const SPACE_SATELLITE_PUBLIC_VERSION='THEME_SPACE_SATELLITE_R1_PUBLIC_V1';
export const SPACE_SATELLITE_PUBLIC_METHOD='ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_CURRENT_AUM';
const MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const WEIGHT_MODE='CURRENT_BASKET_FIXED_AUM_RETROSPECTIVE_NOT_HISTORICAL_AUM';
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 Number.isFinite(Date.parse(value+'T00:00:00Z'))&&
 new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const validTime=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const score=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const validEtfs=rows=>Array.isArray(rows)&&rows.length>=3&&
 rows.every(s=>typeof s==='string'&&/^[A-Z][A-Z0-9.-]{0,15}$/.test(s)&&s!=='SPY')&&
 new Set(rows).size===rows.length;

export function eligibleSpaceSatellite(record,base,{now=Date.now(),storedAt=now}={}){
 if(base?.status!=='READY'||!Array.isArray(base.themes)||base.themes.length<7||
  !validDate(base.observationDate)||!Array.isArray(base.themes[0]?.history)||
  base.themes[0].history.length!==252)return false;
 if(!record||record.status!=='READY'||
  record.version!==SPACE_SATELLITE_PUBLIC_VERSION||record.theme!=='우주·위성'||
  !validEtfs(record.etfs)||record.referenceSymbol!=='SPY'||
  record.methodologyVersion!==SPACE_SATELLITE_PUBLIC_METHOD||
  record.weighting!=='APPROVED_NORMALIZED_CURRENT_ISSUER_AUM_FOR_THREE_PLUS'||
  record.historicalWeightMode!==WEIGHT_MODE||
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
 if(record.history.some((row,i)=>!validDate(row?.date)||
  !(row?.score===null||score(row?.score))||
  (i>0&&row.date<=record.history[i-1].date)))return false;
 const observed=record.history.filter(row=>score(row.score)).length;
 if(observed<1||!Number.isInteger(record.scoredDays)||
  record.scoredDays!==observed)return false;
 if(!record.aumAsOf||typeof record.aumAsOf!=='object'||
  !record.etfs.every(ticker=>validDate(record.aumAsOf[ticker])&&
   record.aumAsOf[ticker]<=record.observationDate))return false;
 const baseDays=new Set(base.themes[0].history.map(p=>p.date));
 const overlap=record.history.filter(p=>baseDays.has(p.date)).length;
 return record.observationDate===base.observationDate?overlap===252:overlap>=240;
}

export async function addVerifiedSpaceSatellite(db,base,{now=Date.now()}={}){
 if(base?.status!=='READY'||!Array.isArray(base.themes)||base.themes.length<7)return base;
 let row;
 try{row=await db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'")
  .bind(SPACE_SATELLITE_PUBLIC_KEY).first();}catch{return base;}
 if(!row)return base;
 let record;try{record=JSON.parse(row.body);}catch{return base;}
 if(!eligibleSpaceSatellite(record,base,{now,storedAt:Number(row.stored_at)})||
  base.themes.some(item=>item.theme==='우주·위성'))return base;
 return {...base,themes:[...base.themes,{theme:'우주·위성',etfs:[...record.etfs],
  score:record.score,history:record.history.map(point=>({date:point.date,
   score:point.score})),
  ...(record.observationDate!==base.observationDate?{
   observationDate:record.observationDate,delayed:true}:{})}]};
}
