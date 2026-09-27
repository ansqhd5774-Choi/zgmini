import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  collectBreadthR2StoreOnlyR2,
  readBreadthR2StoredPublicDomainR2,
} from "../lib/market-score/breadth-r2-worker-domain-r2.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const text=rel=>fs.readFileSync(path.join(ROOT,rel),"utf8");

test("collector wrapper skips duplicate successful as-of without provider work",async()=>{
  let collectorCalls=0;
  const fakeStore={
    async initialize(){},
    async latestSuccessfulRun(){return {run_id:"r1"};},
  };
  const result=await collectBreadthR2StoreOnlyR2({
    env:{DB:{},BEA_USER_ID:"x"},
    asOf:"2026-09-24",
    storeFactory:()=>fakeStore,
    collector:async()=>{collectorCalls++;return {status:"SUCCESS"};},
  });
  assert.equal(result.status,"SKIPPED_ALREADY_SUCCESS");
  assert.equal(result.providerRequests,0);
  assert.equal(result.scoreComputed,false);
  assert.equal(collectorCalls,0);
});

test("stored public reader projects score without provider access",async()=>{
  let reads=0;
  const result=await readBreadthR2StoredPublicDomainR2({
    env:{DB:{}},
    asOf:"2026-09-24",
    storedScoreReader:async()=>{
      reads++;
      return {
        status:"READY",score:55,state:"NEUTRAL",interpretation:"NEUTRAL",
        methodologyVersion:"ZGMINI_BREADTH_R2_METHOD_R1",
        missingFactors:[],
        runtime:{asOfDate:"2026-09-24",now:"2026-09-24T00:00:00.000Z"},
        sources:{bea:{status:"STORED"},secPrevious:{status:"STORED"},secCurrent:{status:"STORED"},cftc:{status:"STORED"}},
        secPeriodPolicy:{current:{frame:"CY2026Q2"}},
        candidate:{
          inputs:{foreignPortfolio:{unitMult:6,sourceUnit:"USD"}},
          details:[
            {id:"breadth-37",observationDate:"2026-06-30"},
            {id:"breadth-38",observationDate:"2026-06-30"},
            {id:"breadth-39",observationDate:"2026-09-22"},
            {id:"breadth-40",observationDate:"2026-09-22"},
          ],
          indicators:[
            {id:"breadth-37",status:"READY",score:50,value:1},
            {id:"breadth-38",status:"READY",score:60,breadth:0.6},
            {id:"breadth-39",status:"READY",score:55,components:[{levelPct:55}]},
            {id:"breadth-40",status:"READY",score:55,components:[{levelPct:55}]},
          ],
        },
      };
    },
  });
  assert.equal(reads,1);
  assert.equal(result.status,"READY");
  assert.equal(result.score,55);
  assert.equal(result.methodologyVersion,"ZGMINI_BREADTH_R2_METHOD_R1");
});

test("production route schedules store-only collection through waitUntil before response",()=>{
  const route=text("app/api/market-score/route.ts");
  assert.doesNotMatch(route,/collectBreadthR2StoreOnlyR2/);
  assert.match(route,/collectBreadthB1R3StoreOnlyR1/);
  assert.match(route,/waitUntil\([\s\S]*collectBreadthB1R3StoreOnlyR1/);
  assert.doesNotMatch(route,/await\s+collectBreadthB1R3StoreOnlyR1/);
  assert.ok(route.indexOf("collectBreadthB1R3StoreOnlyR1")<route.lastIndexOf("await handler(request)"));
});

test("score path uses D1 stored reader and does not invoke live breadth service",()=>{
  const worker=text("worker/market-score-r1.mjs");
  const r2Domain=text("lib/market-score/breadth-r2-worker-domain-r2.mjs");
  const r3Domain=text("lib/market-score/breadth-b1-r3-worker-domain.mjs");
  assert.match(worker,/collectBreadthDomain=readBreadthB1R3StoredPublicDomainR1/);
  assert.doesNotMatch(worker,/collectBreadthDomain=readBreadthR2StoredPublicDomainR2/);
  assert.match(r2Domain,/readBreadthR2StoredScore/);
  assert.doesNotMatch(r2Domain,/breadth-r2-provider-client/);
  assert.doesNotMatch(r2Domain,/\bfetch\s*\(/);
  assert.match(r3Domain,/readBreadthB1R3StoredPublicDomainR1/);
});

test("collector remains store-only and stored reader remains provider-request zero",()=>{
  const collector=text("lib/market-score/breadth-r2-collector-r2.mjs");
  const reader=text("lib/market-score/breadth-r2-stored-score-r2.mjs");
  assert.match(collector,/scoreComputed:\s*false/);
  assert.match(reader,/providerRequests:\s*0/);
  assert.doesNotMatch(reader,/breadth-r2-provider-client/);
});
