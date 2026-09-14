// Transport regressions only: synthetic credentials and local outbound stubs.
// No assertion here establishes Sites production API authentication success.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createMiniflare, MFResponse} from './miniflare-harness.mjs';
import {requestStage,runProvider,phase1KoreaDataCheck} from '../worker/phase1-korea.mjs';
const env={FSC_API_KEY:'synthetic-only',KOSIS_API_KEY:'synthetic-only',BOK_API_KEY:'synthetic-only'};
const state=()=>({provider:'KOSIS',stages:[]});
test('production entry uses global fetch with correct receiver for all providers',async()=>{
 const original=globalThis.fetch;const hosts=[];
 try{
  globalThis.fetch=function(url){assert.equal(this,globalThis);hosts.push(new URL(url).hostname);return Promise.resolve(Response.json({}));};
  const response=await phase1KoreaDataCheck(new Request('https://example.test/api/internal/phase1-korea-data-check'),env);
  const data=await response.json();
  assert.deepEqual(hosts.sort(),['apis.data.go.kr','ecos.bok.or.kr','kosis.kr']);
  for(const provider of ['fsc','kosis','bok']){
   const s=data[provider].stages[0];
   for(const flag of ['requestPrepared','urlConstructed','fetchFunctionAvailable','fetchInvoked','responseReceived','abortControllerAvailable'])assert.equal(s[flag],true,`${provider}.${flag}`);
   assert.equal(s.httpStatus,200);assert.equal(data[provider].technicalValidationSuccess,false);
  }
 }finally{globalThis.fetch=original;}
});
test('undefined injected fetch resolves to runtime global function',async()=>{
 const original=globalThis.fetch;let called=0;
 try{globalThis.fetch=function(){assert.equal(this,globalThis);called++;return Promise.resolve(Response.json({}));};
 const r=await runProvider('FSC',env.FSC_API_KEY,{fetch:undefined});assert.equal(called,1);assert.equal(r.fetchInvoked,true);assert.equal(r.httpStatus,200);
 }finally{globalThis.fetch=original;}
});
for(const kind of ['PREPARE','FETCH_INVOCATION','NETWORK'])test(`transport classifies ${kind} without exposing exception text`,async()=>{
 const out=state();const secretMessage='synthetic-sensitive-url';
 const makeUrl=()=>{if(kind==='PREPARE')throw new TypeError(secretMessage);return new URL('https://example.test/');};
 const fetch=function(){if(kind==='FETCH_INVOCATION')throw new TypeError(secretMessage);return Promise.reject(new TypeError(secretMessage));};
 await assert.rejects(requestStage(out,'KOSIS_SEARCH',makeUrl,{fetch}),{message:`KOSIS_SEARCH_${kind}_ERROR`});
 assert.equal(out.exceptionName,'TypeError');assert.equal(out.fetchInvoked,kind==='NETWORK');
 assert.equal(out.requestPrepared,kind!=='PREPARE');assert.ok(!JSON.stringify(out).includes(secretMessage));
});
test('missing global fetch and malformed credential preparation fail safely',async()=>{
 const original=globalThis.fetch;
 try{globalThis.fetch=undefined;const r=await runProvider('KOSIS','synthetic-only');assert.equal(r.errorType,'KOSIS_SEARCH_FETCH_INVOCATION_ERROR');assert.equal(r.fetchFunctionAvailable,false);assert.equal(r.fetchInvoked,false);
 }finally{globalThis.fetch=original;}
 const r=await runProvider('FSC','synthetic%FF',{fetch:()=>{throw Error('must not call');}});assert.equal(r.errorType,'FSC_DATA_PREPARE_ERROR');assert.equal(r.fetchInvoked,false);
});
test('Worker native fetch rejects context receiver but accepts global receiver',async()=>{
 let calls=0;
 const script=`export default {async fetch(){const out={};for(const mode of ['member','global']){try{const ctx={fetch:globalThis.fetch};const r=mode==='member'?await ctx.fetch('https://example.test/'):await Reflect.apply(ctx.fetch,globalThis,['https://example.test/']);out[mode]={status:r.status};}catch(e){out[mode]={name:e.name,illegalInvocation:/illegal invocation/i.test(e.message)};}}return Response.json(out);}}`;
 const mf=createMiniflare({modules:true,script,compatibilityDate:'2026-05-15',outboundService:async()=>{calls++;return new MFResponse('{}');}});
 try{const r=await(await mf.dispatchFetch('http://localhost/')).json();assert.deepEqual(r.member,{name:'TypeError',illegalInvocation:true});assert.equal(r.global.status,200);assert.equal(calls,1);}finally{await mf.dispose();}
});
test('actual diagnostic module reaches outbound stub in Worker without fetch injection',async()=>{
 const source=await readFile(new URL('../worker/phase1-korea.mjs',import.meta.url),'utf8');const hosts=[];
 const mf=createMiniflare({modules:true,script:source+'\nexport default {fetch:phase1KoreaDataCheck};',bindings:env,compatibilityDate:'2026-05-15',outboundService:async request=>{hosts.push(new URL(request.url).hostname);return new MFResponse('{}',{headers:{'content-type':'application/json'}});}});
 try{const data=await(await mf.dispatchFetch('http://localhost/api/internal/phase1-korea-data-check')).json();
 assert.deepEqual(hosts.sort(),['apis.data.go.kr','ecos.bok.or.kr','kosis.kr']);
 for(const p of ['fsc','kosis','bok']){assert.equal(data[p].fetchInvoked,true);assert.equal(data[p].requestPrepared,true);assert.equal(data[p].fetchFunctionAvailable,true);assert.equal(data[p].responseReceived,true);assert.equal(data[p].httpStatus,200);}
 assert.ok(!JSON.stringify(data).includes('synthetic-only'));
 }finally{await mf.dispose();}
});
