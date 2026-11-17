// W06 R4 #55: verify stored E1-R4/E1-R5 economic earnings before display.
// Presentation-only: do not recalculate or promote candidate/source observations.
import {E1_R5_SCORE_KEYS,E1_R5_WEIGHTS} from './market-score/earnings-e1-r5.mjs';

const validScore=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 Number.isFinite(Date.parse(value+'T00:00:00Z'))&&
 new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const R4_PARTS=Object.freeze([
 ['EPS 성장률',.35],['매출 성장률',.20],
 ['이익 성장 종목 비율',.20],['영업이익률',.25],
]);
const quarterEnd=date=>validDate(date)&&['03-31','06-30','09-30','12-31'].includes(date.slice(5));
const close=(a,b)=>Math.abs(a-b)<=1e-6;

export function economicEarningsSourceDate(domain,asOfDate){
 if(domain?.id!=='earnings'||!validDate(asOfDate))return null;
 if(domain.methodologyVersion==='E1-R4'){
  const period=domain.financialPeriodEnd;
  return quarterEnd(period)&&period<=asOfDate?period:null;
 }
 if(domain.methodologyVersion==='E1-R5'){
  const rows=domain.indicators;
  if(!Array.isArray(rows)||rows.length!==E1_R5_SCORE_KEYS.length)return null;
  const period=rows[0]?.asOfDate;
  return validDate(period)&&period<=asOfDate&&rows.every(row=>row?.asOfDate===period)?period:null;
 }
 return null;
}

export function verifiedEconomicEarningsScore(domain,asOfDate){
 if(domain?.id!=='earnings'||domain.status!=='READY'||!validScore(domain.score)
  ||!Array.isArray(domain.missingFactors)||domain.missingFactors.length!==0)return null;
 const period=economicEarningsSourceDate(domain,asOfDate);
 if(!period)return null;
 const rows=domain.indicators;
 if(!Array.isArray(rows))return null;
 let weighted=0;
 if(domain.methodologyVersion==='E1-R5'){
  if(rows.length!==E1_R5_SCORE_KEYS.length)return null;
  const byId=new Map(rows.map(row=>[row?.id,row]));
  if(byId.size!==E1_R5_SCORE_KEYS.length)return null;
  for(const id of E1_R5_SCORE_KEYS){
   const row=byId.get(id);
   if(row?.status!=='READY'||!validScore(row.score)||row.asOfDate!==period)return null;
   weighted+=E1_R5_WEIGHTS[id]*row.score;
  }
 }else if(domain.methodologyVersion==='E1-R4'){
  if(rows.length!==R4_PARTS.length)return null;
  const byName=new Map(rows.map(row=>[row?.name,row]));
  if(byName.size!==R4_PARTS.length)return null;
  for(const [name,weight] of R4_PARTS){
   const row=byName.get(name);
   if(row?.status!=='READY'||!validScore(row.score)||row.asOfDate!==period)return null;
   weighted+=weight*row.score;
  }
 }else return null;
 return close(weighted,domain.score)?domain.score:null;
}

export function verifiedEconomicEarningsChart(domain,asOfDate,headline){
 if(!validScore(headline)||verifiedEconomicEarningsScore(domain,asOfDate)!==headline)return [];
 const period=economicEarningsSourceDate(domain,asOfDate);
 const start=new Date(period+'T00:00:00Z');
 start.setUTCFullYear(start.getUTCFullYear()-1);
 const earliest=start.toISOString().slice(0,10);
 const dates=new Map(),conflicts=new Set();
 for(const row of Array.isArray(domain.trend)?domain.trend:[]){
  const date=row?.date??row?.label;
  if(!validDate(date)||date<earliest||date>period||date>asOfDate)continue;
  if(domain.methodologyVersion==='E1-R4'&&!quarterEnd(date))continue;
  const value=row?.score===null?null:row?.score??row?.value;
  const stored=row?.status==='PARTIAL'||value===null?null:validScore(value)?value:null;
  if(row?.status&&row.status!=='READY'&&row.status!=='PARTIAL')continue;
  if(dates.has(date)&&dates.get(date)!==stored)conflicts.add(date);
  dates.set(date,stored);
 }
 if(conflicts.size)return [];
 const out=[...dates].sort(([a],[b])=>a.localeCompare(b)).map(([date,score])=>({date,score}));
 const last=out.at(-1);
 if(last?.date===period&&(!validScore(last.score)||!close(last.score,headline)))return [];
 return out;
}

export function isEconomicEarningsChartCurrent(points,domain,asOfDate,headline){
 const period=economicEarningsSourceDate(domain,asOfDate),last=Array.isArray(points)?points.at(-1):null;
 return Boolean(period&&validScore(headline)&&last?.date===period&&
  validScore(last?.score)&&close(last.score,headline));
}
