import {STAGFLATION_S21_SERIES} from './stagflation-s21.mjs';
export const STAGFLATION_LATEST_VERSION='STAGFLATION_LATEST_PUBLISHED_R1';
export const STAGFLATION_LATEST_MODE='LATEST_PUBLISHED_INPUTS_NOT_COMMON_MONTH_OR_FORECAST';
const month=s=>typeof s==='string'&&/^\d{4}-(0[1-9]|1[0-2])-01$/.test(s);
const shift=(s,n)=>{const[y,m]=s.split('-').map(Number);return new Date(Date.UTC(y,m-1+n,1)).toISOString().slice(0,10)};
const clip=x=>Math.min(1,Math.max(0,x));
const percentile=(x,ref)=>100*ref.reduce((n,v)=>n+(v<x?1:v===x?.5:0),0)/ref.length;
const relativeRisk=(x,ref,up)=>100*clip((up?percentile(x,ref)-50:50-percentile(x,ref))/40);

// Same S2.1 transformations, weights, reference length and smoothing. Each
// input retains its actual observation month; no invented monthly observations.
export function calculateLatestStagflation({series,asOfDate}={}){
 const common={methodologyVersion:STAGFLATION_LATEST_VERSION,phase:'PROVISIONAL',evaluationMode:STAGFLATION_LATEST_MODE,historyPolicy:'ACTUAL_CALCULATION_OBSERVATIONS_ONLY'};
 const fail=reason=>({...common,status:'PARTIAL',score:null,reason});
 if(typeof asOfDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)||!Number.isFinite(Date.parse(asOfDate))||new Date(asOfDate).toISOString().slice(0,10)!==asOfDate)return fail('INVALID_AS_OF_DATE');
 const maps={},dates={};
 for(const id of STAGFLATION_S21_SERIES){
  if(!Array.isArray(series?.[id])||!series[id].length)return fail('SERIES_MISSING:'+id);
  const m=new Map();
  for(const row of series[id]){
   if(!month(row?.observationDate)||row.observationDate>asOfDate||m.has(row.observationDate))return fail('INVALID_OR_FUTURE_OBSERVATION:'+id);
   m.set(row.observationDate,row.value);
  }
  const end=[...m.keys()].sort().at(-1);
  if(end<shift(asOfDate.slice(0,7)+'-01',-3))return fail('OBSERVATION_STALE:'+id);
  maps[id]=m;dates[id]=end;
 }
 const value=(id,offset)=>{
  const x=maps[id].get(shift(dates[id],offset));
  return Number.isFinite(x)&&(id==='EXPINF5YR'||x>0)?x:null;
 };
 const change=(id,offset,lag,annual=false)=>{
  const a=value(id,offset),b=value(id,offset-lag);
  return a===null||b===null?null:100*((a/b)**(annual?12/lag:1)-1);
 };
 const raw=offset=>{
  const job=change('PAYEMS',offset,3,true),prior=change('PAYEMS',offset-3,3,true);
  return [change('PCEPI',offset,12),change('PCEPILFE',offset,12),change('PCEPILFE',offset,3,true),change('INDPRO',offset,3,true),change('DPCERA3M086SBEA',offset,3,true),change('DSPIC96',offset,3,true),job,job===null||prior===null?null:job-prior,value('EXPINF5YR',offset),change('MCOILWTICO',offset,12)];
 };
 const points=[];
 for(let offset=-2;offset<=0;offset++){
  const f=raw(offset),ref=Array.from({length:120},(_,i)=>raw(offset+i-120));
  if([f,...ref].some(a=>a.some(v=>!Number.isFinite(v))))return fail('REFERENCE_OR_LAG_INPUT_MISSING');
  const n=f.map((x,i)=>i<3?100*clip((x-2)/4):relativeRisk(x,ref.map(a=>a[i]),i>=8));
  n[8]*=clip((f[8]-2)/2);if(f[9]<=0)n[9]=0;
  const I=.25*n[0]+.35*n[1]+.4*n[2],R=.35*n[3]+.4*n[4]+.25*n[5],L=.7*n[6]+.3*n[7],E=.5*n[8]+.5*n[9],D=.65*R+.35*L;
  points.push({risk:Math.min(100,Math.sqrt(I*D)*(1+E/1000)),axes:{inflation:I,realEconomy:R,labor:L,expectationsEnergy:E,slowdown:D}});
 }
 const score=100-(13*points[2].risk+points[1].risk+points[0].risk)/15;
 if(!Number.isFinite(score)||score<0||score>100)return fail('INVALID_DERIVED_SCORE');
 const months=Object.values(dates).sort();
 return {...common,status:'READY',score,asOfDate,referenceMonths:120,axes:points[2].axes,
  inputCount:8,inputMonths:dates,jointRisks:points.map(p=>p.risk),oldestInputMonth:months[0],newestInputMonth:months.at(-1),
  note:'발표된 원자료의 관측 월이 서로 다른 잠정 조합입니다. 특정 월의 완성 점수나 미발표 값의 예측이 아닙니다.'};
}
