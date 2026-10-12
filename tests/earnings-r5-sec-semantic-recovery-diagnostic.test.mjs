import test from "node:test";
import assert from "node:assert/strict";
import {buildSecSemanticRecoveryDiagnosticFromDocuments} from "../scripts/pc-writer/earnings-r5-sec-semantic-recovery-diagnostic.mjs";

const asOf="2026-10-11";
function fact(val,{start,end,filed,form="10-Q",fp="Q2",fy=2026,accn="A"}={}){
  return {val,start,end,filed,form,fp,fy,frame:null,accn};
}
function concept(unit,rows){return {units:{[unit]:rows}};}
function document(cik,{currentStart,currentEnd,priorStart,priorEnd,currentFiled="2026-08-01",priorFiled="2025-08-01",diluted=true,basic=false,revenue=true,revenueIncluded=false,mappedCapex=true,candidateCapex=null}={}){
  const gaap={
    OperatingIncomeLoss:concept("USD",[
      fact(24,{start:currentStart,end:currentEnd,filed:currentFiled,accn:`${cik}-CUR`}),
      fact(15,{start:priorStart,end:priorEnd,filed:priorFiled,fy:2025,accn:`${cik}-PRI`}),
    ]),
    NetIncomeLoss:concept("USD",[
      fact(18,{start:currentStart,end:currentEnd,filed:currentFiled,accn:`${cik}-CUR`}),
      fact(10,{start:priorStart,end:priorEnd,filed:priorFiled,fy:2025,accn:`${cik}-PRI`}),
    ]),
    NetCashProvidedByUsedInOperatingActivities:concept("USD",[
      fact(30,{start:currentStart,end:currentEnd,filed:currentFiled,accn:`${cik}-CUR`}),
    ]),
  };
  if(diluted)gaap.EarningsPerShareDiluted=concept("USD/shares",[
    fact(2,{start:currentStart,end:currentEnd,filed:currentFiled,accn:`${cik}-CUR`}),
    fact(1,{start:priorStart,end:priorEnd,filed:priorFiled,fy:2025,accn:`${cik}-PRI`}),
  ]);
  if(basic)gaap.EarningsPerShareBasic=concept("USD/shares",[
    fact(2,{start:currentStart,end:currentEnd,filed:currentFiled,accn:`${cik}-CUR`}),
    fact(1,{start:priorStart,end:priorEnd,filed:priorFiled,fy:2025,accn:`${cik}-PRI`}),
  ]);
  if(revenue)gaap.RevenueFromContractWithCustomerExcludingAssessedTax=concept("USD",[
    fact(120,{start:currentStart,end:currentEnd,filed:currentFiled,accn:`${cik}-CUR`}),
    fact(100,{start:priorStart,end:priorEnd,filed:priorFiled,fy:2025,accn:`${cik}-PRI`}),
  ]);
  if(revenueIncluded)gaap.RevenueFromContractWithCustomerIncludingAssessedTax=concept("USD",[
    fact(120,{start:currentStart,end:currentEnd,filed:currentFiled,accn:`${cik}-CUR`}),
    fact(100,{start:priorStart,end:priorEnd,filed:priorFiled,fy:2025,accn:`${cik}-PRI`}),
  ]);
  if(mappedCapex)gaap.PaymentsToAcquirePropertyPlantAndEquipment=concept("USD",[
    fact(8,{start:currentStart,end:currentEnd,filed:currentFiled,accn:`${cik}-CUR`}),
  ]);
  if(candidateCapex)gaap[candidateCapex]=concept("USD",[
    fact(8,{start:currentStart,end:currentEnd,filed:currentFiled,accn:`${cik}-CUR`}),
  ]);
  return {cik,facts:{"us-gaap":gaap}};
}

test("R8 identifies recently filed fiscal quarters recovered only by the 240-day research window",()=>{
  const doc=document(1001,{
    currentStart:"2026-01-01",currentEnd:"2026-03-25",
    priorStart:"2025-01-01",priorEnd:"2025-03-25",
    currentFiled:"2026-08-20",priorFiled:"2025-08-20",
  });
  const report=buildSecSemanticRecoveryDiagnosticFromDocuments({
    members:[{cik:"0000001001"}],
    factsByCik:new Map([["0000001001",doc]]),
    submissionsByCik:new Map([["0000001001",{sic:"3571"}]]),
    asOf,
  });
  assert.equal(report.policy.researchOnly,true);
  assert.equal(report.policy.formulaChanged,false);
  assert.equal(report.policy.scoringGateChanged,false);
  assert.equal(report.policy.inputContractChanged,false);
  assert.equal(report.policy.activeMaxAgeDays,185);
  assert.equal(report.policy.extendedAgeDays,240);
  assert.equal(report.policy.extendedAgeAccepted,false);
  assert.equal(report.recovered185To240.eps.count,1);
  assert.equal(report.recovered185To240.revenue.count,1);
  assert.equal(report.recovered185To240.netIncome.count,1);
  assert.equal(report.recovered185To240.eps.filedAgeBuckets.LE60,1);
  assert.equal(report.coverage.active.eps.coverage,0);
  assert.equal(report.coverage.extended240.eps.coverage,1);
});

test("R8 audits Basic EPS and including-tax revenue without accepting either tag",()=>{
  const overlap=document(1002,{
    currentStart:"2026-04-01",currentEnd:"2026-06-30",
    priorStart:"2025-04-01",priorEnd:"2025-06-30",
    basic:true,revenueIncluded:true,
  });
  const fallback=document(1003,{
    currentStart:"2026-04-01",currentEnd:"2026-06-30",
    priorStart:"2025-04-01",priorEnd:"2025-06-30",
    diluted:false,basic:true,revenue:false,revenueIncluded:true,
  });
  const report=buildSecSemanticRecoveryDiagnosticFromDocuments({
    members:[{cik:"0000001002"},{cik:"0000001003"}],
    factsByCik:new Map([["0000001002",overlap],["0000001003",fallback]]),
    submissionsByCik:new Map([["0000001002",{sic:"3571"}],["0000001003",{sic:"3571"}]]),
    asOf,
  });
  assert.equal(report.candidateSemantics.epsBasic.overlapPeriods,2);
  assert.equal(report.candidateSemantics.epsBasic.exact,2);
  assert.equal(report.candidateSemantics.epsBasic.incrementalComparableIssuers.d185,1);
  assert.equal(report.candidateSemantics.epsBasic.accepted,false);
  assert.equal(report.candidateSemantics.revenueIncludingTax.overlapPeriods,2);
  assert.equal(report.candidateSemantics.revenueIncludingTax.exact,2);
  assert.equal(report.candidateSemantics.revenueIncludingTax.incrementalComparableIssuers.d185,1);
  assert.equal(report.candidateSemantics.revenueIncludingTax.accepted,false);
  assert.equal(report.policy.candidateTagsAccepted,false);
});

test("R8 quantifies candidate CapEx recovery but leaves the input contract unchanged",()=>{
  const overlap=document(1004,{
    currentStart:"2026-04-01",currentEnd:"2026-06-30",
    priorStart:"2025-04-01",priorEnd:"2025-06-30",
    mappedCapex:true,candidateCapex:"PaymentsToAcquireOtherPropertyPlantAndEquipment",
  });
  const candidateOnly=document(1005,{
    currentStart:"2026-04-01",currentEnd:"2026-06-30",
    priorStart:"2025-04-01",priorEnd:"2025-06-30",
    mappedCapex:false,candidateCapex:"PaymentsToAcquireOtherPropertyPlantAndEquipment",
  });
  const report=buildSecSemanticRecoveryDiagnosticFromDocuments({
    members:[{cik:"0000001004"},{cik:"0000001005"}],
    factsByCik:new Map([["0000001004",overlap],["0000001005",candidateOnly]]),
    submissionsByCik:new Map([["0000001004",{sic:"3571"}],["0000001005",{sic:"3571"}]]),
    asOf,
  });
  const item=report.candidateSemantics.capex.PaymentsToAcquireOtherPropertyPlantAndEquipment;
  assert.equal(item.overlapPeriods,1);
  assert.equal(item.exact,1);
  assert.equal(item.potentialFcfIssuers185,1);
  assert.equal(item.accepted,false);
  assert.equal(report.potentialFcfRecovery.d185.issuers,1);
  assert.equal(report.potentialFcfRecovery.d185.accepted,false);
  assert.equal(report.policy.inputContractChanged,false);
  assert.equal(report.policy.q4EpsAnnualMinusNineMonths,"FORBIDDEN");
});
