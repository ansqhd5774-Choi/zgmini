// Offline-only fixtures. Test writes are restricted to an in-memory SQLite DB.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {normalizeSeries,buildPlans,insertPlans} from './EARNINGS_R3C_BLS_STORE_ONCE.mjs';
import {analyze} from './EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs';

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

const monday=(year,month)=>({year:String(year),period:`M${String(month).padStart(2,'0')}`,
  periodName:'Synthetic month',value:String(100+(year-2025)*12+month),footnotes:[]});
function fakeResponse(options={}) {
  const monthly=[];
  for(let year=2025;year<=2026;year++){
    for(let month=1;month<=(year===2025?12:9);month++){
      const key=`${year}-${String(month).padStart(2,'0')}`;
      if(!options.omit?.includes(key)) monthly.push(monday(year,month));
    }
  }
  const quarters=[];
  for(let year=2025;year<=2026;year++){
    for(let q=1;q<=(year===2025?4:2);q++){
      quarters.push({year:String(year),period:`Q0${q}`,
        value:String((year-2025)*2+q/10),periodName:'Synthetic quarter',footnotes:[]});
    }
  }
  return {status:'REQUEST_SUCCEEDED',Results:{series:[
    {seriesID:'WPSFD4',data:monthly},
    {seriesID:'WPSFD41',data:monthly.map(v=>({...v,value:String(Number(v.value)*2)}))},
    {seriesID:'PRS85006111',data:quarters},
  ]}};
}
function populatedDb(response=fakeResponse()) {
  const db=testDb();
  insertPlans(db,buildPlans(normalizeSeries(response),'2026-10-27T02:00:00.000Z',
    'a'.repeat(64)));
  return db;
}

test('three historical sources: SHA, cohort, gaps, YoY 9 pairs, ULC unchanged',()=>{
  const db=populatedDb();
  try{
    const result=analyze(db);
    assert.equal(result.status,'PASS_R3D_STORED_ONLY_CALCULATION');
    assert.equal(result.snapshotsChecked,3);
    assert.equal(result.cohorts,1);
    assert.equal(result.responseSha256,'a'.repeat(64));
    assert.deepEqual(result.rows.map(r=>r.rows),[21,21,6]);
    assert.deepEqual(result.rows.map(r=>r.gaps),[0,0,0]);
    assert.equal(result.rows[0].yoyPairs,9);
    assert.equal(result.rows[1].yoyPairs,9);
    assert.equal(result.rows[0].latestBase,'2025-09-01');
    assert.equal(result.rows[0].last,'2026-09-01');
    assert.equal(result.rows[0].latestYoy,100*(121/109-1));
    assert.equal(result.rows[1].latestYoy,100*(242/218-1));
    assert.equal(result.rows[2].last,'2026-Q2');
    assert.equal(result.rows[2].latestRawValue,'2.2');
    assert.equal(result.rows[2].latestYoy,null);
  }finally{db.close();}
});

test('monthly gap remains explicit and never interpolates a missing base',()=>{
  const db=populatedDb(fakeResponse({omit:['2025-03']}));
  try{
    const result=analyze(db);
    assert.equal(result.status,'PASS_R3D_STORED_ONLY_CALCULATION');
    for(const row of result.rows.slice(0,2)){
      assert.equal(row.gaps,1);
      assert.equal(row.yoyPairs,8);
    }
  }finally{db.close();}
});

test('missing latest YoY base yields partial, never a fabricated latest change',()=>{
  const db=populatedDb(fakeResponse({omit:['2025-09']}));
  try{
    const result=analyze(db);
    assert.equal(result.status,'PARTIAL_YOY_BASE_MISSING');
    assert.deepEqual(result.missingYoy,['WPSFD4','WPSFD41']);
    assert.equal(result.rows[0].latestYoy,null);
    assert.equal(result.rows[0].latestBase,null);
    assert.equal(result.rows[0].yoyPairs,8);
  }finally{db.close();}
});

test('changed raw payload is stopped by content-hash mismatch',()=>{
  const db=populatedDb();
  try{
    db.prepare(`UPDATE api_history_chunks_v1 SET payload_json=?
      WHERE provider='BLS' AND dataset='WPSFD4'`).run('[{"bad":true}]');
    assert.throws(()=>analyze(db),/CHUNK_SHA256_MISMATCH/);
  }finally{db.close();}
});

test('changed snapshot provenance is detected before calculation',()=>{
  const db=populatedDb();
  try{
    db.prepare(`UPDATE api_history_snapshots_v1 SET provenance_json=?
      WHERE provider='BLS' AND dataset='WPSFD4'`).run('{"authority":"OTHER"}');
    assert.throws(()=>analyze(db),/BLS_SOURCE_PROVENANCE_INVALID/);
  }finally{db.close();}
});

test('incomplete three-source capture is not misreported as a full cohort',()=>{
  const db=populatedDb();
  try{
    db.prepare(`DELETE FROM api_history_snapshots_v1
      WHERE provider='BLS' AND dataset='PRS85006111'`).run();
    assert.throws(()=>analyze(db),/COMPLETE_BLS_COHORT_MISSING/);
  }finally{db.close();}
});

test('FRED namespace is ignored and cannot alter stored BLS calculations',()=>{
  const db=populatedDb();
  try{
    db.prepare(`INSERT INTO api_history_snapshots_v1
      (provider,dataset,snapshot_sha256,as_of,retrieved_at,status,
        row_count,chunk_hashes_json,provenance_json) VALUES(?,?,?,?,?,?,?,?,?)`)
      .run('FRED','WPSFD4','unrelated','2026-10-27','2026-10-27T03:00:00.000Z',
        'READY',1,'["invalid"]','{"secret":"not BLS"}');
    const result=analyze(db);
    assert.equal(result.status,'PASS_R3D_STORED_ONLY_CALCULATION');
    assert.equal(result.snapshotsChecked,3);
    assert.equal(db.prepare(`SELECT COUNT(*) AS count FROM api_history_snapshots_v1
      WHERE provider='FRED'`).get().count,1);
  }finally{db.close();}
});

test('missing existing tables is a stop condition',()=>{
  const db=new DatabaseSync(':memory:');
  try{assert.throws(()=>analyze(db),/EXISTING_BLS_SOURCE_TABLES_MISSING/);}
  finally{db.close();}
});
