import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {verifyNineR46Manifest,freeSampleWindow,runNineR46Backfill} from
 '../scripts/pc-writer/theme-nine-r46-free-eod-backfill.mjs';

const start='2025-10-28',end='2026-10-28';
function entry(date='2026-10-26'){
 return {date,filename:`etf_daily_${date}.parquet`,file_size_bytes:15100,
  download_url:'https://sample.r2.cloudflarestorage.com/example?signature=REDACTED'};
}
test('R46 accepts only canonical etf_daily free manifest, sorts dates',()=>{
 const files=verifyNineR46Manifest({asset_type:'etf_daily',files:[
  entry('2026-10-26'),entry('2026-10-23')]},{start,end});
 assert.deepEqual(files.map(x=>x.date),['2026-10-23','2026-10-26']);
 assert.equal(freeSampleWindow(new Date('2026-10-28T00:00:00Z')).end,'2026-10-28');
});
test('R46 rejects duplicate/out-of-window/over-limit records',()=>{
 const wrap=files=>({asset_type:'etf_daily',files});
 assert.throws(()=>verifyNineR46Manifest(wrap([entry(),entry()]),{start,end}),
  /R46_FREE_MANIFEST_FILE/);
 assert.throws(()=>verifyNineR46Manifest(wrap([entry('2024-01-02')]),{start,end}),
  /R46_FREE_MANIFEST_FILE/);
 assert.throws(()=>verifyNineR46Manifest(wrap([entry('2026-10-26'),
  ...Array.from({length:270},(_,i)=>entry('2025-11-01'))]),{start,end}),
  /R46_FREE_MANIFEST_CONTRACT/);
});
test('R46 refuses non-canonical or untrusted download targets',()=>{
 for(const url of ['http://sample.r2.cloudflarestorage.com/obj',
  'https://127.0.0.1/secret','https://sample.r2.cloudflarestorage.com.evil.org/o',
  'https://user:pass@marketparquet.com/a']){
  const f=entry();f.download_url=url;
  assert.throws(()=>verifyNineR46Manifest({asset_type:'etf_daily',files:[f]},
   {start,end}),/R46_FREE_MANIFEST_FILE/);
 }
});
test('R46 stores only separate audited private files; replay never downloads twice',async()=>{
 const dataRoot=fs.mkdtempSync(path.join(os.tmpdir(),'theme-nine-r46-test-'));
 const existing=path.join(dataRoot,'theme-market-history-r131');
 fs.mkdirSync(path.join(existing,'marketparquet-r165'),{recursive:true});
 fs.mkdirSync(path.join(existing,'marketparquet-r167'),{recursive:true});
 const savedFetch=globalThis.fetch;
 const bytes=Buffer.concat([Buffer.from('PAR1x'),Buffer.from([1,0,0,0]),Buffer.from('PAR1')]);
 let calls=0;
 globalThis.fetch=async (url)=>{
  calls++;
  if(String(url).includes('/manifest/'))return new Response(JSON.stringify({
   asset_type:'etf_daily',files:[{...entry(),file_size_bytes:bytes.length}]}),{
   status:200,headers:{'Content-Type':'application/json'}});
  return new Response(bytes,{status:200});
 };
 try{
  const first=await runNineR46Backfill({dataRoot,now:new Date('2026-10-28T00:00:00Z')});
  assert.equal(first.status,'PRIVATE_EOD_BACKFILL_STORED_R32_STILL_BLOCKED');
  assert.equal(first.downloaded,1);
  assert.equal(first.reusedExisting,0);
  assert.equal(first.originalMarketParquetWrites,0);
  const second=await runNineR46Backfill({dataRoot,now:new Date('2026-10-28T00:00:00Z')});
  assert.equal(second.downloaded,0);
  assert.equal(second.reusedR46,1);
  assert.equal(calls,3); // two manifests + first private file once
  assert.equal(fs.readdirSync(path.join(existing,'marketparquet-r165')).length,0);
  assert.equal(fs.readdirSync(path.join(existing,'marketparquet-r167')).length,0);
 }finally{globalThis.fetch=savedFetch;fs.rmSync(dataRoot,{recursive:true,force:true});}
});
