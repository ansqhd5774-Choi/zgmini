// W06 R4 #48: presentation-only gate for the published Supply Shock R10 release.
// R10 is five scored areas G/E/O/P/I from twelve saved inputs, not the six R9 components.
// Never re-score stored inputs, interpolate missing months or silently promote R9 to R10.
export const SUPPLY_DISPLAY_METHOD='SUPPLY_SHOCK_R10';
export const SUPPLY_DISPLAY_HISTORY='CURRENT_VINTAGE_ONLY';
const factorWeights=Object.freeze([['G',.35],['E',.25],['O',.15],['P',.15],['I',.10]]);
const finiteScore=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
const isoDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)
 &&Number.isFinite(Date.parse(v+'T00:00:00Z'))
 &&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const month=v=>typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const monthIndex=m=>Number(m.slice(0,4))*12+Number(m.slice(5,7));

export function supplyR10VerifiedDisplayScore(payload){
 if(payload?.status!=='READY'||payload.methodologyVersion!==SUPPLY_DISPLAY_METHOD
  ||payload.historyMode!==SUPPLY_DISPLAY_HISTORY||payload.lookAheadSafe!==false
  ||!finiteScore(payload.score)||!isoDate(payload.asOfDate)
  ||!month(payload.scoreObservationMonth)||payload.scoreObservationMonth>payload.asOfDate.slice(0,7)
  ||payload.inputCount!==12||typeof payload.sourceVersion!=='string'||payload.sourceVersion.length<8
  ||!Number.isSafeInteger(payload.sourceStoredAt)||payload.sourceStoredAt<=0
  ||!Array.isArray(payload.missingFactors)||payload.missingFactors.length!==0
  ||!Array.isArray(payload.indicators)||payload.indicators.length!==factorWeights.length)
  return null;
 let total=0;
 for(let i=0;i<factorWeights.length;i++){
  const [id,weight]=factorWeights[i],factor=payload.indicators[i];
  if(factor?.id!==id||factor.status!=='READY'||factor.weight!==weight
   ||!finiteScore(factor.score))return null;
  total+=factor.score*weight;
 }
 return Math.abs(total-payload.score)<=1e-7?payload.score:null;
}
export function supplyR10VerifiedDisplayTrend(payload,score){
 if(!finiteScore(score)||supplyR10VerifiedDisplayScore(payload)!==score)return [];
 const byMonth=new Map(),conflicts=new Set(),current=payload.scoreObservationMonth;
 for(const row of Array.isArray(payload.trend)?payload.trend:[]){
  const label=row?.label,val=row?.value;
  if(!isoDate(label)||!finiteScore(val)||label.slice(8)!=='01'
   ||label.slice(0,7)>current||label>payload.asOfDate)continue;
  const observedMonth=label.slice(0,7);
  if(byMonth.has(observedMonth)&&Math.abs(byMonth.get(observedMonth).value-val)>1e-8){
   conflicts.add(observedMonth);continue;
  }
  byMonth.set(observedMonth,{label,value:val});
 }
 if(conflicts.size)return [];
 const points=[...byMonth.values()].sort((a,b)=>a.label.localeCompare(b.label));
 if(points.length<13||points.at(-1)?.label!==current+'-01'
  ||Math.abs(points.at(-1).value-score)>1e-7)return [];
 // 13 adjacent completed monthly results from the existing approved calculator.
 const tail=points.slice(-13);
 if(tail.some((p,i)=>monthIndex(p.label.slice(0,7))!==monthIndex(current)-12+i))return [];
 return tail;
}
