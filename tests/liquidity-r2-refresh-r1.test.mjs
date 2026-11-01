import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {requiresLiquidityR2DisplayRefresh} from "../scripts/pc-writer/liquidity-r2-refresh.mjs";
const runner=readFileSync("scripts/pc-writer/run-local.mjs","utf8");
const complete={projection:{},payload:{status:"READY",methodologyVersion:"LIQUIDITY_CRISIS_DIAGNOSTIC_R1",indicators:Array.from({length:13},(_,i)=>({id:String(i),previousValue:null,previousObservationDate:null,trend:[]})),scoreComparisons:{week:null,month:null,threeMonth:null,sixMonth:null,year:null}}};
test("liquidity R2 refresh triggers on old stored projection only",()=>{
 assert.equal(requiresLiquidityR2DisplayRefresh({payload:{...complete.payload,scoreComparisons:undefined}}),true);
 assert.equal(requiresLiquidityR2DisplayRefresh(complete),false);
 assert.equal(requiresLiquidityR2DisplayRefresh({payload:{...complete.payload,indicators:complete.payload.indicators.slice(0,12)}}),true);
 assert.equal(requiresLiquidityR2DisplayRefresh({payload:{...complete.payload,indicators:[...complete.payload.indicators.slice(0,12),{id:"nohistory"}]}}),true);
 assert.equal(requiresLiquidityR2DisplayRefresh({payload:{...complete.payload,status:"PARTIAL"}}),false);
 assert.equal(requiresLiquidityR2DisplayRefresh({payload:{...complete.payload,methodologyVersion:"OTHER"}}),false);
});
test("refresh only reuses the established saved-data writer branch",()=>{
 assert.match(runner,/id==='liquidityCrisis'&&requiresLiquidityR2DisplayRefresh\(envelope\)/);
 assert.match(runner,/sourceVersion!==checkpoint\.sourceVersion/);
 assert.match(runner,/sourceStoredAt!==checkpoint\.sourceStoredAt/);
 assert.match(runner,/await loadProjectionSource\(id,scope,\{now:checkpoint\.sourceStoredAt\}\)/);
 assert.doesNotMatch(runner,/\bfetch\s*\('https:\/\//);
});
