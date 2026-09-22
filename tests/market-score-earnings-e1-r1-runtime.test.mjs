import test from "node:test";
import assert from "node:assert/strict";
import {collectEarningsE1R1Runtime} from "../lib/market-score/earnings-e1-r1-runtime.mjs";

test("E1 runtime reuses B1 Pro entitlement proof and makes zero calls when unproven",async()=>{
  let calls=0;
  const out=await collectEarningsE1R1Runtime({
    env:{EQUIBLES_API_KEY:"eq_test"},
    collect:async()=>{calls++;return {status:"READY",score:50}},
  });
  assert.equal(calls,0);
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.missing[0],"EQUIBLES_PRO_ENTITLEMENT_NOT_PROVEN");
});

test("E1 runtime PRO gate still requires key without provider calls",async()=>{
  let calls=0;
  const out=await collectEarningsE1R1Runtime({
    env:{EQUIBLES_B1_PLAN:"PRO"},
    collect:async()=>{calls++;return {status:"READY",score:50}},
  });
  assert.equal(calls,0);
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.missing[0],"EQUIBLES_API_KEY_MISSING");
});

test("E1 runtime PRO plus key delegates exactly once",async()=>{
  let calls=0,args=null;
  const ready={id:"earnings",status:"READY",score:61,methodologyVersion:"E1-R1"};
  const out=await collectEarningsE1R1Runtime({
    env:{EQUIBLES_B1_PLAN:" pro ",EQUIBLES_API_KEY:" eq_test "},
    fetchImpl:async()=>new Response("{}"),
    collect:async input=>{calls++;args=input;return ready},
  });
  assert.equal(calls,1);
  assert.equal(args.apiKey,"eq_test");
  assert.equal(out,ready);
});
