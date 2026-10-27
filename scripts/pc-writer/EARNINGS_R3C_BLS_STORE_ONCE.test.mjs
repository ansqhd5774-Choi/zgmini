// Offline tests only. No API requests, PC SQLite or operational data touched.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {
  checkSchema,normalizeSeries,buildPlans,insertPlans,
} from './EARNINGS_R3C_BLS_STORE_ONCE.mjs';

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
