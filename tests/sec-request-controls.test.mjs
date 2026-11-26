import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createSecSharedLimiter,secRetryDecision,classifySecEndpointSet,fetchSecControlled} from '../scripts/pc-writer/sec-request-controls.mjs';

function temp(fn){const base=fs.mkdtempSync(path.join(os.tmpdir(),'sec-hardening-'));return Promise.resolve().then(()=>fn(base)).finally(()=>fs.rmSync(base,{recursive:true,force:true}));}
const required={id:'required-frame',required:true,status:200,parsed:true,storedAndReadback:true};
const optional={id:'optional-frame',required:false,status:404,absenceOfficiallyVerified:true};
const classify=entries=>classifySecEndpointSet({sourceFresh:true,requiredContractKnown:true,endpoints:entries});
const cases=[
['optional documented 404 and stored required data => normal',()=>assert.equal(classify([required,optional]).state,'normal')],
['unproven optional 404 => failed',()=>assert.equal(classify([required,{...optional,absenceOfficiallyVerified:false}]).state,'failed')],
['mandatory 404 => failed',()=>assert.equal(classify([{...required,status:404},optional]).state,'failed')],
['403 remains failed',()=>assert.equal(classify([{...required,status:403}]).state,'failed')],
['429 remains failed without verified retry',()=>assert.equal(classify([{...required,status:429}]).state,'failed')],
['503 remains failed without verified retry',()=>assert.equal(classify([{...required,status:503}]).state,'failed')],
['HTTP200 invalid parse => failed',()=>assert.equal(classify([{...required,parsed:false}]).state,'failed')],
['HTTP200 missing stored readback => failed',()=>assert.equal(classify([{...required,storedAndReadback:false}]).state,'failed')],
['unverified freshness => unknown',()=>assert.equal(classifySecEndpointSet({endpoints:[required],requiredContractKnown:true}).state,'unknown')],
['unverified required contract => unknown',()=>assert.equal(classifySecEndpointSet({endpoints:[required],sourceFresh:true}).state,'unknown')],
['no mandatory source => unknown',()=>assert.equal(classify([optional]).state,'unknown')],
['duplicate evidence ids => unknown',()=>assert.equal(classify([required,{...required}]).state,'unknown')],
['unknown HTTP response => unknown',()=>assert.equal(classify([{...required,status:null}]).state,'unknown')],
['all required good => normal',()=>assert.equal(classify([required]).state,'normal')],
['429 first retry permitted',()=>assert.equal(secRetryDecision({status:429,attempt:1}).retry,true)],
['503 first retry permitted',()=>assert.equal(secRetryDecision({status:503,attempt:1}).retry,true)],
['500 first retry permitted',()=>assert.equal(secRetryDecision({status:500,attempt:1}).retry,true)],
['404 is terminal',()=>assert.equal(secRetryDecision({status:404,attempt:1}).retry,false)],
['403 is terminal',()=>assert.equal(secRetryDecision({status:403,attempt:1}).retry,false)],
['max attempts enforced',()=>assert.equal(secRetryDecision({status:429,attempt:3,maxAttempts:3}).retry,false)],
['non-idempotent request not retried',()=>assert.equal(secRetryDecision({status:503,method:'POST',attempt:1}).retry,false)],
['malformed attempt not retried',()=>assert.equal(secRetryDecision({status:503,attempt:0}).retry,false)],
];
for(const [name,fn] of cases)test(name,fn);
test('real 3 child processes x10 SEC reservations respect global 10/sec (not 30/sec)',async()=>temp(async base=>{
 const run=()=>new Promise((resolve,reject)=>{
  const child=fork(path.join(path.dirname(fileURLToPath(import.meta.url)),'worker-sec-burst.mjs'),[base,'10'],{stdio:['ignore','ignore','pipe','ipc']});
  child.on('message',m=>m.ok?resolve(m.at):reject(Error(m.code)));
  child.on('error',reject);child.on('exit',code=>{if(code)reject(Error(`child exit ${code}`));});
 });
 const arrays=await Promise.all([run(),run(),run()]);
 const sorted=arrays.flat().sort((a,b)=>a-b);assert.equal(sorted.length,30);
 assert.ok(sorted.at(-1)-sorted[0]>=2900,'all 30 globally spaced by >=100 ms');
 for(let i=1;i<sorted.length;i++)assert.ok(sorted[i]-sorted[i-1]>=100,`two reservations only ${sorted[i]-sorted[i-1]}ms apart`);
 for(const t of sorted)assert.ok(sorted.filter(x=>x>=t&&x<t+1000).length<=10);
}));
test('simultaneous requests in one process are safe',async()=>temp(async base=>{
 const limiter=createSecSharedLimiter({base,maxWaitMs:8000});
 const a=(await Promise.all(Array.from({length:12},()=>limiter.reserve()))).map(x=>x.at).sort((x,y)=>x-y);
 assert.ok(a.at(-1)-a[0]>=1100);
}));
test('global 429 Retry-After delays next SEC reservation without dropping it',async()=>temp(async base=>{
 const gate=createSecSharedLimiter({base,maxWaitMs:10000});await gate.reserve();
 const before=Date.now();gate.noteResponse({status:429,retryAfter:'2'});const next=await gate.reserve();
 assert.ok(next.at-before>=1950);
}));
test('global 503 cooldown delays next request',async()=>temp(async base=>{
 const gate=createSecSharedLimiter({base,maxWaitMs:10000});await gate.reserve();const t=Date.now();gate.noteResponse({status:503});const x=await gate.reserve();assert.ok(x.at-t>=950);
}));
test('uncertain lock owner fails closed, never bypasses SEC limit',async()=>temp(async base=>{
 const lock=path.join(base,'sec-shared-reservation.lock');fs.mkdirSync(lock);
 const gate=createSecSharedLimiter({base,maxWaitMs:100});
 await assert.rejects(gate.reserve(),x=>x.code==='SEC_LOCK_BUSY');
 assert.ok(fs.existsSync(lock));
}));
test('corrupt ledger fails closed',async()=>temp(async base=>{
 fs.writeFileSync(path.join(base,'sec-shared-reservations.json'),'{\"version\": 7}');
 await assert.rejects(createSecSharedLimiter({base}).reserve(),x=>x.code==='SEC_LEDGER_INVALID');
}));
test('future drift in ledger fails closed',async()=>temp(async base=>{
 fs.writeFileSync(path.join(base,'sec-shared-reservations.json'),JSON.stringify({version:1,lastReservedAt:Date.now()+120000,cooldownUntil:0}));
 await assert.rejects(createSecSharedLimiter({base}).reserve(),x=>x.code==='SEC_CLOCK_OR_COOLDOWN_INVALID');
}));
test('queue deadline fails closed, not unlimited wait',async()=>temp(async base=>{
 const gate=createSecSharedLimiter({base,maxWaitMs:2});await gate.reserve();
 await assert.rejects(gate.reserve(),x=>x.code==='SEC_QUEUE_DEADLINE');
}));

test('SEC 404 response is never retried',async()=>temp(async base=>{
 let calls=0;const result=await fetchSecControlled({gate:createSecSharedLimiter({base}),url:'https://data.sec.gov/test',fetchImpl:async()=>{calls++;return {status:404};}});
 assert.deepEqual([calls,result.attempts,result.response.status],[1,1,404]);
}));
test('SEC transient 429 and Retry-After honors cooldown then succeeds',async()=>temp(async base=>{
 let calls=0;const start=Date.now();const result=await fetchSecControlled({gate:createSecSharedLimiter({base,maxWaitMs:10000}),url:'https://data.sec.gov/test',fetchImpl:async()=>{calls++;return calls===1?{status:429,headers:new Headers({'retry-after':'2'})}:{status:200};}});
 assert.deepEqual([calls,result.attempts,...result.statuses],[2,2,429,200]);assert.ok(Date.now()-start>=1950);
}));
test('SEC persistent 503 uses 3 tries and keeps error visible',async()=>temp(async base=>{
 let calls=0;const result=await fetchSecControlled({gate:createSecSharedLimiter({base,maxWaitMs:10000}),url:'https://data.sec.gov/test',fetchImpl:async()=>{calls++;return {status:503};}});
 assert.equal(calls,3);assert.deepEqual(result.statuses,[503,503,503]);
}));
test('SEC 403 does not retry',async()=>temp(async base=>{
 let calls=0;const result=await fetchSecControlled({gate:createSecSharedLimiter({base}),url:'https://data.sec.gov/test',fetchImpl:async()=>{calls++;return {status:403};}});
 assert.equal(calls,1);assert.deepEqual(result.statuses,[403]);
}));
test('SEC URL allowlist blocks unrelated hosts',async()=>temp(async base=>{
 await assert.rejects(fetchSecControlled({gate:createSecSharedLimiter({base}),url:'https://invalid.example.org/test',fetchImpl:async()=>({status:200})}),x=>x.code==='SEC_HOST_NOT_ALLOWED');
}));
test('SEC network errors propagate rather than invent HTTP200',async()=>temp(async base=>{
 let calls=0;await assert.rejects(fetchSecControlled({gate:createSecSharedLimiter({base}),url:'https://data.sec.gov/test',fetchImpl:async()=>{calls++;throw Error('CONNECTION_RESET')}}));assert.equal(calls,1);
}));
test('SEC POST is rejected to prevent unsafe automatic retry',async()=>temp(async base=>{
 await assert.rejects(fetchSecControlled({gate:createSecSharedLimiter({base}),url:'https://data.sec.gov/test',init:{method:'POST'},fetchImpl:async()=>({status:200})}),x=>x.code==='SEC_FETCH_METHOD_NOT_ALLOWED');
}));

test('SEC Retry-After accepts HTTP-date format and clamps shared cooldown',async()=>temp(async base=>{
 const at=Date.now();const gate=createSecSharedLimiter({base,now:()=>at});
 const date=new Date(at+45_000).toUTCString();
 const result=gate.noteResponse({status:429,retryAfter:date});
 assert.equal(result.cooldownUpdated,true);
 assert.ok(result.until>=at+43_000);
}));
test('SEC stale lock is recovered only when owner PID is provably gone',async()=>temp(async base=>{
 const lock=path.join(base,'sec-shared-reservation.lock');
 fs.mkdirSync(lock);fs.writeFileSync(path.join(lock,'owner.json'),JSON.stringify({pid:2147483647,startedAt:Date.now()-600_000}));
 const old=new Date(Date.now()-600_000);fs.utimesSync(lock,old,old);
 const gate=createSecSharedLimiter({base,maxWaitMs:3000});
 const result=await gate.reserve();assert.ok(result.at>0);
 assert.equal(fs.existsSync(lock),false);
}));


test('new SEC policy allows at most 8 reservations in every rolling 1000ms',async()=>temp(async base=>{
 const gate=createSecSharedLimiter({base});
 const attempts=await Promise.all(Array.from({length:18},()=>gate.reserve()));
 const at=attempts.map(x=>x.at).sort((a,b)=>a-b);
 const peak=Math.max(...at.map(t=>at.filter(u=>u>=t&&u<t+1000).length));
 assert.ok(peak<=8, 'peak '+peak);
}));

test('unsafe 100ms SEC interval override is rejected before any request',async()=>temp(async base=>{
 assert.throws(()=>createSecSharedLimiter({base,minIntervalMs:100}),e=>e?.code==='SEC_GATE_CONFIG_INVALID');
}));

test('403 can record confirmed Fair Access stop for 10 minutes without sending again',async()=>temp(async base=>{
 const gate=createSecSharedLimiter({base,maxWaitMs:5});
 const now=Date.now();gate.noteResponse({status:403,confirmedFairAccessBlock:true});
 const state=JSON.parse(fs.readFileSync(path.join(base,'sec-shared-reservations.json'),'utf8'));
 assert.ok(state.cooldownUntil>=now+599000);
 await assert.rejects(gate.reserve(),e=>e?.code==='SEC_QUEUE_DEADLINE');
}));

test('HTTP redirect to another SEC origin is blocked before second network request',async()=>temp(async base=>{
 const gate=createSecSharedLimiter({base});
 let calls=0;
 await assert.rejects(fetchSecControlled({gate,url:'https://data.sec.gov/api/xbrl/start',
  fetchImpl:async()=>{calls++;return {status:302,headers:new Headers({location:'https://www.sec.gov/Archives/redirect'})};}}),
  e=>e?.code==='SEC_REDIRECT_HOST_DENIED');
 assert.equal(calls,1);
}));

test('redirect loop stops rather than consuming unlimited SEC quota',async()=>temp(async base=>{
 const gate=createSecSharedLimiter({base});
 let calls=0;
 await assert.rejects(fetchSecControlled({gate,url:'https://data.sec.gov/a',
  fetchImpl:async()=>{calls++;return {status:302,headers:new Headers({location:'/a'})};}}),
  e=>e?.code==='SEC_REDIRECT_LOOP');
 assert.equal(calls,1);
}));
