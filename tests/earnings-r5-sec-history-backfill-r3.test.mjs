import test from 'node:test';
import assert from 'node:assert/strict';
import {E1_R5_SEC_HISTORY_BACKFILL_R3_CONTRACT,E1_R5_SEC_HISTORY_BACKFILL_R3_VERSION,buildR3HistoricalBackfillPlan,buildR3SeedLedger} from '../scripts/pc-writer/earnings-r5-sec-history-backfill-r3.mjs';

const CURRENT='0000000001-26-000010';
const cik='0000000001';
function submissions(){
 const dates=['2026-09-01','2026-07-01','2026-05-01','2026-03-01','2026-01-01','2025-11-01','2025-09-01'];
 return {filings:{recent:{
  accessionNumber:[CURRENT,...dates.map((_,i)=>`0000000001-25-0000${String(i+20).padStart(2,'0')}`)],
  filingDate:['2026-10-01',...dates],
  form:Array(8).fill('8-K'),
  items:Array(8).fill('2.02'),
  primaryDocument:['current.htm',...dates.map((_,i)=>`prior-${i}.htm`)],
  acceptanceDateTime:['20261001120000',...dates.map(d=>d.replaceAll('-','')+'120000')],
 }}};
}

test('R3 contract is exactly approved 730 days / six priors and remains research-only',()=>{
 assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R3_VERSION,'E1-R5-SEC-HISTORY-BACKFILL-R3');
 assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R3_CONTRACT.lookbackDays,730);
 assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R3_CONTRACT.priorPerIssuer,6);
 assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R3_CONTRACT.maxRequestsPerRun,100);
 assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R3_CONTRACT.researchOnly,true);
 assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R3_CONTRACT.productionActivation,false);
 assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R3_CONTRACT.dbWrites,0);
 assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R3_CONTRACT.mutatesCurrentCheckpoint,false);
 assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R3_CONTRACT.mutatesR1Ledger,false);
 assert.equal(E1_R5_SEC_HISTORY_BACKFILL_R3_CONTRACT.mutatesR2Ledger,false);
});

test('R3 planner selects no more than six eligible prior filings',()=>{
 const checkpoint={version:'E1-R5-R17-SEC-GUIDANCE-R1',completed:{[CURRENT]:{cik,filed:'2026-10-01',accessionNumber:CURRENT}}};
 const plan=buildR3HistoricalBackfillPlan({checkpoint,submissionsByCik:new Map([[cik,submissions()]]),asOf:'2026-10-12',lookbackDays:730,priorPerIssuer:6});
 assert.equal(plan.currentIssuerCount,1);
 assert.equal(plan.plan.length,6);
 assert.equal(plan.plan[0].filed,'2026-09-01');
 assert.equal(plan.plan.at(-1).filed,'2025-11-01');
});

test('R3 seed copies R2 completed records without mutating R2',()=>{
 const r2={version:'E1-R5-SEC-HISTORY-BACKFILL-R2',sourceCorpusVersion:'E1-R5-R17-SEC-GUIDANCE-R1',asOf:'2026-10-12',lookbackDays:550,priorPerIssuer:4,completed:{A:{cik:'1',filed:'2026-01-01'}}};
 const before=JSON.stringify(r2);
 const r3=buildR3SeedLedger({r2Ledger:r2,asOf:'2026-10-12'});
 assert.equal(r3.version,'E1-R5-SEC-HISTORY-BACKFILL-R3');
 assert.equal(r3.lookbackDays,730);
 assert.equal(r3.priorPerIssuer,6);
 assert.equal(r3.seededFrom.completedAccessions,1);
 assert.deepEqual(r3.completed,r2.completed);
 assert.equal(JSON.stringify(r2),before);
 r3.completed.A.filed='2000-01-01';
 assert.equal(r2.completed.A.filed,'2026-01-01');
});
