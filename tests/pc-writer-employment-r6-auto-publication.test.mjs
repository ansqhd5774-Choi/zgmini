import assert from "node:assert/strict";
import {test} from "node:test";
import path from "node:path";
import {runEmploymentR6AutoPublication} from "../scripts/pc-writer/employment-r6-auto-publication.mjs";

const now=Date.parse("2026-11-02T03:04:05.000Z");
const opts={pcHome:path.resolve("/tmp/approved-pc-home"),approvedSource:"approved-sha",runningSource:"approved-sha",dbId:"core-db",now};

test("default disabled R6 lane never opens a Core DB or writes to D1",async()=>{
  let calls=0;
  const result=await runEmploymentR6AutoPublication({
    ...opts,stage:async()=>{calls++;throw Error("STAGE_FORBIDDEN");},
    publish:async()=>{calls++;throw Error("PUBLISH_FORBIDDEN");},
  });
  assert.deepEqual(result,{status:"DISABLED"});
  assert.equal(calls,0);
});

test("explicit R6 source approval is required before any storage access",async()=>{
  let calls=0;
  await assert.rejects(runEmploymentR6AutoPublication({
    ...opts,enabled:true,runningSource:"different-sha",
    stage:async()=>{calls++;},publish:async()=>{calls++;},
  }),/EMPLOYMENT_R6_SOURCE_NOT_APPROVED/);
  assert.equal(calls,0);
});

test("approved lane only stages the existing Core and publishes its verified display",async()=>{
  const calls=[];
  const remote={existing:"D1_MOCK"};
  const stage=async args=>{
    calls.push(["stage",args]);
    return {asOfDate:"2026-11-02",sourceStoredAt:now-1000,
      summary:{sourceFeatures:29,chartReadyFeatures:23,recentlyObservedFeatures:23}};
  };
  const publish=async args=>{
    calls.push(["publish",args]);
    return {status:"VERIFIED"};
  };
  const result=await runEmploymentR6AutoPublication({...opts,enabled:true,remote,stage,publish});
  assert.deepEqual(result,{status:"VERIFIED",asOfDate:"2026-11-02",sourceStoredAt:now-1000,
    sourceFeatures:29,chartReadyFeatures:23,recentlyObservedFeatures:23});
  assert.deepEqual(calls[0],["stage",{dbPath:path.join(opts.pcHome,"storage","core.sqlite"),asOfDate:"2026-11-02"}]);
  assert.equal(calls[1][0],"publish");
  assert.equal(calls[1][1].remote,remote);
  assert.equal(calls[1][1].dbId,"core-db");
  assert.equal(calls[1][1].now,now);
  assert.equal(Object.hasOwn(calls[0][1],"candidateDbPath"),false);
});

test("stage date mismatch fails closed without a D1 write",async()=>{
  let writes=0;
  await assert.rejects(runEmploymentR6AutoPublication({
    ...opts,enabled:true,remote:{},
    stage:async()=>({asOfDate:"2026-11-01"}),
    publish:async()=>{writes++;},
  }),/EMPLOYMENT_R6_STAGE_DATE_MISMATCH/);
  assert.equal(writes,0);
});
