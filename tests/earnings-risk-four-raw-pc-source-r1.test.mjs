import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {readPcFourRaw} from '../scripts/pc-writer/EARNINGS_R4_RISK_RAW_R1_D1_ONE_SHOT.mjs';

function seededPc(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'earnings-r4-raw-'));
 const storage=path.join(dir,'storage');
 fs.mkdirSync(storage);
 const db=new DatabaseSync(path.join(storage,'core.sqlite'));
 db.exec(`CREATE TABLE market_score_earnings_e1_r3_universe_v1
 (period_end TEXT PRIMARY KEY,retrieved_at TEXT,security_count INTEGER,
 issuer_count INTEGER,wikipedia_revision_id TEXT,body_json TEXT);
 CREATE TABLE market_score_earnings_e1_r3_current_v1
 (period_end TEXT,cik TEXT,metric TEXT,value REAL);
 CREATE TABLE market_score_earnings_e1_r3_runs_v1
 (period_end TEXT,status TEXT,completed_at TEXT);`);
 const members=Array.from({length:500},(_,i)=>({cik:String(i+1).padStart(10,'0')}));
 const addU=db.prepare('INSERT INTO market_score_earnings_e1_r3_universe_v1 VALUES (?,?,?,?,?,?)');
 const addR=db.prepare('INSERT INTO market_score_earnings_e1_r3_runs_v1 VALUES (?,?,?)');
 const addF=db.prepare('INSERT INTO market_score_earnings_e1_r3_current_v1 VALUES (?,?,?,?)');
 db.exec('BEGIN');
 try{
  for(const period of ['2026-03-31','2026-06-30']){
   addU.run(period,'2026-10-26T00:00:00Z',500,500,'rev',
     JSON.stringify({members}));
   addR.run(period,'SUCCESS','2026-10-27T00:00:00Z');
   for(let i=0;i<500;i++){
    const cik=members[i].cik;
    addF.run(period,cik,'epsGrowth',(period==='2026-06-30'?.1:.08)+(i%5)*.002);
    addF.run(period,cik,'revenueGrowth',.05+(i%5)*.002);
    addF.run(period,cik,'operatingMargin',.15+(i%5)*.002);
   }
  }
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
 db.close();
 return dir;
}

test('one-shot PC source reads pre-existing SQLite without altering it',async()=>{
 const dir=seededPc();
 try{
  const file=path.join(dir,'storage','core.sqlite');
  const before=fs.statSync(file).mtimeMs;
  const result=await readPcFourRaw({base:dir,asOf:'2026-10-28'});
  assert.equal(result.status,'READY');
  assert.equal(result.financialPeriodEnd,'2026-06-30');
  assert.equal(result.source,'PC_STORED_SEC_EDGAR_E1_R4');
  assert.equal(result.factors.length,4);
  assert.ok(result.factors[0].value>result.factors[0].previousValue);
  assert.equal(result.history.length,2);
  assert.equal(fs.statSync(file).mtimeMs,before);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('missing PC core DB blocks without creating a replacement',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'earnings-r4-absent-'));
 try{
  await assert.rejects(readPcFourRaw({base:dir,asOf:'2026-10-28'}),/PC_SQLITE_MISSING/);
  assert.equal(fs.existsSync(path.join(dir,'storage','core.sqlite')),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
