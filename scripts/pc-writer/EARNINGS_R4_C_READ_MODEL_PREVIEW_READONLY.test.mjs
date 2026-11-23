// R4 fixtures are entirely in-memory. No PC file, network, D1 or scheduler access.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {normalizeSeries,buildPlans,insertPlans} from './EARNINGS_R3C_BLS_STORE_ONCE.mjs';
import {buildPreview,buildServiceSourcePreview,parseR4PreviewMode,reportLines,SCHEMA_VERSION}
  from './EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs';
import {validateEarningsCompanionPayload,earningsCompanionFreshness} from '../../worker/earnings-companion-c-r4.mjs';
import {buildEarningsCostIndicatorView} from '../../app/earnings-recession/earnings-cost-indicator-list.mjs';

const RETRIEVED='2026-10-26T17:02:53.996Z';
const GENERATED='2026-10-27T02:35:01.000Z';
const hash='b'.repeat(64);

function testDb(filename=':memory:') {
  const db=new DatabaseSync(filename);
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

test('actual service-only child process reads isolated SQLite without changing its bytes',()=>{
  const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-w05-service-cli-'));
  const home=path.join(fixture,'home'),storage=path.join(home,'storage');
  const scripts=path.join(fixture,'scripts');
  fs.mkdirSync(storage,{recursive:true});
  fs.mkdirSync(scripts,{recursive:true});
  const here=path.dirname(fileURLToPath(import.meta.url));
  for(const name of ['EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs',
    'EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs'])
    fs.copyFileSync(path.join(here,name),path.join(scripts,name));
  const dbPath=path.join(storage,'core.sqlite');
  const hashFile=()=>createHash('sha256').update(fs.readFileSync(dbPath)).digest('hex');
  try{
    const db=testDb(dbPath);
    try{
      const service=response({services:true}).Results.series.at(-1);
      insertPlans(db,buildPlans(normalizeSeries({Results:{series:[service]}},['WPSFD42']),
        '2026-10-26T18:00:00.000Z','c'.repeat(64)));
    }finally{db.close();}
    const originalHash=hashFile();
    const stdout=execFileSync(process.execPath,
      [path.join(scripts,'EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs'),'--service-only'],
      {env:{...process.env,ZGMINI_PC_HOME:home},cwd:fixture,
        encoding:'utf8',timeout:15_000,maxBuffer:100_000});
    assert.match(stdout,/R4_LOCAL_PREVIEW=FINISHED/);
    assert.equal(hashFile(),originalHash,'original stored SQLite bytes remain unchanged');
    const jsonName=stdout.match(/^JSON_CREATED=(.+)$/m)?.[1]?.trim();
    const txtName=stdout.match(/^TXT_CREATED=(.+)$/m)?.[1]?.trim();
    assert.match(jsonName??'',/^EARNINGS_R4_C_SERVICE_ONLY_READ_MODEL_PREVIEW_RESULT_.*\.json$/);
    assert.match(txtName??'',/^EARNINGS_R4_C_SERVICE_ONLY_READ_MODEL_PREVIEW_RESULT_.*\.txt$/);
    const payload=JSON.parse(fs.readFileSync(path.join(scripts,jsonName),'utf8'));
    const txt=fs.readFileSync(path.join(scripts,txtName),'utf8');
    assert.equal(payload.status,'READY');
    assert.equal(payload.rows.length,2);
    assert.deepEqual(payload.rows.map(row=>row.seriesId),['WPSFD42','WPSFD42']);
    assert.deepEqual(payload.observedThroughBySeries,{WPSFD42:'2026-09'});
    assert.match(payload.sourceVersion,/^[a-f0-9]{64}$/);
    assert.match(txt,/BLS_WPSFD42_SNAPSHOT_SHA256=[a-f0-9]{64}/);
    assert.match(txt,/SQLITE_WRITES=0/);
    assert.match(txt,/API_REQUESTS=0/);
    assert.match(txt,/D1_WRITES=0/);
    assert.equal(fs.readdirSync(scripts).filter(name=>/RESULT_/.test(name)).length,2);
  }finally{fs.rmSync(fixture,{recursive:true,force:true});}
});

test('service-only CLI mode is explicit and defaults to existing full preview',()=>{
  assert.equal(parseR4PreviewMode([]),'BASE_AND_OPTIONAL_SERVICE');
  assert.equal(parseR4PreviewMode(['--service-only']),'SERVICE_ONLY');
  for(const args of [['--apply'],['--service-only','--apply'],['--dry-run'],['--service-only','--service-only']]){
    assert.throws(()=>parseR4PreviewMode(args),/R4_PREVIEW_MODE_INVALID/);
  }
});

test('service-only saved WPSFD42 remains calculable when base BLS cohort is absent',()=>{
  withServiceDb({},db=>{
    db.prepare("DELETE FROM api_history_snapshots_v1 WHERE provider='BLS' AND dataset IN ('WPSFD4','WPSFD41','PRS85006111')").run();
    assert.throws(()=>buildPreview(db,{generatedAt:GENERATED}),
      /BLS_DIRECT_SNAPSHOTS_MISSING/);
    const {payload,diagnostics}=buildServiceSourcePreview(db,{generatedAt:GENERATED});
    assert.equal(payload.status,'READY');
    assert.deepEqual(payload.rows.map(row=>row.seriesId),['WPSFD42','WPSFD42']);
    assert.equal(payload.rows[0].value,100*(157.666/150.273-1));
    assert.equal(payload.rows[1].value,157.666);
    assert.equal(diagnostics.r3dStatus,'NOT_APPLICABLE_INDEPENDENT_SERVICE');
    assert.equal(diagnostics.snapshotsChecked,1);
    assert.equal(validateEarningsCompanionPayload(payload,{now:Date.parse(GENERATED)}),payload);
  });
});

test('service-only preview ignores corrupted unrelated baseline lineage',()=>{
  withServiceDb({},db=>{
    db.prepare("UPDATE api_history_snapshots_v1 SET provenance_json='{}' WHERE provider='BLS' AND dataset='WPSFD4'").run();
    assert.throws(()=>buildPreview(db,{generatedAt:GENERATED}),
      /BLS_SOURCE_PROVENANCE_INVALID/);
    const {payload}=buildServiceSourcePreview(db,{generatedAt:GENERATED});
    assert.equal(payload.status,'READY');
    assert.equal(payload.rows.length,2);
    assert.equal(payload.observedThroughBySeries.WPSFD42,'2026-09');
  });
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
    // The raw PC preview has no published freshness annotations: it must not
    // expose the optional service UI before the verified GET projection.
    const previewView=buildEarningsCostIndicatorView(payload);
    assert.equal(previewView.indicators.length,5);
    // Mirror the public GET's actual worker freshness calculation, not a
    // fabricated READY flag or a hard-coded value.
    const now=Date.parse(GENERATED);
    const publishedRows=payload.rows.map(row=>({...row,
      freshness:earningsCompanionFreshness(row,{now})}));
    assert.ok(publishedRows.slice(5).every(row=>row.freshness.status==='FRESH'));
    const view=buildEarningsCostIndicatorView({...payload,rows:publishedRows});
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

test('a newer incomplete cohort retains verified READY rows while diagnostics flag the gap',()=>{
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
    assert.equal(payload.status,'READY');
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
