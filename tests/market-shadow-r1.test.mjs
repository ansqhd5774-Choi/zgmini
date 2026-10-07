import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {buildInflationR3Shadow,INFLATION_R3_SHADOW_WEIGHTS} from "../lib/market-score/inflation-r3-shadow.mjs";
import {buildDollarFxR2Shadow,DOLLAR_FX_R2_SHADOW_WEIGHTS} from "../lib/market-score/dollar-fx-r2-shadow.mjs";
import {buildCommoditiesR3Shadow,COMMODITIES_R3_SHADOW_WEIGHTS} from "../lib/market-score/commodities-r3-shadow.mjs";

const sum=obj=>Object.values(obj).reduce((a,b)=>a+b,0);
const dayRows=(count,start=100)=>Array.from({length:count},(_,i)=>({
  observationDate:new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10),
  value:start+i*0.03+Math.sin(i/11),
}));
const monthRows=(count,start=100,slope=.4)=>Array.from({length:count},(_,i)=>({
  observationDate:new Date(Date.UTC(2020,i,1)).toISOString().slice(0,10),
  value:start+i*slope+Math.sin(i/4),
}));

test("inflation R3 shadow uses the approved 40/30/15/15 structure only",()=>{
  assert.equal(sum(INFLATION_R3_SHADOW_WEIGHTS),1);
  const out=buildInflationR3Shadow({axes:{
    TARGET_STABILITY:40,
    UNDERLYING_MOMENTUM:50,
    EXPECTATIONS:60,
    LABOR_COST_PERSISTENCE:70,
  },asOfDate:"2026-10-07"});
  assert.equal(out.status,"READY");
  assert.equal(out.score,50.5);
  assert.equal(out.mode,"SHADOW_ONLY");
  assert.equal(out.productionFormulaChanged,false);
});

test("dollar R2 shadow becomes READY from stored-length daily history and keeps approved weights",()=>{
  assert.equal(sum(DOLLAR_FX_R2_SHADOW_WEIGHTS),1);
  const rows=dayRows(420);
  const out=buildDollarFxR2Shadow(rows,{asOfDate:rows.at(-1).observationDate,minValid:252});
  assert.equal(out.status,"READY");
  assert.ok(out.score>=0&&out.score<=100);
  assert.equal(out.mode,"SHADOW_ONLY");
  assert.ok(out.trend.length>0);
});

test("commodities R3 shadow separates oil/gas burden from direct copper growth signal",()=>{
  assert.equal(sum(COMMODITIES_R3_SHADOW_WEIGHTS),1);
  const wti=monthRows(84,55,.30);
  const brent=monthRows(84,60,.32);
  const gas=monthRows(84,2.5,.01);
  const copper=monthRows(84,7000,25);
  const asOfDate=copper.at(-1).observationDate;
  const out=buildCommoditiesR3Shadow({wtiRows:wti,brentRows:brent,gasolineRows:gas,copperRows:copper,asOfDate});
  assert.equal(out.status,"READY");
  assert.ok(out.score>=0&&out.score<=100);
  assert.ok(out.components.copperGrowth>=0&&out.components.copperGrowth<=100);
  assert.equal(out.mode,"SHADOW_ONLY");
});

test("shadow analysis script cannot publish or mutate production formulas",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/analyze-market-shadow-r1.mjs",import.meta.url),"utf8");
  assert.match(src,/SHADOW_ONLY/);
  assert.match(src,/providerCalls:0/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.doesNotMatch(src,/publishMarket|remote\.|--publish|INSERT INTO|UPDATE |DELETE FROM/);
});
