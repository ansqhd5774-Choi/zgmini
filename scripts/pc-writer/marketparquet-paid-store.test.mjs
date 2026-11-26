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
test('stock-only Archive chunks resume actual stored dates within the file budget',async t=>{
 const base=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'mp-stock-archive-')),'pc-writer');
 t.after(()=>fs.rmSync(path.dirname(base),{recursive:true,force:true}));
 const dates=['2026-11-18','2026-11-19','2026-11-20'];
 const files=dates.map(date=>({
  date,file_size_bytes:Buffer.byteLength('PAR1'+date+'PAR1'),
  download_url:'https://bucket.r2.cloudflarestorage.com/'+date,
 }));
 const requests=[];
 const fetchImpl=async(url,init)=>{
  const u=String(url);requests.push(u);
  if(u.endsWith('/api/v1/assets'))return Response.json({
   plan:'full',assets:[{asset_type:'stock_daily',access:'full',latest_date:dates.at(-1)}],
  });
  if(u.includes('/manifest/stock_daily'))return Response.json({
   asset_type:'stock_daily',files,
  });
  if(u.startsWith('https://bucket.r2.cloudflarestorage.com/')){
   assert.equal(init?.headers?.Authorization,undefined);
   return new Response(Buffer.from('PAR1'+u.slice(-10)+'PAR1'));
  }
  throw Error('Unexpected provider request '+u);
 };
 const opts={start:dates[0],end:dates.at(-1),maxFiles:1,
  assetTypes:['stock_daily'],fetchImpl,apiKey:'test-secret',
  sleep:async()=>{},
  readParquet:async bytes=>[{
   date:Buffer.from(bytes).toString().slice(4,14),
   symbol:'USONE',close:10,volume:1000,
  }],
 };
 const first=await collectPaidDaily(base,opts);
 assert.equal(first.status,'RUNNING');assert.equal(first.downloaded,1);
 assert.equal(first.remaining,2);assert.equal(first.d1Writes,0);
 const second=await collectPaidDaily(base,opts);
 assert.equal(second.status,'RUNNING');assert.equal(second.downloaded,1);
 assert.equal(second.reused,1);assert.equal(second.remaining,1);
 const third=await collectPaidDaily(base,opts);
 assert.equal(third.status,'STORED_READBACK_VERIFIED');assert.equal(third.downloaded,1);
 assert.equal(third.reused,2);assert.equal(third.remaining,0);
 for(const date of dates){
  assert.equal(readPaidDaily(base,'stock_daily',date).receipt.date,date);
  assert.equal(readPaidProjection(base,'stock_daily',date).length,1);
 }
 assert.equal(requests.filter(u=>u.includes('/manifest/etf_daily')).length,0);
 assert.equal(fs.existsSync(path.join(paidRoot(base),'etf_daily')),false);
});

test('stock-only historical chunk does not fetch or write ETF files',async t=>{
 const fixture=setup(t);
 const result=await collectPaidDaily(fixture.base,{
  ...fixture.options,assetTypes:['stock_daily'],maxFiles:1,
 });
 assert.equal(result.status,'STORED_READBACK_VERIFIED');
 assert.equal(result.downloaded,1);
 assert.equal(result.reused,0);
 assert.equal(result.fileRequests,1);
 assert.equal(result.themeDatesExposed,0);
 assert.equal(result.d1Writes,0);
 assert.deepEqual(Object.keys(result.dates),['stock_daily']);
 assert.ok(readPaidDaily(fixture.base,'stock_daily',fixture.date));
 assert.equal(fs.existsSync(path.join(paidRoot(fixture.base),'etf_daily')),false);
 assert.ok(fixture.calls.some(c=>c.url.includes('/manifest/stock_daily')));
 assert.equal(fixture.calls.some(c=>c.url.includes('/manifest/etf_daily')),false);
 const again=await collectPaidDaily(fixture.base,{
  ...fixture.options,assetTypes:['stock_daily'],maxFiles:1,
 });
 assert.equal(again.downloaded,0);
 assert.equal(again.reused,1);
 assert.equal(again.fileRequests,0);
});

test('invalid selected asset types fail before any network or storage effects',async t=>{
 const fixture=setup(t);
 for(const assetTypes of [[],['unknown'],['stock_daily','stock_daily'],'stock_daily']){
  await assert.rejects(collectPaidDaily(fixture.base,{
   ...fixture.options,assetTypes,
  }),{code:'MP_PAID_ASSET_TYPES_INVALID'});
 }
 assert.equal(fixture.calls.length,0);
 assert.equal(fs.existsSync(paidRoot(fixture.base)),false);
});

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
