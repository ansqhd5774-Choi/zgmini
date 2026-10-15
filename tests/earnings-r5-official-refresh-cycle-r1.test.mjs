import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  E1_R5_OFFICIAL_REFRESH_CYCLE_R1_CONTRACT,
  evaluateOfficialRefreshCycle,
  runOfficialRefreshCycleR1,
} from "../scripts/pc-writer/earnings-r5-official-refresh-cycle-r1.mjs";

const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),"r68-cycle-"));

test("daily refresh cycle contract is research-only and scheduler-neutral",()=>{
  const c=E1_R5_OFFICIAL_REFRESH_CYCLE_R1_CONTRACT;
  assert.equal(c.productionActivation,false);
  assert.equal(c.dbWrites,0);
  assert.equal(c.schedulerMutation,false);
  assert.equal(c.earliestKstHour,18);
  assert.equal(c.maxAttemptsPerKstDate,1);
  assert.equal(c.maxOfficialRequestsPerAttempt,2);
  assert.equal(c.failedAttemptConsumesKstDate,true);
  assert.equal(c.callerNonBlocking,true);
});

test("before 18 KST no updater is called",async()=>{
  const d=tmp();let calls=0;
  try{
    const out=await runOfficialRefreshCycleR1({base:d,now:"2026-10-16T08:59:59Z",runRefresh:async()=>{calls++;return {status:"COMPLETE",officialNetworkCalls:2,results:[]};}});
    assert.equal(out.status,"BEFORE_KST_18");
    assert.equal(out.officialNetworkCalls,0);
    assert.equal(calls,0);
  }finally{fs.rmSync(d,{recursive:true,force:true});}
});

test("first run after 18 KST executes once and second same-day run skips",async()=>{
  const d=tmp();let calls=0;
  try{
    const runRefresh=async()=>{calls++;return {status:"COMPLETE",officialNetworkCalls:2,results:[{source:"sec",status:"UPDATED"},{source:"bea",status:"NOT_MODIFIED"}]};};
    const first=await runOfficialRefreshCycleR1({base:d,now:"2026-10-16T09:00:00Z",runRefresh});
    const second=await runOfficialRefreshCycleR1({base:d,now:"2026-10-16T12:00:00Z",runRefresh});
    assert.equal(first.status,"COMPLETE");
    assert.deepEqual(first.updatedSources,["sec"]);
    assert.equal(first.lastAttemptKstDate,"2026-10-16");
    assert.equal(second.status,"ALREADY_ATTEMPTED_KST_DATE");
    assert.equal(second.officialNetworkCalls,0);
    assert.equal(calls,1);
  }finally{fs.rmSync(d,{recursive:true,force:true});}
});

test("failed attempt consumes KST date and next KST date can run",async()=>{
  const d=tmp();let calls=0;
  try{
    const fail=async()=>{calls++;throw Object.assign(new Error("NETWORK_DOWN"),{code:"NETWORK_DOWN",officialNetworkCalls:1});};
    const first=await runOfficialRefreshCycleR1({base:d,now:"2026-10-16T09:00:00Z",runRefresh:fail});
    const sameDay=await runOfficialRefreshCycleR1({base:d,now:"2026-10-16T14:00:00Z",runRefresh:fail});
    assert.equal(first.status,"FAILED");
    assert.equal(first.officialNetworkCalls,1);
    assert.equal(sameDay.status,"ALREADY_ATTEMPTED_KST_DATE");
    assert.equal(calls,1);
    const next=await runOfficialRefreshCycleR1({base:d,now:"2026-10-17T09:00:00Z",runRefresh:async()=>{calls++;return {status:"COMPLETE",officialNetworkCalls:2,results:[]};}});
    assert.equal(next.status,"COMPLETE");
    assert.equal(calls,2);
  }finally{fs.rmSync(d,{recursive:true,force:true});}
});

test("KST gate is based on fixed UTC+9 date",()=>{
  const before=evaluateOfficialRefreshCycle({now:"2026-10-16T08:59:59Z",state:null});
  const due=evaluateOfficialRefreshCycle({now:"2026-10-16T09:00:00Z",state:null});
  assert.equal(before.kstDate,"2026-10-16");
  assert.equal(before.kstHour,17);
  assert.equal(before.run,false);
  assert.equal(due.kstDate,"2026-10-16");
  assert.equal(due.kstHour,18);
  assert.equal(due.run,true);
});

test("local-cycle runs official refresh gate before forward prospective and keeps both nonblocking",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/local-cycle.mjs",import.meta.url),"utf8");
  const refreshIndex=src.indexOf("earnings-r5-official-refresh-cycle-r1.mjs");
  const prospectiveIndex=src.indexOf("earnings-r5-forward-prospective-cycle-r1.mjs");
  assert.ok(refreshIndex>=0);
  assert.ok(prospectiveIndex>refreshIndex);
  assert.match(src,/researchEarningsR5OfficialRefresh/);
  assert.match(src,/researchEarningsR5Prospective/);
  assert.match(src,/nonBlocking:true/);
  assert.doesNotMatch(src,/if\s*\(\s*earningsR5OfficialRefresh\.status\s*!==\s*0\s*\)\s*process\.exitCode\s*=\s*1/);
});
