import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {providerForUrl,policyForProvider} from '../scripts/pc-writer/quota-policy.mjs';
import {QuotaLedger,alpacaQuotaLedgerPath} from '../scripts/pc-writer/quota-ledger.mjs';
import {createQuotaFetch} from '../scripts/pc-writer/quota-fetch.mjs';
import {collectAlpacaIncremental} from '../scripts/pc-writer/alpaca-incremental.mjs';

const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r10-alpaca-quota-'));
const headers=(remaining,reset=Date.now()+60_000,limit=200)=>new Headers({
 'X-RateLimit-Limit':String(limit),'X-RateLimit-Remaining':String(remaining),
 'X-RateLimit-Reset':String(Math.ceil(reset/1000))});
const runner=(base,count,index)=>new Promise((resolve,reject)=>{
 const worker=path.join(path.dirname(fileURLToPath(import.meta.url)),'alpaca-quota-worker.mjs');
 const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>name!=='NODE_TEST_CONTEXT'));
 const ps=spawn(process.execPath,[worker,base,String(count),String(index)],{stdio:['ignore','pipe','pipe'],env});
 let stderr='';ps.stderr.on('data',d=>stderr+=d);
 ps.on('error',reject);ps.on('close',code=>{
  if(code!==0)return reject(Error('worker exit '+code+' '+stderr.slice(0,100)));
  try{resolve(JSON.parse(fs.readFileSync(path.join(base,`worker-result-${index}.json`),'utf8')));}
  catch{reject(Error('worker result unavailable'));}
 });
});

test('official Alpaca host maps to 140 hard / 120 warning / 60 reserved',()=>{
 assert.equal(providerForUrl('https://data.alpaca.markets/v2/stocks/bars'),'ALPACA');
 assert.equal(providerForUrl('https://data.alpaca.markets.evil.test/'),null);
 assert.deepEqual([policyForProvider('ALPACA').perMinute,policyForProvider('ALPACA').warningPerMinute,
  policyForProvider('ALPACA').protectedRemaining],[140,120,60]);
});

test('even observe-mode callers are warned at 120 and blocked at 140',()=>{
 const base=temp(),ledger=new QuotaLedger(base,{mode:'observe'}),now=Date.now();
 for(let i=0;i<140;i++)ledger.beforeRequest('ALPACA',now);
 assert.equal(ledger.summary().warnings>=21,true);
 assert.throws(()=>ledger.beforeRequest('ALPACA',now),e=>e.code==='PROVIDER_QUOTA_GUARD');
 const saved=JSON.parse(fs.readFileSync(alpacaQuotaLedgerPath(base),'utf8'));
 assert.equal(saved.requestTimes.length,140);
 assert.equal(saved.requestTimes.every(x=>x===now),true);
 assert.equal(ledger.summary().guarded,1);
});

test('two independent ledger instances share latest reservations',()=>{
 const base=temp(),a=new QuotaLedger(base),b=new QuotaLedger(base),now=Date.now();
 for(let i=0;i<70;i++){a.beforeRequest('ALPACA',now);b.beforeRequest('ALPACA',now);}
 assert.throws(()=>a.beforeRequest('ALPACA',now),/PROVIDER_QUOTA_GUARD/);
 assert.throws(()=>b.beforeRequest('ALPACA',now),/PROVIDER_QUOTA_GUARD/);
 assert.equal(JSON.parse(fs.readFileSync(alpacaQuotaLedgerPath(base),'utf8')).requestTimes.length,140);
});

for(const processes of [1,2,3])test(`real OS-process concurrency ${processes} collectors never exceed 140/min`,async()=>{
 const base=temp();const results=await Promise.all(Array.from({length:processes},(_,i)=>runner(base,180,i)));
 assert.equal(results.reduce((sum,x)=>sum+x.allowed,0),140);
 assert.equal(results.reduce((sum,x)=>sum+x.blocked,0),180*processes-140);
 assert.equal(JSON.parse(fs.readFileSync(alpacaQuotaLedgerPath(base),'utf8')).requestTimes.length,140);
});

test('remote Remaining/Reset protect 60 slots even before local count reaches 140',async()=>{
 const base=temp();let called=0;
 const {fetch}=createQuotaFetch({base,mode:'observe',originalFetch:async()=>{
  called++;return {status:200,ok:true,headers:headers(61)};
 }});
 await fetch('https://data.alpaca.markets/v2/stocks/bars');
 await fetch('https://data.alpaca.markets/v2/stocks/bars');
 await assert.rejects(fetch('https://data.alpaca.markets/v2/stocks/bars'),e=>e.code==='PROVIDER_QUOTA_GUARD');
 assert.equal(called,2);
});

test('remote 429 without usable headers triggers conservative cooldown',async()=>{
 const base=temp(),{fetch}=createQuotaFetch({base,originalFetch:async()=>({status:429,ok:false,headers:new Headers()})});
 await fetch('https://data.alpaca.markets/v2/stocks/bars');
 await assert.rejects(fetch('https://data.alpaca.markets/v2/stocks/bars'),e=>e.code==='PROVIDER_QUOTA_GUARD');
});

test('corrupt shared quota state fails closed without sending a request',async()=>{
 const base=temp();fs.writeFileSync(alpacaQuotaLedgerPath(base),'invalid-json');
 let calls=0;const {fetch}=createQuotaFetch({base,originalFetch:async()=>{calls++;return {status:200,ok:true};}});
 await assert.rejects(fetch('https://data.alpaca.markets/v2/stocks/bars'),e=>e.code==='PROVIDER_QUOTA_GUARD');
 assert.equal(calls,0);
});

test('five-minute-old quota lock from confirmed dead process is reclaimed, never the Core lock',()=>{
 const base=temp(),lock=path.join(base,'alpaca-quota-reservation.lock');
 const core=path.join(base,'local-cycle.lock');fs.writeFileSync(core,'keep');
 fs.mkdirSync(lock);
 const old=Date.now()-6*60_000;
 fs.writeFileSync(path.join(lock,'owner.json'),JSON.stringify({pid:2147483647,startedAt:old}));
 fs.utimesSync(lock,new Date(old),new Date(old));
 new QuotaLedger(base).beforeRequest('ALPACA',Date.now());
 assert.equal(fs.existsSync(lock),false);
 assert.equal(fs.readFileSync(core,'utf8'),'keep');
});

test('existing live-owner quota lock is never force-released',()=>{
 const base=temp(),lock=path.join(base,'alpaca-quota-reservation.lock');
 fs.mkdirSync(lock);const old=Date.now()-6*60_000;
 fs.writeFileSync(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid,startedAt:old}));
 fs.utimesSync(lock,new Date(old),new Date(old));
 assert.throws(()=>new QuotaLedger(base).beforeRequest('ALPACA',Date.now()),e=>e.code==='PROVIDER_QUOTA_GUARD');
 assert.equal(fs.existsSync(lock),true);
});

const prepare=(now,groupNames=['group-01.json'])=>{
 const base=temp(),dir=path.join(base,'asset-r10-alpaca');fs.mkdirSync(dir);
 fs.writeFileSync(path.join(base,'providers.env'),'APCA_API_KEY_ID=test-placeholder\nAPCA_API_SECRET_KEY=test-placeholder\n');
 const end=new Date(now-86400000).toISOString().slice(0,10);
 const start='2026-10-25';
 fs.writeFileSync(path.join(dir,'checkpoint.json'),JSON.stringify({end:start}));
 for(const name of groupNames)fs.writeFileSync(path.join(dir,name),JSON.stringify([{ticker:'ABC'}]));
 return {base,dir,start,end};
};

test('R10 collector preserves complete multi-page group and verified checkpoint',async()=>{
 const now=Date.now(),{base,dir,start,end}=prepare(now);
 let calls=0;
 const fetchImpl=async()=>{calls++;return {ok:true,status:200,headers:headers(180),json:async()=>({
  bars:{ABC:[{t:'2026-10-29T00:00:00Z',c:10,v:100}]},next_page_token:calls===1?'page-2':null})};};
 const r=await collectAlpacaIncremental(base,{now,fetchImpl,wait:async()=>{}});
 assert.equal(r.status,'COLLECTED_PENDING_VALIDATION');
 assert.equal(r.runRequests,2);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'incremental-checkpoint.json'),'utf8')).through,end);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'incremental',`${start}-${end}-group-01.json`),'utf8')).length,2);
});

test('R10 collector defers on shared guard and preserves prior completed checkpoint',async()=>{
 const now=Date.now(),{base,dir,start}=prepare(now);
 const prior={through:start};
 fs.writeFileSync(path.join(dir,'incremental-checkpoint.json'),JSON.stringify(prior));
 const ledger=new QuotaLedger(base);
 for(let i=0;i<140;i++)ledger.beforeRequest('ALPACA',now);
 let calls=0;
 const r=await collectAlpacaIncremental(base,{now,fetchImpl:async()=>{calls++;throw Error('unexpected call');},wait:async()=>{}});
 assert.equal(r.status,'DEFERRED_QUOTA');
 assert.equal(r.runRequests,0);
 assert.equal(calls,0);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'incremental-checkpoint.json'),'utf8')),prior);
});

test('R10 collector treats server 429 as deferred, preserving stored checkpoint',async()=>{
 const now=Date.now(),{base,dir,start}=prepare(now);
 fs.writeFileSync(path.join(dir,'incremental-checkpoint.json'),JSON.stringify({through:start}));
 const r=await collectAlpacaIncremental(base,{now,fetchImpl:async()=>({status:429,ok:false,headers:headers(0)}),wait:async()=>{}});
 assert.equal(r.status,'DEFERRED_QUOTA');
 assert.equal(r.errorCode,'ALPACA_RATE_LIMITED');
 assert.equal(r.runRequests,1);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'incremental-checkpoint.json'),'utf8')),{through:start});
});

test('120-page ceiling defers then resumes at page 121 without re-fetching pages',async()=>{
 const now=Date.now(),{base,dir,start,end}=prepare(now);
 let calls=0;
 const fetchImpl=async url=>{
  const page=new URL(url).searchParams.get('page_token');
  const expected=page?Number(page.slice(2)):1;
  assert.equal(expected,calls+1);
  calls++;
  return {ok:true,status:200,headers:headers(200),json:async()=>({
   bars:{ABC:[{t:'2026-10-29T00:00:00Z',c:calls,v:100}]},
   next_page_token:calls<125?`p-${calls+1}`:null})};
 };
 const first=await collectAlpacaIncremental(base,{now,fetchImpl,wait:async()=>{}});
 assert.equal(first.status,'DEFERRED_QUOTA');
 assert.equal(first.runRequests,120);
 assert.equal(calls,120);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'incremental-progress.json'),'utf8')).active.rows.length,120);
 assert.equal(fs.existsSync(path.join(dir,'incremental-checkpoint.json')),false);
 // Simulate the next rate-limit window; production never resets the ledger.
 const q=JSON.parse(fs.readFileSync(alpacaQuotaLedgerPath(base),'utf8'));
 Object.assign(q,{requestTimes:[],lastRemoteLimit:null,lastRemoteRemaining:null,lastRemoteResetAt:null});
 fs.writeFileSync(alpacaQuotaLedgerPath(base),JSON.stringify(q));
 const second=await collectAlpacaIncremental(base,{now,fetchImpl,wait:async()=>{}});
 assert.equal(second.status,'COLLECTED_PENDING_VALIDATION');
 assert.equal(second.runRequests,5);
 assert.equal(calls,125);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'incremental',`${start}-${end}-group-01.json`),'utf8')).length,125);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'incremental-checkpoint.json'),'utf8')).through,end);
});

test('approved 20-hour completed-window recheck is not suppressed by page-resume state',async()=>{
 const firstAt=Date.parse('2026-11-02T00:30:00Z');
 const {base,dir}=prepare(firstAt);
 let calls=0;
 const fetchImpl=async()=>{calls++;return {ok:true,status:200,headers:headers(200),
  json:async()=>({bars:{ABC:[{t:'2026-11-01T00:00:00Z',c:10,v:100}]},next_page_token:null})};};
 const first=await collectAlpacaIncremental(base,{now:firstAt,fetchImpl,wait:async()=>{}});
 assert.equal(first.status,'COLLECTED_PENDING_VALIDATION');
 const second=await collectAlpacaIncremental(base,{now:firstAt+21*3600000,fetchImpl,wait:async()=>{}});
 assert.equal(second.status,'COLLECTED_PENDING_VALIDATION');
 assert.equal(calls,2);
 assert.equal(fs.existsSync(path.join(dir,'incremental-progress.json')),true);
});
