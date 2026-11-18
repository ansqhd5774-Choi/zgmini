// Offline-only D1 contract tests: WPSFD42 separate checkpoint + GET merge.
// No Cloudflare API, BLS provider, operational SQLite, or deployment access.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {client as d1Client} from '../scripts/pc-writer/d1.mjs';
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

test('corrupt existing WPSFD42 checkpoint is not reported as ALREADY_STORED',async()=>{
  const cases=[
    envelope=>{envelope.projection.builtAt+=1;},
    envelope=>{envelope.projection.expectedSourceVersion='c'.repeat(64);},
  ];
  for(const corrupt of cases){
    const db=d1(),service=servicePayload();
    const writer=earningsCompanionWriter(db,{
      snapshotKey:EARNINGS_C_SERVICE_SNAPSHOT_KEY,
    });
    assert.equal((await writer.write(service,{storedAt:NOW-1000})).status,
      'READBACK_VERIFIED');
    const existing=db.records.get(EARNINGS_C_SERVICE_SNAPSHOT_KEY);
    const envelope=JSON.parse(existing.body);
    corrupt(envelope);
    db.records.set(EARNINGS_C_SERVICE_SNAPSHOT_KEY,{
      body:JSON.stringify(envelope),stored_at:existing.stored_at,
    });
    const writesBefore=db.actions.filter(x=>x.kind==='WRITE').length;
    await assert.rejects(writer.write(service,{storedAt:NOW-100}),
      /EARNINGS_C_EXISTING_INVALID/);
    assert.equal(db.actions.filter(x=>x.kind==='WRITE').length,writesBefore);
  }
});

const d1FixtureConfig={account:'c'.repeat(32),core:'a'.repeat(36),history:'b'.repeat(36)};
const d1OkResult=(results=[],meta={})=>Response.json({
  success:true,result:[{success:true,results,meta:{rows_read:0,rows_written:0,...meta}}],
});
const d1Sql=options=>JSON.parse(options.body).batch[0].sql;

test('R6-03 base D1 read failures and missing checkpoint remain 503 without GET writes',async()=>{
  const db=d1();
  const before=db.actions.length;
  const pending=await readEarningsCompanionResponse(request(),db,{now:NOW});
  assert.equal(pending.status,503);
  assert.equal((await pending.json()).reason,'STORED_PROJECTION_PENDING');
  const unavailable=await readEarningsCompanionResponse(request(),{
    prepare(){throw Error('D1_HTTP_500');},
  },{now:NOW});
  assert.equal(unavailable.status,503);
  assert.equal((await unavailable.json()).reason,'PROJECTION_READ_UNAVAILABLE');
  const noAdapter=await readEarningsCompanionResponse(request(),null,{now:NOW});
  assert.equal(noAdapter.status,503);
  assert.equal((await noAdapter.json()).reason,'PROJECTION_READ_UNAVAILABLE');
  assert.equal(db.actions.filter(action=>action.kind==='WRITE').length,0);
  assert.equal(db.actions.length,before+1);
});

test('R6-03 optional service read timeout returns verified base five only',async()=>{
  const db=d1(),base=basePayload();
  assert.equal((await earningsCompanionWriter(db).write(base,{storedAt:NOW-1000})).status,
    'READBACK_VERIFIED');
  const baseline=db.records.get(EARNINGS_C_SNAPSHOT_KEY).body;
  const calls=[];
  const fault={
    prepare(sql){
      return {bind(key){
        const item=db.prepare(sql).bind(key);
        return {async first(){
          calls.push(key);
          if(key===EARNINGS_C_SERVICE_SNAPSHOT_KEY)throw Error('D1_OUTCOME_UNKNOWN');
          return item.first();
        }};
      }};
    },
  };
  const response=await readEarningsCompanionResponse(request(),fault,{now:NOW});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-earnings-c-service'),'READ_UNAVAILABLE');
  const published=await response.json();
  assert.equal(published.rows.length,5);
  assert.deepEqual(published.rows.map(x=>x.indicatorId),base.rows.map(x=>x.indicatorId));
  assert.deepEqual(calls,[EARNINGS_C_SNAPSHOT_KEY,EARNINGS_C_SERVICE_SNAPSHOT_KEY]);
  assert.equal(db.records.get(EARNINGS_C_SNAPSHOT_KEY).body,baseline);
  assert.deepEqual([...db.records.keys()],[EARNINGS_C_SNAPSHOT_KEY]);
});

test('R6-03 corrupt required projection version fails closed; optional one preserves base',async()=>{
  const db=d1(),base=basePayload(),service=servicePayload();
  await earningsCompanionWriter(db).write(base,{storedAt:NOW-1000});
  await earningsCompanionWriter(db,{snapshotKey:EARNINGS_C_SERVICE_SNAPSHOT_KEY})
    .write(service,{storedAt:NOW-500});
  const baseline=db.records.get(EARNINGS_C_SNAPSHOT_KEY).body;
  const opt=db.records.get(EARNINGS_C_SERVICE_SNAPSHOT_KEY);
  const corruptService=JSON.parse(opt.body);
  corruptService.projection.expectedSourceVersion='d'.repeat(64);
  db.records.set(EARNINGS_C_SERVICE_SNAPSHOT_KEY,{
    body:JSON.stringify(corruptService),stored_at:opt.stored_at,
  });
  let response=await readEarningsCompanionResponse(request(),db,{now:NOW});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-earnings-c-service'),'INVALID');
  assert.equal((await response.json()).rows.length,5);
  assert.equal(db.records.get(EARNINGS_C_SNAPSHOT_KEY).body,baseline);
  const core=db.records.get(EARNINGS_C_SNAPSHOT_KEY);
  const corruptCore=JSON.parse(core.body);
  corruptCore.projection.expectedSourceVersion='d'.repeat(64);
  db.records.set(EARNINGS_C_SNAPSHOT_KEY,{
    body:JSON.stringify(corruptCore),stored_at:core.stored_at,
  });
  response=await readEarningsCompanionResponse(request(),db,{now:NOW});
  assert.equal(response.status,503);
  assert.equal((await response.json()).reason,'STORED_PROJECTION_INVALID');
  assert.equal(db.actions.filter(action=>action.kind==='WRITE').length,2);
});

test('R6-03 D1 HTTP 403/429/500 reject a WPSFD42 write without replay',async()=>{
  for(const code of [403,429,500]){
    const requests=[];
    const cloud=d1Client(d1FixtureConfig,'fixture-token',{
      fetchImpl:async (_url,options)=>{
        const sql=d1Sql(options);
        requests.push(sql);
        if(sql.startsWith('SELECT'))return d1OkResult();
        return new Response(JSON.stringify({success:false,errors:[{code}]}),{
          status:code,headers:{'content-type':'application/json'},
        });
      },
      sleep:async()=>{throw Error('UNEXPECTED_WRITE_RETRY');},
    });
    await assert.rejects(
      earningsCompanionWriter(cloud.adapter(d1FixtureConfig.core,{allowWrites:true}),{
        snapshotKey:EARNINGS_C_SERVICE_SNAPSHOT_KEY,
      }).write(servicePayload(),{storedAt:NOW-500}),
      new RegExp('D1_HTTP_'+code),
    );
    assert.equal(requests.filter(sql=>sql.startsWith('INSERT')).length,1,code);
    assert.equal(requests.filter(sql=>sql.startsWith('SELECT')).length,1,code);
    assert.equal(cloud.stats.rowsWritten,0,code);
  }
});

test('R6-03 lost response after remote write stays unverified and never auto-replays INSERT',async()=>{
  let writeAttempts=0,readAttempts=0;
  const cloud=d1Client(d1FixtureConfig,'fixture-token',{
    fetchImpl:async (_url,options)=>{
      const sql=d1Sql(options);
      if(sql.startsWith('INSERT')){
        writeAttempts++;
        // A remote commit may have succeeded even when transport response is lost.
        throw Object.assign(Error('socket closed after submitting write'),{code:'ETIMEDOUT'});
      }
      readAttempts++;
      return d1OkResult();
    },
    sleep:async()=>{throw Error('UNEXPECTED_WRITE_RETRY');},
  });
  await assert.rejects(
    earningsCompanionWriter(cloud.adapter(d1FixtureConfig.core,{allowWrites:true}),{
      snapshotKey:EARNINGS_C_SERVICE_SNAPSHOT_KEY,
    }).write(servicePayload(),{storedAt:NOW-500}),
    /D1_OUTCOME_UNKNOWN/,
  );
  assert.equal(writeAttempts,1);
  assert.equal(readAttempts,1);
  assert.equal(cloud.stats.rowsWritten,0);
});

test('R6-03 accepted D1 write with failed readback never claims success or sends second write',async()=>{
  let writeAttempts=0,reads=0;
  const cloud=d1Client(d1FixtureConfig,'fixture-token',{
    fetchImpl:async (_url,options)=>{
      const sql=d1Sql(options);
      if(sql.startsWith('INSERT')){
        writeAttempts++;
        return d1OkResult([],{changes:1,rows_written:1});
      }
      reads++;
      if(writeAttempts)throw Object.assign(Error('readback timed out'),{code:'ETIMEDOUT'});
      return d1OkResult();
    },
    sleep:async()=>{},
  });
  await assert.rejects(
    earningsCompanionWriter(cloud.adapter(d1FixtureConfig.core,{allowWrites:true}),{
      snapshotKey:EARNINGS_C_SERVICE_SNAPSHOT_KEY,
    }).write(servicePayload(),{storedAt:NOW-500}),
    /D1_OUTCOME_UNKNOWN/,
  );
  assert.equal(writeAttempts,1);
  assert.equal(reads,3); // one initial read and exactly two allowed readback attempts
  assert.equal(cloud.stats.rowsWritten,1); // remote accepted write is NOT readback proof
});

test('R6-03 WPSFD42 publisher records uncertain remote outcome and forbids automatic replay',()=>{
  const source=fs.readFileSync(new URL(
    '../scripts/pc-writer/EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs',import.meta.url),'utf8');
  assert.match(source,/let remoteOutcomeUnknown=false;/);
  assert.match(source,/remoteOutcomeUnknown=true;\s*const result=await earningsCompanionWriter/);
  assert.match(source,/throw Error\('EARNINGS_C_SERVICE_READBACK_NOT_VERIFIED'\);\s*remoteOutcomeUnknown=false;/);
  assert.match(source,/remoteOutcomeUnknown\?'STATE_UNKNOWN_EARNINGS_C_SERVICE_D1':'FAIL_EARNINGS_C_SERVICE_D1'/);
  assert.match(source,/'D1_AUTO_RETRY=NO'/);
  assert.match(source,/if\(!apply\)\{/);
  assert.match(source,/'D1_QUERIES=0','D1_WRITES=0'/);
});
