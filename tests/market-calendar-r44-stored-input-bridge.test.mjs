import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {inspectR44StoredInput} from '../scripts/pc-writer/market-calendar-r44-stored-input-bridge.mjs';

const day='2026-10-30',now=Date.parse('2026-10-31T15:00:00Z');
const dir=()=>fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r44-'));
test('R44 fails without the actual PC root; no fallback directory is created',()=>{
 const base=path.join(dir(),'not-present');
 const result=inspectR44StoredInput({base,now});
 assert.equal(result.status,'PC_DATA_ROOT_NOT_PRESENT');
 assert.equal(fs.existsSync(base),false);
});

test('R44 differentiates persisted S&P500 rows from full 2634 eligible issuer input',()=>{
 const base=dir();
 try{
  fs.mkdirSync(path.join(base,'storage'));
  const file=path.join(base,'storage','core.sqlite');
  const db=new DatabaseSync(file);
  db.exec('CREATE TABLE market_score_breadth_b1_r3_current_v1(trade_date TEXT,ticker TEXT,current_close REAL,current_volume REAL);');
  db.exec("INSERT INTO market_score_breadth_b1_r3_current_v1 VALUES('2026-10-30','NVDA',213,21000000),('2026-10-30','AAPL',270,18000000)");
  db.exec('CREATE TABLE public_feed_snapshots_v1(kind TEXT,feed_key TEXT,snapshot_key TEXT,body TEXT);');
  const projection={events:[{ticker:'NVDA'},{ticker:'AAPL'}],coveredDays:[day],checkedAt:'2026-10-31T00:00:00Z'};
  db.prepare('INSERT INTO public_feed_snapshots_v1 VALUES(?,?,?,?)').run('input','release-calendar:earnings-api:private-events','current',JSON.stringify(projection));
  db.close();
  const report=inspectR44StoredInput({base,now});
  assert.equal(report.status,'R43_FULL_UNIVERSE_INPUT_NOT_AVAILABLE');
  assert.equal(report.source.breadthStored.latestTickerCount,2);
  assert.equal(report.source.earningsPrivate.uniqueTickerCount,2);
  assert.equal(report.providerCalls,0);
  assert.equal(report.dbWrites,0);
  assert.equal(fs.existsSync(path.join(base,'local-market-calendar-r43-input.json')),false);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('R44 reports readiness when a reviewed 2634-row saved input already exists',()=>{
 const base=dir();
 try{
  const rows=Array.from({length:2634},(_,i)=>({ticker:`T${i}`,eligible:true,tradeDate:day,
    price:100+i,volume:1000,relativeVolume:1.05}));
  fs.writeFileSync(path.join(base,'local-market-calendar-r43-input.json'),JSON.stringify({
    version:1,asOf:day,provenance:'APPROVED_PC_STORED_DATA',
    permissionForDerivedScores:true,marketCapApiUsed:false,rows,
  }));
  const report=inspectR44StoredInput({base,now});
  assert.equal(report.status,'R43_INPUT_PRESENT_READY_FOR_EXISTING_SCORER');
  assert.equal(report.source.r43Input.eligibleRecords,2634);
  assert.equal(report.source.r43Input.relativeVolumeRecords,2634);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
