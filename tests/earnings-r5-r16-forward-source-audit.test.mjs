import test from "node:test";
import assert from "node:assert/strict";
import {
  E1_R5_S12_SOURCE_AUDIT,
  E1_R5_S13_SEC_CANDIDATE,
  buildEarningsR5ForwardSourceAudit,
  classifySecGuidanceCandidateFiling,
  recentFilingsFromSubmission,
  summarizeSecGuidanceCandidates,
} from "../lib/market-score/earnings-e1-r5-forward-sources.mjs";
import {formatEarningsR5R16ForwardAuditText} from "../scripts/pc-writer/earnings-r5-r16-forward-source-audit.mjs";

function submission(rows){
  return {filings:{recent:{
    accessionNumber:rows.map(row=>row.accessionNumber),
    filingDate:rows.map(row=>row.filingDate),
    form:rows.map(row=>row.form),
    items:rows.map(row=>row.items),
    primaryDocument:rows.map(row=>row.primaryDocument),
  }}};
}

test("S12 reviewed sources all fail the free-commercial requirement without changing the formula",()=>{
  assert.ok(E1_R5_S12_SOURCE_AUDIT.length>=5);
  assert.equal(E1_R5_S12_SOURCE_AUDIT.some(item=>item.accepted),false);
  const report=buildEarningsR5ForwardSourceAudit({submissionsByCik:new Map(),asOf:"2026-10-12"});
  assert.equal(report.status,"PARTIAL");
  assert.equal(report.s12.status,"BLOCKED");
  assert.equal(report.s12.acceptedSource,null);
  assert.equal(report.formulaChanged,false);
  assert.equal(report.weightChanged,false);
  assert.equal(report.productionActivation,false);
});

test("SEC 8-K guidance candidate requires approved items, bounded dates, accession and primary document",()=>{
  const good=classifySecGuidanceCandidateFiling({
    form:"8-K",filingDate:"2026-09-30",items:"2.02, 7.01",accessionNumber:"0000123456-26-123456",primaryDocument:"earnings8k.htm",
  },{asOf:"2026-10-12",lookbackDays:185});
  assert.equal(good.status,"CANDIDATE");
  assert.deepEqual(good.items,["2.02","7.01"]);
  assert.equal(classifySecGuidanceCandidateFiling({...good,form:"10-Q"},{asOf:"2026-10-12"}).status,"REJECT");
  assert.equal(classifySecGuidanceCandidateFiling({form:"8-K",filingDate:"2026-09-30",items:"1.01",accessionNumber:"0000123456-26-123456",primaryDocument:"x.htm"},{asOf:"2026-10-12"}).reason,"GUIDANCE_RELEVANT_ITEM_MISSING");
  assert.equal(classifySecGuidanceCandidateFiling({form:"8-K",filingDate:"2025-01-01",items:"2.02",accessionNumber:"0000123456-25-123456",primaryDocument:"x.htm"},{asOf:"2026-10-12",lookbackDays:185}).reason,"OUTSIDE_LOOKBACK");
});

test("SEC submissions recent arrays are reconstructed without guessing missing fields",()=>{
  const rows=recentFilingsFromSubmission(submission([
    {accessionNumber:"0000123456-26-123456",filingDate:"2026-09-30",form:"8-K",items:"2.02",primaryDocument:"a.htm"},
    {accessionNumber:"0000123456-26-123457",filingDate:"2026-10-01",form:"10-Q",items:"",primaryDocument:"b.htm"},
  ]));
  assert.equal(rows.length,2);
  assert.equal(rows[0].form,"8-K");
  assert.equal(rows[1].primaryDocument,"b.htm");
});

test("S13 source audit counts candidate issuers and filings but remains non-production",()=>{
  const submissions=new Map([
    ["0000000001",submission([
      {accessionNumber:"0000000001-26-000001",filingDate:"2026-09-20",form:"8-K",items:"2.02",primaryDocument:"a.htm"},
      {accessionNumber:"0000000001-26-000002",filingDate:"2026-10-01",form:"8-K",items:"7.01",primaryDocument:"b.htm"},
    ])],
    ["0000000002",submission([
      {accessionNumber:"0000000002-26-000001",filingDate:"2026-09-25",form:"10-Q",items:"",primaryDocument:"q.htm"},
    ])],
  ]);
  const evidence=summarizeSecGuidanceCandidates(submissions,{asOf:"2026-10-12",lookbackDays:185});
  assert.equal(evidence.status,"PASS");
  assert.equal(evidence.documentsValid,2);
  assert.equal(evidence.issuerCandidates,1);
  assert.equal(evidence.candidateFilings,2);
  assert.equal(evidence.issuers[0].latest.filed,"2026-10-01");
  const report=buildEarningsR5ForwardSourceAudit({submissionsByCik:submissions,asOf:"2026-10-12"});
  assert.equal(report.s13.status,"CANDIDATE");
  assert.equal(report.s13.source.id,E1_R5_S13_SEC_CANDIDATE.id);
  assert.equal(report.networkCalls,0);
  assert.equal(report.dbWrites,0);
  assert.equal(report.productionActivation,false);
});

test("R16 text makes blocked S12 and candidate-only S13 explicit",()=>{
  const report=buildEarningsR5ForwardSourceAudit({submissionsByCik:new Map([["0000000001",submission([
    {accessionNumber:"0000000001-26-000001",filingDate:"2026-09-20",form:"8-K",items:"2.02",primaryDocument:"a.htm"},
  ])]]),asOf:"2026-10-12"});
  report.at="2026-10-12T00:00:00.000Z";
  report.asOf="2026-10-12";
  report.files={submissions:1,universe:1};
  const text=formatEarningsR5R16ForwardAuditText(report);
  assert.match(text,/S12: BLOCKED/);
  assert.match(text,/S13: CANDIDATE/);
  assert.match(text,/NETWORK_CALLS: 0/);
  assert.match(text,/PRODUCTION_ACTIVATION: NO/);
});
