import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {preflight,collectOne,readMissingUniverse,runPc} from './market-calendar-r51-price-coverage.mjs';

function fixture(t,{credentials=true,existing=true,missing=['MSFT']}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r51-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'storage'),{recursive:true});
 const dbFile=path.join(root,'storage','core.sqlite'),db=new DatabaseSync(dbFile);
 db.exec('CREATE TABLE public_feed_snapshots_v1(kind TEXT,feed_key TEXT,snapshot_key TEXT,body TEXT)');
 const days=Array.from({length:14},(_,i)=>new Date(Date.parse('2026-10-29T00:00:00Z')+i*86400000).toISOString().slice(0,10));
 const symbols=['AAPL',...missing];
 const html=s=>`<article class="mc-row mc-vendor-row" data-search="${s.toLowerCase()} Company">Earnings</article>`;
 const body={status:'READY_DISPLAY',mode:'OWN_SITE_HTML_ONLY',rawVendorJsonExposed:false,publicJsonFeed:false,redistribution:false,coveredDays:days,byDay:Object.fromEntries(days.map(d=>[d,symbols.map(html)])),recordCount:14*symbols.length,checkedAt:'2026-10-29T04:00:00Z'};
 db.prepare('INSERT INTO public_feed_snapshots_v1 VALUES(?,?,?,?)').run('output','market-calendar:earnings-display-html','current',JSON.stringify(body));db.close();
 if(existing){
  const priceDir=path.join(root,'asset-r10-alpaca','incremental');fs.mkdirSync(priceDir,{recursive:true});
  fs.writeFileSync(path.join(priceDir,'2026-10-27-2026-10-28-group-0.json'),JSON.stringify([{ticker:'AAPL',tradeDate:'2026-10-28',currentClose:270,source:'ALPACA',feed:'iex',adjustmentStatus:'split'}]));
 }
 if(credentials)fs.writeFileSync(path.join(root,'providers.env'),'APCA_API_KEY_ID=test_id\nAPCA_API_SECRET_KEY=test_secret\n');
 return {root,dbFile,directory:path.join(root,'market-calendar-r51-alpaca')};
}
function response(bars,token=null,status=200){return {ok:status===200,status,headers:{get:()=>null},text:async()=>JSON.stringify({bars,next_page_token:token})};}
const bar=(ticker,close=100)=>({t:'2026-10-28T20:00:00Z',c:close,v:100});

test('stages only missing symbols from proven R50 cache and preserves SQLite',t=>{
 const {root,dbFile,directory}=fixture(t),before=fs.readFileSync(dbFile);
 const source=readMissingUniverse({pcHome:root,asOf:'2026-10-29'});
 assert.deepEqual(source.plan.tickers,['MSFT']);
 const result=preflight({pcHome:root,asOf:'2026-10-29'});
 assert.equal(result.status,'R51_PLAN_STAGED');assert.equal(result.missingTickerCount,1);
 assert.equal(result.priceFilesScanned,1);assert.equal(result.providerRequests,0);
 assert.deepEqual(fs.readFileSync(dbFile),before);
 assert.equal(fs.existsSync(path.join(directory,'plan.json')),true);
 assert.equal(preflight({pcHome:root,asOf:'2026-10-29'}).status,'R51_EXISTING_PLAN_VALID');
});
test('single bounded collection stores raw first and validates derived local readback',async t=>{
 const {root,directory}=fixture(t);preflight({pcHome:root,asOf:'2026-10-29'});
 const urls=[],fetchImpl=async(url,options)=>{
  assert.equal(options.headers['APCA-API-KEY-ID'],'test_id');
  assert.equal(url.searchParams.get('feed'),'iex');
  assert.equal(url.searchParams.get('adjustment'),'split');
  urls.push(url.href);
  if(url.searchParams.has('page_token'))return response({MSFT:[bar('MSFT',312)]});
  return response({MSFT:[bar('MSFT',311)]},'p2');
 };
 const r=await collectOne({pcHome:root,fetchImpl,wait:async()=>{}});
 assert.equal(r.status,'R51_PRICE_CONFLICT_STOP'); // same-date conflicting pages STOP, never write derived
 assert.equal(urls.length,2);
 assert.equal(fs.existsSync(path.join(directory,'rows','batch-0000.json')),false);
 assert.equal(fs.existsSync(path.join(directory,'raw','batch-0000-group-0-page-0.json')),true);
 assert.equal(fs.existsSync(path.join(directory,'raw','batch-0000-group-0-page-1.json')),true);
});
test('successful two-page response and subsequent completion is idempotent',async t=>{
 const {root,directory}=fixture(t);preflight({pcHome:root,asOf:'2026-10-29'});
 let calls=0;
 const fetchImpl=async url=>{calls++;return url.searchParams.has('page_token')?response({MSFT:[{t:'2026-10-27T20:00:00Z',c:301,v:5}]}):response({MSFT:[bar('MSFT',312)]},'next');};
 const result=await collectOne({pcHome:root,fetchImpl,wait:async()=>{}});
 assert.equal(result.status,'R51_BATCH_STORED');assert.equal(result.newPriceTickerCandidates,1);
 assert.equal(result.providerRequests,2);assert.equal(result.newRawPages,2);
 const stored=JSON.parse(fs.readFileSync(path.join(directory,'rows','batch-0000.json'),'utf8'));
 assert.equal(stored.rows.length,1);assert.equal(stored.rows[0].tradeDate,'2026-10-28');
 const repeat=await collectOne({pcHome:root,fetchImpl:async()=>{throw Error('SHOULD_NOT_REQUEST');}});
 assert.equal(repeat.status,'R51_ALL_BATCHES_STORED');assert.equal(repeat.providerRequests,0);
 assert.equal(calls,2);
});
test('rate-limit preserves already persisted raw page and resumes without re-request',async t=>{
 const {root,directory}=fixture(t);preflight({pcHome:root,asOf:'2026-10-29'});
 let calls=0;
 const first=await collectOne({pcHome:root,wait:async()=>{},fetchImpl:async(url)=>{
  calls++;return url.searchParams.has('page_token')?response(null,null,429):response({MSFT:[bar('MSFT',300)]},'more');
 }});
 assert.equal(first.status,'R51_PROVIDER_HTTP_429');assert.equal(first.providerRequests,2);
 assert.equal(fs.existsSync(path.join(directory,'rows','batch-0000.json')),false);
 assert.equal(fs.existsSync(path.join(directory,'raw','batch-0000-group-0-page-0.json')),true);
 const again=await collectOne({pcHome:root,wait:async()=>{},fetchImpl:async(url)=>{
  assert.equal(url.searchParams.get('page_token'),'more');calls++;return response({MSFT:[{t:'2026-10-27T20:00:00Z',c:299,v:99}]});
 }});
 assert.equal(again.status,'R51_BATCH_STORED');assert.equal(again.reusedRawPages,1);
 assert.equal(again.providerRequests,1);assert.equal(calls,3);
});
test('invalid provider ticker stops and keeps original DB unchanged',async t=>{
 const {root,dbFile,directory}=fixture(t);preflight({pcHome:root,asOf:'2026-10-29'});
 const before=fs.readFileSync(dbFile);
 const r=await collectOne({pcHome:root,fetchImpl:async()=>response({UNKNOWN:[bar('UNKNOWN')]}),wait:async()=>{}});
 assert.equal(r.status,'R51_PROVIDER_SYMBOL_INVALID');assert.equal(r.providerRequests,1);
 assert.equal(fs.existsSync(path.join(directory,'rows','batch-0000.json')),false);
 assert.deepEqual(fs.readFileSync(dbFile),before);
});
test('missing provider credentials and partial cache are explicit STOPs',t=>{
 const {root}=fixture(t,{credentials:false});
 assert.throws(()=>preflight({pcHome:root,asOf:'2026-10-29'}),/LOCAL_PROVIDER_FILE_MISSING/);
 const f=fixture(t,{existing:false});
 assert.throws(()=>readMissingUniverse({pcHome:f.root,asOf:'2026-10-29'}),/R51_EXISTING_PRICES_INCOMPLETE/);
});
test('own run lock blocks collection; report never logs secrets or ticker names',async t=>{
 const {root,directory}=fixture(t);preflight({pcHome:root,asOf:'2026-10-29'});
 fs.writeFileSync(path.join(directory,'run.lock'),'prior-run');
 await assert.rejects(()=>collectOne({pcHome:root}),/R51_CONCURRENT_RUN_STOP/);
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r51-result-'));t.after(()=>fs.rmSync(out,{recursive:true,force:true}));
 const report=await runPc({mode:'collect',pcHome:root,outputDir:out});
 assert.equal(report.status,'R51_CONCURRENT_RUN_STOP');
 const data=fs.readFileSync(path.join(out,report.file),'utf8');
 assert.doesNotMatch(data,/test_secret|MSFT|AAPL/);
});
test('more than 120 missing symbols proceeds by batch with 40-symbol groups',async t=>{
 const missing=Array.from({length:121},(_,i)=>`R${String(i).padStart(4,'0')}`);
 const {root,directory}=fixture(t,{missing});
 const plan=preflight({pcHome:root,asOf:'2026-10-29'});
 assert.equal(plan.missingTickerCount,121);assert.equal(plan.batchCount,2);
 const queries=[];
 const fetchImpl=async url=>{
  const symbols=url.searchParams.get('symbols').split(',');queries.push(symbols);
  return response(Object.fromEntries(symbols.map(s=>[s,[bar(s,101)]])));
 };
 const first=await collectOne({pcHome:root,fetchImpl,wait:async()=>{}});
 assert.equal(first.status,'R51_BATCH_STORED');assert.equal(first.newPriceTickerCandidates,120);
 assert.equal(first.providerRequests,3);assert.equal(queries[0].length,40);
 const second=await collectOne({pcHome:root,fetchImpl,wait:async()=>{}});
 assert.equal(second.status,'R51_BATCH_STORED');assert.equal(second.newPriceTickerCandidates,1);
 assert.equal(second.providerRequests,1);
 assert.equal((await collectOne({pcHome:root,fetchImpl:async()=>{throw Error('NO_REPEAT');}})).status,'R51_ALL_BATCHES_STORED');
 assert.equal(fs.readdirSync(path.join(directory,'rows')).length,2);
});
test('invalid preexisting batch is not skipped or overwritten',async t=>{
 const {root,directory}=fixture(t);preflight({pcHome:root,asOf:'2026-10-29'});
 fs.mkdirSync(path.join(directory,'rows'));
 fs.writeFileSync(path.join(directory,'rows','batch-0000.json'),JSON.stringify({index:0,rows:[]}));
 await assert.rejects(()=>collectOne({pcHome:root,fetchImpl:async()=>{throw Error('NO_API');}}),/R51_PREVIOUS_BATCH_CORRUPT_STOP/);
});
