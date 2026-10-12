import test from "node:test";
import assert from "node:assert/strict";
import {buildCoverageRecoveryDiagnosticFromDocuments} from "../scripts/pc-writer/earnings-r5-coverage-recovery-diagnostic.mjs";

const asOf="2026-10-11";
function fact(val,{start,end,filed,form="10-Q",fp="Q2",fy=2026,accn="A"}={}){
  return {val,start,end,filed,form,fp,fy,frame:null,accn};
}
function concept(unit,rows){return {units:{[unit]:rows}};}
function baseDocument(cik,{currentStart,currentEnd,priorStart,priorEnd,currentFiled="2026-08-01",priorFiled="2025-08-01",mappedCapex=true,candidateCapex=true}={}){
  const currentAccn=`${cik}-CUR`;
  const priorAccn=`${cik}-PRI`;
  const gaap={
    EarningsPerShareDiluted:concept("USD/shares",[
      fact(2,{start:currentStart,end:currentEnd,filed:currentFiled,accn:currentAccn}),
      fact(1,{start:priorStart,end:priorEnd,filed:priorFiled,fy:2025,accn:priorAccn}),
    ]),
    RevenueFromContractWithCustomerExcludingAssessedTax:concept("USD",[
      fact(120,{start:currentStart,end:currentEnd,filed:currentFiled,accn:currentAccn}),
      fact(100,{start:priorStart,end:priorEnd,filed:priorFiled,fy:2025,accn:priorAccn}),
    ]),
    OperatingIncomeLoss:concept("USD",[
      fact(24,{start:currentStart,end:currentEnd,filed:currentFiled,accn:currentAccn}),
      fact(15,{start:priorStart,end:priorEnd,filed:priorFiled,fy:2025,accn:priorAccn}),
    ]),
    NetIncomeLoss:concept("USD",[
      fact(18,{start:currentStart,end:currentEnd,filed:currentFiled,accn:currentAccn}),
      fact(10,{start:priorStart,end:priorEnd,filed:priorFiled,fy:2025,accn:priorAccn}),
    ]),
    NetCashProvidedByUsedInOperatingActivities:concept("USD",[
      fact(30,{start:currentStart,end:currentEnd,filed:currentFiled,accn:currentAccn}),
    ]),
  };
  if(mappedCapex)gaap.PaymentsToAcquirePropertyPlantAndEquipment=concept("USD",[
    fact(8,{start:currentStart,end:currentEnd,filed:currentFiled,accn:currentAccn}),
  ]);
  if(candidateCapex)gaap.PaymentsToAcquireProductiveAssets=concept("USD",[
    fact(8,{start:currentStart,end:currentEnd,filed:currentFiled,accn:currentAccn}),
  ]);
  return {cik,facts:{"us-gaap":gaap}};
}

test("R7 age counterfactual measures recovery without changing the active 185-day gate",()=>{
  const doc=baseDocument(1001,{
    currentStart:"2026-01-01",currentEnd:"2026-03-25",
    priorStart:"2025-01-01",priorEnd:"2025-03-25",
    currentFiled:"2026-05-01",priorFiled:"2025-05-01",
  });
  const members=[{cik:"0000001001"}];
  const report=buildCoverageRecoveryDiagnosticFromDocuments({
    members,
    factsByCik:new Map([["0000001001",doc]]),
    submissionsByCik:new Map([["0000001001",{sic:"3571"}]]),
    asOf,
    preflight:{inputs:{beaCorporateProfits:{status:"PASS",quarterlyMatchCount:9},blsProducerInput:{status:"PASS"}}},
  });
  assert.equal(report.policy.researchOnly,true);
  assert.equal(report.policy.formulaChanged,false);
  assert.equal(report.policy.scoringGateChanged,false);
  assert.equal(report.policy.inputContractChanged,false);
  assert.equal(report.policy.activeMaxAgeDays,185);
  assert.equal(report.policy.q4EpsAnnualMinusNineMonths,"FORBIDDEN");
  assert.equal(report.standardTagCoverage.d185.eps.coverage,0);
  assert.equal(report.standardTagCoverage.d240.eps.coverage,1);
  assert.equal(report.standardTagCoverage.d365.revenue.coverage,1);
  assert.equal(report.componentReadiness.s6.status,"SCHEMA_READY_VALUE_PARSER_PENDING");
  assert.equal(report.componentReadiness.s10.status,"SOURCE_READY_INDUSTRY_MAPPING_PENDING");
});

test("R7 validates ProductiveAssets as evidence only and never accepts it into the input contract",()=>{
  const docMapped=baseDocument(1002,{
    currentStart:"2026-04-01",currentEnd:"2026-06-30",
    priorStart:"2025-04-01",priorEnd:"2025-06-30",
    mappedCapex:true,candidateCapex:true,
  });
  const docCandidateOnly=baseDocument(1003,{
    currentStart:"2026-04-01",currentEnd:"2026-06-30",
    priorStart:"2025-04-01",priorEnd:"2025-06-30",
    mappedCapex:false,candidateCapex:true,
  });
  const members=[{cik:"0000001002"},{cik:"0000001003"}];
  const factsByCik=new Map([
    ["0000001002",docMapped],
    ["0000001003",docCandidateOnly],
  ]);
  const submissionsByCik=new Map([
    ["0000001002",{sic:"3571"}],
    ["0000001003",{sic:"3571"}],
  ]);
  const report=buildCoverageRecoveryDiagnosticFromDocuments({
    members,factsByCik,submissionsByCik,asOf,
    preflight:{inputs:{beaCorporateProfits:{status:"PASS",quarterlyMatchCount:9},blsProducerInput:{status:"PASS"}}},
  });
  assert.equal(report.capexProductiveAssetsValidation.overlap,1);
  assert.equal(report.capexProductiveAssetsValidation.identical,1);
  assert.equal(report.capexProductiveAssetsValidation.different,0);
  assert.equal(report.capexProductiveAssetsValidation.candidateOnlyFcfAdds,1);
  assert.equal(report.capexProductiveAssetsValidation.counterfactualFcfWithCandidate.coverage,1);
  assert.equal(report.capexProductiveAssetsValidation.counterfactualFcfWithCandidate.accepted,false);
  assert.equal(report.policy.inputContractChanged,false);
  assert.equal(report.candidateTagIssuerCounts.capex.PaymentsToAcquireProductiveAssets,1);
});
