import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {inspectBeaManufacturingSqlite} from '../scripts/pc-writer/EARNINGS_BEA_MFG_PROFIT_R3_SQLITE_READONLY.mjs';

function fixture(fn){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bea-mfg-r3-'));
  const storage=path.join(root,'storage');fs.mkdirSync(storage);
  try{return fn({root,storage});}finally{fs.rmSync(root,{recursive:true,force:true});}
}
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

test('finds existing N400RC inside SQLite without changing database',()=>fixture(({root,storage})=>{
  const file=path.join(storage,'core.sqlite');
  const db=new DatabaseSync(file);
  db.exec('CREATE TABLE source_snapshots (series_id TEXT, raw_payload TEXT)');
  db.prepare('INSERT INTO source_snapshots VALUES (?, ?)').run('N400RC1Q027SBEA','{"period":"2026-Q2"}');
  db.close();
  const before=sha(file);
  const result=inspectBeaManufacturingSqlite({root});
  assert.equal(result.status,'CANDIDATE_EXISTING_SQLITE_FOUND');
  assert.equal(result.matchCount,1);
  assert.equal(result.databases[0].matches[0].table,'source_snapshots');
  assert.equal(sha(file),before);
  assert.equal(result.safeToAutoCapture,false);
  assert.equal(result.sqlWrites,0);
  assert.equal(result.d1Writes,0);
}));

test('nonmatches do not incorrectly authorize capture',()=>fixture(({root,storage})=>{
  const db=new DatabaseSync(path.join(storage,'core.sqlite'));
  db.exec('CREATE TABLE data (name TEXT, payload TEXT)');
  db.prepare('INSERT INTO data VALUES (?,?)').run('A051RC','unrelated value');
  db.close();
  const result=inspectBeaManufacturingSqlite({root});
  assert.equal(result.status,'NO_MATCH_IN_SQLITE_SCAN');
  assert.equal(result.safeToAutoCapture,false);
  assert.deepEqual(result.warnings,['XLSX_AND_OTHER_RAW_SOURCES_NOT_INSPECTED']);
}));

test('bounded scan is incomplete when rows exceed cap',()=>fixture(({root,storage})=>{
  const db=new DatabaseSync(path.join(storage,'history.sqlite'));
  db.exec('CREATE TABLE records (id INTEGER PRIMARY KEY, payload TEXT)');
  db.exec("WITH RECURSIVE x(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM x WHERE n<20001) INSERT INTO records(id,payload) SELECT n, 'OTHER' FROM x");
  db.close();
  const result=inspectBeaManufacturingSqlite({root});
  assert.equal(result.status,'SQLITE_INSPECTION_INCOMPLETE');
  assert.equal(result.databases[1].rowsLimited,true);
}));

test('sqlite open failure reports unknown rather than missing source',()=>fixture(({root,storage})=>{
  fs.writeFileSync(path.join(storage,'core.sqlite'),'not a valid sqlite database');
  const result=inspectBeaManufacturingSqlite({root,DatabaseSync:class{constructor(){throw Error('broken driver');}}});
  assert.equal(result.status,'SQLITE_INSPECTION_INCOMPLETE');
  assert.equal(result.databases[0].status,'SQLITE_READ_FAILED');
  assert.equal(result.safeToAutoCapture,false);
}));
