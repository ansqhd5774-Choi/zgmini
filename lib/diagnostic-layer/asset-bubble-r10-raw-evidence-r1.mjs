// Read-only reconstruction of the six *raw* R10 components from the same
// stored PC sources used by the approved score release. No provider calls,
// score changes, database mutations, or publication authority.
import {buildAssetBubbleBatchA} from './batch-a-components.mjs';
import {buildPriceAccelerationR9} from './asset-bubble-r9-components.mjs';
import {buildR10ValuationCandidate,evaluateAssetBubbleR10Candidate}
 from './asset-bubble-r10-evaluation.mjs';
import {buildR10SpeculativeFlowCandidate,scoreAssetBubbleR10Candidate,
 ASSET_BUBBLE_R10_WEIGHTS} from './asset-bubble-r10-candidate.mjs';

const IDS=Object.keys(ASSET_BUBBLE_R10_WEIGHTS);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const date=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x)
 &&Number.isFinite(Date.parse(x+'T00:00:00Z'));
const quarter=x=>typeof x==='string'&&/^\d{4}-Q[1-4]$/.test(x);
const fromDate=x=>date(x)?x.slice(0,4)+'-Q'+Math.ceil(Number(x.slice(5,7))/3):null;
const previousQuarter=q=>{const y=Number(q.slice(0,4)),n=Number(q.at(-1));
 return n===1?`${y-1}-Q4`:`${y}-Q${n-1}`;};
const periodEnd=q=>new Date(Date.UTC(Number(q.slice(0,4)),Number(q.at(-1))*3,0))
 .toISOString().slice(0,10);
const near=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<1e-7;

function latestByQuarter(rows=[],valueOf=r=>r.value){
 const map=new Map();
 for(const row of rows??[]){
  const q=quarter(row?.quarter)?row.quarter:fromDate(row?.observationDate);
  const value=valueOf(row);
  if(!q||!finite(value))continue;
  const old=map.get(q);
  if(!old||row.observationDate>=old.observationDate)
   map.set(q,{quarter:q,observationDate:row.observationDate,value});
 }
 return map;
}

function verifiedBreadth({breadth,quality,audit,asOfDate}){
 if(breadth?.formulaApproved!==true||audit?.invalid!==0||audit?.conflicts!==0
   ||!Array.isArray(breadth.rows)||!Array.isArray(quality?.rows))
  throw Error('ASSET_R10_RAW_BREADTH_SOURCE_NOT_APPROVED');
 const allowed=new Set(quality.rows.filter(r=>date(r?.observationDate)
  &&finite(r.coverage)&&r.coverage>=0.98&&finite(r.participation))
  .map(r=>r.observationDate));
 const months=new Map();
 for(const row of breadth.rows){
  if(!allowed.has(row?.observationDate)||row.observationDate>asOfDate
   ||!finite(row.researchSafetyScore)||!finite(row.breadthGap)
   ||row.researchSafetyScore<0||row.researchSafetyScore>100
   ||row.breadthGap<0||row.breadthGap>100
   ||!near(row.researchSafetyScore+row.breadthGap,100))continue;
  // Match the approved release's last eligible stored row per month.
  months.set(row.observationDate.slice(0,7),row);
 }
 const groups=new Map();
 for(const [month,row] of months){const q=fromDate(month+'-01');
  const group=groups.get(q)??[];group.push(row);groups.set(q,group);}
 const result=new Map();
 for(const [q,rows] of groups){
  if(rows.length!==3)continue;
  const score=rows.reduce((s,r)=>s+r.researchSafetyScore,0)/3;
  const gap=rows.reduce((s,r)=>s+r.breadthGap,0)/3;
  result.set(q,{quarter:q,observationDate:[...rows].map(r=>r.observationDate).sort().at(-1),
   value:gap,score});
 }
 return result;
}

export function buildAssetR10RawReadOnlyEvidence({macroSeries={},sp500Rows=[],
 breadth,quality,audit,release}={}){
 if(release?.methodologyVersion!=='ASSET_BUBBLE_R10_CANDIDATE'
  ||release.status!=='READY'||release.historyMode!=='CURRENT_VINTAGE_ONLY'
  ||release.publicationPolicy!=='USER_APPROVED_CURRENT_VINTAGE_UNVERIFIED_SOURCES'
  ||release.rightsStatus!=='USER_ACCEPTED_UNVERIFIED'
  ||release.lookAheadSafe!==false||release.productionEligible!==true
  ||!quarter(release.scoreObservationQuarter)||!date(release.asOfDate)
  ||periodEnd(release.scoreObservationQuarter)>release.asOfDate
  ||!finite(release.score)||release.score<0||release.score>100
  ||!Array.isArray(release.indicators)||release.indicators.length!==6
  ||!Number.isSafeInteger(release.sourceStoredAt)
  ||!release.sourceVersion||!Array.isArray(sp500Rows))
  throw Error('ASSET_R10_RAW_RELEASE_CONTRACT_INVALID');
 const broad=verifiedBreadth({breadth,quality,audit,asOfDate:release.asOfDate});
 const evaluation=evaluateAssetBubbleR10Candidate({macroSeries,
  sp500ShadowRows:sp500Rows,asOfDate:release.asOfDate});
 const scored=evaluation.rows.map(row=>{
  const parts={...row,breadthDivergence:broad.get(row.quarter)?.score??null};
  return {...parts,...scoreAssetBubbleR10Candidate(parts)};
 });
 const target=scored.find(row=>row.quarter===release.scoreObservationQuarter);
 if(target?.status!=='READY'||!near(target.score,release.score)
  ||!IDS.every((id,i)=>release.indicators[i]?.id===id
   &&release.indicators[i].status==='READY'
   &&near(target[id],release.indicators[i].score)))
  throw Error('ASSET_R10_RAW_APPROVED_SCORE_PARITY_FAILED');

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
 const raw={
  valuationPressure:latestByQuarter(valuation.raw),
  priceAcceleration:latestByQuarter(price.quarterly,r=>100*r.priceAccelRaw),
  riskAssetShare:latestByQuarter(batch.riskAssetShare.change4q),
  speculativeFlows:latestByQuarter(flows.rows,r=>100*r.positiveInflowRatio),
  breadthDivergence:new Map([...broad].map(([q,r])=>[q,{...r}])),
  excessLiquidity:latestByQuarter(batch.excessLiquidity.raw),
 };
 const specs={
  valuationPressure:{unit:'TIMES_GDP',source:'FRB_Z1_EQUITY_MARKET_VALUE_AND_BEA_GDP'},
  priceAcceleration:{unit:'LOG_PERCENT_POINTS',source:'STORED_SP500_PRICE_3M_VS_12M'},
  riskAssetShare:{unit:'PERCENTAGE_POINTS',source:'FRB_Z1_HOUSEHOLD_EQUITY_SHARE_4Q_CHANGE'},
  speculativeFlows:{unit:'PERCENT_OF_PRIOR_HOLDINGS',source:'FRB_Z1_POSITIVE_EQUITY_NET_FLOW_4Q'},
  breadthDivergence:{unit:'PERCENTILE_POINTS',source:'STORED_ALPACA_RESEARCH_12M_RETURN_VS_200MA_BREADTH'},
  excessLiquidity:{unit:'PERCENTAGE_POINTS',source:'FRB_M2_YOY_MINUS_BEA_NOMINAL_GDP_YOY'},
 };
 const q=release.scoreObservationQuarter,prev=previousQuarter(q);
 const factors=IDS.map(id=>{
  const current=raw[id].get(q),previous=raw[id].get(prev);
  if(!current||!finite(current.value)||current.observationDate>release.asOfDate)
   throw Error('ASSET_R10_RAW_REQUIRED_OBSERVATION_MISSING');
  return {id,score:target[id],value:current.value,
   previousValue:previous?.value??null,unit:specs[id].unit,
   observationDate:current.observationDate,
   previousObservationDate:previous?.observationDate??null,
   source:specs[id].source};
 });
 // These six source values are only observations for the last scored quarter.
 // The current incomplete diagnostic quarter must remain null.
 return {schemaVersion:'asset-bubble-r10-raw-readonly-r1',status:'PASS_READONLY_ASSET_R10_RAW_PREFLIGHT',
  sourceVersion:release.sourceVersion,sourceStoredAt:release.sourceStoredAt,
  scoreObservationQuarter:q,scoreObservationPeriodEnd:periodEnd(q),
  diagnosticQuarter:release.diagnosticQuarter,asOfDate:release.asOfDate,
  historicalMode:'CURRENT_VINTAGE_NOT_PIT',rightsStatus:release.rightsStatus,
  diagnosticScore:target.score,factors,providerRequests:0,pcSqliteWrites:0,
  d1Writes:0,scoreWrites:0};
}
