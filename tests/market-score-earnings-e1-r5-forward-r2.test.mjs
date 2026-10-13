import test from "node:test";
import assert from "node:assert/strict";
import {
  E1_R5_FORWARD_R2_CONTRACT,
  E1_R5_FORWARD_R2_VERSION,
  E1_R5_FORWARD_R2_WEIGHTS,
  cfoForwardRevenueRevision,
  cfoRollingForwardRevenueLevel,
  composeFutureOutlook,
  composeS12,
  guidanceBreadthRaw,
  guidanceMidpoint,
  guidanceRevisionPair,
  managementGuidanceMagnitude,
  median,
  symmetricChange,
} from "../lib/market-score/earnings-e1-r5-forward-r2.mjs";

test("forward R2 locks the approved 4/3/3 future-outlook structure",()=>{
  assert.equal(E1_R5_FORWARD_R2_VERSION,"E1-R5-FORWARD-R2");
  assert.deepEqual(E1_R5_FORWARD_R2_WEIGHTS,{
    s12ManagementGuidanceMagnitude:4,
    s12CfoForwardRevenueRevision:3,
    s13GuidanceBreadth:3,
  });
  assert.equal(E1_R5_FORWARD_R2_CONTRACT.status,"APPROVED_SHADOW_ONLY");
  assert.equal(E1_R5_FORWARD_R2_CONTRACT.productionActivation,false);
  assert.equal(E1_R5_FORWARD_R2_CONTRACT.missingPolicy,"NULL_NO_REWEIGHT");
  assert.equal(E1_R5_FORWARD_R2_CONTRACT.s12.managementGuidance.weight,4);
  assert.equal(E1_R5_FORWARD_R2_CONTRACT.s12.cfoForwardRevenue.weight,3);
  assert.equal(E1_R5_FORWARD_R2_CONTRACT.s12.analystEpsRevision.status,"OPTIONAL_FUTURE_ENHANCEMENT");
  assert.equal(E1_R5_FORWARD_R2_CONTRACT.s12.analystEpsRevision.decision,"HOLD");
  assert.equal(E1_R5_FORWARD_R2_CONTRACT.s13.weight,3);
});

test("management guidance uses midpoint and symmetric change",()=>{
  assert.equal(guidanceMidpoint({low:4,high:6}),5);
  assert.equal(guidanceMidpoint({low:6,high:4}),null);
  assert.equal(symmetricChange(0,0),0);
  assert.equal(symmetricChange(6,4),0.4);
  assert.equal(symmetricChange(-2,-4),2/3);
});

test("guidance revision requires identical period metric basis and unit",()=>{
  const previous={periodKey:"FY2026",metric:"EPS",basis:"ADJUSTED",unit:"USD/share",low:4,high:6};
  const current={...previous,low:5,high:7};
  assert.deepEqual(guidanceRevisionPair(current,previous),{
    status:"READY",reason:null,raw:2/11,currentMidpoint:6,previousMidpoint:5,
  });
  assert.equal(guidanceRevisionPair({...current,periodKey:"FY2027"},previous).reason,"TARGET_PERIOD_MISMATCH");
  assert.equal(guidanceRevisionPair({...current,basis:"GAAP"},previous).reason,"BASIS_MISMATCH");
  assert.equal(guidanceRevisionPair({...current,metric:"REVENUE"},previous).reason,"METRIC_MISMATCH");
  assert.equal(guidanceRevisionPair({...current,withdrawn:true},previous).reason,"GUIDANCE_WITHDRAWN");
});

test("S12A aggregates comparable issuer revisions by median only",()=>{
  const base={periodKey:"FY2026",metric:"EPS",basis:"GAAP",unit:"USD/share"};
  const out=managementGuidanceMagnitude([
    {previous:{...base,low:4,high:4},current:{...base,low:6,high:6}},
    {previous:{...base,low:5,high:5},current:{...base,low:5,high:5}},
    {previous:{...base,low:3,high:3},current:{...base,periodKey:"FY2027",low:4,high:4}},
  ]);
  assert.equal(out.totalCount,3);
  assert.equal(out.comparableCount,2);
  assert.equal(out.raw,0.2);
  assert.equal(median([]),null);
});

test("CFO rolling forward level uses quarter-specific 75/25 to 0/100 weights",()=>{
  assert.equal(cfoRollingForwardRevenueLevel({surveyQuarter:1,currentYearGrowth:8,nextYearGrowth:4}),7);
  assert.equal(cfoRollingForwardRevenueLevel({surveyQuarter:2,currentYearGrowth:8,nextYearGrowth:4}),6);
  assert.equal(cfoRollingForwardRevenueLevel({surveyQuarter:3,currentYearGrowth:8,nextYearGrowth:4}),5);
  assert.equal(cfoRollingForwardRevenueLevel({surveyQuarter:4,nextYearGrowth:4}),4);
  assert.equal(cfoForwardRevenueRevision(
    {surveyQuarter:3,currentYearGrowth:8,nextYearGrowth:4},
    {surveyQuarter:2,currentYearGrowth:7,nextYearGrowth:3},
  ),0);
});

test("breadth excludes non-guiders from denominator and no-guidance is not neutral",()=>{
  assert.equal(guidanceBreadthRaw({up:6,same:2,down:2}),0.4);
  assert.equal(guidanceBreadthRaw({up:0,same:0,down:0}),null);
});

test("S12 and future block do not reweight around missing components",()=>{
  assert.equal(composeS12({managementScore:80,cfoScore:60}),500/7);
  assert.equal(composeS12({managementScore:80,cfoScore:null}),null);
  assert.equal(composeFutureOutlook({s12Score:70,s13Score:50}),64);
  assert.equal(composeFutureOutlook({s12Score:70,s13Score:null}),null);
});
