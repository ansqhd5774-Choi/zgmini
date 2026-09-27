import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {parseSp500Csv,selectTradeDateFromCatalogue,fetchTickerPair} from "../lib/market-score/breadth-b1-r3-provider.mjs";
import {createBreadthB1R3Store} from "../lib/market-score/breadth-b1-r3-store.mjs";
import {collectBreadthB1R3ToStore} from "../lib/market-score/breadth-b1-r3-collector.mjs";
import {readBreadthB1R3StoredScore} from "../lib/market-score/breadth-b1-r3-reader.mjs";
import {buildBreadthB1R1} from "../lib/market-score/breadth-b1-r1.mjs";
import {countCompletedSessionsSince,latestCompletedSession,isMarketSession} from "../lib/market-score/breadth-b1-r3-calendar.mjs";
import {IEX_ATTRIBUTION,B1_R3_METHOD} from "../lib/market-score/breadth-b1-r3-contract.mjs";

function sqliteD1(){
  const sqlite=new DatabaseSync(":memory:");
  const db={
    prepare(sql){const p=sqlite.prepare(sql);function wrap(vals=[]){return{bind(...next){return wrap(next)},async run(){return p.run(...vals)},async first(){return p.get(...vals)},async all(){return{results:p.all(...vals)}}}}return wrap([])},
    async batch(xs){sqlite.exec("BEGIN");try{const out=[];for(const x of xs)out.push(await x.run());sqlite.exec("COMMIT");return out}catch(e){sqlite.exec("ROLLBACK");throw e}},
  };
  return{sqlite,db};
}
const symbols=Array.from({length:503},(_,i)=>`T${String(i).padStart(3,"0")}`);
const csv="Symbol,Security\n"+symbols.map(s=>`${s},${s} Inc`).join("\n");
const ms=s=>Date.parse(`${s}T00:00:00Z`);
function cat(date="2026-09-25"){return{timeframe:"1d",source:"iex",feed:"TOPS1.6",updated:"2026-09-26T07:00:00Z",symbols:Object.fromEntries(symbols.map(s=>[s,{to:ms(date),bars:500}]))}}
function pair(ticker,date="2026-09-25",i=0){return{ticker,previousDate:"2026-09-24",currentDate:date,previousClose:100,currentClose:i%2?99:101,currentVolume:10+i,source:"IEX HIST",feed:"TOPS1.6",attribution:IEX_ATTRIBUTION}}

test("CSV parser yields exact 503 unique symbols",()=>assert.equal(parseSp500Csv(csv).length,503));
test("catalogue selects latest 98% date",()=>{
  const c=cat();for(let i=0;i<9;i++)c.symbols[symbols[i]].to=ms("2026-09-24");
  const x=selectTradeDateFromCatalogue(symbols,c);
  assert.equal(x.tradeDate,"2026-09-25");assert.ok(x.coverage>=.98);
});
test("ticker pair validates IEX contract and preserves close+volume",async()=>{
  const body={symbol:"BRK.B",timeframe:"1d",source:"iex",feed:"TOPS1.6",attribution:IEX_ATTRIBUTION,bars:[
    {time:ms("2026-09-24"),close:500,volume:10},{time:ms("2026-09-25"),close:505,volume:20},
  ]};
  const out=await fetchTickerPair({ticker:"BRK.B",tradeDate:"2026-09-25",fetchImpl:async()=>({status:200,json:async()=>body})});
  assert.deepEqual([out.previousClose,out.currentClose,out.currentVolume],[500,505,20]);
});
test("store insert/noop/update produces cumulative history",async()=>{
  const{sqlite,db}=sqliteD1();const s=createBreadthB1R3Store(db,{now:()=>new Date("2026-09-26T00:00:00Z")});await s.initialize();
  await s.putUniverse({tradeDate:"2026-09-25",members:symbols,retrievedAt:"2026-09-26T00:00:00Z"});
  const a=await s.upsertPairs({asOfDate:"2026-09-26",tradeDate:"2026-09-25",pairs:[pair("T000")],retrievedAt:"2026-09-26T00:00:00Z"});
  const b=await s.upsertPairs({asOfDate:"2026-09-26",tradeDate:"2026-09-25",pairs:[pair("T000")],retrievedAt:"2026-09-26T01:00:00Z"});
  const changed={...pair("T000"),currentClose:102};
  const c=await s.upsertPairs({asOfDate:"2026-09-26",tradeDate:"2026-09-25",pairs:[changed],retrievedAt:"2026-09-26T02:00:00Z"});
  assert.deepEqual([a.inserted,b.noop,c.updated],[1,1,1]);
  const counts=await s.countRows();assert.equal(counts.history,2);sqlite.close();
});
test("collector is store-only and progresses in bounded batches",async()=>{
  const{sqlite,db}=sqliteD1();let pairCalls=0;
  const universeFetcher=async()=>({symbols,sourceUrl:"pddl"});
  const catalogueFetcher=async()=>cat();
  const pairFetcher=async({ticker,tradeDate})=>{pairCalls++;return pair(ticker,tradeDate,pairCalls)};
  const one=await collectBreadthB1R3ToStore({db,asOfDate:"2026-09-26",batchSize:40,universeFetcher,catalogueFetcher,pairFetcher,now:()=>new Date("2026-09-26T00:00:00Z")});
  const two=await collectBreadthB1R3ToStore({db,asOfDate:"2026-09-26",batchSize:40,universeFetcher,catalogueFetcher,pairFetcher,now:()=>new Date("2026-09-26T01:00:00Z")});
  assert.equal(one.scoreComputed,false);assert.equal(one.batchRequested,40);assert.equal(two.currentRows,80);assert.equal(pairCalls,80);
  sqlite.close();
});
test("stored reader keeps exact B1 60/40 formula with zero provider requests",async()=>{
  const{sqlite,db}=sqliteD1();const s=createBreadthB1R3Store(db);await s.initialize();
  await s.putUniverse({tradeDate:"2026-09-25",members:symbols,retrievedAt:"2026-09-26T00:00:00Z"});
  const pairs=symbols.map((x,i)=>pair(x,"2026-09-25",i));
  await s.upsertPairs({asOfDate:"2026-09-26",tradeDate:"2026-09-25",pairs,retrievedAt:"2026-09-26T00:00:00Z"});
  const actual=await readBreadthB1R3StoredScore({db,asOfDate:"2026-09-26",now:()=>new Date("2026-09-26T18:00:00Z")});
  const expected=buildBreadthB1R1({
    observationDate:"2026-09-25",
    snapshot:{asOfDate:"2026-09-25",isDaily:true,constituentCount:503,unlinkedCount:0,source:"x",members:symbols.map(ticker=>({ticker,weight:1,isLinked:true}))},
    pricePairs:pairs,lagTradingSessions:0,
  });
  assert.equal(actual.status,"READY");assert.equal(actual.score,expected.score);assert.deepEqual(actual.components,expected.components);
  assert.equal(actual.providerRequests,0);assert.equal(actual.methodologyVersion,B1_R3_METHOD);sqlite.close();
});
test("session calendar handles weekends and known holidays",()=>{
  assert.equal(isMarketSession("2026-09-25"),true);
  assert.equal(isMarketSession("2026-09-26"),false);
  assert.equal(isMarketSession("2026-12-25"),false);
  assert.equal(latestCompletedSession(new Date("2026-09-28T01:00:00Z")),"2026-09-25");
  assert.equal(countCompletedSessionsSince("2026-09-23",new Date("2026-09-27T12:00:00Z")),2);
});
