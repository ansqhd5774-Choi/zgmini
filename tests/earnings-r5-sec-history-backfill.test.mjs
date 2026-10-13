import test from "node:test";
import assert from "node:assert/strict";
import {
  E1_R5_SEC_HISTORY_BACKFILL_CONTRACT,
  E1_R5_SEC_HISTORY_BACKFILL_VERSION,
  buildHistoricalBackfillPlan,
} from "../scripts/pc-writer/earnings-r5-sec-history-backfill.mjs";

function submission(rows){
  return {
    filings:{recent:{
      accessionNumber:rows.map(row=>row.accessionNumber),
      filingDate:rows.map(row=>row.filingDate),
      form:rows.map(row=>row.form),
      items:rows.map(row=>row.items),
      primaryDocument:rows.map(row=>row.primaryDocument),
      acceptanceDateTime:rows.map(row=>row.acceptanceDateTime??null),
    }},
  };
}

const checkpoint={
  version:"E1-R5-R17-SEC-GUIDANCE-R1",
  asOf:"2026-10-12",
  completed:{
    "0000000001-26-000100":{cik:"0000000001",filed:"2026-10-01",accessionNumber:"0000000001-26-000100"},
    "0000000002-26-000200":{cik:"0000000002",filed:"2026-09-30",accessionNumber:"0000000002-26-000200"},
  },
};

test("history contract stays research-only and does not mutate the current R17 checkpoint",()=>{
  assert.equal(E1_R5_SEC_HISTORY_BACKFILL_VERSION,"E1-R5-SEC-HISTORY-BACKFILL-R1");
  assert.equal(E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.sourceCorpusVersion,"E1-R5-R17-SEC-GUIDANCE-R1");
  assert.equal(E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.productionActivation,false);
  assert.equal(E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.dbWrites,0);
  assert.equal(E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.mutatesCurrentCheckpoint,false);
  assert.equal(E1_R5_SEC_HISTORY_BACKFILL_CONTRACT.maxRequestsPerRun,100);
});

test("plan selects bounded prior guidance candidates and excludes current/non-guidance filings",()=>{
  const submissions=new Map([
    ["0000000001",submission([
      {accessionNumber:"0000000001-26-000100",filingDate:"2026-10-01",form:"8-K",items:"2.02",primaryDocument:"current.htm"},
      {accessionNumber:"0000000001-26-000090",filingDate:"2026-07-20",form:"8-K",items:"2.02",primaryDocument:"q2.htm"},
      {accessionNumber:"0000000001-26-000080",filingDate:"2026-04-20",form:"8-K",items:"7.01",primaryDocument:"q1.htm"},
      {accessionNumber:"0000000001-26-000070",filingDate:"2026-02-20",form:"8-K",items:"5.02",primaryDocument:"other.htm"},
      {accessionNumber:"0000000001-25-000060",filingDate:"2025-10-20",form:"10-K",items:"2.02",primaryDocument:"10k.htm"},
    ])],
    ["0000000002",submission([
      {accessionNumber:"0000000002-26-000200",filingDate:"2026-09-30",form:"8-K",items:"2.02",primaryDocument:"current.htm"},
      {accessionNumber:"0000000002-26-000190",filingDate:"2026-06-30",form:"8-K/A",items:"2.02 7.01",primaryDocument:"prior.htm"},
    ])],
  ]);
  const result=buildHistoricalBackfillPlan({checkpoint,submissionsByCik:submissions,asOf:"2026-10-12",lookbackDays:550,priorPerIssuer:2});
  assert.equal(result.currentIssuerCount,2);
  assert.equal(result.missingSubmissionCiks,0);
  assert.equal(result.noPriorCandidateCiks,0);
  assert.equal(result.plannedIssuerCount,2);
  assert.deepEqual(result.plan.map(item=>item.accessionNumber),[
    "0000000001-26-000090",
    "0000000001-26-000080",
    "0000000002-26-000190",
  ]);
  assert.ok(result.plan.every(item=>item.accessionNumber!==item.currentAccessionNumber));
  assert.ok(result.plan.every(item=>item.filed<item.currentFiled));
});

test("plan reports missing local submissions and issuers without prior candidates without inventing data",()=>{
  const submissions=new Map([
    ["0000000001",submission([
      {accessionNumber:"0000000001-26-000100",filingDate:"2026-10-01",form:"8-K",items:"2.02",primaryDocument:"current.htm"},
    ])],
  ]);
  const result=buildHistoricalBackfillPlan({checkpoint,submissionsByCik:submissions,asOf:"2026-10-12",lookbackDays:550,priorPerIssuer:2});
  assert.equal(result.plan.length,0);
  assert.equal(result.noPriorCandidateCiks,1);
  assert.equal(result.missingSubmissionCiks,1);
});

test("plan fails closed when source corpus contract does not match",()=>{
  assert.throws(()=>buildHistoricalBackfillPlan({checkpoint:{...checkpoint,version:"WRONG"},submissionsByCik:new Map(),asOf:"2026-10-12",lookbackDays:550,priorPerIssuer:2}),/SOURCE_CORPUS_VERSION_MISMATCH/);
});
