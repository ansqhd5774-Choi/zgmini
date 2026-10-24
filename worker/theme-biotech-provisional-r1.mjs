// Optional stored-only biotechnology provisional sidecar. Neither the seven
// established themes nor the confirmed biotech 252-day history are rewritten.
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';

export const BIOTECH_PROVISIONAL_KEY='theme-biotech-provisional-r1';
export const BIOTECH_PROVISIONAL_VERSION='THEME_BIOTECH_MARKETPARQUET_PROVISIONAL_R1';
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const validScore=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const validStamp=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));

export function validBiotechProvisionalR1(record,biotech,{now=Date.now(),storedAt=now}={}){
 if(!biotech||biotech.theme!=='바이오·신약'||!validScore(biotech.score)||
  biotech.history?.length!==252||biotech.history.at(-1)?.score!==biotech.score)return false;
 const referenceDate=biotech.history.at(-1)?.date;
 if(!record||record.status!=='READY'||record.phase!=='PROVISIONAL'||
  record.version!==BIOTECH_PROVISIONAL_VERSION||record.theme!=='바이오·신약'||
  record.etfs?.join(',')!=='IBB,XBI'||record.referenceSymbol!=='SPY'||
  record.methodologyVersion!=='ETF_ONLY_T40_R20_V40_PAIR50'||
  record.individualStocksUsed!==0||record.scoreMethod!=='ETF_ONLY_PROXY'||
  record.publicationAuthorized!==true||record.derivedOnlyNoRaw!==true||
  record.licensingRiskAcceptedByPublisher!==true||record.upstreamCommercialRightsVerified!==false||
  record.derivedLicenseVerified!==false||record.sourcePriceReconciled!==false||
  record.sourceName!=='MARKETPARQUET_ALREADY_STORED_SEVEN_THEME_ARCHIVE'||
  record.sourcePriceMode!=='GMH_UNADJUSTED_15_HOURLY_PROXY_PLUS_MARKETPARQUET_SPLIT_ADJUSTED_EOD'||
  record.sourceTimestampBasis!=='LOCAL_PARQUET_FILE_MTIME'||
  !/^BIOTECH_R8_[a-f0-9]{64}$/.test(record.sourceVersion??''))return false;
 if(!validDate(referenceDate)||record.confirmedObservationDate!==referenceDate||
  record.confirmedScore!==biotech.score||!validDate(record.observationDate))return false;
 if(!validStamp(record.asOf)||!validStamp(record.sourceStoredAt)||!Number.isSafeInteger(Number(storedAt))||
  [Date.parse(record.asOf),Date.parse(record.sourceStoredAt),Number(storedAt)].some(t=>t>now||now-t>=PUBLIC_DISPLAY_MAX_AGE_MS))return false;
 const points=record.points;
 if(!Array.isArray(points)||points.length<1||points.length>2||
  record.observationDate!==points.at(-1).date||record.coverage?.etfs!==2||
  record.coverage?.benchmark!=='SPY'||record.coverage?.complete!==true)return false;
 let previous=referenceDate;
 for(const p of points){if(!validDate(p?.date)||p.date<=previous||
  Date.parse(p.date+'T00:00:00Z')>now||!validScore(p.score))return false;previous=p.date;}
 if(!Array.isArray(record.sourceFiles)||record.sourceFiles.length!==points.length+1||
  record.sourceFiles[0]?.date!==referenceDate||
  record.sourceFiles.some((f,i)=>!validDate(f?.date)||!/^[a-f0-9]{64}$/.test(f?.sha256??'')||
   (i>0&&f.date!==points[i-1].date)))return false;
 if(!record.overlapPriceDifferences||['IBB','XBI','SPY'].some(s=>
  !Number.isFinite(record.overlapPriceDifferences[s])||record.overlapPriceDifferences[s]<0||
  record.overlapPriceDifferences[s]>0.05))return false;
 return now-Date.parse(record.observationDate+'T23:59:59Z')<PUBLIC_DISPLAY_MAX_AGE_MS;
}

export async function addVerifiedBiotechProvisionalR1(db,base,{now=Date.now()}={}){
 if(base?.status!=='READY'||!Array.isArray(base.themes))return base;
 const biotech=base.themes.find(t=>t.theme==='바이오·신약');
 if(!biotech)return base;
 let row;
 try{row=await db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").bind(BIOTECH_PROVISIONAL_KEY).first()}catch{return base}
 if(!row)return base;
 let record;try{record=JSON.parse(row.body)}catch{return base}
 if(!validBiotechProvisionalR1(record,biotech,{now,storedAt:Number(row.stored_at)}))return base;
 // Existing seven-theme provisional prices/scores are copied byte-for-byte
 // semantically; only the new ninth theme's score property is added.
 const current=base.phase==='PROVISIONAL'&&Array.isArray(base.provisional?.points)?base.provisional.points:[];
 const indexed=new Map(current.map(p=>[p.date,{...p,scores:{...p.scores}}]));
 for(const p of record.points){
  const slot=indexed.get(p.date)??{date:p.date,scores:{}};
  slot.scores['바이오·신약']=p.score;
  indexed.set(p.date,slot);
 }
 const points=[...indexed.values()].sort((a,b)=>a.date.localeCompare(b.date));
 return {...base,phase:'PROVISIONAL',provisional:{...base.provisional,
  asOf:base.provisional?.asOf??record.asOf,points}};
}
