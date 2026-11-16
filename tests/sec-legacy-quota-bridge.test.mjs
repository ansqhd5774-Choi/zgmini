import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createCompatibleSecQuotaFetch} from '../scripts/pc-writer/sec-legacy-quota-bridge.mjs';
import {secGuardOptionsFromEnv} from '../scripts/pc-writer/sec-guard-runtime-config.mjs';

const SEC='https://data.sec.gov/api/xbrl/frames/us-gaap/Assets/USD/CY2025Q1I.json';
const MARK=Symbol.for('zgmini.sec.permit.fetch.v1');
const success=()=>new Response('{"ok":true}',{status:200,headers:{'content-type':'application/json'}});
async function fixture(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sec-pc-legacy-'));
 const a=path.join(root,'a'),b=path.join(root,'b'),shared=path.join(root,'shared');
 for(const p of [a,b,shared])fs.mkdirSync(p);
 try{return await fn({a,b,shared});}
 finally{fs.rmSync(root,{recursive:true,force:true});}
}
const peak=times=>Math.max(0,...times.map(t=>times.filter(u=>u>=t&&u<t+1000).length));

test('disabled guard preserves the existing quota fetch behavior and produces no new SEC state',()=>fixture(async({a,shared})=>{
 let calls=0;
 const options=secGuardOptionsFromEnv({});
 const q=createCompatibleSecQuotaFetch({base:a,...options,originalFetch:async()=>{calls++;return new Response('',{status:429});}});
 const r=await q.fetch(SEC);
 assert.equal(r.status,429);assert.equal(calls,1);
 assert.equal(q.fetch[MARK],undefined);
 assert.equal(fs.existsSync(path.join(shared,'sec-shared-reservations.json')),false);
}));

test('shared guard for two collectors enforces <=8 SEC requests in a rolling second',()=>fixture(async({a,b,shared})=>{
 const times=[];
 const make=base=>createCompatibleSecQuotaFetch({base,secSharedGuard:true,secSharedBase:shared,
  originalFetch:async()=>{times.push(Date.now());return success();}});
 const aa=make(a),bb=make(b);
 const results=await Promise.all(Array.from({length:12},(_,i)=>(i%2?aa:bb).fetch(SEC)));
 assert.ok(results.every(r=>r.status===200));
 assert.equal(times.length,12);
 assert.ok(peak(times)<=8, 'peak='+peak(times));
 assert.equal(aa.fetch[MARK],true);
 assert.equal(bb.fetch[MARK],true);
 assert.equal(fs.existsSync(path.join(shared,'sec-shared-reservations.json')),true);
}));

test('request POST cannot bypass global gate on legacy quota fetch',()=>fixture(async({a,shared})=>{
 let calls=0;
 const q=createCompatibleSecQuotaFetch({base:a,secSharedGuard:true,secSharedBase:shared,
  originalFetch:async()=>{calls++;return success();}});
 const post=new Request(SEC,{method:'POST',body:'test'});
 await assert.rejects(q.fetch(post),{code:'SEC_FETCH_METHOD_NOT_ALLOWED'});
 assert.equal(calls,0);
}));

test('SEC 404 stays terminal and is not silently marked healthy',()=>fixture(async({a,shared})=>{
 let calls=0;
 const q=createCompatibleSecQuotaFetch({base:a,secSharedGuard:true,secSharedBase:shared,
  originalFetch:async()=>{calls++;return new Response('',{status:404});}});
 const r=await q.fetch(SEC);
 assert.equal(r.status,404);assert.equal(calls,1);
}));

test('SEC redirect consumes two shared permits and never automatically follows',()=>fixture(async({a,shared})=>{
 let calls=0;
 const q=createCompatibleSecQuotaFetch({base:a,secSharedGuard:true,secSharedBase:shared,
  originalFetch:async(url,opts)=>{
   calls++;assert.equal(opts.redirect,'manual');
   if(calls===1)return new Response('',{status:302,headers:{location:'/api/next'}});
   assert.equal(String(url),'https://data.sec.gov/api/next');return success();
  }});
 const r=await q.fetch(SEC);
 assert.equal(r.status,200);assert.equal(calls,2);
}));

test('missing approved SEC permit root stops before creating any legacy ledger',()=>fixture(async({a})=>{
 assert.throws(()=>createCompatibleSecQuotaFetch({base:a,secSharedGuard:true,
  originalFetch:async()=>success()}),{code:'SEC_GLOBAL_PERMIT_SCOPE_REQUIRED'});
 assert.equal(fs.existsSync(path.join(a,'quota-ledger.json')),false);
}));

test('non-SEC requests retain existing original provider behavior',()=>fixture(async({a,shared})=>{
 let calls=0;
 const q=createCompatibleSecQuotaFetch({base:a,secSharedGuard:true,secSharedBase:shared,
  originalFetch:async()=>{calls++;return success();}});
 const r=await q.fetch('https://api.stlouisfed.org/fred/series/observations');
 assert.equal(r.status,200);assert.equal(calls,1);
 assert.equal(fs.existsSync(path.join(shared,'sec-shared-reservations.json')),false);
}));
