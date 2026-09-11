// PHASE 2C research only: never a production index or a weight recommendation.
import {distribution,quantile,correlation,changePoints} from './phase2-korea-analysis.mjs';
import {period} from './phase1-korea.mjs';

export const METHODOLOGY_POLICY=Object.freeze({maxObservations:6000,window:252,longWindow:504,winsorLower:.01,winsorUpper:.99,zClip:3,overlapWarning:.80,extremeDates:10});
const valid=x=>typeof x==='number'&&Number.isFinite(x);
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
const fraction=(n,d)=>d?n/d:null;
export const RIGHTS=Object.freeze({
 leverage:{rightsStatus:'FSC_CONFIRMED_PER_RESEARCH_BRIEF',productionEligible:true},
 liquidation:{rightsStatus:'FSC_CONFIRMED_PER_RESEARCH_BRIEF',productionEligible:true},
 creditSpread:{rightsStatus:'BOK_RIGHTS_UNCONFIRMED',productionEligible:false},
 usdkrw:{rightsStatus:'BOK_RIGHTS_UNCONFIRMED',productionEligible:false}
});
export function preparePoints(input=[]){
 if(input.length>METHODOLOGY_POLICY.maxObservations)throw Error('METHODOLOGY_INPUT_LIMIT');
 const dates=new Map();
 for(const p of input){if(!period(p.date,'D'))continue;const value=p.stale||!valid(p.value)?null:p.value;
  if(!dates.has(p.date))dates.set(p.date,value);else if(dates.get(p.date)!==value)dates.set(p.date,null);
 }
 return [...dates].sort(([a],[b])=>a.localeCompare(b)).map(([date,value])=>({date,value}));
}
export function winsorize(values,lower=.01,upper=.99){
 const sorted=[...values].sort((a,b)=>a-b),lo=quantile(sorted,lower),hi=quantile(sorted,upper);
 return values.map(v=>clamp(v,lo,hi));
}
export function percentileScore(values,current){
 if(values.length<2)return null;
 const less=values.filter(v=>v<current).length,equal=values.filter(v=>v===current).length;
 // Average tied rank, scaled from rank 1..n to 0..100. Constant window = 50.
 return clamp(100*(less+(equal-1)/2)/(values.length-1),0,100);
}
export function rollingScores(points,{window=252,method='percentile',winsor=false,log=false,inverse=false}={}){
 const transformed=points.map(p=>({...p,value:valid(p.value)&&(!log||p.value>=0)?log?Math.log1p(p.value):p.value:null}));
 return transformed.map((p,i)=>{
  if(i<window-1)return {date:p.date,value:null,reason:'WARM_UP'};
  let values=transformed.slice(i-window+1,i+1).map(x=>x.value);
  if(values.some(v=>!valid(v)))return {date:p.date,value:null,reason:'MISSING_WINDOW'};
  if(winsor)values=winsorize(values);
  const current=values.at(-1);let score;
  if(method==='z-score'){
   const d=distribution(values);if(!d.stdDev)return {date:p.date,value:null,reason:'ZERO_VARIANCE'};
   score=50+50*clamp((current-d.mean)/d.stdDev,-3,3)/3;
  }else score=percentileScore(values,current);
  return {date:p.date,value:inverse?100-score:score,reason:null};
 });
}
export function changes(points,h){
 const c=changePoints(points,h);
 return points.map((p,i)=>({date:p.date,value:i<h||!valid(p.value)||!valid(points[i-h].value)||points[i-h].value<=0?null:c[i-h].value}));
}
// Changes need h observations before their own full rolling window begins.
function rollingChanges(points,h,options={}){
 return [...points.slice(0,h).map(p=>({date:p.date,value:null,reason:'CHANGE_WARM_UP'})),...rollingScores(changes(points,h).slice(h),options)];
}
export function blendScores(a,b,weightA=.6){
 const bm=new Map(b.map(p=>[p.date,p.value]));
 return a.map(p=>({date:p.date,value:valid(p.value)&&valid(bm.get(p.date))?weightA*p.value+(1-weightA)*bm.get(p.date):null}));
}
function autocorrelation(points,h){
 const previous=points.slice(h).map((p,i)=>({date:p.date,value:points[i].value}));
 return correlation(points.slice(h),previous);
}
export function scoreQuality(points){
 const usable=points.filter(p=>valid(p.value)),d=distribution(usable.map(p=>p.value));
 const signed=points.slice(1).map((p,i)=>valid(p.value)&&valid(points[i].value)?p.value-points[i].value:null).filter(valid);
 const jumps=distribution(signed.map(Math.abs));
 return {availableObservationCount:usable.length,firstUsableDate:usable[0]?.date??null,latestUsableDate:usable.at(-1)?.date??null,missingScoreCount:points.length-usable.length,
  mean:d.mean,stdDev:d.stdDev,p05:d.p05,p25:d.p25,p50:d.median,p75:d.p75,p95:d.p95,min:d.min,max:d.max,
  dayToDayScoreChangeMean:jumps.mean,dayToDayScoreChangeP95:jumps.p95,maxDailyJump:jumps.max,medianDailyChange:jumps.median,signedScoreChangeMean:distribution(signed).mean,
  saturationAtZero: fraction(usable.filter(p=>p.value===0).length,usable.length),saturationAtHundred:fraction(usable.filter(p=>p.value===100).length,usable.length),
  below20Frequency:fraction(usable.filter(p=>p.value<20).length,usable.length),above80Frequency:fraction(usable.filter(p=>p.value>80).length,usable.length),
  autocorrelation5:autocorrelation(points,5),autocorrelation20:autocorrelation(points,20),
  changeDefinition:'absolute consecutive-observation score change; missing observations break pairs; not interpolated calendar days',
  reactionLag:'UNASSESSED_WITHOUT_BENCHMARK'};
}
export function normalizeWeights(weights){
 if(!weights.length||weights.some(w=>!valid(w)||w<0)||weights.reduce((s,w)=>s+w,0)<=0)throw Error('INVALID_WEIGHTS');
 const sum=weights.reduce((s,w)=>s+w,0);return weights.map(w=>w/sum);
}
export function compositeScores(components,weights,policy='all-required'){
 if(components.length!==weights.length)throw Error('WEIGHT_COMPONENT_MISMATCH');
 const w=normalizeWeights(weights),maps=components.map(p=>new Map(p.map(x=>[x.date,x.stale?null:x.value])));
 const dates=[...new Set(components.flatMap(p=>p.map(x=>x.date)))].sort();
 return dates.map(date=>{
  const scores=maps.map(m=>m.get(date)??null),available=scores.map((v,i)=>valid(v)?i:null).filter(i=>i!==null);
  const permitted=available.length===components.length||policy==='one-missing-renormalize'&&available.length===components.length-1;
  const sum=available.reduce((s,i)=>s+w[i],0);
  return {date,value:permitted&&sum>0?available.reduce((s,i)=>s+scores[i]*w[i],0)/sum:null,componentScores:scores,missingComponentCount:components.length-available.length};
 });
}
export function extremeDates(points,count=10){
 const eligible=points.filter(p=>valid(p.value));
 const publicPoint=p=>({date:p.date,compositeScore:p.value,componentScores:p.componentScores});
 return {lowest:[...eligible].sort((a,b)=>a.value-b.value||a.date.localeCompare(b.date)).slice(0,count).map(publicPoint),highest:[...eligible].sort((a,b)=>b.value-a.value||a.date.localeCompare(b.date)).slice(0,count).map(publicPoint)};
}
export function researchWeights(){
 const grid=[];for(let a=20;a<=50;a+=5)for(let b=20;b<=50;b+=5){const c=100-a-b;if(c>=20&&c<=50)grid.push({id:`GRID_${a}_${b}_${c}`,weights:[a,b,c]});}
 return [{id:'MODEL_A_EQUAL',weights:[1,1,1]},{id:'MODEL_B_MARKET_DIRECT',weights:[40,35,25]},{id:'MODEL_C_STRESS_BALANCED',weights:[35,35,30]},...grid];
}
function coverage(points){const a=points.filter(p=>valid(p.value));return {dateCount:points.length,usableCount:a.length,usableFraction:fraction(a.length,points.length),firstUsableDate:a[0]?.date??null,latestUsableDate:a.at(-1)?.date??null};}
export function runMethodologyResearch(input={}){
 const sources=Object.fromEntries(Object.keys(RIGHTS).map(k=>[k,preparePoints(input[k]?.points??[])]));
 // Negative forced-sale amounts are invalid, not passed through log1p.
 sources.liquidation=sources.liquidation.map(p=>({...p,value:p.value!==null&&p.value<0?null:p.value}));
 const candidates={};
 const add=(id,axis,points,spec)=>{candidates[id]={id,axis,points,spec};return points;};
 const l20=add('LEV_CHANGE20_P252','leverage',rollingChanges(sources.leverage,20),{change:20,window:252,method:'percentile'});
 const l60=add('LEV_CHANGE60_P252','leverage',rollingChanges(sources.leverage,60),{change:60,window:252,method:'percentile'});
 add('LEV_BLEND20_60','leverage',blendScores(l20,l60),{blend:[.6,.4],inputs:['LEV_CHANGE20_P252','LEV_CHANGE60_P252']});
 add('LEV_CHANGE20_Z252','leverage',rollingChanges(sources.leverage,20,{method:'z-score',winsor:true}),{change:20,window:252,method:'z-score',winsor:[.01,.99],clip:[-3,3]});
 add('LIQ_LEVEL_P252','liquidation',rollingScores(sources.liquidation,{inverse:true}),{window:252,method:'percentile',inverse:true});
 add('LIQ_LOG1P_P252','liquidation',rollingScores(sources.liquidation,{log:true,inverse:true}),{window:252,method:'log1p then percentile',inverse:true});
 add('LIQ_WINSOR_P252','liquidation',rollingScores(sources.liquidation,{winsor:true,inverse:true}),{window:252,method:'winsor percentile',winsor:[.01,.99],inverse:true});
 const spread252=add('SPREAD_LEVEL_P252','creditSpread',rollingScores(sources.creditSpread,{inverse:true}),{window:252,method:'percentile',inverse:true});
 add('SPREAD_LEVEL_P504','creditSpread',rollingScores(sources.creditSpread,{window:504,inverse:true}),{window:504,method:'percentile',inverse:true});
 add('SPREAD_LEVEL_Z252','creditSpread',rollingScores(sources.creditSpread,{method:'z-score',inverse:true}),{window:252,method:'z-score',clip:[-3,3],inverse:true});
 add('SPREAD_BLEND_LEVEL_CHANGE20','creditSpread',blendScores(spread252,rollingChanges(sources.creditSpread,20,{inverse:true}),.5),{blend:[.5,.5],inputs:['level P252','change20 P252'],inverse:true});
 add('FX_LEVEL_P252','usdkrw',rollingScores(sources.usdkrw,{inverse:true}),{window:252,method:'percentile',inverse:true,role:'AUXILIARY_ONLY'});
 add('FX_CHANGE20_P252','usdkrw',rollingChanges(sources.usdkrw,20,{inverse:true}),{window:252,change:20,method:'percentile',inverse:true,role:'AUXILIARY_ONLY'});
 const list=Object.values(candidates);
 const componentCorrelations=list.flatMap((a,i)=>list.slice(i+1).filter(b=>a.axis!==b.axis).map(b=>{const r=correlation(a.points,b.points);return {left:a.id,right:b.id,...r,overlapWarning:r.pearson!==null&&(Math.abs(r.pearson)>=.8||Math.abs(r.spearman)>=.8),automaticRejection:false};}));
 const baseline=['LEV_BLEND20_60','LIQ_LEVEL_P252','SPREAD_LEVEL_P252'],componentPoints=baseline.map(id=>candidates[id].points),cache=new Map();
 const models=researchWeights().map(model=>{
  const weights=normalizeWeights(model.weights),key=weights.join(',');let computed=cache.get(key);
  if(!computed){const strict=compositeScores(componentPoints,weights),remaining=compositeScores(componentPoints,weights,'one-missing-renormalize');computed={strict,quality:scoreQuality(strict),coverage:{allRequired:coverage(strict),oneMissingRenormalized:coverage(remaining),policy:'exact-date availability; no forward fill; stale flags treated as missing; at most one missing'}};cache.set(key,computed);}
  return {id:model.id,weights,componentCandidates:baseline,quality:computed.quality,coverage:computed.coverage,...(!model.id.startsWith('GRID_')?{extremes:extremeDates(computed.strict)}:{}),productionEligible:false};
 });
 const base=compositeScores(componentPoints,[1,1,1]);
 const auxiliary=['FX_LEVEL_P252','FX_CHANGE20_P252'].map(id=>{
  const four=compositeScores([...componentPoints,candidates[id].points],[1,1,1,1]);
  const comparison=correlation(base,four),bm=new Map(base.map(p=>[p.date,p.value]));
  const delta=distribution(four.filter(p=>valid(p.value)&&valid(bm.get(p.date))).map(p=>p.value-bm.get(p.date)));
  return {candidate:id,weights:[.25,.25,.25,.25],quality:scoreQuality(four),coverage:coverage(four),versusThreeAxis:comparison,scoreDifferenceSummary:delta,informationGain:'NOT_ESTABLISHED_WITHOUT_VALIDATION_TARGET',productionEligible:false};
 });
 const logDifference=distribution(candidates.LIQ_LEVEL_P252.points.map((p,i)=>valid(p.value)&&valid(candidates.LIQ_LOG1P_P252.points[i]?.value)?Math.abs(p.value-candidates.LIQ_LOG1P_P252.points[i].value):null));
 return {researchOnly:true,productionEligible:false,rights:RIGHTS,policy:{...METHODOLOGY_POLICY,lookAhead:'current observation and past only; no future values',vintageCaveat:'historical releases/revisions are not point-in-time vintages',warmUp:'full window only; change horizon adds its own warm-up',ties:'average tied rank scaled to 0..100; constant percentile=50; zero-variance z-score=null',daily:'observation-to-observation, not calendar-day interpolation',winsor:'rolling window only, including current observation',zTransform:'clip z to [-3,3], then 50+50*z/3',componentOrder:['leverage','liquidation','creditSpread'],baseline:'illustrative normalization bundle, not selected as optimal',weightSelection:'NO_BEST_WEIGHT_NO_VALIDATION_TARGET',gridExtremeOutput:'top/bottom dates emitted for A/B/C only; grid emits quality and coverage'},
  normalizationCandidates:list.map(c=>({id:c.id,axis:c.axis,spec:c.spec,rights:RIGHTS[c.axis],quality:scoreQuality(c.points)})),
  componentCorrelations,models,auxiliary,logPercentileComparison:{maxAbsoluteScoreDifference:logDifference.max,note:'log1p is monotonic: percentile ranks should match except numerical ties; it does not add independent information'},
  status:['leverage','liquidation','creditSpread'].some(k=>sources[k].length<2)?'PARTIAL_MISSING_INPUT':base.some(p=>valid(p.value))?'RESEARCH_COMPUTED':'INSUFFICIENT_USABLE_HISTORY',
  exclusions:['CCSI','CMA','KOSIS_PHASE1_SERIES','LIQUIDATION_RATIO'],finalWeights:null};
}
