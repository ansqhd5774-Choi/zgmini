// W06 R4 #51 — display-only protection for the approved RATE_R3 projection.
// The policy target RANGE is a display input; EFFR drives its scored axis.
// Do not re-collect, re-score, interpolate or claim that an older saved point
// is the as-of score when policy/nominal/real/curve observe on different days.
import {RATE_R3_CONTRACT} from './market-score/rate-r3.mjs';
const ids=['policy','nominal','real','curve'];
const weights=RATE_R3_CONTRACT.weights;
const validScore=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)
 &&Number.isFinite(Date.parse(d+'T00:00:00Z'))
 &&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
export function verifiedEconomicRateScore(domain,asOfDate){
 if(domain?.id!=='rates'||domain.status!=='READY'
  ||domain.modelVersion!==RATE_R3_CONTRACT.modelVersion
  ||!validScore(domain.score)||!validDate(asOfDate)
  ||!['CURRENT','SOFT_STALE'].includes(domain.freshness)
  ||typeof domain.interpretation!=='string'
  ||!domain.interpretation.startsWith('금리 R3: 정책금리 20% + 2년물 25% + 10년 실질금리 30% + 10Y-3M 장단기 금리차 25%.')
  ||(domain.updatedAt!=null&&(!validDate(domain.updatedAt)||domain.updatedAt>asOfDate))
  ||!Array.isArray(domain.indicators)||domain.indicators.length!==ids.length
  ||!Array.isArray(domain.missingFactors)||domain.missingFactors.length!==0)return null;
 let recomputed=0,policyTargetMissing=false;
 for(let i=0;i<ids.length;i++){
  const row=domain.indicators[i];
  if(row?.componentId!==ids[i]||
   (row.asOfDate!=null&&(!validDate(row.asOfDate)||row.asOfDate>asOfDate)))
   return null;
  if(i===0&&row.status==='UNAVAILABLE'&&row.score===null
   &&row.currentRange==null&&row.sourceKey==='EFFR.targetRateFrom/targetRateTo'
   &&['MISSING_RANGE_ENDPOINT','HARD_STALE'].includes(row.unavailableReason)){
   // This *display-only* target range may be absent while EFFR gives a
   // valid approved policy score. No false inference that its score is 0.
   policyTargetMissing=true;continue;
  }
  if(row.status!=='READY'||!validScore(row.score)
   ||!validDate(row.asOfDate))return null;
  recomputed+=row.score*weights[ids[i]];
 }
 // When the policy target is absent, its true EFFR score isn't exposed in
 // four display rows. Keep the published R3 score only with strict model
 // identity + the legitimate target exception above, never invent parity.
 return policyTargetMissing||
   Math.abs(recomputed-domain.score)<=1e-6?domain.score:null;
}
export function verifiedEconomicRateChart(domain,asOfDate,headline){
 if(!validScore(headline)||verifiedEconomicRateScore(domain,asOfDate)!==headline)return [];
 const earliest=new Date(asOfDate+'T00:00:00Z');earliest.setUTCFullYear(earliest.getUTCFullYear()-1);
 const start=earliest.toISOString().slice(0,10);
 const points=new Map(),conflicts=new Set();
 for(const item of Array.isArray(domain?.trend)?domain.trend:[]){
  const date=item?.date??item?.label;
  const value=item?.score===null?null:(item?.score??item?.value);
  if(!validDate(date)||date<start||date>asOfDate||!validScore(value))continue;
  if(points.has(date)&&Math.abs(points.get(date)-value)>1e-6){conflicts.add(date);continue;}
  points.set(date,value);
 }
 if(conflicts.size)return [];
 const out=[...points].sort(([a],[b])=>a.localeCompare(b))
  .map(([date,score])=>({date,score}));
 // Do not show a purported current as-of point with a different score.
 if(out.at(-1)?.date===asOfDate&&Math.abs(out.at(-1).score-headline)>1e-6)return [];
 return out;
}
export function isEconomicRateChartCurrent(points,asOfDate,headline){
 const last=Array.isArray(points)?points.at(-1):null;
 return validDate(asOfDate)&&validScore(headline)&&last?.date===asOfDate
  &&validScore(last.score)&&Math.abs(last.score-headline)<=1e-6;
}
