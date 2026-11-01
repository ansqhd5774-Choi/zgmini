import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {buildR57R43Shadow,R57_REVIEWED_UNIVERSE} from '../scripts/pc-writer/market-calendar-r57-r45-offline-r43.mjs';

const now=Date.parse('2026-10-22T10:00:00Z');
const symbols=Array.from({length:2634},(_,i)=>i===0?'GOOG':i===1?'GOOGL':'T'+i);
const date=i=>new Date(Date.UTC(2026,9,1+i)).toISOString().slice(0,10);
const hash=x=>createHash('sha256').update(x).digest('hex');
const dir=()=>fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r57-'));
const rows=day=>[...symbols,'BABA'].map((ticker,i)=>({
 ticker,close:100+i/100+day*.02,volume:10000+i+day*5,
}));
function writeDay(base,index,data=rows(index)){
 const day=date(index),out=path.join(base,'market-calendar-r45-marketparquet');
 fs.mkdirSync(out,{recursive:true});
 const obj={version:1,method:'MARKET_CALENDAR_R45_FULL_STOCK_REUSE_R1',
  scope:'PC_PRIVATE_ONLY',sourceContract:'ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5',
  source:'MARKETPARQUET_FREE_SAMPLE',priceAdjustment:'SPLIT_ADJUSTED',providerCallsAdded:0,
  publicFeed:false,redistribution:false,observationDate:day,
  tickerCount:data.length,rowsSha256:hash(JSON.stringify(data)),rows:data};
 fs.writeFileSync(path.join(out,`stock_daily_${day}.json`),JSON.stringify(obj));
 return day;
}
function writeMembership(base,overrides={}){
 const members=[...symbols.map(ticker=>({ticker,eligible:true})),
  {ticker:'BABA',eligible:false}];
 const doc={version:1,method:'R57_REVIEWED_ISSUER_MEMBERSHIP_R1',
  universeReviewed:true,reviewedAsOf:'2026-10-20',
  marketCapApiUsed:false,permissionForDerivedScores:true,
  expectedEligibleIssuers:2634,members,...overrides};
 fs.writeFileSync(path.join(base,R57_REVIEWED_UNIVERSE),JSON.stringify(doc));
}
function twentyOne(base){for(let i=0;i<21;i++)writeDay(base,i);}
const clean=base=>fs.rmSync(base,{recursive:true,force:true});

test('R57 reads only PC R45 history and blocks without a 20-session baseline',()=>{
 const base=dir();
 try{
  assert.equal(buildR57R43Shadow({base,now}).reason,'R57_R45_SNAPSHOTS_NOT_PRESENT');
  writeDay(base,19);writeDay(base,20);writeMembership(base);
  const r=buildR57R43Shadow({base,now});
  assert.equal(r.reason,'R57_R45_20_PRIOR_SESSIONS_MISSING');
  assert.equal(r.historyDays,2);
  assert.equal(r.providerCalls,0);
  assert.equal(r.dbWrites,0);
  assert.equal(r.filesystemWrites,0);
  assert.equal(fs.existsSync(path.join(base,'local-market-calendar-r43-ranked.json')),false);
 }finally{clean(base);}
});
test('R57 combines reviewed share classes and excludes China company without publishing grades',()=>{
 const base=dir();
 try{
  twentyOne(base);writeMembership(base);
  const r=buildR57R43Shadow({base,now});
  assert.equal(r.status,'READY_SHADOW');
  assert.equal(r.asOf,'2026-10-21');
  assert.equal(r.historyDays,21);
  assert.equal(r.topCount,132);
  assert.equal(r.eligibleIssuers,2633);
  assert.equal(r.coverage.relativeVolume,1);
  assert.equal(r.rankings.filter(x=>x.importance===3).length,132);
  assert.equal(r.rankings.some(x=>x.tickers.includes('BABA')),false);
  const alphabet=r.rankings.find(x=>x.issuerId==='ALPHABET');
  assert.deepEqual(alphabet.tickers,['GOOG','GOOGL']);
  assert.equal(r.filesystemWrites,0);
  assert.equal(fs.existsSync(path.join(base,'local-market-calendar-r43-ranked.json')),false);
  assert.equal(fs.existsSync(path.join(base,'local-market-calendar-r43-input.json')),false);
 }finally{clean(base);}
});
test('R57 blocks a corrupt full-stock file instead of calculating a fabricated grade',()=>{
 const base=dir();
 try{
  twentyOne(base);writeMembership(base);
  const file=path.join(base,'market-calendar-r45-marketparquet',`stock_daily_${date(10)}.json`);
  const obj=JSON.parse(fs.readFileSync(file,'utf8'));
  obj.rows[0].volume=123456789;fs.writeFileSync(file,JSON.stringify(obj));
  const r=buildR57R43Shadow({base,now});
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.reason,'R57_R45_SNAPSHOT_INTEGRITY_INVALID');
  assert.equal(r.topCount,0);
 }finally{clean(base);}
});
test('R57 rejects unchecked membership and missing historical volume coverage',()=>{
 const base=dir();
 try{
  twentyOne(base);
  writeMembership(base,{permissionForDerivedScores:false});
  assert.equal(buildR57R43Shadow({base,now}).reason,'R57_ISSUER_MEMBERSHIP_NOT_APPROVED');
  writeMembership(base);
  writeDay(base,10,rows(10).filter((_,i)=>i>=320));
  const r=buildR57R43Shadow({base,now});
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.reason,'R43_RELATIVE_VOLUME_COVERAGE_INSUFFICIENT');
  assert.equal(r.topCount,0);
  assert.equal(r.filesystemWrites,0);
 }finally{clean(base);}
});
test('R57 rejects stale reviewed membership and mismatched R45 source metadata',()=>{
 const base=dir();
 try{
  twentyOne(base);
  writeMembership(base,{reviewedAsOf:'2026-06-01'});
  assert.equal(buildR57R43Shadow({base,now}).reason,'R57_ISSUER_MEMBERSHIP_NOT_APPROVED');
  writeMembership(base);
  const filename=path.join(base,'market-calendar-r45-marketparquet',`stock_daily_${date(13)}.json`);
  const payload=JSON.parse(fs.readFileSync(filename,'utf8'));
  payload.priceAdjustment='UNADJUSTED';
  fs.writeFileSync(filename,JSON.stringify(payload));
  assert.equal(buildR57R43Shadow({base,now}).reason,'R57_R45_SNAPSHOT_INTEGRITY_INVALID');
  assert.equal(fs.existsSync(path.join(base,'local-market-calendar-r43-ranked.json')),false);
 }finally{clean(base);}
});
