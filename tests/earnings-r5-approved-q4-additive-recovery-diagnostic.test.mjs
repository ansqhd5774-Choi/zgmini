import test from "node:test";
import assert from "node:assert/strict";
import {deriveApprovedQ4Fact,selectQuarterWithApprovedQ4,buildApprovedQ4RecoveryDiagnosticFromDocuments} from "../scripts/pc-writer/earnings-r5-approved-q4-additive-recovery-diagnostic.mjs";

const fact=({val,start,end,filed,form="10-K",fy=2026,fp="FY",accn})=>({val,start,end,filed,form,fy,fp,accn:accn??`${end}-${val}`});
function metric(units){return {units};}
function doc(){return {cik:"0000000001",facts:{"us-gaap":{
  RevenueFromContractWithCustomerExcludingAssessedTax:metric({USD:[
    fact({val:1000,start:"2025-07-01",end:"2026-06-30",filed:"2026-08-15"}),
    fact({val:700,start:"2025-07-01",end:"2026-03-31",filed:"2026-05-10",form:"10-Q",fp:"Q3"}),
    fact({val:900,start:"2024-07-01",end:"2025-06-30",filed:"2025-08-15",fy:2025}),
    fact({val:650,start:"2024-07-01",end:"2025-03-31",filed:"2025-05-10",form:"10-Q",fy:2025,fp:"Q3"}),
  ]}),
  OperatingIncomeLoss:metric({USD:[
    fact({val:100,start:"2025-07-01",end:"2026-06-30",filed:"2026-08-15"}),
    fact({val:70,start:"2025-07-01",end:"2026-03-31",filed:"2026-05-10",form:"10-Q",fp:"Q3"}),
    fact({val:90,start:"2024-07-01",end:"2025-06-30",filed:"2025-08-15",fy:2025}),
    fact({val:65,start:"2024-07-01",end:"2025-03-31",filed:"2025-05-10",form:"10-Q",fy:2025,fp:"Q3"}),
  ]}),
  NetIncomeLoss:metric({USD:[
    fact({val:60,start:"2025-07-01",end:"2026-06-30",filed:"2026-08-15"}),
    fact({val:40,start:"2025-07-01",end:"2026-03-31",filed:"2026-05-10",form:"10-Q",fp:"Q3"}),
  ]}),
  NetCashProvidedByUsedInOperatingActivities:metric({USD:[
    fact({val:200,start:"2025-07-01",end:"2026-06-30",filed:"2026-08-15"}),
    fact({val:120,start:"2025-07-01",end:"2026-03-31",filed:"2026-05-10",form:"10-Q",fp:"Q3"}),
  ]}),
  PaymentsToAcquirePropertyPlantAndEquipment:metric({USD:[
    fact({val:70,start:"2025-07-01",end:"2026-06-30",filed:"2026-08-15"}),
    fact({val:40,start:"2025-07-01",end:"2026-03-31",filed:"2026-05-10",form:"10-Q",fp:"Q3"}),
  ]}),
}}};}

test("approved additive Q4 derives annual minus matched 9M while EPS stays forbidden",()=>{
  const d=doc();
  const revenue=deriveApprovedQ4Fact(d,{metric:"revenue",tag:"RevenueFromContractWithCustomerExcludingAssessedTax",frameEnd:"2026-06-30",asOf:"2026-10-12"});
  assert.equal(revenue.method,"ANNUAL_MINUS_9M");
  assert.equal(revenue.fact?.val,300);
  const eps=deriveApprovedQ4Fact(d,{metric:"eps",tag:"EarningsPerShareDiluted",frameEnd:"2026-06-30",asOf:"2026-10-12"});
  assert.equal(eps.fact,null);
  assert.equal(eps.reason,"Q4_EPS_FORBIDDEN");
});

test("direct quarter remains preferred over Q4 derivation",()=>{
  const d=doc();
  d.facts["us-gaap"].RevenueFromContractWithCustomerExcludingAssessedTax.units.USD.push({val:305,start:"2026-04-01",end:"2026-06-30",frame:"CY2026Q2",filed:"2026-08-20",form:"10-Q",fy:2026,fp:"Q2",accn:"direct"});
  const selected=selectQuarterWithApprovedQ4(d,{metric:"revenue",tag:"RevenueFromContractWithCustomerExcludingAssessedTax",frame:"CY2026Q2",frameEnd:"2026-06-30",asOf:"2026-10-12"});
  assert.equal(selected.method,"DIRECT_QUARTER");
  assert.equal(selected.fact?.val,305);
});

test("diagnostic is research-only and improves additive components without changing EPS policy",()=>{
  const report=buildApprovedQ4RecoveryDiagnosticFromDocuments({members:[{cik:"1",ticker:"TEST"}],factsByCik:new Map([["0000000001",doc()]]),submissionsByCik:new Map([["0000000001",{sic:"3571"}]]),frame:{frame:"CY2026Q2",priorFrame:"CY2025Q2",end:"2026-06-30",priorEnd:"2025-06-30"},asOf:"2026-10-12"});
  assert.equal(report.status,"PASS");
  assert.equal(report.q4.S1,report.baseline.S1);
  assert.equal(report.q4.S7,report.baseline.S7);
  assert.equal(report.q4.S2,1);
  assert.equal(report.q4.S3,1);
  assert.equal(report.q4.S4,1);
  assert.equal(report.q4.S5,1);
  assert.equal(report.q4.S8,1);
  assert.equal(report.policies.q4EpsAnnualMinusNineMonths,"FORBIDDEN");
  assert.equal(report.policies.inputContractChanged,false);
  assert.equal(report.policies.productionActivation,false);
});
