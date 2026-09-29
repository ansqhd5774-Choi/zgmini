import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {createBreadthB1R3Store} from "../lib/market-score/breadth-b1-r3-store.mjs";

function countedD1(){
  const sqlite=new DatabaseSync(":memory:");
  const stats={calls:0,batches:0};
  function prepare(sql){
    const stmt=sqlite.prepare(sql);
    function wrap(vals=[]){
      return{
        bind(...next){return wrap(next)},
        async run(){stats.calls++;return stmt.run(...vals)},
        async first(){stats.calls++;return stmt.get(...vals)??null},
        async all(){stats.calls++;return{results:stmt.all(...vals)}},
        _rawRun(){return stmt.run(...vals)},
      };
    }
    return wrap([]);
  }
  const db={
    prepare,
    async batch(items){
      stats.calls++;stats.batches++;
      sqlite.exec("BEGIN");
      try{
        const out=[];for(const item of items)out.push(item._rawRun());
        sqlite.exec("COMMIT");return out;
      }catch(e){sqlite.exec("ROLLBACK");throw e}
    }
  };
  return{sqlite,db,stats};
}

function makePairs(count=500){
  return Array.from({length:count},(_,i)=>{
    const ticker=`T${String(i).padStart(3,"0")}`;
    return{
      ticker,
      previousDate:"2025-10-22",
      currentDate:"2025-10-23",
      previousClose:100+(i%7),
      currentClose:101+(i%7),
      currentVolume:1000+i,
      source:"MarketParquet Free Sample",
      feed:"stock_daily",
      provenance:{
        provider:"MARKETPARQUET_FREE_SAMPLE",
        currentResolvedSymbol:ticker,
        previousResolvedSymbol:ticker,
        currentResolution:"exact",
        previousResolution:"exact",
      },
    };
  });
}

test("500-pair upsert uses O(1) existing-row lookup calls and preserves idempotence",async()=>{
  const{sqlite,db,stats}=countedD1();
  const store=createBreadthB1R3Store(db);
  await store.initialize();

  stats.calls=0;stats.batches=0;
  const first=await store.upsertPairs({
    asOfDate:"2025-10-23",tradeDate:"2025-10-23",
    pairs:makePairs(),retrievedAt:"2026-09-29T05:00:00.000Z",
  });

  assert.equal(first.inserted,500);
  assert.equal(first.updated,0);
  assert.equal(first.noop,0);
  assert.equal(first.currentRows,500);
  assert.equal(first.historyRowsAdded,500);
  assert.ok(stats.calls<=20,`D1 network-style calls too high: ${stats.calls}`);
  assert.ok(stats.batches<=13,`D1 batches too high: ${stats.batches}`);
  assert.equal(Number(sqlite.prepare("SELECT COUNT(*) n FROM market_score_breadth_b1_r3_current_v1").get().n),500);
  assert.equal(Number(sqlite.prepare("SELECT COUNT(*) n FROM market_score_breadth_b1_r3_history_v1").get().n),500);

  stats.calls=0;stats.batches=0;
  const replay=await store.upsertPairs({
    asOfDate:"2025-10-23",tradeDate:"2025-10-23",
    pairs:makePairs(),retrievedAt:"2026-09-29T05:10:00.000Z",
  });

  assert.equal(replay.inserted,0);
  assert.equal(replay.updated,0);
  assert.equal(replay.noop,500);
  assert.equal(replay.currentRows,500);
  assert.equal(replay.historyRowsAdded,0);
  assert.ok(stats.calls<=10,`Replay D1 network-style calls too high: ${stats.calls}`);
  assert.equal(Number(sqlite.prepare("SELECT COUNT(*) n FROM market_score_breadth_b1_r3_history_v1").get().n),500);
  sqlite.close();
});
