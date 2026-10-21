import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionPublicationPolicy as policy,validDegradedMarket} from '../scripts/pc-writer/collection-publication-policy.mjs';
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
