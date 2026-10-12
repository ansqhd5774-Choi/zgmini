import test from "node:test";
import assert from "node:assert/strict";
import {selectExactExplicitFrameFact,selectPriorityComparablePair,buildExplicitFramePriorityDiagnosticFromDocuments} from "../scripts/pc-writer/earnings-r5-explicit-frame-priority-diagnostic.mjs";
import {selectCompanyFact} from "../scripts/pc-writer/earnings-r5-current-frame-audit.mjs";

const row=({val,start,end,frame,filed="2026-08-31",fy=2026,fp="Q2",form="10-Q"})=>({val,start,end,frame,filed,fy,fp,form,accn:`${end}-${val}`});
function doc(){return {cik:"0000000001",facts:{"us-gaap":{
  EarningsPerShareDiluted:{units:{"USD/shares":[
    row({val:2,start:"2026-05-16",end:"2026-08-15",frame:"CY2026Q2"}),
    row({val:1,start:"2025-05-16",end:"2025-08-15",frame:"CY2025Q2",filed:"2025-08-31",fy:2025}),
  ]}},
  RevenueFromContractWithCustomerExcludingAssessedTax:{units:{USD:[
    row({val:200,start:"2026-05-16",end:"2026-08-15",frame:"CY2026Q2"}),
    row({val:180,start:"2025-05-16",end:"2025-08-15",frame:"CY2025Q2",filed:"2025-08-31",fy:2025}),
  ]}},
  OperatingIncomeLoss:{units:{USD:[
    row({val:20,start:"2026-05-16",end:"2026-08-15",frame:"CY2026Q2"}),
    row({val:18,start:"2025-05-16",end:"2025-08-15",frame:"CY2025Q2",filed:"2025-08-31",fy:2025}),
  ]}},
  NetIncomeLoss:{units:{USD:[
    row({val:10,start:"2026-05-16",end:"2026-08-15",frame:"CY2026Q2"}),
    row({val:9,start:"2025-05-16",end:"2025-08-15",frame:"CY2025Q2",filed:"2025-08-31",fy:2025}),
  ]}},
}}};}

test("exact SEC frame survives when period end is outside the +/-45 day geometry fallback",()=>{
  const d=doc();
  const exact=selectExactExplicitFrameFact(d,{metric:"eps",frame:"CY2026Q2",asOf:"2026-10-12"});
  assert.equal(exact.fact?.frame,"CY2026Q2");
  const baseline=selectCompanyFact(d,{metric:"eps",frame:"CY2026Q2",frameEnd:"2026-06-30",asOf:"2026-10-12"});
  assert.equal(baseline.fact,null);
});

test("priority comparable pair trusts exact SEC frame before geometry fallback without changing policy",()=>{
  const pair=selectPriorityComparablePair(doc(),{metric:"eps",currentFrame:"CY2026Q2",priorFrame:"CY2025Q2",currentEnd:"2026-06-30",priorEnd:"2025-06-30",asOf:"2026-10-12"});
  assert.equal(pair.source,"EXACT");
  assert.equal(pair.current?.val,2);
  assert.equal(pair.prior?.val,1);
});

test("diagnostic remains research-only and does not accept the counterfactual",()=>{
  const d=doc();
  const report=buildExplicitFramePriorityDiagnosticFromDocuments({
    members:[{cik:"1",ticker:"TEST"}],
    factsByCik:new Map([["0000000001",d]]),
    submissionsByCik:new Map([["0000000001",{sic:"3571"}]]),
    frame:{frame:"CY2026Q2",priorFrame:"CY2025Q2",end:"2026-06-30",priorEnd:"2025-06-30"},
    asOf:"2026-10-12",
  });
  assert.equal(report.status,"PASS");
  assert.equal(report.rejectedExactCurrent.eps,1);
  assert.equal(report.priority.eps,1);
  assert.equal(report.baseline.eps,0);
  assert.equal(report.policies.exactExplicitFramePriorityAccepted,false);
  assert.equal(report.policies.inputContractChanged,false);
  assert.equal(report.networkCalls,0);
  assert.equal(report.dbWrites,0);
});
