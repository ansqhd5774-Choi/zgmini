import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {computeFiveFactor,FACTOR_WEIGHTS} from '../scripts/pc-writer/breadth-r10-v9-shadow/formula.mjs';
import {marketWindow,runShadow} from '../scripts/pc-writer/breadth-r10-v9-shadow/engine.mjs';
import {validSource,validPrice,priceConflict} from '../scripts/pc-writer/breadth-r10-v9-shadow/audit.mjs';
import {latestCompletedSession,isMarketSession} from '../lib/market-score/breadth-b1-r3-calendar.mjs';
const provenance=JSON.stringify({provider:'MARKETPARQUET_FREE_SAMPLE',sourceContractRevision:'ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5',splitAdjusted:true,dividendAdjusted:false,currentResolvedSymbol:'X',previousResolvedSymbol:'X'});
const dates=marketWindow('2026-10-16');
const members=Array.from({length:500},(_,i)=>'T'+String(i).padStart(3,'0'));
let fixture=null;
function base(){
 if(fixture)return fixture;
 fixture=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r10-v9-'));
 fs.mkdirSync(path.join(fixture,'storage'));
 const db=new DatabaseSync(path.join(fixture,'storage','core.sqlite'));
 db.exec('CREATE TABLE market_score_breadth_b1_r3_universe_v1(trade_date TEXT PRIMARY KEY,members_json TEXT,member_count INTEGER,provenance_json TEXT)');
 db.exec('CREATE TABLE market_score_breadth_b1_r3_current_v1(trade_date TEXT,ticker TEXT,previous_date TEXT,previous_close REAL,current_close REAL,current_volume REAL,source TEXT,feed TEXT,provenance_json TEXT)');
 db.exec('CREATE TABLE market_score_breadth_b1_r3_history_v1(trade_date TEXT,ticker TEXT,previous_date TEXT,previous_close REAL,current_close REAL,current_volume REAL,source TEXT,feed TEXT,provenance_json TEXT)');
 const u=db.prepare('INSERT INTO market_score_breadth_b1_r3_universe_v1 VALUES(?,?,?,?)');
 const c=db.prepare('INSERT INTO market_score_breadth_b1_r3_current_v1 VALUES(?,?,?,?,?,?,?,?,?)');
 const h=db.prepare('INSERT INTO market_score_breadth_b1_r3_history_v1 VALUES(?,?,?,?,?,?,?,?,?)');
 db.exec('BEGIN');
 for(let i=0;i<dates.length;i++){
  const d=dates[i];if(d==='2026-10-14')continue;
  u.run(d,JSON.stringify(members),500,'{}');
  for(let j=0;j<500;j++){
   const row=[d,members[j],i===0?'2025-12-01':dates[i-1],99+i+j/100,100+i+j/100,1000,'MarketParquet Free Sample','stock_daily',d==='2026-09-23'?'{}':provenance];
   c.run(...row);h.run(...row);
  }
 }
 db.exec('COMMIT');db.close();return fixture;
}
function run(asOf='2026-10-16'){return runShadow({base:base(),asOf,now:new Date('2026-10-20T13:00:00Z')})}
test('fixed R10 V9 weights, not dynamically reweighted',()=>{
 assert.deepEqual(FACTOR_WEIGHTS,{F1:.2,F2:2/15,F3:.2,F4:.2,F5:4/15});
 assert.ok(Math.abs(Object.values(FACTOR_WEIGHTS).reduce((a,b)=>a+b,0)-1)<1e-12);
});
test('source provenance, price quality, history conflict remain hard gates',()=>{
 const row={source:'MarketParquet Free Sample',feed:'stock_daily',provenance_json:provenance,trade_date:'2026-10-16',previous_date:'2026-10-15',previous_close:99,current_close:100,current_volume:1};
 assert.equal(validSource(row),true);assert.equal(validSource({...row,provenance_json:'{}'}),false);
 assert.equal(validPrice(row,'2026-10-16'),true);assert.equal(validPrice({...row,current_close:0},'2026-10-16'),false);
 assert.equal(priceConflict(row,[{...row,current_close:101}]),true);
});
test('fixed 120-session US market calendar',()=>{
 assert.equal(dates.length,120);assert.equal(dates.at(-1),'2026-10-16');
 assert.equal(isMarketSession('2026-09-07'),false);assert.equal(isMarketSession('2026-10-14'),true);
 assert.equal(latestCompletedSession(new Date('2026-10-20T00:00:00Z')),'2026-10-19');
});
test('reject invalid current input rather than fabricate scores',()=>{
 assert.equal(computeFiveFactor({dates:[],days:[]}).status,'NOT_READY');
});
test('direct stored history yields 59/61 scores, two distinct missing reasons',()=>{
 const r=run();
 assert.equal(r.status,'SHADOW_READY');
 assert.deepEqual([r.evaluation.scoreSummary.ready,r.evaluation.scoreSummary.notReady],[59,2]);
 assert.equal(r.evaluation.perDay.find(x=>x.date==='2026-09-23').reason,'COVERAGE_FAIL');
 assert.equal(r.evaluation.perDay.find(x=>x.date==='2026-10-14').reason,'NO_STORED_UNIVERSE');
 assert.ok(Math.abs(r.display.score-100)<1e-9);
 assert.equal(r.security.dbWrites,0);assert.equal(r.security.providerCalls,0);
});
test('one market session missing is STALE, three is UNAVAILABLE',()=>{
 const stale=run('2026-10-19');assert.equal(stale.status,'SHADOW_STALE');
 assert.equal(stale.display.observationDate,'2026-10-16');
 assert.equal(stale.display.lagSessions,1);assert.equal(stale.display.newObservation,false);
 const unavailable=runShadow({base:base(),asOf:'2026-10-21',now:new Date('2026-10-22T13:00:00Z')});
 assert.equal(unavailable.status,'SHADOW_UNAVAILABLE');assert.equal(unavailable.display.score,null);
});
test('read-only default and isolated shadow writing retain last READY value on STALE',()=>{
 const b=base(),f=path.join(b,'local-breadth-r10-v9-shadow.json'),log=path.join(b,'local-breadth-r10-v9-shadow-last-run.json');
 assert.equal(run().security.dbWrites,0);
 assert.equal(fs.existsSync(f),false);
 const ready=runShadow({base:b,asOf:'2026-10-16',now:new Date('2026-10-16T23:00:00Z'),writeLocal:true});
 assert.equal(ready.status,'SHADOW_READY');assert.equal(fs.existsSync(f),true);
 const prior=fs.readFileSync(f,'utf8');
 const stale=runShadow({base:b,asOf:'2026-10-19',now:new Date('2026-10-20T13:00:00Z'),writeLocal:true});
 assert.equal(stale.status,'SHADOW_STALE');assert.equal(fs.readFileSync(f,'utf8'),prior);
 assert.equal(JSON.parse(fs.readFileSync(log,'utf8')).status,'SHADOW_STALE');
});
test('historical file overwrite is forbidden',()=>{
 assert.throws(()=>runShadow({base:base(),asOf:'2026-10-16',now:new Date('2026-10-20T13:00:00Z'),writeLocal:true}),/HISTORICAL_WRITE_FORBIDDEN/);
});
test('weighted contributions preserve rounded raw score',()=>{
 const r=run().evaluation.scoreSummary.latest;
 const sum=Object.values(r.contributions).reduce((a,b)=>a+b,0);
 assert.ok(Math.abs(sum-r.rawScore)<1e-6);
});
