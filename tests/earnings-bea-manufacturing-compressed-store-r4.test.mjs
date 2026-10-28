import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {DatabaseSync} from 'node:sqlite';
import {inspectCompressedBeaStores} from '../scripts/pc-writer/EARNINGS_BEA_MFG_PROFIT_R4_COMPRESSED_STORE_READONLY.mjs';

const fixture=fn=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bea-mfg-r4-'));
  fs.mkdirSync(path.join(root,'storage'));
  try{return fn(root);}finally{fs.rmSync(root,{recursive:true,force:true});}
};
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('finds compressed existing manufacturing series without altering DB',()=>fixture(root=>{
  const file=path.join(root,'storage','core.sqlite');
  const db=new DatabaseSync(file);
  db.exec('CREATE TABLE market_input_batches_v1 (batch_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL)');
  const encoded='gzip:'+gzipSync(JSON.stringify({series:{N400RC1Q027SBEA:[1,2,3]}})).toString('base64');
  db.prepare('INSERT INTO market_input_batches_v1 VALUES (?,?,?)').run('macro:2026-10-28',encoded,123);
  db.close();
  const before=hash(file);
  const result=inspectCompressedBeaStores({root});
  assert.equal(result.status,'CANDIDATE_EXISTING_COMPRESSED_SOURCE_FOUND');
  assert.deepEqual(result.databases[0].foundStores,['market_input_batches_v1:BODY']);
  assert.equal(hash(file),before);
  assert.equal(result.safeToAutoCapture,false);
}));

test('checks existing API history datasets by identity',()=>fixture(root=>{
  const db=new DatabaseSync(path.join(root,'storage','core.sqlite'));
  db.exec('CREATE TABLE api_history_snapshots_v1 (dataset TEXT)');
  db.prepare('INSERT INTO api_history_snapshots_v1 VALUES (?)').run('N400RC1Q027SBEA');
  db.close();
  const result=inspectCompressedBeaStores({root});
  assert.equal(result.status,'CANDIDATE_EXISTING_COMPRESSED_SOURCE_FOUND');
  assert.deepEqual(result.databases[0].foundStores,['api_history_snapshots_v1:DATASET']);
}));

test('empty stores must not authorize automatic recapture',()=>fixture(root=>{
  const result=inspectCompressedBeaStores({root});
  assert.equal(result.status,'NO_CONFIRMED_MATCH_IN_KNOWN_STORES');
  assert.equal(result.sourceAbsenceProven,false);
  assert.equal(result.safeToAutoCapture,false);
  assert.equal(result.sqlWrites,0);
  assert.equal(result.d1Writes,0);
}));
