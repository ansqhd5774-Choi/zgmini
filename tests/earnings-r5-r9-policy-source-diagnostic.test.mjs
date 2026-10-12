import test from "node:test";
import assert from "node:assert/strict";
import {buildEarningsR5R9DiagnosticFromDocuments} from "../scripts/pc-writer/earnings-r5-r9-policy-source-diagnostic.mjs";

const asOf="2026-10-11";
function fact(val,{start,end,filed,form="10-Q",fp="Q1",fy=2026,accn="A"}={}){return {val,start,end,filed,form,fp,fy,frame:null,accn};}
function concept(unit,rows){return {units:{[unit]:rows}};}
function doc(cik,{filed="2026-08-20",mappedCapex=false,productiveCapex=true}={}){
  const currentStart="2026-01-01",currentEnd="2026-03-25",priorStart="2025-01-01",priorEnd="2025-03-25";
  const gaap={
    EarningsPerShareDiluted:concept("USD/shares",[
      fact(2,{start:currentStart,end:currentEnd,filed,accn:`${cik}-E1`}),
      fact(1,{start:priorStart,end:priorEnd,filed:"2025-04-30",fy:2025,accn:`${cik}-E0`}),
    ]),
    RevenueFromContractWithCustomerExcludingAssessedTax:concept("USD",[
      fact(120,{start:currentStart,end:currentEnd,filed,accn:`${cik}-R1`}),
      fact(100,{start:priorStart,end:priorEnd,filed:"2025-04-30",fy:2025,accn:`${cik}-R0`}),
    ]),
    OperatingIncomeLoss:concept("USD",[
      fact(24,{start:currentStart,end:currentEnd,filed,accn:`${cik}-O1`}),
      fact(15,{start:priorStart,end:priorEnd,filed:"2025-04-30",fy:2025,accn:`${cik}-O0`}),
    ]),
    NetIncomeLoss:concept("USD",[
      fact(18,{start:currentStart,end:currentEnd,filed,accn:`${cik}-N1`}),
      fact(10,{start:priorStart,end:priorEnd,filed:"2025-04-30",fy:2025,accn:`${cik}-N0`}),
    ]),
    NetCashProvidedByUsedInOperatingActivities:concept("USD",[
      fact(30,{start:currentStart,end:currentEnd,filed,accn:`${cik}-C1`}),
    ]),
  };
  if(mappedCapex)gaap.PaymentsToAcquirePropertyPlantAndEquipment=concept("USD",[fact(8,{start:currentStart,end:currentEnd,filed,accn:`${cik}-P1`})]);
  if(productiveCapex)gaap.PaymentsToAcquireProductiveAssets=concept("USD",[fact(8,{start:currentStart,end:currentEnd,filed,accn:`${cik}-PA1`})]);
  return {cik:String(cik).replace(/\D/g,"").padStart(10,"0"),facts:{"us-gaap":gaap}};
}

test("R9 dual gate recovers older fiscal period only when the current filing is recent",()=>{
  const fresh=doc("1001",{filed:"2026-08-20",mappedCapex:false,productiveCapex:true});
  const stale=doc("1002",{filed:"2026-03-30",mappedCapex:true,productiveCapex:false});
  const report=buildEarningsR5R9DiagnosticFromDocuments({
    members:[{cik:"0000001001"},{cik:"0000001002"}],
    factsByCik:new Map([["0000001001",fresh],["0000001002",stale]]),
    submissionsByCik:new Map([["0000001001",{sic:"3571"}],["0000001002",{sic:"3571"}]]),
    asOf,
  });
  assert.equal(report.policy.researchOnly,true);
  assert.equal(report.policy.periodMaxAgeDays,240);
  assert.equal(report.policy.currentFilingMaxAgeDays,185);
  assert.equal(report.policy.dualGateAccepted,false);
  assert.equal(report.policy.scoringGateChanged,false);
  assert.equal(report.dualCoverage.eps.eligible,1);
  assert.equal(report.dualCoverage.revenue.eligible,1);
  assert.equal(report.dualCoverage.margin.eligible,1);
  assert.equal(report.dualCoverage.netIncome.eligible,1);
  assert.equal(report.recoveredVs185.eps,1);
  assert.equal(report.recoveredVs185.revenue,1);
  assert.equal(report.recoveredVs185.netIncome,1);
});

test("R9 ProductiveAssets simulation can recover FCF but remains unaccepted",()=>{
  const candidate=doc("1003",{filed:"2026-08-20",mappedCapex:false,productiveCapex:true});
  const report=buildEarningsR5R9DiagnosticFromDocuments({
    members:[{cik:"0000001003"}],
    factsByCik:new Map([["0000001003",candidate]]),
    submissionsByCik:new Map([["0000001003",{sic:"3571"}]]),
    asOf,
  });
  assert.equal(report.dualCoverage.fcf.eligible,0);
  assert.equal(report.dualCoverage.fcfWithProductiveAssets.eligible,1);
  assert.equal(report.productiveAssetsSimulation.addedIssuers,1);
  assert.equal(report.productiveAssetsSimulation.direct,1);
  assert.equal(report.productiveAssetsSimulation.accepted,false);
  assert.equal(report.policy.inputContractChanged,false);
  assert.equal(report.policy.q4EpsAnnualMinusNineMonths,"FORBIDDEN");
});

test("R9 keeps S6/S10 source gaps explicit and performs no network or database writes",()=>{
  const report=buildEarningsR5R9DiagnosticFromDocuments({members:[],factsByCik:new Map(),submissionsByCik:new Map(),asOf});
  assert.equal(report.s6.status,"PARTIAL");
  assert.equal(report.s6.reason,"BEA_FILE_MISSING");
  assert.equal(report.s10.status,"PARTIAL");
  assert.equal(report.s10.outputPpiMappingStatus,"UNRESOLVED");
  assert.equal(report.s10.issuerNaicsMappingStatus,"UNRESOLVED");
  assert.equal(report.networkCalls,0);
  assert.equal(report.dbWrites,0);
});
