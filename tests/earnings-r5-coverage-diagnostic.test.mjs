import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCoverageDiagnosticFromDocuments,
  selectLatestComparablePair,
  selectLatestCurrentQuarter,
  selectQuarterFlow,
} from "../scripts/pc-writer/earnings-r5-coverage-diagnostic.mjs";

const asOf="2026-10-11";
function fact(val,frame,start,end,filed,form="10-Q"){return {val,frame,start,end,filed,form,accn:`${filed}-${String(val)}`};}
function concept(unit,rows){return {units:{[unit]:rows}};}
function document(){
  return {
    cik:1001,
    facts:{"us-gaap":{
      EarningsPerShareDiluted:concept("USD/shares",[
        fact(3,"CY2026Q3","2026-07-01","2026-09-30","2026-10-05"),
        fact(2,"CY2025Q3","2025-07-01","2025-09-30","2025-10-05"),
        fact(2,"CY2026Q2","2026-04-01","2026-06-30","2026-08-01"),
        fact(1,"CY2025Q2","2025-04-01","2025-06-30","2025-08-01"),
      ]),
      RevenueFromContractWithCustomerExcludingAssessedTax:concept("USD",[
        fact(140,"CY2026Q3","2026-07-01","2026-09-30","2026-10-05"),
        fact(120,"CY2025Q3","2025-07-01","2025-09-30","2025-10-05"),
        fact(120,"CY2026Q2","2026-04-01","2026-06-30","2026-08-01"),
        fact(100,"CY2025Q2","2025-04-01","2025-06-30","2025-08-01"),
      ]),
      OperatingIncomeLoss:concept("USD",[
        fact(28,"CY2026Q3","2026-07-01","2026-09-30","2026-10-05"),
        fact(21,"CY2025Q3","2025-07-01","2025-09-30","2025-10-05"),
      ]),
      NetIncomeLoss:concept("USD",[
        fact(20,"CY2026Q3","2026-07-01","2026-09-30","2026-10-05"),
        fact(15,"CY2025Q3","2025-07-01","2025-09-30","2025-10-05"),
      ]),
      NetCashProvidedByUsedInOperatingActivities:concept("USD",[
        fact(40,null,"2026-01-01","2026-03-31","2026-05-01"),
        fact(90,null,"2026-01-01","2026-06-30","2026-08-01"),
        fact(150,null,"2026-01-01","2026-09-30","2026-10-05"),
      ]),
      PaymentsToAcquirePropertyPlantAndEquipment:concept("USD",[
        fact(10,null,"2026-01-01","2026-03-31","2026-05-01"),
        fact(25,null,"2026-01-01","2026-06-30","2026-08-01"),
        fact(45,null,"2026-01-01","2026-09-30","2026-10-05"),
      ]),
    }},
  };
}

test("latest comparable pair uses the newest filed explicit quarter rather than forcing one global calendar frame",()=>{
  const pair=selectLatestComparablePair(document(),{metric:"eps",asOf,maxAgeDays:185});
  assert.equal(pair.frame,"CY2026Q3");
  assert.equal(pair.current.val,3);
  assert.equal(pair.prior.val,2);
});

test("current net-income coverage does not require a prior-year pair",()=>{
  const doc=document();
  doc.facts["us-gaap"].NetIncomeLoss=concept("USD",[
    fact(20,"CY2026Q3","2026-07-01","2026-09-30","2026-10-05"),
  ]);
  const current=selectLatestCurrentQuarter(doc,{metric:"netIncome",asOf,maxAgeDays:185});
  assert.equal(current.frame,"CY2026Q3");
  assert.equal(current.fact.val,20);
  const pair=selectLatestComparablePair(doc,{metric:"netIncome",asOf,maxAgeDays:185});
  assert.equal(pair.current,null);
});

test("quarter cash flow reconstructs Q3 from matched cumulative facts",()=>{
  const doc=document();
  const cfo=selectQuarterFlow(doc,{metric:"operatingCashFlow",asOf,targetFrame:"CY2026Q3",targetEnd:"2026-09-30"});
  const capex=selectQuarterFlow(doc,{metric:"capex",asOf,targetFrame:"CY2026Q3",targetEnd:"2026-09-30"});
  assert.equal(cfo.method,"CUMULATIVE_DELTA");
  assert.equal(cfo.value,60);
  assert.equal(capex.method,"CUMULATIVE_DELTA");
  assert.equal(capex.value,20);
});

test("coverage diagnostic keeps latest-quarter and reconstructed-flow evidence research-only",()=>{
  const members=[{cik:"0000001001",ticker:"TST",name:"Test"}];
  const factsByCik=new Map([["0000001001",document()]]);
  const submissionsByCik=new Map([["0000001001",{sic:"3571"}]]);
  const report=buildCoverageDiagnosticFromDocuments({members,factsByCik,submissionsByCik,asOf,maxAgeDays:185});
  assert.equal(report.status,"PASS");
  assert.equal(report.policy.formulaChanged,false);
  assert.equal(report.coverage.latestComparableEps.coverage,1);
  assert.equal(report.coverage.latestComparableRevenue.coverage,1);
  assert.equal(report.coverage.latestComparableMargin.coverage,1);
  assert.equal(report.coverage.latestCurrentNetIncome.coverage,1);
  assert.equal(report.coverage.alignedFcfMarginInput.coverage,1);
  assert.equal(report.flowMethods.cfoReconstructed,1);
  assert.equal(report.flowMethods.capexReconstructed,1);
});
