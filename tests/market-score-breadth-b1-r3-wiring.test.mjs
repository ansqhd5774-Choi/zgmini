import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  collectBreadthB1R3StoreOnlyR1,
  projectBreadthB1R3PublicDomain,
  assertBreadthB1R3PublicContract,
} from "../lib/market-score/breadth-b1-r3-worker-domain.mjs";
import {B1_R3_BATCH_SIZE,B1_R3_METHOD} from "../lib/market-score/breadth-b1-r3-contract.mjs";

test("production collector wrapper stays under Cloudflare free subrequest budget",async()=>{
  let args=null;
  const store={initialize:async()=>{},latestSuccessfulRun:async()=>null};
  const out=await collectBreadthB1R3StoreOnlyR1({
    env:{DB:{}},asOf:"2026-09-27",fetchImpl:async()=>{},
    storeFactory:()=>store,
    collector:async x=>{args=x;return{status:"PARTIAL_BATCH",providerRequests:42,scoreComputed:false}},
  });
  assert.equal(out.scoreComputed,false);
  assert.equal(args.batchSize,B1_R3_BATCH_SIZE);
  assert.equal(args.batchSize,40);
  assert.equal(args.maxAttemptsPerCall,1);
  assert.ok(2+args.batchSize<50);
});

test("successful same-day collector run is not repeated",async()=>{
  let called=0;
  const store={initialize:async()=>{},latestSuccessfulRun:async()=>({run_id:"done"})};
  const out=await collectBreadthB1R3StoreOnlyR1({
    env:{DB:{}},asOf:"2026-09-27",storeFactory:()=>store,
    collector:async()=>{called++;return{}},
  });
  assert.equal(out.status,"SKIPPED_ALREADY_SUCCESS");
  assert.equal(called,0);
});

test("R3 public projection preserves four breadth detail ids",()=>{
  const result={
    status:"READY",score:61.25,methodologyVersion:B1_R3_METHOD,source:"IEX HIST",
    observationDate:"2026-09-25",interpretation:"60/40",attribution:"IEX",
    components:{advanceRatio:.625,advanceValueShare:.59375},
    quality:{returnCoverage:.99,tradingValueCoverage:.98,lagTradingSessions:1},
    runtime:{asOfDate:"2026-09-27",observationDate:"2026-09-25",lagTradingSessions:1},
  };
  const d=projectBreadthB1R3PublicDomain(result,"2026-09-27T00:00:00.000Z");
  assertBreadthB1R3PublicContract(d);
  assert.equal(d.score,61.25);
  assert.deepEqual(d.indicators.map(x=>x.id),["breadth-37","breadth-38","breadth-39","breadth-40"]);
  assert.deepEqual(d.indicators.map(x=>x.score),[62.5,59.375,99,98]);
});

test("scheduled collector uses R3 and public requests only read the snapshot",()=>{
  const route=fs.readFileSync(new URL("../app/api/market-score/route.ts",import.meta.url),"utf8");
  const scheduled=fs.readFileSync(new URL("../worker/market-operational-refresh.mjs",import.meta.url),"utf8");
  assert.match(route,/storedMarketResponse/);
  assert.doesNotMatch(route,/collectBreadth|waitUntil/);
  assert.match(scheduled,/breadth:.*collectBreadthB1R3StoreOnlyR1/);
  assert.match(scheduled,/collectBreadthDomain:readBreadthB1R5StoredPublicDomainR1/);
  assert.doesNotMatch(scheduled,/collectBreadthR2StoreOnlyR2/);
});

test("scheduled wiring preserves current Earnings R4 and Consumption R3 paths",()=>{
  const scheduled=fs.readFileSync(new URL("../worker/market-operational-refresh.mjs",import.meta.url),"utf8");
  assert.match(scheduled,/earnings:.*collectEarningsE1R4ToStore/);
  assert.match(scheduled,/consumption:.*runConsumptionR3OperationalRefresh/);
});

test("market-score worker defaults to stored B1-R5 reader and R5 fallback",()=>{
  const worker=fs.readFileSync(new URL("../worker/market-score-r1.mjs",import.meta.url),"utf8");
  assert.match(worker,/collectBreadthDomain=readBreadthB1R5StoredPublicDomainR1/);
  assert.match(worker,/buildBreadthB1R5UnavailablePublicDomain/);
  assert.doesNotMatch(worker,/collectBreadthDomain=readBreadthR2StoredPublicDomainR2/);
});

test("domain adapter preserves active stored B1 source instead of hard-coded provider",()=>{
  const adapter=fs.readFileSync(new URL("../lib/market-score/domain-adapter-r1.mjs",import.meta.url),"utf8");
  assert.match(adapter,/publicDomains\.breadth\?\.source\?\?"D1_STORED_BREADTH_PRICE_VOLUME"/);
  assert.doesNotMatch(adapter,/explicitDomain\("breadth","수급·폭","ZGMINI_BREADTH_R2_METHOD_R1"/);
});
