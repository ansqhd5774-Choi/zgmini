import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeAssetR10RawForUi} from '../app/asset-bubble/asset-r10-raw-ui-r1.mjs';
import {mergeAssetR10HistoryForUi} from '../app/asset-bubble/asset-r10-history-ui-r1.mjs';

const ids=['valuationPressure','priceAcceleration','riskAssetShare',
 'speculativeFlows','breadthDivergence','excessLiquidity'];
const units=['TIMES_GDP','LOG_PERCENT_POINTS','PERCENTAGE_POINTS',
 'PERCENT_OF_PRIOR_HOLDINGS','PERCENTILE_POINTS','PERCENTAGE_POINTS'];
const sources=['FRB_Z1_EQUITY_MARKET_VALUE_AND_BEA_GDP',
 'STORED_SP500_PRICE_3M_VS_12M','FRB_Z1_HOUSEHOLD_EQUITY_SHARE_4Q_CHANGE',
 'FRB_Z1_POSITIVE_EQUITY_NET_FLOW_4Q',
 'STORED_ALPACA_RESEARCH_12M_RETURN_VS_200MA_BREADTH',
 'FRB_M2_YOY_MINUS_BEA_NOMINAL_GDP_YOY'];
const quarters=['2025-Q2','2025-Q3','2025-Q4','2026-Q1','2026-Q2'];
const startDates=['2025-04-01','2025-07-01','2025-10-01','2026-01-01','2026-04-01'];
const endDates=['2025-06-30','2025-09-30','2025-12-31','2026-03-31','2026-06-30'];
const fixedScore=22.57324252737245;
const sourceVersion='macro:2026-10-28:'+('a'.repeat(64));
const storedAt=1793203206694;
const build=()=>{
 const factors=ids.map((id,i)=>{
  const missing=i===4?quarters.slice(0,2):[];
  const end=i===1||i===4;
  const points=quarters.map((quarter,j)=>({
   quarter,observationDate:i===4&&j<2?null:(end?endDates:startDates)[j],
   value:i===4&&j<2?null:(i*10+j+(i===3&&j===2?-2:0))
  }));
  return {id,unit:units[i],source:sources[i],status:missing.length?'PARTIAL_1Y':'READY_1Y',missingQuarters:missing,points};
 });
 const history={schemaVersion:'asset-bubble-r10-history-r1-v1',status:'PARTIAL',
  historyMode:'CURRENT_VINTAGE_NOT_PIT',rightsStatus:'USER_ACCEPTED_UNVERIFIED',
  sourceVersion,sourceStoredAt:storedAt,asOfDate:'2026-10-28',
  scoreObservationQuarter:'2026-Q2',firstQuarter:'2025-Q2',lastQuarter:'2026-Q2',
  approvedScore:fixedScore,factors};
 const scored={status:'READY',score:fixedScore,methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',
  historyMode:'CURRENT_VINTAGE_ONLY',rightsStatus:'USER_ACCEPTED_UNVERIFIED',
  sourceVersion,sourceStoredAt:storedAt,asOfDate:'2026-10-28',scoreObservationQuarter:'2026-Q2',
  indicators:ids.map((id,i)=>({id,score:i*10,status:'READY',value:null,unit:'점'}))};
 const raw={schemaVersion:'asset-bubble-r10-raw-r1-v1',status:'READY',
  sourceVersion,sourceStoredAt:storedAt,asOfDate:'2026-10-28',
  scoreObservationQuarter:'2026-Q2',rightsStatus:'USER_ACCEPTED_UNVERIFIED',
  diagnosticScore:fixedScore,
  factors:factors.map((factor,i)=>({id:factor.id,unit:factor.unit,source:factor.source,
   score:i*10,value:factor.points[4].value,previousValue:factor.points[3].value,
   observationDate:factor.points[4].observationDate,
   previousObservationDate:factor.points[3].observationDate}))};
 return {history,scored,raw};
};
const clone=x=>JSON.parse(JSON.stringify(x));
test('five complete quarterly histories and only three breadth observations reach six sparkline rows',()=>{
 const {history,scored,raw}=build();
 const old=mergeAssetR10RawForUi(scored,raw);
 assert.equal(old.indicators[0].trend.length,2);
 const merged=mergeAssetR10HistoryForUi(old,history);
 assert.deepEqual(merged.indicators.map(x=>x.trend.length),[5,5,5,5,3,5]);
 assert.equal(merged.indicators[4].trend[0].date,'2025-12-31');
 assert.deepEqual(merged.indicators.map(x=>x.historyStatus),[
  'READY_1Y','READY_1Y','READY_1Y','READY_1Y','PARTIAL_1Y','READY_1Y']);
 assert.equal(merged.score,scored.score);
 assert.deepEqual(merged.indicators.map(x=>x.score),scored.indicators.map(x=>x.score));
});
test('mismatched current score or raw vintage does not falsely display full year',()=>{
 const {history,scored,raw}=build();
 const original=mergeAssetR10RawForUi(scored,raw);
 for(const field of ['sourceVersion','sourceStoredAt','asOfDate','approvedScore']){
  const bad=clone(history);bad[field]=field==='sourceStoredAt'?storedAt+1:
   field==='approvedScore'?fixedScore+1:'WRONG';
  assert.equal(mergeAssetR10HistoryForUi(original,bad),original,field);
 }
 const invalid=clone(history);invalid.factors[0].points[0].value=null;
 assert.equal(mergeAssetR10HistoryForUi(original,invalid),original);
});
test('missing/pending/invalid history preserves 2-point raw fallback without invented values',()=>{
 const {scored,raw}=build();
 const original=mergeAssetR10RawForUi(scored,raw);
 for(const missing of [null,{status:'PENDING'},{status:'unavailable'}]){
  const result=mergeAssetR10HistoryForUi(original,missing);
  assert.equal(result,original);
  assert.deepEqual(result.indicators.map(row=>row.trend.length),[2,2,2,2,2,2]);
 }
});
test('React panel fetches separate public stored history only for R10 and identifies partial history',()=>{
 const panel=readFileSync(new URL('../app/asset-bubble/asset-bubble-panel.tsx',import.meta.url),'utf8');
 assert.match(panel,/useStoredIndex<HistoryPayload>\('\/api\/asset-bubble-history'/);
 assert.match(panel,/mergeAssetR10HistoryForUi\(mergeAssetR10RawForUi\(payload,raw\),history\)/);
 assert.match(panel,/trendPeriodLabel\?\?"실제 저장된 관측 2개"/);
 assert.match(panel,/historyStatus==="PARTIAL_1Y"\?"부분 관측 추이"/);
 assert.match(panel,/fullYearFactors===5&&partialHistoryFactors===1/);
 assert.doesNotMatch(panel,/미니차트\(1Y\)/);
});
