import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {buildBenchmarkQuery,buildTickerCoverageQuery,findActSymbolIndex,lookbackStartDate,queryDoltHubRead,summarizePitTickerCoverage,MAX_PROVIDER_CALLS,DOLTHUB_SQL_URL} from "../scripts/pc-writer/sector-fear-greed-r271-dolthub-diagnostic.mjs";

test("R2.7.1 maps DoltHub v2 array rows using returned columns",async()=>{
  let request=null;
  const fetchImpl=async(url,init)=>{request={url,init};return {ok:true,status:200,json:async()=>({data:{columns:[{name:"act_symbol"},{name:"sessions"}],rows:[["SPY","1008"]],status:"success",warnings:[]}})};};
  const rows=await queryDoltHubRead("SELECT 1",{fetchImpl,clientTimeoutMs:100,serverTimeoutMs:90});
  assert.deepEqual(rows,[{act_symbol:"SPY",sessions:"1008"}]);
  assert.equal(request.url,DOLTHUB_SQL_URL);
  assert.equal(request.init.method,"POST");
  const body=JSON.parse(request.init.body);
  assert.equal(body.ref,"master");
  assert.equal(body.timeout_ms,90);
  assert.equal(body.limit,1000);
});

test("R2.7.1 surfaces SQL status and does not silently accept timeout",async()=>{
  const fetchImpl=async()=>({ok:true,status:200,json:async()=>({data:{columns:[],rows:[],status:"timeout",message:"query timeout"}})});
  await assert.rejects(()=>queryDoltHubRead("SELECT 1",{fetchImpl,clientTimeoutMs:100}),/R271_DOLTHUB_SQL_TIMEOUT_QUERY_TIMEOUT/);
});

test("R2.7.1 bounded lookback and optional act_symbol index stay read-only",()=>{
  assert.equal(MAX_PROVIDER_CALLS,4);
  assert.equal(lookbackStartDate(new Date("2026-10-13T00:00:00Z")),"2022-02-16");
  const index=findActSymbolIndex([{Key_name:"ohlcv_act_symbol_idx",Column_name:"act_symbol"}]);
  assert.equal(index,"ohlcv_act_symbol_idx");
  const benchmark=buildBenchmarkQuery("2022-02-16",index);
  const coverage=buildTickerCoverageQuery(["AAPL","MSFT","BRK.B"],"2022-02-16",index);
  for(const sql of [benchmark,coverage]){
    assert.match(sql,/^SELECT /);
    assert.match(sql,/date >= '2022-02-16'/);
    assert.match(sql,/FORCE INDEX \(ohlcv_act_symbol_idx\)/);
    assert.doesNotMatch(sql,/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|TRUNCATE)\b/i);
  }
});

test("R2.7.1 PIT coverage preserves target readiness counts",()=>{
  const pitHistory={byTicker:{AAA:[{ticker:"AAA",sectorId:"technology",dateAdded:"2020-01-01",dateRemoved:null}],BBB:[{ticker:"BBB",sectorId:"technology",dateAdded:"2020-01-01",dateRemoved:null}],CCC:[{ticker:"CCC",sectorId:"energy",dateAdded:"2020-01-01",dateRemoved:null}]}};
  const rows=[
    {act_symbol:"AAA",sessions:"1100",close_sessions:"1100",volume_sessions:"900",first_date:"2022-02-16",last_date:"2026-10-09"},
    {act_symbol:"BBB",sessions:"900",close_sessions:"900",volume_sessions:"800",first_date:"2022-02-16",last_date:"2026-10-09"},
  ];
  const summary=summarizePitTickerCoverage(pitHistory,rows);
  assert.equal(summary.technology.historicalTickers,2);
  assert.equal(summary.technology.foundTickers,2);
  assert.equal(summary.technology.tickersMeetingBreadth1007,1);
  assert.equal(summary.technology.tickersMeetingDemand775,2);
  assert.equal(summary.energy.foundTickers,0);
});

test("R2.7.1 implementation remains shadow-only",()=>{
  const source=fs.readFileSync(path.join(process.cwd(),"scripts/pc-writer/sector-fear-greed-r271-dolthub-diagnostic.mjs"),"utf8");
  assert.doesNotMatch(source,/wrangler\s+d1|publication-ledger|local-writer|INSERT INTO|UPDATE\s+\w+\s+SET/i);
  assert.match(source,/commercialProductionEligible:false/);
  assert.match(source,/upstreamProvenanceVerified:false/);
});
