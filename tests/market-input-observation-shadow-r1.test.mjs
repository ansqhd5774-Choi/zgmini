import test from 'node:test';
import assert from 'node:assert/strict';
import {observeStoredMarketInputs} from '../lib/score-history/market-input-observation-shadow-r1.mjs';

const keys=['macro','credit','supply','fundFlows','bisDsr','bisTc','rates'];
const storedAt=1794000000000;
const selected=new Map(keys.map(key=>[key,{storedAt,body:{key,values:[1,2,3]}}]));
const rows=Object.fromEntries(keys.map(key=>[key,[{batch_key:key+':2026-11-09',stored_at:storedAt,body:JSON.stringify(selected.get(key).body)}]]));

function setup({inputRows=rows,values=selected}={}){
 const events=[];
 const store={async readInput(key){events.push('read:'+key);return values.get(key)??null;},writeInput(){throw Error('WRITE_FORBIDDEN');}};
 const db={prepare(sql){assert.match(sql,/^SELECT /);return {bind(pattern){const key=pattern.slice(0,-2);return {async all(){events.push('sql:'+key);return {results:inputRows[key]??[]};}};}};}};
 return {store,db,events};
}

const run=(args={},customReader)=>{
 const env=setup(args);
 const actual={held:{x:1}};
 const reader=customReader??(async store=>{
  const values=await Promise.all(keys.map(key=>store.readInput(key)));
  assert.equal(values[0],(args.values??selected).get('macro'));
  return actual;
 });
 return {env,actual,promise:observeStoredMarketInputs({reader,store:env.store,db:env.db,decode:JSON.parse,now:storedAt})};
};

test('observes all seven actual selections without altering reader result identity',async()=>{
 const {env,actual,promise}=run();
 const result=await promise;
 assert.equal(result.inputs,actual);
 assert.equal(result.provenance.status,'SHADOW_7_BATCHES_ONLY');
 assert.equal(result.provenance.verifiedCount,7);
 assert.equal(result.provenance.sources.length,7);
 assert.equal(env.events.filter(e=>e.startsWith('read:')).length,7);
 assert.equal(env.events.filter(e=>e.startsWith('sql:')).length,7);
 assert.equal(JSON.stringify(result.provenance).includes('values'),false);
});
test('unmatched provenance never changes the existing calculated inputs',async()=>{
 const inputRows={...rows,macro:[]};
 const {actual,promise}=run({inputRows});
 const result=await promise;
 assert.equal(result.inputs,actual);
 assert.equal(result.provenance.verifiedCount,6);
 assert.deepEqual(result.provenance.sources[0],{sourceKey:'macro',status:'UNPROVEN',code:'MARKET_BATCH_PROVENANCE_UNPROVEN'});
});
test('missing selected batch stays missing rather than synthesizing a source',async()=>{
 const values=new Map(selected);values.set('rates',null);
 const {env,promise}=run({values});
 const result=await promise;
 assert.deepEqual(result.provenance.sources.at(-1),{sourceKey:'rates',status:'MISSING'});
 assert.equal(env.events.includes('sql:rates'),false);
});
test('a read failure produces shadow UNPROVEN but never suppresses the score',async()=>{
 const {store}=setup();
 const db={prepare(){throw Error('SECRET_DB_DETAIL');}};
 const actual={status:'SCORE_UNCHANGED'};
 const result=await observeStoredMarketInputs({reader:async s=>{await s.readInput('macro');return actual;},store,db,decode:JSON.parse});
 assert.equal(result.inputs,actual);
 assert.deepEqual(result.provenance.sources[0],{sourceKey:'macro',status:'UNPROVEN',code:'PROVENANCE_READ_FAILED'});
 assert.equal(result.provenance.verifiedCount,0);
});
test('underlying reader exceptions remain visible, never converted into success',async()=>{
 const {store,db}=setup();
 await assert.rejects(observeStoredMarketInputs({reader:async()=>{throw Error('REAL_READER_FAILURE');},store,db,decode:JSON.parse}),/REAL_READER_FAILURE/);
});
test('repeated reads of one key remain ambiguous without another provenance query',async()=>{
 const {store,db,events}=setup();
 const result=await observeStoredMarketInputs({reader:async s=>{await s.readInput('macro');await s.readInput('macro');return {status:'OK'};},store,db,decode:JSON.parse});
 assert.deepEqual(result.provenance.sources[0],{sourceKey:'macro',status:'UNPROVEN',code:'MULTIPLE_SELECTED_READS'});
 assert.equal(events.includes('sql:macro'),false);
});
test('unselected keys remain unproven, not treated as verified or missing',async()=>{
 const {store,db}=setup();
 const result=await observeStoredMarketInputs({reader:async s=>{await s.readInput('credit');return {};},store,db,decode:JSON.parse});
 assert.equal(result.provenance.sources[0].code,'READER_DID_NOT_SELECT');
 assert.equal(result.provenance.verifiedCount,1);
});
test('invalid store/reader is rejected before operating',async()=>{
 await assert.rejects(observeStoredMarketInputs({reader:()=>({}),store:{}}),/MARKET_SHADOW_READER_REQUIRED/);
});

test('optional direct Reader witness must match the shadow exact-row hash evidence',async()=>{
 const env=setup();
 const store={readInput:async(key,{onSelection}={})=>{
  const value=await env.store.readInput(key);
  onSelection?.({sourceKey:key,batchKey:key+':2026-11-09',storedAt});
  return value;
 }};
 const reader=async(s,now,{onSelection})=>{
  await Promise.all(keys.map(key=>s.readInput(key,{onSelection})));
  return {status:'INPUTS_UNCHANGED'};
 };
 const result=await observeStoredMarketInputs({reader,store,db:env.db,decode:JSON.parse,now:storedAt});
 assert.equal(result.provenance.verifiedCount,7);
 assert.ok(result.provenance.sources.every(x=>x.selectionWitness==='READER_DIRECT_ID'));
});

test('contradictory direct witness fails closed without changing Reader output',async()=>{
 const env=setup();
 const store={readInput:async(key,{onSelection}={})=>{
  const value=await env.store.readInput(key);
  onSelection?.({sourceKey:key,batchKey:key==='macro'?'macro:incorrect':key+':2026-11-09',storedAt});
  return value;
 }};
 const body={status:'INPUTS_UNCHANGED'};
 const reader=async(s,now,{onSelection})=>{
  await Promise.all(keys.map(key=>s.readInput(key,{onSelection})));
  return body;
 };
 const result=await observeStoredMarketInputs({reader,store,db:env.db,decode:JSON.parse,now:storedAt});
 assert.equal(result.inputs,body);
 assert.equal(result.provenance.verifiedCount,6);
 assert.deepEqual(result.provenance.sources[0],
  {sourceKey:'macro',status:'UNPROVEN',code:'DIRECT_SELECTION_MISMATCH'});
});

test('a cross-key callback is rejected for the actually requested input',async()=>{
 const env=setup();
 const store={readInput:async(key,{onSelection}={})=>{
  const value=await env.store.readInput(key);
  onSelection?.({sourceKey:key==='macro'?'credit':key,batchKey:key+':2026-11-09',storedAt});
  return value;
 }};
 const actual={status:'UNCHANGED'};
 const reader=async(s,now,{onSelection})=>{
  await Promise.all(keys.map(key=>s.readInput(key,{onSelection})));
  return actual;
 };
 const result=await observeStoredMarketInputs({reader,store,db:env.db,decode:JSON.parse,now:storedAt});
 assert.equal(result.inputs,actual);
 assert.equal(result.provenance.verifiedCount,6);
 assert.deepEqual(result.provenance.sources[0],
  {sourceKey:'macro',status:'UNPROVEN',code:'DIRECT_SELECTION_MISMATCH'});
 assert.equal(result.provenance.sources[1].selectionWitness,'READER_DIRECT_ID');
});
