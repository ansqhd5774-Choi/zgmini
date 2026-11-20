import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {collectAlpacaIncremental} from '../scripts/pc-writer/alpaca-incremental.mjs';
import {collectCorePceFeed} from '../worker/data-health.mjs';
test('retired R10 Alpaca collector preserves original history and checkpoint without provider calls',async t=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zg-alpaca-')),dir=path.join(base,'asset-r10-alpaca');
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 fs.mkdirSync(dir);
 const providerConfig='APCA_API_KEY_ID=fixture\nAPCA_API_SECRET_KEY=fixture\n';
 fs.writeFileSync(path.join(base,'providers.env'),providerConfig);
 const original=JSON.stringify([{ticker:'SPY',tradeDate:'2026-10-05',currentClose:100}]);
 const checkpoint=JSON.stringify({end:'2026-10-05'});
 fs.writeFileSync(path.join(dir,'group-000.json'),original);
 fs.writeFileSync(path.join(dir,'checkpoint.json'),checkpoint);
 let calls=0;
 const now=Date.parse('2026-10-11T12:00:00Z');
 const fetchImpl=async()=>{calls++;throw Error('R10_ALPACA_PROVIDER_CALLED');};
 const first=await collectAlpacaIncremental(base,{now,fetchImpl});
 const second=await collectAlpacaIncremental(base,{now:now+1000,fetchImpl});
 assert.deepEqual(first,{status:'EXCLUDED_BY_USER',runRequests:0});
 assert.deepEqual(second,{status:'EXCLUDED_BY_USER',runRequests:0});
 assert.equal(calls,0);
 assert.equal(fs.readFileSync(path.join(dir,'group-000.json'),'utf8'),original);
 assert.equal(fs.readFileSync(path.join(dir,'checkpoint.json'),'utf8'),checkpoint);
 assert.equal(fs.readFileSync(path.join(base,'providers.env'),'utf8'),providerConfig);
 assert.deepEqual(fs.readdirSync(dir).sort(),['checkpoint.json','group-000.json']);
 assert.equal(fs.existsSync(path.join(base,'local-asset-bubble-r10-alpaca-collection.json')),false);
 assert.equal(fs.existsSync(path.join(base,'alpaca-quota-ledger.json')),false);
});
test('Core PCE preserves good data and reports credential rejection without exposing provider text',async()=>{
 const original=globalThis.fetch,writes=[];globalThis.fetch=async()=>Response.json({error:'invalid api_key secret'}, {status:403});
 try{await assert.rejects(collectCorePceFeed({FRED_API_KEY:'fixture',BEA_API_KEY:'fixture'},{writeInput:async(...args)=>writes.push(args)}),e=>{assert.equal(e.providerDiagnostics.length,2);assert.ok(e.providerDiagnostics.every(x=>x.reason==='AUTHENTICATION_REJECTED'));assert.ok(!JSON.stringify(e.providerDiagnostics).includes('secret'));return true;});assert.deepEqual(writes.map(x=>x[0]),['core-pce-diagnostics']);}finally{globalThis.fetch=original;}
});
