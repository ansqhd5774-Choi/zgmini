// W06 R4 #52: display-only gate for CREDIT_R2_NFCI_4FACTOR_R1.
// Credit HY/IG CMDI, weekly NFCICREDIT and daily Treasury 20D volatility
// have different valid observation dates. Never invent a new chart point,
// interpolate missing data or re-score the approved producer values.
import {CREDIT_R2_CONTRACT} from './market-score/credit-r2.mjs';
const expected=[
 ['credit-41','HY CMDI','hy'],
 ['credit-42','IG CMDI','ig'],
 ['credit-43','NFCICREDIT','nfciCredit'],
 ['credit-44','2Y/5Y/10Y/30Y 20D realized volatility','bondVolatility'],
];
const finiteScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const dateOk=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))
 &&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
export function verifiedEconomicCreditScore(domain,asOfDate){
 if(domain?.id!=='credit'||domain.status!=='READY'
  ||domain.methodologyVersion!==CREDIT_R2_CONTRACT.methodologyVersion
  ||!finiteScore(domain.score)||!dateOk(asOfDate)
  ||!['CURRENT','SOFT_STALE'].includes(domain.freshness)
  ||typeof domain.interpretation!=='string'
  ||!domain.interpretation.startsWith('채권·신용 R2: HY CMDI 35% + IG CMDI 35% + Chicago Fed NFCI Credit 10% + 미 국채 변동성 20%.')
  ||(domain.updatedAt!=null&&(!dateOk(domain.updatedAt)||domain.updatedAt>asOfDate))
  ||!Array.isArray(domain.indicators)||domain.indicators.length!==expected.length
  ||!Array.isArray(domain.missingFactors)||domain.missingFactors.length!==0)return null;
 let weighted=0;
 for(let i=0;i<expected.length;i++){
  const [id,sourceKey,key]=expected[i];
  const item=domain.indicators[i];
  if(item?.id!==id||item.sourceKey!==sourceKey||item.status!=='READY'
    ||!finiteScore(item.score)||!dateOk(item.observationDate)
    ||item.observationDate>asOfDate)return null;
  weighted+=item.score*CREDIT_R2_CONTRACT.weights[key];
 }
 return Math.abs(weighted-domain.score)<=1e-6?domain.score:null;
}
export function verifiedEconomicCreditChart(domain,asOfDate,headline){
 if(!finiteScore(headline)||verifiedEconomicCreditScore(domain,asOfDate)!==headline)return [];
 const begin=new Date(asOfDate+'T00:00:00Z');begin.setUTCFullYear(begin.getUTCFullYear()-1);
 const start=begin.toISOString().slice(0,10);
 const points=new Map(),conflicts=new Set();
 for(const row of Array.isArray(domain?.trend)?domain.trend:[]){
  const date=row?.date??row?.label;
  const value=row?.score===null?null:(row?.score??row?.value);
  if(!dateOk(date)||date<start||date>asOfDate||!finiteScore(value))continue;
  if(points.has(date)&&Math.abs(points.get(date)-value)>1e-6){conflicts.add(date);continue;}
  points.set(date,value);
 }
 if(conflicts.size)return [];
 const result=[...points].sort(([a],[b])=>a.localeCompare(b))
   .map(([date,score])=>({date,score}));
 if(result.at(-1)?.date===asOfDate&&Math.abs(result.at(-1).score-headline)>1e-6)return [];
 return result;
}
export function isEconomicCreditChartCurrent(points,asOfDate,headline){
 const last=Array.isArray(points)?points.at(-1):null;
 return dateOk(asOfDate)&&finiteScore(headline)&&last?.date===asOfDate
   &&finiteScore(last.score)&&Math.abs(last.score-headline)<=1e-6;
}
