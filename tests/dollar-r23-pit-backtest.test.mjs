import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {DOLLAR_FX_R23_WEIGHTS,empiricalPercentileScore,buildDollarFxR23Shadow} from "../lib/market-score/dollar-fx-r23-shadow.mjs";
import {selectExternalValidationDates} from "../scripts/pc-writer/collect-dollar-r23-external-pit.mjs";

test("Dollar R2.3 uses the approved 35/40/25 magnitude-only weights",()=>{
  assert.deepEqual(DOLLAR_FX_R23_WEIGHTS,{absShortMomentum:.35,absAcceleration20:.40,volatility20:.25});
  assert.equal(Object.values(DOLLAR_FX_R23_WEIGHTS).reduce((a,b)=>a+b,0),1);
});

test("Dollar R2.3 empirical percentile gives larger shocks higher scores",()=>{
  const history=[1,2,3,4,5];
  assert.ok(empiricalPercentileScore(history,5)>empiricalPercentileScore(history,3));
  assert.ok(empiricalPercentileScore(history,3)>empiricalPercentileScore(history,1));
});

test("external validation dates are strictly before the design sample",()=>{
  const rows=Array.from({length:700},(_,i)=>({observationDate:new Date(Date.UTC(2022,0,1+i)).toISOString().slice(0,10),value:100+i}));
  const designStart="2024-01-01";
  const selected=selectExternalValidationDates(rows,designStart,{count:500});
  assert.equal(selected.length,500);
  assert.ok(selected.every(date=>date<designStart));
});

test("R2.3 shadow model remains research-only and publishing is absent",()=>{
  const model=fs.readFileSync(new URL("../lib/market-score/dollar-fx-r23-shadow.mjs",import.meta.url),"utf8");
  const collect=fs.readFileSync(new URL("../scripts/pc-writer/collect-dollar-r23-external-pit.mjs",import.meta.url),"utf8");
  const backtest=fs.readFileSync(new URL("../scripts/pc-writer/backtest-dollar-r23-pit-shadow.mjs",import.meta.url),"utf8");
  assert.match(model,/productionFormulaChanged:false/);
  assert.match(collect,/independentOfDesignSample:true/);
  assert.match(backtest,/externalValidationIndependent:true/);
  assert.match(backtest,/DOLLAR_R23_PIT_RESEARCH_ONLY/);
  assert.doesNotMatch(collect,/publishMarket|remote\.|--publish/);
  assert.doesNotMatch(backtest,/publishMarket|remote\.|--publish|INSERT INTO|UPDATE |DELETE FROM/);
});

test("R2.3 does not produce a score from insufficient history",()=>{
  const rows=Array.from({length:100},(_,i)=>({observationDate:new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10),value:100+i/100}));
  const out=buildDollarFxR23Shadow(rows,{asOfDate:"2024-04-09"});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
});
