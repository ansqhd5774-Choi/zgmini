import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  runEmploymentR4ShadowRuntimeStep,
  EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT,
} from "../lib/market-score/employment-r4-runtime-trigger.mjs";

function fakeStore(){
  const leases=[],releases=[],runs=[];
  const store={
    async initialize(){},
    async acquire(key,{ttlMs}){leases.push({key,ttlMs});return{acquired:true,key,token:"t"};},
    async release(lease){releases.push(lease.key);return true;},
    async recordRun(run){runs.push(run);return "run-1";},
  };
  return {store,leases,releases,runs,factory:()=>store};
}
const db={prepare(){return{bind(){return this},async first(){return null}}}};
const now=()=>new Date("2026-09-29T00:00:00Z");
const bedSkip=async()=>({status:"SKIPPED_TEST",providerRequests:0,dbWrites:0,scoreComputed:false});

test("runtime skips when a successful runtime pass is inside the 24h cadence",async()=>{
  const fsx=fakeStore();let forward=0,history=0;
  const out=await runEmploymentR4ShadowRuntimeStep({
    env:{DB:db},now,storeFactory:fsx.factory,bedRuntimeStep:bedSkip,
    gateReader:async()=>({latestStatus:"SUCCESS",latestCompletedAt:"2026-09-28T12:00:00Z",attempts24h:1}),
    collectForward:async()=>{forward++;},collectHistory:async()=>{history++;},
  });
  assert.equal(out.status,"SKIPPED_SUCCESS_CADENCE");
  assert.equal(forward,0);assert.equal(history,0);assert.equal(fsx.leases.length,0);
});

test("runtime caps attempts so two BLS calls per attempt stay below the unregistered v1 daily query limit",async()=>{
  const fsx=fakeStore();
  const out=await runEmploymentR4ShadowRuntimeStep({
    env:{DB:db},now,storeFactory:fsx.factory,bedRuntimeStep:bedSkip,
    gateReader:async()=>({latestStatus:"PARTIAL",latestCompletedAt:"2026-09-28T23:50:00Z",attempts24h:12}),
  });
  assert.equal(out.status,"SKIPPED_PROVIDER_BUDGET");
  assert.equal(out.providerRequests,0);
  assert.equal(EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT.maxBlsRequestsPer24hByRuntime,24);
});

test("runtime executes forward first, then one bounded history step, with no score computation",async()=>{
  const fsx=fakeStore(),order=[];
  const out=await runEmploymentR4ShadowRuntimeStep({
    env:{DB:db},now,storeFactory:fsx.factory,bedRuntimeStep:async()=>{order.push("bed");return{status:"SKIPPED_TEST",providerRequests:0,dbWrites:0,scoreComputed:false};},
    gateReader:async()=>({latestStatus:null,latestCompletedAt:null,attempts24h:0}),
    providerFactory:()=>({}),
    collectForward:async()=>{order.push("forward");return{status:"SUCCESS",providerRequests:2,collectedRows:10,inserted:2,revised:0,noop:8,rejected:0,currentRows:10,historyRowsAdded:2}},
    collectHistory:async()=>{order.push("history");return{status:"PROGRESS",providerRequests:2,claims:{status:"PROGRESS",write:{inserted:2,revised:0,noop:0,rejected:0,accepted:2,historyRowsAdded:2}},geographic:{status:"PROGRESS",write:{inserted:3,revised:0,noop:0,rejected:0,accepted:3,historyRowsAdded:3}}}},
  });
  assert.deepEqual(order,["forward","history","bed"]);
  assert.equal(out.status,"SUCCESS");
  assert.equal(out.providerRequests,4);
  assert.equal(out.scoreComputed,false);
  assert.equal(fsx.runs.at(-1).provider,"EMPLOYMENT_R4_RUNTIME");
  assert.equal(fsx.runs.at(-1).status,"SUCCESS");
  assert.equal(fsx.leases[0].ttlMs,10*60*1000);
  assert.ok(fsx.releases.length>=1);
});

test("partial runtime retains the dispatch lease for the 10 minute retry throttle",async()=>{
  const fsx=fakeStore();
  const out=await runEmploymentR4ShadowRuntimeStep({
    env:{DB:db},now,storeFactory:fsx.factory,bedRuntimeStep:bedSkip,
    gateReader:async()=>({latestStatus:null,latestCompletedAt:null,attempts24h:0}),
    providerFactory:()=>({}),
    collectForward:async()=>({status:"PARTIAL",providerRequests:1,collectedRows:2,inserted:1,revised:0,noop:0,rejected:0,currentRows:1,historyRowsAdded:1}),
    collectHistory:async()=>({status:"PARTIAL",providerRequests:1,claims:{status:"FAILED"},geographic:{status:"FAILED"}}),
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(fsx.releases.length,0);
  assert.equal(fsx.runs.at(-1).status,"PARTIAL");
  assert.equal(EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT.failureRetryThrottleMs,10*60*1000);
});


test("BED runtime failure is isolated from the completed daily runtime result",async()=>{
  const fsx=fakeStore();
  const out=await runEmploymentR4ShadowRuntimeStep({
    env:{DB:db},now,storeFactory:fsx.factory,
    gateReader:async()=>({latestStatus:null,latestCompletedAt:null,attempts24h:0}),
    providerFactory:()=>({}),
    collectForward:async()=>({status:"SUCCESS",providerRequests:0,collectedRows:0,inserted:0,revised:0,noop:0,rejected:0,currentRows:0,historyRowsAdded:0}),
    collectHistory:async()=>({status:"PROGRESS",providerRequests:0,claims:{status:"PROGRESS"},geographic:{status:"PROGRESS"}}),
    bedRuntimeStep:async()=>{throw new Error("bed-test-failure");},
  });
  assert.equal(out.status,"SUCCESS");
  assert.equal(out.bedStatus,"FAIL");
  assert.match(out.bed.failureCode,/BED_RUNTIME_WRAPPER_EXCEPTION/);
  assert.equal(out.scoreComputed,false);
});

test("runtime contract declares sequential BED wiring through the existing waitUntil path",()=>{
  assert.equal(EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT.bedSequentialAfterDaily,true);
  assert.equal(EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT.bedRouteWiredThroughExistingWaitUntil,true);
  assert.equal(EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT.bedFailureIsolatedFromDailyResult,true);
});

test("route wires employment shadow runtime only through waitUntil and preserves the current response branch",()=>{
  const route=fs.readFileSync(new URL("../app/api/market-score/route.ts",import.meta.url),"utf8");
  assert.match(route,/runEmploymentR4ShadowRuntimeStep/);
  assert.match(route,/waitUntil\(\s*Promise\.resolve\(\)\s*\.then\(\(\)=>runEmploymentR4ShadowRuntimeStep\(\{env,fetchImpl:globalThis\.fetch\}\)\)/s);
  assert.doesNotMatch(route,/collectEmploymentR4ShadowStoreOnlyR1/);
  assert.match(route,/const\s+response\s*=\s*request\.headers\.get\(['"]accept['"]\)\?\.includes\(['"]application\/x-ndjson['"]\)\s*\?\s*streamMarketScore\(handler,request,\{waitUntil\}\)\s*:\s*await\s+handler\(request\);/s);
});

test("runtime contract preserves store-only and public score isolation",()=>{
  assert.equal(EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT.waitUntilOnly,true);
  assert.equal(EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT.storeOnly,true);
  assert.equal(EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT.scoreComputed,false);
  assert.equal(EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT.publicScoreChanged,false);
  assert.equal(EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT.activeMethodologyChanged,false);
  assert.equal(EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT.forwardBeforeHistory,true);
  assert.equal(EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT.successCadenceMs,24*60*60*1000);
  assert.equal(EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT.bedSequentialAfterDaily,true);
  assert.equal(EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT.bedRouteWiredThroughExistingWaitUntil,true);
});
