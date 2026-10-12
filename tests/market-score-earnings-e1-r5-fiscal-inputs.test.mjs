import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFiscalSecIssuerInputs,
  fiscalPairGeometryCompatible,
  selectFiscalComparablePair,
  selectFiscalS5CapexFlow,
} from "../lib/market-score/earnings-e1-r5-fiscal-inputs.mjs";

function doc(cik,concepts={}){
  const facts={};
  for(const [tag,{unit="USD",rows=[],label=tag}] of Object.entries(concepts))facts[tag]={label,units:{[unit]:rows}};
  return {cik:String(cik),facts:{"us-gaap":facts}};
}
function q({start,end,val,filed="2026-08-01",accn="a",fy=2026,fp="Q2",form="10-Q"}){
  return {start,end,val,filed,accn,fy,fp,form};
}

test("fiscal pair geometry ignores FY/FP labels and binds dates/duration",()=>{
  const current={start:"2026-04-01",end:"2026-06-30",duration:91,fy:2026,fp:"Q2"};
  const prior={start:"2025-04-01",end:"2025-06-30",duration:91,fy:2024,fp:"FY"};
  assert.equal(fiscalPairGeometryCompatible(current,prior),true);
});

test("default fiscal age cap is 210 days, not 211",()=>{
  const d=doc("8670",{
    RevenueFromContractWithCustomerExcludingAssessedTax:{rows:[
      q({start:"2026-01-01",end:"2026-03-16",val:120,filed:"2026-04-20",accn:"c"}),
      q({start:"2025-01-01",end:"2025-03-16",val:100,filed:"2025-04-20",accn:"p",fy:2025}),
    ]},
  });
  assert.ok(selectFiscalComparablePair(d,{metric:"revenue",asOf:"2026-10-12"}).current);
  const d211=doc("8670",{
    RevenueFromContractWithCustomerExcludingAssessedTax:{rows:[
      q({start:"2026-01-01",end:"2026-03-15",val:120,filed:"2026-04-20",accn:"c"}),
      q({start:"2025-01-01",end:"2025-03-15",val:100,filed:"2025-04-20",accn:"p",fy:2025}),
    ]},
  });
  assert.equal(selectFiscalComparablePair(d211,{metric:"revenue",asOf:"2026-10-12"}).current,null);
});

test("common anchor keeps S8 current net income without requiring prior net pair",()=>{
  const d=doc("1751788",{
    RevenueFromContractWithCustomerExcludingAssessedTax:{rows:[
      q({start:"2026-04-01",end:"2026-06-30",val:1000,accn:"rev-c"}),
      q({start:"2025-04-01",end:"2025-06-30",val:900,filed:"2025-08-01",accn:"rev-p",fy:2025}),
    ]},
    EarningsPerShareDiluted:{unit:"USD-per-shares",rows:[
      q({start:"2026-04-03",end:"2026-07-02",val:1.2,accn:"eps-c"}),
      q({start:"2025-04-03",end:"2025-07-02",val:1.0,filed:"2025-08-01",accn:"eps-p",fy:2025}),
    ]},
    NetIncomeLoss:{rows:[q({start:"2026-04-01",end:"2026-06-30",val:80,accn:"net-c"})]},
    OperatingIncomeLoss:{rows:[
      q({start:"2026-04-01",end:"2026-06-30",val:120,accn:"op-c"}),
      q({start:"2025-04-01",end:"2025-06-30",val:100,filed:"2025-08-01",accn:"op-p",fy:2025}),
    ]},
    NetCashProvidedByUsedInOperatingActivities:{rows:[q({start:"2026-04-01",end:"2026-06-30",val:150,accn:"cfo"})]},
    PaymentsToAcquireMachineryAndEquipment:{rows:[q({start:"2026-04-01",end:"2026-06-30",val:50,accn:"capex-fallback"})]},
  });
  const row=buildFiscalSecIssuerInputs({companyFacts:d,cik:"1751788",asOf:"2026-10-12",isFinancial:false,sectorId:"MFG"});
  assert.equal(row.status,"PASS");
  assert.equal(row.current.netIncome,80);
  assert.equal(row.priorYear.netIncome,null);
  assert.equal(row.audit.netCurrentAligned,true);
  assert.equal(row.current.capex,50);
  assert.equal(row.audit.capexSource,"APPROVED_ISSUER_FALLBACK");
  assert.equal(row.audit.capexFallback.ticker,"DOW");
});

test("S5 fallback is CIK-specific and never overrides approved capex",()=>{
  const fallbackOnly=doc("1751788",{
    PaymentsToAcquireMachineryAndEquipment:{rows:[q({start:"2026-04-01",end:"2026-06-30",val:50,accn:"f"})]},
  });
  const target={start:"2026-04-01",end:"2026-06-30",duration:91};
  const good=selectFiscalS5CapexFlow(fallbackOnly,{cik:"1751788",asOf:"2026-10-12",target});
  assert.equal(good.value,50);
  assert.equal(good.source,"APPROVED_ISSUER_FALLBACK");
  const blocked=selectFiscalS5CapexFlow(fallbackOnly,{cik:"9999999",asOf:"2026-10-12",target});
  assert.equal(blocked.value,null);
  assert.equal(blocked.source,null);

  const withApproved=doc("1751788",{
    PaymentsToAcquirePropertyPlantAndEquipment:{rows:[q({start:"2026-04-01",end:"2026-06-30",val:70,accn:"approved"})]},
    PaymentsToAcquireMachineryAndEquipment:{rows:[q({start:"2026-04-01",end:"2026-06-30",val:50,accn:"fallback"})]},
  });
  const selected=selectFiscalS5CapexFlow(withApproved,{cik:"1751788",asOf:"2026-10-12",target});
  assert.equal(selected.value,70);
  assert.equal(selected.source,"APPROVED_CAPEX_TAG");
  assert.equal(selected.fallback,null);
});

test("Q4 EPS annual-minus-nine-months is not reconstructed",()=>{
  const d=doc("59478",{
    EarningsPerShareDiluted:{unit:"USD-per-shares",rows:[
      q({start:"2025-01-01",end:"2025-12-31",val:4,filed:"2026-02-15",accn:"annual",fp:"FY",form:"10-K"}),
      q({start:"2025-01-01",end:"2025-09-30",val:3,filed:"2025-11-01",accn:"nine",fy:2025,fp:"Q3"}),
    ]},
  });
  const pair=selectFiscalComparablePair(d,{metric:"eps",asOf:"2026-04-01"});
  assert.equal(pair.current,null);
});
