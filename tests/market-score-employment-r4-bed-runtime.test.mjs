import test from "node:test";
import assert from "node:assert/strict";
import {
  runEmploymentR4BedQuarterlyStep,
  EMPLOYMENT_R4_BED_RUNTIME_CONTRACT,
} from "../lib/market-score/employment-r4-bed-runtime.mjs";

function fakeStore(){
  const leases=[],releases=[],runs=[];
  const store={
    async initialize(){},
    async acquire(key,{ttlMs}){leases.push({key,ttlMs});return{acquired:true,key,token:"t"};},
    async release(lease){releases.push(lease.key);return true;},
    async recordRun(run){runs.push(run);return "run-bed-1";},
  };
  return {store,leases,releases,runs,factory:()=>store};
}
const db={prepare(){return{bind(){return this},async first(){return null}}}};
const now=()=>new Date("2026-10-28T13:00:00Z");

test("only a true forward release SUCCESS activates the 90-day cadence",async()=>{
  const fsx=fakeStore();let calls=0;
  const out=await runEmploymentR4BedQuarterlyStep({
    env:{DB:db},now,storeFactory:fsx.factory,
    gateReader:async()=>({latestStatus:"SUCCESS",latestCompletedAt:"2026-09-01T00:00:00Z",existingRuntimeAttempts24h:0,bedRuntimeAttempts24h:0}),
    collectBed:async()=>{calls++;},
  });
  assert.equal(out.status,"SKIPPED_QUARTERLY_CADENCE");
  assert.equal(calls,0);
});

test("baseline-only run is BASELINE_STORED rather than quarterly SUCCESS",async()=>{
  const fsx=fakeStore();
  const out=await runEmploymentR4BedQuarterlyStep({
    env:{DB:db},now,storeFactory:fsx.factory,
    gateReader:async()=>({latestStatus:null,latestCompletedAt:null,existingRuntimeAttempts24h:0,bedRuntimeAttempts24h:0}),
    providerFactory:()=>({}),
    collectBed:async()=>({
      status:"SUCCESS",providerRequests:5,collectedRows:228,forwardRows:0,priorSeries:0,
      inserted:228,revised:0,noop:0,rejected:0,currentRows:228,historyRowsAdded:228,missingSeries:[]
    }),
  });
  assert.equal(out.status,"BASELINE_STORED");
  assert.equal(out.providerRequests,5);
  assert.equal(fsx.runs.at(-1).status,"BASELINE_STORED");
  assert.ok(fsx.releases.length>=1);
});

test("repeat with no new BED release is NO_NEW_FORWARD_RELEASE",async()=>{
  const fsx=fakeStore();
  const out=await runEmploymentR4BedQuarterlyStep({
    env:{DB:db},now,storeFactory:fsx.factory,
    gateReader:async()=>({latestStatus:"BASELINE_STORED",latestCompletedAt:"2026-09-01T00:00:00Z",existingRuntimeAttempts24h:0,bedRuntimeAttempts24h:0}),
    providerFactory:()=>({}),
    collectBed:async()=>({
      status:"SUCCESS",providerRequests:5,collectedRows:228,forwardRows:0,priorSeries:114,
      inserted:0,revised:0,noop:228,rejected:0,currentRows:228,historyRowsAdded:0,missingSeries:[]
    }),
  });
  assert.equal(out.status,"NO_NEW_FORWARD_RELEASE");
  assert.equal(fsx.runs.at(-1).status,"NO_NEW_FORWARD_RELEASE");
});

test("BED runtime protects the shared BLS unregistered daily query budget",async()=>{
  const fsx=fakeStore();let calls=0;
  const out=await runEmploymentR4BedQuarterlyStep({
    env:{DB:db},now,storeFactory:fsx.factory,
    gateReader:async()=>({latestStatus:null,latestCompletedAt:null,existingRuntimeAttempts24h:11,bedRuntimeAttempts24h:0}),
    collectBed:async()=>{calls++;},
  });
  assert.equal(out.status,"SKIPPED_BLS_SHARED_BUDGET");
  assert.equal(calls,0);
  assert.equal(EMPLOYMENT_R4_BED_RUNTIME_CONTRACT.bedRequestsPerAttempt,5);
});

test("newly observed quarter produces SUCCESS and starts quarterly cadence",async()=>{
  const fsx=fakeStore();
  const out=await runEmploymentR4BedQuarterlyStep({
    env:{DB:db},now,storeFactory:fsx.factory,
    gateReader:async()=>({latestStatus:"BASELINE_STORED",latestCompletedAt:"2026-09-01T00:00:00Z",existingRuntimeAttempts24h:0,bedRuntimeAttempts24h:0}),
    providerFactory:()=>({}),
    collectBed:async()=>({
      status:"SUCCESS",providerRequests:5,collectedRows:342,forwardRows:114,priorSeries:114,
      inserted:114,revised:0,noop:228,rejected:0,currentRows:342,historyRowsAdded:114,missingSeries:[]
    }),
  });
  assert.equal(out.status,"SUCCESS");
  assert.equal(out.providerRequests,5);
  assert.equal(out.scoreComputed,false);
  assert.equal(fsx.runs.at(-1).provider,"EMPLOYMENT_R4_BED_RUNTIME");
  assert.equal(fsx.runs.at(-1).detail.forwardRows,114);
  assert.equal(fsx.runs.at(-1).detail.priorSeries,114);
});

test("BED runtime is not route-wired by this correction revision",()=>{
  assert.equal(EMPLOYMENT_R4_BED_RUNTIME_CONTRACT.routeWiring,false);
  assert.equal(EMPLOYMENT_R4_BED_RUNTIME_CONTRACT.schedulerRequired,true);
  assert.equal(EMPLOYMENT_R4_BED_RUNTIME_CONTRACT.storeOnly,true);
  assert.equal(EMPLOYMENT_R4_BED_RUNTIME_CONTRACT.publicScoreChanged,false);
  assert.equal(EMPLOYMENT_R4_BED_RUNTIME_CONTRACT.activeMethodologyChanged,false);
});
