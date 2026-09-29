import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {
  B1_R3_ACTIVE_SOURCE_CONTRACT_R5,
  breadthB1R3SemanticSnapshotR5,
} from "../lib/market-score/breadth-b1-r3-semantic-r5.mjs";
import {
  B1_R3_HISTORY_INGEST_R2,
  ingestBreadthB1R3HistoricalPayloadR2,
} from "../lib/market-score/breadth-b1-r3-history-ingest-r2.mjs";
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

function rowsFor({currentBump=0,rowCount=503}={}){
  return members.slice(0,rowCount).map((ticker,i)=>({
    ticker,
    previousClose:100,
    currentClose:(i%3===0?101:99)+(i===0?currentBump:0),
    currentVolume:1000+i,
    currentResolvedSymbol:ticker,
    previousResolvedSymbol:ticker,
    currentResolution:"exact",
    previousResolution:"exact",
  }));
}

async function payload(opts={}){
  const tradeDate=opts.tradeDate??"2026-09-22";
  const previousDate=opts.previousDate??"2026-09-21";
  const rows=rowsFor(opts);
  const semantic=await breadthB1R3SemanticSnapshotR5({tradeDate,previousDate,members,rows});
  return{
    payloadRevision:"B1-R3-HISTORY-PAYLOAD-R1",
    sourceContractRevision:B1_R3_HISTORY_SOURCE_CONTRACT,
    pitSourceContractRevision:"B1_HISTORY_SOURCE_CONTRACT_R2",
    semanticContractRevision:B1_R3_ACTIVE_SOURCE_CONTRACT_R5,
    semanticSha256:semantic.semanticSha256,
    tradeDate,previousDate,
    universe:{members,provenance:{wholeFileSha256:"diagnostic-only"}},
    rows,
    providerAudit:{wholeFileSha256:"not-hashed"},
  };
}

test("R5 semantic hash ignores whole-file diagnostic metadata",async()=>{
  const a=await payload();
  const b=structuredClone(a);
  b.providerAudit={wholeFileSha256:"changed"};
  b.universe.provenance.wholeFileSha256="changed";
  const sa=await breadthB1R3SemanticSnapshotR5({tradeDate:a.tradeDate,previousDate:a.previousDate,members:a.universe.members,rows:a.rows});
  const sb=await breadthB1R3SemanticSnapshotR5({tradeDate:b.tradeDate,previousDate:b.previousDate,members:b.universe.members,rows:b.rows});
  assert.equal(sa.semanticSha256,sb.semanticSha256);
});

test("R5 semantic hash changes when a B1 input changes",async()=>{
  const a=await payload();
  const changedRows=rowsFor({currentBump:0.125});
  const b=await breadthB1R3SemanticSnapshotR5({tradeDate:a.tradeDate,previousDate:a.previousDate,members,rows:changedRows});
  assert.notEqual(a.semanticSha256,b.semanticSha256);
});

test("R2 stores normalized rows plus one semantic snapshot",async()=>{
  const{sqlite,db}=sqliteD1();
  const p=await payload();
  const r=await ingestBreadthB1R3HistoricalPayloadR2({db,payload:p,now:()=>new Date("2026-09-29T00:00:00Z")});
  assert.equal(r.status,"READY");
  assert.equal(r.ingestVersion,B1_R3_HISTORY_INGEST_R2);
  assert.equal(r.semanticStored,true);
  assert.equal(r.semanticInserted,true);
  assert.equal(r.semanticSha256,p.semanticSha256);
  const s=sqlite.prepare("SELECT * FROM market_score_breadth_b1_r3_semantic_v1 WHERE trade_date=?").get(p.tradeDate);
  assert.equal(s.semantic_sha256,p.semanticSha256);
  assert.equal(Number(s.member_count),503);
  assert.equal(Number(s.pair_count),503);
  assert.equal(Number(sqlite.prepare("SELECT COUNT(*) n FROM market_score_breadth_b1_r3_current_v1").get().n),503);
  sqlite.close();
});

test("R2 identical replay is semantic noop and HISTORY stays deduplicated",async()=>{
  const{sqlite,db}=sqliteD1();
  const p=await payload();
  const a=await ingestBreadthB1R3HistoricalPayloadR2({db,payload:p});
  const hist1=Number(sqlite.prepare("SELECT COUNT(*) n FROM market_score_breadth_b1_r3_history_v1").get().n);
  const b=await ingestBreadthB1R3HistoricalPayloadR2({db,payload:p});
  const hist2=Number(sqlite.prepare("SELECT COUNT(*) n FROM market_score_breadth_b1_r3_history_v1").get().n);
  const sem=Number(sqlite.prepare("SELECT COUNT(*) n FROM market_score_breadth_b1_r3_semantic_v1").get().n);
  assert.equal(a.semanticInserted,true);
  assert.equal(b.semanticInserted,false);
  assert.equal(b.semanticNoop,true);
  assert.equal(b.inserted,0);
  assert.equal(b.updated,0);
  assert.equal(hist2,hist1);
  assert.equal(sem,1);
  sqlite.close();
});

test("R2 supplied hash mismatch fails before any D1 row write",async()=>{
  const{sqlite,db}=sqliteD1();
  const p=await payload();
  p.semanticSha256="0".repeat(64);
  await assert.rejects(()=>ingestBreadthB1R3HistoricalPayloadR2({db,payload:p}),/SEMANTIC_SHA256_MISMATCH/);
  const tables=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(x=>x.name);
  assert.equal(tables.includes("market_score_breadth_b1_r3_current_v1"),false);
  assert.equal(tables.includes("market_score_breadth_b1_r3_semantic_v1"),false);
  sqlite.close();
});

test("R2 existing semantic conflict fails before normalized-row mutation",async()=>{
  const{sqlite,db}=sqliteD1();
  const p=await payload();
  await ingestBreadthB1R3HistoricalPayloadR2({db,payload:p});
  const before=Number(sqlite.prepare("SELECT current_close FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=? AND ticker=?").get(p.tradeDate,"T000").current_close);

  const changed=await payload({currentBump:0.125});
  await assert.rejects(()=>ingestBreadthB1R3HistoricalPayloadR2({db,payload:changed}),/EXISTING_SEMANTIC_SNAPSHOT_CONFLICT/);

  const after=Number(sqlite.prepare("SELECT current_close FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=? AND ticker=?").get(p.tradeDate,"T000").current_close);
  assert.equal(after,before);
  sqlite.close();
});

test("R2 coverage below 98 percent remains PARTIAL/null and semantic identity is stored",async()=>{
  const{sqlite,db}=sqliteD1();
  const p=await payload({tradeDate:"2026-03-26",previousDate:"2026-03-25",rowCount:492});
  const r=await ingestBreadthB1R3HistoricalPayloadR2({db,payload:p});
  assert.equal(r.status,"PARTIAL");
  assert.equal(r.score,null);
  assert.equal(r.semanticStored,true);
  assert.equal(r.scoreProviderRequests,0);
  sqlite.close();
});

test("Production route is wired to R2/R5 and remains provider-free",()=>{
  const src=readFileSync(new URL("../app/api/internal/b1-r3-history-import/route.ts",import.meta.url),"utf8");
  assert.match(src,/breadth-b1-r3-history-ingest-r2\.mjs/);
  assert.match(src,/B1_R3_HISTORY_INGEST_R2/);
  assert.match(src,/ingestBreadthB1R3HistoricalPayloadR2/);
  assert.match(src,/SEMANTIC_/);
  assert.doesNotMatch(src,/marketparquet\.com|raw\.githubusercontent|fetchBarsCatalogue|fetchTickerPair/);
});
