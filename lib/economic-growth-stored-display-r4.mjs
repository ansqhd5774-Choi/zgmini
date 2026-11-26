// W06 R4 #53 — presentation-only gate for the stored G16 growth release.
// The former D2 fallback and a 1/24 candidate are not an approved R2 score.
// The 24 input histories, percentiles, weights, publication and D1 remain
// exclusively owned by the approved growth calculator/publisher.
import {GROWTH_R2_METHOD,GROWTH_R2_FEATURES,GROWTH_R2_FEATURE_IDS,GROWTH_R2_WEIGHTS} from './market-score/growth-r2-contract.mjs';
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)
 &&Number.isFinite(Date.parse(d+'T00:00:00.000Z'))
 &&new Date(d+'T00:00:00.000Z').toISOString().slice(0,10)===d;
const releaseDate=t=>typeof t==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(t)
 &&Number.isFinite(Date.parse(t));
function deadline(t,months){
 const date=new Date(t),m=date.getUTCMonth()+months;
 return new Date(Date.UTC(date.getUTCFullYear()+Math.floor(m/12),((m%12)+12)%12,
  date.getUTCDate(),23,59,59,999));
}
export function verifiedEconomicGrowthScore(domain,asOf){
 if(domain?.id!=='growth'||domain.status!=='READY'
  ||domain.methodologyVersion!==GROWTH_R2_METHOD.methodologyVersion
  ||domain.freshness!=='STORED_D1_HISTORY_ONLY'
  ||!validDate(asOf)||!validScore(domain.score)
  ||!Array.isArray(domain.missingFactors)||domain.missingFactors.length!==0
  ||typeof domain.interpretation!=='string'
  ||!domain.interpretation.startsWith('Growth R2: 24/24 stored feature history -> expanding percentile -> approved W2 weights; no missing reweight')
  ||!Array.isArray(domain.indicators)
  ||domain.indicators.length!==GROWTH_R2_METHOD.requiredCoverage
  ||GROWTH_R2_FEATURE_IDS.length!==GROWTH_R2_METHOD.requiredCoverage)return null;
 const cutoff=Date.parse(asOf+'T23:59:59.999Z');
 let weighted=0;
 for(let i=0;i<GROWTH_R2_FEATURE_IDS.length;i++){
  const id=GROWTH_R2_FEATURE_IDS[i],factor=domain.indicators[i],contract=GROWTH_R2_FEATURES[i];
  if(factor?.id!==id||factor.status!=='READY'
   ||factor.source!==contract.provider
   ||!validScore(factor.score)||!validDate(factor.observationDate)
   ||factor.observationDate>asOf
   ||!releaseDate(factor.availableAt)||Date.parse(factor.availableAt)>cutoff
   ||deadline(factor.availableAt,GROWTH_R2_METHOD.staleIntervals).getTime()<cutoff)
   return null;
  weighted+=factor.score*GROWTH_R2_WEIGHTS[id];
 }
 return Math.abs(weighted-domain.score)<=1e-6?domain.score:null;
}
export function verifiedEconomicGrowthChart(domain,asOf,score){
 if(!validScore(score)||verifiedEconomicGrowthScore(domain,asOf)!==score)return [];
 const earliest=new Date(asOf+'T00:00:00Z');
 earliest.setUTCFullYear(earliest.getUTCFullYear()-1);
 const minDate=earliest.toISOString().slice(0,10);
 const points=new Map(),conflicts=new Set();
 for(const item of Array.isArray(domain.trend)?domain.trend:[]){
  const date=item?.label??item?.date;
  const value=item?.value===null?null:(item?.value??item?.score);
  if(!validDate(date)||date<minDate||date>asOf||!validScore(value))continue;
  if(points.has(date)&&Math.abs(points.get(date)-value)>1e-6){conflicts.add(date);continue;}
  points.set(date,value);
 }
 if(conflicts.size)return [];
 const result=[...points].sort(([a],[b])=>a.localeCompare(b)).map(([date,score])=>({date,score}));
 // The stored G16 publisher appends a same-day current point on a READY
 // release. A contradictory point is never promoted to a valid last score.
 if(result.at(-1)?.date===asOf&&Math.abs(result.at(-1).score-score)>1e-6)return [];
 return result;
}
export function isEconomicGrowthChartCurrent(points,asOf,score){
 const last=Array.isArray(points)?points.at(-1):null;
 return validDate(asOf)&&validScore(score)&&last?.date===asOf
   &&validScore(last.score)&&Math.abs(last.score-score)<=1e-6;
}
