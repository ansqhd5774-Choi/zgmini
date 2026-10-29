import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {equivalentR10Sidecar,publishAssetR10Sidecars}
 from '../scripts/pc-writer/asset-r10-sidecar-auto-publication-r1.mjs';
import {ASSET_R10_RAW_KEY} from '../worker/asset-bubble-r10-raw-r1.mjs';
import {ASSET_R10_HISTORY_KEY} from '../worker/asset-bubble-r10-history-r1.mjs';
import {PUBLIC_PROJECTION_KEYS} from '../worker/market-public-projection-store.mjs';

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
const macro='728cb9b8d7fe547bf7bcf740bbdd31c733408948fdc0c0b4a83ba0d0f80c9db9';
const when=Date.parse('2026-10-29T07:00:00Z');
const version='macro:2026-10-28:'+macro;
const storedAt=1793203206694;
const score=22.57324252737245;
const copy=o=>structuredClone(o);

function samples(){
 const factors=IDS.map((id,i)=>({id,unit:UNITS[i],source:SOURCES[i],
  status:i===4?'PARTIAL_1Y':'READY_1Y',
  missingQuarters:i===4?quarters.slice(0,2):[],
  points:quarters.map((quarter,j)=>({quarter,
   observationDate:i===4&&j<2?null:dates[j],
   value:i===4&&j<2?null:i+j+1}))}));
 const rawFactors=factors.map((f,i)=>({id:f.id,unit:f.unit,source:f.source,
  score:i+5,value:f.points[4].value,previousValue:f.points[3].value,
  observationDate:f.points[4].observationDate,
  previousObservationDate:f.points[3].observationDate}));
 const raw={schemaVersion:'asset-bubble-r10-raw-r1-v1',status:'READY',
  historyMode:'CURRENT_VINTAGE_NOT_PIT',rightsStatus:'USER_ACCEPTED_UNVERIFIED',
  sourceVersion:version,sourceStoredAt:storedAt,asOfDate:'2026-10-28',
  scoreObservationQuarter:'2026-Q2',diagnosticQuarter:'2026-Q4',
  diagnosticScore:score,factors:rawFactors};
 const history={schemaVersion:'asset-bubble-r10-history-r1-v1',status:'PARTIAL',
  historyMode:'CURRENT_VINTAGE_NOT_PIT',rightsStatus:'USER_ACCEPTED_UNVERIFIED',
  sourceVersion:version,sourceStoredAt:storedAt,asOfDate:'2026-10-28',
  scoreObservationQuarter:'2026-Q2',firstQuarter:'2025-Q2',
  lastQuarter:'2026-Q2',approvedScore:score,factors};
 const scored={status:'READY',methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',
  historyMode:'CURRENT_VINTAGE_ONLY',rightsStatus:'USER_ACCEPTED_UNVERIFIED',
  sourceVersion:version,sourceStoredAt:storedAt,asOfDate:'2026-10-28',
  scoreObservationQuarter:'2026-Q2',score,
  indicators:rawFactors.map(f=>({id:f.id,status:'READY',score:f.score}))};
 const rawAudit=()=>({...raw,status:'PASS_READONLY_ASSET_R10_RAW_PREFLIGHT',
  historicalMode:raw.historyMode,
  pcSqliteWrites:0,d1Writes:0,scoreWrites:0,providerRequests:0});
 const historyAudit=()=>({...history,status:'PARTIAL_1Y_READONLY',
  historicalMode:history.historyMode,approvedRawParity:'PASS',
  pcSqliteWrites:0,d1Writes:0,scoreWrites:0,providerRequests:0,deployments:0});
 return {raw,history,scored,rawAudit,historyAudit};
}

function fakeRemote(scored,{rows=new Map(),onWrite}={}){
 let writes=0,failOnce=onWrite;
 const storeRow=(key,payload,stored=when-2000)=>{
  rows.set(key,{stored_at:stored,body:JSON.stringify({payload,
   projection:{status:'READY',sourceVersion:payload.sourceVersion,
    sourceStoredAt:payload.sourceStoredAt,builtAt:stored}})});
 };
 storeRow(PUBLIC_PROJECTION_KEYS.assetBubble,scored);
 const db={prepare(sql){return {bind(...args){return {
  async first(){return rows.get(args[0])??null;},
  async run(){
   assert.match(sql,/^INSERT INTO market_public_snapshots_v1/);
   assert.ok([ASSET_R10_RAW_KEY,ASSET_R10_HISTORY_KEY].includes(args[0]));
   if(failOnce){const e=failOnce;failOnce=null;throw Error(e);}
   writes++;rows.set(args[0],{body:args[1],stored_at:args[2]});
   return {meta:{changes:1}};
  },
 };}};}};
 return {rows,storeRow,getWrites:()=>writes,remote:{
  async query(dbId,sql,params){assert.equal(dbId,'db-test');
   assert.match(sql,/^SELECT body FROM market_public_snapshots_v1/);
   return {results:rows.get(params[0])?[rows.get(params[0])]:[]};},
  adapter(id,opts){assert.equal(id,'db-test');assert.equal(opts.allowWrites,true);return db;}
 }};
}
const publish=(sample,remote)=>publishAssetR10Sidecars({
 pcHome:'C:/approved-test-only',coreDb:'db-test',remote,scored:sample.scored,
 rawAudit:sample.rawAudit,historyAudit:sample.historyAudit,now:when,
});

test('fresh approved score publishes only two preapproved sidecar keys with exact readbacks',async()=>{
 const data=samples(),mock=fakeRemote(data.scored);
 const r=await publish(data,mock.remote);
 assert.equal(mock.getWrites(),2);
 assert.deepEqual(r.keys,{raw:'READBACK_VERIFIED',history:'READBACK_VERIFIED'});
 assert.deepEqual(r.historyPoints,[5,5,5,5,3,5]);
 assert.equal(r.scoreWrites,0);assert.equal(r.providerRequests,0);
 assert.deepEqual([...mock.rows.keys()].sort(),
  [ASSET_R10_RAW_KEY,ASSET_R10_HISTORY_KEY,PUBLIC_PROJECTION_KEYS.assetBubble].sort());
});
test('identical stored sidecars are read-only on subsequent scheduled cycles',async()=>{
 const data=samples(),mock=fakeRemote(data.scored);
 await publish(data,mock.remote);
 const second=await publish(data,mock.remote);
 assert.equal(mock.getWrites(),2);
 assert.deepEqual(second.keys,{raw:'UNCHANGED_VERIFIED',history:'UNCHANGED_VERIFIED'});
});
test('daily asOf metadata-only update with same source fingerprint does not write',async()=>{
 const data=samples(),mock=fakeRemote(data.scored);
 mock.storeRow(ASSET_R10_RAW_KEY,{...data.raw,asOfDate:'2026-10-27',
  sourceVersion:'macro:2026-10-27:'+macro,sourceStoredAt:storedAt-10000});
 mock.storeRow(ASSET_R10_HISTORY_KEY,{...data.history,asOfDate:'2026-10-27',
  sourceVersion:'macro:2026-10-27:'+macro,sourceStoredAt:storedAt-10000});
 const r=await publish(data,mock.remote);
 assert.deepEqual(r.keys,{raw:'UNCHANGED_VERIFIED',history:'UNCHANGED_VERIFIED'});
 assert.equal(mock.getWrites(),0);
});
test('new historical observation or input digest requires write, with no backdated data',async()=>{
 const data=samples(),mock=fakeRemote(data.scored);
 await publish(data,mock.remote);
 const before=copy(data.history);
 const later=copy(data.history);
 later.factors[0].points[0].value+=.25;
 assert.equal(equivalentR10Sidecar(before,later,'history'),false);
 const newDigest={...data.raw,sourceVersion:'macro:2026-10-29:'+('c'.repeat(64)),
  sourceStoredAt:storedAt+2000,asOfDate:'2026-10-29'};
 assert.equal(equivalentR10Sidecar(data.raw,newDigest,'raw'),false);
});
test('score not yet remotely verified stops before either sidecar write',async()=>{
 const data=samples();const mock=fakeRemote({...data.scored,score:41});
 await assert.rejects(publish(data,mock.remote),/LOCAL_LINEAGE_MISMATCH/);
 assert.equal(mock.getWrites(),0);
});
test('changed score source, factor score or latest observed value blocks both writes',async()=>{
 const data=samples();
 for(const change of [
  sample=>{sample.scored.sourceVersion='unexpected';},
  sample=>{sample.scored.indicators[2].score++;},
  sample=>{const old=sample.rawAudit;sample.rawAudit=()=>{const v=old();v.factors[0].value++;return v;};},
 ]){
  const sample=samples();change(sample);
  const mock=fakeRemote(sample.scored);
  await assert.rejects(publish(sample,mock.remote),/LOCAL_LINEAGE_MISMATCH/);
  assert.equal(mock.getWrites(),0);
 }
});
test('unknown remote write outcome halts without attempting the second key',async()=>{
 const data=samples(),mock=fakeRemote(data.scored,{onWrite:'D1_OUTCOME_UNKNOWN'});
 await assert.rejects(publish(data,mock.remote),/D1_OUTCOME_UNKNOWN/);
 assert.equal(mock.getWrites(),0);
 assert.equal(mock.rows.has(ASSET_R10_HISTORY_KEY),false);
});
test('old newer remote source cannot be overwritten',async()=>{
 const data=samples(),mock=fakeRemote(data.scored);
 mock.storeRow(ASSET_R10_RAW_KEY,{...data.raw,
  sourceStoredAt:data.raw.sourceStoredAt+1000,sourceVersion:'changed-version'});
 await assert.rejects(publish(data,mock.remote),/REMOTE_NEWER_PRESERVED/);
 assert.equal(mock.getWrites(),0);
});
test('existing approved PC lane is only trigger; no provider calls, scheduler or D1 schema change',()=>{
 const writer=readFileSync(new URL('../scripts/pc-writer/run-local.mjs',import.meta.url),'utf8');
 assert.match(writer,/if\(report\.assetR10\?\.status==='READY'\)/);
 assert.match(writer,/await attemptOutput\(report,'asset-r10-sidecars-publication'/);
 assert.match(writer,/report\.assetR10Sidecars=await publishAssetR10Sidecars/);
 const source=readFileSync(new URL('../scripts/pc-writer/asset-r10-sidecar-auto-publication-r1.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\b(?:collectLocal|fetch|wrangler)\s*\(|\b(?:CREATE|DROP)\s+TABLE\b/i);
 assert.match(source,/ASSET_R10_RAW_KEY/);assert.match(source,/ASSET_R10_HISTORY_KEY/);
});
