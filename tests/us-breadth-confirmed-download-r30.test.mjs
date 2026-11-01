import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fullMarketYearSessions,auditFullMarketYearInventory}
 from '../scripts/pc-writer/us-breadth-confirmed-year-inventory-r22.mjs';
import {stageConfirmedStockDailyR30}
 from '../scripts/pc-writer/us-breadth-confirmed-download-r30.mjs';

const now=new Date('2026-11-01T12:00:00Z');
const sessionCount=2;
const dates=fullMarketYearSessions({now,sessionCount});
const bytes=Buffer.from('PAR1\x00\x00\x00\x00PAR1','binary');
const signed=date=>`https://bucket.r2.cloudflarestorage.com/stock_daily_${date}.parquet?X-Amz-Signature=DO-NOT-LEAK-${date}`;
const manifest=(selected=dates)=>({asset_type:'stock_daily',start:dates[0],end:dates.at(-1),
 file_count:selected.length,files:selected.map(date=>({date,
  filename:`stock_daily_${date}.parquet`,file_size_bytes:bytes.length,
  download_url:signed(date)}))});
const response=value=>({status:200,headers:{get:()=>null},
 arrayBuffer:async()=>value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength)});
const manifestResponse=value=>response(Buffer.from(JSON.stringify(value)));
const fakeNetwork=({body=manifest(),payload=bytes,downloadStatus=200}={})=>{
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url:String(url),options});
  assert.equal(options.redirect,'manual');
  if(calls.length===1){
   assert.equal(new URL(url).hostname,'marketparquet.com');
   assert.equal(options.headers.Authorization,'Bearer very-secret-key');
   return manifestResponse(body);
  }
  assert.equal(new URL(url).hostname,'bucket.r2.cloudflarestorage.com');
  assert.equal(options.headers,undefined);
  return downloadStatus===200?response(payload):{status:downloadStatus};
 };
 return {fetchImpl,calls};
};
const root=()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r30-test-'));
 return {dir,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
};
const target=(dir,date)=>path.join(dir,'us-breadth-confirmed-r2',
 'marketparquet-stock-daily',`stock_daily_${date}.parquet`);
const auditTarget=file=>file.replace(/\.parquet$/,'.audit.json');
const run=(dir,fetchImpl,mode='DOWNLOAD_STAGING')=>stageConfirmedStockDailyR30({
 mode,dataRoot:dir,pcHome:path.join(dir,'unused-home'),apiKey:'very-secret-key',
 now,sessionCount,fetchImpl,
});

test('R30 explicit plan-only uses one official manifest GET, never downloads or writes',async()=>{
 const temp=root();try{
  const network=fakeNetwork();
  const report=await run(temp.dir,network.fetchImpl,'PLAN_ONLY');
  assert.equal(report.status,'READY_TO_STAGE');
  assert.equal(report.requestedDates,3);
  assert.equal(report.manifestCalls,1);
  assert.equal(report.downloadCalls,0);
  assert.equal(report.localFileWrites,0);
  assert.equal(network.calls.length,1);
  assert.equal(fs.existsSync(path.dirname(target(temp.dir,dates[0]))),false);
  assert.equal(report.publicationAllowed,false);
  assert.equal(report.providerAuthenticityVerified,false);
  assert.doesNotMatch(JSON.stringify(report),/very-secret-key|X-Amz-Signature|DO-NOT-LEAK|PAR1/);
 }finally{temp.cleanup();}
});

test('R31 missing oldest baseline still downloads all consecutive real available days',async()=>{
 const temp=root();try{
  const network=fakeNetwork({body:manifest(dates.slice(1))});
  const report=await run(temp.dir,network.fetchImpl);
  assert.equal(report.status,'STAGING_COMPLETE_LOCAL_ONLY');
  assert.equal(report.firstMissingDate,dates[0]);
  assert.equal(report.missingDatesCount,1);
  assert.equal(report.sourceDatesToStage,2);
  assert.equal(report.comparisonPointsPossible,1);
  assert.equal(report.stagedDates,2);
  assert.equal(report.downloadCalls,2);
  assert.equal(network.calls.length,3);
  assert.equal(fs.existsSync(path.dirname(target(temp.dir,dates[0]))),true);
  assert.equal(fs.existsSync(target(temp.dir,dates[0])),false);
  assert.equal(fs.existsSync(target(temp.dir,dates[1])),true);
  assert.equal(fs.existsSync(target(temp.dir,dates[2])),true);
 }finally{temp.cleanup();}
});

test('R31 plan reports the 250-source-day option without any downloads or writes',async()=>{
 const temp=root();try{
  const network=fakeNetwork({body:manifest(dates.slice(1))});
  const report=await run(temp.dir,network.fetchImpl,'PLAN_ONLY');
  assert.equal(report.status,'READY_TO_STAGE');
  assert.equal(report.sourceDatesToStage,2);
  assert.equal(report.comparisonPointsPossible,1);
  assert.equal(report.localFileWrites,0);
  assert.equal(report.downloadCalls,0);
  assert.equal(network.calls.length,1);
  assert.equal(fs.existsSync(path.join(temp.dir,'us-breadth-confirmed-r2')),false);
 }finally{temp.cleanup();}
});

test('R31 actual 251-request / 250-available manifest is READY_TO_STAGE with no writes',async()=>{
 const temp=root();try{
  const expected=fullMarketYearSessions({now,sessionCount:250});
  const files=expected.slice(1).map(date=>({date,
   filename:`stock_daily_${date}.parquet`,file_size_bytes:bytes.length,
   download_url:signed(date)}));
  const body={asset_type:'stock_daily',start:expected[0],end:expected.at(-1),
   file_count:files.length,files};
  let calls=0;
  const report=await stageConfirmedStockDailyR30({mode:'PLAN_ONLY',
   dataRoot:temp.dir,pcHome:path.join(temp.dir,'unused'),apiKey:'test-key',now,
   sessionCount:250,fetchImpl:async()=>{calls++;return manifestResponse(body);}});
  assert.equal(report.status,'READY_TO_STAGE');
  assert.equal(report.availableDates,250);
  assert.equal(report.sourceDatesToStage,250);
  assert.equal(report.comparisonPointsPossible,249);
  assert.equal(report.missingDatesCount,1);
  assert.equal(report.firstMissingDate,expected[0]);
  assert.equal(report.downloadCalls,0);
  assert.equal(report.localFileWrites,0);
  assert.equal(calls,1);
  assert.equal(fs.existsSync(path.join(temp.dir,'us-breadth-confirmed-r2')),false);
 }finally{temp.cleanup();}
});

test('R31 never skips an interior daily gap or accepts fewer than 250 days',async()=>{
 const temp=root();try{
  for(const selected of [[dates[0],dates[2]],[dates[2]]]){
   const network=fakeNetwork({body:manifest(selected)});
   const report=await run(temp.dir,network.fetchImpl);
   assert.equal(report.status,'PROVIDER_YEAR_GAPPED');
   assert.equal(report.downloadCalls,0);
   assert.equal(report.localFileWrites,0);
   assert.equal(network.calls.length,1);
  }
  assert.equal(fs.existsSync(path.join(temp.dir,'us-breadth-confirmed-r2')),false);
 }finally{temp.cleanup();}
});

test('R30 complete manifest downloads only signed HTTPS bytes to isolated R2 and audits each',async()=>{
 const temp=root();try{
  const network=fakeNetwork();
  const report=await run(temp.dir,network.fetchImpl);
  assert.equal(report.status,'STAGING_COMPLETE_LOCAL_ONLY');
  assert.equal(report.manifestCalls,1);
  assert.equal(report.downloadCalls,3);
  assert.equal(report.localFileWrites,6);
  assert.equal(report.stagedDates,3);
  assert.equal(report.resumedDates,0);
  assert.equal(network.calls.length,4);
  for(const date of dates){
   const file=target(temp.dir,date);
   assert.deepEqual(fs.readFileSync(file),bytes);
   const audit=JSON.parse(fs.readFileSync(auditTarget(file),'utf8'));
   assert.equal(audit.source,'MARKETPARQUET_STOCK_DAILY_OFFICIAL_PRESIGNED');
   assert.equal(audit.date,date);
   assert.equal(audit.feed,'stock_daily');
   assert.equal(audit.relativePath,
    `us-breadth-confirmed-r2/marketparquet-stock-daily/stock_daily_${date}.parquet`);
   assert.equal(audit.priceMode,'SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED');
   assert.equal(audit.complete,true);
   assert.equal(audit.sha256.length,64);
   assert.equal(new Date(audit.collectedAt).toISOString(),audit.collectedAt);
   assert.equal(audit.providerAuthenticityVerified,false);
  }
  const inventory=auditFullMarketYearInventory({dataRoot:temp.dir,
   pcHome:path.join(temp.dir,'unused-home'),now,sessionCount});
  assert.equal(inventory.status,'LOCAL_YEAR_INVENTORY_COMPLETE_PROVIDER_UNVERIFIED');
  assert.equal(inventory.localAuditShaMatched,dates.length);
  assert.equal(inventory.localComplete,true);
  assert.doesNotMatch(JSON.stringify(report),/very-secret-key|X-Amz-Signature|DO-NOT-LEAK|PAR1/);
 }finally{temp.cleanup();}
});

test('R30 resumes audited existing files, never overwrites, never re-downloads them',async()=>{
 const temp=root();try{
  let report=await run(temp.dir,fakeNetwork().fetchImpl);
  assert.equal(report.status,'STAGING_COMPLETE_LOCAL_ONLY');
  const first=target(temp.dir,dates[0]);
  const stat=fs.statSync(first).mtimeMs;
  const network=fakeNetwork();
  report=await run(temp.dir,network.fetchImpl);
  assert.equal(report.status,'STAGING_COMPLETE_LOCAL_ONLY');
  assert.equal(report.resumedDates,3);
  assert.equal(report.downloadCalls,0);
  assert.equal(report.localFileWrites,0);
  assert.equal(network.calls.length,1);
  assert.equal(fs.statSync(first).mtimeMs,stat);
 }finally{temp.cleanup();}
});

test('R30 refuses preexisting orphan, changed file, or changed audit without overwriting',async()=>{
 const temp=root();try{
  const first=target(temp.dir,dates[0]);
  fs.mkdirSync(path.dirname(first),{recursive:true});
  fs.writeFileSync(first,Buffer.from('USER DATA'));
  const network=fakeNetwork();
  const report=await run(temp.dir,network.fetchImpl);
  assert.equal(report.status,'STAGING_FILE_CONFLICT');
  assert.equal(report.downloadCalls,0);
  assert.equal(network.calls.length,1);
  assert.equal(fs.readFileSync(first,'utf8'),'USER DATA');
 }finally{temp.cleanup();}
});

test('R30 malformed URL, duplicate dates, or unexpected range never fetch source bytes',async()=>{
 const temp=root();try{
  for(const bad of [
   {...manifest(),files:manifest().files.map((x,i)=>i===0?{...x,download_url:'http://evil.test'}:x)},
   {...manifest(),files:[...manifest().files.slice(0,2),manifest().files[1]]},
   {...manifest(),end:'2022-01-01'},
  ]){
   const network=fakeNetwork({body:bad});
   const report=await run(temp.dir,network.fetchImpl);
   assert.match(report.status,/PROVIDER_MANIFEST_/);
   assert.equal(network.calls.length,1);
   assert.equal(report.localFileWrites,0);
  }
 }finally{temp.cleanup();}
});

test('R30 rejects invalid Parquet bytes/size, redirect and oversized claimed content',async()=>{
 const temp=root();try{
  for(const payload of [Buffer.from('NOTPARQUET!!'),Buffer.from('PAR1badPAR1')]){
   const network=fakeNetwork({payload});
   const report=await run(temp.dir,network.fetchImpl);
   assert.equal(report.status,'PROVIDER_SIGNED_BYTES_INVALID');
   assert.equal(report.localFileWrites,0);
   assert.equal(fs.existsSync(target(temp.dir,dates[0])),false);
  }
  const redirect=await run(temp.dir,fakeNetwork({downloadStatus:302}).fetchImpl);
  assert.equal(redirect.status,'PROVIDER_SIGNED_DOWNLOAD_FAILED');
  const tooLarge=await run(temp.dir,async(url,options)=>{
   if(options.headers)return manifestResponse(manifest());
   return {status:200,headers:{get:key=>key==='content-length'?'30000001':null},
    arrayBuffer:async()=>{throw Error('should not read oversized body');}};
  });
  assert.equal(tooLarge.status,'PROVIDER_SIGNED_DOWNLOAD_UNAVAILABLE');
 }finally{temp.cleanup();}
});

test('R30 no key, invalid mode and invalid data root fail without side effects',async()=>{
 const temp=root();try{
  const noKey=await stageConfirmedStockDailyR30({mode:'PLAN_ONLY',
   dataRoot:temp.dir,pcHome:path.join(temp.dir,'missing'),apiKey:'',now,sessionCount,
   fetchImpl:()=>{throw Error('unexpected fetch');}});
  assert.equal(noKey.status,'PROVIDER_API_KEY_NOT_CONFIGURED');
  const mode=await stageConfirmedStockDailyR30({mode:'UNKNOWN',dataRoot:temp.dir,
   apiKey:'very-secret-key',now,sessionCount,fetchImpl:()=>{throw Error('unexpected fetch');}});
  assert.equal(mode.status,'EXPLICIT_MODE_REQUIRED');
  const report=await run(path.join(temp.dir,'non-existent-root'),fakeNetwork().fetchImpl);
  assert.equal(report.status,'ISOLATED_DATA_ROOT_UNAVAILABLE');
 }finally{temp.cleanup();}
});

test('R30 rejects an isolated R2 root symlink escaping the data root',async()=>{
 const temp=root(),external=root();try{
  const parent=path.join(temp.dir,'us-breadth-confirmed-r2');
  fs.mkdirSync(parent);
  fs.symlinkSync(external.dir,path.join(parent,'marketparquet-stock-daily'),'dir');
  const network=fakeNetwork();
  const report=await run(temp.dir,network.fetchImpl);
  assert.equal(report.status,'ISOLATED_DATA_ROOT_UNAVAILABLE');
  assert.equal(report.downloadCalls,0);
  assert.equal(report.localFileWrites,0);
  assert.equal(network.calls.length,1);
  assert.deepEqual(fs.readdirSync(external.dir),[]);
 }finally{temp.cleanup();external.cleanup();}
});
