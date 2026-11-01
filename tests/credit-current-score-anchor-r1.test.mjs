import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {withVerifiedCurrentCreditPoint} from "../worker/projection-builders/credit-current-score-anchor.mjs";
import {liquidityStoredScoreComparisons} from "../worker/projection-builders/liquidity-stored-history.mjs";
import {requiresCreditR2DisplayRefresh} from "../scripts/pc-writer/credit-r2-refresh.mjs";
const read=path=>readFileSync(path,"utf8");
const builder=read("worker/projection-builders/creditRisk.ts");
test("observed V3 mismatch is resolved by verified current snapshot, not by altering published score",()=>{
 const last={label:"2026-09-25",value:74.73349048328959};
 const history=[{label:"2025-10-24",value:86.71342481811845},{label:"2026-04-10",value:70.4},{label:"2026-07-10",value:76.3},{label:"2026-09-15",value:75.4},last];
 const score=72.76587126101218;
 assert.deepEqual(liquidityStoredScoreComparisons(history,"2026-10-18",score),{week:null,month:null,threeMonth:null,sixMonth:null,year:null});
 const display=withVerifiedCurrentCreditPoint(history,"2026-10-18",score,true);
 assert.deepEqual(display.at(-1),{label:"2026-10-18",value:score});
 assert.deepEqual(display.slice(0,-1),history);
 const comparisons=liquidityStoredScoreComparisons(display,"2026-10-18",score);
 assert.equal(comparisons.week,null); // no suitable stored observation in the October 11 window
 assert.equal(comparisons.month,Math.round((score-75.4)*10)/10);
 assert.equal(comparisons.threeMonth,Math.round((score-76.3)*10)/10);
 assert.equal(comparisons.sixMonth,Math.round((score-70.4)*10)/10);
 assert.equal(comparisons.year,null); // do not extrapolate before first available point
});
test("unverified score must never be injected as synthetic history",()=>{
 const old=[{label:"2026-09-25",value:74.7}];
 assert.deepEqual(withVerifiedCurrentCreditPoint(old,"2026-10-18",72.8,false),old);
 assert.deepEqual(withVerifiedCurrentCreditPoint(old,"bad",72.8,true),[]);
 assert.deepEqual(withVerifiedCurrentCreditPoint(old,"2026-10-18",null,true),old);
 assert.deepEqual(withVerifiedCurrentCreditPoint([...old,{label:"2026-10-18",value:77}],"2026-10-18",72.8,true),[...old,{label:"2026-10-18",value:72.8}]);
 assert.deepEqual(withVerifiedCurrentCreditPoint(old,"2026-10-18",72.8,true),[...old,{label:"2026-10-18",value:72.8}]);
});
test("one normal writer cycle refreshes old display only once, using unchanged sources",()=>{
 const row={id:"x",previousValue:null,previousObservationDate:null,trend:[]};
 const payload={status:"READY",methodologyVersion:"CREDIT_RISK_DIAGNOSTIC_R1",score:72.8,scoreMatch:true,asOfDate:"2026-10-18",trend:[{label:"2026-09-25",value:74.7}],core:Array.from({length:4},()=>row),supplementals:Array.from({length:5},()=>row),scoreComparisons:{week:null,month:null,threeMonth:null,sixMonth:null,year:null}};
 assert.equal(requiresCreditR2DisplayRefresh({payload}),true);
 const updated={...payload,trend:[...payload.trend,{label:"2026-10-18",value:72.8}]};
 assert.equal(requiresCreditR2DisplayRefresh({payload:updated}),false);
 assert.equal(requiresCreditR2DisplayRefresh({payload:{...payload,scoreMatch:false}}),false);
 assert.equal(requiresCreditR2DisplayRefresh({payload:{...payload,status:"PARTIAL"}}),false);
 assert.match(builder,/const scoreMatch=score!==null&&recalculated\?\.status==="READY"/);
 assert.match(builder,/withVerifiedCurrentCreditPoint\(trend,asOf,score,scoreMatch\)/);
 assert.match(builder,/liquidityStoredScoreComparisons\(displayTrend,asOf,score\)/);
 assert.match(builder,/core:display\.slice\(0,4\),supplementals:display\.slice\(4\),trend:displayTrend,scoreComparisons/);
 for(const expression of ["weight:0.35","weight:0.35","weight:0.10","weight:0.20"])assert.ok(builder.includes(expression));
});
