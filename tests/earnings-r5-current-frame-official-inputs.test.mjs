import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProducerIndustriesFromS10Result,
  selectBeaCorporateProfitsForFrame,
} from "../scripts/pc-writer/earnings-r5-current-frame-official-inputs.mjs";
import {buildCurrentFrameRawComponents} from "../scripts/pc-writer/earnings-r5-current-frame-audit.mjs";
import {E1_R5_COMPONENTS} from "../lib/market-score/earnings-e1-r5-contract.mjs";

const frame={year:2026,quarter:2,frame:"CY2026Q2",priorFrame:"CY2025Q2",end:"2026-06-30",priorEnd:"2025-06-30"};

function inputSeries(naics,latest,lag3m,annualized3m){return {naics,latest:{month:"2026-09-01",value:latest},lag3m:{month:"2026-06-01",value:lag3m},annualized3m};}
function outputSeries(naics3,latest,lag3m,annualized3m){return {naics3,latest:{month:"2026-09-01",value:latest},lag3m:{month:"2026-06-01",value:lag3m},annualized3m};}

test("S6 binding selects the exact mature frame instead of blindly taking workbook latest",()=>{
  const parsed={source:"BEA_TEST",seriesCode:"A051RC",observations:[
    {year:2025,quarter:2,value:100},
    {year:2026,quarter:2,value:120},
    {year:2026,quarter:3,value:130},
  ]};
  const selected=selectBeaCorporateProfitsForFrame(parsed,frame);
  assert.equal(selected.status,"READY");
  assert.deepEqual(selected.input,{current:120,priorYear:100});
});

test("S6 binding fails closed when the prior-year same quarter is missing",()=>{
  const selected=selectBeaCorporateProfitsForFrame({observations:[{year:2026,quarter:2,value:120}]},frame);
  assert.equal(selected.status,"MISSING");
  assert.equal(selected.input,null);
});

test("S10 binding reconstructs approved exact sectors and preserves the strict revenue denominator",()=>{
  const inputs=[inputSeries("111",110,100,38.124012),inputSeries("222",105,100,19.516043)];
  const outputs=[outputSeries("111",105,100,19.516043),outputSeries("222",102,100,7.921052)];
  const sectors=[
    {naics3:"111",priorRevenue:60,issuerCount:2,inputAnnualized3m:38.124012,outputAnnualized3m:19.516043,pressure:18.607969},
    {naics3:"222",priorRevenue:40,issuerCount:1,inputAnnualized3m:19.516043,outputAnnualized3m:7.921052,pressure:11.594991},
  ];
  const raw=(60*18.607969+40*11.594991)/100;
  const s10={
    status:"PASS",raw,eligibleRevenue:200,mappedRevenue:100,issuerCoverage:0.5,revenueCoverage:0.5,
    weighting:"PRIOR_REVENUE_MAPPED_ONLY",formula:"SUM_PRIOR_REVENUE_WEIGHT*(INPUT_3M_ANN-OUTPUT_3M_ANN)",
    classification:{complete:true},sectors,
  };
  const bound=buildProducerIndustriesFromS10Result({s10,inputSeries:inputs,outputSeries:outputs});
  assert.equal(bound.status,"READY");
  assert.equal(bound.producerIndustries.length,3);
  assert.equal(bound.producerIndustries.at(-1).priorRevenue,100);
  assert.equal(bound.producerIndustries.at(-1).source,"BLS_R14_UNMAPPED_STRICT_DENOMINATOR");
});

test("S10 binding rejects a source-series mismatch instead of accepting the reported raw",()=>{
  const s10={
    status:"PASS",raw:10,eligibleRevenue:100,mappedRevenue:100,
    weighting:"PRIOR_REVENUE_MAPPED_ONLY",formula:"SUM_PRIOR_REVENUE_WEIGHT*(INPUT_3M_ANN-OUTPUT_3M_ANN)",classification:{complete:true},
    sectors:[{naics3:"111",priorRevenue:100,inputAnnualized3m:20,outputAnnualized3m:10,pressure:10}],
  };
  const bound=buildProducerIndustriesFromS10Result({s10,inputSeries:[inputSeries("111",110,100,21)],outputSeries:[outputSeries("111",105,100,10)]});
  assert.equal(bound.status,"REJECTED");
  assert.equal(bound.reason,"S10_SECTOR_SOURCE_MISMATCH");
});

test("current-frame raw calculator uses existing S6 and S10 formulas and leaves S12 unresolved",()=>{
  const producerIndustries=[
    {priorRevenue:100,inputCurrent:110,inputLag3m:100,outputCurrent:105,outputLag3m:100},
    {priorRevenue:100,source:"UNMAPPED_DENOMINATOR"},
  ];
  const raw=buildCurrentFrameRawComponents({issuerRows:[],beaCorporateProfits:{current:120,priorYear:100},producerIndustries});
  assert.equal(Number.isFinite(raw.components.beaCorporateProfitGrowth.raw),true);
  assert.equal(Number.isFinite(raw.components.producerCostPressure.raw),true);
  assert.equal(raw.components.producerCostPressure.coverage,0.5);
  assert.equal(raw.missing.includes("S6"),false);
  assert.equal(raw.missing.includes("S10"),false);
  assert.equal(raw.missing.includes("S12"),true);
  assert.equal(E1_R5_COMPONENTS.beaCorporateProfitGrowth.weight,0.08);
  assert.equal(E1_R5_COMPONENTS.producerCostPressure.weight,0.10);
  assert.equal(E1_R5_COMPONENTS.forwardEpsRevision.weight,0.07);
});
