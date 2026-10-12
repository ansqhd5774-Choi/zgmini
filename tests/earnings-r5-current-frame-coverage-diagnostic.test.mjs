import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateCoverageDiagnostics,
  diagnoseComparablePair,
  diagnoseIssuerCoverage,
} from "../scripts/pc-writer/earnings-r5-current-frame-coverage-diagnostic.mjs";

const frame={year:2026,quarter:2,end:"2026-06-30",frame:"CY2026Q2",priorEnd:"2025-06-30",priorFrame:"CY2025Q2"};
const asOf="2026-10-12";

function fact(val,{start,end,filed="2026-08-01",form="10-Q",frameValue=null,accn=null}={}){
  return {val,start,end,filed,form,frame:frameValue,accn:accn??`${filed}-${val}`};
}
function concept(unit,rows){return {units:{[unit]:rows}};}
function baseFacts(){
  return {
    cik:1001,
    facts:{"us-gaap":{
      EarningsPerShareDiluted:concept("USD/shares",[
        fact(2,{start:"2026-04-01",end:"2026-06-30"}),
        fact(1,{start:"2025-04-01",end:"2025-06-30"}),
      ]),
      RevenueFromContractWithCustomerExcludingAssessedTax:concept("USD",[
        fact(120,{start:"2026-04-01",end:"2026-06-30"}),
        fact(100,{start:"2025-04-01",end:"2025-06-30"}),
      ]),
      OperatingIncomeLoss:concept("USD",[
        fact(24,{start:"2026-04-01",end:"2026-06-30"}),
      ]),
      NetIncomeLoss:concept("USD",[
        fact(18,{start:"2026-04-01",end:"2026-06-30"}),
      ]),
      NetCashProvidedByUsedInOperatingActivities:concept("USD",[
        fact(30,{start:"2026-04-01",end:"2026-06-30"}),
      ]),
      PaymentsToAcquirePropertyPlantAndEquipment:concept("USD",[
        fact(6,{start:"2026-04-01",end:"2026-06-30"}),
      ]),
    }},
  };
}

test("diagnostic isolates pair dependency for current-only S3 and S8 semantics",()=>{
  const row=diagnoseIssuerCoverage({
    member:{cik:"0000001001",ticker:"TST"},
    companyFacts:baseFacts(),
    submission:{sic:"3571"},
    frame,
    asOf,
  });
  assert.equal(row.actual.S3,false);
  assert.equal(row.potential.S3,true);
  assert.equal(row.reasons.S3,"PAIR_DEPENDENCY_ONLY");
  assert.equal(row.actual.S8,false);
  assert.equal(row.potential.S8,true);
  assert.equal(row.reasons.S8,"PAIR_DEPENDENCY_ONLY");
  assert.equal(row.actual.S5,true);
  assert.equal(row.potential.S5,true);
});

test("diagnostic isolates revenue pair dependency for current-only FCF margin semantics",()=>{
  const document=baseFacts();
  document.facts["us-gaap"].RevenueFromContractWithCustomerExcludingAssessedTax=concept("USD",[
    fact(120,{start:"2026-04-01",end:"2026-06-30"}),
  ]);
  const row=diagnoseIssuerCoverage({
    member:{cik:"0000001001",ticker:"TST"},
    companyFacts:document,
    submission:{sic:"3571"},
    frame,
    asOf,
  });
  assert.equal(row.actual.S5,false);
  assert.equal(row.potential.S5,true);
  assert.equal(row.reasons.S5,"PAIR_DEPENDENCY_ONLY");
});

test("pair diagnostic distinguishes a missing prior observation",()=>{
  const document=baseFacts();
  document.facts["us-gaap"].EarningsPerShareDiluted=concept("USD/shares",[
    fact(2,{start:"2026-04-01",end:"2026-06-30"}),
  ]);
  const pair=diagnoseComparablePair(document,{metric:"eps",frame,asOf});
  assert.equal(pair.status,"PRIOR_MISSING");
});

test("aggregate reports semantic potential without changing the gate",()=>{
  const first=diagnoseIssuerCoverage({
    member:{cik:"0000001001",ticker:"A"},
    companyFacts:baseFacts(),
    submission:{sic:"3571"},
    frame,
    asOf,
  });
  const second={...first,cik:"0000001002",ticker:"B",actual:{...first.actual,S3:true,S8:true},potential:{...first.potential,S3:true,S8:true},reasons:{...first.reasons,S3:"READY",S8:"READY"}};
  const report=aggregateCoverageDiagnostics([first,second]);
  assert.equal(report.components.S3.min,0.80);
  assert.equal(report.components.S3.actualReady,1);
  assert.equal(report.components.S3.potentialReady,2);
  assert.equal(report.components.S8.actualReady,1);
  assert.equal(report.components.S8.potentialReady,2);
});
