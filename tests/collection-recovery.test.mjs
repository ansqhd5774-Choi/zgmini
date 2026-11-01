import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {collectAlpacaIncremental} from '../scripts/pc-writer/alpaca-incremental.mjs';
import {collectCorePceFeed} from '../worker/data-health.mjs';
test('Alpaca incremental retains original history, verifies storage and avoids repeated calls',async()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zg-alpaca-')),dir=path.join(base,'asset-r10-alpaca');fs.mkdirSync(dir);fs.writeFileSync(path.join(base,'providers.env'),'APCA_API_KEY_ID=fixture\nAPCA_API_SECRET_KEY=fixture\n');
 const original=JSON.stringify([{ticker:'SPY',tradeDate:'2026-10-05',currentClose:100}]);fs.writeFileSync(path.join(dir,'group-000.json'),original);fs.writeFileSync(path.join(dir,'checkpoint.json'),JSON.stringify({end:'2026-10-05'}));
 let calls=0;const now=Date.parse('2026-10-11T12:00:00Z'),fetchImpl=async url=>{calls++;assert.equal(url.searchParams.get('feed'),'iex');assert.equal(url.searchParams.get('start'),'2026-10-05T00:00:00Z');return Response.json({bars:{SPY:[{t:'2026-10-09T00:00:00Z',c:101,v:10}]},next_page_token:null});};
 const report=await collectAlpacaIncremental(base,{now,fetchImpl});assert.equal(report.storageVerified,true);assert.equal(report.completedGroups,1);assert.equal(fs.readFileSync(path.join(dir,'group-000.json'),'utf8'),original);
 assert.equal((await collectAlpacaIncremental(base,{now,fetchImpl})).status,'CACHED');assert.equal(calls,1);
 fs.rmSync(base,{recursive:true});
});
test('Core PCE preserves good data and reports credential rejection without exposing provider text',async()=>{
 const original=globalThis.fetch,writes=[];globalThis.fetch=async()=>Response.json({error:'invalid api_key secret'}, {status:403});
 try{await assert.rejects(collectCorePceFeed({FRED_API_KEY:'fixture',BEA_API_KEY:'fixture'},{writeInput:async(...args)=>writes.push(args)}),e=>{assert.equal(e.providerDiagnostics.length,2);assert.ok(e.providerDiagnostics.every(x=>x.reason==='AUTHENTICATION_REJECTED'));assert.ok(!JSON.stringify(e.providerDiagnostics).includes('secret'));return true;});assert.deepEqual(writes.map(x=>x[0]),['core-pce-diagnostics']);}finally{globalThis.fetch=original;}
});
