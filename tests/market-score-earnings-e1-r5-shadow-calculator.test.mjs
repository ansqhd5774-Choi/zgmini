import test from "node:test";
import assert from "node:assert/strict";
import {E1_R5_COMPONENTS} from "../lib/market-score/earnings-e1-r5-contract.mjs";
import {
  buildEarningsR5RawComponents,
  buildEarningsR5Shadow,
  scoreEarningsR5RawComponents,
} from "../lib/market-score/earnings-e1-r5-shadow-calculator.mjs";

function input(){
  return {
    issuerRows:[
      {cik:"1",sectorId:"tech",isFinancial:false,current:{eps:2,revenue:110,operatingIncome:20,netIncome:15,operatingCashFlow:30,capex:10},priorYear:{eps:1,revenue:100,operatingIncome:15,netIncome:10}},
      {cik:"2",sectorId:"tech",isFinancial:false,current:{eps:-1,revenue:210,operatingIncome:10,netIncome:-2,operatingCashFlow:20,capex:5},priorYear:{eps:-2,revenue:200,operatingIncome:5,netIncome:-5}},
      {cik:"3",sectorId:"finance",isFinancial:true,current:{eps:1,revenue:150,operatingIncome:999,netIncome:8,operatingCashFlow:999,capex:1},priorYear:{eps:2,revenue:150,operatingIncome:999,netIncome:9}},
    ],
    beaCorporateProfits:{current:4709.5,priorYear:4500},
    producerIndustries:[
      {industryId:"334",priorRevenue:100,inputCurrent:103,inputLag3m:100,outputCurrent:101.5,outputLag3m:100},
      {industryId:"335",priorRevenue:200,inputCurrent:102,inputLag3m:100,outputCurrent:101,outputLag3m:100},
    ],
    unitLaborCostYoY:1.4,
    forwardEpsRows:[{current:2,prior30d:1.8},{current:-0.5,prior30d:-0.8}],
    guidance:{up:2,flat:1,down:1},
  };
}

function historyFor(raw){
  return [
    {value:raw-3,availableAt:"2025-01-01T00:00:00Z"},
    {value:raw-2,availableAt:"2025-04-01T00:00:00Z"},
    {value:raw-1,availableAt:"2025-07-01T00:00:00Z"},
    {value:raw+1,availableAt:"2025-10-01T00:00:00Z"},
    {value:raw+1000,availableAt:"2027-01-01T00:00:00Z"},
  ];
}

test("raw E1-R5 components follow the approved economic definitions",()=>{
  const result=buildEarningsR5RawComponents(input());
  assert.equal(result.status,"READY");
  assert.deepEqual(result.missing,[]);
  assert.equal(result.quality.issuerCount,3);
  assert.equal(result.quality.nonFinancialCount,2);
  assert.equal(result.quality.sectorCount,2);

  assert.ok(Math.abs(result.components.epsGrowthStrength.raw-2/3)<1e-12);
  assert.equal(result.components.revenueGrowth.raw,5);
  assert.equal(result.components.epsImprovementBreadth.raw,200/3);
  assert.equal(result.components.profitableCompanyBreadth.raw,200/3);
  assert.equal(result.components.improvingSectorBreadth.raw,50);
  assert.equal(result.components.operatingMarginLevel.universe,"NON_FINANCIAL");
  assert.equal(result.components.operatingMarginLevel.eligibleCount,2);
  assert.equal(result.components.operatingMarginLevel.coverage,1);
  assert.equal(result.components.freeCashFlowMargin.eligibleCount,2);
  assert.equal(result.components.unitLaborCostPressure.raw,1.4);
  assert.equal(result.components.guidanceBreadth.raw,0.25);
  assert.equal(result.components.producerCostPressure.coverage,1);
  assert.ok(result.components.producerCostPressure.raw>0);
  assert.ok(result.components.beaCorporateProfitGrowth.raw>0);
  assert.ok(result.components.forwardEpsRevision.raw>0);
});

test("financial issuers do not enter operating-margin or FCF medians",()=>{
  const result=buildEarningsR5RawComponents(input());
  const m1=100*20/110,m2=100*10/210;
  const f1=100*20/110,f2=100*15/210;
  assert.ok(Math.abs(result.components.operatingMarginLevel.raw-(m1+m2)/2)<1e-12);
  assert.ok(Math.abs(result.components.freeCashFlowMargin.raw-(f1+f2)/2)<1e-12);
});

test("PIT scoring excludes future history and reverses cost-pressure direction",()=>{
  const raw=buildEarningsR5RawComponents(input());
  const histories=Object.fromEntries(Object.keys(E1_R5_COMPONENTS).map(key=>[key,historyFor(raw.components[key].raw)]));
  const minPoints=Object.fromEntries(Object.keys(E1_R5_COMPONENTS).map(key=>[key,4]));
  const scored=scoreEarningsR5RawComponents(raw,{
    histories,
    asOf:"2026-10-11T00:00:00Z",
    historyPolicy:{status:"TEST",operationalApproved:false,minPoints},
  });
  assert.equal(scored.status,"READY");
  assert.equal(scored.active,false);
  assert.equal(scored.reweighted,false);
  for(const [key,meta] of Object.entries(E1_R5_COMPONENTS)){
    assert.equal(scored.components[key].historyPoints,4);
    assert.equal(scored.components[key].score,meta.direction==="DOWN"?25:75);
  }
  assert.ok(Math.abs(scored.score-67.5)<1e-12);
  assert.equal(scored.historyPolicy.operationalApproved,false);
});

test("missing guidance remains PARTIAL and is never reweighted",()=>{
  const value=input();value.guidance=null;
  const raw=buildEarningsR5RawComponents(value);
  assert.equal(raw.status,"PARTIAL");
  assert.ok(raw.missing.includes("S13"));

  const histories={};
  for(const key of Object.keys(E1_R5_COMPONENTS)){
    const source=raw.components[key]?.raw;
    histories[key]=Number.isFinite(source)?historyFor(source):[];
  }
  const minPoints=Object.fromEntries(Object.keys(E1_R5_COMPONENTS).map(key=>[key,4]));
  const scored=buildEarningsR5Shadow(value,{histories,asOf:"2026-10-11T00:00:00Z",historyPolicy:{status:"TEST",operationalApproved:false,minPoints}});
  assert.equal(scored.status,"PARTIAL");
  assert.equal(scored.score,null);
  assert.ok(scored.missing.includes("S13"));
  assert.equal(scored.reweighted,false);
});

test("duplicate issuer CIK invalidates the normalized issuer input",()=>{
  const value=input();value.issuerRows.push({...value.issuerRows[0],cik:"0000000001"});
  const result=buildEarningsR5RawComponents(value);
  assert.equal(result.status,"INVALID");
  assert.equal(result.reason,"DUPLICATE_ISSUER_CIK");
});
