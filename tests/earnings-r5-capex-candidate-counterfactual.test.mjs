import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCapexCandidateCounterfactualFromDocuments,
  selectCandidateQuarterFlow,
} from "../scripts/pc-writer/earnings-r5-capex-candidate-counterfactual.mjs";

const asOf="2026-10-12";
function fact(val,{start,end,filed="2026-08-01",form="10-Q",accn=null}={}){return {val,start,end,filed,form,accn:accn??`${end}-${val}`};}
function concept(rows){return {units:{USD:rows}};}
function document(cik,{mappedCapex=null,candidateCapex=null}={}){
  const gaap={
    RevenueFromContractWithCustomerExcludingAssessedTax:concept([
      fact(120,{start:"2026-04-01",end:"2026-06-30"}),
      fact(100,{start:"2025-04-01",end:"2025-06-30",filed:"2025-08-01"}),
    ]),
    NetCashProvidedByUsedInOperatingActivities:concept([
      fact(30,{start:"2026-04-01",end:"2026-06-30"}),
    ]),
  };
  if(mappedCapex!=null)gaap.PaymentsToAcquirePropertyPlantAndEquipment=concept([fact(mappedCapex,{start:"2026-04-01",end:"2026-06-30"})]);
  if(candidateCapex!=null)gaap.PaymentsToAcquireProductiveAssets=concept([fact(candidateCapex,{start:"2026-04-01",end:"2026-06-30"})]);
  return {cik:Number(cik),facts:{"us-gaap":gaap}};
}

test("candidate quarter flow uses an aligned direct-quarter candidate fact",()=>{
  const doc=document("1001",{candidateCapex:7});
  const selected=selectCandidateQuarterFlow(doc,{tag:"PaymentsToAcquireProductiveAssets",asOf,target:{start:"2026-04-01",end:"2026-06-30",duration:91}});
  assert.equal(selected.value,7);
  assert.equal(selected.method,"DIRECT_QUARTER");
});

test("counterfactual measures candidate-only additions without changing the input contract",()=>{
  const members=[
    {cik:"0000001001",ticker:"AAA"},
    {cik:"0000001002",ticker:"BBB"},
  ];
  const factsByCik=new Map([
    ["0000001001",document("1001",{mappedCapex:6,candidateCapex:6})],
    ["0000001002",document("1002",{candidateCapex:7})],
  ]);
  const submissionsByCik=new Map([
    ["0000001001",{sic:"3571"}],
    ["0000001002",{sic:"3571"}],
  ]);
  const report=buildCapexCandidateCounterfactualFromDocuments({members,factsByCik,submissionsByCik,asOf,ageWindows:[240],candidateTags:["PaymentsToAcquireProductiveAssets"]});
  const w=report.windows["240"],c=w.candidates.PaymentsToAcquireProductiveAssets;
  assert.equal(report.status,"PASS");
  assert.equal(report.policies.inputContractChanged,false);
  assert.equal(w.nonFinancial,2);
  assert.equal(w.baselineReady,1);
  assert.equal(c.overlap,1);
  assert.equal(c.identical,1);
  assert.equal(c.candidateOnlyAdds,1);
  assert.equal(c.combinedReady,2);
  assert.equal(c.combinedCoverage,1);
  assert.equal(c.accepted,false);
});
