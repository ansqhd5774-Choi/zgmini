import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {buildBenchmarkQuery,buildTickerCoverageQuery,queryDoltHubRead,summarizePitTickerCoverage,MAX_PROVIDER_CALLS,DOLTHUB_SQL_URL} from "../scripts/pc-writer/sector-fear-greed-r27-dolthub-diagnostic.mjs";

test("R2.7 DoltHub queries are bounded read-only screening queries",()=>{
  const benchmark=buildBenchmarkQuery();
  const coverage=buildTickerCoverageQuery(["MSFT","AAPL","BRK.B"]);
  assert.equal(MAX_PROVIDER_CALLS,4);
  assert.match(DOLTHUB_SQL_URL,/\/sql$/);
  assert.match(benchmark,/^SELECT /);
  assert.match(coverage,/^SELECT /);
  for(const sql of [benchmark,coverage]){
    assert.doesNotMatch(sql,/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|TRUNCATE)\b/i);
    assert.match(sql,/FROM ohlcv/);
  }
});

test("R2.7 remote read uses POST JSON and returns rows only",async()=>{
  let calls=0,request=null;
  const fetchImpl=async(url,init)=>{calls++;request={url,init};return {ok:true,status:200,json:async()=>({status:"success",rows:[{act_symbol:"SPY",sessions:"1008"}]})};};
  const rows=await queryDoltHubRead("SELECT 1",{fetchImpl,timeoutMs:100});
  assert.equal(calls,1);
  assert.equal(request.url,DOLTHUB_SQL_URL);
  assert.equal(request.init.method,"POST");
  const body=JSON.parse(request.init.body);
  assert.equal(body.ref,"master");
  assert.equal(body.q,"SELECT 1");
  assert.equal(body.limit,1000);
  assert.deepEqual(rows,[{act_symbol:"SPY",sessions:"1008"}]);
});

test("R2.7 PIT coverage stays screening-only and preserves sector counts",()=>{
  const pitHistory={byTicker:{AAA:[{ticker:"AAA",sectorId:"technology",dateAdded:"2020-01-01",dateRemoved:null}],BBB:[{ticker:"BBB",sectorId:"technology",dateAdded:"2020-01-01",dateRemoved:null}],CCC:[{ticker:"CCC",sectorId:"energy",dateAdded:"2020-01-01",dateRemoved:null}]}};
  const rows=[
    {act_symbol:"AAA",sessions:"1100",close_sessions:"1100",volume_sessions:"900",first_date:"2018-01-01",last_date:"2026-10-09"},
    {act_symbol:"BBB",sessions:"900",close_sessions:"900",volume_sessions:"800",first_date:"2020-01-01",last_date:"2026-10-09"},
  ];
  const summary=summarizePitTickerCoverage(pitHistory,rows);
  assert.equal(summary.technology.historicalTickers,2);
  assert.equal(summary.technology.foundTickers,2);
  assert.equal(summary.technology.tickersMeetingBreadth1007,1);
  assert.equal(summary.technology.tickersMeetingDemand775,2);
  assert.equal(summary.energy.historicalTickers,1);
  assert.equal(summary.energy.foundTickers,0);
  assert.equal(summary.energy.foundRatio,0);
});

test("R2.7 rejects empty and oversized ticker requests",()=>{
  assert.throws(()=>buildTickerCoverageQuery([]),/R27_NO_PIT_TICKERS/);
  assert.throws(()=>buildTickerCoverageQuery(Array.from({length:1001},(_,i)=>`T${i}`)),/R27_PIT_TICKER_LIMIT/);
});

test("R2.7 implementation has no production publication or D1 mutation path",()=>{
  const source=fs.readFileSync(path.join(process.cwd(),"scripts/pc-writer/sector-fear-greed-r27-dolthub-diagnostic.mjs"),"utf8");
  assert.doesNotMatch(source,/wrangler\s+d1|publication-ledger|local-writer|cloudflare|INSERT INTO|UPDATE\s+\w+\s+SET/i);
  assert.match(source,/commercialProductionEligible:false/);
  assert.match(source,/upstreamProvenanceVerified:false/);
});
