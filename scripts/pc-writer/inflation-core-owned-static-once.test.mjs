import test from 'node:test';
import assert from 'node:assert/strict';
import {runCoreOwnedInflationStaticOnce,INFLATION_CORE_STATIC_SCOPE}
 from './inflation-core-owned-static-once.mjs';

const id='c131d4c4-b788-4a1c-9f60-146dd6f7abb1';
const bytes=Buffer.from('valid');
function fixture({busy=false,fail=null,approvalOverride={}}={}){
 const calls=[];
 const writer={
  verify:async()=>{calls.push('lease:verify');},
  claimOnce:async()=>{calls.push('claim');},
  release:async options=>{calls.push('release:'+options.retain);}
 };
 const approval={status:'APPROVED_B',scope:INFLATION_CORE_STATIC_SCOPE,
  requestId:id,runCount:1,coreExecution:'CURRENT_CORE_OWNED_LOCK',
  exactOfficialSources:true,exactTwoTargets:true,dbWrites:false,d1Writes:false,
  taskChanges:false,sourceChanges:false,manifestSha256:'a'.repeat(64),
  ...approvalOverride};
 const adapter={
  authenticateExistingB:async()=>{calls.push('auth');return approval;},
  assertCurrentCoreOwner:async()=>{calls.push('core');},
  tryAcquireSharedWriterLease:async()=>{calls.push('writer');return busy?null:writer;},
  readCurrentSourcePreimage:async()=>{calls.push('preimage');},
  recordOnceJournal:async(_id,phase)=>{calls.push('journal:'+phase);},
  fetchTwoOfficialStaticSources:async()=>{
   calls.push('fetch');if(fail==='fetch')throw Object.assign(new Error('fail'),
     {code:'INFL_CORE_STATIC_TEST_FETCH_STOP'});
   return {providerCalls:2,blsBytes:bytes,censusBytes:bytes};
  },
  preflightExistingStore:async()=>{calls.push('parse');},
  applyUnderExistingBLease:async({requestId})=>{
   calls.push('apply');if(fail==='apply')throw Object.assign(new Error('partial'),
    {code:'INFL_CORE_STATIC_TEST_PARTIAL_STOP'});return {status:'SAVED_READBACK',requestId,
    apiCalls:0,dbWrites:0,d1Writes:0,coreCheckpointWrites:0};
  },
  readbackSavedFiles:async()=>{calls.push('readback');},
 };
 return {adapter,calls};
}
test('refuses missing trusted adapter before doing any I/O',async()=>{
 await assert.rejects(()=>runCoreOwnedInflationStaticOnce({requestId:id,adapter:{}}),
  {code:'INFL_CORE_STATIC_ADAPTER_CONTRACT_STOP'});
});
test('fails closed for approval scope drift without provider I/O',async()=>{
 const f=fixture({approvalOverride:{taskChanges:true}});
 const r=await runCoreOwnedInflationStaticOnce({requestId:id,adapter:f.adapter});
 assert.equal(r.status,'STOP');
 assert.deepEqual(f.calls,['auth']);
});
test('Writer B busy is deferred without claim or fetch',async()=>{
 const f=fixture({busy:true});
 const r=await runCoreOwnedInflationStaticOnce({requestId:id,adapter:f.adapter});
 assert.equal(r.status,'DEFERRED');
 assert.deepEqual(f.calls,['auth','core','writer']);
});
test('single approved execution claims before official GET and reads back',async()=>{
 const f=fixture();
 const r=await runCoreOwnedInflationStaticOnce({requestId:id,adapter:f.adapter});
 assert.equal(r.status,'PASS');
 assert.ok(f.calls.indexOf('claim')<f.calls.indexOf('fetch'));
 assert.ok(f.calls.indexOf('fetch')<f.calls.indexOf('apply'));
 assert.ok(f.calls.indexOf('readback')<f.calls.indexOf('journal:COMPLETED'));
 assert.equal(f.calls.at(-1),'release:false');
});
test('post-claim prewrite failure stops without retaining Writer lock',async()=>{
 const f=fixture({fail:'fetch'});
 const r=await runCoreOwnedInflationStaticOnce({requestId:id,adapter:f.adapter});
 assert.equal(r.status,'STOP');
 assert.equal(r.retry,'NO_AUTOMATIC_REPLAY');
 assert.ok(f.calls.includes('journal:CLAIMED_UNTOUCHED_STOP'));
 assert.equal(f.calls.at(-1),'release:false');
 assert.ok(!f.calls.includes('apply'));
});

test('during-write failure requires reconciliation and retains exact owned lease',async()=>{
 const f=fixture({fail:'apply'});
 const r=await runCoreOwnedInflationStaticOnce({requestId:id,adapter:f.adapter});
 assert.equal(r.status,'RECOVERY_REQUIRED');
 assert.equal(r.retry,'NO_AUTOMATIC_REPLAY');
 assert.ok(f.calls.includes('journal:RECOVERY_REQUIRED'));
 assert.equal(f.calls.at(-1),'release:true');
});
