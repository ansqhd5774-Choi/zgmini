import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {buildBreadthR7PitTrend,deficientPitTickers,monthEndPitDates,universeForDate} from "../lib/market-score/breadth-r7-pit-shadow.mjs";

test("PIT helper selects the historical universe rather than today's members",()=>{
  const universes=[
    {tradeDate:"2026-09-30",members:["OLD","AAA"]},
    {tradeDate:"2026-10-01",members:["NEW","AAA"]},
  ];
  assert.deepEqual(universeForDate(universes,"2026-09-30").members,["AAA","OLD"]);
  assert.deepEqual(universeForDate(universes,"2026-10-01").members,["AAA","NEW"]);
});

test("month-end PIT dates keep the last actual stored market session in each month",()=>{
  const universes=[
    {tradeDate:"2026-08-30",members:["A"]},{tradeDate:"2026-08-31",members:["A"]},
    {tradeDate:"2026-09-29",members:["A"]},{tradeDate:"2026-09-30",members:["A"]},
  ];
  assert.deepEqual(monthEndPitDates(universes,2),["2026-08-31","2026-09-30"]);
});

test("deficient PIT tickers are driven by historical membership dates",()=>{
  const rows=[];
  for(let i=0;i<252;i++){
    const d=new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10);
    rows.push({tradeDate:d,ticker:"AAA",currentClose:100+i,currentVolume:1});
  }
  const universes=[{tradeDate:"2025-09-09",members:["AAA","OLD"]}];
  const out=deficientPitTickers({rows,universes,dates:["2025-09-09"],minSessions:252});
  assert.deepEqual(out.map(x=>x.ticker),["OLD"]);
});

test("Breadth R7 PIT price/backtest path cannot publish or mutate schema",()=>{
  const backfill=fs.readFileSync(new URL("../scripts/pc-writer/backfill-breadth-r7-pit-prices.mjs",import.meta.url),"utf8");
  const backtest=fs.readFileSync(new URL("../scripts/pc-writer/backtest-breadth-r7-pit.mjs",import.meta.url),"utf8");
  assert.match(backfill,/noPublish:true/);
  assert.match(backfill,/productionFormulaChanged:false/);
  assert.match(backtest,/BREADTH_R7_PIT_BACKTEST_ONLY/);
  assert.match(backtest,/productionPromotionCandidate:false/);
  assert.doesNotMatch(backfill+backtest,/publishMarket|--publish|CREATE TABLE|ALTER TABLE|INSERT INTO|UPDATE |DELETE FROM/);
});
