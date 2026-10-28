// Optional D1-only provisional sidecar for the existing R32 Space/Satellite theme.
// Never mutates the confirmed 252-session history or any other theme's points.
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';

export const SPACE_PROVISIONAL_KEY='theme-space-satellite-provisional-r1';
export const SPACE_PROVISIONAL_VERSION='THEME_SPACE_SATELLITE_PROVISIONAL_R1';
export const SPACE_PROVISIONAL_METHOD='ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_AUM_DATE_ELIGIBLE_SINGLE_R32';
export const SPACE_PROVISIONAL_PRICE_MODE=
 'GMH_UNADJUSTED_15_HOURLY_PROXY_PLUS_MARKETPARQUET_SPLIT_ADJUSTED_EOD';

const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const stamp=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const score=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const allowed=new Set(['UFO','NASA','WARP','ROKT']);

export function validSpaceProvisionalR1(record,space,{now=Date.now(),storedAt=now}={}){
 if(space?.theme!=='우주·위성'||space.history?.length!==252||
  !score(space.score)||space.history.at(-1)?.score!==space.score)return false;
 const confirmedDate=space.history.at(-1)?.date;
 if(!date(confirmedDate)||record?.status!=='READY'||record.phase!=='PROVISIONAL'||
  record.version!==SPACE_PROVISIONAL_VERSION||record.theme!=='우주·위성'||
  record.referenceSymbol!=='SPY'||record.methodologyVersion!==SPACE_PROVISIONAL_METHOD||
  record.sourcePriceMode!==SPACE_PROVISIONAL_PRICE_MODE||
  record.sourceName!=='MARKETPARQUET_ALREADY_STORED_SEVEN_THEME_ARCHIVE'||
  record.individualStocksUsed!==0||record.approvedBasket!==true||
  record.publicationAuthorized!==true||record.derivedOnlyNoRaw!==true||
  record.sourcePriceReconciled!==false||record.upstreamCommercialRightsVerified!==false||
  record.derivedLicenseVerified!==false||
  !/^SPACE_R8_[a-f0-9]{64}$/.test(record.sourceVersion??'')||
  record.confirmedObservationDate!==confirmedDate||record.confirmedScore!==space.score)return false;
 if(!stamp(record.asOf)||!stamp(record.sourceStoredAt)||
  !Number.isSafeInteger(Number(storedAt))||
  [Date.parse(record.asOf),Date.parse(record.sourceStoredAt),Number(storedAt)]
   .some(t=>t>now||now-t>=PUBLIC_DISPLAY_MAX_AGE_MS))return false;
 const points=record.points;
 if(!Array.isArray(points)||points.length<1||points.length>2||
  record.observationDate!==points.at(-1)?.date)return false;
 let previous=confirmedDate;
 for(const p of points){
  if(!date(p?.date)||p.date<=previous||Date.parse(p.date+'T00:00:00Z')>now||
   !score(p.score)||!Array.isArray(p.etfs)||p.etfs.length<3||
   new Set(p.etfs).size!==p.etfs.length||p.etfs.some(s=>!allowed.has(s))||
   !p.weightsPercent||Object.keys(p.weightsPercent).length!==p.etfs.length||
   p.etfs.some(s=>!Number.isFinite(p.weightsPercent[s])||p.weightsPercent[s]<=0)||
   Math.abs(p.etfs.reduce((n,s)=>n+p.weightsPercent[s],0)-100)>0.02)return false;
  previous=p.date;
 }
 if(now-Date.parse(record.observationDate+'T23:59:59Z')>=PUBLIC_DISPLAY_MAX_AGE_MS||
  !Array.isArray(record.sourceFiles)||record.sourceFiles.length!==points.length+1||
  record.sourceFiles[0]?.date!==confirmedDate||
  record.sourceFiles.some((f,i)=>!date(f?.date)||!sha(f?.sha256)||
   (i>0&&f.date!==points[i-1].date))||
  !record.aumAsOf||['UFO','NASA','WARP','ROKT'].some(s=>
   !date(record.aumAsOf[s])||record.aumAsOf[s]>confirmedDate))return false;
 if(!record.overlapPriceDifferences||
  ['UFO','NASA','ROKT','SPY'].some(s=>
   !Number.isFinite(record.overlapPriceDifferences[s])||
   record.overlapPriceDifferences[s]<0||record.overlapPriceDifferences[s]>0.05))return false;
 return true;
}

export async function addVerifiedSpaceProvisionalR1(db,base,{now=Date.now()}={}){
 if(base?.status!=='READY'||!Array.isArray(base.themes))return base;
 const space=base.themes.find(t=>t.theme==='우주·위성');
 if(!space)return base;
 let row;
 try{row=await db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'")
  .bind(SPACE_PROVISIONAL_KEY).first();}catch{return base;}
 if(!row)return base;
 let record;try{record=JSON.parse(row.body);}catch{return base;}
 if(!validSpaceProvisionalR1(record,space,{now,storedAt:Number(row.stored_at)}))return base;
 const previous=base.phase==='PROVISIONAL'&&Array.isArray(base.provisional?.points)?
  base.provisional.points:[];
 const indexed=new Map(previous.map(p=>[p.date,{...p,scores:{...p.scores}}]));
 for(const p of record.points){
  const item=indexed.get(p.date)??{date:p.date,scores:{}};
  item.scores['우주·위성']=p.score;
  indexed.set(p.date,item);
 }
 const points=[...indexed.values()].sort((a,b)=>a.date.localeCompare(b.date));
 return {...base,phase:'PROVISIONAL',provisional:{...base.provisional,
  asOf:base.provisional?.asOf??record.asOf,points}};
}
