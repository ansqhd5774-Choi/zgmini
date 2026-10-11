import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDocumentFocusDiagnosticFromDocuments,
  selectDocumentFocusComparablePair,
} from "../scripts/pc-writer/earnings-r5-document-focus-diagnostic.mjs";

const asOf="2026-10-11";
function fact(val,{start,end,filed,form="10-Q",fp="Q2",fy=2026,accn="0001"}={}){
  return {val,start,end,filed,form,fp,fy,frame:null,accn};
}
function concept(unit,rows){return {units:{[unit]:rows}};}
function document(){
  const currentAccn="2026-Q2";
  return {
    cik:1001,
    facts:{"us-gaap":{
      EarningsPerShareDiluted:concept("USD/shares",[
        fact(2,{start:"2026-05-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026,accn:currentAccn}),
        fact(1,{start:"2025-05-01",end:"2025-07-31",filed:"2025-09-01",fp:"Q2",fy:2025,accn:"2025-Q2"}),
        fact(1.1,{start:"2025-05-01",end:"2025-07-31",filed:"2026-09-01",fp:"Q2",fy:2026,accn:currentAccn}),
      ]),
      RevenueFromContractWithCustomerExcludingAssessedTax:concept("USD",[
        fact(120,{start:"2026-05-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026,accn:currentAccn}),
        fact(100,{start:"2025-05-01",end:"2025-07-31",filed:"2025-09-01",fp:"Q2",fy:2025,accn:"2025-Q2"}),
        fact(101,{start:"2025-05-01",end:"2025-07-31",filed:"2026-09-01",fp:"Q2",fy:2026,accn:currentAccn}),
      ]),
      OperatingIncomeLoss:concept("USD",[
        fact(24,{start:"2026-05-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026,accn:currentAccn}),
        fact(15,{start:"2025-05-01",end:"2025-07-31",filed:"2026-09-01",fp:"Q2",fy:2026,accn:currentAccn}),
      ]),
      NetIncomeLoss:concept("USD",[
        fact(18,{start:"2026-05-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026,accn:currentAccn}),
        fact(10,{start:"2025-05-01",end:"2025-07-31",filed:"2026-09-01",fp:"Q2",fy:2026,accn:currentAccn}),
      ]),
      NetCashProvidedByUsedInOperatingActivities:concept("USD",[
        fact(30,{start:"2026-02-01",end:"2026-04-30",filed:"2026-06-01",fp:"Q1",fy:2026,accn:"2026-Q1"}),
        fact(80,{start:"2026-02-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026,accn:currentAccn}),
      ]),
      PaymentsToAcquirePropertyPlantAndEquipment:concept("USD",[
        fact(8,{start:"2026-02-01",end:"2026-04-30",filed:"2026-06-01",fp:"Q1",fy:2026,accn:"2026-Q1"}),
        fact(20,{start:"2026-02-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026,accn:currentAccn}),
      ]),
    }},
  };
}

test("document-focus fy is diagnostic metadata, not a comparable-fact year gate",()=>{
  const pair=selectDocumentFocusComparablePair(document(),{metric:"eps",asOf,maxAgeDays:185});
  assert.equal(pair.reason,null);
  assert.equal(pair.current.val,2);
  assert.equal(pair.prior.val,1.1);
  assert.equal(pair.metadata.fyDelta,0);
  assert.equal(pair.metadata.fpRelation,"MATCH");
  assert.equal(pair.metadata.sameAccession,true);
  assert.equal(pair.metadata.sameFiledDate,true);
});

test("period geometry still rejects a different quarter even when document focus matches",()=>{
  const doc=document();
  doc.facts["us-gaap"].EarningsPerShareDiluted=concept("USD/shares",[
    fact(2,{start:"2026-05-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026,accn:"2026-Q2"}),
    fact(1,{start:"2025-01-01",end:"2025-03-31",filed:"2026-09-01",fp:"Q2",fy:2026,accn:"2026-Q2"}),
  ]);
  const pair=selectDocumentFocusComparablePair(doc,{metric:"eps",asOf,maxAgeDays:185});
  assert.equal(pair.current,null);
  assert.equal(pair.reason,"NO_GEOMETRY_COMPARABLE_PRIOR");
});

test("document-focus diagnostic restores comparable rows without changing formula or gates",()=>{
  const members=[{cik:"0000001001",ticker:"TST",name:"Test"}];
  const factsByCik=new Map([["0000001001",document()]]);
  const submissionsByCik=new Map([["0000001001",{sic:"3571"}]]);
  const report=buildDocumentFocusDiagnosticFromDocuments({members,factsByCik,submissionsByCik,asOf,maxAgeDays:185});
  assert.equal(report.status,"PASS");
  assert.equal(report.policy.researchOnly,true);
  assert.equal(report.policy.formulaChanged,false);
  assert.equal(report.policy.scoringGateChanged,false);
  assert.equal(report.policy.q4EpsAnnualMinusNineMonths,"FORBIDDEN");
  assert.equal(report.coverage.geometryComparableEps.coverage,1);
  assert.equal(report.coverage.geometryComparableRevenue.coverage,1);
  assert.equal(report.coverage.geometryComparableMargin.coverage,1);
  assert.equal(report.coverage.geometryComparableNetIncome.coverage,1);
  assert.equal(report.coverage.geometryAlignedFcfInput.coverage,1);
  assert.equal(report.documentFocusEvidence.epsFyDelta["0"],1);
  assert.equal(report.flowMethods.cfoReconstructed,1);
  assert.equal(report.flowMethods.capexReconstructed,1);
});
