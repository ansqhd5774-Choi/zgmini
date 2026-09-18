import test from 'node:test';
import assert from 'node:assert/strict';
import {createKfgRev7CanaryHandler,REV7_CANARY_OPERATOR_EMAIL_NAME} from '../worker/kfg-rev7-canary.mjs';

const operator='operator@example.test';
const request=(method='POST',body)=>new Request('https://zgmini.kr/api/internal/kfg-rev7-canary',{
  method,body:body===undefined?undefined:JSON.stringify(body),headers:{'content-type':'application/json'}
});
const env={DB:{},KRX_API_KEY:'krx',BOK_API_KEY:'bok',[REV7_CANARY_OPERATOR_EMAIL_NAME]:operator};
function context(user=null,customEnv=env){
  let runnerCalls=0,storeCalls=0;
  const runner=async({targetAdditionalDates})=>{runnerCalls++;return {
    status:'CHUNK_COMPLETE',methodologyVersion:'kr-fg-cnn-r7-1.0.0',
    providerRequests:7,krxRequests:5,bokRequests:2,rowsStored:943,
    additionalSuccessfulDates:targetAdditionalDates,snapshotWritten:false,failureCode:null,
    progress:{successfulTradingDates:targetAdditionalDates,oldestProcessedDate:'20260915',latestProcessedDate:'20260915'},
    leaseReleased:true
  };};
  const h=createKfgRev7CanaryHandler({
    env:customEnv,authenticate:async()=>user,storeFactory:()=>{storeCalls++;return {};},runner
  });
  return {h,counts:()=>({runnerCalls,storeCalls})};
}
test('unauthenticated rejects before store/runner',async()=>{
  const c=context();const r=await c.h(request('POST',{targetAdditional:1}));
  assert.equal(r.status,401);assert.deepEqual(c.counts(),{runnerCalls:0,storeCalls:0});
});
test('operator mismatch rejects',async()=>{
  const c=context({userId:'owner',email:'other@example.test'});
  assert.equal((await c.h(request('POST',{targetAdditional:1}))).status,403);
  assert.equal(c.counts().runnerCalls,0);
});
test('missing KRX/BOK configuration rejects',async()=>{
  const c=context({userId:'owner',email:operator},{DB:{},[REV7_CANARY_OPERATOR_EMAIL_NAME]:operator});
  assert.equal((await c.h(request('POST',{targetAdditional:1}))).status,503);
  assert.deepEqual(c.counts(),{runnerCalls:0,storeCalls:0});
});
test('exact normalized operator reaches bounded runner',async()=>{
  const c=context({userId:'owner',email:' OPERATOR@EXAMPLE.TEST '});
  const r=await c.h(request('POST',{targetAdditional:1,runId:'rev7-canary-1'}));
  const body=await r.json();
  assert.equal(r.status,200);
  assert.equal(body.temporary,'TEMPORARY_KFG_REV7_CANARY_ONLY');
  assert.equal(body.runId,'rev7-canary-1');
  assert.equal(body.providerRequests,7);
  assert.equal(body.successfulDatesAdded,1);
  assert.equal(body.successfulDatesTotal,1);
  assert.equal(body.leaseReleased,true);
  assert.equal(body.productionEligible,false);
});
test('GET and invalid limits reject before runner',async()=>{
  const c=context({userId:'owner',email:operator});
  assert.equal((await c.h(request('GET'))).status,405);
  assert.equal((await c.h(request('POST',{targetAdditional:3}))).status,400);
  assert.equal((await c.h(request('POST',{targetAdditional:1,maxCalendarCandidates:33}))).status,400);
  assert.equal(c.counts().runnerCalls,0);
});
test('denials never expose operator or env names',async()=>{
  const c=context({userId:'owner',email:'other@example.test'});
  const text=JSON.stringify(await (await c.h(request('POST',{targetAdditional:1}))).json());
  assert.equal(text.includes(operator),false);
  assert.equal(text.includes(REV7_CANARY_OPERATOR_EMAIL_NAME),false);
  assert.equal(/KRX_API_KEY|BOK_API_KEY/.test(text),false);
});
