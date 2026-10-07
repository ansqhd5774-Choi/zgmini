import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {buildFundFlowR3IndexShadow,empiricalPercentileR3,FUND_FLOW_R3_INDEX_WEIGHT} from "../lib/market-score/fund-flow-r3-index-shadow.mjs";
import {buildReleaseIndexR3Signals,buildRawIndexR3Signals} from "../scripts/pc-writer/backtest-fund-flow-r3-index-shadow.mjs";

test("R3 Index-Flow is a true 100% single-factor shadow",()=>{
  assert.equal(FUND_FLOW_R3_INDEX_WEIGHT,1);
  const out=buildFundFlowR3IndexShadow(Array.from({length:12},(_,i)=>({observationDate:`2025-${String(i+1).padStart(2,"0")}-01`,value:i})),{minValid:12});
  assert.equal(out.status,"READY");
  assert.equal(out.weight.indexFlow,1);
  assert.equal(out.trend.length,1);
  assert.equal(out.score,empiricalPercentileR3(Array.from({length:12},(_,i)=>i),11));
});

test("higher index flow receives a higher empirical-percentile score",()=>{
  const values=[-2,-1,0,1,2];
  assert.ok(empiricalPercentileR3(values,2)>empiricalPercentileR3(values,0));
  assert.ok(empiricalPercentileR3(values,0)>empiricalPercentileR3(values,-2));
});

test("release PIT signals are dated by public availability rather than period end",()=>{
  const rows=Array.from({length:12},(_,i)=>{
    const d=new Date(Date.UTC(2023,i,1)).toISOString().slice(0,10);
    const x=i/10;
    return {observationDate:d,value:x,allNetRatio:x,indexNetRatio:x+.2,nonIndexNetRatio:x-.1,allOutflowRatio:-2-x};
  });
  const out=buildReleaseIndexR3Signals([{periodEnd:"2023-12-31",availableAt:"2024-05-17",rows}]);
  assert.equal(out.candidate[0].label,"2024-05-17");
  assert.equal(out.raw[0].label,"2024-05-17");
});

test("raw R2 extension is transformed to an expanding PIT percentile without pretending Table 3.2 equivalence",()=>{
  const signals={};
  for(let i=0;i<20;i++){
    const d=new Date(Date.UTC(2020,i,1)).toISOString().slice(0,10);
    signals[d]={observationDate:d,availableAt:d,indexNetFlow3mToCurrentAssetsPct:i/10,officialTable32Comparable:false};
  }
  const out=buildRawIndexR3Signals({signals});
  assert.equal(out.sourceRows,20);
  assert.equal(out.candidate.length,9);
  assert.equal(out.raw.length,20);
});

test("R3 research backtest cannot publish or mutate production",()=>{
  const model=fs.readFileSync(new URL("../lib/market-score/fund-flow-r3-index-shadow.mjs",import.meta.url),"utf8");
  const backtest=fs.readFileSync(new URL("../scripts/pc-writer/backtest-fund-flow-r3-index-shadow.mjs",import.meta.url),"utf8");
  assert.match(model,/productionFormulaChanged:false/);
  assert.match(backtest,/FUND_FLOW_R3_INDEX_ONLY_SHADOW_BACKTEST/);
  assert.match(backtest,/productionPromotionCandidate:false/);
  assert.match(backtest,/PRODUCTION_CHANGE_NOT_APPROVED/);
  assert.doesNotMatch(backtest,/publishMarket|remote\.|--publish|INSERT INTO|UPDATE |DELETE FROM/);
});
