import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFiscalQuarterShadowAuditFromDocuments,
  evaluateFiscalWindow,
  formatFiscalQuarterShadowAudit,
} from "../scripts/pc-writer/earnings-r5-fiscal-quarter-shadow-audit.mjs";

const asOf="2026-10-12";
const frame={frame:"CY2026Q2",priorFrame:"CY2025Q2",end:"2026-06-30",priorEnd:"2025-06-30",year:2026,quarter:2};
function fact(val,{start,end,filed,form="10-Q",fp="Q2",fy=2026,frame=null}={}){return {val,start,end,filed,form,fp,fy,frame,accn:`${filed}-${end}-${val}`};}
function concept(unit,rows){return {units:{[unit]:rows}};}
function document(){return {
  cik:1001,
  facts:{"us-gaap":{
    EarningsPerShareDiluted:concept("USD/shares",[
      fact(2,{start:"2026-06-01",end:"2026-08-31",filed:"2026-09-20",fp:"Q2",fy:2026}),
      fact(1,{start:"2025-06-01",end:"2025-08-31",filed:"2025-09-20",fp:"Q2",fy:2025}),
    ]),
    RevenueFromContractWithCustomerExcludingAssessedTax:concept("USD",[
      fact(120,{start:"2026-05-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026}),
      fact(100,{start:"2025-05-01",end:"2025-07-31",filed:"2025-09-01",fp:"Q2",fy:2025}),
    ]),
    OperatingIncomeLoss:concept("USD",[
      fact(24,{start:"2026-05-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026}),
      fact(15,{start:"2025-05-01",end:"2025-07-31",filed:"2025-09-01",fp:"Q2",fy:2025}),
    ]),
    NetIncomeLoss:concept("USD",[
      fact(18,{start:"2026-05-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026}),
      fact(10,{start:"2025-05-01",end:"2025-07-31",filed:"2025-09-01",fp:"Q2",fy:2025}),
    ]),
    NetCashProvidedByUsedInOperatingActivities:concept("USD",[
      fact(30,{start:"2026-05-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026}),
    ]),
    PaymentsToAcquirePropertyPlantAndEquipment:concept("USD",[
      fact(8,{start:"2026-05-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026}),
    ]),
  }},
};}
function inputs(){return {
  members:[{cik:"0000001001",ticker:"TST",name:"Test"}],
  factsByCik:new Map([["0000001001",document()]]),
  submissionsByCik:new Map([["0000001001",{sic:"3571"}]]),
};}

test("independent fiscal coverage is reported separately from strict revenue-anchor coverage",()=>{
  const row=evaluateFiscalWindow({...inputs(),asOf,maxAgeDays:185});
  assert.equal(row.independent.S1,1);
  assert.equal(row.anchored.S1,0);
  assert.equal(row.anchored.S2,1);
  assert.equal(row.anchored.S3,1);
  assert.equal(row.anchored.S4,1);
  assert.equal(row.anchored.S5,1);
  assert.equal(row.anchored.S8,1);
  assert.equal(row.ageStats.n,1);
  assert.equal(row.ageStats.median,73);
  assert.equal(row.industry.D.issuers,1);
  assert.equal(row.industry.D.anchored.S5,1);
});

test("age cap is a real maturity/staleness constraint rather than a gate-fitting override",()=>{
  const row=evaluateFiscalWindow({...inputs(),asOf,maxAgeDays:60});
  assert.equal(row.independent.S1,1);
  assert.equal(row.independent.S2,0);
  assert.equal(row.anchored.S2,0);
  assert.equal(row.ageStats.n,0);
});

test("shadow audit keeps formula, weights, gates and input contract unchanged",()=>{
  const report=buildFiscalQuarterShadowAuditFromDocuments({...inputs(),asOf,frame,ageCaps:[185]});
  assert.equal(report.status,"PASS");
  assert.equal(report.policy.researchOnly,true);
  assert.equal(report.policy.fiscalPolicyAccepted,false);
  assert.equal(report.policy.formulaChanged,false);
  assert.equal(report.policy.weightChanged,false);
  assert.equal(report.policy.scoringGateChanged,false);
  assert.equal(report.policy.inputContractChanged,false);
  assert.equal(report.policy.q4EpsAnnualMinusNineMonths,"FORBIDDEN");
  assert.equal(report.networkCalls,0);
  assert.equal(report.dbWrites,0);
  const text=formatFiscalQuarterShadowAudit(report);
  assert.match(text,/FISCAL_POLICY_ACCEPTED: NO/);
  assert.match(text,/FORMULA_CHANGED: NO/);
  assert.match(text,/INPUT_CONTRACT_CHANGED: NO/);
  assert.match(text,/Q4_EPS_ANNUAL_MINUS_9M: FORBIDDEN/);
});
