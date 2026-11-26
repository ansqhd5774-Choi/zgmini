import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseR43AnnualPrepareArgs,runR43AnnualPrepareCommand} from
 '../tools/market-calendar-r43/R43_ANNUAL_INPUT_PREPARE.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const today=new Date().toISOString().slice(0,10);
const days=[];
for(let t=Date.parse(today+'T00:00:00Z');days.length<21;t-=86400000){
 const d=new Date(t),wd=d.getUTCDay();
 if(wd!==0&&wd!==6)days.push(d.toISOString().slice(0,10));
}
const symbols=['BRK.A','ARM','ANET','SHOP','DE',...Array.from({length:2629},(_,i)=>'S'+i)];
const rights='TEST_ONLY_REVIEWED_PRIVATE_DERIVED_RESULTS_20261102';
const reviewed=()=>({
 version:1,method:'R57_REVIEWED_ISSUER_MEMBERSHIP_R1',
 universeReviewed:true,reviewedAsOf:days[0],marketCapApiUsed:false,
 permissionForDerivedScores:true,rightsReviewReference:rights,
 marketSessionsReviewed:true,reviewedTradingSessions:days,
 expectedEligibleIssuers:2634,fundamentalsVerified:false,
 members:symbols.map(ticker=>({ticker,issuerId:ticker,eligible:true})),
});
function daily(date,i){
 const rows=symbols.map((ticker,j)=>({ticker,close:20+j+i/20,volume:1000+j+i*5}))
  .sort((a,b)=>a.ticker.localeCompare(b.ticker));
 return {version:1,method:'MARKET_CALENDAR_R45_FULL_STOCK_REUSE_R1',
  scope:'PC_PRIVATE_ONLY',source:'MARKETPARQUET_FREE_SAMPLE',
  sourceContract:'ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5',
  observationDate:date,priceAdjustment:'SPLIT_ADJUSTED',
  publicFeed:false,redistribution:false,providerCallsAdded:0,
  tickerCount:rows.length,rowsSha256:sha(JSON.stringify(rows)),rows};
}
function fixture(){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r43-annual-prepare-'));
 const snapshots=path.join(base,'market-calendar-r45-marketparquet');
 fs.mkdirSync(snapshots);
 for(let i=0;i<days.length;i++)fs.writeFileSync(path.join(snapshots,'stock_daily_'+days[i]+'.json'),
  JSON.stringify(daily(days[i],i)));
 fs.writeFileSync(path.join(base,'local-market-calendar-r43-reviewed-issuers.json'),
  JSON.stringify(reviewed()));
 return {base,cleanup(){fs.rmSync(base,{recursive:true,force:true})}};
}
const args=(base,mode='--preflight',source='stored-r45')=>[
 mode,...(mode==='--write-input'?['--confirm-r43-annual-write']:[]),
 '--source',source,'--pc-home',base];

test('preflight uses approved existing R45 data and leaves no new input file',async()=>{
 const f=fixture();
 try{
  const result=await runR43AnnualPrepareCommand(args(f.base));
  assert.equal(result.status,'R43_ANNUAL_INPUT_PREFLIGHT_READY_NOT_WRITTEN');
  assert.equal(result.topCount,132);
  assert.equal(result.eligibleIssuers,2634);
  assert.equal(result.providerCalls,0);assert.equal(result.d1Writes,0);
  assert.equal(result.coreChanges,0);
  assert.equal(fs.existsSync(path.join(f.base,'local-market-calendar-r43-input.json')),false);
 }finally{f.cleanup()}
});

test('annual explicit write creates fixed private input with verified readback once',async()=>{
 const f=fixture();
 try{
  const result=await runR43AnnualPrepareCommand(args(f.base,'--write-input'));
  assert.equal(result.status,'R43_ANNUAL_PRIVATE_INPUT_WRITTEN_AND_READBACK');
  assert.equal(result.outputWritten,true);
  const dest=path.join(f.base,'local-market-calendar-r43-input.json');
  const file=JSON.parse(fs.readFileSync(dest,'utf8'));
  assert.equal(file.rows.length,2634);
  assert.equal(file.marketCapApiUsed,false);
  assert.equal(file.rows[0].ticker,'BRK.A');
  const before=fs.readFileSync(dest);
  await assert.rejects(runR43AnnualPrepareCommand(args(f.base,'--write-input')),
   /R43_ANNUAL_PREPARE_EXISTING_INPUT_PRESERVED_STOP/);
  assert.deepEqual(fs.readFileSync(dest),before);
 }finally{f.cleanup()}
});

test('a failed readback cleans only the output created by this invocation',async()=>{
 const f=fixture(),target=path.join(f.base,'local-market-calendar-r43-input.json');
 const originalRead=fs.readFileSync;
 try{
  fs.readFileSync=function(file,...args){
   if(file===target)return Buffer.from('READBACK_CORRUPTED');
   return originalRead.call(fs,file,...args);
  };
  await assert.rejects(runR43AnnualPrepareCommand(args(f.base,'--write-input')),
   /R43_ANNUAL_PREPARE_LOCAL_READBACK_STOP/);
 }finally{
  fs.readFileSync=originalRead;
  assert.equal(fs.existsSync(target),false);
  f.cleanup();
 }
});

test('unreviewed rights, missing 21-day history and bad source hash never write',async()=>{
 const f=fixture(),target=path.join(f.base,'local-market-calendar-r43-input.json');
 try{
  const rosterFile=path.join(f.base,'local-market-calendar-r43-reviewed-issuers.json');
  const roster=reviewed();roster.permissionForDerivedScores=false;
  fs.writeFileSync(rosterFile,JSON.stringify(roster));
  await assert.rejects(runR43AnnualPrepareCommand(args(f.base,'--write-input')),
   /R43_ANNUAL_ISSUER_REVIEW_OR_RIGHTS_MISSING/);
  assert.equal(fs.existsSync(target),false);
  fs.writeFileSync(rosterFile,JSON.stringify(reviewed()));
  const latest=path.join(f.base,'market-calendar-r45-marketparquet','stock_daily_'+days[0]+'.json');
  const tampered=JSON.parse(fs.readFileSync(latest,'utf8'));tampered.rows[0].volume+=4;
  fs.writeFileSync(latest,JSON.stringify(tampered));
  await assert.rejects(runR43AnnualPrepareCommand(args(f.base,'--write-input')),
   /R43_ANNUAL_DAILY_PROVENANCE_OR_HASH_INVALID/);
  assert.equal(fs.existsSync(target),false);
  fs.unlinkSync(latest);
  await assert.rejects(runR43AnnualPrepareCommand(args(f.base,'--write-input')),
   /R43_ANNUAL_21_DAILY_FILES_REQUIRED/);
  assert.equal(fs.existsSync(target),false);
 }finally{f.cleanup()}
});

test('flags require explicit annual input write confirmation, never D1 mode',()=>{
 const base=path.resolve(os.tmpdir(),'zgmini-valid-args');
 assert.throws(()=>parseR43AnnualPrepareArgs(['--write-input','--source','stored-r45','--pc-home',base]),
  /R43_ANNUAL_PREPARE_CONFIRMATION_STOP/);
 assert.throws(()=>parseR43AnnualPrepareArgs(['--preflight','--confirm-r43-annual-write',
  '--source','stored-r45','--pc-home',base]),/R43_ANNUAL_PREPARE_CONFIRMATION_STOP/);
 assert.throws(()=>parseR43AnnualPrepareArgs(['--publish','--source','stored-r45',
  '--pc-home',base]),/R43_ANNUAL_PREPARE_ARGS_STOP/);
 assert.throws(()=>parseR43AnnualPrepareArgs(['--source','precomputed-rv',
  '--pc-home',base]),/R43_ANNUAL_PREPARE_PATH_OR_SOURCE_STOP/);
});

test('manual Parquet source validates manifest and uses in-memory decoder, no provider',async()=>{
 const f=fixture();
 try{
  const dir=path.join(f.base,'market-calendar-r43-manual-parquet');
  fs.mkdirSync(dir);
  const files=days.map(date=>{
   const file=date+'.parquet',bytes=Buffer.from('PAR1annual-'+date+'PAR1');
   fs.writeFileSync(path.join(dir,file),bytes);
   return {date,file,sha256:sha(bytes)};
  });
  const manifest={version:1,method:'R43_MANUAL_MARKETPARQUET_21DAY_R1',
   source:'MARKETPARQUET_FREE_SAMPLE',licenseUrl:'https://marketparquet.com/license',
   manualCollection:true,derivedStatisticsAllowed:true,redistribution:false,
   rightsReviewReference:rights,files};
  fs.writeFileSync(path.join(f.base,'local-market-calendar-r43-manual-parquet-manifest.json'),
   JSON.stringify(manifest));
  let decoded=0;
  const decoder=async(_bytes,date)=>{
   decoded++;
   const i=days.indexOf(date);
   return symbols.map((ticker,j)=>({date,asset_type:'stock',
    symbol:ticker,close:20+j+i/20,volume:1000+j+i*5}));
  };
  const result=await runR43AnnualPrepareCommand(args(f.base,'--preflight','manual-parquet'),
   {parquetDecoder:decoder});
  assert.equal(decoded,21);assert.equal(result.topCount,132);
  assert.equal(result.source,'manual-parquet');
  assert.equal(fs.existsSync(path.join(f.base,'local-market-calendar-r43-input.json')),false);
  manifest.redistribution=true;
  fs.writeFileSync(path.join(f.base,'local-market-calendar-r43-manual-parquet-manifest.json'),
   JSON.stringify(manifest));
  await assert.rejects(runR43AnnualPrepareCommand(args(f.base,'--write-input','manual-parquet'),
   {parquetDecoder:decoder}),/R43_ANNUAL_PARQUET_SOURCE_RIGHTS_OR_COUNT_INVALID/);
 }finally{f.cleanup()}
});
