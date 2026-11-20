import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {collectPaidDaily,paidRoot,readPaidDaily,readPaidProjection,readPaidEtfSeries} from './marketparquet-paid-store.mjs';
function setup(t,{plan='full',conflict=false}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mp-paid-test-')),base=path.join(root,'pc-writer');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const date='2026-11-19',bytes=Buffer.from('PAR1validatedPAR1'),calls=[];
 const rows=Array.from({length:120},(_,i)=>({date,symbol:i===0?'SPY':'ETF'+i,close:i+1,volume:1000}));
 const fetchImpl=async(url,init)=>{
  calls.push({url:String(url),auth:init?.headers?.Authorization});
  if(String(url).endsWith('/assets'))return Response.json({plan,assets:['stock_daily','etf_daily'].map(asset_type=>({asset_type,access:'full',latest_date:date}))});
  if(String(url).includes('/manifest/')){const type=String(url).includes('/stock_daily')?'stock_daily':'etf_daily';return Response.json({asset_type:type,files:[{date,file_size_bytes:bytes.length,download_url:'https://bucket.r2.cloudflarestorage.com/'+type+'?signature=private'}]});}
  return new Response(bytes);
 };
 if(conflict){const dir=path.join(root,'theme-market-history-r131','marketparquet-r165');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'etf_daily_'+date+'.parquet'),'old-preserved');}
 return {base,date,bytes,rows,calls,options:{start:date,apiKey:'test-secret',fetchImpl,readParquet:async()=>rows,sleep:async()=>{}}};
}
test('paid stock + ETF stored, read back and reused; signed URLs receive no credential',async t=>{
 const s=setup(t);const first=await collectPaidDaily(s.base,s.options);
 assert.equal(first.status,'STORED_READBACK_VERIFIED');assert.equal(first.downloaded,2);assert.equal(first.themeDatesExposed,1);
 assert.equal(readPaidDaily(s.base,'stock_daily',s.date).receipt.plan,'full');
 assert.equal(readPaidProjection(s.base,'etf_daily',s.date).length,120);
 assert.ok(s.calls.filter(c=>c.url.includes('cloudflarestorage')).every(c=>c.auth===undefined));
 assert.ok(!JSON.stringify(first).includes('test-secret'));assert.ok(!JSON.stringify(first).includes('signature'));
 const second=await collectPaidDaily(s.base,s.options);assert.equal(second.downloaded,0);assert.equal(second.reused,2);assert.equal(second.fileRequests,0);
});
test('registry-like 120 symbols reuse one ETF file without a theme count ceiling',async t=>{
 const s=setup(t);await collectPaidDaily(s.base,s.options);
 const result=await readPaidEtfSeries(s.base,{symbols:s.rows.map(r=>r.symbol),readParquet:async()=>s.rows});
 assert.equal(Object.keys(result.series).length,120);assert.equal(result.series.SPY[0].date,s.date);assert.equal(result.confirmedRaw1hCompatible,false);
});
test('free plan cannot enter paid store',async t=>{
 const s=setup(t,{plan:'free'});await assert.rejects(collectPaidDaily(s.base,s.options),{code:'MP_PAID_FULL_PLAN_REQUIRED'});
 assert.equal(s.calls.length,1);assert.equal(fs.existsSync(path.join(paidRoot(s.base),'collection.lock')),false);
});
test('raw tamper rejects reuse',async t=>{
 const s=setup(t);await collectPaidDaily(s.base,s.options);fs.appendFileSync(path.join(paidRoot(s.base),'stock_daily',s.date+'.parquet'),'changed');
 await assert.rejects(collectPaidDaily(s.base,s.options),{code:'MP_PAID_STORED_SHA_MISMATCH'});
});
test('projection tamper is independently detected',async t=>{
 const s=setup(t);await collectPaidDaily(s.base,s.options);const file=path.join(paidRoot(s.base),'stock_daily',s.date+'.parquet.rows.json');
 const x=JSON.parse(fs.readFileSync(file));x.rows[0].close=999;fs.writeFileSync(file,JSON.stringify(x));
 assert.throws(()=>readPaidProjection(s.base,'stock_daily',s.date),{code:'MP_PAID_PROJECTION_SHA_MISMATCH'});
});
test('legacy collision preserves prior bytes and does not discard independent stock data',async t=>{
 const s=setup(t,{conflict:true});const result=await collectPaidDaily(s.base,s.options);
 assert.equal(result.status,'PARTIAL');assert.equal(result.themeExposureErrors[0].code,'MP_PAID_LEGACY_BYTES_DIFFER');
 assert.equal(fs.readFileSync(path.join(path.dirname(s.base),'theme-market-history-r131','marketparquet-r165','etf_daily_'+s.date+'.parquet'),'utf8'),'old-preserved');
 assert.ok(readPaidDaily(s.base,'stock_daily',s.date));
});
test('wrong date and duplicate symbol fail before raw persistence',async t=>{
 const s=setup(t);s.options.readParquet=async()=>[s.rows[0],s.rows[0]];
 await assert.rejects(collectPaidDaily(s.base,s.options),{code:'MP_PAID_ROWS_INVALID'});
 assert.equal(fs.existsSync(path.join(paidRoot(s.base),'stock_daily',s.date+'.parquet')),false);
});
test('bounded collection resumes from stored receipts',async t=>{
 const s=setup(t);const first=await collectPaidDaily(s.base,{...s.options,maxFiles:1});assert.equal(first.status,'RUNNING');assert.equal(first.remaining,1);
 const second=await collectPaidDaily(s.base,{...s.options,maxFiles:1});assert.equal(second.status,'STORED_READBACK_VERIFIED');assert.equal(second.downloaded,1);assert.equal(second.reused,1);
});
