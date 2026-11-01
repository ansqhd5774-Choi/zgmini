import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  DOLLAR_FX_R22_WEIGHTS,
  DOLLAR_FX_R22_THRESHOLDS,
  asymmetricDollarMoveScoreR22,
  dollarMagnitudeScoreR22,
  dollarVolatilityScoreR22,
} from "../lib/market-score/dollar-fx-r22-shadow.mjs";
import {buildDollarR22PitTrend} from "../scripts/pc-writer/backtest-dollar-r22-pit-shadow.mjs";

test("Dollar R2.2 weights remain fully specified without missing-factor reweighting",()=>{
  assert.equal(Object.values(DOLLAR_FX_R22_WEIGHTS).reduce((a,b)=>a+b,0),1);
  assert.deepEqual(DOLLAR_FX_R22_WEIGHTS,{shortMomentum:.35,mediumMomentum:.30,acceleration:.15,volatility:.20});
});

test("Dollar R2.2 tolerates small moves but penalizes sharp appreciation sooner than depreciation",()=>{
  const short=DOLLAR_FX_R22_THRESHOLDS.short;
  assert.equal(asymmetricDollarMoveScoreR22(0,short),100);
  assert.equal(asymmetricDollarMoveScoreR22(1,short),100);
  assert.equal(asymmetricDollarMoveScoreR22(-3,short),100);
  assert.equal(asymmetricDollarMoveScoreR22(8,short),0);
  assert.equal(asymmetricDollarMoveScoreR22(-10,short),0);
  assert.ok(asymmetricDollarMoveScoreR22(4,short)<asymmetricDollarMoveScoreR22(-4,short));
});

test("Dollar R2.2 acceleration and volatility are two-sided stress signals",()=>{
  assert.equal(dollarMagnitudeScoreR22(0,{fullStressPct:6}),100);
  assert.equal(dollarMagnitudeScoreR22(6,{fullStressPct:6}),0);
  assert.equal(dollarMagnitudeScoreR22(-6,{fullStressPct:6}),0);
  assert.equal(dollarVolatilityScoreR22(0),100);
  assert.equal(dollarVolatilityScoreR22(2),0);
});

test("Dollar R2.2 PIT research path is isolated from production publishing",()=>{
  const model=fs.readFileSync(new URL("../lib/market-score/dollar-fx-r22-shadow.mjs",import.meta.url),"utf8");
  const backtest=fs.readFileSync(new URL("../scripts/pc-writer/backtest-dollar-r22-pit-shadow.mjs",import.meta.url),"utf8");
  assert.match(model,/ASYMMETRIC_SHOCK/);
  assert.match(model,/productionFormulaChanged:false/);
  assert.match(backtest,/DOLLAR_R22_PIT_RESEARCH_ONLY/);
  assert.match(backtest,/lookAheadSafe:true/);
  assert.match(backtest,/HOLDOUT_SIGNALS=120/);
  assert.doesNotMatch(backtest,/publishMarket|remote\.|--publish|INSERT INTO|UPDATE |DELETE FROM/);
});

test("Dollar R2.2 PIT trend does not fabricate scores from insufficient history",()=>{
  const revisions=[];
  for(let i=0;i<100;i++){
    const d=new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10);
    revisions.push({observationDate:d,value:100+i/100,realtimeStart:d,realtimeEnd:"9999-12-31"});
  }
  const out=buildDollarR22PitTrend({revisions,signalVintagePairs:[{signalDate:"2024-04-09",vintageDate:"2024-04-08"}]});
  assert.equal(out.trend.length,0);
  assert.equal(out.diagnostics[0].status,"PARTIAL");
});
