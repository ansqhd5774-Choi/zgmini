// R4 fixtures are entirely in-memory. No PC file, network, D1 or scheduler access.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {normalizeSeries,buildPlans,insertPlans} from './EARNINGS_R3C_BLS_STORE_ONCE.mjs';
import {resultLogPath as r3dResultLogPath} from './EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs';
import {buildPreview,buildServiceSourcePreview,reportLines,SCHEMA_VERSION,resultPaths}
  from './EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs';
import {validateEarningsCompanionPayload,earningsCompanionWriter,readEarningsCompanionResponse,
  earningsCompanionFreshness,EARNINGS_C_SNAPSHOT_KEY,EARNINGS_C_SERVICE_SNAPSHOT_KEY,EARNINGS_C_ROUTE}
  from '../../worker/earnings-companion-c-r4.mjs';
import {buildEarningsCostIndicatorView} from '../../app/earnings-recession/earnings-cost-indicator-list.mjs';

const RETRIEVED='2026-10-26T17:02:53.996Z';
const GENERATED='2026-10-27T02:35:01.000Z';
const hash='b'.repeat(64);

function testDb() {
  const db=new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE api_history_chunks_v1 (
    provider TEXT NOT NULL,dataset TEXT NOT NULL,chunk_sha256 TEXT NOT NULL,
    first_observation_date TEXT,last_observation_date TEXT,row_count INTEGER NOT NULL,
    payload_json TEXT NOT NULL,first_seen_at TEXT NOT NULL,
    PRIMARY KEY(provider,dataset,chunk_sha256)
  );
  CREATE TABLE api_history_snapshots_v1 (
    provider TEXT NOT NULL,dataset TEXT NOT NULL,snapshot_sha256 TEXT NOT NULL,
    as_of TEXT NOT NULL,retrieved_at TEXT NOT NULL,status TEXT NOT NULL,
    history_mode TEXT,row_count INTEGER NOT NULL,latest_observation_date TEXT,
    chunk_hashes_json TEXT NOT NULL,provenance_json TEXT NOT NULL,
    PRIMARY KEY(provider,dataset,snapshot_sha256)
  );`);
  return db;
}

function response({omit=[],sep2025=null,sep2026=null,zeroLatest=false,
  zeroBase=false,ulcLatest='1.4',services=false,serviceBaseMissing=false}={}) {
  const monthly=[];
  for(let year=2025;year<=2026;year++) {
    for(let month=1;month<=(year===2025?12:9);month++) {
      const period=`${year}-${String(month).padStart(2,'0')}`;
      if(omit.includes(period)) continue;
      let value=100+(year-2025)*12+month;
      if(period==='2025-09'&&sep2025!==null) value=sep2025;
      if(period==='2026-09'&&sep2026!==null) value=sep2026;
      if(period==='2025-09'&&zeroBase) value=0;
      if(period==='2026-09'&&zeroLatest) value=0;
      monthly.push({year:String(year),period:`M${String(month).padStart(2,'0')}`,
        periodName:'Fixture',value:String(value),footnotes:[]});
    }
  }
  const quarterly=[];
  for(let year=2025;year<=2026;year++) {
    for(let q=1;q<=(year===2025?4:2);q++) {
      quarterly.push({year:String(year),period:`Q0${q}`,periodName:'Fixture',
        value:year===2026&&q===2?ulcLatest:String((year-2025)*2+q/10),footnotes:[]});
    }
  }
  return {status:'REQUEST_SUCCEEDED',Results:{series:[
    {seriesID:'WPSFD4',data:monthly},
    {seriesID:'WPSFD41',data:monthly.map(x=>({...x,value:String(Number(x.value)*2)}))},
    {seriesID:'PRS85006111',data:quarterly},
    ...(services?[{seriesID:'WPSFD42',data:monthly
      .filter(x=>!serviceBaseMissing||!(x.year==='2025'&&x.period==='M09'))
      .map(x=>({...x,value:x.year==='2025'&&x.period==='M09'?'150.273':
        x.year==='2026'&&x.period==='M09'?'157.666':x.value}))}]:[]),
  ]}};
}

function seeded(options={}) {
  const db=testDb();
  insertPlans(db,buildPlans(normalizeSeries(response(options)),RETRIEVED,hash));
  return db;
}

function withDb(options,fn) { const db=seeded(options);try{return fn(db);}finally{db.close();} }

function withServiceDb(options,fn) {
  const db=seeded(options);
  const service=response({...options,services:true}).Results.series.at(-1);
  insertPlans(db,buildPlans(normalizeSeries({Results:{series:[service]}},['WPSFD42']),
    '2026-10-26T18:00:00.000Z','c'.repeat(64)));
  try{return fn(db);}finally{db.close();}
}


function simulatedD1(){
  const records=new Map(),actions=[];
  return {
    records,actions,prepare(sql){
      return {bind(...params){return {
        async first(){
          actions.push({type:'READ',key:params[0]});
          return records.get(params[0])??null;
        },
        async run(){
          actions.push({type:'WRITE',key:params[0]});
          assert.match(sql,/^INSERT INTO market_public_snapshots_v1/);
          const [key,body,storedAt,newSource,maxStoredAt]=params;
          const old=records.get(key);
          if(old){
            const oldSource=JSON.parse(old.body).projection.sourceStoredAt;
            if(!(oldSource<newSource&&old.stored_at<=maxStoredAt))
              return {meta:{changes:0}};
          }
          records.set(key,{body,stored_at:storedAt});
          return {meta:{changes:1}};
        },
      };}};
    },
  };
}

test('saved BLS base and WPSFD42 source reach separate mock D1 checkpoints and stored GET 7 rows',async()=>{
  const sqlite=seeded();
  const now=Date.parse('2026-10-27T02:37:01.000Z');
  try{
    const d1=simulatedD1(),base=buildPreview(sqlite,{
      generatedAt:GENERATED,includeServices:false}).payload;
    const service=response({services:true}).Results.series.at(-1);
    insertPlans(sqlite,buildPlans(normalizeSeries({Results:{series:[service]}},['WPSFD42']),
      '2026-10-26T18:00:00.000Z','c'.repeat(64)));
    const baseAfter=buildPreview(sqlite,{generatedAt:GENERATED,includeServices:false}).payload;
    assert.deepEqual(baseAfter,base);
    const servicePayload=buildServiceSourcePreview(sqlite,{generatedAt:GENERATED}).payload;
    assert.equal(validateEarningsCompanionPayload(servicePayload,{now}),servicePayload);
    assert.deepEqual(servicePayload.rows.map(x=>x.seriesId),['WPSFD42','WPSFD42']);
    assert.equal((await earningsCompanionWriter(d1).write(base,{storedAt:now-1000})).status,
      'READBACK_VERIFIED');
    const baseBodyBefore=d1.records.get(EARNINGS_C_SNAPSHOT_KEY).body;
    assert.equal((await earningsCompanionWriter(d1,{
      snapshotKey:EARNINGS_C_SERVICE_SNAPSHOT_KEY,
    }).write(servicePayload,{storedAt:now-500})).status,'READBACK_VERIFIED');
    assert.equal(d1.records.get(EARNINGS_C_SNAPSHOT_KEY).body,baseBodyBefore);
    assert.deepEqual([...d1.records.keys()],
      [EARNINGS_C_SNAPSHOT_KEY,EARNINGS_C_SERVICE_SNAPSHOT_KEY]);
    const writesBeforeGET=d1.actions.filter(x=>x.type==='WRITE').length;
    const reply=await readEarningsCompanionResponse(
      new Request(`https://zgmini.kr${EARNINGS_C_ROUTE}`),d1,{now});
    assert.equal(reply.status,200);
    assert.equal(reply.headers.get('x-earnings-c-service'),'READY');
    const body=await reply.json();
    assert.equal(body.rows.length,7);
    assert.deepEqual(body.rows.slice(0,5).map(x=>x.indicatorId),
      base.rows.map(x=>x.indicatorId));
    assert.deepEqual(body.rows.slice(5).map(x=>x.indicatorId),
      servicePayload.rows.map(x=>x.indicatorId));
    assert.deepEqual(body.coverage,{configured:7,ready:7,partial:0,stale:0,unavailable:0});
    assert.equal(d1.actions.filter(x=>x.type==='WRITE').length,writesBeforeGET);
    assert.equal(d1.records.size,2);
  }finally{sqlite.close();}
});

test('service-only stored WPSFD42 builds a verified two-row checkpoint without any base BLS snapshots',()=>{
  const db=testDb();
  try{
    const service=response({services:true}).Results.series.at(-1);
    const plans=buildPlans(normalizeSeries({Results:{series:[service]}},['WPSFD42']),
      '2026-10-26T18:00:00.000Z','c'.repeat(64));
    assert.deepEqual(insertPlans(db,plans),
      {insertedChunks:1,insertedSnapshots:1,verified:1});
    // Base projection remains strict: the three-source cohort is absent.
    assert.throws(()=>buildPreview(db,{generatedAt:GENERATED}),
      /BLS_DIRECT_SNAPSHOTS_MISSING/);
    const {payload,diagnostics}=buildServiceSourcePreview(db,{generatedAt:GENERATED});
    assert.deepEqual(payload.rows.map(row=>row.indicatorId),
      ['bls_ppi_services_yoy_sa','bls_ppi_services_index']);
    assert.equal(payload.status,'READY');
    assert.equal(payload.rows[0].value,100*(157.666/150.273-1));
    assert.equal(payload.rows[1].value,157.666);
    assert.equal(payload.sourceStoredAt,Date.parse('2026-10-26T18:00:00.000Z'));
    assert.deepEqual(payload.observedThroughBySeries,{WPSFD42:'2026-09'});
    assert.equal(diagnostics.snapshotsChecked,1);
    assert.equal(diagnostics.sourcePartition,'WPSFD42_ONLY_NO_BASE_REWRITE');
    assert.equal(diagnostics.r3dStatus,'NOT_APPLICABLE_SERVICE_ONLY');
    assert.equal(validateEarningsCompanionPayload(payload,{now:Date.parse(GENERATED)}),payload);
    assert.equal(db.prepare(`SELECT count(*) AS n FROM api_history_snapshots_v1
      WHERE dataset!='WPSFD42'`).get().n,0);
  }finally{db.close();}
});

test('damaged base-only source blocks base preview but cannot mask independently verified service',()=>{
  withServiceDb({},db=>{
    const before=buildServiceSourcePreview(db,{generatedAt:GENERATED});
    db.prepare(`UPDATE api_history_chunks_v1 SET payload_json='[]'
      WHERE provider='BLS' AND dataset='WPSFD4'`).run();
    assert.throws(()=>buildPreview(db,{generatedAt:GENERATED}),
      /CHUNK_SHA256_MISMATCH/);
    const after=buildServiceSourcePreview(db,{generatedAt:GENERATED});
    assert.deepEqual(after.payload,before.payload);
    assert.deepEqual(after.diagnostics,before.diagnostics);
    assert.equal(validateEarningsCompanionPayload(after.payload,{now:Date.parse(GENERATED)}),
      after.payload);
  });
});

test('separate service D1 checkpoint uses service first_seen and never modifies baseline identity',()=>{
  const baseline=(()=>{const db=seeded();try{return buildPreview(db,{generatedAt:GENERATED}).payload;}finally{db.close();}})();
  withServiceDb({},db=>{
    const core=buildPreview(db,{generatedAt:GENERATED,includeServices:false});
    const service=buildServiceSourcePreview(db,{generatedAt:GENERATED});
    assert.deepEqual(core.payload,baseline);
    assert.equal(core.diagnostics.snapshotsChecked,3);
    assert.equal(service.payload.rows.length,2);
    assert.deepEqual(service.payload.rows.map(row=>row.seriesId),['WPSFD42','WPSFD42']);
    assert.equal(service.payload.sourceStoredAt,Date.parse('2026-10-26T18:00:00.000Z'));
    assert.notEqual(service.payload.sourceStoredAt,core.payload.sourceStoredAt);
    assert.match(service.payload.sourceVersion,/^[a-f0-9]{64}$/);
    assert.notEqual(service.payload.sourceVersion,core.payload.sourceVersion);
    assert.deepEqual(service.payload.observedThroughBySeries,{WPSFD42:'2026-09'});
    assert.equal(service.diagnostics.snapshotsChecked,1);
    assert.equal(service.diagnostics.sourcePartition,'WPSFD42_ONLY_NO_BASE_REWRITE');
    assert.equal(validateEarningsCompanionPayload(service.payload,{now:Date.parse(GENERATED)}),
      service.payload);
  });
  withDb({},db=>assert.throws(()=>buildServiceSourcePreview(db,{generatedAt:GENERATED}),
    /R4_SERVICE_SOURCE_NOT_STORED/));
});

test('optional WPSFD42 adds two verified service indicators without changing five existing rows',()=>{
  const baseline=(()=>{const db=seeded();try{return buildPreview(db,{generatedAt:GENERATED}).payload;}finally{db.close();}})();
  withServiceDb({},db=>{
    const {payload,diagnostics}=buildPreview(db,{generatedAt:GENERATED});
    assert.equal(payload.status,'READY');
    assert.equal(payload.coverage.configured,7);
    assert.equal(payload.coverage.ready,7);
    assert.deepEqual(payload.rows.slice(0,5),baseline.rows);
    assert.equal(payload.rows[5].indicatorId,'bls_ppi_services_yoy_sa');
    assert.equal(payload.rows[5].kind,'DERIVED');
    assert.equal(payload.rows[5].value,100*(157.666/150.273-1));
    assert.equal(payload.rows[6].indicatorId,'bls_ppi_services_index');
    assert.equal(payload.rows[6].kind,'RAW');
    assert.equal(payload.rows[6].value,157.666);
    assert.equal(payload.observedThroughBySeries.WPSFD42,'2026-09');
    assert.equal(diagnostics.snapshotsChecked,4);
    assert.equal(diagnostics.bySeries.length,4);
    assert.notEqual(payload.sourceVersion,baseline.sourceVersion);
  });
});

test('end-to-end offline seven rows validate through C worker schema and existing page registry',()=>{
  withServiceDb({},db=>{
    const {payload}=buildPreview(db,{generatedAt:GENERATED});
    assert.equal(validateEarningsCompanionPayload(payload,{now:Date.parse(GENERATED)}),payload);
    // buildPreview is pre-publication data and has no freshness field.
    // The public Worker GET derives that field from each stored observation.
    const now=Date.parse(GENERATED);
    const publicPayload={...payload,rows:payload.rows.map(row=>{
      const freshness=earningsCompanionFreshness(row,{now});
      return {...row,status:freshness.status==='STALE'?'STALE':row.status,freshness};
    })};
    assert.ok(publicPayload.rows.every(row=>row.status==='READY'
      &&row.freshness.status==='FRESH'));
    const view=buildEarningsCostIndicatorView(publicPayload);
    assert.equal(view.valid,true);
    assert.equal(view.rows.length,7);
    assert.equal(view.indicators.length,7);
    assert.deepEqual(view.indicators.slice(5).map(x=>x.name),
      ['서비스 생산자물가 상승률','서비스 생산자물가 지수']);
    assert.deepEqual(view.rows.slice(5).map(x=>x.seriesId),['WPSFD42','WPSFD42']);
  });
});

test('missing service year-ago observation leaves its YoY null, not invented',()=>{
  withServiceDb({serviceBaseMissing:true},db=>{
    const {payload}=buildPreview(db,{generatedAt:GENERATED});
    assert.equal(payload.status,'PARTIAL');
    assert.equal(payload.coverage.ready,6);
    assert.equal(payload.rows[5].status,'PARTIAL');
    assert.equal(payload.rows[5].value,null);
    assert.equal(payload.rows[6].value,157.666);
  });
});

test('service source forgery is rejected independently of the original BLS three-series cohort',()=>{
  withServiceDb({},db=>{
    const s=db.prepare(`SELECT provenance_json FROM api_history_snapshots_v1
      WHERE provider='BLS' AND dataset='WPSFD42'`).get();
    const corrupted=JSON.parse(s.provenance_json);
    corrupted.seriesID='WPSFD41';
    db.prepare(`UPDATE api_history_snapshots_v1 SET provenance_json=?
      WHERE provider='BLS' AND dataset='WPSFD42'`).run(JSON.stringify(corrupted));
    assert.throws(()=>buildPreview(db,{generatedAt:GENERATED}),
      /BLS_SOURCE_PROVENANCE_INVALID/);
  });
});

test('new independent service capture adds rows even when existing core observations remain unchanged',()=>{
  withDb({},db=>{
    const service=response({services:true}).Results.series.at(-1);
    insertPlans(db,buildPlans(normalizeSeries({Results:{series:[service]}},['WPSFD42']),
      '2026-10-27T00:00:00.000Z','d'.repeat(64)));
    const {payload}=buildPreview(db,{generatedAt:GENERATED});
    assert.equal(payload.coverage.configured,7);
    assert.equal(payload.observedThroughBySeries.WPSFD42,'2026-09');
    assert.equal(payload.rows[5].retrievedAt,'2026-10-27T00:00:00.000Z');
    assert.equal(payload.rows[0].retrievedAt,RETRIEVED);
  });
});

test('R4 builds five source-backed rows; two PPI trends have only nine actual YoY points',()=>{
  withDb({},db=>{
    const {payload,diagnostics}=buildPreview(db,{generatedAt:GENERATED});
    assert.equal(payload.schemaVersion,SCHEMA_VERSION);
    assert.equal(payload.status,'READY');
    assert.equal(payload.coverage.configured,5);
    assert.equal(payload.coverage.ready,5);
    assert.equal(payload.rows.length,5);
    assert.deepEqual(payload.rows.map(x=>x.kind),['DERIVED','RAW','DERIVED','RAW','RAW']);
    assert.deepEqual(payload.rows.map(x=>x.seriesId),
      ['WPSFD4','WPSFD4','WPSFD41','WPSFD41','PRS85006111']);
    assert.equal(payload.sourceStoredAt,Date.parse(RETRIEVED));
    assert.equal(payload.generatedAt,GENERATED);
    assert.equal(payload.historicalMode,'CURRENT_RETRIEVAL_NOT_PIT');
    assert.deepEqual(payload.observedThroughBySeries,
      {WPSFD4:'2026-09',WPSFD41:'2026-09',PRS85006111:'2026-Q2'});
    assert.equal(payload.rows[0].historyCoverage.actualPoints,9);
    assert.equal(payload.rows[0].historyCoverage.expectedPeriods,13);
    assert.equal(payload.rows[0].historyCoverage.complete,false);
    assert.equal(payload.rows[0].history[0].period,'2025-09');
    assert.equal(payload.rows[0].history[0].value,null);
    assert.equal(payload.rows[0].history[4].period,'2026-01');
    assert.ok(Number.isFinite(payload.rows[0].history[4].value));
    assert.equal(payload.rows[1].historyCoverage.actualPoints,13);
    assert.equal(payload.rows[2].historyCoverage.actualPoints,9);
    assert.equal(payload.rows[3].historyCoverage.actualPoints,13);
    assert.equal(payload.rows[4].historyCoverage.actualPoints,5);
    assert.equal(payload.rows[4].history[0].period,'2025-Q2');
    assert.equal(payload.rows[4].history.at(-1).period,'2026-Q2');
    assert.equal(payload.rows[4].value,1.4); // raw already YoY, never YoY-of-YoY
    assert.equal(payload.rows[4].previousValue,2.1);
    assert.ok(Math.abs(payload.rows[4].change+0.7)<1e-12);
    assert.equal(payload.rows[0].releaseDate,null);
    assert.equal(payload.rows[0].nextReleaseDate,null);
    assert.equal(diagnostics.snapshotsChecked,3);
    assert.equal(diagnostics.sourceStoredAtPolicy,'OLDEST_FIRST_SEEN_AT');
  });
});

test('deterministic sourceVersion across different generation times; output artifact is not freshness',()=>{
  withDb({},db=>{
    const first=buildPreview(db,{generatedAt:GENERATED});
    const second=buildPreview(db,{generatedAt:'2026-10-27T09:59:59.000Z'});
    assert.match(first.payload.sourceVersion,/^[a-f0-9]{64}$/);
    assert.equal(first.payload.sourceVersion,second.payload.sourceVersion);
    assert.equal(first.payload.sourceStoredAt,second.payload.sourceStoredAt);
    assert.notEqual(first.payload.generatedAt,second.payload.generatedAt);
    const text=reportLines(first,GENERATED).join('\n');
    assert.match(text,/PUBLICATION_PERFORMED=NO/);
    assert.match(text,/PASS_R4_LOCAL_PREVIEW_READY/);
  });
});

test('YoY formula and previous-period percentage-point change; index change is index-points',()=>{
  withDb({sep2025:150.25,sep2026:159.78},db=>{
    const {payload}=buildPreview(db,{generatedAt:GENERATED});
    const [yoy,index]=payload.rows;
    assert.equal(yoy.value,100*(159.78/150.25-1));
    assert.equal(yoy.previousPeriod,'2026-08');
    assert.equal(yoy.changeUnit,'PERCENTAGE_POINTS');
    assert.equal(index.value,159.78);
    assert.equal(index.previousPeriod,'2026-08');
    assert.equal(index.previousValue,120);
    assert.equal(index.change,159.78-120);
    assert.equal(index.changeUnit,'INDEX_POINTS');
  });
});

test('a true zero index is valid; no fabricated YoY when denominator zero',()=>{
  withDb({zeroLatest:true},db=>{
    const {payload}=buildPreview(db,{generatedAt:GENERATED});
    assert.equal(payload.rows[1].value,0);
    assert.equal(payload.rows[0].value,-100);
    assert.equal(payload.rows[0].status,'READY');
  });
  withDb({zeroBase:true},db=>{
    const {payload}=buildPreview(db,{generatedAt:GENERATED});
    assert.equal(payload.status,'PARTIAL');
    assert.equal(payload.coverage.ready,3);
    assert.equal(payload.coverage.partial,2);
    assert.equal(payload.rows[0].value,null);
    assert.equal(payload.rows[0].status,'PARTIAL');
    assert.equal(payload.rows[1].value,121);
    assert.equal(payload.rows[0].unavailableReason,'EXACT_T_MINUS_12_BASE_MISSING_OR_NONPOSITIVE');
  });
});

test('missing month has an explicit null and does not interpolate',()=>{
  withDb({omit:['2026-04']},db=>{
    const {payload}=buildPreview(db,{generatedAt:GENERATED});
    const yoY=payload.rows[0], index=payload.rows[1];
    assert.equal(yoY.history.find(x=>x.period==='2026-04').value,null);
    assert.equal(index.history.find(x=>x.period==='2026-04').value,null);
    assert.equal(yoY.historyCoverage.actualPoints,8);
    assert.equal(index.historyCoverage.actualPoints,12);
    assert.equal(payload.status,'READY'); // latest value valid; past coverage partial
  });
  withDb({omit:['2025-09']},db=>{
    const {payload}=buildPreview(db,{generatedAt:GENERATED});
    assert.equal(payload.status,'PARTIAL');
    assert.equal(payload.rows[0].value,null);
    assert.equal(payload.rows[2].value,null);
  });
});

test('changed chunk hash and missing complete cohort never emit a passing preview',()=>{
  withDb({},db=>{
    db.prepare(`UPDATE api_history_chunks_v1 SET payload_json=?
      WHERE provider='BLS' AND dataset='WPSFD4'`).run('[{"value":0}]');
    assert.throws(()=>buildPreview(db,{generatedAt:GENERATED}),/CHUNK_SHA256_MISMATCH/);
  });
  withDb({},db=>{
    db.prepare(`DELETE FROM api_history_snapshots_v1
      WHERE provider='BLS' AND dataset='PRS85006111'`).run();
    assert.throws(()=>buildPreview(db,{generatedAt:GENERATED}),/COMPLETE_BLS_COHORT_MISSING/);
  });
});

test('inconsistent first_seen_at fails; earliest verified first_seen_at is conservative',()=>{
  withDb({},db=>{
    db.prepare(`UPDATE api_history_chunks_v1 SET first_seen_at=?
      WHERE provider='BLS' AND dataset='WPSFD4'`).run('not-a-time');
    assert.throws(()=>buildPreview(db,{generatedAt:GENERATED}),/R4_FIRST_SEEN_AT_INVALID/);
  });
  withDb({},db=>{
    db.prepare(`UPDATE api_history_chunks_v1 SET first_seen_at=?
      WHERE provider='BLS' AND dataset='WPSFD4'`).run('2026-10-25T00:00:00.000Z');
    const {payload}=buildPreview(db,{generatedAt:GENERATED});
    assert.equal(payload.sourceStoredAt,Date.parse('2026-10-25T00:00:00.000Z'));
  });
});

test('a newer incomplete cohort is previewed as partial, not ready',()=>{
  withDb({},db=>{
    // Create a genuinely different single-series snapshot after the full cohort.
    const changed=response({sep2026:130});
    const single=buildPlans(normalizeSeries(changed),'2026-10-26T19:00:00.000Z','c'.repeat(64))[0];
    const row=db.prepare(`SELECT 1 FROM api_history_chunks_v1 WHERE provider='BLS'
      AND dataset='WPSFD4' AND chunk_sha256=?`).get(single.chunkHash);
    assert.equal(row,undefined);
    db.prepare(`INSERT INTO api_history_chunks_v1
      (provider,dataset,chunk_sha256,first_observation_date,last_observation_date,row_count,payload_json,first_seen_at)
      VALUES(?,?,?,?,?,?,?,?)`).run('BLS',single.id,single.chunkHash,
        single.rows[0].observationDate,single.rows.at(-1).observationDate,
        single.rows.length,single.payloadJson,single.retrievedAt);
    db.prepare(`INSERT INTO api_history_snapshots_v1
      (provider,dataset,snapshot_sha256,as_of,retrieved_at,status,history_mode,
       row_count,latest_observation_date,chunk_hashes_json,provenance_json)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run('BLS',single.id,single.snapshotHash,
        single.asOf,single.retrievedAt,'READY_DIRECT_BLS',
        'EARNINGS_COMPANION_R3C_BLS_DIRECT_V1',single.rows.length,
        single.rows.at(-1).observationDate,JSON.stringify([single.chunkHash]),single.provenanceJson);
    const {payload,diagnostics}=buildPreview(db,{generatedAt:GENERATED});
    assert.equal(payload.status,'PARTIAL');
    assert.equal(diagnostics.newerIncomplete,true);
    assert.equal(diagnostics.cohortRetrievedAt,RETRIEVED);
  });
});

test('service conflicting revisions at equal retrieval time stop before choosing any score',()=>{
  withServiceDb({},db=>{
    const old=response({services:true}).Results.series.at(-1);
    const amended={...old,data:old.data.map(item=>
      item.year==='2026'&&item.period==='M09'
        ?{...item,value:'157.667'}:item)};
    const plans=buildPlans(
      normalizeSeries({Results:{series:[amended]}},['WPSFD42']),
      '2026-10-26T18:00:00.000Z','e'.repeat(64));
    assert.deepEqual(insertPlans(db,plans),
      {insertedChunks:1,insertedSnapshots:1,verified:1});
    assert.throws(()=>buildServiceSourcePreview(db,{generatedAt:GENERATED}),
      /R4_SERVICE_REVISION_ORDER_AMBIGUOUS/);
  });
});

test('older service revision corruption invalidates the selected newer stored preview',()=>{
  withServiceDb({},db=>{
    const old=db.prepare(`SELECT chunk_hashes_json FROM api_history_snapshots_v1
      WHERE provider='BLS' AND dataset='WPSFD42'`).get();
    const olderChunk=JSON.parse(old.chunk_hashes_json)[0];
    const amended=response({services:true}).Results.series.at(-1);
    amended.data=amended.data.map(item=>
      item.year==='2026'&&item.period==='M09'
        ?{...item,value:'157.668'}:item);
    const newer=buildPlans(
      normalizeSeries({Results:{series:[amended]}},['WPSFD42']),
      '2026-10-27T00:00:00.000Z','e'.repeat(64));
    insertPlans(db,newer);
    const before=buildServiceSourcePreview(db,{generatedAt:GENERATED});
    assert.equal(before.payload.rows[1].value,157.668);
    assert.equal(before.diagnostics.snapshotsChecked,2);
    db.prepare(`UPDATE api_history_chunks_v1 SET payload_json='[]'
      WHERE provider='BLS' AND dataset='WPSFD42' AND chunk_sha256=?`)
      .run(olderChunk);
    assert.throws(()=>buildServiceSourcePreview(db,{generatedAt:GENERATED}),
      /CHUNK_SHA256_MISMATCH/);
  });
});

test('older service snapshot provenance tampering rejects a newer valid stored source',()=>{
  withServiceDb({},db=>{
    const original=db.prepare(`SELECT snapshot_sha256,provenance_json
      FROM api_history_snapshots_v1 WHERE provider='BLS' AND dataset='WPSFD42'`).get();
    const amended=response({services:true}).Results.series.at(-1);
    amended.data=amended.data.map(item=>item.year==='2026'&&item.period==='M09'
      ?{...item,value:'157.669'}:item);
    insertPlans(db,buildPlans(
      normalizeSeries({Results:{series:[amended]}},['WPSFD42']),
      '2026-10-27T00:00:00.000Z','e'.repeat(64)));
    const forged={...JSON.parse(original.provenance_json),seriesID:'WPSFD4'};
    db.prepare(`UPDATE api_history_snapshots_v1 SET provenance_json=?
      WHERE provider='BLS' AND dataset='WPSFD42' AND snapshot_sha256=?`)
      .run(JSON.stringify(forged),original.snapshot_sha256);
    assert.throws(()=>buildServiceSourcePreview(db,{generatedAt:GENERATED}),
      /BLS_SOURCE_PROVENANCE_INVALID/);
  });
});

test('R3D and R4 direct-run diagnostic outputs stay under user TEMP, never Writer checkout',()=>{
  const stamp='20261117-160000Z';
  const r3d=r3dResultLogPath(stamp);
  const r4=resultPaths(stamp);
  assert.equal(r3d,path.join(os.tmpdir(),`EARNINGS_R3D_STORED_BLS_CALC_RESULT_${stamp}.txt`));
  assert.deepEqual(r4,{
    txtFile:path.join(os.tmpdir(),`EARNINGS_R4_C_READ_MODEL_PREVIEW_RESULT_${stamp}.txt`),
    jsonFile:path.join(os.tmpdir(),`EARNINGS_R4_C_READ_MODEL_PREVIEW_RESULT_${stamp}.json`),
  });
  assert.equal(path.dirname(r3d),os.tmpdir());
  assert.equal(path.dirname(r4.txtFile),os.tmpdir());
  assert.equal(path.dirname(r4.jsonFile),os.tmpdir());
  const other=path.join(os.tmpdir(),'isolated-fixture');
  assert.equal(r3dResultLogPath(stamp,{tempDirectory:other}),
    path.join(other,`EARNINGS_R3D_STORED_BLS_CALC_RESULT_${stamp}.txt`));
  assert.equal(resultPaths(stamp,{tempDirectory:other}).jsonFile,
    path.join(other,`EARNINGS_R4_C_READ_MODEL_PREVIEW_RESULT_${stamp}.json`));
  for(const invalid of ['../foo','2026-11-17T16:00:00Z','20261117-160000Z/../x','']){
    assert.throws(()=>r3dResultLogPath(invalid),/INVALID_RESULT_STAMP/);
    assert.throws(()=>resultPaths(invalid),/INVALID_RESULT_STAMP/);
  }
});

test('service-only append rejects forged prior WPSFD42 provenance before SQLite commit',()=>{
  for(const [field,value] of [
    ['seriesID','WPSFD4'],
    ['authority','UNKNOWN_AUTHORITY'],
    ['transportProvider','UNKNOWN_TRANSPORT'],
  ]) {
    withServiceDb({},db=>{
      const previous=db.prepare(`SELECT snapshot_sha256,provenance_json
        FROM api_history_snapshots_v1
        WHERE provider='BLS' AND dataset='WPSFD42'`).get();
      const forged={...JSON.parse(previous.provenance_json),[field]:value};
      db.prepare(`UPDATE api_history_snapshots_v1 SET provenance_json=?
        WHERE provider='BLS' AND dataset='WPSFD42' AND snapshot_sha256=?`)
        .run(JSON.stringify(forged),previous.snapshot_sha256);
      const counts=()=>[
        db.prepare(`SELECT COUNT(*) AS n FROM api_history_chunks_v1`).get().n,
        db.prepare(`SELECT COUNT(*) AS n FROM api_history_snapshots_v1`).get().n,
      ];
      const before=counts();
      const service=response({services:true}).Results.series.at(-1);
      service.data=service.data.map(item=>item.year==='2026'&&item.period==='M09'
        ?{...item,value:'158.900'}:item);
      const newPlans=buildPlans(
        normalizeSeries({Results:{series:[service]}},['WPSFD42']),
        '2026-10-28T00:00:00.000Z','d'.repeat(64));
      assert.throws(()=>insertPlans(db,newPlans),/PRIOR_BLS_NAMESPACE_CONFLICT_NO_WRITE/,field);
      assert.deepEqual(counts(),before,field);
      assert.deepEqual(JSON.parse(db.prepare(`SELECT provenance_json
        FROM api_history_snapshots_v1
        WHERE provider='BLS' AND dataset='WPSFD42' AND snapshot_sha256=?`)
        .get(previous.snapshot_sha256).provenance_json),forged,field);
    });
  }
});
