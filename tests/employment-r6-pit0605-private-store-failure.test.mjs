import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyStoredEta539MissingHistory} from '../lib/market-score/employment-r6-pit04-key-evidence.mjs';

test('PIT0605 fails closed when private evidence cannot be persisted',async()=>{
 let attempts=0;
 await assert.rejects(()=>classifyStoredEta539MissingHistory({
  missingCurrentRows:[],candidateHistoryRows:[],rawSnapshots:[],collectorRuns:[],
  checkedAt:'2026-11-25T23:59:59.999Z',
  writePrivateEvidence:async()=>{attempts++;throw Error('PIT0605_PRIVATE_STORE_FAILED');},
 }),/PIT0605_PRIVATE_STORE_FAILED/);
 assert.equal(attempts,1);
});
