import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {DOLLAR_FX_R24_WEIGHTS,buildDollarFxR24Shadow} from "../lib/market-score/dollar-fx-r24-shadow.mjs";
import {selectFinalHoldoutDates} from "../scripts/pc-writer/collect-dollar-r24-final-pit.mjs";

test("Dollar R2.4 uses the approved equal two-factor weights",()=>{
  assert.deepEqual(DOLLAR_FX_R24_WEIGHTS,{absShortMomentum:.50,absAcceleration20:.50});
  assert.equal(Object.values(DOLLAR_FX_R24_WEIGHTS).reduce((a,b)=>a+b,0),1);
});

test("final holdout contains exactly 500 benchmark dates strictly before the external sample",()=>{
  const rows=Array.from({length:900},(_,i)=>({observationDate:new Date(Date.UTC(2019,0,1+i)).toISOString().slice(0,10),value:100+i}));
  const externalStart="2021-06-01";
  const selected=selectFinalHoldoutDates(rows,externalStart,{count:500});
  assert.equal(selected.length,500);
  assert.ok(selected.every(date=>date<externalStart));
  assert.ok(selected.at(-1)<externalStart);
});

test("R2.4 paths remain shadow-only and identify the final sample as unused holdout",()=>{
  const model=fs.readFileSync(new URL("../lib/market-score/dollar-fx-r24-shadow.mjs",import.meta.url),"utf8");
  const collect=fs.readFileSync(new URL("../scripts/pc-writer/collect-dollar-r24-final-pit.mjs",import.meta.url),"utf8");
  const backtest=fs.readFileSync(new URL("../scripts/pc-writer/backtest-dollar-r24-pit-shadow.mjs",import.meta.url),"utf8");
  assert.match(model,/productionFormulaChanged:false/);
  assert.match(collect,/independentOfDesignSample:true/);
  assert.match(collect,/independentOfExternalSample:true/);
  assert.match(collect,/finalHoldout:true/);
  assert.match(backtest,/UNUSED_FINAL_HOLDOUT/);
  assert.match(backtest,/promotionCandidate:finalGate.pass/);
  assert.doesNotMatch(collect,/publishMarket|remote\.|--publish/);
  assert.doesNotMatch(backtest,/publishMarket|remote\.|--publish|INSERT INTO|UPDATE |DELETE FROM/);
});

test("R2.4 does not produce a score from insufficient history",()=>{
  const rows=Array.from({length:100},(_,i)=>({observationDate:new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10),value:100+i/100}));
  const out=buildDollarFxR24Shadow(rows,{asOfDate:"2024-04-09"});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
});
