import test from 'node:test';
import assert from 'node:assert/strict';
import {requestGrowthBls} from '../lib/market-score/growth-r2-bls-request.mjs';
const ids=['CES0000000001','CES0500000002'];
const payload=()=>({status:'REQUEST_SUCCEEDED',Results:{series:ids.map(seriesID=>({seriesID,data:[{year:'2026',period:'M09',value:'0'}]}))}});
test('503 then success retries only BLS, includes registration and accepts real zero',async()=>{
 let calls=0;const waits=[];
 const out=await requestGrowthBls({ids,startYear:2025,endYear:2026,env:{BLS_REGISTRATION_KEY:'PRIVATE'},wait:async ms=>waits.push(ms),fetchImpl:async(_url,init)=>{
  calls++;assert.equal(JSON.parse(init.body).registrationkey,'PRIVATE');
  return calls===1?new Response('busy',{status:503}):Response.json(payload());
 }});
 assert.equal(calls,2);assert.deepEqual(waits,[2000]);assert.equal(out.requestCount,2);
 assert.equal(JSON.stringify(out.diagnostic).includes('PRIVATE'),false);
});
test('persistent 503 ends after two attempts with safe diagnostic metadata',async()=>{
 let calls=0;
 await assert.rejects(requestGrowthBls({ids,startYear:2025,endYear:2026,wait:async()=>{},fetchImpl:async()=>{calls++;return new Response('SECRET upstream HTML',{status:503});}}),error=>{
  assert.equal(error.message,'GROWTH_R2_BLS_HTTP:503');assert.equal(error.sourceDiagnostic.httpStatus,503);assert.equal(error.sourceDiagnostic.attempts,2);assert.equal(JSON.stringify(error.sourceDiagnostic).includes('SECRET'),false);return true;
 });assert.equal(calls,2);
});
test('client errors, long Retry-After, quota guard and empty successful body are not blindly retried',async()=>{
 for(const response of [new Response('x',{status:403}),new Response('x',{status:429,headers:{'retry-after':'60'}}),Response.json({status:'REQUEST_SUCCEEDED',Results:{series:[]}}),Response.json({status:'REQUEST_FAILED',message:['quota']})]){
  let calls=0;await assert.rejects(requestGrowthBls({ids,startYear:2025,endYear:2026,wait:async()=>assert.fail('must not wait'),fetchImpl:async()=>{calls++;return response;}}));assert.equal(calls,1);
 }
 let calls=0;await assert.rejects(requestGrowthBls({ids,fetchImpl:async()=>{calls++;throw Object.assign(Error('guard'),{code:'PROVIDER_QUOTA_GUARD'});}}));assert.equal(calls,1);
});
test('network interruption recovers once; incomplete series never becomes successful acquisition',async()=>{
 let calls=0;await requestGrowthBls({ids,startYear:2025,endYear:2026,wait:async()=>{},fetchImpl:async()=>{if(++calls===1)throw TypeError('private URL');return Response.json(payload());}});assert.equal(calls,2);
 const body=payload();body.Results.series[1].data[0].value='';
 await assert.rejects(requestGrowthBls({ids,fetchImpl:async()=>Response.json(body)}),/REQUIRED_SERIES_MISSING/);
});
