import test from "node:test";
import assert from "node:assert/strict";
import {collectBreadthB1R3ToStore} from "../lib/market-score/breadth-b1-r3-collector.mjs";
const symbols=Array.from({length:500},(_,i)=>"T"+i);
const primaryPairs=symbols.map(ticker=>({
  ticker,previousDate:"2026-10-14",currentDate:"2026-10-15",
  previousClose:100,currentClose:101,currentVolume:1000,
  source:"MarketParquet Free Sample",feed:"stock_daily",
  provenance:{provider:"MARKETPARQUET_FREE_SAMPLE"}
}));
async function run({trend,trendFailure=false,hasTrend=true,count=500,completedAt="2026-10-16T12:00:00Z"}={}){
  let runRecord=null,trendCalls=0;
  const store={
    initialize:async()=>{},
    acquire:async()=>({acquired:true,key:"breadth-b1-r3-collect",token:"mock"}),
    release:async()=>true,
    putUniverse:async()=>{},
    existingTickers:async()=>[],
    upsertPairs:async()=>({inserted:500,updated:0,noop:0,historyRowsAdded:500}),
    countForDate:async()=>count,
    recordRun:async record=>{runRecord=record;},
    ...(hasTrend?{getScoreTrend:async()=>{trendCalls++;if(trendFailure)throw Error("DEMO_DB_ERROR");return trend??[];}}:{})
  };
  const result=await collectBreadthB1R3ToStore({
    store,asOfDate:"2026-10-16",maxAttemptsPerCall:1,
    now:()=>new Date(completedAt),
    universeFetcher:async()=>({symbols,sourceUrl:"sp500"}),
    recoveryFetcher:async()=>({tradeDate:"2026-10-15",previousDate:"2026-10-14",pairs:primaryPairs,missing:[],coverage:1,provider:"MARKETPARQUET_FREE_SAMPLE"}),
    catalogueFetcher:async()=>{throw Error("FALLBACK_FORBIDDEN")},
  });
  return {result,runRecord,trendCalls};
}
test("successful collection retains status and writes missing gap into run detail only",async()=>{
  const x=await run({trend:[{tradeDate:"2026-10-13"},{tradeDate:"2026-10-15"},{tradeDate:"2026-10-16"}]});
  assert.equal(x.result.status,"SUCCESS");
  assert.equal(x.result.scoreComputed,false);
  assert.equal(x.result.providerRequests,3);
  assert.equal(x.trendCalls,1);
  assert.equal(x.runRecord.status,"SUCCESS");
  assert.equal(x.runRecord.detail.freshnessAudit.status,"LATEST_COMPLETED_SESSION");
  assert.equal(x.runRecord.detail.freshnessAudit.storedTradeDate,"2026-10-15");
  assert.equal(x.runRecord.detail.freshnessAudit.evaluatedAt,"2026-10-16T12:00:00.000Z");
  assert.deepEqual(x.runRecord.detail.gapAudit.missingDates,["2026-10-14"]);
  assert.equal(x.runRecord.detail.gapAudit.missingCount,1);
});
test("database read failure cannot turn success into collector failure",async()=>{
  const x=await run({trendFailure:true});
  assert.equal(x.result.status,"SUCCESS");
  assert.equal(x.runRecord.status,"SUCCESS");
  assert.deepEqual(x.runRecord.detail.gapAudit,{status:"AUDIT_UNAVAILABLE"});
});
test("old injected stores without getScoreTrend remain compatible",async()=>{
  const x=await run({hasTrend:false});
  assert.equal(x.result.status,"SUCCESS");
  assert.equal(x.trendCalls,0);
  assert.deepEqual(x.runRecord.detail.gapAudit,{status:"AUDIT_UNAVAILABLE"});
});
test("partial batch does not perform costly gap query and retains backlog",async()=>{
  const x=await run({count:489});
  assert.equal(x.result.status,"PARTIAL_BATCH");
  assert.equal(x.trendCalls,0);
  assert.deepEqual(x.runRecord.detail.gapAudit,{status:"DEFERRED_INCOMPLETE_COVERAGE"});
});

test("R88 delayed provider date is reported while collector remains SUCCESS",async()=>{
  const x=await run({completedAt:"2026-10-17T00:10:06.485Z"});
  assert.equal(x.result.status,"SUCCESS");
  assert.equal(x.runRecord.status,"SUCCESS");
  assert.deepEqual(x.runRecord.detail.freshnessAudit,{
    selectedSession:"2026-10-15",storedTradeDate:"2026-10-15",
    expectedSession:"2026-10-16",evaluatedAt:"2026-10-17T00:10:06.485Z",
    status:"SOURCE_SESSION_BEHIND",lagCompletedSessions:1,
  });
  assert.equal(x.result.providerRequests,3);
});
