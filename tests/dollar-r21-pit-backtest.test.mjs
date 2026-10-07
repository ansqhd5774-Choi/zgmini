import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {dollarPitFredUrl,parseDollarPitFredPage,pointInTimeDollarRows} from "../scripts/pc-writer/collect-dollar-r21-pit-shadow.mjs";
import {buildDollarPitTrend} from "../scripts/pc-writer/backtest-dollar-r21-pit-shadow.mjs";

test("ALFRED dollar PIT request uses explicit vintage dates and real-time-period output",()=>{
  const url=dollarPitFredUrl({
    key:"a".repeat(32),
    signalDates:["2025-02-01","2025-03-01"],
    observationStart:"2022-02-01",
    observationEnd:"2025-03-01",
    offset:0,
  });
  assert.equal(url.searchParams.get("series_id"),"DTWEXBGS");
  assert.equal(url.searchParams.get("output_type"),"1");
  assert.equal(url.searchParams.get("vintage_dates"),"2025-02-01,2025-03-01");
  assert.equal(url.searchParams.get("units"),"lin");
});

test("PIT reconstruction selects only the revision known on the requested vintage date",()=>{
  const payload={
    output_type:1,offset:0,count:3,
    observations:[
      {date:"2025-01-01",value:"100",realtime_start:"2025-01-02",realtime_end:"2025-02-14"},
      {date:"2025-01-01",value:"101",realtime_start:"2025-02-15",realtime_end:"9999-12-31"},
      {date:"2025-01-02",value:"102",realtime_start:"2025-01-03",realtime_end:"9999-12-31"},
    ],
  };
  const parsed=parseDollarPitFredPage(payload,{expectedOffset:0,observationStart:"2025-01-01",observationEnd:"2025-12-31"});
  const before=pointInTimeDollarRows(parsed.rows,"2025-02-01");
  const after=pointInTimeDollarRows(parsed.rows,"2025-03-01");
  assert.equal(before.find(row=>row.observationDate==="2025-01-01")?.value,100);
  assert.equal(after.find(row=>row.observationDate==="2025-01-01")?.value,101);
});

test("dollar PIT backtest remains shadow-only and cannot publish",()=>{
  const collect=fs.readFileSync(new URL("../scripts/pc-writer/collect-dollar-r21-pit-shadow.mjs",import.meta.url),"utf8");
  const backtest=fs.readFileSync(new URL("../scripts/pc-writer/backtest-dollar-r21-pit-shadow.mjs",import.meta.url),"utf8");
  assert.match(collect,/ALFRED_VINTAGE_DATES_OUTPUT_TYPE_1/);
  assert.match(collect,/storedForShadowOnly:true/);
  assert.match(backtest,/DOLLAR_R21_PIT_BACKTEST_ONLY/);
  assert.match(backtest,/lookAheadSafe:true/);
  assert.match(backtest,/productionFormulaChanged:false/);
  assert.doesNotMatch(collect,/publishMarket|remote\.|--publish/);
  assert.doesNotMatch(backtest,/publishMarket|remote\.|--publish|INSERT INTO|UPDATE |DELETE FROM/);
});

test("PIT trend builder does not fabricate scores when history is insufficient",()=>{
  const revisions=[];
  for(let i=0;i<100;i++){
    const d=new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10);
    revisions.push({observationDate:d,value:100+i/100,realtimeStart:d,realtimeEnd:"9999-12-31"});
  }
  const out=buildDollarPitTrend({revisions,signalDates:["2024-04-09"]});
  assert.equal(out.trend.length,0);
  assert.equal(out.diagnostics[0].status,"PARTIAL");
});
