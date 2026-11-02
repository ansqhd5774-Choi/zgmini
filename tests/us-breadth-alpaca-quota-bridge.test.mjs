import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createQuotaFetch} from '../scripts/pc-writer/quota-fetch.mjs';
import {collectUsBreadthProvisional,US_PROVISIONAL_FILE} from '../scripts/pc-writer/us-breadth-provisional-cycle.mjs';
import {collectSectorFearGreedR3EtfIncremental} from '../scripts/pc-writer/sector-fear-greed-r3-etf-incremental.mjs';
import {SECTOR_FEAR_GREED_R3_BENCHMARKS} from '../lib/market-score/sector-fear-greed-r3-rolling.mjs';

const at=Date.parse('2026-10-30T14:01:00Z');
const auth={APCA_API_KEY_ID:'MOCK_ONLY',APCA_API_SECRET_KEY:'MOCK_ONLY'};
const quotaUrl='https://data.alpaca.markets/v2/stocks/bars?symbols=MOCK';
const members=['T0'];

function withFixture(fn){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'us-breadth-quota-'));
 const previous={version:1,raw:{previous:'confirmed-raw'},output:{previous:'provisional-output'},
  lastAttemptSlot:'previous-15m-slot',attemptStatus:'LOCAL_READY'};
 fs.writeFileSync(path.join(base,US_PROVISIONAL_FILE),JSON.stringify(previous));
 return Promise.resolve().then(()=>fn(base,previous)).finally(()=>fs.rmSync(base,{recursive:true,force:true}));
}

const collect=(base,fetchImpl,now=at)=>collectUsBreadthProvisional(base,{
 now,fetchImpl,authOverride:auth,membersOverride:members,
});
const rawAfter=base=>JSON.parse(fs.readFileSync(path.join(base,US_PROVISIONAL_FILE),'utf8'));

test('US breadth independent Node shares the 140/min Alpaca ledger and blocks before HTTP',()=>withFixture(async(base,previous)=>{
 let sent=0;
 const fakeFetch=async()=>{sent++;return Response.json({bars:{}});};
 const shared=createQuotaFetch({base,originalFetch:fakeFetch,mode:'enforce'}).fetch;
 for(let i=0;i<140;i++)await shared(quotaUrl);
 const out=await collect(base,fakeFetch);
 assert.equal(out.status,'DEFERRED_QUOTA');
 assert.equal(out.code,'US_PROVISIONAL_QUOTA_GUARD');
 assert.equal(out.providerCalls,0);
 assert.equal(sent,140);
 assert.deepEqual(rawAfter(base).raw,previous.raw);
 assert.deepEqual(rawAfter(base).output,previous.output);
 assert.equal(rawAfter(base).attemptStatus,'DEFERRED_QUOTA');
}));

test('HTTP 429 defers to next slot, counts one API call and preserves provisional raw',()=>withFixture(async(base,previous)=>{
 let sent=0;
 const fakeFetch=async()=>{sent++;return new Response(null,{status:429});};
 const out=await collect(base,fakeFetch);
 assert.equal(out.status,'DEFERRED_QUOTA');
 assert.equal(out.code,'US_PROVISIONAL_HTTP_429');
 assert.equal(out.providerCalls,1);
 assert.equal(sent,1);
 assert.deepEqual(rawAfter(base).raw,previous.raw);
 assert.deepEqual(rawAfter(base).output,previous.output);
 const repeat=await collect(base,fakeFetch,at+60_000);
 assert.equal(repeat.status,'ALREADY_ATTEMPTED_THIS_SLOT');
 assert.equal(sent,1);
}));

test('post-request quota ledger lock reports one actual sent call and leaves raw unchanged',()=>withFixture(async(base,previous)=>{
 let sent=0;
 const out=await collect(base,async()=>{
  sent++;
  fs.mkdirSync(path.join(base,'alpaca-quota-reservation.lock'));
  return Response.json({bars:{}});
 });
 assert.equal(out.status,'DEFERRED_QUOTA');
 assert.equal(out.code,'US_PROVISIONAL_LEDGER_UPDATE_UNVERIFIED');
 assert.equal(out.providerCalls,1);
 assert.equal(sent,1);
 assert.deepEqual(rawAfter(base).raw,previous.raw);
 assert.deepEqual(rawAfter(base).output,previous.output);
}));

test('page-two 429 counts both sent pages even though fetchIexWindow never returned',()=>withFixture(async(base,previous)=>{
 let sent=0;
 const out=await collect(base,async()=>{
  sent++;
  if(sent===2)return new Response(null,{status:429});
  return Response.json({bars:{T0:[{t:'2026-10-29T04:00:00Z',c:100,v:10}]},next_page_token:'next'});
 });
 assert.equal(out.status,'DEFERRED_QUOTA');
 assert.equal(out.providerCalls,2);
 assert.equal(sent,2);
 assert.deepEqual(rawAfter(base).raw,previous.raw);
 assert.deepEqual(rawAfter(base).output,previous.output);
}));

test('nonquota Alpaca 503 keeps original failure category without updating raw',()=>withFixture(async(base,previous)=>{
 const out=await collect(base,async()=>new Response(null,{status:503}));
 assert.equal(out.status,'FAILED_PREVIOUS_PROVISIONAL_PRESERVED');
 assert.equal(out.code,'US_PROVISIONAL_HTTP_503');
 assert.equal(out.providerCalls,1);
 assert.deepEqual(rawAfter(base).raw,previous.raw);
 assert.deepEqual(rawAfter(base).output,previous.output);
}));

function runQuotaNode(base,attempts,mode='observe'){
 const fixture=fileURLToPath(new URL('./fixtures/alpaca-quota-mock-process.mjs',import.meta.url));
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[fixture,base,String(attempts),mode],
   {windowsHide:true,stdio:['ignore','pipe','pipe']});
  let out='',err='';
  child.stdout.on('data',buffer=>{out+=buffer.toString();});
  child.stderr.on('data',buffer=>{err+=buffer.toString();});
  child.once('error',reject);
  // 'close' waits for stdout/stderr pipes to drain; 'exit' can race the JSON.
  child.once('close',code=>{
   if(code!==0)return reject(Error(`ISOLATED_QUOTA_CHILD_FAILED:${code}:${err.slice(0,250)}`));
   try{resolve(JSON.parse(out));}catch(error){reject(Error(`QUOTA_CHILD_OUTPUT_INVALID:${JSON.stringify({out,err,code})}`));}
  });
 });
}

test('three independent mock Node processes share 140 reservations even in observe mode',async t=>{
 // Some restricted sandboxes return exit 0 for nested Node without executing
 // its script. Do not report a false quota failure in that environment.
 const probe=spawnSync(process.execPath,['--eval','process.stdout.write("NESTED_NODE_READY")'],
  {encoding:'utf8',windowsHide:true});
 if(probe.error?.code==='EPERM'){
  t.skip('sandbox forbids nested Node; run three top-level mock workers');
  return;
 }
 assert.ifError(probe.error);
 assert.equal(probe.status,0);
 assert.equal(probe.stdout,'NESTED_NODE_READY');
 await withFixture(async base=>{
 // Wait for every subprocess before fixture deletion, including on a child error.
 const outcomes=await Promise.allSettled(Array.from({length:3},()=>runQuotaNode(base,180,'observe')));
 assert.ok(outcomes.every(outcome=>outcome.status==='fulfilled'),
  outcomes.map(outcome=>outcome.status==='rejected'?String(outcome.reason):'PASS').join('; '));
 const nodes=outcomes.map(outcome=>outcome.value);
 const sent=nodes.reduce((sum,item)=>sum+item.sent,0);
 const guarded=nodes.reduce((sum,item)=>sum+item.guarded,0);
 assert.equal(sent,140);
 assert.equal(guarded,400);
 assert.equal(sent+guarded,540);
 const ledger=JSON.parse(fs.readFileSync(path.join(base,'alpaca-quota-ledger.json'),'utf8'));
 assert.equal(ledger.requestTimes.length,140);
 });
});

test('Alpaca is enforced at 140 even when general quota mode is observe',()=>withFixture(async base=>{
 let sent=0;
 const quota=createQuotaFetch({base,mode:'observe',originalFetch:async()=>{
  sent++;return new Response(null,{status:200});
 }});
 for(let i=0;i<140;i++)await quota.fetch(quotaUrl);
 await assert.rejects(quota.fetch(quotaUrl),error=>
  error.code==='PROVIDER_QUOTA_GUARD'&&error.reason==='ALPACA_LOCAL_140');
 assert.equal(sent,140);
}));

test('ETF Core-injected fetch is guarded, while its standalone default fetch can bypass',()=>withFixture(async base=>{
 fs.writeFileSync(path.join(base,'providers.env'),
  'APCA_API_KEY_ID=MOCK_ONLY\nAPCA_API_SECRET_KEY=MOCK_ONLY\n');
 fs.writeFileSync(path.join(base,'local-sector-fear-greed-r1-iex-price-history.json'),
  JSON.stringify({series:Object.fromEntries(SECTOR_FEAR_GREED_R3_BENCHMARKS.map(ticker=>
   [ticker,[{date:'2026-10-29',close:100,volume:10}]]))}));
 let sent=0;
 const mockedHttp=async()=>{sent++;return new Response(null,{status:429});};
 const shared=createQuotaFetch({base,mode:'observe',originalFetch:mockedHttp}).fetch;
 // Preload through the real guard without sending any provider request.
 const prefill=createQuotaFetch({base,mode:'observe',
  originalFetch:async()=>new Response(null,{status:200})}).fetch;
 for(let i=0;i<140;i++)await prefill(quotaUrl);
 await assert.rejects(collectSectorFearGreedR3EtfIncremental(base,{fetchImpl:shared,
  now:Date.parse('2026-11-02T13:00:00Z')}));
 assert.equal(sent,0,'Core-injected quota wrapper must stop before provider HTTP');
 const originalFetch=globalThis.fetch;
 try{
  globalThis.fetch=mockedHttp;
  await assert.rejects(collectSectorFearGreedR3EtfIncremental(base,{
   now:Date.parse('2026-11-02T13:00:00Z')}));
 }finally{globalThis.fetch=originalFetch;}
 assert.equal(sent,1,'standalone default fetch currently bypasses quota wrapper');
}));
