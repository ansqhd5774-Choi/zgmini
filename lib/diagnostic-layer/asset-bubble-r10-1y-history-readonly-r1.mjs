// Read-only, current-vintage reconstruction for a genuine twelve-month chart.
// This does not grant publication rights, backtest/PIT status, or scoring authority.
// The existing approved two-point evidence is independently validated first.
import {buildAssetR10RawReadOnlyEvidence} from './asset-bubble-r10-raw-evidence-r1.mjs';
import {buildAssetBubbleBatchA} from './batch-a-components.mjs';
import {buildPriceAccelerationR9} from './asset-bubble-r9-components.mjs';
import {buildR10ValuationCandidate} from './asset-bubble-r10-evaluation.mjs';
import {buildR10SpeculativeFlowCandidate} from './asset-bubble-r10-candidate.mjs';

const finite=value=>typeof value==='number'&&Number.isFinite(value);
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)
 &&Number.isFinite(Date.parse(value+'T00:00:00Z'));
const validQuarter=value=>typeof value==='string'&&/^\d{4}-Q[1-4]$/.test(value);
const dateQuarter=value=>validDate(value)?`${value.slice(0,4)}-Q${Math.ceil(Number(value.slice(5,7))/3)}`:null;
const prevQuarter=q=>Number(q.at(-1))===1?`${Number(q.slice(0,4))-1}-Q4`
 :`${q.slice(0,4)}-Q${Number(q.at(-1))-1}`;
const near=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<1e-7;

function latestByQuarter(rows=[],valueOf=row=>row.value,asOfDate){
 const result=new Map();
 for(const row of rows??[]){
  const q=validQuarter(row?.quarter)?row.quarter:dateQuarter(row?.observationDate);
  const observationDate=row?.observationDate;
  const value=valueOf(row);
  if(!q||!validDate(observationDate)||observationDate>asOfDate||!finite(value))continue;
  const old=result.get(q);
  if(!old||observationDate>=old.observationDate)
   result.set(q,{quarter:q,observationDate,value});
 }
 return result;
}

function auditedBreadth({breadth,quality,audit,asOfDate}){
 if(breadth?.formulaApproved!==true||audit?.invalid!==0||audit?.conflicts!==0
   ||!Array.isArray(breadth.rows)||!Array.isArray(quality?.rows))
  throw Error('ASSET_R10_1Y_BREADTH_SOURCE_NOT_APPROVED');
 const allowed=new Set(quality.rows.filter(row=>validDate(row?.observationDate)
  &&finite(row.coverage)&&row.coverage>=0.98&&finite(row.participation))
  .map(row=>row.observationDate));
 const months=new Map();
 for(const row of breadth.rows){
  if(!allowed.has(row?.observationDate)||row.observationDate>asOfDate
   ||!finite(row.researchSafetyScore)||!finite(row.breadthGap)
   ||row.researchSafetyScore<0||row.researchSafetyScore>100
   ||row.breadthGap<0||row.breadthGap>100
   ||!near(row.researchSafetyScore+row.breadthGap,100))continue;
  // Match the approved R10 release's last eligible stored observation per month.
  months.set(row.observationDate.slice(0,7),row);
 }
 const groups=new Map();
 for(const [month,row] of months){
  const q=dateQuarter(month+'-01'),group=groups.get(q)??[];
  group.push(row);groups.set(q,group);
 }
 const result=new Map();
 for(const [q,rows] of groups){
  if(rows.length!==3)continue;
  result.set(q,{quarter:q,
   observationDate:rows.map(row=>row.observationDate).sort().at(-1),
   value:rows.reduce((sum,row)=>sum+row.breadthGap,0)/3});
 }
 return result;
}

export function buildAssetR10OneYearReadOnly({macroSeries={},sp500Rows=[],breadth,
 quality,audit,release}={}){
 // This proves original release, six factors, and approved scores still match.
 const approved=buildAssetR10RawReadOnlyEvidence({macroSeries,sp500Rows,
  breadth,quality,audit,release});
 const asOfDate=release.asOfDate;
 const valuation=buildR10ValuationCandidate({
  publicFinancialEquity:macroSeries.BOGZ1LM793164115Q??[],
  publicNonfinancialEquity:macroSeries.BOGZ1LM103164115Q??[],
  nominalGdp:macroSeries.GDP??[]});
 const batch=buildAssetBubbleBatchA({
  publicFinancialEquity:macroSeries.BOGZ1LM793164115Q??[],
  publicNonfinancialEquity:macroSeries.BOGZ1LM103164115Q??[],
  nominalGdp:macroSeries.GDP??[],
  riskAssetShare:macroSeries.BOGZ1FL153064486Q??[],
  m2:macroSeries.M2SL??[]});
 const price=buildPriceAccelerationR9(sp500Rows);
 const flows=buildR10SpeculativeFlowCandidate({
  transactionRows:macroSeries.BOGZ1FA153064475Q??[],
  holdingsRows:macroSeries.BOGZ1FL153064475Q??[],
  priceAccelerationQuarterRows:price.quarterly});
 const histories={
  valuationPressure:latestByQuarter(valuation.raw,row=>row.value,asOfDate),
  priceAcceleration:latestByQuarter(price.quarterly,row=>100*row.priceAccelRaw,asOfDate),
  riskAssetShare:latestByQuarter(batch.riskAssetShare.change4q,row=>row.value,asOfDate),
  speculativeFlows:latestByQuarter(flows.rows,row=>100*row.positiveInflowRatio,asOfDate),
  breadthDivergence:auditedBreadth({breadth,quality,audit,asOfDate}),
  excessLiquidity:latestByQuarter(batch.excessLiquidity.raw,row=>row.value,asOfDate),
 };
 const quarters=[release.scoreObservationQuarter];
 for(let i=0;i<4;i++)quarters.unshift(prevQuarter(quarters[0]));
 const factors=approved.factors.map(factor=>{
  const map=histories[factor.id];
  const rows=quarters.map(q=>map.get(q)??null);
  const last=rows[4],previous=rows[3];
  // Strong value/date parity, including the approved preceding quarter.
  if(!last||!near(last.value,factor.value)
   ||last.observationDate!==factor.observationDate
   ||(previous?.value??null)!==(factor.previousValue??null)
   &&!(previous&&factor.previousValue!==null&&near(previous.value,factor.previousValue))
   ||(previous?.observationDate??null)!==factor.previousObservationDate)
   throw Error('ASSET_R10_1Y_RAW_EVIDENCE_PARITY_FAILED');
  const points=quarters.map((q,i)=>({quarter:q,
   observationDate:rows[i]?.observationDate??null,
   value:rows[i]?.value??null}));
  const missingQuarters=quarters.filter((q,i)=>!rows[i]);
  return {id:factor.id,unit:factor.unit,source:factor.source,
   status:missingQuarters.length===0?'READY_1Y':'PARTIAL_1Y',
   missingQuarters,points};
 });
 const allReady=factors.every(factor=>factor.status==='READY_1Y');
 return {schemaVersion:'asset-bubble-r10-one-year-readonly-r1',
  status:allReady?'READY_1Y_READONLY':'PARTIAL_1Y_READONLY',
  asOfDate,scoreObservationQuarter:release.scoreObservationQuarter,
  firstQuarter:quarters[0],lastQuarter:quarters.at(-1),
  sourceVersion:approved.sourceVersion,sourceStoredAt:approved.sourceStoredAt,
  historicalMode:'CURRENT_VINTAGE_NOT_PIT',rightsStatus:approved.rightsStatus,
  approvedScore:approved.diagnosticScore,approvedRawParity:'PASS',
  factors,providerRequests:0,pcSqliteWrites:0,d1Writes:0,
  scoreWrites:0,deployments:0};
}
