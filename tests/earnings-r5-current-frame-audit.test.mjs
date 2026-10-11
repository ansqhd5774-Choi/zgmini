import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIssuerRowFromDocuments,
  selectCompanyFact,
  sicDivision,
} from "../scripts/pc-writer/earnings-r5-current-frame-audit.mjs";

const frame={year:2026,quarter:2,end:"2026-06-30",frame:"CY2026Q2",priorEnd:"2025-06-30",priorFrame:"CY2025Q2"};
const asOf="2026-10-11";
function fact(val,frameValue,start,end,filed="2026-08-01",form="10-Q"){return {val,frame:frameValue,start,end,filed,form,accn:`${filed}-${val}`};}
function concept(unit,rows){return {units:{[unit]:rows}};}
function doc(){
  return {
    cik:1001,
    facts:{"us-gaap":{
      EarningsPerShareDiluted:concept("USD/shares",[
        fact(2,"CY2026Q2","2026-04-01","2026-06-30"),
        fact(1,"CY2025Q2","2025-04-01","2025-06-30","2025-08-01"),
      ]),
      RevenueFromContractWithCustomerExcludingAssessedTax:concept("USD",[
        fact(120,"CY2026Q2","2026-04-01","2026-06-30"),
        fact(100,"CY2025Q2","2025-04-01","2025-06-30","2025-08-01"),
      ]),
      OperatingIncomeLoss:concept("USD",[
        fact(24,"CY2026Q2","2026-04-01","2026-06-30"),
        fact(15,"CY2025Q2","2025-04-01","2025-06-30","2025-08-01"),
      ]),
      NetIncomeLoss:concept("USD",[
        fact(18,"CY2026Q2","2026-04-01","2026-06-30"),
        fact(10,"CY2025Q2","2025-04-01","2025-06-30","2025-08-01"),
      ]),
      NetCashProvidedByUsedInOperatingActivities:concept("USD",[
        fact(30,"CY2026Q2","2026-04-01","2026-06-30"),
      ]),
      PaymentsToAcquirePropertyPlantAndEquipment:concept("USD",[
        fact(6,"CY2026Q2","2026-04-01","2026-06-30"),
      ]),
    }},
  };
}

test("SEC SIC division mapping identifies financial issuers without a proprietary sector taxonomy",()=>{
  assert.deepEqual(sicDivision("6021"),{id:"H",label:"FINANCE_INSURANCE_REAL_ESTATE",financial:true});
  assert.deepEqual(sicDivision("3571"),{id:"D",label:"MANUFACTURING",financial:false});
  assert.equal(sicDivision(null),null);
});

test("current-frame audit uses exact quarter facts and builds comparable issuer row",()=>{
  const row=buildIssuerRowFromDocuments({member:{cik:"0000001001",ticker:"TST",name:"Test"},companyFacts:doc(),submission:{sic:"3571"},frame,asOf});
  assert.equal(row.audit.status,"PASS");
  assert.equal(row.isFinancial,false);
  assert.equal(row.sectorId,"D");
  assert.equal(row.current.eps,2);
  assert.equal(row.priorYear.eps,1);
  assert.equal(row.current.revenue,120);
  assert.equal(row.priorYear.revenue,100);
  assert.equal(row.current.operatingIncome,24);
  assert.equal(row.priorYear.operatingIncome,15);
  assert.equal(row.current.netIncome,18);
  assert.equal(row.priorYear.netIncome,10);
  assert.equal(row.current.operatingCashFlow,30);
  assert.equal(row.current.capex,6);
});

test("future-filed and long-duration facts are rejected",()=>{
  const document=doc();
  document.facts["us-gaap"].EarningsPerShareDiluted=concept("USD/shares",[
    fact(3,"CY2026Q2","2026-01-01","2026-06-30","2026-08-01"),
    fact(4,"CY2026Q2","2026-04-01","2026-06-30","2026-12-01"),
  ]);
  const selected=selectCompanyFact(document,{metric:"eps",frame:"CY2026Q2",frameEnd:"2026-06-30",asOf});
  assert.equal(selected.fact,null);
  assert.equal(selected.reason,"NO_EXPLICIT_FRAME_FACT");
});

test("same latest filing with conflicting exact-frame values is missing instead of guessed",()=>{
  const document=doc();
  document.facts["us-gaap"].EarningsPerShareDiluted=concept("USD/shares",[
    fact(2,"CY2026Q2","2026-04-01","2026-06-30","2026-08-01"),
    fact(2.5,"CY2026Q2","2026-04-01","2026-06-30","2026-08-01"),
  ]);
  const selected=selectCompanyFact(document,{metric:"eps",frame:"CY2026Q2",frameEnd:"2026-06-30",asOf});
  assert.equal(selected.fact,null);
  assert.equal(selected.reason,"LATEST_FILED_VALUE_CONFLICT");
});