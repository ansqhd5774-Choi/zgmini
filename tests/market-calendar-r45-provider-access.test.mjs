import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runR45,runOnPc,classifyMarketCapBody} from '../scripts/pc-writer/market-calendar-r45-provider-access-readonly.mjs';
const key='SECRET_TEST_CREDENTIAL_DO_NOT_OUTPUT';
const response=(status,body)=>({status,headers:{get:()=>null},text:async()=>JSON.stringify(body)});
test('R45 exactly 3 bounded provider requests with no secret in output',async()=>{
 let count=0;const calls=[];
 const fetchImpl=async url=>{calls.push(url);count++;
  if(url.includes('batch'))return response(200,[{symbol:'ABBV',marketCap:350e9,date:'2026-10-28'},{symbol:'AAPL',marketCap:4e12,date:'2026-10-28'}]);
  if(url.includes('financialmodelingprep'))return response(200,[{symbol:'ABBV',marketCap:350e9,date:'2026-10-28'}]);
  return response(200,{symbol:'ABBV',marketCap:350e9});
 };
 const x=await runR45({keys:{FMP_API_KEY:key,EARNINGSAPI_API_KEY:key},fetchImpl});
 assert.equal(count,3);assert.equal(x.providerRequests,3);
 assert.deepEqual(x.endpoints.map(y=>y.access),['CAP_FIELD_PRESENT','CAP_FIELD_PRESENT','CAP_FIELD_PRESENT']);
 assert.equal(x.endpoints[0].validSymbols,2);
 assert.doesNotMatch(JSON.stringify(x),/SECRET_TEST_CREDENTIAL/);
 assert.equal(x.fullCoverageValidated,false);assert.equal(x.dbWrites,0);assert.equal(x.d1Writes,0);
});
test('R45 restricted endpoints do not trigger retries or secondary paid calls',async()=>{
 let calls=0;
 const result=await runR45({keys:{FMP_API_KEY:key},fetchImpl:async()=>{calls++;return response(403,{error:'premium required'})}});
 assert.equal(calls,2);assert.equal(result.providerRequests,2);
 assert.deepEqual(result.endpoints.map(x=>x.access),['PLAN_OR_PERMISSION_RESTRICTED','PLAN_OR_PERMISSION_RESTRICTED','MISSING_CONFIGURED_KEY']);
});
test('R45 no credential means zero calls, no guesses',async()=>{
 let calls=0;const result=await runR45({keys:{},fetchImpl:async()=>{calls++;throw Error('should not be called')}});
 assert.equal(calls,0);assert.equal(result.providerRequests,0);
});
test('R45 HTTP 200 with upgrade message or misleading payload is not access confirmation',()=>{
 assert.equal(classifyMarketCapBody('FMP_BATCH',200,JSON.stringify({message:'Upgrade to premium plan'})).access,'PLAN_OR_PERMISSION_RESTRICTED');
 assert.equal(classifyMarketCapBody('FMP_BATCH',200,JSON.stringify([{symbol:'ABBV',marketCap:null}])).access,'CAP_FIELD_MISSING');
 assert.equal(classifyMarketCapBody('FMP_BATCH',200,JSON.stringify([{symbol:'MSFT',marketCap:250e9}])).access,'SCHEMA_OR_SYMBOL_MISMATCH');
});
test('R45 re-run is blocked if result exists and does not issue provider calls',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r45probe-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.writeFileSync(path.join(dir,'MARKET_CALENDAR_R45_PROVIDER_ACCESS_RESULT.txt'),'existing');
 let calls=0;
 const x=await runOnPc(dir,dir,{fetchImpl:async()=>{calls++;throw Error('unexpected')}});
 assert.equal(x.status,'R45_RESULT_ALREADY_EXISTS_STOP');assert.equal(calls,0);
});
