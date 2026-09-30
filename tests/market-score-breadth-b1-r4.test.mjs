import test from "node:test";
import assert from "node:assert/strict";
import {buildBreadthB1R4Series,readBreadthB1R4StoredScore} from "../lib/market-score/breadth-b1-r4-reader.mjs";
import {projectBreadthB1R4PublicDomain,assertBreadthB1R4PublicContract} from "../lib/market-score/breadth-b1-r4-worker-domain.mjs";
import {B1_R4_METHOD} from "../lib/market-score/breadth-b1-r4-contract.mjs";

const near=(actual,expected,eps=1e-9)=>assert.ok(Math.abs(actual-expected)<=eps,`expected ${actual} ~= ${expected}`);

test("R4 applies 50% daily + 30% EMA5 + 20% EMA20",()=>{
  const series=buildBreadthB1R4Series([
    {tradeDate:"2026-09-24",advanceRatio:.5,advanceValueShare:.5},
    {tradeDate:"2026-09-25",advanceRatio:1,advanceValueShare:1},
  ]);
  assert.equal(series.length,2);
  near(series[0].value,50);
  const ema5=50+(2/6)*(100-50);
  const ema20=50+(2/21)*(100-50);
  near(series[1].value,.50*100+.30*ema5+.20*ema20);
});

test("R4 restarts EMA after a missing market-session gap",()=>{
  const series=buildBreadthB1R4Series([
    {tradeDate:"2026-09-23",advanceRatio:0,advanceValueShare:0},
    {tradeDate:"2026-09-25",advanceRatio:1,advanceValueShare:1},
  ]);
  assert.equal(series.length,2);
  near(series[1].dailyScore,100);
  near(series[1].ema5,100);
  near(series[1].ema20,100);
  near(series[1].value,100);
});

test("R4 stored reader uses D1 rows only and preserves actual stored source",async()=>{
  const members=Array.from({length:100},(_,i)=>`T${i}`);
  const pairs=members.map((ticker,i)=>({
    ticker,previous_date:"2026-09-24",trade_date:"2026-09-25",
    previous_close:100,current_close:i<60?101:99,current_volume:1000,
    source:"MarketParquet Free Sample",
  }));
  const store={
    async initialize(){},
    async latestUniverses(){return [{trade_date:"2026-09-25",memberCount:100,members}]},
    async getPairs(){return pairs},
    async getScoreTrend(){return [
      {tradeDate:"2026-09-24",advanceRatio:.55,advanceValueShare:.54},
      {tradeDate:"2026-09-25",advanceRatio:.60,advanceValueShare:.60},
    ]},
  };
  const result=await readBreadthB1R4StoredScore({
    store,asOfDate:"2026-09-25",now:()=>new Date("2026-09-25T21:00:00Z"),
  });
  assert.equal(result.status,"READY");
  assert.equal(result.methodologyVersion,B1_R4_METHOD);
  assert.equal(result.source,"MarketParquet Free Sample");
  assert.deepEqual(result.sourceList,["MarketParquet Free Sample"]);
  assert.equal(result.providerRequests,0);
  assert.equal(result.storageMode,"D1_STORED_ONLY");
  assert.ok(result.score>=0&&result.score<=100);
  assert.ok(result.smoothing&&Number.isFinite(result.smoothing.ema20));
});

test("R4 public projection keeps four stable detail ids and quality metrics",()=>{
  const domain=projectBreadthB1R4PublicDomain({
    status:"READY",score:62,methodologyVersion:B1_R4_METHOD,source:"stored-source",
    observationDate:"2026-09-25",
    components:{advanceRatio:.625,advanceValueShare:.59},
    quality:{returnCoverage:.99,tradingValueCoverage:.98,lagTradingSessions:0},
    runtime:{asOfDate:"2026-09-25",observationDate:"2026-09-25",lagTradingSessions:0},
    trend:[{label:"2026-09-25",value:62}],
    smoothing:{dailyScore:61.1,ema5:60,ema20:58},
  });
  assertBreadthB1R4PublicContract(domain);
  assert.deepEqual(domain.indicators.map(x=>x.id),["breadth-37","breadth-38","breadth-39","breadth-40"]);
  assert.deepEqual(domain.indicators.map(x=>x.score),[62.5,59,99,98]);
  assert.equal(domain.smoothing.ema20,58);
});
