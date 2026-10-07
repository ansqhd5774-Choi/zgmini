import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {buildBreadthR6Components,BREADTH_R6_MIN_COVERAGE} from "../lib/market-score/breadth-r6-shadow.mjs";
import {buildFundFlowsR2Components} from "../lib/market-score/fund-flows-r2-shadow.mjs";

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
  assert.equal(ready.score,null);
  assert.equal(ready.scoreStatus,"PENDING_WEIGHT_APPROVAL");
  assert.equal(ready.coverage.highLow52w,500);
  assert.equal(typeof ready.ratios.aboveMa50,"number");
  assert.equal(typeof ready.ratios.aboveMa200,"number");

  const partialFixture=breadthFixture({sessions:220});
  const partial=buildBreadthR6Components(partialFixture,{});
  assert.equal(partial.status,"PARTIAL");
  assert.equal(partial.readiness.highLow52w,false);
  assert.equal(partial.score,null);
});

test("fund-flow R2 components combine stored SEC context with stored ICI weekly splits without assigning weights",()=>{
  const out=buildFundFlowsR2Components({
    secRows:[
      {observationDate:"2026-02-01",allNetRatio:.1,indexNetRatio:.3,nonIndexNetRatio:-.2,allOutflowRatio:-3.1},
      {observationDate:"2026-03-01",allNetRatio:.16,indexNetRatio:.51,nonIndexNetRatio:-.23,allOutflowRatio:-3.3},
    ],
    iciRows:[
      {observationDate:"2026-09-02",equity:-5461,domesticEquity:-4719,worldEquity:-742,bond:12684,total:8136},
      {observationDate:"2026-09-09",equity:-11701,domesticEquity:-13318,worldEquity:1617,bond:11546,total:1631},
      {observationDate:"2026-09-16",equity:-12650,domesticEquity:-11487,worldEquity:-1163,bond:3244,total:-9450},
      {observationDate:"2026-09-23",equity:12875,domesticEquity:5783,worldEquity:7093,bond:8162,total:20137},
    ],
  });
  assert.equal(out.status,"READY");
  assert.equal(out.score,null);
  assert.equal(out.scoreStatus,"PENDING_WEIGHT_APPROVAL");
  assert.equal(out.latest.equity,12875);
  assert.equal(out.cumulative4w.equity,-16937);
  assert.equal(out.relative.latestEquityMinusBond,4713);
  assert.equal(out.coverage.iciWeeksUsed,4);
});

test("remaining shadow workflow is isolated from production publish paths",()=>{
  const collect=fs.readFileSync(new URL("../scripts/pc-writer/collect-ici-shadow.mjs",import.meta.url),"utf8");
  const analyze=fs.readFileSync(new URL("../scripts/pc-writer/analyze-remaining-market-shadow-r1.mjs",import.meta.url),"utf8");
  assert.match(collect,/shadowIciFundFlows/);
  assert.match(collect,/noPublish:true/);
  assert.doesNotMatch(collect,/publishMarket|remote\.|--publish/);
  assert.match(analyze,/providerCalls:0/);
  assert.match(analyze,/productionFormulaChanged:false/);
  assert.doesNotMatch(analyze,/fetch\(|publishMarket|remote\.|INSERT INTO|UPDATE |DELETE FROM/);
});
