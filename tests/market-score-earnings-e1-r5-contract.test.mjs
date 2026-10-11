import test from "node:test";
import assert from "node:assert/strict";
import {
  E1_R5_COMPONENTS,
  E1_R5_SHADOW_VERSION,
  annualizedLog3m,
  breadthPercent,
  buildEarningsR5ShadowScore,
  freeCashFlow,
  guidanceNetBreadth,
  marginPercent,
  percentChange,
  percentileScore,
  percentagePointChange,
  producerCostPressure,
  quarterFromCumulative,
  symmetricChange,
  validateEarningsR5Weights,
} from "../lib/market-score/earnings-e1-r5-contract.mjs";

test("E1-R5 shadow weights preserve the approved 55/20/15/10 area decomposition",()=>{
  const validation=validateEarningsR5Weights();
  assert.equal(validation.status,"PASS");
  assert.ok(Math.abs(validation.componentWeight-1)<1e-12);
  assert.ok(Math.abs(validation.areaWeight-1)<1e-12);
  assert.ok(Math.abs(validation.areaComponentWeights.A-0.55)<1e-12);
  assert.ok(Math.abs(validation.areaComponentWeights.B-0.20)<1e-12);
  assert.ok(Math.abs(validation.areaComponentWeights.C-0.15)<1e-12);
  assert.ok(Math.abs(validation.areaComponentWeights.D-0.10)<1e-12);
  assert.equal(Object.keys(E1_R5_COMPONENTS).length,13);
});

test("symmetric EPS change handles growth, shrinkage, profit turn and loss turn without divide-by-zero",()=>{
  assert.ok(Math.abs(symmetricChange(2,1)-2/3)<1e-12);
  assert.ok(Math.abs(symmetricChange(1,2)+2/3)<1e-12);
  assert.equal(symmetricChange(1,-1),2);
  assert.equal(symmetricChange(-1,1),-2);
  assert.equal(symmetricChange(0,0),0);
  assert.equal(symmetricChange(null,1),null);
});

test("display growth and margin helpers keep economic units explicit",()=>{
  assert.equal(percentChange(2,1),100);
  assert.equal(percentChange(1,2),-50);
  assert.equal(percentChange(1,0),null);
  assert.equal(marginPercent(15,100),15);
  assert.equal(marginPercent(15,0),null);
  assert.equal(percentagePointChange(12,15),-3);
});

test("quarter cash flow is reconstructed from cumulative filings before FCF is calculated",()=>{
  assert.equal(quarterFromCumulative(60),60);
  assert.equal(quarterFromCumulative(150,60),90);
  assert.equal(quarterFromCumulative(260,150),110);
  assert.equal(freeCashFlow(90,25),65);
});

test("producer cost pressure is input-price acceleration minus output-price acceleration",()=>{
  const input=annualizedLog3m(103,100);
  const output=annualizedLog3m(101.5,100);
  assert.ok(Number.isFinite(input));
  assert.ok(Number.isFinite(output));
  assert.ok(Math.abs(producerCostPressure(input,output)-(input-output))<1e-12);
  assert.equal(annualizedLog3m(0,100),null);
});

test("breadth and guidance treat missing observations as missing, not neutral",()=>{
  assert.equal(breadthPercent(75,100),75);
  assert.equal(breadthPercent(0,0),null);
  assert.equal(guidanceNetBreadth(2,1,1),0.25);
  assert.equal(guidanceNetBreadth(0,0,0),null);
});

test("historical percentile supports good-up and good-down directions without current-point leakage",()=>{
  const history=[10,20,30,40];
  assert.equal(percentileScore(50,history,{direction:"UP",minPoints:4}),100);
  assert.equal(percentileScore(50,history,{direction:"DOWN",minPoints:4}),0);
  assert.equal(percentileScore(25,history,{direction:"UP",minPoints:4}),50);
  assert.equal(percentileScore(25,history,{direction:"DOWN",minPoints:4}),50);
  assert.equal(percentileScore(25,history.slice(0,3),{direction:"UP",minPoints:4}),null);
});

test("E1-R5 shadow never renormalizes missing components",()=>{
  const all50=Object.fromEntries(Object.keys(E1_R5_COMPONENTS).map(key=>[key,50]));
  const ready=buildEarningsR5ShadowScore(all50);
  assert.equal(ready.status,"READY");
  assert.equal(ready.score,50);
  assert.equal(ready.methodologyVersion,E1_R5_SHADOW_VERSION);
  assert.equal(ready.active,false);
  assert.equal(ready.reweighted,false);
  assert.equal(ready.areas.realized.score,50);
  assert.equal(ready.areas.breadth.score,50);
  assert.equal(ready.areas.cost.score,50);
  assert.equal(ready.areas.forward.score,50);

  const missingForward={...all50,forwardEpsRevision:null};
  const partial=buildEarningsR5ShadowScore(missingForward);
  assert.equal(partial.status,"PARTIAL");
  assert.equal(partial.score,null);
  assert.deepEqual(partial.missing,["S12"]);
  assert.equal(partial.areas.forward.status,"PARTIAL");
  assert.equal(partial.areas.forward.score,null);
  assert.equal(partial.reweighted,false);
});
