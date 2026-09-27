import test from "node:test";
import assert from "node:assert/strict";
import {
  createConsumptionR3ExternalSchedulerHandler,
  C1_R3_EXTERNAL_SCHEDULER_CONTRACT,
} from "../worker/consumption-r3-external-scheduler.mjs";

const SECRET="0123456789abcdef0123456789abcdef";

test("external scheduler rejects GET without executing refresh",async()=>{
  let calls=0;
  const handler=createConsumptionR3ExternalSchedulerHandler({
    env:{C1_R3_EXTERNAL_SCHEDULER_SECRET:SECRET,DB:{}},
    refresh:async()=>{calls++;return{};},
  });
  const r=await handler(new Request("https://example.invalid",{method:"GET"}));
  assert.equal(r.status,405);
  assert.equal(calls,0);
});

test("external scheduler rejects missing or wrong bearer secret",async()=>{
  let calls=0;
  const handler=createConsumptionR3ExternalSchedulerHandler({
    env:{C1_R3_EXTERNAL_SCHEDULER_SECRET:SECRET,DB:{}},
    refresh:async()=>{calls++;return{};},
  });
  let r=await handler(new Request("https://example.invalid",{method:"POST"}));
  assert.equal(r.status,401);
  r=await handler(new Request("https://example.invalid",{method:"POST",headers:{authorization:"Bearer wrong"}}));
  assert.equal(r.status,401);
  assert.equal(calls,0);
});

test("missing scheduler secret returns 503 without provider work",async()=>{
  let calls=0;
  const handler=createConsumptionR3ExternalSchedulerHandler({
    env:{DB:{}},
    refresh:async()=>{calls++;return{};},
  });
  const r=await handler(new Request("https://example.invalid",{method:"POST",headers:{authorization:`Bearer ${SECRET}`}}));
  assert.equal(r.status,503);
  assert.equal(calls,0);
});

test("authorized call runs one-source synchronous refresh and returns bounded result",async()=>{
  let seen=null;
  const fixed=new Date("2026-10-01T00:05:00Z");
  const handler=createConsumptionR3ExternalSchedulerHandler({
    env:{C1_R3_EXTERNAL_SCHEDULER_SECRET:SECRET,DB:{}},
    now:()=>new Date(fixed),
    refresh:async args=>{
      seen=args;
      return {status:"SOURCE_BATCH_STORED",quarter:"2026-Q3",scoreDate:"2026-09-30",providerRequests:1,storedSources:1,remainingSources:69,calculated:false};
    },
  });
  const r=await handler(new Request("https://example.invalid",{method:"POST",headers:{authorization:`Bearer ${SECRET}`}}));
  const body=await r.json();
  assert.equal(r.status,200);
  assert.equal(seen.asOf,"2026-10-01");
  assert.equal(seen.maxSourcesPerRun,1);
  assert.equal(body.operationalRevision,"C1-OP-R3");
  assert.equal(body.providerRequests,1);
  assert.equal(body.storedSources,1);
  assert.equal(body.remainingSources,69);
  assert.equal(body.calculated,false);
});

test("refresh failure is sanitized and returns 500",async()=>{
  const handler=createConsumptionR3ExternalSchedulerHandler({
    env:{C1_R3_EXTERNAL_SCHEDULER_SECRET:SECRET,DB:{}},
    refresh:async()=>{throw new Error("sensitive upstream text");},
  });
  const r=await handler(new Request("https://example.invalid",{method:"POST",headers:{authorization:`Bearer ${SECRET}`}}));
  const body=await r.json();
  assert.equal(r.status,500);
  assert.equal(body.reason,"REFRESH_FAILED");
  assert.equal(JSON.stringify(body).includes("sensitive"),false);
});

test("R3 external scheduler contract is synchronous and one-source bounded",()=>{
  assert.equal(C1_R3_EXTERNAL_SCHEDULER_CONTRACT.operationalRevision,"C1-OP-R3");
  assert.equal(C1_R3_EXTERNAL_SCHEDULER_CONTRACT.method,"POST");
  assert.equal(C1_R3_EXTERNAL_SCHEDULER_CONTRACT.maxSourcesPerInvocation,1);
  assert.equal(C1_R3_EXTERNAL_SCHEDULER_CONTRACT.waitUntil,false);
  assert.equal(C1_R3_EXTERNAL_SCHEDULER_CONTRACT.providerTimeoutMs,20000);
});
