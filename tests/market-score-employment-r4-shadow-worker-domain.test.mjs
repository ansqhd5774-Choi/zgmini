import test from "node:test";
import assert from "node:assert/strict";
import { collectEmploymentR4ShadowStoreOnlyR1 } from "../lib/market-score/employment-r4-shadow-worker-domain.mjs";

function fakeStore(prior=null){
  return {async initialize(){},async latestRun(){return prior;}};
}

test("worker skips cleanly when DB binding is unavailable",async()=>{
  let called=0;
  const out=await collectEmploymentR4ShadowStoreOnlyR1({env:{},collector:async()=>{called++;}});
  assert.equal(out.status,"SKIPPED_STORAGE_CONFIGURATION_MISSING");
  assert.equal(out.providerRequests,0);
  assert.equal(called,0);
});

test("worker skips provider calls for a recent successful run",async()=>{
  let called=0;
  const out=await collectEmploymentR4ShadowStoreOnlyR1({
    env:{DB:{}},
    now:()=>new Date("2026-09-28T00:00:00Z"),
    storeFactory:()=>fakeStore({run_id:"ok1",status:"SUCCESS",completed_at:"2026-09-27T00:00:00Z"}),
    providerFactory:()=>({}),
    collector:async()=>{called++;return{status:"SUCCESS"}},
  });
  assert.equal(out.status,"SKIPPED_RECENT_SUCCESS");
  assert.equal(out.providerRequests,0);
  assert.equal(called,0);
});

test("worker rate-limits retries after a recent failed or partial attempt",async()=>{
  let called=0;
  const out=await collectEmploymentR4ShadowStoreOnlyR1({
    env:{DB:{}},
    now:()=>new Date("2026-09-28T04:00:00Z"),
    storeFactory:()=>fakeStore({run_id:"bad1",status:"PARTIAL",completed_at:"2026-09-28T00:00:00Z"}),
    providerFactory:()=>({}),
    collector:async()=>{called++;return{status:"SUCCESS"}},
  });
  assert.equal(out.status,"SKIPPED_RECENT_ATTEMPT");
  assert.equal(called,0);
});

test("worker runs store-only collector after success cadence expires",async()=>{
  let called=0, providerCreated=0;
  const out=await collectEmploymentR4ShadowStoreOnlyR1({
    env:{DB:{prepare(){}}},
    now:()=>new Date("2026-09-28T00:00:00Z"),
    storeFactory:()=>fakeStore({run_id:"old",status:"SUCCESS",completed_at:"2026-09-20T00:00:00Z"}),
    providerFactory:({fetchImpl})=>{providerCreated++;assert.equal(typeof fetchImpl,"function");return{tag:"provider"}},
    collector:async({provider,claimsHistoryWeeks,rowMode})=>{
      called++;
      assert.equal(provider.tag,"provider");
      assert.equal(claimsHistoryWeeks,2);
      assert.equal(rowMode,"FORWARD_ONLY");
      return{status:"SUCCESS",providerRequests:2,inserted:10,rowMode};
    },
  });
  assert.equal(out.status,"SUCCESS");
  assert.equal(out.providerRequests,2);
  assert.equal(out.scoreComputed,false);
  assert.equal(called,1);
  assert.equal(providerCreated,1);
});


test("worker contract freezes bounded forward-only Production collection",async()=>{
  let args=null;
  const out=await collectEmploymentR4ShadowStoreOnlyR1({
    env:{DB:{prepare(){}}},
    now:()=>new Date("2026-09-28T00:00:00Z"),
    storeFactory:()=>fakeStore(null),
    providerFactory:()=>({tag:"provider"}),
    collector:async input=>{args=input;return{status:"SUCCESS",providerRequests:2,inserted:59,rowMode:input.rowMode};},
  });
  assert.equal(args.claimsHistoryWeeks,2);
  assert.equal(args.rowMode,"FORWARD_ONLY");
  assert.equal(out.rowMode,"FORWARD_ONLY");
});
