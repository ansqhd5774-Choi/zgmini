import test from 'node:test';
import assert from 'node:assert/strict';
import {collectDiagnosticLiveInputs} from '../worker/diagnostic-v1-canary.mjs';

test('independent external sources and SEC start before FRED completes',async()=>{
  let release;const gate=new Promise(resolve=>{release=resolve});const seen=new Set();
  const empty=async()=>({status:'PARTIAL',rows:[]});
  const promise=collectDiagnosticLiveInputs({
    env:{FRED_API_KEY:'fixture'},asOf:'2026-09-23',fetchImpl:async()=>{throw Error('NETWORK_FORBIDDEN')},
    adapters:{
      fetchFred:async seriesId=>{await gate;return {seriesId,status:'READY_CURRENT_VINTAGE',rows:[]}},
      fetchOfr:async()=>{seen.add('ofr');return empty()},fetchCmdi:empty,fetchGscpi:empty,fetchCopper:empty,fetchBis:empty,
      fetchFundFlows:async()=>{seen.add('sec');return empty()},
    },
  });
  const started=[...seen].sort();release();const result=await promise;
  assert.deepEqual(started,['ofr','sec']);
  assert.deepEqual(result.external.breadthScoreRows,[]);assert.equal(result.external.earningsScores,null);
  assert.equal(result.external.publicDomainScores.breadth.providerRequests,0);
  assert.equal(result.external.publicDomainScores.earnings.providerRequests,0);
});
