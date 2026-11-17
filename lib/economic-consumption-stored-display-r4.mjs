// W06 R4 #54. Read-only display guard for the ACTIVE 5-area CONSUMPTION_R5.
// It cannot replace the approved saved monthly calculator or infer releases
// not projected into the public composite response.
import {CONSUMPTION_R5,R5_WEIGHTS} from './market-score/consumption-r5.mjs';
const validScore=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
 !Number.isNaN(Date.parse(d+'T00:00:00Z'))&&
 new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const parts=[
 ['pce3','D',.40],['pce12','D',.35],['perCapita','D',.25],
 ['income3','Y',.60],['income12','Y',.40],
 ['employment','L',.50],['payroll','L',.50],
 ['saving','H',.25],['debt','H',.35],['delinquency','H',.40],
 ['diffusion','B',.50],['goods','B',.25],['services','B',.25]
];
export function verifiedEconomicConsumptionScore(domain,asOfDate){
 if(domain?.id!=='consumption'||domain.status!=='READY'
  ||domain.methodologyVersion!==CONSUMPTION_R5
  ||domain.freshness!=='STORED_MONTHLY_R5'
  ||!validScore(domain.score)||!validDate(asOfDate)
  ||!validDate(domain.updatedAt)||!domain.updatedAt.endsWith('-01')
  ||domain.updatedAt>asOfDate
  ||typeof domain.interpretation!=='string'
  ||!domain.interpretation.startsWith('소비·소득·고용·가계 금융 여력·소비 확산의 종합 참고 지수.')
  ||!Array.isArray(domain.missingFactors)||domain.missingFactors.length!==0
  ||!Array.isArray(domain.indicators)||domain.indicators.length!==15)return null;
 let weighted=0;
 for(let i=0;i<parts.length;i++){
  const [id,area,partWeight]=parts[i],row=domain.indicators[i];
  if(row?.id!==id||row.area!==area||row.status!=='READY'
    ||!validScore(row.score)
    ||!validDate(row.observationDate)||!row.observationDate.endsWith('-01')
    ||row.observationDate>domain.updatedAt
    ||Math.abs(row.weight-R5_WEIGHTS[area]*partWeight)>1e-8
    ||Math.abs(row.areaWeight-100*partWeight)>1e-8)return null;
  weighted+=row.score*row.weight/100;
 }
 // The two separate explanatory signals are never a sixth/seventh scored area.
 for(let i=0;i<2;i++){
  const row=domain.indicators[i+parts.length];
  if(row?.id!==['gap','acceleration'][i]||row.score!==null||row.weight!==0
    ||row.area!==undefined)return null;
 }
 return Math.abs(weighted-domain.score)<=1e-6?domain.score:null;
}
export function verifiedEconomicConsumptionChart(domain,asOfDate,headline){
 if(!validScore(headline)||verifiedEconomicConsumptionScore(domain,asOfDate)!==headline)return [];
 const oneYear=new Date(domain.updatedAt+'T00:00:00Z');oneYear.setUTCFullYear(oneYear.getUTCFullYear()-1);
 const start=oneYear.toISOString().slice(0,10),seen=new Map(),conflicts=new Set();
 for(const r of Array.isArray(domain.trend)?domain.trend:[]){
  const date=r?.date??r?.label;
  if(!validDate(date)||!date.endsWith('-01')||date<start||date>domain.updatedAt||date>asOfDate)continue;
  if(r?.status!=='READY'&&r?.status!=='PARTIAL')continue;
  const value=r.status==='READY'&&validScore(r.value)?r.value:null;
  if(r.status==='READY'&&!validScore(value))continue;
  if(seen.has(date)&&seen.get(date)!==value)conflicts.add(date);
  seen.set(date,value);
 }
 if(conflicts.size)return [];
 const out=[...seen].sort(([a],[b])=>a.localeCompare(b)).map(([date,score])=>({date,score}));
 const last=out.at(-1);
 if(last?.date===domain.updatedAt&&(last.score===null||Math.abs(last.score-headline)>1e-6))return [];
 return out;
}
export function isEconomicConsumptionChartCurrent(points,domain,asOfDate,headline){
 const last=Array.isArray(points)?points.at(-1):null;
 return validDate(asOfDate)&&validDate(domain?.updatedAt)&&domain.updatedAt<=asOfDate
   &&validScore(headline)&&last?.date===domain.updatedAt
   &&validScore(last.score)&&Math.abs(last.score-headline)<=1e-6;
}
