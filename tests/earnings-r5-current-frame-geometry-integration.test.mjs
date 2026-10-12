import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIssuerRowFromDocuments,
  selectCompanyFact,
  selectCurrentQuarterFlow,
} from "../scripts/pc-writer/earnings-r5-current-frame-audit.mjs";

const frame={year:2026,quarter:2,end:"2026-06-30",frame:"CY2026Q2",priorEnd:"2025-06-30",priorFrame:"CY2025Q2"};
const asOf="2026-10-12";

function fact(val,{frameValue=null,start,end,filed="2026-08-01",form="10-Q",fy=2026,fp="Q2",accn=null}={}){
  return {val,frame:frameValue,start,end,filed,form,fy,fp,accn:accn??`${filed}-${val}`};
}
function concept(unit,rows){return {units:{[unit]:rows}};}
function geometryDocument(){
  return {
    cik:1001,
    facts:{"us-gaap":{
      EarningsPerShareDiluted:concept("USD/shares",[
        fact(2,{start:"2026-04-01",end:"2026-06-30",fy:2026,accn:"2026-Q2"}),
        fact(1,{start:"2025-04-01",end:"2025-06-30",filed:"2026-08-01",fy:2026,accn:"2026-Q2"}),
        fact(9,{start:"2026-07-01",end:"2026-09-30",filed:"2026-10-01",fy:2026,fp:"Q3",accn:"2026-Q3"}),
      ]),
      RevenueFromContractWithCustomerExcludingAssessedTax:concept("USD",[
        fact(120,{start:"2026-04-01",end:"2026-06-30",fy:2026,accn:"2026-Q2"}),
        fact(100,{start:"2025-04-01",end:"2025-06-30",filed:"2026-08-01",fy:2026,accn:"2026-Q2"}),
        fact(999,{start:"2026-07-01",end:"2026-09-30",filed:"2026-10-01",fy:2026,fp:"Q3",accn:"2026-Q3"}),
      ]),
      OperatingIncomeLoss:concept("USD",[
        fact(24,{start:"2026-04-01",end:"2026-06-30",fy:2026,accn:"2026-Q2"}),
        fact(15,{start:"2025-04-01",end:"2025-06-30",filed:"2026-08-01",fy:2026,accn:"2026-Q2"}),
      ]),
      NetIncomeLoss:concept("USD",[
        fact(18,{start:"2026-04-01",end:"2026-06-30",fy:2026,accn:"2026-Q2"}),
        fact(10,{start:"2025-04-01",end:"2025-06-30",filed:"2026-08-01",fy:2026,accn:"2026-Q2"}),
      ]),
      NetCashProvidedByUsedInOperatingActivities:concept("USD",[
        fact(30,{start:"2026-01-01",end:"2026-03-31",filed:"2026-05-01",fy:2026,fp:"Q1",accn:"2026-Q1"}),
        fact(80,{start:"2026-01-01",end:"2026-06-30",filed:"2026-08-01",fy:2026,fp:"Q2",accn:"2026-Q2"}),
      ]),
      PaymentsToAcquirePropertyPlantAndEquipment:concept("USD",[
        fact(8,{start:"2026-01-01",end:"2026-03-31",filed:"2026-05-01",fy:2026,fp:"Q1",accn:"2026-Q1"}),
        fact(20,{start:"2026-01-01",end:"2026-06-30",filed:"2026-08-01",fy:2026,fp:"Q2",accn:"2026-Q2"}),
      ]),
    }},
  };
}

test("frame-safe fallback accepts frame-null comparable quarters even when SEC fy delta is zero",()=>{
  const document=geometryDocument();
  const current=selectCompanyFact(document,{metric:"eps",frame:frame.frame,frameEnd:frame.end,asOf});
  const prior=selectCompanyFact(document,{metric:"eps",frame:frame.priorFrame,frameEnd:frame.priorEnd,asOf});
  assert.equal(current.fact?.val,2);
  assert.equal(prior.fact?.val,1);
  assert.equal(current.fact?.fy-prior.fact?.fy,0);
});

test("mature Q2 target does not admit a later Q3 fact",()=>{
  const document=geometryDocument();
  document.facts["us-gaap"].EarningsPerShareDiluted=concept("USD/shares",[
    fact(9,{start:"2026-07-01",end:"2026-09-30",filed:"2026-10-01",fp:"Q3",accn:"2026-Q3"}),
  ]);
  const selected=selectCompanyFact(document,{metric:"eps",frame:frame.frame,frameEnd:frame.end,asOf});
  assert.equal(selected.fact,null);
  assert.equal(selected.reason,"NO_EXPLICIT_FRAME_FACT");
});

test("existing explicit mature-frame fact remains preferred over fallback",()=>{
  const document=geometryDocument();
  document.facts["us-gaap"].EarningsPerShareDiluted=concept("USD/shares",[
    fact(2,{frameValue:"CY2026Q2",start:"2026-04-01",end:"2026-06-30",filed:"2026-08-01",accn:"explicit"}),
    fact(2.5,{start:"2026-04-01",end:"2026-06-30",filed:"2026-09-01",accn:"fallback"}),
  ]);
  const selected=selectCompanyFact(document,{metric:"eps",frame:frame.frame,frameEnd:frame.end,asOf});
  assert.equal(selected.fact?.val,2);
  assert.equal(selected.fact?.explicitFrame,true);
});

test("matched cumulative CFO and capex are reconstructed for the revenue quarter only",()=>{
  const document=geometryDocument();
  const target={start:"2026-04-01",end:"2026-06-30",duration:91};
  const cfo=selectCurrentQuarterFlow(document,{metric:"operatingCashFlow",asOf,target});
  const capex=selectCurrentQuarterFlow(document,{metric:"capex",asOf,target});
  assert.equal(cfo.method,"CUMULATIVE_DELTA");
  assert.equal(cfo.value,50);
  assert.equal(capex.method,"CUMULATIVE_DELTA");
  assert.equal(capex.value,12);
});

test("issuer row uses frame-safe geometry without changing the mature target or Q4 EPS policy",()=>{
  const row=buildIssuerRowFromDocuments({
    member:{cik:"0000001001",ticker:"TST",name:"Test"},
    companyFacts:geometryDocument(),
    submission:{sic:"3571"},
    frame,
    asOf,
  });
  assert.equal(row.audit.status,"PASS");
  assert.equal(row.current.eps,2);
  assert.equal(row.priorYear.eps,1);
  assert.equal(row.current.revenue,120);
  assert.equal(row.priorYear.revenue,100);
  assert.equal(row.current.operatingIncome,24);
  assert.equal(row.priorYear.operatingIncome,15);
  assert.equal(row.current.netIncome,18);
  assert.equal(row.priorYear.netIncome,10);
  assert.equal(row.current.operatingCashFlow,50);
  assert.equal(row.current.capex,12);
  assert.equal(row.audit.cfoMethod,"CUMULATIVE_DELTA");
  assert.equal(row.audit.capexMethod,"CUMULATIVE_DELTA");
  assert.equal(row.audit.q4EpsAnnualMinusNineMonths,"FORBIDDEN");
});
