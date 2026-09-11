// PHASE 2B research only. No index scores, weights or persistent storage.
import {numeric,period} from './phase1-korea.mjs';
export const QUALITY_POLICY=Object.freeze({freshCalendarLagDays:7,minHistoryYears:3,targetHistoryYears:5,sparseMedianGapDays:4,reviewMaxGapDays:14,maxMissingFraction:0.02,rollingObservations:252,changeHorizons:[1,5,20,60],structuralMedianGrowth:0.5});
const DAY=86400000;
const finite=v=>Number.isFinite(v)?v:null;
export const dayNumber=d=>Date.parse(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T00:00:00Z`)/DAY;
export function quantile(sorted,p){if(!sorted.length)return null;const x=(sorted.length-1)*p,i=Math.floor(x);return finite(sorted[i]*(1-(x-i))+(sorted[Math.min(i+1,sorted.length-1)])*(x-i));}
export function distribution(values){
 const a=values.filter(v=>typeof v==='number'&&Number.isFinite(v)).sort((a,b)=>a-b),n=a.length;
 if(!n)return {count:0,min:null,max:null,mean:null,median:null,p05:null,p25:null,p75:null,p95:null,stdDev:null};
 const scale=Math.max(Math.abs(a[0]),Math.abs(a[n-1]))||1,meanScaled=a.reduce((sum,v)=>sum+v/scale,0)/n;
 const variance=a.reduce((sum,v)=>sum+(v/scale-meanScaled)**2,0)/n;
 return {count:n,min:a[0],max:a[n-1],mean:finite(meanScaled*scale),median:quantile(a,.5),p05:quantile(a,.05),p25:quantile(a,.25),p75:quantile(a,.75),p95:quantile(a,.95),stdDev:finite(Math.sqrt(variance)*scale)};
}
export function changePoints(points,horizon){
 return points.slice(horizon).map((p,i)=>{const base=points[i],value=base.value>0?finite((p.value/base.value-1)*100):null;return {date:p.date,baseDate:base.date,value};});
}
export function pearson(x,y){
 if(x.length!==y.length||x.length<3)return null;
 const scaleX=Math.max(...x.map(Math.abs))||1,scaleY=Math.max(...y.map(Math.abs))||1;
 const a=x.map(v=>v/scaleX),b=y.map(v=>v/scaleY),mx=a.reduce((s,v)=>s+v,0)/a.length,my=b.reduce((s,v)=>s+v,0)/b.length;
 let xy=0,xx=0,yy=0;for(let i=0;i<a.length;i++){xy+=(a[i]-mx)*(b[i]-my);xx+=(a[i]-mx)**2;yy+=(b[i]-my)**2;}
 return xx>0&&yy>0?Math.max(-1,Math.min(1,xy/Math.sqrt(xx*yy))):null;
}
export function ranks(values){const ordered=values.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v),out=[];for(let i=0;i<ordered.length;){let j=i+1;while(j<ordered.length&&ordered[j].v===ordered[i].v)j++;for(let k=i;k<j;k++)out[ordered[k].i]=(i+1+j)/2;i=j;}return out;}
export function correlation(a,b,changes=false){
 const key=p=>changes?`${p.date}/${p.baseDate}`:p.date;
 const bm=new Map(b.filter(p=>p.value!==null&&Number.isFinite(p.value)).map(p=>[key(p),p.value]));
 const pairs=a.filter(p=>p.value!==null&&Number.isFinite(p.value)&&bm.has(key(p))).map(p=>[p.value,bm.get(key(p))]);
 const x=pairs.map(p=>p[0]),y=pairs.map(p=>p[1]),r=pearson(x,y);
 return {overlapCount:pairs.length,pearson:r,spearman:pearson(ranks(x),ranks(y)),status:pairs.length<3?'NOT_ENOUGH_OVERLAP':r===null?'ZERO_VARIANCE':'AVAILABLE',alignment:changes?'same end AND baseline observation date':'same observation date'};
}
export function rollingFeasibility(points,kind){
 const window=252;let eligible=0,zeroVariance=0,invalid=0;
 for(let end=window;end<=points.length;end++){
  const v=points.slice(end-window,end).map(p=>p.value);
  if(v.some(x=>x===null||!Number.isFinite(x))){invalid++;continue;}
  if(kind==='z-score'&&v.every(x=>x===v[0])){zeroVariance++;continue;}eligible++;
 }
 return {windowObservations:window,eligibleWindowCount:eligible,zeroVarianceWindowCount:zeroVariance,invalidWindowCount:invalid,status:points.length<window?'NOT_ENOUGH_HISTORY':eligible?'AVAILABLE':zeroVariance?'ZERO_VARIANCE':'NO_VALID_WINDOW'};
}
export function analyzeSeries(rows,{operation,field,nowDate,complete=true,unit=null,unitSource=null,category=null}){
 const grouped=new Map();let missingValueCount=0,nonNumericValueCount=0,numericValueCount=0,invalidDateCount=0,datedNumericCount=0;
 for(const r of rows){const raw=r?.[field],v=numeric(raw),date=period(r?.basDt,'D');
  if(raw===null||raw===undefined||(typeof raw==='string'&&!raw.trim()))missingValueCount++;else if(v===null)nonNumericValueCount++;
  if(v!==null)numericValueCount++;if(!date){invalidDateCount++;continue;}
  if(!grouped.has(date))grouped.set(date,[]);grouped.get(date).push(v);if(v!==null)datedNumericCount++;
 }
 let duplicateDateCount=0,conflictingDateCount=0,conflictingNumericRows=0;const points=[];
 for(const [date,values] of grouped){duplicateDateCount+=values.length-1;const valid=values.filter(v=>v!==null),unique=[...new Set(valid)];if(unique.length>1){conflictingDateCount++;conflictingNumericRows+=valid.length;}else if(unique.length===1)points.push({date,value:unique[0]});}
 points.sort((a,b)=>a.date.localeCompare(b.date));
 const first=points[0]?.date??null,last=points.at(-1)?.date??null,span=first?dayNumber(last)-dayNumber(first):0;
 const gaps=points.slice(1).map((p,i)=>dayNumber(p.date)-dayNumber(points[i].date)).sort((a,b)=>a-b);
 const medianGapDays=quantile(gaps,.5),maxGapDays=gaps.at(-1)??null,latestLagDays=last?dayNumber(nowDate)-dayNumber(last):null;
 const years=span/365.2425,flags=[];
 const sparse=points.length<2||(medianGapDays??0)>QUALITY_POLICY.sparseMedianGapDays||(rows.length>0&&(missingValueCount+nonNumericValueCount)/rows.length>QUALITY_POLICY.maxMissingFraction);
 if(last)flags.push(latestLagDays>=0&&latestLagDays<=7?'FRESH':'STALE');
 if(sparse)flags.push('SPARSE');if(years<3)flags.push('INSUFFICIENT_HISTORY');if(!complete)flags.push('INCOMPLETE_FETCH');if(conflictingDateCount)flags.push('CONFLICTING_DATES');
 if((maxGapDays??0)>14)flags.push('LONG_GAP_REVIEW');
 if(complete&&years>=3&&!sparse&&!conflictingDateCount&&flags.includes('FRESH')&&!flags.includes('LONG_GAP_REVIEW'))flags.push('GOOD');
 const changeMap=Object.fromEntries([1,5,20,60].map(h=>[h,changePoints(points,h)]));
 const changeSummaries=Object.fromEntries(Object.entries(changeMap).map(([h,p])=>[h,{...distribution(p.map(x=>x.value)),excludedDenominatorOrNonfiniteCount:p.filter(x=>x.value===null).length,horizonType:'observations, not calendar days'}]));
 const firstEnd=first?anniversary(first,12):null,lastStart=last?anniversary(last,-12):null;
 const initial=distribution(points.filter(p=>firstEnd&&p.date<firstEnd).map(p=>p.value));
 const recent=distribution(points.filter(p=>lastStart&&p.date>lastStart).map(p=>p.value));
 const growth=initial.median>0&&recent.median!==null?finite(recent.median/initial.median-1):null;
 const trendEligible=years>=2&&initial.count>=120&&recent.count>=120;
 const trend={initial12MonthMedian:initial.median,recent12MonthMedian:recent.median,initialCount:initial.count,recentCount:recent.count,medianGrowth:trendEligible?growth:null,flag:!trendEligible?'NOT_ENOUGH_HISTORY':growth!==null&&growth>=.5?'RAW_LEVEL_NOT_SUITABLE':'NO_LARGE_SHIFT_FLAG',interpretation:'50% median increase is a research screening flag, not proof of structural growth'};
 return {points,changes:changeMap,summary:{provider:'FSC/KOFIA',operation,field,category,unit,unitSource,firstObservationDate:first,latestObservationDate:last,observationCount:datedNumericCount-conflictingNumericRows,uniqueObservationCount:points.length,rowsReceived:rows.length,calendarSpanDays:span,missingValueCount,nonNumericValueCount,numericValueCount,invalidDateCount,duplicateDateCount,conflictingDateCount,estimatedFrequency:medianGapDays===null?'UNKNOWN':medianGapDays<=3?'DAILY_LIKE':medianGapDays<=8?'WEEKLY_LIKE':medianGapDays<=35?'MONTHLY_LIKE':'SPARSE',medianGapDays,maxGapDays,latestLagDays,historyYearsApprox:years,qualityFlags:flags,fetchComplete:complete,distribution:distribution(points.map(p=>p.value)),changes:changeSummaries,normalizationFeasibility:{rollingPercentile:rollingFeasibility(points,'percentile'),rollingZScore:rollingFeasibility(points,'z-score'),change20Percentile:rollingFeasibility(changeMap[20],'percentile'),change60Percentile:rollingFeasibility(changeMap[60],'percentile')},levelTrend:trend,direction:field==='invrDpsgAmt'?'DIRECTION_UNRESOLVED':'NOT_ASSIGNED'}};
}
function anniversary(date,months){const y=Number(date.slice(0,4)),m=Number(date.slice(4,6))-1,d=Number(date.slice(6));const out=new Date(Date.UTC(y,m+months,1));out.setUTCDate(Math.min(d,new Date(Date.UTC(out.getUTCFullYear(),out.getUTCMonth()+1,0)).getUTCDate()));return out.toISOString().slice(0,10).replaceAll('-','');}
export function correlationMatrix(series,fields,changes=false){return fields.flatMap((left,i)=>fields.slice(i).map(right=>({left,right,...correlation(changes?series[left]?.changes[20]??[]:series[left]?.points??[],changes?series[right]?.changes[20]??[]:series[right]?.points??[],changes)})));}
export function creditComposition(rows){let compared=0,mismatchCount=0,missingCount=0;for(const r of rows){const v=['crdTrFingWhl','crdTrFingScrs','crdTrFingKosdaq'].map(f=>numeric(r[f]));if(v.some(x=>x===null)){missingCount++;continue;}compared++;if(Math.abs(v[0]-v[1]-v[2])>Math.max(1,Math.abs(v[0]))*1e-9)mismatchCount++;}return {compared,missingCount,mismatchCount,relativeTolerance:1e-9,marketComponentsAreIndependentCandidates:false};}
