import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {EMPLOYMENT_R6_TABLES as T} from '../lib/market-score/employment-r6-contract.mjs';
import {auditEmploymentR6Pit0605StoredRaw} from '../scripts/pc-writer/employment-r6-pit-coverage.mjs';

const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
test('PIT0605 empty-scope remains private, read-only, and never authorizes repair',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'w04-pit0605-private-'));
 const core=path.join(dir,'core.sqlite'),candidate=path.join(dir,'candidate.sqlite');
 try{
  const schema=' (logical_series_id TEXT,geography_type TEXT,geography_code TEXT,observation_date TEXT,source_hash TEXT,value REAL,retrieved_at TEXT,available_at TEXT,provider TEXT,provider_series_id TEXT,quality_status TEXT,pit_class TEXT,provenance_json TEXT)';
  for(const file of [core,candidate]){
   const db=new DatabaseSync(file);
   try{
    for(const table of [T.observationCurrent,T.observationHistory])
     db.exec('CREATE TABLE '+table+schema);
    if(file===core){
     db.exec('CREATE TABLE '+T.rawSnapshot+' (snapshot_id TEXT,chunk_index INTEGER,chunk_count INTEGER,release_group TEXT,provider TEXT,request_key TEXT,retrieved_at TEXT,body_sha256 TEXT,detail_json TEXT,body_chunk TEXT)');
     db.exec('CREATE TABLE '+T.runs+' (provider TEXT,status TEXT,completed_at TEXT,detail_json TEXT)');
    }
   }finally{db.close();}
  }
  const before=[core,candidate].map(digest);
  let receipts=0;
  const result=await auditEmploymentR6Pit0605StoredRaw({
   dbPath:core,candidateDbPath:candidate,asOfDate:'2026-11-25',
   writePrivateEvidence:async(rows,hash)=>{
    receipts++;
    assert.deepEqual(rows,[]);
    assert.match(hash,/^[a-f0-9]{64}$/);
   },
  });
  assert.equal(receipts,1);
  assert.equal(result.missingHistoryKeys,0);
  assert.equal(result.historicPitAttested,false);
  assert.equal(result.repairAuthorized,false);
  assert.deepEqual([result.providerCalls,result.sqliteWrites,result.d1Writes],[0,0,0]);
  assert.deepEqual([core,candidate].map(digest),before);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
