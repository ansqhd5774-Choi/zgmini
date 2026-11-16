import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createQuotaFetch} from '../scripts/pc-writer/quota-fetch.mjs';
import {createSecSharedLimiter,classifySecEndpointSet} from '../scripts/pc-writer/sec-request-controls.mjs';
import {secGuardOptionsFromEnv} from '../scripts/pc-writer/sec-guard-runtime-config.mjs';
import {createProtectedSecJsonRequest,fetchSecShareFrame} from '../lib/market-score/breadth-r2-provider-client.mjs';
import {summarizeApiConnectionHealth} from '../worker/api-connection-health.mjs';

const SRC='https://data.sec.gov/api/xbrl/frames/us-gaap/Assets/USD/CY2025Q1I.json';
const secResponse=(status=200)=>new Response('{"valid":true}',{status,headers:{'content-type':'application/json'}});
function tmp(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sec-four-stage-'));
 const a=path.join(root,'collector-a'),b=path.join(root,'collector-b'),shared=path.join(root,'global');
 for(const dir of [a,b,shared])fs.mkdirSync(dir);
 return Promise.resolve().then(()=>fn({root,a,b,shared}))
  .finally(()=>fs.rmSync(root,{recursive:true,force:true}));
}
function peak1s(values){
 const times=[...values].sort((a,b)=>a-b);
 return Math.max(0,...times.map(t=>times.filter(v=>v>=t&&v<t+1000).length));
}
test('one shared permit root throttles two independent SEC collectors to <=8/s',()=>tmp(async({a,b,shared})=>{
 const observed=[];
 const maker=base=>createQuotaFetch({base,secSharedGuard:true,secSharedBase:shared,mode:'observe',
  originalFetch:async()=>{observed.push(Date.now());return secResponse();}}).fetch;
 const ca=maker(a),cb=maker(b);
 const out=await Promise.all(Array.from({length:12},(_,i)=>(i%2?ca:cb)(SRC)));
 assert.ok(out.every(r=>r.status===200));
 assert.equal(observed.length,12);
 assert.ok(peak1s(observed)<=8, 'global sliding 1s peak='+peak1s(observed));
}));
test('two different approved-looking roots remain independent; do not claim global proof',()=>tmp(async({a,b})=>{
 const one=createSecSharedLimiter({base:a}),two=createSecSharedLimiter({base:b});
 const results=await Promise.all([
  ...Array.from({length:8},()=>one.reserve()),
  ...Array.from({length:8},()=>two.reserve())
 ]);
 assert.ok(peak1s(results.map(x=>x.at))>8);
}));
test('missing explicit root fails before any SEC network request',()=>tmp(async({a})=>{
 let requests=0;
 assert.throws(()=>secGuardOptionsFromEnv({ZGMINI_SEC_SHARED_GUARD_ENABLED:'true'}),
  {code:'SEC_GLOBAL_PERMIT_SCOPE_REQUIRED'});
 assert.throws(()=>createQuotaFetch({base:a,secSharedGuard:true,
  originalFetch:async()=>{requests++;return secResponse();}}),
  {code:'SEC_GLOBAL_PERMIT_SCOPE_REQUIRED'});
 assert.equal(requests,0);
}));
test('arbitrary ABSOLUTE root alone is not authoritative proof of single-PC identity',()=>tmp(async({a,b})=>{
 const env1={ZGMINI_SEC_SHARED_GUARD_ENABLED:'true',ZGMINI_SEC_SHARED_STATE_ROOT:a};
 const env2={ZGMINI_SEC_SHARED_GUARD_ENABLED:'true',ZGMINI_SEC_SHARED_STATE_ROOT:b};
 const p=secGuardOptionsFromEnv(env1),q=secGuardOptionsFromEnv(env2);
 assert.equal(p.secSharedGuard,true);assert.equal(q.secSharedGuard,true);
 assert.notEqual(p.secSharedBase,q.secSharedBase);
}));
test('Breadth SEC XBRL payload parses through ATTESTED, permit-managed adapter',()=>tmp(async({a,shared})=>{
 const tag='WeightedAverageNumberOfSharesOutstandingBasic';
 let requests=0;
 const quota=createQuotaFetch({base:a,secSharedGuard:true,secSharedBase:shared,mode:'observe',
  originalFetch:async()=>{requests++;return new Response(JSON.stringify({tag,uom:'shares',data:[{cik:123, val:100}]}),
   {status:200,headers:{'content-type':'application/json'}});}});
 const requestJson=createProtectedSecJsonRequest({secPermitFetch:quota.fetch});
 const frame=await fetchSecShareFrame({year:2025,quarter:1,requestJson});
 assert.equal(frame.tag,tag);assert.equal(frame.data.length,1);assert.equal(requests,1);
}));
test('HTTP 200 with malformed SEC XBRL payload is not successful finance data',()=>tmp(async({a,shared})=>{
 const quota=createQuotaFetch({base:a,secSharedGuard:true,secSharedBase:shared,mode:'observe',
  originalFetch:async()=>new Response(JSON.stringify({tag:'OTHER',data:[]}),{status:200})});
 const requestJson=createProtectedSecJsonRequest({secPermitFetch:quota.fetch});
 await assert.rejects(fetchSecShareFrame({year:2025,quarter:1,requestJson}),
  /SEC_FRAME_TAG_MISMATCH/);
}));
test('unproven optional 404 and required 404 remain failed',()=>{
 const good={id:'needed',required:true,status:200,parsed:true,storedAndReadback:true};
 const unproven={id:'unknown404',required:false,status:404,absenceOfficiallyVerified:false};
 const known={...unproven,absenceOfficiallyVerified:true};
 const opts={requiredContractKnown:true,sourceFresh:true};
 assert.equal(classifySecEndpointSet({...opts,endpoints:[good,unproven]}).state,'failed');
 assert.equal(classifySecEndpointSet({...opts,endpoints:[{...good,status:404}]}).state,'failed');
 assert.equal(classifySecEndpointSet({...opts,endpoints:[good,known]}).state,'normal');
});
test('local SQLite + synthetic D1 SHA readback can pass, not proof of live D1',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('CREATE TABLE sec_shadow (id TEXT PRIMARY KEY, raw TEXT NOT NULL, sha256 TEXT NOT NULL)');
  const data=JSON.stringify({tag:'Assets',period:'2025Q1',rows:[1,2,3]});
  const hash=createHash('sha256').update(data).digest('hex');
  db.prepare('INSERT INTO sec_shadow (id,raw,sha256) VALUES (?,?,?)').run('frame',data,hash);
  const row=db.prepare('SELECT raw,sha256 FROM sec_shadow WHERE id=?').get('frame');
  assert.equal(row.sha256,createHash('sha256').update(row.raw).digest('hex'));
  const mockD1Readback={key:'frame',sha256:row.sha256};
  assert.equal(mockD1Readback.sha256,hash);
 }finally{db.close();}
});
test('real public-health reducer retains a failed SEC warning for mixed 429/200',()=>{
 const now=Date.now();
 const snapshot={version:1,scope:'external-provider-hosts',
  source:'PC_COLLECTION_EVENTS_FETCH_WRAPPER',coverage:'PARTIAL',
  observedAt:new Date(now).toISOString(),
  items:[{host:'data.sec.gov',requests:2,observedDays:2,lastOutcome:'mixed',
   lastAttemptAt:now-1000,lastSuccessAt:now-1000,expectedIntervalMs:null,
   lastEventStatuses:{'200':1,'429':1}}]};
 const x=summarizeApiConnectionHealth(snapshot,now);
 assert.equal(x.failed,1);assert.equal(x.items[0].state,'failed');
 assert.equal(x.items[0].reasonCode,'LAST_EVENT_HAS_FAILURE');
});
test('later all-success SEC event can normalize current observation',()=>{
 const now=Date.now();
 const snapshot={version:1,scope:'external-provider-hosts',
  source:'PC_COLLECTION_EVENTS_FETCH_WRAPPER',coverage:'PARTIAL',
  observedAt:new Date(now).toISOString(),
  items:[{host:'data.sec.gov',requests:3,observedDays:2,lastOutcome:'success',
   lastAttemptAt:now-1000,lastSuccessAt:now-1000,expectedIntervalMs:null,
   lastEventStatuses:{'200':1}}]};
 const x=summarizeApiConnectionHealth(snapshot,now);
 assert.equal(x.normal,1);assert.equal(x.items[0].state,'normal');
});
