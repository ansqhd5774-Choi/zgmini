import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createQuotaFetch} from '../scripts/pc-writer/quota-fetch.mjs';
import {collectUsBreadthProvisional,US_PROVISIONAL_FILE} from '../scripts/pc-writer/us-breadth-provisional-cycle.mjs';

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
