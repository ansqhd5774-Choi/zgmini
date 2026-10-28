import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ASSET_R10_HISTORY_KEY,toAssetR10HistoryPayload,
 validateAssetR10History,readAssetR10HistoryResponse,assetR10HistoryWriter}
 from '../worker/asset-bubble-r10-history-r1.mjs';
import {mergeAssetR10HistoryForUi}
 from '../app/asset-bubble/asset-r10-history-ui-r1.mjs';

const IDS=['valuationPressure','priceAcceleration','riskAssetShare',
 'speculativeFlows','breadthDivergence','excessLiquidity'];
const UNITS=['TIMES_GDP','LOG_PERCENT_POINTS','PERCENTAGE_POINTS',
 'PERCENT_OF_PRIOR_HOLDINGS','PERCENTILE_POINTS','PERCENTAGE_POINTS'];
const SOURCES=['FRB_Z1_EQUITY_MARKET_VALUE_AND_BEA_GDP',
 'STORED_SP500_PRICE_3M_VS_12M','FRB_Z1_HOUSEHOLD_EQUITY_SHARE_4Q_CHANGE',
 'FRB_Z1_POSITIVE_EQUITY_NET_FLOW_4Q',
 'STORED_ALPACA_RESEARCH_12M_RETURN_VS_200MA_BREADTH',
 'FRB_M2_YOY_MINUS_BEA_NOMINAL_GDP_YOY'];
const quarters=['2025-Q2','2025-Q3','2025-Q4','2026-Q1','2026-Q2'];
const dates=['2025-04-01','2025-07-01','2025-10-01','2026-01-01','2026-04-01'];
const now=Date.parse('2026-10-29T12:00:00Z');

function fixture(){
 const factors=IDS.map((id,i)=>({id,unit:UNITS[i],source:SOURCES[i],
  status:i===4?'PARTIAL_1Y':'READY_1Y',
  missingQuarters:i===4?quarters.slice(0,2):[],
  points:quarters.map((quarter,j)=>({quarter,
   observationDate:i===4&&j<2?null:dates[j],
   value:i===4&&j<2?null:i+10+j}))}));
 return {schemaVersion:'asset-bubble-r10-one-year-readonly-r1',
  status:'PARTIAL_1Y_READONLY',approvedRawParity:'PASS',
  historicalMode:'CURRENT_VINTAGE_NOT_PIT',rightsStatus:'USER_ACCEPTED_UNVERIFIED',
  sourceVersion:'macro:2026-10-28:fixture',sourceStoredAt:Date.parse('2026-10-27T00:00:00Z'),
  asOfDate:'2026-10-28',scoreObservationQuarter:'2026-Q2',
  firstQuarter:'2025-Q2',lastQuarter:'2026-Q2',approvedScore:22.57324252737245,
  factors,providerRequests:0,pcSqliteWrites:0,d1Writes:0,
  scoreWrites:0,deployments:0};
}

function scored(payload){
 return {status:'READY',methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',
  historyMode:'CURRENT_VINTAGE_ONLY',rightsStatus:payload.rightsStatus,
  sourceVersion:payload.sourceVersion,sourceStoredAt:payload.sourceStoredAt,
  asOfDate:payload.asOfDate,scoreObservationQuarter:payload.scoreObservationQuarter,
  score:payload.approvedScore,
  indicators:payload.factors.map(f=>({id:f.id,status:'READY',rawUnit:f.unit,
   source:f.source,value:f.points[4].value,previousValue:f.points[3].value,
   observationDate:f.points[4].observationDate,
   previousObservationDate:f.points[3].observationDate,
   trend:f.points.slice(3).map(p=>({date:p.observationDate,value:p.value}))}))};
}

test('partial breadth preserves nulls and joins five real quarters elsewhere',()=>{
 const payload=toAssetR10HistoryPayload(fixture());
 assert.equal(payload.status,'PARTIAL');
 const base=scored({...fixture(),historyMode:'CURRENT_VINTAGE_ONLY'});
 const merged=mergeAssetR10HistoryForUi(base,payload);
 assert.notEqual(merged,base);
 assert.equal(merged.score,base.score);
 assert.equal(merged.indicators[0].trend.length,5);
 assert.equal(merged.indicators[0].trendPeriodLabel,'1년 · 실제 5개 분기');
 assert.equal(merged.indicators[4].trend.length,3);
 assert.equal(merged.indicators[4].trendPeriodLabel,'실제 3개 분기 · 부분 이력');
 assert.equal(merged.indicators[4].trend[0].date,'2025-10-01');
});

test('invalid lineage and invented or misdated observations cannot replace raw pair',()=>{
 const payload=toAssetR10HistoryPayload(fixture());
 const base=scored({...fixture(),historyMode:'CURRENT_VINTAGE_ONLY'});
 assert.equal(mergeAssetR10HistoryForUi({...base,sourceVersion:'changed'},payload).indicators[0].trend.length,2);
 const altered=structuredClone(payload);
 altered.factors[0].points[4].value+=1;
 assert.equal(mergeAssetR10HistoryForUi(base,altered),base);
 const invented=structuredClone(payload);
 invented.factors[4].points[0]={quarter:'2025-Q2',observationDate:'2025-04-01',value:0};
 assert.throws(()=>validateAssetR10History(invented,{now}),/MISSING_CONTRACT/);
});

test('GET pending is not an outage; invalid methods and query are rejected',async()=>{
 const db={prepare(){return {bind(){return {async first(){return null;}};}};}};
 const pending=await readAssetR10HistoryResponse(new Request('https://zgmini.kr/api/asset-bubble-history'),db,{now});
 assert.equal(pending.status,200);
 assert.equal((await pending.json()).status,'PENDING');
 const invalid=await readAssetR10HistoryResponse(new Request('https://zgmini.kr/api/asset-bubble-history?x=1'),db,{now});
 assert.equal(invalid.status,400);
 const post=await readAssetR10HistoryResponse(new Request('https://zgmini.kr/api/asset-bubble-history',{method:'POST'}),db,{now});
 assert.equal(post.status,405);
});

test('GET validates the independently stored exact readback envelope',async()=>{
 const payload=toAssetR10HistoryPayload(fixture());
 const builtAt=now;
 const body=JSON.stringify({payload,projection:{status:'READY',
  sourceVersion:payload.sourceVersion,sourceStoredAt:payload.sourceStoredAt,builtAt}});
 const db={prepare(){return {bind(){return {async first(){return {body,stored_at:builtAt};}};}};}};
 const result=await readAssetR10HistoryResponse(new Request('https://zgmini.kr/api/asset-bubble-history'),db,{now});
 assert.equal(result.status,200);
 assert.deepEqual(await result.json(),payload);
});

test('D1 writer only writes the history key and verifies exact readback',async()=>{
 const payload=toAssetR10HistoryPayload(fixture());
 let row=null,insertCount=0;
 const db={prepare(sql){
  assert(!sql.includes('DELETE'));
  return {bind(...args){
   assert.equal(args[0],ASSET_R10_HISTORY_KEY);
   return {async first(){return row;},async run(){insertCount++;
    row={body:args[1],stored_at:args[2]};return {meta:{changes:1}};}};
  }};
 }};
 const writer=assetR10HistoryWriter(db);
 const first=await writer.write(payload,{storedAt:now});
 assert.equal(first.status,'READBACK_VERIFIED');
 assert.equal(insertCount,1);
 const again=await writer.write(payload,{storedAt:now});
 assert.equal(again.status,'ALREADY_STORED');
 assert.equal(insertCount,1);
 const conflict=structuredClone(payload);
 conflict.factors[0].points[0].value=99;
 await assert.rejects(writer.write(conflict,{storedAt:now}),/CONFLICTING_CONTENT/);
});

test('one-shot publisher is explicitly gated and does not mutate the raw key',()=>{
 const code=fs.readFileSync(new URL('../scripts/pc-writer/ASSET_R10_1Y_HISTORY_D1_ONE_SHOT_R1.mjs',import.meta.url),'utf8');
 assert.match(code,/--confirm-asset-r10-history-d1-write/);
 assert.match(code,/ASSET_R10_HISTORY_APPROVED_RAW_D1_LINEAGE_MISMATCH/);
 assert.match(code,/assetR10HistoryWriter\(db\)\.write\(payload\)/);
 assert.doesNotMatch(code,/assetR10RawWriter|DELETE FROM|DROP TABLE/);
});
