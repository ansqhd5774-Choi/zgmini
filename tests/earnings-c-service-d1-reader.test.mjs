// Offline-only D1 contract tests: WPSFD42 separate checkpoint + GET merge.
// No Cloudflare API, BLS provider, operational SQLite, or deployment access.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EARNINGS_C_SNAPSHOT_KEY,EARNINGS_C_SERVICE_SNAPSHOT_KEY,EARNINGS_C_ROUTE,
  earningsCompanionWriter,readEarningsCompanionResponse,
  validateEarningsCompanionPayload,
} from '../worker/earnings-companion-c-r4.mjs';

const NOW=Date.parse('2026-10-27T10:00:00.000Z');
const SOURCE_AT=Date.parse('2026-10-26T17:02:53.996Z');
const RETRIEVED_AT=new Date(SOURCE_AT).toISOString();
const MONTHS=Array.from({length:13},(_,i)=>{
  const month=8+i;return `${2025+Math.floor(month/12)}-${String(month%12+1).padStart(2,'0')}`;
});
const QUARTERS=['2025-Q2','2025-Q3','2025-Q4','2026-Q1','2026-Q2'];

function row({id,seriesId,periods,values,method='SOURCE_INDEX',unit='INDEX'}){
  const quarterly=seriesId==='PRS85006111';
  const last=values.at(-1),previous=values.at(-2);
  return {
    indicatorId:id,name:'독립 저장 검증 지표',category:'COST_PRESSURE',
    kind:method==='YOY_SA_T_MINUS_12'?'DERIVED':'RAW',
    value:last,unit,frequency:quarterly?'QUARTERLY':'MONTHLY',adjustment:'SA',
    observationPeriod:periods.at(-1),previousPeriod:periods.at(-2),
    previousValue:previous,change:last-previous,
    changeUnit:unit==='INDEX'?'INDEX_POINTS':'PERCENTAGE_POINTS',
    releaseDate:null,nextReleaseDate:null,retrievedAt:RETRIEVED_AT,
    provider:'BLS',seriesId,publisher:'U.S. Bureau of Labor Statistics',
    sourceURL:`https://data.bls.gov/timeseries/${seriesId}`,
    method,status:'READY',unavailableReason:null,
    history:periods.map((period,i)=>({period,value:values[i]})),
    historyCoverage:{actualPoints:periods.length,expectedPeriods:periods.length,complete:true},
  };
}
function payload(rows,version){
  return {
    schemaVersion:'earnings-companion-c-r4-v1',status:'READY',
    sourceVersion:version.repeat(64),sourceStoredAt:SOURCE_AT,
    generatedAt:'2026-10-27T06:13:08.700Z',
    historicalMode:'CURRENT_RETRIEVAL_NOT_PIT',
    observedThroughBySeries:Object.fromEntries(rows.map(x=>[x.seriesId,x.observationPeriod])),
    coverage:{configured:rows.length,ready:rows.length,partial:0,unavailable:0},rows,
  };
}
function basePayload(){
  return payload([
    row({id:'bls_ppi_final_demand_yoy_sa',seriesId:'WPSFD4',
      periods:MONTHS,values:MONTHS.map((_,i)=>i/10),
      method:'YOY_SA_T_MINUS_12',unit:'PERCENT'}),
    row({id:'bls_ppi_final_demand_index',seriesId:'WPSFD4',
      periods:MONTHS,values:MONTHS.map((_,i)=>100+i)}),
    row({id:'bls_ppi_goods_yoy_sa',seriesId:'WPSFD41',
      periods:MONTHS,values:MONTHS.map((_,i)=>i/20),
      method:'YOY_SA_T_MINUS_12',unit:'PERCENT'}),
    row({id:'bls_ppi_goods_index',seriesId:'WPSFD41',
      periods:MONTHS,values:MONTHS.map((_,i)=>120+i)}),
    row({id:'bls_unit_labor_cost_yoy',seriesId:'PRS85006111',
      periods:QUARTERS,values:QUARTERS.map((_,i)=>i+1),method:'SOURCE_YOY',unit:'PERCENT'}),
  ],'a');
}
function servicePayload(){
  return payload([
    row({id:'bls_ppi_services_yoy_sa',seriesId:'WPSFD42',
      periods:MONTHS,values:MONTHS.map((_,i)=>i/10),method:'YOY_SA_T_MINUS_12',unit:'PERCENT'}),
    row({id:'bls_ppi_services_index',seriesId:'WPSFD42',
      periods:MONTHS,values:MONTHS.map((_,i)=>140+i)}),
  ],'b');
}
function d1(){
  const records=new Map(),actions=[];
  return {
    records,actions,prepare(sql){
      return {bind(...args){
        return {
          async first(){
            actions.push({kind:'READ',key:args[0],sql});
            return records.get(args[0])??null;
          },
          async run(){
            actions.push({kind:'WRITE',key:args[0],sql});
            assert.match(sql,/^INSERT INTO market_public_snapshots_v1/);
            const [key,body,storedAt,newSource,maxStoredAt]=args;
            const previous=records.get(key);
            if(previous){
              const oldSource=JSON.parse(previous.body).projection.sourceStoredAt;
              if(!(oldSource<newSource&&previous.stored_at<=maxStoredAt))
                return {meta:{changes:0}};
            }
            records.set(key,{body,stored_at:storedAt});
            return {meta:{changes:1}};
          },
        };
      }};
    },
  };
}
const request=()=>new Request(`https://zgmini.kr${EARNINGS_C_ROUTE}`);

test('WPSFD42 D1 writer uses only service checkpoint and GET merges 5+2 without writes',async()=>{
  const db=d1(),base=basePayload(),service=servicePayload();
  assert.equal(validateEarningsCompanionPayload(service,{now:NOW}),service);
  const original=await earningsCompanionWriter(db).write(base,{storedAt:NOW-1000});
  assert.equal(original.status,'READBACK_VERIFIED');
  const baseJSON=db.records.get(EARNINGS_C_SNAPSHOT_KEY).body;
  let reply=await readEarningsCompanionResponse(request(),db,{now:NOW});
  assert.equal(reply.status,200);
  assert.equal(reply.headers.get('x-earnings-c-service'),'NOT_PUBLISHED');
  assert.equal((await reply.json()).rows.length,5);

  const published=await earningsCompanionWriter(db,{
    snapshotKey:EARNINGS_C_SERVICE_SNAPSHOT_KEY,
  }).write(service,{storedAt:NOW-500});
  assert.equal(published.status,'READBACK_VERIFIED');
  assert.equal(published.key,EARNINGS_C_SERVICE_SNAPSHOT_KEY);
  assert.equal(db.records.get(EARNINGS_C_SNAPSHOT_KEY).body,baseJSON);
  const beforeGet=db.actions.length;
  reply=await readEarningsCompanionResponse(request(),db,{now:NOW});
  assert.equal(reply.status,200);
  assert.equal(reply.headers.get('x-earnings-c-service'),'READY');
  const merged=await reply.json();
  assert.equal(merged.rows.length,7);
  assert.deepEqual(merged.rows.slice(5).map(x=>x.seriesId),['WPSFD42','WPSFD42']);
  assert.deepEqual(merged.coverage,{configured:7,ready:7,partial:0,stale:0,unavailable:0});
  assert.match(merged.sourceVersion,/^[0-9a-f]{64}$/);
  assert.notEqual(merged.sourceVersion,base.sourceVersion);
  assert.equal(db.records.size,2);
  assert.deepEqual(db.actions.slice(beforeGet).map(x=>[x.kind,x.key]),[
    ['READ',EARNINGS_C_SNAPSHOT_KEY],['READ',EARNINGS_C_SERVICE_SNAPSHOT_KEY],
  ]);
});

test('same WPSFD42 content cannot overwrite the established base key; service repeat is no-op',async()=>{
  const db=d1(),service=servicePayload(),writer=earningsCompanionWriter(db,{
    snapshotKey:EARNINGS_C_SERVICE_SNAPSHOT_KEY,
  });
  await assert.rejects(earningsCompanionWriter(db).write(service,{storedAt:NOW-1000}),
    /EARNINGS_C_SERVICE_REQUIRES_SEPARATE_KEY/);
  await assert.rejects(writer.write(basePayload(),{storedAt:NOW-1000}),
    /EARNINGS_C_INVALID_SERVICE_PAYLOAD/);
  assert.equal(db.actions.filter(x=>x.kind==='WRITE').length,0);
  assert.equal((await writer.write(service,{storedAt:NOW-1000})).status,'READBACK_VERIFIED');
  const repeated=await writer.write(service,{storedAt:NOW-100});
  assert.equal(repeated.status,'ALREADY_STORED');
  assert.equal(db.actions.filter(x=>x.kind==='WRITE').length,1);
  assert.deepEqual([...db.records.keys()],[EARNINGS_C_SERVICE_SNAPSHOT_KEY]);
});

test('invalid optional WPSFD42 checkpoint is ignored without exposing invalid service rows',async()=>{
  const db=d1();
  await earningsCompanionWriter(db).write(basePayload(),{storedAt:NOW-1000});
  const bad=servicePayload();
  bad.rows[0].value=9999;
  const envelope={payload:bad,projection:{
    status:'READY',sourceVersion:bad.sourceVersion,sourceStoredAt:bad.sourceStoredAt,
    expectedSourceVersion:bad.sourceVersion,expectedSourceStoredAt:bad.sourceStoredAt,
    builtAt:NOW-500,
  }};
  db.records.set(EARNINGS_C_SERVICE_SNAPSHOT_KEY,{
    body:JSON.stringify(envelope),stored_at:NOW-500,
  });
  const before=db.actions.filter(x=>x.kind==='WRITE').length;
  const reply=await readEarningsCompanionResponse(request(),db,{now:NOW});
  assert.equal(reply.status,200);
  assert.equal(reply.headers.get('x-earnings-c-service'),'INVALID');
  const body=await reply.json();
  assert.equal(body.rows.length,5);
  assert.equal(body.coverage.configured,5);
  assert.equal(db.actions.filter(x=>x.kind==='WRITE').length,before);
  assert.deepEqual(body.rows.map(x=>x.seriesId),['WPSFD4','WPSFD4','WPSFD41','WPSFD41','PRS85006111']);
});
