import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionPublicationPolicy as policy,validDegradedMarket,runCnnMinuteCycle} from '../scripts/pc-writer/collection-publication-policy.mjs';
test('provider failure does not veto independently validated stored publication',()=>{
 for(const status of ['ERROR','FAILED','SOURCE_FAILED']){
  const result=policy({requested:true,collectionExit:1,collectionStatus:status});
  assert.equal(result.publishAllowed,true);
  assert.equal(result.inputPolicy,'VALID_STORED_INPUTS_ONLY');
  assert.equal(result.collectionDegraded,true);
 }
});
test('quota exhaustion does not require another provider request to publish stored results',()=>{
 assert.deepEqual(policy({requested:true,collectionExit:0,collectionStatus:'SUCCESS',quotaGuarded:true}),{
  publishAllowed:true,collectionDegraded:true,inputPolicy:'VALID_STORED_INPUTS_ONLY',collectionReason:'QUOTA_GUARD'});
});
test('publication remains opt-in and normal collections retain normal input policy',()=>{
 assert.equal(policy({requested:false,collectionExit:1}).publishAllowed,false);
 assert.equal(policy({requested:true,collectionExit:0,collectionStatus:'SUCCESS'}).inputPolicy,'NORMAL_STORED_INPUTS');
});
test('degraded collection cannot publish missing, duplicate or invalid domains as a complete score',()=>{
 const body={status:'SUCCESS',overall:{status:'READY',score:50},domains:Array.from({length:12},(_,i)=>({id:String(i),status:'READY',score:50}))};
 assert.equal(validDegradedMarket(body),true);
 for(const mutate of [b=>b.domains.pop(),b=>b.domains[1].id='0',b=>b.domains[0].status='PARTIAL',b=>b.domains[0].score=null,b=>b.overall.status='PARTIAL',b=>b.overall.score=NaN]){
  const copy=structuredClone(body);mutate(copy);assert.equal(validDegradedMarket(copy),false);
 }
});

test('CNN minute cycle collects once then publishes saved results once',async()=>{
 for(const status of ['COMPLETE','CACHED','COOLDOWN','FAILED']){
  const calls=[];
  const r=await runCnnMinuteCycle({
   collect:async()=>{calls.push('collect');return {lane:'cnn-minute',status:status==='FAILED'?'PARTIAL':'COMPLETE',feeds:[{key:'fear-greed',status}]};},
   publish:async()=>{calls.push('publish');return {lane:'cnn-minute',status:'VERIFIED'};},
  });
  assert.deepEqual(calls,['collect','publish']);
  assert.equal(r.status,status==='FAILED'?'COMPLETE_WITH_COLLECTION_GAPS':'COMPLETE');
 }
});
test('CNN minute cycle never publishes on unknown or active collection or wrong scope',async()=>{
 for(const [receipt,expected] of [
  [null,'COLLECTION_OUTCOME_UNKNOWN'],
  [{lane:'core',status:'COMPLETE'},'COLLECTION_OUTCOME_UNKNOWN'],
  [{lane:'cnn-minute',status:'ALREADY_RUNNING'},'SKIPPED_ACTIVE_COLLECTION'],
  [{lane:'cnn-minute',status:'COMPLETE',feeds:[{key:'other',status:'COMPLETE'}]},'COLLECTION_NOT_VERIFIED'],
  [{lane:'cnn-minute',status:'FAILED'},'COLLECTION_NOT_VERIFIED'],
 ]){
  let calls=0;
  const r=await runCnnMinuteCycle({collect:async()=>receipt,publish:async()=>{calls++;}});
  assert.equal(calls,0);assert.equal(r.status,expected);
 }
});
test('CNN minute cycle does not replay failed or unverified publication',async()=>{
 const collect=async()=>({lane:'cnn-minute',status:'COMPLETE',feeds:[{key:'fear-greed',status:'COMPLETE'}]});
 let calls=0;
 const r=await runCnnMinuteCycle({collect,publish:async()=>{calls++;throw Error('unknown');}});
 assert.equal(r.status,'PUBLICATION_OUTCOME_UNKNOWN');assert.equal(calls,1);
 const partial=await runCnnMinuteCycle({collect,publish:async()=>({lane:'cnn-minute',status:'PARTIAL'})});
 assert.equal(partial.status,'PUBLICATION_NOT_VERIFIED');
});
