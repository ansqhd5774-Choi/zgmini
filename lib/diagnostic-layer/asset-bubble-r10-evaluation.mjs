// Asset Bubble R10 research-only evaluation from previously stored data.
// Does not read providers, write storage, or authorize SP500/public breadth licensing.
import {buildAssetBubbleBatchA} from './batch-a-components.mjs';
import {buildPriceAccelerationR9} from './asset-bubble-r9-components.mjs';
import {scoreAssetBubbleR10Candidate,buildR10SpeculativeFlowCandidate,ASSET_BUBBLE_R10_WEIGHTS} from './asset-bubble-r10-candidate.mjs';
import {exactAlign,expandingPercentileRows} from './series-math.mjs';

const finite=v=>typeof v==='number'&&Number.isFinite(v);
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const quarterFromDate=d=>validDate(d)?d.slice(0,4)+'-Q'+Math.ceil(Number(d.slice(5,7))/3):null;
const quarterStart=q=>q.slice(0,4)+'-'+String((Number(q.at(-1))-1)*3+1).padStart(2,'0')+'-01';

function quarterScores(rows=[],scoreField='value'){
 const map=new Map();
 for(const row of rows??[]){
  const quarter=/^\d{4}-Q[1-4]$/.test(row?.quarter??'')?row.quarter:quarterFromDate(row?.observationDate);
  const score=row?.[scoreField];
  if(!quarter||!finite(score))continue;
  if(map.has(quarter)&&map.get(quarter)!==score)throw Error('CONFLICTING_QUARTER_SCORE:'+quarter);
  map.set(quarter,score);
 }
 return map;
}
export function buildR10ValuationCandidate({
 publicFinancialEquity=[],publicNonfinancialEquity=[],nominalGdp=[],
}={}){
 const raw=exactAlign({financial:publicFinancialEquity,nonfinancial:publicNonfinancialEquity,gdp:nominalGdp})
  .filter(row=>row.observationDate>='1997-01-01'&&row.gdp>0)
  .map(row=>({observationDate:row.observationDate,value:(row.financial+row.nonfinancial)/(row.gdp*1000)}));
 return {raw,score:expandingPercentileRows(raw,{inverse:true,minValid:12}),
  numeratorUnits:'USD_MILLIONS',gdpUnits:'USD_BILLIONS',ratioUnits:'times'};
}
export function evaluateAssetBubbleR10Candidate({
 macroSeries={},sp500ShadowRows=[],breadthScoreRows=[],breadthEvidence=null,asOfDate='9999-12-31',
}={}){
 if(!validDate(asOfDate))throw Error('ASSET_BUBBLE_R10_ASOF_INVALID');
 const s=macroSeries;
 const valuation=buildR10ValuationCandidate({
  publicFinancialEquity:s.BOGZ1LM793164115Q??[],
  publicNonfinancialEquity:s.BOGZ1LM103164115Q??[],
  nominalGdp:s.GDP??[],
 });
 const batch=buildAssetBubbleBatchA({
  publicFinancialEquity:s.BOGZ1LM793164115Q??[],
  publicNonfinancialEquity:s.BOGZ1LM103164115Q??[],
  nominalGdp:s.GDP??[],
  riskAssetShare:s.BOGZ1FL153064486Q??[],
  m2:s.M2SL??[],
 });
 const price=buildPriceAccelerationR9(sp500ShadowRows);
 const flows=buildR10SpeculativeFlowCandidate({
  transactionRows:s.BOGZ1FA153064475Q??[],
  holdingsRows:s.BOGZ1FL153064475Q??[],
  priceAccelerationQuarterRows:price.quarterly,
 });
 // Only explicitly audited historical PIT breadth input is accepted; public B1 isn't a substitute.
 const breadthAllowed=breadthEvidence?.status==='READY'&&
  breadthEvidence?.membershipLookAheadSafe===true&&
  breadthEvidence?.methodology==='ASSET_BUBBLE_R10_BREADTH_DIVERGENCE';
 const sources={
  valuationPressure:quarterScores(valuation.score),
  priceAcceleration:quarterScores(price.quarterly,'priceAccelScore'),
  riskAssetShare:quarterScores(batch.riskAssetShare.score),
  speculativeFlows:quarterScores(flows.rows,'score'),
  breadthDivergence:breadthAllowed?quarterScores(breadthScoreRows,'score'):new Map(),
  excessLiquidity:quarterScores(batch.excessLiquidity.score),
 };
 const quarters=[...new Set(Object.values(sources).flatMap(map=>[...map.keys()]))]
  .filter(q=>quarterStart(q)<=asOfDate).sort();
 const rows=quarters.map(quarter=>{
  const parts=Object.fromEntries(Object.entries(sources).map(([id,map])=>[id,map.get(quarter)??null]));
  const evaluation=scoreAssetBubbleR10Candidate(parts);
  const knownWeight=Object.entries(ASSET_BUBBLE_R10_WEIGHTS).reduce((n,[id,w])=>n+(finite(parts[id])?w:0),0);
  return {quarter,observationDate:quarterStart(quarter),...parts,
   status:evaluation.status,score:evaluation.score,missing:evaluation.missing,
   knownWeight,knownContribution0to100:Object.entries(ASSET_BUBBLE_R10_WEIGHTS).reduce((sum,[id,w])=>sum+w*(finite(parts[id])?parts[id]:0),0)};
 });
 return {methodology:'ASSET_BUBBLE_R10_CANDIDATE',status:rows.at(-1)?.status??'PARTIAL',
  score:rows.at(-1)?.score??null,lastQuarter:rows.at(-1)?.quarter??null,
  historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,productionEligible:false,
  externalRightsCleared:false,providerRequests:0,dbWrites:0,
  inputStatus:{
   valuationPoints:valuation.score.length,
   priceMonths:price.monthly.length,priceScoreQuarters:price.quarterly.filter(r=>finite(r.priceAccelScore)).length,
   flowRawQuarters:flows.rows.length,flowScoredQuarters:flows.rows.filter(r=>finite(r.score)).length,
   breadthValidated:breadthAllowed,
  },rows};
}
