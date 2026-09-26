import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

import { collectBreadthR2ToStore } from "../lib/market-score/breadth-r2-collector-r2.mjs";
import { readBreadthR2StoredScore } from "../lib/market-score/breadth-r2-stored-score-r2.mjs";
import { createBreadthR2R2Service } from "../lib/market-score/breadth-r2-service-r2.mjs";

const codes=["13874A","209742","124603","33874A"];
function sqliteD1(){
  const sqlite=new DatabaseSync(":memory:");
  const db={
    prepare(sql){const prepared=sqlite.prepare(sql);function wrapper(values=[]){return{
      bind(...next){return wrapper(next)},async run(){return prepared.run(...values)},async first(){return prepared.get(...values)},async all(){return{results:prepared.all(...values)}}
    }}return wrapper([])},
    async batch(statements){sqlite.exec("BEGIN");try{const r=[];for(const s of statements)r.push(await s.run());sqlite.exec("COMMIT");return r}catch(e){sqlite.exec("ROLLBACK");throw e}},
  };return{sqlite,db};
}
function beaRows(){return Array.from({length:21},(_,i)=>({TimePeriod:`${2000+Math.floor(i/4)}Q${(i%4)+1}`,DataValue:String((i+1)*100),CL_UNIT:"USD",UNIT_MULT:"6"}))}
function secFrame(frame,mult=1){return{source:"SEC_XBRL_FRAME",taxonomy:"us-gaap",tag:"WeightedAverageNumberOfSharesOutstandingBasic",unit:"shares",frame,data:Array.from({length:2000},(_,i)=>({cik:i+1,val:(i%2?110:90)*mult,entityName:`C${i}`,start:"2026-01-01",end:frame.endsWith("Q1")?"2026-03-31":"2026-06-30",filed:"2026-08-01",accn:`A${i}`}))}}
function cftcRows(){return codes.map(code=>({report_date_as_yyyy_mm_dd:"2026-09-15T00:00:00.000",cftc_contract_market_code:code,open_interest_all:"100",asset_mgr_positions_long:"60",asset_mgr_positions_short:"40",lev_money_positions_long:"30",lev_money_positions_short:"50"}))}
function goodProvider(counter={}){return{
  async fetchBeaForeignPortfolio(){counter.bea=(counter.bea??0)+1;return{source:"BEA_ITA",rows:beaRows()}},
  async fetchSecShareFrame({quarter}){counter.sec=(counter.sec??0)+1;return secFrame(quarter===1?"CY2026Q1":"CY2026Q2")},
  async fetchCftcTff(){counter.cftc=(counter.cftc??0)+1;return{source:"CFTC_TFF_FUTURES_ONLY",datasetId:"gpe5-46if",rows:cftcRows()}},
}}

test("collector is store-only and identical repeat is normalized noop/history-dedup",async()=>{
  const{sqlite,db}=sqliteD1();const counter={};const provider=goodProvider(counter);
  const first=await collectBreadthR2ToStore({db,asOfDate:"2026-09-23",beaUserId:"SECRET",provider,retryDelayMs:0,now:()=>new Date("2026-09-23T00:00:00Z")});
  assert.equal(first.status,"SUCCESS");assert.equal(first.scoreComputed,false);assert.equal(first.providerRequests,4);assert.equal(counter.bea,1);assert.equal(counter.sec,2);assert.equal(counter.cftc,1);
  const history1=sqlite.prepare("SELECT COUNT(*) n FROM market_score_breadth_r2_history_v1").get().n;
  const second=await collectBreadthR2ToStore({db,asOfDate:"2026-09-23",beaUserId:"SECRET",provider,retryDelayMs:0,now:()=>new Date("2026-09-23T01:00:00Z")});
  const history2=sqlite.prepare("SELECT COUNT(*) n FROM market_score_breadth_r2_history_v1").get().n;
  assert.equal(second.inserted,0);assert.equal(second.updated,0);assert.ok(second.noop>0);assert.equal(history2,history1);
  sqlite.close();
});

test("partial provider omission never deletes previously valid current rows",async()=>{
  const{sqlite,db}=sqliteD1();
  await collectBreadthR2ToStore({db,asOfDate:"2026-09-23",beaUserId:"SECRET",provider:goodProvider(),retryDelayMs:0,now:()=>new Date("2026-09-23T00:00:00Z")});
  const before=sqlite.prepare("SELECT COUNT(*) n FROM market_score_breadth_r2_current_v1 WHERE provider='CFTC'").get().n;
  const partial=goodProvider();partial.fetchCftcTff=async()=>{throw new Error("HTTP_503")};
  const out=await collectBreadthR2ToStore({db,asOfDate:"2026-09-24",beaUserId:"SECRET",provider:partial,retryDelayMs:0,maxAttemptsPerCall:1,now:()=>new Date("2026-09-24T00:00:00Z")});
  assert.equal(out.status,"PARTIAL");
  const after=sqlite.prepare("SELECT COUNT(*) n FROM market_score_breadth_r2_current_v1 WHERE provider='CFTC'").get().n;
  assert.equal(after,before);
  sqlite.close();
});

test("stored-only reader reproduces authoritative R2 scores with zero provider requests",async()=>{
  const liveDb=sqliteD1();const provider=goodProvider();
  const live=createBreadthR2R2Service({env:{DB:liveDb.db},db:liveDb.db,provider,runtimeOptions:{retryDelayMs:0,now:()=>new Date("2026-09-23T00:00:00Z")}});
  const expected=await live.run({asOfDate:"2026-09-23",beaUserId:"SECRET",includeBenchmark:false});

  const storedDb=sqliteD1();const counter={};
  await collectBreadthR2ToStore({db:storedDb.db,asOfDate:"2026-09-23",beaUserId:"SECRET",provider:goodProvider(counter),retryDelayMs:0,now:()=>new Date("2026-09-23T00:00:00Z")});
  const before={...counter};
  const actual=await readBreadthR2StoredScore({db:storedDb.db,asOfDate:"2026-09-23",includeBenchmark:false,now:()=>new Date("2026-09-23T00:00:01Z")});
  assert.equal(actual.runtime.providerRequests,0);assert.equal(actual.runtime.storageMode,"D1_STORED_ONLY");assert.deepEqual(counter,before);
  assert.equal(actual.methodologyVersion,expected.methodologyVersion);
  assert.equal(actual.status,expected.status);assert.equal(actual.score,expected.score);
  assert.deepEqual(actual.candidate.indicators.map(x=>x.score),expected.candidate.indicators.map(x=>x.score));
  liveDb.sqlite.close();storedDb.sqlite.close();
});
