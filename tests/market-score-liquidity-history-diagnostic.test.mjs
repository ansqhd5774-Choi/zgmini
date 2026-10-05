import test from "node:test";
import assert from "node:assert/strict";
import {diagnoseLiquidityHistoryCoverage} from "../lib/market-score/liquidity-history-diagnostic-r1.mjs";

const node=(first,count,stepDays=1)=>({rows:Array.from({length:count},(_,i)=>({
  observationDate:new Date(Date.parse(first+"T00:00:00Z")+i*stepDays*86400000).toISOString().slice(0,10),
  score:50+i%7,
}))});

test("liquidity history diagnostic identifies the latest-starting component as the bottleneck",()=>{
  const r1={components:{
    fundingStress:node("2025-01-01",700),
    bankReserves:node("2024-01-01",150,7),
    tga:node("2024-01-01",150,7),
    onRrp:node("2024-01-01",700),
    m2:node("2020-01-01",90,30),
    bondVolatility:node("2024-01-01",700),
  }};
  const out=diagnoseLiquidityHistoryCoverage(r1,{asOfDate:"2026-10-06"});
  assert.equal(out.historyStart,"2025-01-01");
  assert.deepEqual(out.bottlenecks,["fundingStress"]);
  assert.equal(out.status,"READY_1Y");
});

test("liquidity history diagnostic fails one-year coverage when a component starts too late",()=>{
  const r1={components:{
    fundingStress:node("2026-09-01",40),
    bankReserves:node("2024-01-01",150,7),
    tga:node("2024-01-01",150,7),
    onRrp:node("2024-01-01",700),
    m2:node("2020-01-01",90,30),
    bondVolatility:node("2024-01-01",700),
  }};
  const out=diagnoseLiquidityHistoryCoverage(r1,{asOfDate:"2026-10-06"});
  assert.equal(out.status,"INSUFFICIENT_1Y");
  assert.deepEqual(out.bottlenecks,["fundingStress"]);
});
