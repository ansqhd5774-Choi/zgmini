// Source-regression carry-forward from #1231 to the current main BLS collector.
// Offline Node in-memory SQLite only; no real PC database, provider or D1 calls.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';
import {
  checkSchema,normalizeSeries,buildPlans,insertPlans,SERVICE_SERIES,resultLogPath,
} from '../scripts/pc-writer/EARNINGS_R3C_BLS_STORE_ONCE.mjs';
import {resultLogPath as r3dResultLogPath} from '../scripts/pc-writer/EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs';
import {resultPaths as r4ResultPaths} from '../scripts/pc-writer/EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs';

function newDb() {
  const db = new DatabaseSync(':memory:');
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

function fakeResponse(value='159.780') {
  return {status:'REQUEST_SUCCEEDED',Results:{series:[
    {seriesID:'WPSFD4',data:[{year:'2026',period:'M09',value,
      periodName:'September',footnotes:[],latest:'true'}]},
    {seriesID:'WPSFD41',data:[{year:'2026',period:'M09',value:'162.341',
      periodName:'September',footnotes:[]}]},
    {seriesID:'PRS85006111',data:[{year:'2026',period:'Q02',value:'1.4',
      periodName:'2nd Quarter',footnotes:[]}]},
  ]}};
}

const plans = (resp=fakeResponse(), time='2026-10-27T02:00:00.000Z') =>
  buildPlans(normalizeSeries(resp),time,'a'.repeat(64));

test('all three series are checked and normalized without invented vintage',()=>{
  const p = plans();
  assert.deepEqual(p.map(x=>x.id),['WPSFD4','WPSFD41','PRS85006111']);
  assert.equal(p[0].rows[0].rawValue,'159.780');
  assert.equal(p[0].rows[0].value,159.78);
  assert.equal(p[0].rows[0].vintageId,null);
  assert.equal(p[2].rows[0].observationDate,'2026-Q2');
  assert.equal(p[2].rows[0].rawUnit,'PERCENT_YEAR_OVER_YEAR');
});

test('schema guard rejects absent tables or incomplete schemas',()=>{
  const db = new DatabaseSync(':memory:');
  assert.throws(()=>checkSchema(db),/EXISTING_TABLE_MISSING_NO_WRITE/);
  db.close();
});

test('append-only write verifies 3 series, is idempotent and preserves FRED',()=>{
  const db=newDb();
  const before=checkSchema(db);
  assert.deepEqual(before,{existingSnapshots:0,existingChunks:0});
  const r1=insertPlans(db,plans());
  assert.deepEqual(r1,{insertedChunks:3,insertedSnapshots:3,verified:3});
  const r2=insertPlans(db,plans());
  assert.deepEqual(r2,{insertedChunks:0,insertedSnapshots:0,verified:3});
  const entries=db.prepare('SELECT provider,dataset FROM api_history_snapshots_v1 ORDER BY dataset').all();
  assert.equal(entries.length,3);
  assert(entries.every(x=>x.provider==='BLS'));
  db.close();
});

test('revised index value produces new snapshot without replacing the older one',()=>{
  const db=newDb();
  insertPlans(db,plans());
  const next=insertPlans(db,plans(fakeResponse('159.781'),'2026-10-28T02:00:00.000Z'));
  assert.deepEqual(next,{insertedChunks:1,insertedSnapshots:1,verified:3});
  const rows=db.prepare("SELECT row_count FROM api_history_snapshots_v1 WHERE provider='BLS' AND dataset='WPSFD4'").all();
  assert.equal(rows.length,2);
  db.close();
});

test('conflicting preexisting BLS namespace stops before write',()=>{
  const db=newDb();
  db.prepare(`INSERT INTO api_history_snapshots_v1 (provider,dataset,snapshot_sha256,
    as_of,retrieved_at,status,row_count,chunk_hashes_json,provenance_json)
    VALUES (?,?,?,?,?,?,?,?,?)`).run('BLS','WPSFD4','x','2026-10-27',
    '2026-10-27T02:00:00.000Z','READY',1,'["x"]','{"contract":"OTHER"}');
  assert.throws(()=>checkSchema(db),/PRIOR_BLS_NAMESPACE_CONFLICT_NO_WRITE/);
  assert.throws(()=>insertPlans(db,plans()),/PRIOR_BLS_NAMESPACE_CONFLICT_NO_WRITE/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM api_history_chunks_v1").get().n,0);
  db.close();
});

test('unexpected period and duplicate conflicting observation are rejected',()=>{
  const bad=fakeResponse();
  bad.Results.series[0].data[0].value='non-numeric';
  assert.throws(()=>normalizeSeries(bad),/BLS_OBSERVATION_INVALID_NO_WRITE/);
  const conflict=fakeResponse();
  conflict.Results.series[0].data.push({...conflict.Results.series[0].data[0],value:'159.781'});
  assert.throws(()=>normalizeSeries(conflict),/BLS_DUPLICATE_PERIOD_CONFLICT_NO_WRITE/);
});

test('unapproved new tables or incompatible schema never created automatically',()=>{
  const db = new DatabaseSync(':memory:');
  assert.throws(()=>insertPlans(db,plans()),/EXISTING_TABLE_MISSING_NO_WRITE/);
  const tables=db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table'").get().n;
  assert.equal(tables,0);
  db.close();
});

test('SQL failure rolls back all three BLS series, leaving existing FRED intact',()=>{
  const db = newDb();
  db.prepare(`INSERT INTO api_history_snapshots_v1 (provider,dataset,snapshot_sha256,
    as_of,retrieved_at,status,row_count,chunk_hashes_json,provenance_json)
    VALUES (?,?,?,?,?,?,?,?,?)`).run('FRED','PRS85006111','prior','2026-10-27',
    '2026-10-27T02:00:00.000Z','READY',1,'["z"]','{"source":"FRED"}');
  db.exec(`CREATE UNIQUE INDEX test_quarterly_conflict
    ON api_history_snapshots_v1(dataset) WHERE dataset='PRS85006111'`);
  assert.throws(()=>insertPlans(db,plans()),/UNIQUE constraint failed/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM api_history_chunks_v1 WHERE provider='BLS'").get().n,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM api_history_snapshots_v1 WHERE provider='BLS'").get().n,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM api_history_snapshots_v1 WHERE provider='FRED'").get().n,1);
  db.close();
});

test('preexisting write triggers are rejected',()=>{
  const db=newDb();
  db.exec(`CREATE TRIGGER dangerous_trigger BEFORE INSERT ON api_history_chunks_v1
    BEGIN SELECT RAISE(ABORT,'trigger'); END`);
  assert.throws(()=>checkSchema(db),/EXISTING_TRIGGER_PRESENT_NO_WRITE/);
  db.close();
});

function serviceResponse(value='157.666') {
  return {status:'REQUEST_SUCCEEDED',Results:{series:[
    {seriesID:'WPSFD42',data:[
      {year:'2026',period:'M09',value,periodName:'September',
       footnotes:[{code:'P'}],latest:'true'},
      {year:'2025',period:'M09',value:'150.273',periodName:'September',
       footnotes:[]},
    ]},
  ]}};
}

test('WPSFD42 service-only raw mode is one monthly SA index and no official vintage',()=>{
  assert.deepEqual(SERVICE_SERIES,['WPSFD42']);
  const normalized=normalizeSeries(serviceResponse(),SERVICE_SERIES);
  const plans=buildPlans(normalized,'2026-10-27T02:00:00.000Z','b'.repeat(64));
  assert.equal(plans.length,1);
  assert.equal(plans[0].id,'WPSFD42');
  assert.equal(plans[0].rows.length,2);
  assert.equal(plans[0].rows[1].rawValue,'157.666');
  assert.equal(plans[0].rows[1].rawUnit,'INDEX');
  assert.equal(plans[0].rows[1].seasonalAdjustment,'SA');
  assert.equal(plans[0].rows[1].vintageId,null);
  assert.equal(JSON.parse(plans[0].provenanceJson).officialVintageId,null);
});

test('service-only append isolates its source from existing BLS three-series snapshots',()=>{
  const db=newDb();
  try{
    assert.deepEqual(insertPlans(db,plans()),{insertedChunks:3,insertedSnapshots:3,verified:3});
    const svc=buildPlans(normalizeSeries(serviceResponse(),SERVICE_SERIES),
      '2026-10-27T03:00:00.000Z','b'.repeat(64));
    const r1=insertPlans(db,svc);
    assert.deepEqual(r1,{insertedChunks:1,insertedSnapshots:1,verified:1});
    const r2=insertPlans(db,svc);
    assert.deepEqual(r2,{insertedChunks:0,insertedSnapshots:0,verified:1});
    const counts=db.prepare('SELECT dataset,COUNT(*) AS n FROM api_history_snapshots_v1 WHERE provider=? GROUP BY dataset').all('BLS');
    assert.equal(counts.length,4);
    assert(counts.every(x=>x.n===1));
    assert.equal(counts.find(x=>x.dataset==='WPSFD42')?.n,1);
    assert.deepEqual(checkSchema(db,{includeServices:true}),{existingSnapshots:4,existingChunks:4});
  }finally{db.close();}
});

test('service-only preflight/append survives damaged base BLS metadata without weakening base checks',()=>{
  const db=newDb();
  try{
    assert.equal(insertPlans(db,plans()).verified,3);
    const service=buildPlans(normalizeSeries(serviceResponse(),SERVICE_SERIES),
      '2026-10-27T03:00:00.000Z','b'.repeat(64));
    db.prepare(`UPDATE api_history_snapshots_v1 SET provenance_json=?
      WHERE provider='BLS' AND dataset='WPSFD4'`).run('{"contract":"OTHER"}');
    // Default and explicitly mixed checks must still reject the bad base source.
    assert.throws(()=>checkSchema(db),/PRIOR_BLS_NAMESPACE_CONFLICT_NO_WRITE/);
    assert.throws(()=>checkSchema(db,{includeServices:true}),
      /PRIOR_BLS_NAMESPACE_CONFLICT_NO_WRITE/);
    const badBase=db.prepare(`SELECT provenance_json FROM api_history_snapshots_v1
      WHERE provider='BLS' AND dataset='WPSFD4'`).get().provenance_json;
    assert.deepEqual(checkSchema(db,{includeServices:true,serviceOnly:true}),
      {existingSnapshots:0,existingChunks:0});
    assert.deepEqual(insertPlans(db,service),
      {insertedChunks:1,insertedSnapshots:1,verified:1});
    assert.equal(db.prepare(`SELECT provenance_json FROM api_history_snapshots_v1
      WHERE provider='BLS' AND dataset='WPSFD4'`).get().provenance_json,badBase);
    assert.throws(()=>insertPlans(db,plans()),/PRIOR_BLS_NAMESPACE_CONFLICT_NO_WRITE/);
    // Corruption inside WPSFD42 remains a hard stop even in isolated mode.
    db.prepare(`UPDATE api_history_snapshots_v1 SET provenance_json=?
      WHERE provider='BLS' AND dataset='WPSFD42'`).run('{"contract":"OTHER"}');
    assert.throws(()=>checkSchema(db,{serviceOnly:true}),
      /PRIOR_BLS_NAMESPACE_CONFLICT_NO_WRITE/);
    assert.throws(()=>insertPlans(db,service),/PRIOR_BLS_NAMESPACE_CONFLICT_NO_WRITE/);
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM api_history_snapshots_v1
      WHERE provider='BLS' AND dataset='WPSFD42'`).get().n,1);
  }finally{db.close();}
});

test('service-only source rejects unrelated series and conflicting repeated month',()=>{
  assert.throws(()=>normalizeSeries(fakeResponse(),SERVICE_SERIES),/BLS_SERIES_COUNT_MISMATCH_NO_WRITE/);
  const unexpected=serviceResponse();
  unexpected.Results.series[0].seriesID='WPSFD4';
  assert.throws(()=>normalizeSeries(unexpected,SERVICE_SERIES),/BLS_SERIES_ID_MISMATCH_NO_WRITE/);
  const conflict=serviceResponse();
  conflict.Results.series[0].data.push({...conflict.Results.series[0].data[0],value:'157.667'});
  assert.throws(()=>normalizeSeries(conflict,SERVICE_SERIES),/BLS_DUPLICATE_PERIOD_CONFLICT_NO_WRITE/);
});

test('same-hash WPSFD42 snapshot with damaged stored lineage cannot pass idempotent readback',()=>{
  const corruptions=[
    {kind:'status',corrupt:db=>db.prepare(`UPDATE api_history_snapshots_v1 SET status=?
      WHERE provider='BLS' AND dataset='WPSFD42'`).run('INVALID')},
    {kind:'retrieved_at',corrupt:db=>db.prepare(`UPDATE api_history_snapshots_v1 SET retrieved_at=?,as_of=?
      WHERE provider='BLS' AND dataset='WPSFD42'`)
      .run('2026-10-28T03:00:00.000Z','2026-10-28')},
    {kind:'authority',corrupt:db=>{
      const original=db.prepare(`SELECT provenance_json FROM api_history_snapshots_v1
        WHERE provider='BLS' AND dataset='WPSFD42'`).get();
      const meta=JSON.parse(original.provenance_json);
      meta.authority='OTHER';
      db.prepare(`UPDATE api_history_snapshots_v1 SET provenance_json=?
        WHERE provider='BLS' AND dataset='WPSFD42'`).run(JSON.stringify(meta));
    }},
  ];
  for(const {kind,corrupt} of corruptions){
    const db=newDb();
    try{
      const service=buildPlans(normalizeSeries(serviceResponse(),SERVICE_SERIES),
        '2026-10-27T03:00:00.000Z','b'.repeat(64));
      assert.equal(insertPlans(db,service).verified,1);
      corrupt(db);
      if(kind==='authority'){
        // The strengthened namespace guard now rejects this before any SQL write.
        assert.throws(()=>checkSchema(db,{includeServices:true}),
          /PRIOR_BLS_NAMESPACE_CONFLICT_NO_WRITE/);
        assert.throws(()=>insertPlans(db,[...plans(),...service]),
          /PRIOR_BLS_NAMESPACE_CONFLICT_NO_WRITE/);
      }else{
        // Status and retrieved_at still pass the narrow namespace check, but
        // must fail the existing transactional lineage readback and roll back.
        assert.deepEqual(checkSchema(db,{includeServices:true}),
          {existingSnapshots:1,existingChunks:1});
        assert.throws(()=>insertPlans(db,[...plans(),...service]),
          /BLS_STORED_LINEAGE_MISMATCH_ROLLBACK/);
      }
      const preserved=db.prepare(`SELECT dataset FROM api_history_snapshots_v1
        WHERE provider='BLS'`).all().map(x=>x.dataset);
      assert.deepEqual(preserved,['WPSFD42'],kind);
      assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM api_history_chunks_v1
        WHERE provider='BLS'`).get().n,1,kind);
    }finally{db.close();}
  }
});

test('R3C manual diagnostic TXT is emitted under user TEMP rather than source checkout',()=>{
  const stamp='20261117-114500Z';
  assert.equal(resultLogPath(stamp),
    path.join(os.tmpdir(),'EARNINGS_R3C_BLS_STORE_ONCE_RESULT_'+stamp+'.txt'));
  assert.equal(resultLogPath(stamp,{includeServices:true}),
    path.join(os.tmpdir(),'EARNINGS_BLS_SERVICE_R1_RESULT_'+stamp+'.txt'));
  assert.notEqual(path.dirname(resultLogPath(stamp)),path.resolve('scripts/pc-writer'));
  assert.throws(()=>resultLogPath('../foo'),/INVALID_RESULT_STAMP/);
  assert.throws(()=>resultLogPath('2026-11-17T11:45:00Z'),/INVALID_RESULT_STAMP/);
});

test('R3D and R4 original/service-only local receipts remain in user TEMP, never checkout',()=>{
 const stamp='20261123-154500Z',tmp=os.tmpdir();
 const p3=r3dResultLogPath(stamp);
 assert.equal(path.dirname(p3),tmp);
 assert.match(path.basename(p3),/^EARNINGS_R3D_STORED_BLS_CALC_RESULT_/);
 assert.throws(()=>r3dResultLogPath('../evil'),/INVALID_RESULT_STAMP/);
 const normal=r4ResultPaths(stamp),isolated=r4ResultPaths(stamp,{mode:'SERVICE_ONLY'});
 for(const file of [normal.txtFile,normal.jsonFile,isolated.txtFile,isolated.jsonFile]){
  assert.equal(path.dirname(file),tmp);
  assert.notEqual(path.dirname(file),path.resolve('scripts/pc-writer'));
 }
 assert.notEqual(normal.txtFile,isolated.txtFile);
 assert.match(path.basename(isolated.jsonFile),/SERVICE_ONLY_READ_MODEL_PREVIEW_RESULT/);
 assert.throws(()=>r4ResultPaths('../evil'),/INVALID_RESULT_STAMP/);
 assert.throws(()=>r4ResultPaths(stamp,{mode:'UNKNOWN'}),/R4_PREVIEW_OUTPUT_INVALID/);
});
