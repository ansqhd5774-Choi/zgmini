import test from 'node:test';
import assert from 'node:assert/strict';
import {matchSelectedMarketBatch} from '../lib/score-history/market-batch-provenance-r1.mjs';

const selected={body:{series:{DGS10:[{observationDate:'2026-11-09',value:4.1}]},providerSummary:{ready:true}},storedAt:1794000000000};
const row={batch_key:'macro:2026-11-09T00:00:00Z',stored_at:selected.storedAt,body:JSON.stringify(selected.body)};
const make=(overrides={})=>matchSelectedMarketBatch({key:'macro',selected,candidateRows:[row],decode:JSON.parse,...overrides});

test('returns the exact batch identity and irreversible storage digest',()=>{
 const result=make();
 assert.equal(result.batchKey,row.batch_key);
 assert.equal(result.storedAt,selected.storedAt);
 assert.match(result.storedBodySha256,/^[a-f0-9]{64}$/);
 assert.equal(JSON.stringify(result).includes('DGS10'),false);
 assert.equal(Object.isFrozen(result),true);
});
test('matches decoded bodies independently of JSON object property order',()=>{
 assert.equal(make({candidateRows:[{...row,body:JSON.stringify({providerSummary:{ready:true},series:selected.body.series})}]}).batchKey,row.batch_key);
});
test('same body stored at a different time is not the selected input',()=>{
 assert.throws(()=>make({candidateRows:[{...row,stored_at:row.stored_at+1}]}),/PROVENANCE_UNPROVEN/);
});
test('same time but different saved body is not the selected input',()=>{
 assert.throws(()=>make({candidateRows:[{...row,body:JSON.stringify({series:{}})}]}),/PROVENANCE_UNPROVEN/);
});
test('duplicate saved identities fail closed instead of selecting arbitrarily',()=>{
 assert.throws(()=>make({candidateRows:[row,{...row,batch_key:'macro:duplicate'}]}),/PROVENANCE_AMBIGUOUS/);
});
test('foreign prefix and failed decoding cannot prove a match',()=>{
 assert.throws(()=>make({candidateRows:[{...row,batch_key:'credit:x'}]}),/PROVENANCE_UNPROVEN/);
 assert.throws(()=>make({candidateRows:[{...row,body:'corrupt'}]}),/PROVENANCE_UNPROVEN/);
});
test('unsupported key, missing selected evidence and invalid candidates are rejected',()=>{
 assert.throws(()=>make({key:'other'}),/SOURCE_KEY_UNSUPPORTED/);
 assert.throws(()=>make({selected:{body:null,storedAt:123}}),/SELECTED_INPUT_EVIDENCE_REQUIRED/);
 assert.throws(()=>make({candidateRows:Array.from({length:11},()=>row)}),/CANDIDATES_INVALID/);
});
test('does not call DB, providers, or storage: all evidence is caller supplied',()=>{
 const result=make({candidateRows:[{...row,stored_at:selected.storedAt}, {...row,stored_at:selected.storedAt-1}]});
 assert.equal(result.evidence,'EXACT_STORED_ROW_MATCH');
});
