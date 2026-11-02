import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fullMarketYearSessions} from '../scripts/pc-writer/us-breadth-confirmed-year-inventory-r22.mjs';
import {stageConfirmedStockDailyR30,r45DailyPairCliArgs}
  from '../scripts/pc-writer/us-breadth-confirmed-download-r30.mjs';

const before=new Date('2026-11-01T12:00:00Z');
const after=new Date('2026-11-03T03:00:00Z');
const bytes=Buffer.from('PAR1\x00\x00\x00\x00PAR1','binary');
const lastPair=now=>fullMarketYearSessions({now,sessionCount:1});
const signed=day=>`https://bucket.r2.cloudflarestorage.com/stock_daily_${day}.parquet?X-Amz-Signature=test-only-${day}`;
const manifest=(dates,selected=dates)=>({asset_type:'stock_daily',start:dates[0],end:dates[1],
  file_count:selected.length,files:selected.map(date=>({date,
    filename:`stock_daily_${date}.parquet`,file_size_bytes:bytes.length,
    download_url:signed(date)}))});
const response=value=>({status:200,headers:{get:()=>null},
  arrayBuffer:async()=>value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength)});
const network=(dates,{selected=dates}={})=>{
  const calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push({url:String(url),options});
    assert.equal(options.redirect,'manual');
    if(new URL(url).hostname==='marketparquet.com'){
      assert.equal(options.headers.Authorization,'Bearer test-only-key');
      assert.deepEqual([new URL(url).searchParams.get('start'),
        new URL(url).searchParams.get('end')],dates);
      return response(Buffer.from(JSON.stringify(manifest(dates,selected))));
    }
    assert.equal(new URL(url).hostname,'bucket.r2.cloudflarestorage.com');
    assert.equal(options.headers,undefined);
    return response(bytes);
  };
  return {calls,fetchImpl};
};
const temp=t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r45-daily-pair-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  return root;
};
const source=(root,day)=>path.join(root,'us-breadth-confirmed-r2',
  'marketparquet-stock-daily',`stock_daily_${day}.parquet`);
const run=(root,now,fetchImpl,opts={})=>stageConfirmedStockDailyR30({
  mode:'PLAN_ONLY',collectionWindow:'DAILY_PAIR',
  dataRoot:root,pcHome:path.join(root,'unused'),apiKey:'test-only-key',
  now,fetchImpl,...opts,
});

test('R45 plan limits authenticated manifest to latest two sessions and never writes',async t=>{
  const root=temp(t),dates=lastPair(before),net=network(dates);
  const result=await run(root,before,net.fetchImpl);
  assert.equal(result.status,'READY_TO_STAGE');
  assert.equal(result.collectionWindow,'DAILY_PAIR');
  assert.equal(result.requestedDates,2);
  assert.equal(result.sourceDatesToStage,2);
  assert.equal(result.manifestCalls,1);
  assert.equal(result.downloadCalls,0);
  assert.equal(result.localFileWrites,0);
  assert.equal(result.publicationAllowed,false);
  assert.equal(result.remoteWrites,0);
  assert.equal(result.schedulerChanges,0);
  assert.equal(net.calls.length,1);
  assert.equal(fs.existsSync(path.dirname(source(root,dates[0]))),false);
});

test('R45 explicit source-write approval is mandatory before any provider call',async t=>{
  const root=temp(t),net=network(lastPair(before));
  const result=await run(root,before,net.fetchImpl,{mode:'DOWNLOAD_STAGING'});
  assert.equal(result.status,'DAILY_PAIR_SOURCE_WRITE_APPROVAL_REQUIRED');
  assert.equal(result.manifestCalls,0);
  assert.equal(result.downloadCalls,0);
  assert.equal(result.localFileWrites,0);
  assert.equal(net.calls.length,0);
  assert.deepEqual(fs.readdirSync(root),[]);
});

test('R45 pair source is append-only: next completed day downloads only one new file',async t=>{
  const root=temp(t),a=lastPair(before),b=lastPair(after);
  assert.equal(a[1],b[0]);
  const firstNet=network(a);
  const first=await run(root,before,firstNet.fetchImpl,{
    mode:'DOWNLOAD_STAGING',allowDailyPairSourceWrite:true});
  assert.equal(first.status,'STAGING_COMPLETE_LOCAL_ONLY');
  assert.equal(first.stagedDates,2);
  assert.equal(first.downloadCalls,2);
  const old=fs.statSync(source(root,a[1])).mtimeMs;

  const secondNet=network(b);
  const second=await run(root,after,secondNet.fetchImpl,{
    mode:'DOWNLOAD_STAGING',allowDailyPairSourceWrite:true});
  assert.equal(second.status,'STAGING_COMPLETE_LOCAL_ONLY');
  assert.equal(second.resumedDates,1);
  assert.equal(second.stagedDates,1);
  assert.equal(second.downloadCalls,1);
  assert.equal(second.localFileWrites,2);
  assert.equal(secondNet.calls.length,2);
  assert.equal(fs.statSync(source(root,a[1])).mtimeMs,old);
  assert.deepEqual(fs.readFileSync(source(root,b[1])),bytes);
  assert.equal(fs.existsSync(path.join(root,'pc-writer')),false);
  assert.equal(fs.existsSync(path.join(root,'market-breadth-r1')),false);
  const audit=JSON.parse(fs.readFileSync(source(root,b[1]).replace(/\.parquet$/,'.audit.json'),'utf8'));
  assert.equal(audit.providerAuthenticityVerified,false,
    'local audit alone must not impersonate independent R41 source provenance');
  assert.doesNotMatch(JSON.stringify(second),/test-only-key|X-Amz-Signature/);
});

test('R45 requires BOTH latest provider sessions; no optional oldest-day exception',async t=>{
  const root=temp(t),dates=lastPair(before);
  for(const selected of [[dates[0]],[dates[1]]]){
    const net=network(dates,{selected});
    const result=await run(root,before,net.fetchImpl,{
      mode:'DOWNLOAD_STAGING',allowDailyPairSourceWrite:true});
    assert.equal(result.status,'PROVIDER_LATEST_PAIR_INCOMPLETE');
    assert.equal(result.downloadCalls,0);
    assert.equal(result.localFileWrites,0);
    assert.equal(net.calls.length,1);
  }
  assert.deepEqual(fs.readdirSync(root),[]);
});

test('R45 refuses conflicting existing R2 source without overwrite or download',async t=>{
  const root=temp(t),dates=lastPair(before),file=source(root,dates[0]);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,Buffer.from('PRESERVE-USER-CONTENT'));
  const net=network(dates);
  const result=await run(root,before,net.fetchImpl,{
    mode:'DOWNLOAD_STAGING',allowDailyPairSourceWrite:true});
  assert.equal(result.status,'STAGING_FILE_CONFLICT');
  assert.equal(result.downloadCalls,0);
  assert.equal(result.localFileWrites,0);
  assert.equal(net.calls.length,1);
  assert.equal(fs.readFileSync(file,'utf8'),'PRESERVE-USER-CONTENT');
});

test('R45 rejects unknown collection window without fetching or writing',async t=>{
  const root=temp(t),net=network(lastPair(before));
  const result=await run(root,before,net.fetchImpl,{collectionWindow:'AUTO_UNSAFE'});
  assert.equal(result.status,'COLLECTION_WINDOW_INVALID');
  assert.equal(net.calls.length,0);
  assert.deepEqual(fs.readdirSync(root),[]);
});

test('R45 CLI explicitly gates daily source writes, retaining old YEAR commands',()=>{
  assert.deepEqual(r45DailyPairCliArgs(['--plan-latest-pair']),{
    mode:'PLAN_ONLY',collectionWindow:'DAILY_PAIR'});
  assert.equal(r45DailyPairCliArgs(['--download-latest-pair-approved']),null);
  assert.equal(r45DailyPairCliArgs(['--download-latest-pair-approved'],{
    operatorConfirmation:'N'}),null);
  assert.deepEqual(r45DailyPairCliArgs(['--download-latest-pair-approved'],{
    operatorConfirmation:'Y'}),{
    mode:'DOWNLOAD_STAGING',collectionWindow:'DAILY_PAIR',
    allowDailyPairSourceWrite:true});
  assert.deepEqual(r45DailyPairCliArgs(['--download-staging']),{
    mode:'DOWNLOAD_STAGING',collectionWindow:'YEAR'});
  assert.equal(r45DailyPairCliArgs(['--download-latest-pair-approved','extra'],{
    operatorConfirmation:'Y'}),null);
});
