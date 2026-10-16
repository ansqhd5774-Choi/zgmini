import test from 'node:test';
import assert from 'node:assert/strict';
import {
  E1_R5_SEC_HISTORY_BACKFILL_R2_VERSION,
  E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT,
  buildR2SeedLedger,
} from '../scripts/pc-writer/earnings-r5-sec-history-backfill-r2.mjs';

const r1={
  version:'E1-R5-SEC-HISTORY-BACKFILL-R1',
  sourceCorpusVersion:'E1-R5-R17-SEC-GUIDANCE-R1',
  asOf:'2026-10-12',
  lookbackDays:550,
  priorPerIssuer:2,
  researchOnly:true,
  completed:{
    '0000000001-26-000090':{cik:'0000000001',accessionNumber:'0000000001-26-000090'},
    '0000000002-26-000190':{cik:'0000000002',accessionNumber:'0000000002-26-000190'},
  },
};

test('R2 contract expands only prior depth and stays research-only',()=>{
  assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R2_VERSION,'E1-R5-SEC-HISTORY-BACKFILL-R2');
  assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT.lookbackDays,550);
  assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT.priorPerIssuer,4);
  assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT.maxRequestsPerRun,100);
  assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT.productionActivation,false);
  assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT.dbWrites,0);
  assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R2_CONTRACT.mutatesCurrentCheckpoint,false);
});

test('R2 seed copies R1 completed entries without mutating R1',()=>{
  const before=JSON.stringify(r1),r2=buildR2SeedLedger({r1Ledger:r1,asOf:'2026-10-12'});
  assert.equal(r2.version,'E1-R5-SEC-HISTORY-BACKFILL-R2');
  assert.equal(r2.lookbackDays,550);
  assert.equal(r2.priorPerIssuer,4);
  assert.equal(r2.seededFrom.version,'E1-R5-SEC-HISTORY-BACKFILL-R1');
  assert.equal(r2.seededFrom.completedAccessions,2);
  assert.deepEqual(Object.keys(r2.completed).sort(),Object.keys(r1.completed).sort());
  r2.completed['0000000001-26-000090'].extra=true;
  assert.equal(r1.completed['0000000001-26-000090'].extra,undefined);
  assert.equal(JSON.stringify(r1),before);
});

test('R2 seed fails closed on drifted R1 contract',()=>{
  assert.throws(()=>buildR2SeedLedger({r1Ledger:{...r1,priorPerIssuer:3},asOf:'2026-10-12'}),/R1_SEED_CONTRACT_MISMATCH/);
  assert.throws(()=>buildR2SeedLedger({r1Ledger:r1,asOf:'2026-10-13'}),/R1_SEED_CONTRACT_MISMATCH/);
});
