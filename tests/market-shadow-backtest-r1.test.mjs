import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {parseSp500FredPayload} from "../scripts/pc-writer/collect-sp500-shadow.mjs";
import {evaluateSeries,evaluationSummaryPair} from "../scripts/pc-writer/backtest-market-shadow-r1.mjs";
import {buildBreadthR6Trend} from "../lib/market-score/breadth-r6-shadow.mjs";

function dailyBenchmark(count=140,start=100){
  return Array.from({length:count},(_,i)=>({
    observationDate:new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),
    value:start+i,
  }));
}

test("S&P 500 shadow collector parses positive daily benchmark history",()=>{
  const observations=dailyBenchmark(260).map(row=>({date:row.observationDate,value:String(row.value)}));
  const rows=parseSp500FredPayload({observations},{asOf:observations.at(-1).date});
  assert.equal(rows.length,260);
  assert.equal(rows[0].value,100);
  assert.equal(rows.at(-1).value,359);
});

test("backtest computes 1m and 3m forward returns and drawdown from signal score",()=>{
  const benchmark=dailyBenchmark(140);
  const out=evaluateSeries([{label:"2026-01-10",value:80}],benchmark);
  assert.equal(out.observations,1);
  assert.equal(out.eligible1m,1);
  assert.equal(out.eligible3m,1);
  assert.ok(out.rows[0].return1m>0);
  assert.ok(out.rows[0].return3m>out.rows[0].return1m);
  assert.equal(out.rows[0].band,"strong");
});

test("backtest evaluates full candidate history while matched comparison remains overlap-only",()=>{
  const benchmark=dailyBenchmark(220);
  const baseline=[{label:"2026-01-10",value:45}];
  const candidate=[
    {label:"2026-01-10",value:50},
    {label:"2026-02-10",value:60},
    {label:"2026-03-10",value:70},
  ];
  const out=evaluationSummaryPair(baseline,candidate,benchmark);
  assert.equal(out.baseline.observations,1);
  assert.equal(out.shadow.observations,3);
  assert.equal(out.comparison.matchedSignals,1);
  assert.match(out.comparison.note,/full available shadow history/);
});

test("breadth R6 historical trend can derive daily direction from prior close-only rows",()=>{
  const members=Array.from({length:500},(_,i)=>"T"+i);
  const rows=[];
  for(let d=0;d<260;d++){
    const tradeDate=new Date(Date.UTC(2025,0,1+d)).toISOString().slice(0,10);
    for(let i=0;i<500;i++)rows.push({
      trade_date:tradeDate,ticker:members[i],previous_close:null,
      current_close:100+d*.1+(i%2?1:-1),current_volume:1000+i,
    });
  }
  const dates=[rows.at(-1).trade_date];
  const trend=buildBreadthR6Trend({rows,members,dates});
  assert.equal(trend.length,1);
  assert.ok(trend[0].value>=0&&trend[0].value<=100);
});

test("backtest workflow remains analysis-only and benchmark collection is local-only",()=>{
  const collect=fs.readFileSync(new URL("../scripts/pc-writer/collect-sp500-shadow.mjs",import.meta.url),"utf8");
  const backtest=fs.readFileSync(new URL("../scripts/pc-writer/backtest-market-shadow-r1.mjs",import.meta.url),"utf8");
  assert.match(collect,/shadowSp500Benchmark/);
  assert.match(collect,/noPublish:true/);
  assert.match(backtest,/BACKTEST_ANALYSIS_ONLY/);
  assert.match(backtest,/providerCalls:0/);
  assert.match(backtest,/DEFERRED_HISTORICAL_SOURCE_ACCESS/);
  assert.doesNotMatch(collect,/publishMarket|remote\.|--publish/);
  assert.doesNotMatch(backtest,/publishMarket|remote\.|--publish|INSERT INTO|UPDATE |DELETE FROM/);
});
