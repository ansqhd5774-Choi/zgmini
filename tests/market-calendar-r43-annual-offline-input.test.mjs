import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareR43AnnualOfflineInput,
 readStoredR45ToR43Annual} from '../tools/market-calendar-r43/R43_ANNUAL_OFFLINE_INPUT.mjs';
import {readManualParquetToR43Annual} from '../tools/market-calendar-r43/R43_ANNUAL_PARQUET_OPTIONAL.mjs';
import {prepareR43ManualSnapshot} from '../tools/market-calendar-r43/R43_PC_MANUAL_PUBLISH.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const today=new Date().toISOString().slice(0,10);
const dates=[];
for(let t=Date.parse(today+'T00:00:00Z');dates.length<21;t-=86400000){
 const d=new Date(t),weekday=d.getUTCDay();
 if(weekday!==0&&weekday!==6)dates.push(d.toISOString().slice(0,10));
}
const symbols=['BRK.A','ARM','ANET','SHOP','DE',...Array.from({length:2629},(_,i)=>'T'+i)];
const rightsReviewReference='TEST_ONLY_MANUAL_REVIEW_RIGHTS_20261102';
const universe=()=>({version:1,method:'R57_REVIEWED_ISSUER_MEMBERSHIP_R1',
 universeReviewed:true,reviewedAsOf:dates[0],marketCapApiUsed:false,
 permissionForDerivedScores:true,rightsReviewReference,
 marketSessionsReviewed:true,reviewedTradingSessions:dates,
 expectedEligibleIssuers:2634,fundamentalsVerified:false,
 members:symbols.map(ticker=>({ticker,issuerId:ticker,eligible:true}))});
const prices=(date,i)=>symbols.map((ticker,j)=>({ticker,close:20+j+i/20,volume:1000+j+i*5}));
function daily(date,i){
 const rows=prices(date,i).sort((a,b)=>a.ticker.localeCompare(b.ticker));
 return {version:1,method:'MARKET_CALENDAR_R45_FULL_STOCK_REUSE_R1',
  scope:'PC_PRIVATE_ONLY',source:'MARKETPARQUET_FREE_SAMPLE',
  sourceContract:'ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5',
  observationDate:date,priceAdjustment:'SPLIT_ADJUSTED',
  publicFeed:false,redistribution:false,providerCallsAdded:0,
  tickerCount:rows.length,rowsSha256:sha(JSON.stringify(rows)),rows};
}
const snapshots=()=>dates.map(daily);
function temporary(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r43-annual-'));
 return {root,cleanup(){fs.rmSync(root,{recursive:true,force:true})}}}

test('annual offline transformation yields complete private input with real 20-session relative volume',()=>{
 const input=prepareR43AnnualOfflineInput({snapshots:snapshots(),universe:universe()});
 assert.equal(input.provenance,'APPROVED_PC_STORED_DATA');
 assert.equal(input.marketCapApiUsed,false);
 assert.equal(input.rows.length,2634);
 assert.equal(input.expectedEligibleIssuers,2634);
 assert.equal(input.approvedUniverseSha256,sha(JSON.stringify(universe())));
 assert.equal(input.rows[0].ticker,'BRK.A');
 assert.equal(input.rows[0].volume,1000);
 assert.ok(input.rows[0].relativeVolume>0&&input.rows[0].relativeVolume<1);
 assert.equal(input.rows[0].dailyChangePct,(20/(20+1/20)-1)*100);
 assert.equal(input.rows[0].eps,null);
 assert.equal(input.publicFeed,false);
 const compact=prepareR43ManualSnapshot(input,{approvedUniverse:universe()});
 assert.equal(compact.topCount,132);
 const selected=new Set(compact.selected.flatMap(row=>row.tickers));
 for(const ticker of ['BRK.A','ARM','ANET','SHOP','DE'])assert.ok(selected.has(ticker));
});

test('incomplete history, duplicate days, or invalid source hashes block instead of falling back',()=>{
 assert.throws(()=>prepareR43AnnualOfflineInput({snapshots:snapshots().slice(0,20),universe:universe()}),
  /R43_ANNUAL_21_DAILY_FILES_REQUIRED/);
 const duplicate=snapshots();duplicate[1]=duplicate[0];
 assert.throws(()=>prepareR43AnnualOfflineInput({snapshots:duplicate,universe:universe()}),
  /R43_ANNUAL_DAILY_SESSION_DATES_INVALID/);
 const tampered=snapshots();tampered[0].rows[0].volume++;
 assert.throws(()=>prepareR43AnnualOfflineInput({snapshots:tampered,universe:universe()}),
  /R43_ANNUAL_DAILY_PROVENANCE_OR_HASH_INVALID/);
 const weekend=snapshots(),Saturday='2026-10-31';
 weekend[0].observationDate=Saturday;
 const schedule=universe();schedule.reviewedTradingSessions=[Saturday,...dates.slice(1)];
 assert.throws(()=>prepareR43AnnualOfflineInput({snapshots:weekend,universe:schedule}),
  /R43_ANNUAL_EXCHANGE_SESSIONS_NOT_VERIFIED|R43_ANNUAL_DAILY_SESSION_DATES_INVALID/);
});

test('split-adjusted fractional volumes survive and Berkshire dot/dash ticker alias resolves',()=>{
 const days=snapshots(),reviewed=universe();
 reviewed.members[0].ticker='BRK-A';reviewed.members[0].issuerId='BRK-A';
 for(const day of days){
  day.rows.find(row=>row.ticker==='BRK.A').volume+=.5;
  day.rowsSha256=sha(JSON.stringify(day.rows));
 }
 const input=prepareR43AnnualOfflineInput({snapshots:days,universe:reviewed});
 assert.equal(input.rows[0].ticker,'BRK-A');
 assert.ok(input.rows[0].price>0);
 assert.equal(input.rows[0].volume%1,.5);
 const publicPreview=prepareR43ManualSnapshot(input,{approvedUniverse:reviewed});
 assert.ok(publicPreview.selected.some(r=>r.tickers.includes('BRK-A')));
});

test('annual reviewer rights and required five issuer exceptions are enforced',()=>{
 const missing=universe();delete missing.rightsReviewReference;
 assert.throws(()=>prepareR43AnnualOfflineInput({snapshots:snapshots(),universe:missing}),
  /R43_ANNUAL_ISSUER_REVIEW_OR_RIGHTS_MISSING/);
 const wrong=universe();wrong.members[0].eligible=false;
 assert.throws(()=>prepareR43AnnualOfflineInput({snapshots:snapshots(),universe:wrong}),
  /R43_ANNUAL_REVIEWED_EXCEPTION_MISSING/);
 const unreviewed=universe();delete unreviewed.marketSessionsReviewed;
 assert.throws(()=>prepareR43AnnualOfflineInput({snapshots:snapshots(),universe:unreviewed}),
  /R43_ANNUAL_EXCHANGE_SESSIONS_NOT_VERIFIED/);
 const duplicate=universe();
 duplicate.members[5].ticker='BRK-A';duplicate.members[5].issuerId='BRK-A';
 assert.throws(()=>prepareR43AnnualOfflineInput({snapshots:snapshots(),universe:duplicate}),
  /R43_ANNUAL_ISSUER_ALIAS_DUPLICATE/);
});

test('existing private R45 snapshots can be transformed entirely offline with no network',()=>{
 const t=temporary();
 try{
  const dir=path.join(t.root,'market-calendar-r45-marketparquet');
  fs.mkdirSync(dir);
  for(const s of snapshots())fs.writeFileSync(path.join(dir,'stock_daily_'+s.observationDate+'.json'),JSON.stringify(s));
  const universeFile=path.join(t.root,'reviewed.json');
  fs.writeFileSync(universeFile,JSON.stringify(universe()));
  const input=readStoredR45ToR43Annual({pcHome:t.root,universeFile});
  assert.equal(input.rows.length,2634);
  assert.equal(input.rows[0].tradeDate,dates[0]);
 }finally{t.cleanup()}
});

test('optional Parquet adapter accepts locally hash-verified files with injected decoder only',async()=>{
 const t=temporary();
 try{
  const files=dates.map(date=>{
   const file=date+'.parquet',bytes=Buffer.from('PAR1local-test-'+date+'PAR1');
   fs.writeFileSync(path.join(t.root,file),bytes);
   return {date,file,sha256:sha(bytes)};
  });
  const manifest={version:1,method:'R43_MANUAL_MARKETPARQUET_21DAY_R1',
   source:'MARKETPARQUET_FREE_SAMPLE',licenseUrl:'https://marketparquet.com/license',
   manualCollection:true,derivedStatisticsAllowed:true,redistribution:false,
   rightsReviewReference,files};
  const manifestFile=path.join(t.root,'manifest.json'),universeFile=path.join(t.root,'universe.json');
  fs.writeFileSync(manifestFile,JSON.stringify(manifest));
  fs.writeFileSync(universeFile,JSON.stringify(universe()));
  let called=0;
  const decoder=async(_bytes,date)=>{
   called++;
   const idx=dates.indexOf(date);
   const decodedDate=idx%2===0?Math.floor(Date.parse(date+'T00:00:00Z')/86400000):date;
   return prices(date,idx).map(row=>({date:decodedDate,symbol:row.ticker,
    asset_type:'stock',close:row.close,volume:row.volume}));
  };
  const input=await readManualParquetToR43Annual({manifestFile,universeFile,
   parquetDir:t.root,decoder});
  assert.equal(called,21);assert.equal(input.rows.length,2634);
  const bad=Buffer.from('PAR1tamperedPAR1');
  fs.writeFileSync(path.join(t.root,files[0].file),bad);
  await assert.rejects(readManualParquetToR43Annual({manifestFile,universeFile,
   parquetDir:t.root,decoder}),/R43_ANNUAL_PARQUET_MAGIC_OR_HASH_INVALID/);
  const oversized=Buffer.alloc(8_000_001,0);
  fs.writeFileSync(path.join(t.root,files[0].file),oversized);
  await assert.rejects(readManualParquetToR43Annual({manifestFile,universeFile,
   parquetDir:t.root,decoder}),/R43_ANNUAL_PARQUET_SIZE_OR_TYPE_INVALID/);
  const unsafe={...manifest,files:[{...files[0],file:'../outside.parquet'},...files.slice(1)]};
  fs.writeFileSync(manifestFile,JSON.stringify(unsafe));
  await assert.rejects(readManualParquetToR43Annual({manifestFile,universeFile,
   parquetDir:t.root,decoder}),/R43_ANNUAL_PARQUET_MANIFEST_ENTRY_INVALID/);
 }finally{t.cleanup()}
});
