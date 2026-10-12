import test from "node:test";
import assert from "node:assert/strict";
import {
  fiscalPairGeometryCompatible,
  selectFiscalComparablePairR2,
} from "../scripts/pc-writer/earnings-r5-fiscal-period-selector-r2.mjs";
import {evaluateFiscalWindowA2} from "../scripts/pc-writer/earnings-r5-fiscal-quarter-shadow-audit-a2.mjs";

const asOf="2026-10-12";
function fact(val,{start,end,filed="2026-09-01",form="10-Q",fp="Q2",fy=2026,accn}={}){
  return {val,start,end,filed,form,fp,fy,accn:accn??`${filed}-${String(val)}`};
}
function concept(unit,rows){return {units:{[unit]:rows}};}
function baseDocument(){
  return {cik:1001,facts:{"us-gaap":{
    EarningsPerShareDiluted:concept("USD/shares",[
      fact(2,{start:"2026-05-01",end:"2026-07-31",fp:"Q2",fy:2026}),
      fact(1,{start:"2025-05-01",end:"2025-07-31",filed:"2025-09-01",fp:"Q1",fy:2026}),
    ]),
    RevenueFromContractWithCustomerExcludingAssessedTax:concept("USD",[
      fact(120,{start:"2026-05-01",end:"2026-07-31",fp:"Q2",fy:2026}),
      fact(100,{start:"2025-05-01",end:"2025-07-31",filed:"2025-09-01",fp:"Q1",fy:2026}),
    ]),
    NetIncomeLoss:concept("USD",[
      fact(18,{start:"2026-05-01",end:"2026-07-31",fp:"Q2",fy:2026}),
    ]),
  }}};
}

test("R2 pair geometry ignores FY FP mismatch when dates durations tag and unit are comparable",()=>{
  const doc=baseDocument();
  const pair=selectFiscalComparablePairR2(doc,{metric:"eps",asOf,maxAgeDays:185});
  assert.equal(pair.reason,null);
  assert.equal(pair.current.end,"2026-07-31");
  assert.equal(pair.prior.end,"2025-07-31");
  assert.equal(pair.current.fp,"Q2");
  assert.equal(pair.prior.fp,"Q1");
  assert.equal(pair.current.fy,2026);
  assert.equal(pair.prior.fy,2026);
});

test("R2 still enforces approved 320 to 410 day comparable period geometry",()=>{
  assert.equal(fiscalPairGeometryCompatible({start:"2026-05-01",end:"2026-07-31",duration:92},{start:"2025-05-01",end:"2025-07-31",duration:92}),true);
  assert.equal(fiscalPairGeometryCompatible({start:"2026-05-01",end:"2026-07-31",duration:92},{start:"2025-09-01",end:"2025-11-30",duration:91}),false);
});

test("A2 common-anchor S8 requires current net aligned to current revenue but not prior net",()=>{
  const members=[{cik:"0000001001",ticker:"TST",name:"Test"}];
  const factsByCik=new Map([["0000001001",baseDocument()]]);
  const submissionsByCik=new Map([["0000001001",{sic:"3571"}]]);
  const row=evaluateFiscalWindowA2({members,factsByCik,submissionsByCik,asOf,maxAgeDays:185});
  assert.equal(row.independent.S1,1);
  assert.equal(row.independent.S2,1);
  assert.equal(row.independent.S8,1);
  assert.equal(row.anchored.S1,1);
  assert.equal(row.anchored.S2,1);
  assert.equal(row.anchored.S8,1);
});
