import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {isMarketSession} from '../lib/market-score/breadth-b1-r3-calendar.mjs';
import {replayStoredR10BMonthly}
 from '../scripts/pc-writer/asset-r10-b-monthly-replay-r1.mjs';
import {runR10BStoredPcReadonly,reportR10BStoredPcArgs,
 storedR10BLockedFiveQuarters} from '../scripts/pc-writer/asset-r10-b-stored-runner-r1.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const monthEnds=['2025-10-31','2025-11-28','2025-12-31'];
function baseline(){
 const quality={rows:monthEnds.map(observationDate=>({
  observationDate,coverage:0.99,participation:0.7}))};
 const breadth={formulaApproved:true,rows:monthEnds.map((observationDate,i)=>({
  observationDate,rankObservations:252,researchSafetyScore:50+10*i}))};
 const indicators=[
  'valuationPressure','priceAcceleration','riskAssetShare',
  'speculativeFlows','breadthDivergence','excessLiquidity',
 ].map(id=>({id,status:'READY',score:id==='breadthDivergence'?60:50}));
 const release={status:'READY',methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',
  scoreObservationQuarter:'2025-Q4',indicators};
 return {quality,breadth,release};
}
const expected=[
 {quarter:'2024-Q4',breadthDivergence:null},
 {quarter:'2025-Q1',breadthDivergence:null},
 {quarter:'2025-Q2',breadthDivergence:null},
 {quarter:'2025-Q3',breadthDivergence:null},
 {quarter:'2025-Q4',breadthDivergence:60},
];
test('locked B baseline is the original five quarters, never a fabricated earlier score',()=>{
 assert.deepEqual(storedR10BLockedFiveQuarters(baseline()),expected);
});
test('2026-Q2 confirmed baseline preserves 2025-Q2 and Q3 normal nulls',()=>{
 const x=baseline();
 const more=['2026-01-30','2026-02-27','2026-03-31',
  '2026-04-30','2026-05-29','2026-06-30'];
 for(const [i,observationDate]of more.entries()){
  x.quality.rows.push({observationDate,coverage:.99,participation:.6});
  x.breadth.rows.push({observationDate,rankObservations:400,
   researchSafetyScore:i<3?65:70});
 }
 x.release.scoreObservationQuarter='2026-Q2';
 x.release.indicators[4].score=70;
 assert.deepEqual(storedR10BLockedFiveQuarters(x),[
  {quarter:'2025-Q2',breadthDivergence:null},
  {quarter:'2025-Q3',breadthDivergence:null},
  {quarter:'2025-Q4',breadthDivergence:60},
  {quarter:'2026-Q1',breadthDivergence:65},
  {quarter:'2026-Q2',breadthDivergence:70},
 ]);
 const early=['2025-07-31','2025-08-29','2025-09-30'];
 x.quality.rows.unshift(...early.map(observationDate=>({
  observationDate,coverage:.99,participation:.6})));
 x.breadth.rows.unshift(...early.map(observationDate=>({
  observationDate,rankObservations:252,researchSafetyScore:75})));
 assert.equal(storedR10BLockedFiveQuarters(x),null);
});
test('approved stored B current-quarter mismatch cannot authorize a candidate',()=>{
 const x=baseline();
 x.release.indicators[4].score=61;
 assert.equal(storedR10BLockedFiveQuarters(x),null);
});
test('missing true market month end cannot be counted as a completed approved B quarter',()=>{
 const x=baseline();
 x.breadth.rows[1].observationDate='2025-11-26';
 assert.equal(storedR10BLockedFiveQuarters(x),null);
});
test('out-of-order or invalid historical rows stop before comparison',()=>{
 const x=baseline();
 x.quality.rows.reverse();
 assert.equal(storedR10BLockedFiveQuarters(x),null);
});
test('PC runner requires explicit root/date, never guesses operating data folder',()=>{
 for(const args of [[],['--base','x'],['--base','x','--base','y'],
   ['--base','x','--as-of','2026-02-30']]){
  const r=reportR10BStoredPcArgs(args);
  assert.match(r.status,/^STOP_/);assert.equal(r.canPromote,false);
 }
});
test('invalid or absent PC source cannot create directories, keys or a release',()=>{
 const dir=path.join(os.tmpdir(),'nonexistent-r10-b-runner-'+process.pid);
 const r=runR10BStoredPcReadonly({base:dir,asOfDate:'2026-11-02'});
 assert.equal(r.status,'STOP_PC_STORED_INPUTS_UNAVAILABLE_OR_BUDGET');
 assert.equal(fs.existsSync(dir),false);assert.equal(r.d1Writes,0);
});
test('symlink PC data root is rejected before loading any data',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r10-runner-link-'));
 try{
  fs.symlinkSync(dir,path.join(dir,'link'));
  const r=runR10BStoredPcReadonly({base:path.join(dir,'link'),asOfDate:'2026-11-02'});
  assert.equal(r.status,'STOP_PC_DATA_ROOT_UNSAFE');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('actual SQLite read-only snapshot and approved B parity lead only to R7 PIT gate',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r10-runner-pc-'));
 const put=(name,value)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(value));
 try{
  const {quality,breadth,release}=baseline();
  put('local-asset-bubble-r10-alpaca-pit-validation.json',quality);
  put('local-asset-bubble-r10-breadth-research.json',breadth);
  put('local-asset-bubble-r10-release-payload.json',release);
  put('local-asset-bubble-r10-pit-compatible-universe.json',{
   verifiedThrough:'2025-12-31',eligibleUniverses:[]});
  put('local-breadth-r7-pit-universe.json',{
   last:'2026-01-02',currentDate:'2026-01-02',universes:[]});
  put('local-breadth-r7-prospective-last-run.json',{
   status:'PASS',pitRefreshed:false,at:'2026-01-03T12:00:00Z'});
  fs.mkdirSync(path.join(dir,'asset-r10-alpaca','incremental'),{recursive:true});
  put('asset-r10-alpaca/group-1.json',[]);
  fs.mkdirSync(path.join(dir,'storage'));
  const dbPath=path.join(dir,'storage','core.sqlite');
  const db=new DatabaseSync(dbPath);
  db.exec('CREATE TABLE market_input_batches_v1(batch_key TEXT,body TEXT,stored_at INTEGER)');
  db.exec('CREATE TABLE market_score_breadth_b1_r3_universe_v1(trade_date TEXT)');
  db.prepare('INSERT INTO market_input_batches_v1 VALUES(?,?,?)').run(
   'shadowSp500Benchmark:2026-01-02',JSON.stringify({series:{SP500:[
    {observationDate:'2025-12-31',value:6000}]}}),Date.parse('2026-01-02T01:00:00Z'));
  db.prepare('INSERT INTO market_score_breadth_b1_r3_universe_v1 VALUES(?)')
   .run('2026-01-02');
  db.close();
  const before=sha(fs.readFileSync(dbPath));
  const r=runR10BStoredPcReadonly({base:dir,asOfDate:'2026-01-04'});
  assert.equal(r.status,'STOP_PC_B_QUALITY_OR_BASELINE_GATE');
  assert.equal(r.firstFail,'STOP_R7_PIT_501_SESSION_INTEGRITY_UNVERIFIED');
  assert.equal(sha(fs.readFileSync(dbPath)),before);
  assert.equal(r.sqliteWrites,0);assert.equal(r.d1Writes,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('complete saved PIT, price groups, SP500 SQLite and approved B history produce only a research candidate',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r10-runner-synthetic-'));
 try{
  const marketDates=(start,end)=>{
   const result=[];
   for(let t=Date.parse(start+'T00:00:00Z');t<=Date.parse(end+'T00:00:00Z');t+=86400000){
    const d=new Date(t).toISOString().slice(0,10);
    if(d!=='2025-01-09'&&isMarketSession(d))result.push(d);
   }
   return result;
  };
  const dates=marketDates('2024-01-01','2026-09-30').slice(-520);
  const oldThrough='2026-06-30',firstNew=dates.findIndex(d=>d>oldThrough);
  assert.ok(firstNew>199);
  const names=Array.from({length:488},(_,i)=>'T'+String(i).padStart(4,'0'));
  const priced=[...names,'HON'],approvedMembers=[...priced,'PSKY'],
   officialMembers=[...priced,'SKYD'];
  const memberHash=sha(Buffer.from(JSON.stringify([...officialMembers].sort())));
  const officialPit={status:'READY',membershipLookAheadSafe:true,
   currentUniverseSurvivorshipBiasRemoved:true,publicMutation:false,
   eventDigest:'a'.repeat(64),targetSessions:520,
   first:dates[0],last:dates.at(-1),currentDate:dates.at(-1),
   currentMemberHash:memberHash,
   universes:dates.map(tradeDate=>({tradeDate,members:officialMembers,memberCount:490}))};
  const approvedPit={verifiedThrough:oldThrough,eligibleUniverses:[
   {tradeDate:oldThrough,members:approvedMembers,memberCount:490}]};
  const base=[],incremental=[];
  for(let i=firstNew-199;i<dates.length;i++)for(let j=0;j<priced.length;j++){
   const row={ticker:priced[j],tradeDate:dates[i],currentClose:100+i*.02+j*.001};
   (dates[i]>oldThrough?incremental:base).push(dates[i]>oldThrough?{
    ...row,source:'ALPACA',feed:'iex',adjustmentStatus:'split',
    asof:'-',symbolMappingMode:'UNMAPPED_ASOF_DASH'}:row);
  }
  const qualityRows=marketDates('2024-09-03',oldThrough).map(observationDate=>({
   observationDate,members:490,valid200:488,above200:488,
   coverage:488/490,participation:1}));
  const sp500Rows=marketDates('2023-08-01','2026-09-30').map((observationDate,i)=>({
   observationDate,value:3000+i*.68+30*Math.sin(i/23)}));
  const oldReplay=replayStoredR10BMonthly({qualityRows,sp500Rows,asOfDate:'2026-10-02'});
  assert.equal(oldReplay.status,'RESEARCH_B_REPLAY_NO_APPROVED_BASELINE');
  const breadth={formulaApproved:true,rows:oldReplay.months.filter(x=>x.status==='READY')
   .map(x=>({observationDate:x.lastObservedSession,rankObservations:x.rankObservations,
    researchSafetyScore:x.researchSafetyScore}))};
  const oldB=oldReplay.quarters.find(x=>x.quarter==='2026-Q2')?.breadthDivergence;
  assert.ok(Number.isFinite(oldB));
  const release={status:'READY',methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',
   scoreObservationQuarter:'2026-Q2',indicators:[
    'valuationPressure','priceAcceleration','riskAssetShare',
    'speculativeFlows','breadthDivergence','excessLiquidity',
   ].map(id=>({id,status:'READY',score:id==='breadthDivergence'?oldB:50}))};
  const put=(name,value)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(value));
  put('local-asset-bubble-r10-pit-compatible-universe.json',approvedPit);
  put('local-breadth-r7-pit-universe.json',officialPit);
  put('local-asset-bubble-r10-alpaca-pit-validation.json',{rows:qualityRows});
  put('local-asset-bubble-r10-breadth-research.json',breadth);
  put('local-asset-bubble-r10-release-payload.json',release);
  put('local-breadth-r7-prospective-last-run.json',{
   status:'PASS',pitRefreshed:false,at:'2026-10-02T04:00:00Z'});
  fs.mkdirSync(path.join(dir,'asset-r10-alpaca','incremental'),{recursive:true});
  put('asset-r10-alpaca/group-1.json',base);
  put('asset-r10-alpaca/incremental/2026-07-01-2026-09-30-group-1.json',incremental);
  fs.mkdirSync(path.join(dir,'storage'));
  const dbPath=path.join(dir,'storage','core.sqlite');
  const db=new DatabaseSync(dbPath);
  db.exec('CREATE TABLE market_input_batches_v1(batch_key TEXT,body TEXT,stored_at INTEGER)');
  db.exec('CREATE TABLE market_score_breadth_b1_r3_universe_v1(trade_date TEXT)');
  db.prepare('INSERT INTO market_input_batches_v1 VALUES(?,?,?)').run(
   'shadowSp500Benchmark:2026-09-30',JSON.stringify({series:{SP500:sp500Rows}}),
   Date.parse('2026-10-01T02:00:00Z'));
  db.prepare('INSERT INTO market_score_breadth_b1_r3_universe_v1 VALUES(?)')
   .run('2026-09-30');db.close();
  const before=sha(fs.readFileSync(dbPath));
  const r=runR10BStoredPcReadonly({base:dir,asOfDate:'2026-10-02'});
  assert.equal(r.status,'RESEARCH_PC_STORED_B_REPLAY_NOT_AUTOPROMOTABLE');
  assert.ok(r.newDailyRows>60);
  assert.equal(r.lastApprovedQuarter,'2026-Q2');
  assert.equal(r.preflightStatus,'CANDIDATE_WITH_ONE_UNRESOLVED_SECURITY_RESEARCH_ONLY');
  assert.equal(r.unresolvedIdentityCount,1);
  assert.ok(r.newQuarterStatuses.some(q=>q.quarter==='2026-Q3'&&q.status==='READY'));
  assert.equal(sha(fs.readFileSync(dbPath)),before);
  assert.equal(r.canPromote,false);assert.equal(r.d1Writes,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
