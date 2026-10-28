import test from 'node:test';
import assert from 'node:assert/strict';
import {
 ASSET_R10_RAW_KEY,ASSET_R10_RAW_ROUTE,ASSET_R10_RAW_SCHEMA,validateAssetR10Raw,
 toAssetR10RawPayload,mergeAssetR10Raw,readAssetR10RawResponse,assetR10RawWriter,
} from '../worker/asset-bubble-r10-raw-r1.mjs';
import {readProjectionResponse} from '../worker/projection-runtime-r52.mjs';

const NOW=Date.parse('2026-10-29T00:00:00Z');
const CHECKPOINT=Date.parse('2026-10-28T10:00:00Z');
const IDS=['valuationPressure','priceAcceleration','riskAssetShare',
 'speculativeFlows','breadthDivergence','excessLiquidity'];
const UNITS=['TIMES_GDP','LOG_PERCENT_POINTS','PERCENTAGE_POINTS',
 'PERCENT_OF_PRIOR_HOLDINGS','PERCENTILE_POINTS','PERCENTAGE_POINTS'];
const SOURCES=['FRB_Z1_EQUITY_MARKET_VALUE_AND_BEA_GDP',
 'STORED_SP500_PRICE_3M_VS_12M','FRB_Z1_HOUSEHOLD_EQUITY_SHARE_4Q_CHANGE',
 'FRB_Z1_POSITIVE_EQUITY_NET_FLOW_4Q',
 'STORED_ALPACA_RESEARCH_12M_RETURN_VS_200MA_BREADTH',
 'FRB_M2_YOY_MINUS_BEA_NOMINAL_GDP_YOY'];
const factorScores=[10,20,30,40,50,60];
const raw=()=>({schemaVersion:ASSET_R10_RAW_SCHEMA,status:'READY',
 sourceVersion:'approved-r10-checkpoint-20261028',sourceStoredAt:CHECKPOINT,
 asOfDate:'2026-10-28',scoreObservationQuarter:'2026-Q2',diagnosticQuarter:'2026-Q4',
 historyMode:'CURRENT_VINTAGE_NOT_PIT',rightsStatus:'USER_ACCEPTED_UNVERIFIED',
 diagnosticScore:32.5,factors:IDS.map((id,i)=>({id,score:factorScores[i],
  value:i+.25,previousValue:i+.1,unit:UNITS[i],source:SOURCES[i],
  observationDate:i===1||i===4?'2026-06-30':'2026-04-01',
  previousObservationDate:'2026-01-01'}))});
const scored=()=>({status:'READY',methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',
 sourceVersion:'approved-r10-checkpoint-20261028',sourceStoredAt:CHECKPOINT,
 asOfDate:'2026-10-28',scoreObservationQuarter:'2026-Q2',
 historyMode:'CURRENT_VINTAGE_ONLY',rightsStatus:'USER_ACCEPTED_UNVERIFIED',
 score:32.5,indicators:IDS.map((id,i)=>({id,score:factorScores[i],
  weight:[.2,.2,.2,.1,.2,.1][i],status:'READY',value:null,unit:'점'}))});
const envelope=(payload=raw())=>JSON.stringify({payload,projection:{
 status:'READY',sourceVersion:payload.sourceVersion,
 sourceStoredAt:payload.sourceStoredAt,builtAt:NOW-2000}});

function mockDb(rows=new Map()){
 let writes=0;
 const db={prepare(sql){return {bind(...params){return {
  async first(){return rows.get(params[0])??null;},
  async all(){return {results:rows.has(params[0])?[rows.get(params[0])]:[]};},
  async run(){
   assert.match(sql,/^INSERT INTO market_public_snapshots_v1/);
   writes++;
   rows.set(params[0],{body:params[1],stored_at:params[2]});
   return {meta:{changes:1}};
  },
 };}};}};
 return {db,rows,getWrites:()=>writes};
}

test('preflight envelope converts to six approved raw observations',()=>{
 const payload=raw();
 assert.equal(validateAssetR10Raw(payload,{now:NOW}),payload);
 const converted=toAssetR10RawPayload({...payload,
  status:'PASS_READONLY_ASSET_R10_RAW_PREFLIGHT',
  schemaVersion:'asset-bubble-r10-raw-readonly-r1',
  historicalMode:payload.historyMode,
  providerRequests:0,pcSqliteWrites:0,d1Writes:0,scoreWrites:0});
 assert.deepEqual(converted,payload);
});

test('score and all six factor scores remain unchanged, raw units are labeled',()=>{
 const before=scored();
 const merged=mergeAssetR10Raw(before,raw(),{now:NOW});
 assert.equal(merged.score,before.score);
 assert.deepEqual(merged.indicators.map(r=>r.score),before.indicators.map(r=>r.score));
 assert.deepEqual(merged.indicators.map(r=>r.value),raw().factors.map(r=>r.value));
 assert.deepEqual(merged.indicators.map(r=>r.unit),['배','로그 %p','%p','%','백분위점','%p']);
 assert.deepEqual(merged.indicators.map(r=>r.rawUnit),UNITS);
 assert.deepEqual(before.indicators.map(r=>r.value),Array(6).fill(null));
});

test('mismatched source or score is not merged (no fake raw values)',()=>{
 for(const change of [
  {sourceVersion:'newer-than-raw'},{sourceStoredAt:CHECKPOINT+1},
  {asOfDate:'2026-10-29'},{score:35},
 ]){
  const before={...scored(),...change};
  assert.equal(mergeAssetR10Raw(before,raw(),{now:NOW}),before);
 }
 const before=scored();before.indicators[0].score=99;
 assert.equal(mergeAssetR10Raw(before,raw(),{now:NOW}),before);
});

test('invalid unit, future source, bad prior quarter, bad source are rejected',()=>{
 for(const modify of [
  x=>x.factors[0].unit='점',
  x=>x.sourceStoredAt=NOW+1,
  x=>x.factors[0].previousObservationDate='2025-10-01',
  x=>x.factors[1].source='SP500_LIVE',
 ]){
  const changed=raw();modify(changed);
  assert.throws(()=>validateAssetR10Raw(changed,{now:NOW}),/ASSET_R10_RAW_INVALID/);
 }
});

test('missing/invalid D1 raw key safely returns unavailable on separate raw API',async()=>{
 const {db,rows}=mockDb(),request=new Request('https://zgmini.kr'+ASSET_R10_RAW_ROUTE);
 const missing=await readAssetR10RawResponse(request,db,{now:NOW});
 assert.equal(missing.status,200);
 assert.deepEqual(await missing.json(),{status:'PENDING',reason:'STORED_PROJECTION_PENDING'});
 rows.set(ASSET_R10_RAW_KEY,{body:'{broken',stored_at:NOW-2000});
 const invalid=await readAssetR10RawResponse(request,db,{now:NOW});
 assert.equal(invalid.status,503);
 assert.equal((await invalid.json()).reason,'STORED_PROJECTION_INVALID');
});

test('raw sidecar writes once with exact readback and idempotence',async()=>{
 const {db,getWrites,rows}=mockDb();
 const writer=assetR10RawWriter(db);
 const first=await writer.write(raw(),{storedAt:NOW-2000});
 assert.equal(first.status,'READBACK_VERIFIED');
 assert.equal(getWrites(),1);
 assert.equal(first.key,ASSET_R10_RAW_KEY);
 const next=await writer.write(raw(),{storedAt:NOW-2000});
 assert.equal(next.status,'ALREADY_STORED');
 assert.equal(getWrites(),1);
 const response=await readAssetR10RawResponse(
  new Request('https://zgmini.kr'+ASSET_R10_RAW_ROUTE),db,{now:NOW});
 assert.equal(response.status,200);
 const merged=mergeAssetR10Raw(scored(),await response.json(),{now:NOW});
 assert.equal(merged.indicators[0].value,.25);
 const incompatible=raw();incompatible.sourceVersion='other-source-version-2026';
 await assert.rejects(writer.write(incompatible,{storedAt:NOW-2000}),
  /ASSET_R10_RAW_CONFLICTING_VERSION/);
 assert.equal(getWrites(),1);
 assert.ok(rows.has(ASSET_R10_RAW_KEY));
});

test('existing score endpoint remains one SELECT and unchanged when sidecar is present',async()=>{
 const rows=new Map(),{db}=mockDb(rows);
 const publicKey='detail:asset-bubble:v1';
 rows.set(publicKey,{stored_at:NOW-1000,body:JSON.stringify({payload:scored(),projection:{
  status:'READY',sourceVersion:'projection-source',expectedSourceVersion:'projection-source',
  sourceStoredAt:CHECKPOINT,expectedSourceStoredAt:CHECKPOINT,
  builtAt:NOW-1000}})});
 const request=new Request('https://zgmini.kr/api/asset-bubble-detail');
 const old=await readProjectionResponse(request,db,'assetBubble',{now:NOW});
 assert.equal(old.status,200);
 assert.equal((await old.json()).indicators[0].value,null);
 rows.set(ASSET_R10_RAW_KEY,{body:envelope(),stored_at:NOW-2000});
 const newer=await readProjectionResponse(request,db,'assetBubble',{now:NOW});
 assert.equal(newer.status,200);
 const body=await newer.json();
 assert.equal(body.indicators[0].value,null);
 assert.equal(body.score,32.5);
 const rawResponse=await readAssetR10RawResponse(
  new Request('https://zgmini.kr'+ASSET_R10_RAW_ROUTE),db,{now:NOW});
 assert.equal(rawResponse.status,200);
 const joined=mergeAssetR10Raw(body,await rawResponse.json(),{now:NOW});
 assert.equal(joined.indicators[0].value,.25);
});
