import test from "node:test";
import assert from "node:assert/strict";
import {
  percentileRankExpanding,
  strictWeightedScore,
  creditRiskDefense,
  assetBubbleSafety,
  debtRiskSafety,
  fundingStressScore,
  debtServiceCapacityScore,
  bondVolatilityScore,
  priceAcceleration,
  speculativeFlowScore,
  riskOverlay,
} from "../lib/diagnostic-layer/model.mjs";

test("expanding percentile has no look-ahead", () => {
  assert.deepEqual(percentileRankExpanding([10, 20, 15], 2), [null, 0.75, 0.5]);
});

test("strict weighting never redistributes missing weight", () => {
  const out = strictWeightedScore([
    { id: "a", score: 100, weight: 0.5 },
    { id: "b", score: null, weight: 0.5 },
  ]);
  assert.equal(out.status, "PARTIAL");
  assert.equal(out.score, null);
  assert.deepEqual(out.missing, ["b"]);
});

test("credit defense uses R2 active 35/35/10/20 weights", () => {
  const out = creditRiskDefense({hyCmdi: 10, igCmdi: 20, totalCmdi: 30, bondVolatility: 40});
  assert.equal(out.status, "READY");
  assert.equal(out.score, 21.5);
});

test("asset bubble remains PARTIAL when PIT breadth is missing", () => {
  const out = assetBubbleSafety({
    valuationPressure: 20,
    priceAcceleration: 30,
    riskAssetShare: 40,
    speculativeFlows: 50,
    breadthDivergence: null,
    excessLiquidity: 60,
  });
  assert.equal(out.status, "PARTIAL");
  assert.equal(out.score, null);
  assert.deepEqual(out.missing, ["breadthDivergence"]);
});

test("debt risk uses R7 unchanged top-level weights", () => {
  const out = debtRiskSafety({
    dsr: 20,
    debtGdp: 40,
    rateBurden: 60,
    creditStress: 80,
    debtServiceCapacity: 100,
  });
  assert.equal(out.status, "READY");
  assert.equal(out.score, 48);
});

test("R7 funding stress is 70 market / 30 bank and strict", () => {
  const out = fundingStressScore({
    sofrIorb: 10,
    obfrIorb: 20,
    repoGap: 30,
    sofrIorbRv20: 40,
    bankEmergency: 50,
  });
  // market = 3.5 + 6 + 6 + 6 = 21.5; final = 15.05 + 15
  assert.equal(out.status, "READY");
  assert.ok(Math.abs(out.score - 30.05) < 1e-12);

  const partial = fundingStressScore({
    sofrIorb: 10,
    obfrIorb: 20,
    repoGap: null,
    sofrIorbRv20: 40,
    bankEmergency: 50,
  });
  assert.equal(partial.status, "PARTIAL");
  assert.equal(partial.score, null);
});

test("R7 debt service capacity is 50/50 level and momentum", () => {
  assert.deepEqual(debtServiceCapacityScore(80, 20), {status:"READY", score:50});
});

test("bond volatility requires all 2Y/5Y/10Y/30Y tenors", () => {
  assert.deepEqual(bondVolatilityScore({y2:10,y5:20,y10:30,y30:40}), {status:"READY", score:25});
  assert.deepEqual(bondVolatilityScore({y2:10,y5:20,y10:null,y30:40}), {status:"PARTIAL", score:null});
});

test("price acceleration uses 4*3M log return minus 12M log return", () => {
  const out = priceAcceleration(120, 100, 80);
  const expected = 4*Math.log(1.2)-Math.log(1.5);
  assert.ok(Math.abs(out-expected) < 1e-12);
});

test("speculative flow is safe when price acceleration is non-positive", () => {
  assert.equal(speculativeFlowScore(-0.1, 5), 100);
  assert.equal(speculativeFlowScore(0.1, 5), 5);
});

test("risk overlay never adds points and caps penalty at 7", () => {
  const safe = riskOverlay({
    baseOverall: 50,
    liquidityCrisisDefense: 80,
    assetBubbleSafety: 80,
    debtRiskSafety: 80,
    supplyShockSafety: 80,
  });
  assert.equal(safe.penalty, 0);
  assert.equal(safe.finalOverall, 50);

  const stressed = riskOverlay({
    baseOverall: 50,
    liquidityCrisisDefense: 0,
    assetBubbleSafety: 0,
    debtRiskSafety: 0,
    supplyShockSafety: 0,
  });
  assert.equal(stressed.penalty, 7);
  assert.equal(stressed.finalOverall, 43);
});

test("missing overlay diagnostic preserves Base Overall and reports PARTIAL", () => {
  const out = riskOverlay({
    baseOverall: 52,
    liquidityCrisisDefense: null,
    assetBubbleSafety: 20,
    debtRiskSafety: 30,
    supplyShockSafety: 40,
  });
  assert.equal(out.status, "PARTIAL");
  assert.equal(out.finalOverall, 52);
  assert.equal(out.penalty, null);
});
