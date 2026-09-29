import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {createBreadthB1R3Store} from "../lib/market-score/breadth-b1-r3-store.mjs";
import {
  B1_R3_HISTORY_PAYLOAD_R1,
  B1_R3_HISTORY_PIT_REVISION,
  ingestBreadthB1R3HistoricalPayloadR1,
  validateBreadthB1R3HistoryPayloadR1,
} from "../lib/market-score/breadth-b1-r3-history-ingest-r1.mjs";
import {B1_R3_HISTORY_SOURCE_CONTRACT} from "../lib/market-score/breadth-b1-r3-history-r4.mjs";

function sqliteD1(){
  const sqlite=new DatabaseSync(":memory:");
  const db={
    prepare(sql){
      const p=sqlite.prepare(sql);
      function wrap(vals=[]){
        return{
          bind(...next){return wrap(next)},
          async run(){return p.run(...vals)},
          async first(){return p.get(...vals)},
          async all(){return{results:p.all(...vals)}},
        };
      }
      return wrap([]);
    },
    async batch(xs){
      sqlite.exec("BEGIN");
      try{const out=[];for(const x of xs)out.push(await x.run());sqlite.exec("COMMIT");return out}
      catch(e){sqlite.exec("ROLLBACK");throw e}
    }
  };
  return{sqlite,db};
}

const members=Array.from({length:503},(_,i)=>`T${String(i).padStart(3,"0")}`);

function payload({tradeDate="2026-09-22",previousDate="2026-09-21",rowCount=503}={}){
  return{
    payloadRevision:B1_R3_HISTORY_PAYLOAD_R1,
    sourceContractRevision:B1_R3_HISTORY_SOURCE_CONTRACT,
    pitSourceContractRevision:B1_R3_HISTORY_PIT_REVISION,
    tradeDate,previousDate,
    universe:{members,provenance:{repo:"fja05680/sp500",commit:"a2430f2af0c79ddf0748e91de11bdeb1616ab5a7"}},
    rows:members.slice(0,rowCount).map((ticker,i)=>({
      ticker,previousClose:100,currentClose:i%3===0?101:99,currentVolume:1000+i,
      currentResolvedSymbol:ticker,previousResolvedSymbol:ticker,currentResolution:"exact",previousResolution:"exact",
    })),
  };
}

test("Production ingest stores exact PIT + Daily EOD and score path stays provider-zero",async()=>{
  const{sqlite,db}=sqliteD1();
  const store=createBreadthB1R3Store(db);
  const result=await ingestBreadthB1R3HistoricalPayloadR1({store,payload:payload(),now:()=>new Date("2026-09-29T00:00:00Z")});
  assert.equal(result.status,"READY");
  assert.equal(result.currentRows,503);
  assert.equal(result.coverage,1);
  assert.equal(result.providerRequests,0);
  assert.equal(result.scoreProviderRequests,0);
  assert.ok(Number.isFinite(result.score));
  const u=await store.getUniverse("2026-09-22");
  assert.equal(u.memberCount,503);
  sqlite.close();
});

test("idempotent repeat does not append duplicate historical rows",async()=>{
  const{sqlite,db}=sqliteD1();
  const store=createBreadthB1R3Store(db);
  const p=payload();
  const a=await ingestBreadthB1R3HistoricalPayloadR1({store,payload:p});
  const before=await store.countRows();
  const b=await ingestBreadthB1R3HistoricalPayloadR1({store,payload:p});
  const after=await store.countRows();
  assert.equal(a.inserted,503);
  assert.equal(b.inserted,0);
  assert.equal(b.noopExisting,503);
  assert.equal(after.history,before.history);
  assert.equal(after.current,before.current);
  sqlite.close();
});

test("conflicting existing pair fails before mutation",async()=>{
  const{sqlite,db}=sqliteD1();
  const store=createBreadthB1R3Store(db);
  const p=payload();
  await ingestBreadthB1R3HistoricalPayloadR1({store,payload:p});
  const before=await store.getPairs("2026-09-22");
  const bad=payload();bad.rows[0].currentClose=777;
  await assert.rejects(()=>ingestBreadthB1R3HistoricalPayloadR1({store,payload:bad}),/EXISTING_PAIR_CONFLICT/);
  const after=await store.getPairs("2026-09-22");
  assert.equal(after[0].current_close,before[0].current_close);
  sqlite.close();
});

test("coverage below 98% is stored but fails closed to PARTIAL/null score",async()=>{
  const{sqlite,db}=sqliteD1();
  const result=await ingestBreadthB1R3HistoricalPayloadR1({db,payload:payload({tradeDate:"2026-03-26",previousDate:"2026-03-25",rowCount:492})});
  assert.equal(result.status,"PARTIAL");
  assert.equal(result.currentRows,492);
  assert.ok(result.coverage<0.98);
  assert.equal(result.score,null);
  assert.equal(result.scoreProviderRequests,0);
  sqlite.close();
});

test("current Production anchor and future dates are protected",()=>{
  assert.throws(()=>validateBreadthB1R3HistoryPayloadR1(payload({tradeDate:"2026-09-23",previousDate:"2026-09-22"})),/OUTSIDE_APPROVED_BACKFILL|PROTECTED/);
  assert.throws(()=>validateBreadthB1R3HistoryPayloadR1(payload({tradeDate:"2026-09-24",previousDate:"2026-09-23"})),/OUTSIDE_APPROVED_BACKFILL|PROTECTED/);
});

test("duplicate and non-universe payload rows fail before store access",()=>{
  const dup=payload();dup.rows[1]={...dup.rows[0]};
  assert.throws(()=>validateBreadthB1R3HistoryPayloadR1(dup),/ROW_DUPLICATE_TICKER/);
  const foreign=payload();foreign.rows[0]={...foreign.rows[0],ticker:"NOT_IN_UNIVERSE"};
  assert.throws(()=>validateBreadthB1R3HistoryPayloadR1(foreign),/ROW_TICKER_NOT_IN_UNIVERSE/);
});

test("live collector lock wins and historical ingest pauses without write",async()=>{
  const{sqlite,db}=sqliteD1();
  const store=createBreadthB1R3Store(db);
  await store.initialize();
  const held=await store.acquire("breadth-b1-r3-collect",{ttlMs:60000});
  assert.equal(held.acquired,true);
  const result=await ingestBreadthB1R3HistoricalPayloadR1({store,payload:payload()});
  assert.equal(result.status,"PAUSED_LIVE_PRIORITY");
  assert.equal(result.writeApplied,false);
  assert.equal((await store.countRows()).current,0);
  await store.release(held);
  sqlite.close();
});

test("internal route is authenticated store-only and has no provider/network acquisition path",()=>{
  const src=readFileSync(new URL("../app/api/internal/b1-r3-history-import/route.ts",import.meta.url),"utf8");
  assert.match(src,/B1_R3_HISTORY_IMPORT_SECRET/);
  assert.match(src,/authorization/);
  assert.match(src,/ingestBreadthB1R3HistoricalPayloadR2/);
  assert.match(src,/METHOD_NOT_ALLOWED/);
  assert.doesNotMatch(src,/marketparquet\.com|raw\.githubusercontent|fetchSp500|fetchBarsCatalogue|fetchTickerPair/);
});
