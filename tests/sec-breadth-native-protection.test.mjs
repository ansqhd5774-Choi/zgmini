import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultJsonRequest,createProtectedSecJsonRequest} from '../lib/market-score/breadth-r2-provider-client.mjs';

test('SEC native HTTPS path refuses to bypass the enabled global gate',async()=>{
 const prior=process.env.ZGMINI_SEC_SHARED_GUARD_ENABLED;
 process.env.ZGMINI_SEC_SHARED_GUARD_ENABLED='true';
 try{
  await assert.rejects(defaultJsonRequest('https://data.sec.gov/api/xbrl/frames/test'),
   e=>e?.code==='SEC_NATIVE_TRANSPORT_UNPROTECTED');
 }finally{
  if(prior===undefined)delete process.env.ZGMINI_SEC_SHARED_GUARD_ENABLED;
  else process.env.ZGMINI_SEC_SHARED_GUARD_ENABLED=prior;
 }
});
test('SEC guarded adapter preserves bytes/status and requires injected fetch',async()=>{
 assert.throws(()=>createProtectedSecJsonRequest({}),/SEC_PERMIT_FETCH_REQUIRED/);
 assert.throws(()=>createProtectedSecJsonRequest({secPermitFetch:async()=>new Response('{}')}),/SEC_PERMIT_FETCH_UNATTESTED/);
 let calls=0;
 const marked=async(url,init)=>{
  calls++;assert.equal(new URL(url).hostname,'data.sec.gov');
  assert.equal(init.redirect,'manual');assert.equal(init.method,'GET');
  return new Response(JSON.stringify({tag:'TEST',data:[]}),{status:200,
   headers:{'content-type':'application/json'}});
 };
 Object.defineProperty(marked,Symbol.for('zgmini.sec.permit.fetch.v1'),{value:true});
 const client=createProtectedSecJsonRequest({secPermitFetch:marked});
 const r=await client('https://data.sec.gov/api/xbrl/frames/example');
 assert.equal(calls,1);assert.equal(r.status,200);
 assert.equal(r.contentType,'application/json');
 assert.deepEqual(JSON.parse(r.body.toString()),{tag:'TEST',data:[]});
 assert.equal(r.bytes,r.body.length);
});
test('SEC guarded adapter refuses unapproved destinations before network',async()=>{
 let calls=0;
 const marked=async()=>{calls++;return new Response('{}');};
 Object.defineProperty(marked,Symbol.for('zgmini.sec.permit.fetch.v1'),{value:true});
 const client=createProtectedSecJsonRequest({secPermitFetch:marked});
 await assert.rejects(client('https://example.org/'),/SEC_FRAME_HOST_INVALID/);
 await assert.rejects(client('http://data.sec.gov/api/'),/SEC_FRAME_HOST_INVALID/);
 assert.equal(calls,0);
});
test('SEC guarded adapter enforces response size at streaming boundary',async()=>{
 const marked=async()=>new Response('x',{status:200,headers:{'content-length':'30000001'}});
 Object.defineProperty(marked,Symbol.for('zgmini.sec.permit.fetch.v1'),{value:true});
 const client=createProtectedSecJsonRequest({secPermitFetch:marked});
 await assert.rejects(client('https://data.sec.gov/test'),/BREADTH_R2_PROVIDER_MAX_BYTES/);
});
