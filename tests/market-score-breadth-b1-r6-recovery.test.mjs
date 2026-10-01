import test from "node:test";
import assert from "node:assert/strict";
import {
  previousMarketSession,
  marketParquetTickerCandidates,
  buildMarketParquetPairs,
} from "../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs";
import {collectBreadthB1R3ToStore} from "../lib/market-score/breadth-b1-r3-collector.mjs";
import {B1_R3_MARKETPARQUET_SOURCE_CONTRACT} from "../lib/market-score/breadth-b1-r3-contract.mjs";

test("R6 MarketParquet date and ticker resolution is deterministic",()=>{
  assert.equal(previousMarketSession("2026-09-28"),"2026-09-25");
  assert.deepEqual(marketParquetTickerCandidates("BRK.B"),["BRK.B","BRK-B","BRKB"]);
});
test("R6 builds stored price-volume pairs without changing B1 inputs",()=>{
  const out=buildMarketParquetPairs({
    symbols:["AAPL","BRK.B"],
    tradeDate:"2026-09-30",previousDate:"2026-09-29",
    currentRows:[
      {date:new Date("2026-09-30T00:00:00Z"),symbol:"AAPL",asset_type:"Stock",close:333.02,volume:49988558},
      {date:new Date("2026-09-30T00:00:00Z"),symbol:"BRK.B",asset_type:"Stock",close:510,volume:1000},
    ],
    previousRows:[
      {date:new Date("2026-09-29T00:00:00Z"),symbol:"AAPL",asset_type:"Stock",close:331,volume:48000000},
      {date:new Date("2026-09-29T00:00:00Z"),symbol:"BRK.B",asset_type:"Stock",close:508,volume:900},
    ],
  });
  assert.equal(out.coverage,1);
  assert.equal(out.pairs[0].previousClose,331);
  assert.equal(out.pairs[0].currentClose,333.02);
  assert.equal(out.pairs[0].currentVolume,49988558);
  assert.equal(out.pairs[0].source,"MarketParquet Free Sample");
  assert.equal(out.pairs[0].provenance.sourceContractRevision,"ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5");
  assert.equal("attribution" in out.pairs[0],false);
  assert.equal("attribution" in out.pairs[0].provenance,false);
  assert.equal(B1_R3_MARKETPARQUET_SOURCE_CONTRACT,"ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5");
});
test("R7 uses MarketParquet as primary and does not call legacy IEX",async()=>{
  const symbols=Array.from({length:500},(_,i)=>"T"+i);
  let storedPairs=[],run=null,catalogueCalls=0,pairFetcherCalls=0;
  const store={
    initialize:async()=>{},
    acquire:async()=>({acquired:true,key:"breadth-b1-r3-collect",token:"t"}),
    release:async()=>true,
    putUniverse:async()=>{},
    existingTickers:async()=>[],
    upsertPairs:async ({pairs})=>{storedPairs=pairs;return {inserted:pairs.length,updated:0,noop:0,historyRowsAdded:pairs.length}},
    countForDate:async()=>500,
    recordRun:async value=>{run=value},
  };
  const primaryPairs=symbols.map(ticker=>({
    ticker,previousDate:"2026-09-29",currentDate:"2026-09-30",
    previousClose:100,currentClose:101,currentVolume:1000,
    source:"MarketParquet Free Sample",feed:"stock_daily",
    provenance:{provider:"MARKETPARQUET_FREE_SAMPLE",sourceContractRevision:"ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5"},
  }));
  const result=await collectBreadthB1R3ToStore({
    store,asOfDate:"2026-10-01",maxAttemptsPerCall:1,
    universeFetcher:async()=>({symbols,sourceUrl:"sp500"}),
    recoveryFetcher:async()=>({
      tradeDate:"2026-09-30",previousDate:"2026-09-29",
      pairs:primaryPairs,missing:[],coverage:1,
      provider:"MARKETPARQUET_FREE_SAMPLE",providerRequests:2,
    }),
    catalogueFetcher:async()=>{catalogueCalls++;throw new Error("LEGACY_CATALOGUE_MUST_NOT_RUN")},
    pairFetcher:async()=>{pairFetcherCalls++;throw new Error("LEGACY_PAIR_MUST_NOT_RUN")},
  });
  assert.equal(result.status,"SUCCESS");
  assert.equal(result.sourceMode,"MARKETPARQUET_PRIMARY");
  assert.equal(result.primaryFailure,null);
  assert.equal(result.providerRequests,3);
  assert.equal(result.batchRequested,500);
  assert.equal(storedPairs.length,500);
  assert.equal(catalogueCalls,0);
  assert.equal(pairFetcherCalls,0);
  assert.equal(run.status,"SUCCESS");
  assert.equal(run.detail.sourceMode,"MARKETPARQUET_PRIMARY");
});

test("R7 preserves legacy IEX only as fallback when MarketParquet fails",async()=>{
  const symbols=Array.from({length:500},(_,i)=>"T"+i);
  let run=null,catalogueCalls=0;
  const store={
    initialize:async()=>{},
    acquire:async()=>({acquired:true,key:"breadth-b1-r3-collect",token:"t"}),
    release:async()=>true,
    putUniverse:async()=>{},
    existingTickers:async()=>[],
    upsertPairs:async ({pairs})=>({inserted:pairs.length,updated:0,noop:0,historyRowsAdded:pairs.length}),
    countForDate:async()=>40,
    recordRun:async value=>{run=value},
  };
  const catalogue={symbols:Object.fromEntries(symbols.map(x=>[x,{to:Date.parse("2026-09-30T00:00:00Z")}]))};
  const result=await collectBreadthB1R3ToStore({
    store,asOfDate:"2026-10-01",batchSize:40,maxAttemptsPerCall:1,
    universeFetcher:async()=>({symbols,sourceUrl:"sp500"}),
    recoveryFetcher:async()=>{throw new Error("MARKETPARQUET_HTTP_503")},
    catalogueFetcher:async()=>{catalogueCalls++;return catalogue},
    pairFetcher:async({ticker,tradeDate})=>({
      ticker,previousDate:"2026-09-29",currentDate:tradeDate,
      previousClose:100,currentClose:101,currentVolume:1000,source:"IEX HIST",feed:"TOPS1.6",
    }),
  });
  assert.equal(result.status,"PARTIAL_BATCH");
  assert.equal(result.sourceMode,"IEX_HIST_FALLBACK");
  assert.equal(result.primaryFailure,"MARKETPARQUET_HTTP_503");
  assert.equal(catalogueCalls,1);
  assert.equal(result.batchRequested,40);
  assert.equal(run.detail.sourceMode,"IEX_HIST_FALLBACK");
});
