import test from "node:test";
import assert from "node:assert/strict";
import {selectFsdsDirectQuarter,selectFsdsFlowQuarter,buildFsdsRecoveryDiagnosticFromDocuments} from "../scripts/pc-writer/earnings-r5-fsds-fixed-frame-recovery-diagnostic.mjs";

const f=(overrides={})=>({metric:"revenue",tag:"Revenues",unit:"USD",qtrs:1,val:100,ddate:"2026-06-30",filed:"2026-08-01",adsh:"a",form:"10-Q",...overrides});

test("FSDS direct quarter selects approved qtrs=1 fact near fixed frame",()=>{
  const r=selectFsdsDirectQuarter([f(),f({val:80,ddate:"2026-03-31",adsh:"b"})],{metric:"revenue",tag:"Revenues",frameEnd:"2026-06-30",asOf:"2026-10-12"});
  assert.equal(r.method,"FSDS_DIRECT_Q1");
  assert.equal(r.fact?.val,100);
  assert.equal(r.fact?.source,"SEC_FSDS");
});

test("FSDS flow derives current quarter from matched cumulative facts",()=>{
  const rows=[
    f({metric:"capex",tag:"PaymentsToAcquirePropertyPlantAndEquipment",qtrs:2,val:70,ddate:"2026-06-30",adsh:"q2"}),
    f({metric:"capex",tag:"PaymentsToAcquirePropertyPlantAndEquipment",qtrs:1,val:30,ddate:"2026-03-31",adsh:"q1",filed:"2026-05-01"}),
  ];
  const r=selectFsdsFlowQuarter(rows,{metric:"capex",targetEnd:"2026-06-30",asOf:"2026-10-12"});
  assert.equal(r.method,"FSDS_CUMULATIVE_DELTA");
  assert.equal(r.value,40);
});

test("diagnostic remains research-only and EPS Q4 derivation remains forbidden",()=>{
  const companyFacts={cik:"0000000001",facts:{"us-gaap":{}}};
  const report=buildFsdsRecoveryDiagnosticFromDocuments({
    members:[{cik:"1",ticker:"T"}],
    factsByCik:new Map([["0000000001",companyFacts]]),
    submissionsByCik:new Map([["0000000001",{sic:"3571"}]]),
    fsdsFactsByCik:new Map([["0000000001",[
      f({metric:"eps",tag:"EarningsPerShareDiluted",unit:"USD/shares",val:2}),
      f({metric:"eps",tag:"EarningsPerShareDiluted",unit:"USD/shares",val:1,ddate:"2025-06-30",filed:"2025-08-01",adsh:"p"}),
    ]]]),
    frame:{frame:"CY2026Q2",priorFrame:"CY2025Q2",end:"2026-06-30",priorEnd:"2025-06-30"},
    asOf:"2026-10-12",
  });
  assert.equal(report.status,"PASS");
  assert.equal(report.combined.S1,1);
  assert.equal(report.combined.S7,1);
  assert.equal(report.policies.q4EpsAnnualMinusNineMonths,"FORBIDDEN");
  assert.equal(report.policies.formulaChanged,false);
  assert.equal(report.policies.inputContractChanged,false);
  assert.equal(report.networkCalls,0);
  assert.equal(report.dbWrites,0);
});
