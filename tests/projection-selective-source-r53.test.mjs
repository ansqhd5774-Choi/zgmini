import test from 'node:test';
import assert from 'node:assert/strict';
import {readStoredMarketInputsSelected} from '../worker/candidate-market-operational-store.mjs';
import {PROJECTION_INPUT_BATCHES} from '../worker/projection-source-r52.mjs';

test('projection batch map is minimal and deterministic',()=>{
 assert.deepEqual(PROJECTION_INPUT_BATCHES.recession,['macro']);
 assert.deepEqual(PROJECTION_INPUT_BATCHES.liquidityCrisis,['macro','credit']);
 assert.deepEqual(PROJECTION_INPUT_BATCHES.creditRisk,['macro','credit']);
 assert.deepEqual(PROJECTION_INPUT_BATCHES.earningsRecession,[]);
 assert.deepEqual(PROJECTION_INPUT_BATCHES.assetBubble,['macro']);
 assert.deepEqual(PROJECTION_INPUT_BATCHES.debtRisk,['macro','credit','bisDsr','bisTc']);
 assert.deepEqual(PROJECTION_INPUT_BATCHES.supplyShock,['macro','supply']);
});

test('selected reader touches only requested input batches',async()=>{
 const reads=[];
 const store={async readInput(key){reads.push(key);return {storedAt:100,body:{series:{[key.toUpperCase()]:[{observationDate:'2026-01-01',value:1}]},external:{[key+'X']:[1]},providerSummary:{[key]:{status:'READY'}}}};}};
 const out=await readStoredMarketInputsSelected(store,['credit','supply'],101);
 assert.deepEqual(reads,['credit','supply']);
 assert.ok(out.series.CREDIT);
 assert.ok(out.series.SUPPLY);
 assert.equal(out.external.creditX[0],1);
 assert.equal(out.external.supplyX[0],1);
});

test('selected reader rejects unapproved batch keys',async()=>{
 const store={async readInput(){throw Error('SHOULD_NOT_RUN')}};
 await assert.rejects(()=>readStoredMarketInputsSelected(store,['macro','not-real'],Date.now()),/INVALID_INPUT_BATCH_KEY/);
});
