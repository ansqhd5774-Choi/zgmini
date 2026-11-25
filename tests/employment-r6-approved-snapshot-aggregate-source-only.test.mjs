import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {EMPLOYMENT_R6_TABLES as T} from '../lib/market-score/employment-r6-contract.mjs';
import {aggregateR6FromApprovedOpenSnapshot as aggregate} from
 '../lib/market-score/employment-r6-approved-snapshot-aggregate-source-only.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const stamp='2026-11-20T02:00:00.000Z';
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'w04-approved-snapshot-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'core.sqlite'),db=new DatabaseSync(file);
 db.exec('CREATE TABLE '+T.rawSnapshot+' (snapshot_id TEXT,chunk_index INTEGER,chunk_count INTEGER,release_group TEXT,provider TEXT,request_key TEXT,retrieved_at TEXT,created_at TEXT,body_sha256 TEXT,detail_json TEXT,body_chunk TEXT)');
 db.exec('CREATE TABLE '+T.runs+' (provider TEXT,status TEXT,completed_at TEXT,detail_json TEXT)');
 const raw=db.prepare('INSERT INTO '+T.rawSnapshot+' VALUES(?,?,?,?,?,?,?,?,?,?,?)');
 const run=db.prepare('INSERT INTO '+T.runs+' VALUES(?,?,?,?)');
 for(const [group,provider] of [['BLS_EMPLOYMENT_SITUATION','BLS'],['DOL_UI_WEEKLY_CLAIMS','DOL_ETA']]){
  const body=JSON.stringify({group,n:1}),bodyHash=hash(body),key='secret-'+group;
  const id=hash([group,provider,key,bodyHash].join('|'));
  raw.run(id,0,1,group,provider,key,stamp,'2026-11-20T02:00:01.000Z',bodyHash,
   JSON.stringify({responseHash:bodyHash}),body);
  run.run('EMPLOYMENT_R6_'+group,'SUCCESS','2026-11-20T02:00:02.000Z',
   JSON.stringify({rawSnapshots:[{snapshotId:id,bodySha256:bodyHash}]}));
 }
 db.close();
 return file;
}
const digest=file=>hash(fs.readFileSync(file));
test('all approved R6 groups are aggregated from existing query-only transaction without opening a new SQLite connection',t=>{
 const file=fixture(t),before=digest(file),db=new DatabaseSync(file,{readOnly:true});
 try{
  db.exec('PRAGMA query_only=ON');db.exec('BEGIN');
  const output=aggregate({db,asOfDate:'2026-11-25'});
  assert.deepEqual([output.metadataKeys,output.bodyVerifiedKeys,output.runCertifiedKeys],[2,2,2]);
  assert.equal(output.rawSnapshotByGroup.length,2);
  assert.equal(output.rawSnapshotByMonth.length,1);
  assert.equal(output.transactionOwnershipVerified,false);
  assert.equal(output.runtimeAuthorizationVerified,false);
  assert.equal(output.historicalPitAttested,false);
  assert.equal(output.repairAuthorized,false);
  assert.ok(!JSON.stringify(output).includes('secret-'));
  db.exec('ROLLBACK');
  assert.deepEqual(db.prepare('PRAGMA query_only').get(),{query_only:1});
 }finally{db.close();}
 assert.equal(digest(file),before);
});
test('a SQLite connection without query_only is rejected before any raw access',t=>{
 const file=fixture(t),before=digest(file),db=new DatabaseSync(file,{readOnly:true});
 try{
  db.exec('BEGIN');
  assert.throws(()=>aggregate({db,asOfDate:'2026-11-25'}),
   /R6_OPEN_SNAPSHOT_QUERY_ONLY_REQUIRED/);
  db.exec('ROLLBACK');
 }finally{db.close();}
 assert.equal(digest(file),before);
});
test('invalid as-of date is rejected before any SQL',()=>{
 assert.throws(()=>aggregate({db:{prepare:()=>{throw Error('must not call')}} ,
  asOfDate:'2026-02-31'}),/R6_OPEN_SNAPSHOT_INPUT_INVALID/);
});
test('as-of cutoff prevents records beyond the approved day',t=>{
 const file=fixture(t),db=new DatabaseSync(file,{readOnly:true});
 try{
  db.exec('PRAGMA query_only=ON');db.exec('BEGIN');
  const r=aggregate({db,asOfDate:'2026-11-19'});
  assert.deepEqual([r.metadataKeys,r.bodyVerifiedKeys,r.runCertifiedKeys],[0,0,0]);
  db.exec('ROLLBACK');
 }finally{db.close();}
});
