import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFiscalPeriodDiagnosticFromDocuments,
  selectFiscalComparablePair,
  selectFiscalCurrentQuarter,
  selectFiscalMarginPair,
  selectFiscalQuarterFlow,
} from "../scripts/pc-writer/earnings-r5-fiscal-period-diagnostic.mjs";

const asOf="2026-10-11";
function fact(val,{start,end,filed,form="10-Q",fp="Q2",fy=2026,frame=null}={}){
  return {val,start,end,filed,form,fp,fy,frame,accn:`${filed}-${String(val)}`};
}
function concept(unit,rows){return {units:{[unit]:rows}};}
function document(){
  return {
    cik:1001,
    facts:{"us-gaap":{
      EarningsPerShareDiluted:concept("USD/shares",[
        fact(2,{start:"2026-05-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026}),
        fact(1,{start:"2025-05-01",end:"2025-07-31",filed:"2025-09-01",fp:"Q2",fy:2025}),
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
        fact(30,{start:"2026-02-01",end:"2026-04-30",filed:"2026-06-01",fp:"Q1",fy:2026}),
        fact(80,{start:"2026-02-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026}),
      ]),
      PaymentsToAcquirePropertyPlantAndEquipment:concept("USD",[
        fact(8,{start:"2026-02-01",end:"2026-04-30",filed:"2026-06-01",fp:"Q1",fy:2026}),
        fact(20,{start:"2026-02-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026}),
      ]),
    }},
  };
}

test("fiscal comparable pair does not require SEC CY frame when period geometry and fiscal labels agree",()=>{
  const pair=selectFiscalComparablePair(document(),{metric:"eps",asOf,maxAgeDays:185});
  assert.equal(pair.reason,null);
  assert.equal(pair.current.end,"2026-07-31");
  assert.equal(pair.prior.end,"2025-07-31");
  assert.equal(pair.current.val,2);
  assert.equal(pair.prior.val,1);
});

test("fiscal pair still requires the same metric tag and rejects mismatched fiscal period labels",()=>{
  const doc=document();
  doc.facts["us-gaap"].EarningsPerShareDiluted=concept("USD/shares",[
    fact(2,{start:"2026-05-01",end:"2026-07-31",filed:"2026-09-01",fp:"Q2",fy:2026}),
    fact(1,{start:"2025-05-01",end:"2025-07-31",filed:"2025-09-01",fp:"Q1",fy:2025}),
  ]);
  const pair=selectFiscalComparablePair(doc,{metric:"eps",asOf,maxAgeDays:185});
  assert.equal(pair.current,null);
  assert.equal(pair.reason,"NO_COMPARABLE_PRIOR");
});

test("fiscal current net income accepts a direct reported quarter without a calendar frame",()=>{
  const current=selectFiscalCurrentQuarter(document(),{metric:"netIncome",asOf,maxAgeDays:185});
  assert.equal(current.reason,null);
  assert.equal(current.fact.val,18);
  assert.equal(current.fact.frame,null);
});

test("fiscal margin pair aligns operating income to the same reported periods as revenue",()=>{
  const pair=selectFiscalMarginPair(document(),{asOf,maxAgeDays:185});
  assert.equal(pair.reason,null);
  assert.equal(pair.revenueCurrent.val,120);
  assert.equal(pair.opCurrent.val,24);
  assert.equal(pair.revenuePrior.val,100);
  assert.equal(pair.opPrior.val,15);
});

test("fiscal quarter flow reconstructs Q2 from matched cumulative facts without using annual-minus-9M EPS",()=>{
  const revenue=selectFiscalComparablePair(document(),{metric:"revenue",asOf,maxAgeDays:185});
  const cfo=selectFiscalQuarterFlow(document(),{metric:"operatingCashFlow",asOf,target:revenue.current});
  const capex=selectFiscalQuarterFlow(document(),{metric:"capex",asOf,target:revenue.current});
  assert.equal(cfo.method,"CUMULATIVE_DELTA");
  assert.equal(cfo.value,50);
  assert.equal(capex.method,"CUMULATIVE_DELTA");
  assert.equal(capex.value,12);
});

test("fiscal diagnostic remains research-only and does not change scoring gates",()=>{
  const members=[{cik:"0000001001",ticker:"TST",name:"Test"}];
  const factsByCik=new Map([["0000001001",document()]]);
  const submissionsByCik=new Map([["0000001001",{sic:"3571"}]]);
  const report=buildFiscalPeriodDiagnosticFromDocuments({members,factsByCik,submissionsByCik,asOf,maxAgeDays:185});
  assert.equal(report.status,"PASS");
  assert.equal(report.policy.researchOnly,true);
  assert.equal(report.policy.formulaChanged,false);
  assert.equal(report.policy.scoringGateChanged,false);
  assert.equal(report.policy.q4EpsAnnualMinusNineMonths,"FORBIDDEN");
  assert.equal(report.coverage.fiscalComparableEps.coverage,1);
  assert.equal(report.coverage.fiscalComparableRevenue.coverage,1);
  assert.equal(report.coverage.fiscalComparableMargin.coverage,1);
  assert.equal(report.coverage.fiscalCurrentNetIncome.coverage,1);
  assert.equal(report.coverage.fiscalAlignedFcfInput.coverage,1);
  assert.equal(report.flowMethods.cfoReconstructed,1);
  assert.equal(report.flowMethods.capexReconstructed,1);
});
