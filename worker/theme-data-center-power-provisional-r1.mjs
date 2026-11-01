// Additive, D1-only 10th-theme provisional sidecar. Confirmed 252 sessions
// and the other themes are never rewritten by this reader.
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';

export const DC_POWER_PROVISIONAL_KEY='theme-data-center-power-provisional-r1';
export const DC_POWER_PROVISIONAL_VERSION='THEME_DATA_CENTER_POWER_PROVISIONAL_R1';
export const DC_POWER_PROVISIONAL_METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
export const DC_POWER_PROVISIONAL_PRICE_MODE=
 'GMH_UNADJUSTED_15_HOURLY_PROXY_PLUS_MARKETPARQUET_SPLIT_ADJUSTED_EOD';

const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const stamp=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const score=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);

export function validDcPowerProvisionalR1(record,dc,{now=Date.now(),storedAt=now}={}){
 if(dc?.theme!=='데이터센터·전력'||dc.etfs?.join(',')!=='DTCR,GRID'||
  dc.history?.length!==252||!score(dc.score)||dc.history.at(-1)?.score!==dc.score)return false;
 const baseDate=dc.history.at(-1)?.date;
 if(!date(baseDate)||record?.status!=='READY'||record.phase!=='PROVISIONAL'||
  record.version!==DC_POWER_PROVISIONAL_VERSION||record.theme!=='데이터센터·전력'||
  record.etfs?.join(',')!=='DTCR,GRID'||record.referenceSymbol!=='SPY'||
  record.methodologyVersion!==DC_POWER_PROVISIONAL_METHOD||
  record.sourcePriceMode!==DC_POWER_PROVISIONAL_PRICE_MODE||
  record.sourceName!=='MARKETPARQUET_ALREADY_STORED_SEVEN_THEME_ARCHIVE'||
  record.individualStocksUsed!==0||record.publicationAuthorized!==true||
  record.licensingRiskAcceptedByPublisher!==true||
  record.derivedOnlyNoRaw!==true||record.sourcePriceReconciled!==false||
  record.upstreamCommercialRightsVerified!==false||record.derivedLicenseVerified!==false||
  !/^DC_POWER_R8_[a-f0-9]{64}$/.test(record.sourceVersion??'')||
  record.confirmedObservationDate!==baseDate||record.confirmedScore!==dc.score)return false;
 if(!stamp(record.asOf)||!stamp(record.sourceStoredAt)||
  !Number.isSafeInteger(Number(storedAt))||
  [Date.parse(record.asOf),Date.parse(record.sourceStoredAt),Number(storedAt)]
   .some(t=>t>now||now-t>=PUBLIC_DISPLAY_MAX_AGE_MS))return false;
 const points=record.points;
 if(!Array.isArray(points)||points.length<1||points.length>2||
  record.observationDate!==points.at(-1)?.date||
  now-Date.parse(record.observationDate+'T23:59:59Z')>=PUBLIC_DISPLAY_MAX_AGE_MS)return false;
 let previous=baseDate;
 for(const p of points){
  if(!date(p?.date)||p.date<=previous||Date.parse(p.date+'T00:00:00Z')>now||
   !score(p.score)||p.etfs?.join(',')!=='DTCR,GRID')return false;
  previous=p.date;
 }
 if(!Array.isArray(record.sourceFiles)||record.sourceFiles.length!==points.length+1||
  record.sourceFiles[0]?.date!==baseDate||
  record.sourceFiles.some((f,i)=>!date(f?.date)||!sha(f?.sha256)||
   (i>0&&f.date!==points[i-1].date)))return false;
 if(!record.overlapPriceDifferences||['DTCR','GRID','SPY'].some(s=>
  !Number.isFinite(record.overlapPriceDifferences[s])||
  record.overlapPriceDifferences[s]<0||record.overlapPriceDifferences[s]>0.05))return false;
 return true;
}

export async function addVerifiedDcPowerProvisionalR1(db,base,{now=Date.now()}={}){
 if(base?.status!=='READY'||!Array.isArray(base.themes))return base;
 const dc=base.themes.find(t=>t.theme==='데이터센터·전력');
 if(!dc)return base;
 let row;
 try{row=await db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'")
  .bind(DC_POWER_PROVISIONAL_KEY).first();}catch{return base;}
 if(!row)return base;
 let record;try{record=JSON.parse(row.body);}catch{return base;}
 if(!validDcPowerProvisionalR1(record,dc,{now,storedAt:Number(row.stored_at)}))return base;
 const previous=base.phase==='PROVISIONAL'&&Array.isArray(base.provisional?.points)?
  base.provisional.points:[];
 const indexed=new Map(previous.map(p=>[p.date,{...p,scores:{...p.scores}}]));
 for(const p of record.points){
  const item=indexed.get(p.date)??{date:p.date,scores:{}};
  item.scores['데이터센터·전력']=p.score;
  indexed.set(p.date,item);
 }
 const points=[...indexed.values()].sort((a,b)=>a.date.localeCompare(b.date));
 return {...base,phase:'PROVISIONAL',provisional:{...base.provisional,
  asOf:base.provisional?.asOf??record.asOf,points}};
}
