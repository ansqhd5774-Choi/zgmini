import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runSectorProvisional} from '../scripts/pc-writer/sector-provisional-cycle.mjs';
import {createQuotaFetch} from '../scripts/pc-writer/quota-fetch.mjs';

const now=Date.parse('2026-10-19T18:00:00Z');
const alpacaUrl='https://data.alpaca.markets/v2/stocks/bars?symbols=TEST';
const inputs={
 diagnostics:{stockLastDate:'2026-10-16'},
 pitCsv:['symbol,sector,date_added,date_removed',
  ...Array.from({length:500},(_,i)=>`TEST${i},Energy,2020-01-01,`)].join('\n'),
 stockRows:[],series:{},
};
const loadInputs=()=>inputs;

function withBase(fn){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-sector-provisional-quota-'));
 fs.writeFileSync(path.join(base,'providers.env'),'APCA_API_KEY_ID=MOCK_ONLY\nAPCA_API_SECRET_KEY=MOCK_ONLY\n');
 return Promise.resolve().then(()=>fn(base)).finally(()=>fs.rmSync(base,{recursive:true,force:true}));
}

test('independent sector Node caller shares the R10 140/min reservation and defers without fetching or changing raw',()=>withBase(async base=>{
 let mockCalls=0;
 const fakeFetch=async()=>{mockCalls++;return new Response('{}',{status:200});};
 const shared=createQuotaFetch({base,originalFetch:fakeFetch,mode:'enforce'}).fetch;
 for(let i=0;i<140;i++)await shared(alpacaUrl);
 assert.equal(mockCalls,140);

 const rawFile=path.join(base,'local-sector-provisional-input.json');
 const original='{"stored":"previous-confirmed-preserved"}';
 fs.writeFileSync(rawFile,original);
 const result=await runSectorProvisional(base,{now,fetchImpl:fakeFetch,loadInputs,write:true});
 assert.equal(result.status,'DEFERRED_QUOTA');
 assert.equal(result.reason,'ALPACA_SHARED_QUOTA_GUARD');
 assert.equal(result.providerCalls,0);
 assert.equal(mockCalls,140);
 assert.equal(fs.readFileSync(rawFile,'utf8'),original);
 assert.equal(JSON.parse(fs.readFileSync(path.join(base,'local-sector-provisional-last-run.json'),'utf8')).status,'DEFERRED_QUOTA');
}));

test('sector provisional HTTP 429 defers to the next run without touching confirmed inputs',()=>withBase(async base=>{
 let mockCalls=0;
 const fakeFetch=async()=>{
  mockCalls++;
  return new Response(null,{status:429,headers:{
   'X-RateLimit-Limit':'200','X-RateLimit-Remaining':'0',
   'X-RateLimit-Reset':String(Math.floor(Date.now()/1000)+60),
  }});
 };
 const result=await runSectorProvisional(base,{now,fetchImpl:fakeFetch,loadInputs,write:true});
 assert.equal(result.status,'DEFERRED_QUOTA');
 assert.equal(result.reason,'ALPACA_HTTP_429');
 assert.equal(result.providerCalls,1);
 assert.equal(mockCalls,1);
 assert.equal(fs.existsSync(path.join(base,'local-sector-provisional-input.json')),false);
 assert.equal(fs.existsSync(path.join(base,'storage','core.sqlite')),false);
}));

test('post-request quota ledger failure reports one sent request and preserves raw',()=>withBase(async base=>{
 let mockCalls=0;
 const rawFile=path.join(base,'local-sector-provisional-input.json');
 fs.writeFileSync(rawFile,'{"previous":"valid"}');
 const fakeFetch=async()=>{
  mockCalls++;
  // Simulate another owner holding the shared lock after the HTTP request.
  fs.mkdirSync(path.join(base,'alpaca-quota-reservation.lock'));
  return new Response('{}',{status:200});
 };
 const result=await runSectorProvisional(base,{now,fetchImpl:fakeFetch,loadInputs,write:true});
 assert.equal(result.status,'DEFERRED_QUOTA');
 assert.equal(result.reason,'ALPACA_LEDGER_UPDATE_UNVERIFIED');
 assert.equal(result.providerCalls,1);
 assert.equal(mockCalls,1);
 assert.equal(fs.readFileSync(rawFile,'utf8'),'{"previous":"valid"}');
 assert.equal(fs.existsSync(path.join(base,'storage','core.sqlite')),false);
}));

test('non-quota Alpaca error retains the original previous-confirmed failure classification',()=>withBase(async base=>{
 let mockCalls=0;
 const result=await runSectorProvisional(base,{now,loadInputs,fetchImpl:async()=>{
  mockCalls++;return new Response(null,{status:503});
 }});
 assert.equal(mockCalls,1);
 assert.equal(result.status,'FAILED_PREVIOUS_CONFIRMED_PRESERVED');
 assert.equal(result.error,'SECTOR_PROVISIONAL_HTTP_503');
 assert.equal(result.providerCalls,1);
}));
