import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {DatabaseSync} from "node:sqlite";

import {createEarningsE1R3D1Store} from "../lib/market-score/earnings-e1-r3-d1-store.mjs";
import {readEarningsE1R4StoredScore} from "../lib/market-score/sec-earnings-e1-r4-provider.mjs";
import {marketDetailRows} from "../lib/market-score/detail-catalog.mjs";

function d1(database=new DatabaseSync(":memory:")){
  const wrap=(stmt,bound=[])=>({
    bind(...args){return wrap(stmt,args)},
    async run(){const r=stmt.run(...bound);return{meta:{changes:Number(r.changes??0)}}},
    async first(){return stmt.get(...bound)??null},
    async all(){return{results:stmt.all(...bound)}},
  });
  return{
    database,
    prepare(sql){return wrap(database.prepare(sql))},
    async batch(items){
      database.exec("BEGIN");
      try{
        const out=[];
        for(const item of items)out.push(await item.run());
        database.exec("COMMIT");
        return out;
      }catch(error){
        database.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

function members(n=500){
  return Array.from({length:n},(_,i)=>({
    cik:String(1000000+i).padStart(10,"0"),
    ticker:`T${i}`,
    name:`Company ${i}`,
  }));
}
function issuerRows({n=500,marginN=500,shift=0}={}){
  return Array.from({length:n},(_,i)=>({
    cik:String(1000000+i).padStart(10,"0"),
    ticker:`T${i}`,
    name:`Company ${i}`,
    epsGrowth:.05+(i%9)*.002+shift,
    revenueGrowth:.03+(i%7)*.002+shift,
    operatingMargin:i<marginN?.12+(i%11)*.001+shift:null,
    provenance:{
      epsGrowth:{tag:"EPS"},
      revenueGrowth:{tag:"REV"},
      operatingMargin:{tag:"OP"},
    },
  }));
}

async function seedPeriod(store,periodEnd,frame,priorFrame,rows,retrievedAt,runId){
  await store.putUniverse(periodEnd,{members:members(),securityCount:500,wikipediaRevisionId:1},retrievedAt);
  const write=await store.upsertIssuerRows({periodEnd,frame,priorFrame,issuerRows:rows,retrievedAt});
  await store.recordRun({
    runId,periodEnd,status:"SUCCESS",
    startedAt:retrievedAt,completedAt:retrievedAt,
    universeCount:500,providerRequests:10,
    epsCount:500,revenueCount:500,marginCount:rows.filter(x=>Number.isFinite(x.operatingMargin)).length,
    insertedCount:write.inserted,updatedCount:write.updated,noopCount:write.noop,
    currentRows:write.currentRows,historyRowsAdded:write.historyRowsAdded,
  });
}

test("E1 stored periods accumulate and R4 score reader remains provider-free",async()=>{
  const db=d1();
  const store=createEarningsE1R3D1Store(db,{tokenFactory:()=>"lock"});
  await seedPeriod(store,"2026-03-31","CY2026Q1","CY2025Q1",issuerRows({shift:-.005}),"2026-06-20T00:00:00Z","q1");
  await seedPeriod(store,"2026-06-30","CY2026Q2","CY2025Q2",issuerRows({marginN:319}),"2026-09-24T00:00:00Z","q2");

  const periods=await store.listStoredPeriods("2026-09-24",{limit:20});
  assert.deepEqual(periods.map(x=>x.periodEnd),["2026-03-31","2026-06-30"]);

  const result=await readEarningsE1R4StoredScore({
    asOf:"2026-09-24",
    now:()=>new Date("2026-09-24T12:00:00Z"),
    db,
  });

  assert.equal(result.status,"READY");
  assert.equal(result.methodologyVersion,"E1-R4");
  assert.equal(result.providerRequests,0);
  assert.equal(result.persistence.calculationSource,"STORED_CURRENT_ONLY");
  assert.equal(result.persistence.collectionDecoupled,true);
  assert.equal(result.persistence.trendMode,"STORED_PERIOD_SNAPSHOTS_ONLY");
  assert.ok(Array.isArray(result.trend));
  assert.ok(result.trend.length>=1);
  assert.equal(result.trend.at(-1).label,"2026-06-30");
  assert.ok(Number.isFinite(result.trend.at(-1).value));

  const details=marketDetailRows("earnings",result.indicators);
  assert.equal(details.length,4);
  assert.ok(details.every(x=>Number.isFinite(x.score)));
});

test("E1 R4 stored scoring/collection wiring is scheduled and independent of page reads",()=>{
  const route=fs.readFileSync(new URL("../app/api/market-score/route.ts",import.meta.url),"utf8");
  const worker=fs.readFileSync(new URL("../worker/diagnostic-v1-canary.mjs",import.meta.url),"utf8");
  const provider=fs.readFileSync(new URL("../lib/market-score/sec-earnings-e1-r4-provider.mjs",import.meta.url),"utf8");

  const scheduled=fs.readFileSync(new URL("../worker/market-operational-refresh.mjs",import.meta.url),"utf8");
  assert.match(route,/storedMarketResponse/);
  assert.doesNotMatch(route,/collectEarningsE1R4ToStore|waitUntil/);
  assert.match(scheduled,/earnings:.*collectEarningsE1R4ToStore/);

  assert.match(worker,/readEarningsE1R4StoredScore/);
  assert.match(worker,/fetchEarnings:\s*readEarningsE1R4StoredScore/);
  assert.match(worker,/impl\.fetchEarnings\(\{asOf,\s*db:env\?\.DB\}\)/);
  assert.doesNotMatch(worker,/fetchEarnings:\s*collectEarningsE1R3PublicDomain/);

  const readStart=provider.indexOf("export async function readEarningsE1R4StoredScore");
  const collectStart=provider.indexOf("export async function collectEarningsE1R4ToStore");
  assert.ok(readStart>=0&&collectStart>readStart);
  const readBody=provider.slice(readStart,collectStart);
  assert.doesNotMatch(readBody,/fetchLiveSnapshot|fetchJson|Reflect\.apply/);

  const collectBody=provider.slice(collectStart);
  assert.match(collectBody,/fetchLiveSnapshot/);
  assert.match(collectBody,/upsertIssuerRows/);
  assert.match(collectBody,/calculationPerformed:false/);
});
