import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {buildBreadthR6Components,BREADTH_R6_MIN_COVERAGE,BREADTH_R6_WEIGHTS} from "../lib/market-score/breadth-r6-shadow.mjs";
import {buildFundFlowsR2Components,FUND_FLOWS_R2_WEIGHTS,flowPreferenceScoreR2,confidenceAdjustedFlowScoreR2} from "../lib/market-score/fund-flows-r2-shadow.mjs";
import {marketSessionsBack,isMarketParquetTerminalAccessError} from "../scripts/pc-writer/backfill-breadth-r6-shadow.mjs";

function breadthFixture({tickers=500,sessions=252}={}){
  const members=Array.from({length:tickers},(_,i)=>"T"+String(i).padStart(3,"0"));
  const rows=[];
  for(let d=0;d<sessions;d++){
    const tradeDate=new Date(Date.UTC(2025,0,1+d)).toISOString().slice(0,10);
    for(let i=0;i<tickers;i++){
      const previousClose=100+i/10+d*.02;
      const currentClose=previousClose+(i%3===0?-0.1:0.2);
      rows.push({trade_date:tradeDate,ticker:members[i],previous_close:previousClose,current_close:currentClose,current_volume:1000+i});
    }
  }
  return {members,rows};
}

test("breadth R6 component engine requires full 50/200/252-session coverage before READY",()=>{
  const ready=buildBreadthR6Components(breadthFixture(),{});
  assert.equal(BREADTH_R6_MIN_COVERAGE,.98);
  assert.equal(ready.status,"READY");
  assert.equal(Object.values(BREADTH_R6_WEIGHTS).reduce((a,b)=>a+b,0),1);
  assert.ok(typeof ready.score==="number"&&ready.score>=0&&ready.score<=100);
  assert.equal(ready.scoreStatus,"READY_SHADOW");
  assert.equal(ready.coverage.highLow52w,500);
  assert.equal(typeof ready.ratios.aboveMa50,"number");
  assert.equal(typeof ready.ratios.aboveMa200,"number");

  const partialFixture=breadthFixture({sessions:220});
  const partial=buildBreadthR6Components(partialFixture,{});
  assert.equal(partial.status,"PARTIAL");
  assert.equal(partial.readiness.highLow52w,false);
  assert.equal(partial.score,null);
});

test("fund-flow R2 applies approved 50/35/15 weights with 12-week confidence ramp",()=>{
  const out=buildFundFlowsR2Components({
    secRows:[
      {observationDate:"2026-02-01",allNetRatio:.1,indexNetRatio:.3,nonIndexNetRatio:-.2,allOutflowRatio:-3.1},
      {observationDate:"2026-03-01",allNetRatio:.16,indexNetRatio:.51,nonIndexNetRatio:-.23,allOutflowRatio:-3.3},
    ],
    secBaselineScore:38,
    iciRows:[
      {observationDate:"2026-09-02",equity:-5461,domesticEquity:-4719,worldEquity:-742,bond:12684,total:8136},
      {observationDate:"2026-09-09",equity:-11701,domesticEquity:-13318,worldEquity:1617,bond:11546,total:1631},
      {observationDate:"2026-09-16",equity:-12650,domesticEquity:-11487,worldEquity:-1163,bond:3244,total:-9450},
      {observationDate:"2026-09-23",equity:12875,domesticEquity:5783,worldEquity:7093,bond:8162,total:20137},
    ],
  });
  assert.equal(out.status,"READY");
  assert.equal(Object.values(FUND_FLOWS_R2_WEIGHTS).reduce((a,b)=>a+b,0),1);
  assert.ok(typeof out.score==="number"&&out.score>=0&&out.score<=100);
  assert.equal(out.scoreStatus,"READY_SHADOW");
  assert.equal(out.confidence.ratio,4/12);
  assert.equal(flowPreferenceScoreR2(-16937,35636),0);
  assert.equal(confidenceAdjustedFlowScoreR2(0,4),50+(4/12)*(0-50));
  assert.equal(out.latest.equity,12875);
  assert.equal(out.cumulative4w.equity,-16937);
  assert.equal(out.relative.latestEquityMinusBond,4713);
  assert.equal(out.coverage.iciWeeksUsed,4);
});


test("breadth R6 backfill treats dated MarketParquet 403 as a terminal source limitation and falls back",()=>{
  assert.equal(isMarketParquetTerminalAccessError(new Error("MARKETPARQUET_HTTP_403")),true);
  assert.equal(isMarketParquetTerminalAccessError(new Error("MARKETPARQUET_HTTP_404")),true);
  assert.equal(isMarketParquetTerminalAccessError(new Error("MARKETPARQUET_HTTP_500")),false);
  const src=fs.readFileSync(new URL("../scripts/pc-writer/backfill-breadth-r6-shadow.mjs",import.meta.url),"utf8");
  assert.match(src,/UNAVAILABLE_FALLBACK_IEX/);
  assert.match(src,/if\(!isMarketParquetTerminalAccessError\(error\)\)throw error/);
});

test("breadth R6 shadow backfill plans a bounded 260-session window and remains local-only",()=>{
  const dates=marketSessionsBack("2026-10-02",260);
  assert.equal(dates.length,260);
  assert.equal(dates.at(-1),"2026-10-02");
  assert.ok(dates[0]<dates.at(-1));
  const src=fs.readFileSync(new URL("../scripts/pc-writer/backfill-breadth-r6-shadow.mjs",import.meta.url),"utf8");
  assert.match(src,/TARGET_SESSIONS=260/);
  assert.match(src,/REQUIRED_PRICE_SESSIONS=252/);
  assert.match(src,/noPublish:true/);
  assert.match(src,/dbSchemaChanged:false/);
  assert.doesNotMatch(src,/publishMarket|remote\.|--publish|CREATE TABLE|ALTER TABLE/);
});

test("remaining shadow workflow is isolated from production publish paths",()=>{
  const collect=fs.readFileSync(new URL("../scripts/pc-writer/collect-ici-shadow.mjs",import.meta.url),"utf8");
  const analyze=fs.readFileSync(new URL("../scripts/pc-writer/analyze-remaining-market-shadow-r1.mjs",import.meta.url),"utf8");
  assert.match(collect,/shadowIciFundFlows/);
  assert.match(collect,/noPublish:true/);
  assert.match(collect,/accumulatedRows/);
  assert.match(collect,/slice\(-104\)/);
  assert.doesNotMatch(collect,/publishMarket|remote\.|--publish/);
  assert.match(analyze,/providerCalls:0/);
  assert.match(analyze,/productionFormulaChanged:false/);
  assert.doesNotMatch(analyze,/fetch\(|publishMarket|remote\.|INSERT INTO|UPDATE |DELETE FROM/);
});
