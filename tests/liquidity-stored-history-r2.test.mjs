import test from "node:test";
import assert from "node:assert/strict";
import {enrichLiquidityDisplayRows,liquidityStoredScoreComparisons} from "../worker/projection-builders/liquidity-stored-history.mjs";
test("previous value and last-month samples are real source observations",()=>{
 const point=[{id:"m2",observationDate:"2026-10-01",value:1,score:64}];
 const sources=[[
  {observationDate:"2025-09-01",value:0.4},
  {observationDate:"2025-10-01",value:0.5},
  {observationDate:"2026-09-01",value:0.8},
  {observationDate:"2026-10-01",value:1},
  {observationDate:"2026-11-01",value:99},
 ],r=>r.value];
 const result=enrichLiquidityDisplayRows(point,[sources],"2026-10-18")[0];
 assert.equal(result.previousValue,0.8);
 assert.equal(result.previousObservationDate,"2026-09-01");
 assert.deepEqual(result.trend,[{date:"2025-10-01",value:0.5},{date:"2026-09-01",value:0.8},{date:"2026-10-01",value:1}]);
 assert.equal(result.value,1);
 assert.equal(result.score,64);
});
test("unavailable input remains null, with no synthetic line or zeros",()=>{
 const result=enrichLiquidityDisplayRows([{id:"x",observationDate:null,value:null,score:null}],[],"2026-10-18")[0];
 assert.equal(result.previousValue,null);
 assert.deepEqual(result.trend,[]);
});
test("score comparisons only use matching stored public score, never local recalculation",()=>{
 const data=[
  {label:"2025-10-15",value:48},
  {label:"2026-04-18",value:54},
  {label:"2026-07-17",value:58},
  {label:"2026-09-17",value:62},
  {label:"2026-10-10",value:64},
  {label:"2026-10-17",value:65},
 ];
 const a=liquidityStoredScoreComparisons(data,"2026-10-18",65);
 assert.equal(a.week,1);
 assert.equal(a.month,3);
 assert.equal(a.threeMonth,7);
 assert.equal(a.sixMonth,11);
 assert.equal(a.year,17);
 assert.deepEqual(liquidityStoredScoreComparisons(data,"2026-10-18",66),{week:null,month:null,threeMonth:null,sixMonth:null,year:null});
});
