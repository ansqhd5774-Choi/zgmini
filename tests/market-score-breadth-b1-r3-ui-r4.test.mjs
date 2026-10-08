import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {marketDetailRows} from "../lib/market-score/detail-catalog.mjs";
import {readBreadthB1R3StoredScore} from "../lib/market-score/breadth-b1-r3-reader.mjs";
import {projectBreadthB1R3PublicDomain} from "../lib/market-score/breadth-b1-r3-worker-domain.mjs";

test("B1-R3 UI maps the four active indicators by stable id",()=>{
  const indicators=[
    {id:"breadth-37",name:"상승종목비율",status:"READY",score:39.96,value:39.96,unit:"%",asOfDate:"2026-09-23"},
    {id:"breadth-38",name:"상승거래대금비율",status:"READY",score:40.66,value:40.66,unit:"%",asOfDate:"2026-09-23"},
    {id:"breadth-39",name:"수익률커버리지",status:"READY",score:100,value:100,unit:"%",asOfDate:"2026-09-23"},
    {id:"breadth-40",name:"거래대금커버리지",status:"READY",score:100,value:100,unit:"%",asOfDate:"2026-09-23"},
  ];
  const rows=marketDetailRows("breadth",indicators);
  assert.deepEqual(rows.map(x=>x.label),["상승종목비율","상승거래대금비율","수익률커버리지","거래대금커버리지"]);
  assert.deepEqual(rows.map(x=>x.score),[39.96,40.66,100,100]);
  assert.deepEqual(rows.map(x=>x.value),[39.96,40.66,100,100]);
  assert.deepEqual(rows.map(x=>x.asOfDate),["2026-09-23","2026-09-23","2026-09-23","2026-09-23"]);
});

test("legacy R2 detail mapping remains preserved when R2 indicator names are supplied",()=>{
  const indicators=[
    {id:"breadth-37",name:"Foreign Portfolio Equity Flow",status:"READY",score:59.59,value:-1200},
    {id:"breadth-38",name:"Share Supply Breadth",status:"READY",score:33.11,value:-33.78},
    {id:"breadth-39",name:"Institutional Futures Positioning",status:"READY",score:59.88,value:19.04},
    {id:"breadth-40",name:"Leveraged Futures Positioning",status:"READY",score:48.19,value:-9.48},
  ];
  const rows=marketDetailRows("breadth",indicators);
  assert.equal(rows[0].label,"해외 포트폴리오 주식수급");
  assert.equal(rows[0].score,59.59);
});

test("stored reader derives B1-R3 trend with zero provider requests",async()=>{
  const members=Array.from({length:503},(_,i)=>`T${i}`);
  const pairs=members.map((ticker,i)=>({
    ticker,
    previous_date:"2026-09-22",
    trade_date:"2026-09-23",
    previous_close:100,
    current_close:i<201?101:99,
    current_volume:1000,
  }));
  const store={
    async initialize(){},
    async latestUniverses(){return [{trade_date:"2026-09-23",memberCount:503,members}]},
    async getPairs(){return pairs},
    async getScoreTrend(){return [
      {tradeDate:"2026-09-22",advanceRatio:.45,advanceValueShare:.46},
      {tradeDate:"2026-09-23",advanceRatio:.3996,advanceValueShare:.4066},
    ]},
  };
  const result=await readBreadthB1R3StoredScore({
    store,
    asOfDate:"2026-09-23",
    now:()=>new Date("2026-09-23T21:00:00Z"),
  });
  assert.equal(result.providerRequests,0);
  assert.deepEqual(result.trend.map(x=>x.label),["2026-09-22","2026-09-23"]);
  assert.ok(result.trend.every(x=>Number.isFinite(x.value)));
});

test("public B1-R3 projection forwards the stored trend",()=>{
  const domain=projectBreadthB1R3PublicDomain({
    status:"READY",
    score:40.24,
    observationDate:"2026-09-23",
    methodologyVersion:"B1-R3-IEX-HIST-R1",
    components:{advanceRatio:.3996,advanceValueShare:.4066},
    quality:{returnCoverage:1,tradingValueCoverage:1,lagTradingSessions:0},
    runtime:{asOfDate:"2026-09-27",observationDate:"2026-09-23",lagTradingSessions:0},
    trend:[{label:"2026-09-23",value:40.24}],
  });
  assert.deepEqual(domain.trend,[{label:"2026-09-23",value:40.24}]);
});

test("dashboard source is wired for active B1-R5 and can render a single real observation",()=>{
  const source=fs.readFileSync(new URL("../app/dashboard-ui.tsx",import.meta.url),"utf8");
  assert.match(source,/오른 종목 비율 30% \+ 상승 거래비중 20% \+ 5일 수급 추세 30% \+ 20일 수급 추세 20%/);
  assert.doesNotMatch(source,/BEA 해외 포트폴리오 주식수급, SEC 주식공급 폭/);
  assert.match(source,/trend\.length>0/);
  assert.match(source,/ReferenceDot/);
});
