import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {koreaPublicationPlan} from './korea-publication.mjs';
const snapshot={date:'20261006',methodology_version:'kr-fg-cnn-r7-1.0.0',factors_json:'{}',composite_json:'{}',history_mode:'RECONSTRUCTED_CURRENT_VINTAGE',point_in_time_verified:0,source_observed_at:'20261006',calculated_at:'2026-10-07T16:37:16.032Z'};
const checkpoint={date:'20261006',status:'COMPLETE',kospi_count:1,valid_high_count:1,valid_low_count:1,valid_share_volume_count:1,rows_stored:1,krx_request_count:1,bok_request_count:1,fetched_at:'2026-10-07',methodology_version:snapshot.methodology_version};
test('missing/mismatched checkpoint is never fabricated',()=>{
 assert.throws(()=>koreaPublicationPlan(snapshot,null),/CHECKPOINT_REQUIRED/);
 assert.throws(()=>koreaPublicationPlan(snapshot,{...checkpoint,date:'20261002'}),/CHECKPOINT_REQUIRED/);
});
test('completed date and snapshot satisfy real FK and repeated publication is idempotent',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('PRAGMA foreign_keys=ON');
  db.exec('CREATE TABLE kfg_rev7_market_dates(date TEXT PRIMARY KEY,status TEXT,kospi_count INTEGER,valid_high_count INTEGER,valid_low_count INTEGER,valid_share_volume_count INTEGER,rows_stored INTEGER,krx_request_count INTEGER,bok_request_count INTEGER,fetched_at TEXT,methodology_version TEXT)');
  db.exec('CREATE TABLE kfg_rev7_snapshots(date TEXT PRIMARY KEY REFERENCES kfg_rev7_market_dates(date),methodology_version TEXT,factors_json TEXT,composite_json TEXT,history_mode TEXT,point_in_time_verified INTEGER,source_observed_at TEXT,calculated_at TEXT)');
  const plan=koreaPublicationPlan(snapshot,checkpoint);
  assert.throws(()=>db.prepare(plan[1].sql).run(...plan[1].params),/FOREIGN KEY/);
  for(let i=0;i<2;i++){db.exec('BEGIN');for(const stmt of plan)db.prepare(stmt.sql).run(...stmt.params);db.exec('COMMIT');}
  assert.equal(db.prepare('SELECT count(*) AS n FROM kfg_rev7_snapshots').get().n,1);
  assert.equal(db.prepare('SELECT count(*) AS n FROM kfg_rev7_market_dates').get().n,1);
 }finally{db.close();}
});
