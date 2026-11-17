// W06 R4 #59: read-only public score/chart validation for the ACTIVE
// FRED Broad Dollar Index DTWEXBGS R54. The server-side approved percentile,
// 20/60 observation momentum and 20-return volatility formulas are unchanged.
import {DOLLAR_FX_R54_WEIGHTS} from './diagnostic-layer/open-resolution-r53-components.mjs';

const METHOD='DOLLAR_FX_R54_1';
const SOURCE='Federal Reserve Broad Dollar Index / DTWEXBGS';
const FACTORS=Object.freeze([
 Object.freeze({id:'dollar-fx-54-1',name:'달러 수준 부담',weight:DOLLAR_FX_R54_WEIGHTS.level}),
 Object.freeze({id:'dollar-fx-54-2',name:'단기 달러 모멘텀',weight:DOLLAR_FX_R54_WEIGHTS.shortMomentum}),
 Object.freeze({id:'dollar-fx-54-3',name:'중기 달러 모멘텀',weight:DOLLAR_FX_R54_WEIGHTS.mediumMomentum}),
 Object.freeze({id:'dollar-fx-54-4',name:'달러 변동성',weight:DOLLAR_FX_R54_WEIGHTS.volatility}),
]);
const isScore=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const isDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
// FRED index observations are source-backed business dates; do NOT assume the
// NYSE calendar matches all Federal Reserve publication holidays.
const businessDate=value=>isDate(value)&&![0,6].includes(new Date(value+'T00:00:00Z').getUTCDay());
const eq=(a,b)=>Math.abs(a-b)<=1e-6;

/** @param {any} domain @param {string|null|undefined} snapshotDate */
export function economicDollarFxSourceDate(domain,snapshotDate){
 if(domain?.id!=='dollarFx'||domain.methodologyVersion!==METHOD||!isDate(snapshotDate)
   ||!Array.isArray(domain.indicators)||domain.indicators.length!==FACTORS.length)return null;
 const dates=domain.indicators.map(row=>row?.observationDate);
 if(dates.some(day=>!businessDate(day))||new Set(dates).size!==1)return null;
 const date=domain.observationDate??domain.updatedAt;
 // Existing CM-R1 records had updatedAt=R54 source observationDate.
 // Never infer it from the snapshot's retrieval/evaluation timestamp.
 if(!businessDate(date)||date>snapshotDate||date!==dates[0]
    ||domain.updatedAt!==date)return null;
 return date;
}

/** @param {any} domain @param {string|null|undefined} snapshotDate */
export function verifiedEconomicDollarFxScore(domain,snapshotDate){
 if(domain?.status!=='READY'||!isScore(domain.score)
  ||!Array.isArray(domain.missingFactors)||domain.missingFactors.length!==0)return null;
 const day=economicDollarFxSourceDate(domain,snapshotDate);
 if(!day)return null;
 let sum=0;
 for(let i=0;i<FACTORS.length;i++){
  const factor=FACTORS[i],row=domain.indicators[i];
  if(row?.id!==factor.id||row?.name!==factor.name
   ||row?.source!==SOURCE||row?.status!=='READY'
   ||row?.observationDate!==day||!isScore(row.score)
   ||typeof row.value!=='number'||!Number.isFinite(row.value))return null;
  sum+=factor.weight*row.score;
 }
 if(!eq(sum,domain.score))return null;
 const last=verifiedDollarFxSavedTrend(domain,day).at(-1);
 if(!last||last.date!==day||!isScore(last.score)||!eq(last.score,domain.score))return null;
 return domain.score;
}

// Reconciles ONLY source-provided stored R54 points. It never invents a
// weekend, Federal holiday, retrieval-date point, PIT claim, or a score value.
function verifiedDollarFxSavedTrend(domain,day){
 const begin=new Date(day+'T00:00:00Z');
 begin.setUTCFullYear(begin.getUTCFullYear()-1);
 const earliest=begin.toISOString().slice(0,10);
 const seen=new Map();let conflict=false;
 for(const point of Array.isArray(domain?.trend)?domain.trend:[]){
  const date=point?.date??point?.label;
  if(!businessDate(date)||date<earliest||date>day)continue;
  if(point?.status!==undefined&&!['READY','PARTIAL'].includes(point.status))continue;
  const raw=point?.score===null?null:point?.score??point?.value;
  const value=point?.status==='PARTIAL'||raw===null?null:isScore(raw)?raw:null;
  if(seen.has(date)&&seen.get(date)!==value)conflict=true;
  seen.set(date,value);
 }
 if(conflict)return [];
 return [...seen].sort(([a],[b])=>a.localeCompare(b)).map(([date,score])=>({date,score}));
}

/** @param {any} domain @param {string|null|undefined} snapshotDate @param {number|null|undefined} headline */
export function verifiedEconomicDollarFxChart(domain,snapshotDate,headline){
 if(!isScore(headline)||verifiedEconomicDollarFxScore(domain,snapshotDate)!==headline)return [];
 return verifiedDollarFxSavedTrend(domain,economicDollarFxSourceDate(domain,snapshotDate));
}

/** @param {any[]} chart @param {any} domain @param {string|null|undefined} snapshotDate @param {number|null|undefined} headline */
export function isEconomicDollarFxChartCurrent(chart,domain,snapshotDate,headline){
 if(!isScore(headline)||verifiedEconomicDollarFxScore(domain,snapshotDate)!==headline)return false;
 const last=Array.isArray(chart)?chart.at(-1):null;
 return Boolean(last?.date===economicDollarFxSourceDate(domain,snapshotDate)
  &&isScore(last?.score)&&eq(last.score,headline));
}
