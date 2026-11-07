import test from 'node:test';
import assert from 'node:assert/strict';
import {INFLATION_CANDIDATE_GROUPS,runInflationCandidateOnce} from './inflation-causal-candidate-once.mjs';

test('six approved explicit groups map to exactly seven original candidate IDs',()=>{
  assert.deepEqual(Object.values(INFLATION_CANDIDATE_GROUPS).flatMap(g=>g.ids).sort((a,b)=>a-b),
    [2,16,22,23,24,28,29]);
  assert.deepEqual(Object.keys(INFLATION_CANDIDATE_GROUPS).sort(),
    ['census','cpi','eia','fed','ppi','treasury']);
});

test('default-disabled invokes no collector or provider and ignores invalid groups',async()=>{
  const output=await runInflationCandidateOnce({groups:['*'],quotaFetch:()=>{throw Error('must not fetch');}});
  assert.equal(output.status,'DISABLED');
  assert.equal(output.providerRequests,0);
});

test('scope and quota are preflight blockers before any provider call',async()=>{
  await assert.rejects(()=>runInflationCandidateOnce({approved:true,groups:['*'],quotaFetch:()=>{}}),/SCOPE_INVALID/);
  await assert.rejects(()=>runInflationCandidateOnce({approved:true,groups:['cpi','cpi'],quotaFetch:()=>{}}),/SCOPE_INVALID/);
  await assert.rejects(()=>runInflationCandidateOnce({approved:true,groups:['fed'],quotaFetch:null}),/APPROVED_QUOTA_REQUIRED/);
});

test('grouped CPI and isolated PPI use a single BLS call each with existing key',async()=>{
  const observed=[];
  const collector=async args=>{
    observed.push({group:args.group,key:args.blsKey});
    await args.quotaFetch('fake-provider');
    return {status:'SAVED_READBACK',providerRequests:1};
  };
  let requests=0;
  const result=await runInflationCandidateOnce({approved:true,base:'/tmp/pc-writer',
    groups:['cpi','ppi'],providerEnv:{BLS_API_KEY:'test-key'},
    quotaFetch:async()=>{requests++;return {ok:true};},
    collectors:{cpi:collector,ppi:collector}});
  assert.equal(result.status,'COMPLETE');
  assert.equal(result.providerRequests,2);
  assert.deepEqual(observed,[{group:'cpi',key:'test-key'},{group:'ppi',key:'test-key'}]);
  assert.equal(requests,2);
});

test('missing Census key skips only Census, independent Treasury continues',async()=>{
  const collector=async args=>{await args.quotaFetch('fiscal-data');
    return {status:'UNCHANGED',providerRequests:1};};
  const result=await runInflationCandidateOnce({approved:true,groups:['census','treasury'],
    providerEnv:{},quotaFetch:async()=>({ok:true}),collectors:{treasury:collector}});
  assert.equal(result.status,'PARTIAL_CREDENTIALS_UNAVAILABLE');
  assert.equal(result.providerRequests,1);
  assert.deepEqual(result.skipped,[{group:'census',reason:'CREDENTIAL_UNAVAILABLE'}]);
  assert.deepEqual(result.completed.map(x=>x.group),['treasury']);
});

test('quota overrun in one provider is contained; next independent provider executes',async()=>{
  const collector=async args=>{
    await args.quotaFetch('first');await args.quotaFetch('unexpected-second');
    return {status:'SAVED_READBACK',providerRequests:2};
  };
  const succeeding=async args=>{
    await args.quotaFetch('fed');return {status:'SAVED_READBACK',providerRequests:1};
  };
  let requests=0;
  const result=await runInflationCandidateOnce({approved:true,groups:['treasury','fed'],
    quotaFetch:async()=>{requests++;return {ok:true};},
    collectors:{treasury:collector,fed:succeeding}});
  assert.equal(result.status,'PARTIAL_PREVIOUS_INPUTS_PRESERVED');
  assert.equal(requests,2);
  assert.deepEqual(result.failed,[{group:'treasury',code:'INFL_CANDIDATE_REQUEST_BOUND'}]);
  assert.deepEqual(result.completed.map(x=>x.group),['fed']);
});

test('preserves fixed collector error codes but redacts unknown errors',async()=>{
  const named=async()=>{throw Object.assign(new Error('sensitive provider response'),
    {code:'TREASURY_CUSTOMS_PAGINATION_INCOMPLETE'});};
  const unknown=async()=>{throw Object.assign(new Error('https://secret.example/key=private'),
    {code:'SENSITIVE_PROVIDER_KEY_LEAK'});};
  const result=await runInflationCandidateOnce({approved:true,groups:['treasury','fed'],
    quotaFetch:async()=>({ok:true}),collectors:{treasury:named,fed:unknown}});
  assert.deepEqual(result.failed,[
    {group:'treasury',code:'TREASURY_CUSTOMS_PAGINATION_INCOMPLETE'},
    {group:'fed',code:'INFL_CANDIDATE_SOURCE_FAILED'},
  ]);
  assert.equal(result.providerRequests,0);
});
