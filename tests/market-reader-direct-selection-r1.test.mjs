import test from 'node:test';
import assert from 'node:assert/strict';
import {readValidatedInput} from '../worker/market-input-validation.mjs';
import {readStoredMarketInputs} from '../worker/candidate-market-operational-store.mjs';
import {RATE_R2_PROVIDER_CONTRACT} from '../lib/market-score/rate-r2-provider.mjs';

const now=Date.parse('2026-11-10T12:00:00.000Z');
const row={observationDate:'2026-11-09',value:0};
const valid={rateR2:{status:'READY',series:Object.fromEntries(
 RATE_R2_PROVIDER_CONTRACT.requiredSeries.map(id=>[id,[row]]))}};
const candidates=[{batch_key:'rates:invalid',stored_at:now+1000,body:'{}'},
 {batch_key:'rates:verified',stored_at:now,body:JSON.stringify(valid)}];

function fixture(){
 const queries=[];
 const db={prepare(sql){queries.push(sql);return {bind(key){assert.equal(key,'rates:%');
  return {async all(){return {results:candidates};}};}};}};
 return {db,queries};
}

test('default validated Reader preserves original SQL, selected body and return shape',async()=>{
 const {db,queries}=fixture();
 const result=await readValidatedInput(db,'rates',JSON.parse);
 assert.deepEqual(result,{body:valid,storedAt:now});
 assert.equal(queries.length,1);
 assert.match(queries[0],/^SELECT body,stored_at /);
});

test('opt-in witness reports the exactly selected valid batch key, not a rejected newer row',async()=>{
 const {db,queries}=fixture(),events=[];
 const result=await readValidatedInput(db,'rates',JSON.parse,{onSelection:x=>events.push(x)});
 assert.deepEqual(result,{body:valid,storedAt:now});
 assert.match(queries[0],/^SELECT batch_key,body,stored_at /);
 assert.deepEqual(events,[{sourceKey:'rates',batchKey:'rates:verified',storedAt:now}]);
 assert.equal(JSON.stringify(events).includes('rateR2'),false);
});

test('observer failure cannot change original calculation input or suppress selection',async()=>{
 const {db}=fixture();
 const result=await readValidatedInput(db,'rates',JSON.parse,
  {onSelection(){throw Error('PRIVATE_OBSERVER_FAILED');}});
 assert.deepEqual(result,{body:valid,storedAt:now});
});

test('Reader passes optional witness to seven store reads only when requested',async()=>{
 const keys=[],observed=[];
 const store={async readInput(key,options){keys.push({key,withObserver:!!options?.onSelection});
  options?.onSelection?.({sourceKey:key,batchKey:key+':verified',storedAt:now});
  return null;}};
 assert.deepEqual(await readStoredMarketInputs(store,now),{series:{},external:{},providerSummary:{}});
 assert.equal(keys.length,7);
 assert.ok(keys.every(x=>!x.withObserver));
 keys.length=0;
 assert.deepEqual(await readStoredMarketInputs(store,now,{onSelection:x=>observed.push(x)}),
  {series:{},external:{},providerSummary:{}});
 assert.equal(keys.length,7);
 assert.ok(keys.every(x=>x.withObserver));
 assert.deepEqual(observed.map(x=>x.sourceKey),['macro','credit','supply','fundFlows','bisDsr','bisTc','rates']);
});
