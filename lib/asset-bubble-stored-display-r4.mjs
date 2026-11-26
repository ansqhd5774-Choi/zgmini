// W06 R4 #46: presentation-only gate for the separately published asset R9/R10 score.
// This never recalculates, reweights, publishes, or alters stored diagnostic inputs.
export const ASSET_R9_METHOD='ASSET_BUBBLE_R9';
export const ASSET_R10_METHOD='ASSET_BUBBLE_R10_CANDIDATE';
const weights=Object.freeze([
 ['valuationPressure',.30],['priceAcceleration',.20],['riskAssetShare',.15],
 ['speculativeFlows',.10],['breadthDivergence',.15],['excessLiquidity',.10],
]);
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const quarter=x=>typeof x==='string'&&/^\d{4}-Q[1-4]$/.test(x);
const endOfQuarter=q=>quarter(q)?new Date(Date.UTC(Number(q.slice(0,4)),Number(q.at(-1))*3,0)).toISOString().slice(0,10):null;

export function assetBubbleVerifiedDisplayScore(payload){
 if(payload?.status!=='READY'||!validScore(payload?.score)||!date(payload?.asOfDate))return null;
 if(payload.methodologyVersion===ASSET_R9_METHOD){
  return payload.historyMode==='CURRENT_VINTAGE_DERIVED_1Y'&&payload.lookAheadSafe===false
   ?payload.score:null;
 }
 if(payload.methodologyVersion!==ASSET_R10_METHOD)return null;
 if(payload.historyMode!=='CURRENT_VINTAGE_ONLY'||payload.lookAheadSafe!==false||
  payload.rightsStatus!=='USER_ACCEPTED_UNVERIFIED'||
  payload.publicationPolicy!=='USER_APPROVED_CURRENT_VINTAGE_UNVERIFIED_SOURCES'||
  payload.productionEligible!==true||
  payload.priceQuality!=='PROVIDER_DECLARED_WITH_QUARANTINE'||
  typeof payload.sourceVersion!=='string'||payload.sourceVersion.length<8||
  !Number.isSafeInteger(payload.sourceStoredAt)||payload.sourceStoredAt<=0||
  !quarter(payload.scoreObservationQuarter)||!quarter(payload.diagnosticQuarter)||
  payload.scoreObservationQuarter>payload.diagnosticQuarter||
  endOfQuarter(payload.scoreObservationQuarter)>payload.asOfDate||
  !Array.isArray(payload.notes)||payload.notes.length<2||
  !Array.isArray(payload.indicators)||payload.indicators.length!==weights.length)
  return null;
 let calculated=0;
 for(let i=0;i<weights.length;i++){
  const [id,weight]=weights[i],row=payload.indicators[i];
  if(row?.id!==id||row.status!=='READY'||!validScore(row.score)||
   (row.weight!==undefined&&row.weight!==weight))return null;
  calculated+=row.score*weight;
 }
 return Math.abs(calculated-payload.score)<=1e-7?payload.score:null;
}
export function assetBubbleVerifiedDisplayTrend(payload,score){
 if(!validScore(score)||assetBubbleVerifiedDisplayScore(payload)!==score)return [];
 const r10=payload.methodologyVersion===ASSET_R10_METHOD,byDate=new Map(),conflicts=new Set();
 for(const row of Array.isArray(payload?.trend)?payload.trend:[]){
  const day=row?.label,val=row?.value;
  if(!date(day)||day>payload.asOfDate||!validScore(val))continue;
  if(r10&&(!quarter(row.quarter)||endOfQuarter(row.quarter)!==day))continue;
  if(byDate.has(day)&&byDate.get(day)!==val){conflicts.add(day);continue;}
  byDate.set(day,val);
 }
 const points=[...byDate].filter(([day])=>!conflicts.has(day))
  .sort(([a],[b])=>a.localeCompare(b))
  .map(([label,value])=>({label,value}));
 if(!r10)return points;
 const final=points.at(-1);
 // A READY R10 headline belongs to the last *completed* approved quarter,
 // not the newer incomplete diagnostic quarter or any R9-derived point.
 return final?.label===endOfQuarter(payload.scoreObservationQuarter)&&
  Math.abs(final.value-score)<=1e-7?points:[];
}
