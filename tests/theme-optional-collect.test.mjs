import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {collectOptional} from '../scripts/pc-writer/theme-optional-collect.mjs';
import {inspectManifest} from '../scripts/pc-writer/theme-data-inventory.mjs';
test('bounded pages resume without redownloading committed pages and raw hashes are verifiable',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-collect-'));let calls=0;
 const fetchImpl=async url=>{calls++;assert.equal(url.origin,'https://getmarkethistory.com');
  assert.match(url.pathname,/^\/api\/v1\/bars\/stocks\/us\/(?:IBB|XBI|SPY)\/1h$/,
   'full stocks/us dataset path is required by official 2026-11 contract');
  assert.equal(url.searchParams.has('source'),false);
  assert.equal(url.searchParams.has('symbol'),false);
  const s=url.pathname.split('/').at(-2),page=url.searchParams.get('cursor')==='page2'?2:1;
  const body=JSON.stringify({symbol:s,timestamp:`2026-10-${20+page}T19:00:00Z`,close:100+page,is_gap:false})+'\n';return new Response(body,{headers:page===1?{'x-next-cursor':'page2'}:{}});};
 try{const opts={dataRoot:root,themeId:'biotech',start:'2026-10-20',end:'2026-10-23',fetchImpl};
  const first=await collectOptional(opts);assert.equal(first.providerCalls,4);assert.equal(first.status,'CHECKPOINT_READY_TO_RESUME');
  const second=await collectOptional(opts);assert.equal(second.providerCalls,2);assert.equal(second.status,'PRIVATE_RAW_COLLECTION_COMPLETE');
  const third=await collectOptional(opts);assert.equal(third.providerCalls,0);assert.equal(calls,6);
  assert.equal(inspectManifest(root,'themes/biotech/raw-manifest.json','biotech').status,'SHA_VERIFIED');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('provider failure persists a stop checkpoint and is never retried automatically',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-collect-fail-'));let calls=0;
 try{const opts={dataRoot:root,themeId:'ai-semiconductor',start:'2026-10-20',end:'2026-10-23',fetchImpl:async()=>{calls++;return new Response('',{status:429})}};
  assert.equal((await collectOptional(opts)).status,'STOP_HTTP_429');assert.equal((await collectOptional(opts)).status,'STOP_PREVIOUS_FAILURE_REVIEW_REQUIRED');assert.equal(calls,1);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('a new daily AI window makes fresh provider requests while keeping identical raw bars deduplicated',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-ai-daily-'));let calls=0;
 const fetchImpl=async url=>{
  calls++;
  assert.match(url.pathname,/^\/api\/v1\/bars\/stocks\/us\/(?:SMH|SOXX|SPY)\/1h$/);
  const symbol=url.pathname.split('/').at(-2);
  return new Response(JSON.stringify({symbol,timestamp:'2026-10-21T19:00:00Z',close:100,is_gap:false})+'\n');
 };
 try{
  const opts={dataRoot:root,themeId:'ai-semiconductor',start:'2026-10-15',fetchImpl};
  const day1=await collectOptional({...opts,end:'2026-10-23'});
  assert.equal(day1.status,'PRIVATE_RAW_COLLECTION_COMPLETE');assert.equal(day1.providerCalls,3);
  const repeat=await collectOptional({...opts,end:'2026-10-23'});
  assert.equal(repeat.providerCalls,0);
  const day2=await collectOptional({...opts,end:'2026-10-24'});
  assert.equal(day2.status,'PRIVATE_RAW_COLLECTION_COMPLETE');assert.equal(day2.providerCalls,3);
  assert.equal(calls,6);
  const entries=JSON.parse(fs.readFileSync(path.join(root,'themes/ai-semiconductor/raw-manifest.json'),'utf8')).files;
  assert.equal(entries.length,3);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

for(const scenario of [
 {id:'out-of-window',timestamp:'2026-11-10T19:00:00Z',is_gap:false},
 {id:'gap-with-positive-close',timestamp:'2026-10-21T19:00:00Z',is_gap:true},
]){
 test('GMH raw collector rejects '+scenario.id+' before manifest/checkpoint commit and refuses automatic retry',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-raw-provenance-'+scenario.id+'-'));
  let calls=0;
  const opts={dataRoot:root,themeId:'biotech',start:'2026-10-20',end:'2026-10-23',
   fetchImpl:async url=>{
    calls++;
    assert.match(url.pathname,/^\/api\/v1\/bars\/stocks\/us\/IBB\/1h$/);
    return new Response(JSON.stringify({symbol:'IBB',timestamp:scenario.timestamp,
     close:120.5,is_gap:scenario.is_gap})+'\n',
     {status:200,headers:{'content-type':'application/x-ndjson'}});
   },
   now:()=> '2026-11-15T00:00:00.000Z',
  };
  try{
   await assert.rejects(()=>collectOptional(opts),/BAR_INVALID/);
   assert.equal(calls,1,'a bad successful HTTP response must never trigger another GET');
   const home=path.join(root,'themes/biotech');
   assert.deepEqual(fs.readdirSync(path.join(home,'raw')),[],
    'rejected rows cannot create content-addressed private bar files');
   assert.equal(fs.existsSync(path.join(home,'raw-manifest.json')),false,
    'rejected provider pages cannot be represented as SHA-verified originals');
   const checkpointName=fs.readdirSync(path.join(home,'state'))
    .find(name=>/^collection-[a-f0-9]{16}\.json$/.test(name));
   assert.ok(checkpointName,'source must still preserve the failed-attempt ledger');
   const state=JSON.parse(fs.readFileSync(path.join(home,'state',checkpointName),'utf8'));
   assert.equal(state.reason,'REQUEST_NOT_COMMITTED');
   assert.equal(state.failedAt,'2026-11-15T00:00:00.000Z');
   assert.equal(state.symbols.IBB.pages,0);
   assert.equal(state.symbols.IBB.files.length,0);
   const second=await collectOptional(opts);
   assert.equal(second.status,'STOP_PREVIOUS_FAILURE_REVIEW_REQUIRED');
   assert.equal(second.providerCalls,0);
   assert.equal(calls,1,'same request remains fail-closed until explicit review');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
 });
}
