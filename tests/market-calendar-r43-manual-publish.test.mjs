import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {publishR43MarketImportanceOnce,prepareR43ManualSnapshot,
 verifyR43ReaderDeployed} from '../tools/market-calendar-r43/R43_PC_MANUAL_PUBLISH.mjs';
import {r43MarketImportanceDisplayIndex,
 R43_MARKET_IMPORTANCE_PUBLIC_KEY} from '../lib/market-calendar-r43-display-overlay.mjs';

const asOf=new Date().toISOString().slice(0,10),sourceSha='a'.repeat(40);
const tickers=['BRK.A','ARM','ANET','SHOP','DE'];
const sha=x=>createHash('sha256').update(x).digest('hex');
const source=()=>({version:1,asOf,provenance:'APPROVED_PC_STORED_DATA',
 marketCapApiUsed:false,permissionForDerivedScores:true,
 rightsReviewReference:'TEST_ONLY_APPROVED_DERIVED_RIGHTS_20261102',
 rows:Array.from({length:2634},(_,i)=>({
  ticker:i<5?tickers[i]:'Z'+i,eligible:true,tradeDate:asOf,
  price:100+i,volume:100+i,relativeVolume:1+i/100,
  eps:1+i/100,dividendYield:i/10000,epsGrowthPct:i%30,dailyChangePct:i%5,
 }))});
function dynamicSource(count=2580){
 const input=source();
 const days=[];
 for(let day=Date.parse(asOf+'T00:00:00Z');days.length<21;day-=86400000){
  const weekday=new Date(day).getUTCDay();
  if(weekday!==0&&weekday!==6)days.push(new Date(day).toISOString().slice(0,10));
 }
 input.asOf=days[0];
 input.rows=Array.from({length:count},(_,i)=>({
  ...input.rows[i],tradeDate:days[0],issuerId:i<5?tickers[i]:'Z'+i,
 }));
 const roster={version:1,method:'R57_REVIEWED_ISSUER_MEMBERSHIP_R1',
  universeReviewed:true,reviewedAsOf:days[0],marketCapApiUsed:false,
  permissionForDerivedScores:true,rightsReviewReference:input.rightsReviewReference,
  marketSessionsReviewed:true,reviewedTradingSessions:days,
  expectedEligibleIssuers:count,fundamentalsVerified:true,
  members:input.rows.map(row=>({ticker:row.ticker,issuerId:row.issuerId,eligible:true,
   dividendYield:row.dividendYield,eps:row.eps,epsGrowthPct:row.epsGrowthPct})),
 };
 input.expectedEligibleIssuers=count;
 input.approvedUniverseSha256=sha(JSON.stringify(roster));
 return {input,roster};
}
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r43-test-'));
 const pcHome=path.join(root,'pc'),repoRoot=path.join(root,'repo');
 fs.mkdirSync(path.join(repoRoot,'scripts','pc-writer'),{recursive:true});
 fs.mkdirSync(pcHome);
 fs.writeFileSync(path.join(repoRoot,'scripts','pc-writer','d1.mjs'),'// placeholder test only');
 fs.writeFileSync(path.join(pcHome,'config.json'),JSON.stringify({
  collectionTarget:'pc',enabled:true,core:'core',source:sourceSha}));
 fs.writeFileSync(path.join(pcHome,'local-market-calendar-r43-input.json'),JSON.stringify(source()));
 return {root,pcHome,repoRoot,cleanup(){fs.rmSync(root,{recursive:true,force:true})}};
}
function fakeRemote(){
 let stored=null,writes=0,reads=0;
 return {get stored(){return stored},get writes(){return writes},get reads(){return reads},
  async query(db,sql,params){
   assert.equal(db,'core');
   assert.deepEqual(params,[R43_MARKET_IMPORTANCE_PUBLIC_KEY]);
   assert.match(sql,/public_feed_snapshots_v1/);
   reads++;
   return {results:stored?[stored]:[]};
  },
  async request(db,items){
   assert.equal(db,'core');assert.equal(items.length,1);
   assert.deepEqual(items[0].params.slice(0,1),[R43_MARKET_IMPORTANCE_PUBLIC_KEY]);
   stored={body:items[0].params[1],stored_at:items[0].params[2]};
   writes++;
   return [{success:true}];
  }};
}
const options=(f,remote,overrides={})=>({...f,readerGate:async()=>true,
 headResolver:()=>sourceSha,remoteFactory:async()=>remote,...overrides});

test('manual publisher writes ONLY one compact R43 D1 output with readback and is idempotent',async()=>{
 const f=fixture(),r=fakeRemote();
 try{
  const first=await publishR43MarketImportanceOnce(options(f,r));
  assert.equal(first.status,'R43_D1_PUBLISHED_AND_READBACK');
  assert.equal(first.dbWrites,1);assert.equal(first.providerCalls,0);
  assert.equal(first.selected,132);assert.equal(r.writes,1);assert.equal(r.reads,2);
  const published=JSON.parse(r.stored.body);
  assert.ok(r43MarketImportanceDisplayIndex(published));
  assert.equal(published.selected.length,132);
  assert.doesNotMatch(r.stored.body,/"price"|"volume"|"eps"|marketCapApiUsed/);
  const selected=new Set(published.selected.flatMap(row=>row.tickers));
  for(const ticker of tickers)assert.ok(selected.has(ticker),ticker);
  const second=await publishR43MarketImportanceOnce(options(f,r));
  assert.equal(second.status,'R43_ALREADY_PUBLISHED');
  assert.equal(second.dbWrites,0);assert.equal(r.writes,1);
  assert.equal(fs.existsSync(path.join(f.pcHome,'market-calendar-r43.manual.lock')),false);
 }finally{f.cleanup()}
});

test('missing rights reference blocks source before reader/D1 activity',async()=>{
 const f=fixture(),r=fakeRemote();let readerCalls=0;
 try{
  const input=source();delete input.rightsReviewReference;
  fs.writeFileSync(path.join(f.pcHome,'local-market-calendar-r43-input.json'),JSON.stringify(input));
  await assert.rejects(publishR43MarketImportanceOnce(options(f,r,{
   readerGate:async()=>{readerCalls++;return true},
  })),/R43_MANUAL_SOURCE_RIGHTS_UNVERIFIED_STOP/);
  assert.equal(readerCalls,0);assert.equal(r.writes,0);assert.equal(r.reads,0);
 }finally{f.cleanup()}
});

test('PC source SHA mismatch protects Core configuration and blocks remote',async()=>{
 const f=fixture(),r=fakeRemote();
 try{
  await assert.rejects(publishR43MarketImportanceOnce(options(f,r,{
   headResolver:()=> 'b'.repeat(40),
  })),/R43_MANUAL_PC_SOURCE_DRIFT_STOP/);
  assert.equal(r.writes,0);assert.equal(r.reads,0);
 }finally{f.cleanup()}
});

test('blocked public reader cannot publish and the FHS key is untouched',async()=>{
 const f=fixture(),r=fakeRemote();
 try{
  await assert.rejects(publishR43MarketImportanceOnce(options(f,r,{
   readerGate:async()=>{throw Error('R43_PUBLIC_READER_NOT_DEPLOYED_STOP')},
  })),/R43_PUBLIC_READER_NOT_DEPLOYED_STOP/);
  assert.equal(r.writes,0);assert.equal(r.reads,0);
  await assert.rejects(publishR43MarketImportanceOnce(options(f,r,{
   readerGate:async()=>false,
  })),/R43_PUBLIC_READER_NOT_DEPLOYED_STOP/);
  assert.equal(r.writes,0);
  await assert.rejects(verifyR43ReaderDeployed({fetchImpl:async()=>({ok:true,
   status:200,headers:new Headers()})}),/R43_PUBLIC_READER_NOT_DEPLOYED_STOP/);
 }finally{f.cleanup()}
});

test('source must cover the approved full universe, not just the 500 benchmark',()=>{
 const input=source();input.rows=input.rows.slice(0,500);
 assert.throws(()=>prepareR43ManualSnapshot(input),/R43_MANUAL_UNIVERSE_OR_DATE_STOP/);
});

test('dynamic eligible denominator requires a separately reviewed exact roster and SHA attestation',()=>{
 const {input,roster}=dynamicSource(2580);
 assert.equal(prepareR43ManualSnapshot(input,{approvedUniverse:roster}).topCount,129);
 assert.throws(()=>prepareR43ManualSnapshot(input),
  /R43_MANUAL_APPROVED_UNIVERSE_ATTESTATION_STOP/);
 assert.throws(()=>prepareR43ManualSnapshot({...input,expectedEligibleIssuers:2634},{approvedUniverse:roster}),
  /R43_MANUAL_APPROVED_UNIVERSE_CONTRACT_STOP/);
 const altered={...input,rows:input.rows.map((row,i)=>i===10?{...row,eligible:false}:row)};
 assert.throws(()=>prepareR43ManualSnapshot(altered,{approvedUniverse:roster}),
  /R43_MANUAL_APPROVED_UNIVERSE_ROWS_STOP/);
 const alteredRoster={...roster,members:roster.members.slice(1)};
 assert.throws(()=>prepareR43ManualSnapshot(input,{approvedUniverse:alteredRoster}),
  /R43_MANUAL_APPROVED_UNIVERSE_ATTESTATION_STOP/);
});

test('reviewed 21-session roster rejects duplicates, reversed order and weekends',()=>{
 const {input,roster}=dynamicSource(2580);
 const tampered=[
  [roster.reviewedTradingSessions[0],...roster.reviewedTradingSessions.slice(0,20)],
  [...roster.reviewedTradingSessions].reverse(),
  [roster.reviewedTradingSessions[0],...Array(20).fill('2026-11-01')],
 ];
 for(const reviewedTradingSessions of tampered){
  const changed={...roster,reviewedTradingSessions};
  const changedInput={...input,approvedUniverseSha256:sha(JSON.stringify(changed))};
  assert.throws(()=>prepareR43ManualSnapshot(changedInput,{approvedUniverse:changed}),
   /R43_MANUAL_APPROVED_UNIVERSE_CONTRACT_STOP/);
 }
});

test('manual publisher reads dynamic roster from approved PC path before D1 calls',async()=>{
 const f=fixture(),r=fakeRemote();
 try{
  const {input,roster}=dynamicSource(2580);
  const inputFile=path.join(f.pcHome,'local-market-calendar-r43-input.json');
  const rosterFile=path.join(f.pcHome,'local-market-calendar-r43-reviewed-issuers.json');
  fs.writeFileSync(inputFile,JSON.stringify(input));
  await assert.rejects(publishR43MarketImportanceOnce(options(f,r)),
   /R43_MANUAL_APPROVED_UNIVERSE_FILE_STOP/);
  assert.equal(r.writes,0);assert.equal(r.reads,0);
  fs.writeFileSync(rosterFile,JSON.stringify(roster));
  const published=await publishR43MarketImportanceOnce(options(f,r));
  assert.equal(published.status,'R43_D1_PUBLISHED_AND_READBACK');
  assert.equal(published.issuerCount,2580);
  assert.equal(published.selected,129);
  assert.equal(r.writes,1);
 }finally{f.cleanup()}
});
