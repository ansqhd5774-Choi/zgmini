import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createQuotaFetch} from '../scripts/pc-writer/quota-fetch.mjs';

function work(run){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'sec-quota-bridge-'));
 return Promise.resolve().then(()=>run(base)).finally(()=>fs.rmSync(base,{recursive:true,force:true}));
}
const result=(status,retryAfter=null)=>({
 status,ok:status>=200&&status<300,
 headers:new Headers(retryAfter===null?{}:{'retry-after':retryAfter})
});

test('default SEC path is unchanged unless explicitly opted into shared guard',()=>work(async base=>{
 let count=0;const wrapped=createQuotaFetch({base,originalFetch:async()=>{count++;return result(429);}});
 const response=await wrapped.fetch('https://data.sec.gov/api/xbrl/frames/us-gaap/Assets/USD/CY2025Q1I.json');
 assert.equal(response.status,429);assert.equal(count,1);
 assert.equal(fs.existsSync(path.join(base,'sec-shared-reservations.json')),false);
}));

test('opt-in SEC gate reserves every retry, honors Retry-After, then returns success',()=>work(async base=>{
 let count=0;const started=Date.now();
 const wrapped=createQuotaFetch({base,mode:'observe',secSharedGuard:true,
  originalFetch:async()=>{count++;return count===1?result(429,'2'):result(200);}});
 const response=await wrapped.fetch('https://data.sec.gov/api/xbrl/frames/us-gaap/Assets/USD/CY2025Q1I.json');
 assert.equal(response.status,200);assert.equal(count,2);
 assert.ok(Date.now()-started>=1900,'must wait rather than hammer after 429');
 const stored=JSON.parse(fs.readFileSync(path.join(base,'sec-shared-reservations.json'),'utf8'));
 assert.ok(Number.isInteger(stored.lastReservedAt));
}));

test('opt-in SEC 404 remains visible, with no automatic retry or false success',()=>work(async base=>{
 let count=0;const wrapped=createQuotaFetch({base,secSharedGuard:true,
  originalFetch:async()=>{count++;return result(404);}});
 const response=await wrapped.fetch('https://data.sec.gov/api/xbrl/frames/us-gaap/Assets/USD/CY2025Q1I.json');
 assert.equal(response.status,404);assert.equal(count,1);
}));

test('SEC 503 retries up to 3 times and remains failed when persistent',()=>work(async base=>{
 let count=0;const wrapped=createQuotaFetch({base,secSharedGuard:true,
  originalFetch:async()=>{count++;return result(503);}});
 const response=await wrapped.fetch('https://data.sec.gov/api/xbrl/frames/us-gaap/Assets/USD/CY2025Q1I.json');
 assert.equal(response.status,503);assert.equal(count,3);
}));

test('other providers remain unaffected by SEC-only opt-in',()=>work(async base=>{
 let count=0;const wrapped=createQuotaFetch({base,secSharedGuard:true,
  originalFetch:async()=>{count++;return result(429);}});
 const response=await wrapped.fetch('https://api.stlouisfed.org/fred/series/observations');
 assert.equal(response.status,429);assert.equal(count,1);
}));

test('SEC missing data root fails closed before any external request',async()=>{
 let count=0;const missing=path.join(os.tmpdir(),'sec-not-a-real-root-'+process.pid);
 const wrapped=createQuotaFetch({base:missing,secSharedGuard:true,
  originalFetch:async()=>{count++;return result(200);}});
 await assert.rejects(wrapped.fetch('https://data.sec.gov/api/xbrl/frames/test'),
  e=>e?.code==='SEC_BASE_UNAVAILABLE');
 assert.equal(count,0);
});

test('SEC guard denies unapproved subdomain rather than silently bypassing it',()=>work(async base=>{
 let count=0;const wrapped=createQuotaFetch({base,secSharedGuard:true,
  originalFetch:async()=>{count++;return result(200);}});
 await assert.rejects(wrapped.fetch('https://extra.sec.gov/example'),e=>e?.code==='SEC_HOST_NOT_ALLOWED');
 assert.equal(count,0);
}));
