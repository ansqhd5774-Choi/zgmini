import test from "node:test";
import assert from "node:assert/strict";
import {R21332_WINDOW,R21332_SPEC_WEIGHT,R21332_SMOOTH_ALPHA,R21332_AXIS_WEIGHTS,mergeR21332PriceSeries,takeR21332AlignedDates} from "../scripts/pc-writer/sector-fear-greed-r21332-full-252-historical-validation.mjs";

test("R2.13.32 preserves the approved diagnostic constants",()=>{
  assert.equal(R21332_WINDOW,252);
  assert.equal(R21332_SPEC_WEIGHT,.15);
  assert.equal(R21332_SMOOTH_ALPHA,.5);
  assert.deepEqual(R21332_AXIS_WEIGHTS,{trend:.20,breadth:.20,demand:.15,relativeStrength:.15,volatility:.15});
  const totalWeight=Object.values(R21332_AXIS_WEIGHTS).reduce((a,b)=>a+b,0);
  assert.ok(Math.abs(totalWeight-.85)<Number.EPSILON);
});

test("R2.13.32 merges the ETF extension without overwriting existing benchmark dates",()=>{
  const rows=mergeR21332PriceSeries([{date:"2024-08-15",close:10,volume:1}],[{date:"2024-08-14",close:9,volume:1}]);
  assert.deepEqual(rows.map(r=>r.date),["2024-08-14","2024-08-15"]);
  assert.throws(()=>mergeR21332PriceSeries([{date:"2024-08-15",close:10,volume:1}],[{date:"2024-08-15",close:11,volume:1}]),/R21321_BENCHMARK_CONFLICT/);
});

test("R2.13.32 takes exactly the latest 252 common dates",()=>{
  const a=[],b=[];for(let i=0;i<300;i++){const d=`2026-${String(Math.floor(i/28)+1).padStart(2,"0")}-${String(i%28+1).padStart(2,"0")}`;a.push({date:d,score:i});b.push({date:d,score:i});}
  const dates=takeR21332AlignedDates(a,b,252);
  assert.equal(dates.length,252);
  assert.equal(dates.at(-1),a.at(-1).date);
});
