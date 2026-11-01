import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {buildR57R43Shadow,R57_REVIEWED_UNIVERSE} from '../scripts/pc-writer/market-calendar-r57-r45-offline-r43.mjs';
import {R58_REFERENCE_FILE,R58_REFERENCE_METHOD} from '../scripts/pc-writer/market-calendar-r58-r43-shadow-audit.mjs';
import {runR59ReadOnly,R59_METHOD} from '../scripts/pc-writer/market-calendar-r59-r43-readonly-report.mjs';

const now=Date.parse('2026-10-22T10:00:00Z');
const baseDir=()=>fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r59-'));
const date=i=>new Date(Date.UTC(2026,9,1+i)).toISOString().slice(0,10);
const sha=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');

function setupR45(base){
 const tickers=Array.from({length:2634},(_,i)=>'T'+i);
 const dir=path.join(base,'market-calendar-r45-marketparquet');
 fs.mkdirSync(dir);
 for(let i=0;i<21;i++){
  const day=date(i);
  const rows=tickers.map((ticker,n)=>({ticker,close:20+n/40+i/10,volume:100000+n+i}));
  const daily={version:1,method:'MARKET_CALENDAR_R45_FULL_STOCK_REUSE_R1',
   scope:'PC_PRIVATE_ONLY',source:'MARKETPARQUET_FREE_SAMPLE',
   sourceContract:'ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5',
   observationDate:day,priceAdjustment:'SPLIT_ADJUSTED',
   publicFeed:false,redistribution:false,providerCallsAdded:0,
   tickerCount:rows.length,rowsSha256:sha(rows),rows};
  fs.writeFileSync(path.join(dir,`stock_daily_${day}.json`),JSON.stringify(daily));
 }
 const membership={version:1,method:'R57_REVIEWED_ISSUER_MEMBERSHIP_R1',
  universeReviewed:true,reviewedAsOf:'2026-10-20',
  marketCapApiUsed:false,permissionForDerivedScores:true,
  expectedEligibleIssuers:2634,
  members:tickers.map(ticker=>({ticker,eligible:true}))};
 fs.writeFileSync(path.join(base,R57_REVIEWED_UNIVERSE),JSON.stringify(membership));
}

test('R59 reports missing private inputs without creating an E drive artifact or collector job',()=>{
 const base=baseDir();
 try{
  const before=fs.readdirSync(base);
  const report=runR59ReadOnly({base,now});
  assert.equal(report.method,R59_METHOD);
  assert.equal(report.status,'WAITING_INPUTS');
  assert.equal(report.r57.reason,'R57_R45_SNAPSHOTS_NOT_PRESENT');
  assert.equal(report.r58.reason,'R58_R57_SHADOW_NOT_READY');
  assert.equal(report.filesystemWrites,0);
  assert.equal(report.providerCalls,0);
  assert.equal(report.published,false);
  assert.deepEqual(fs.readdirSync(base),before);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('R59 one-shot joins 21 stored days and a reviewed 132/100 reference without publishing',()=>{
 const base=baseDir();
 try{
  setupR45(base);
  const before=fs.readdirSync(base).sort();
  const waiting=runR59ReadOnly({base,now});
  assert.equal(waiting.r57.status,'READY_SHADOW');
  assert.equal(waiting.r57.topCount,132);
  assert.equal(waiting.r57.rankings,undefined);
  assert.equal(waiting.r58.reason,'R58_USER_REFERENCE_MISSING');
  assert.deepEqual(fs.readdirSync(base).sort(),before);

  const shadow=buildR57R43Shadow({base,now});
  const top132=shadow.rankings.slice(0,132).map(row=>row.tickers[0]);
  const reference={version:1,method:R58_REFERENCE_METHOD,
   userProvided:true,eligibilityReviewed:true,permissionForLocalComparison:true,
   referenceDate:'2026-10-21',top132,top100:top132.slice(0,100)};
  fs.writeFileSync(path.join(base,R58_REFERENCE_FILE),JSON.stringify(reference));
  const ready=runR59ReadOnly({base,now});
  assert.equal(ready.status,'READY_AUDIT');
  assert.equal(ready.r58.matches,132);
  assert.equal(ready.r58.top100InModelTop132,100);
  assert.equal(ready.filesystemWrites,0);
  assert.equal(ready.published,false);
  assert.equal(fs.existsSync(path.join(base,'local-market-calendar-r43-ranked.json')),false);
  assert.equal(fs.existsSync(path.join(base,'local-market-calendar-r43-input.json')),false);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('R59 Windows launcher is ASCII CRLF and does not call or modify Core',()=>{
 const data=fs.readFileSync(new URL('../MARKET_CALENDAR_R59_R43_READONLY.cmd',import.meta.url));
 const text=data.toString('ascii');
 assert.equal(data[0],64); // @echo off; no BOM
 assert.ok([...data].every(byte=>byte<128));
 assert.ok(text.includes('\r\n'));
 assert.ok(!/(?<!\r)\n/.test(text));
 assert.match(text,/E:\\ZGmini\\runtime\\node\.exe/);
 assert.match(text,/E:\\ZGmini\\data\\pc-writer/);
 assert.match(text,/R59_PACKAGE_LOCATION_NOT_ALLOWED/);
 assert.match(text,/MARKET_CALENDAR_R59_READONLY_RESULT\.txt/);
 assert.doesNotMatch(text,/(?:\bschtasks\b|\bstart\s|\bcurl\b|\bdel\s|\brmdir\b|\bren\s)/i);
});
