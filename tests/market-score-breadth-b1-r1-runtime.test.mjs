import test from "node:test";
import assert from "node:assert/strict";
import {collectBreadthB1R1Runtime} from "../lib/market-score/breadth-b1-r1-runtime.mjs";

test("runtime gate makes zero provider calls unless plan is explicitly PRO",async()=>{
  let calls=0;
  const out=await collectBreadthB1R1Runtime({
    env:{EQUIBLES_API_KEY:"eq_test"},
    collect:async()=>{calls++;return {status:"READY",score:50};},
  });
  assert.equal(calls,0);
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"EQUIBLES_PRO_ENTITLEMENT_NOT_PROVEN");
});

test("runtime PRO gate still requires a key without provider calls",async()=>{
  let calls=0;
  const out=await collectBreadthB1R1Runtime({
    env:{EQUIBLES_B1_PLAN:"PRO"},
    collect:async()=>{calls++;return {status:"READY",score:50};},
  });
  assert.equal(calls,0);
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.missing[0],"EQUIBLES_API_KEY_MISSING");
});

test("runtime PRO plus key delegates exactly once to the approved provider",async()=>{
  let calls=0,args=null;
  const ready={id:"breadth",status:"READY",score:61,methodologyVersion:"B1-R1",missing:[]};
  const out=await collectBreadthB1R1Runtime({
    env:{EQUIBLES_B1_PLAN:" pro ",EQUIBLES_API_KEY:" eq_test "},
    fetchImpl:async()=>new Response("{}"),
    collect:async input=>{calls++;args=input;return ready;},
  });
  assert.equal(calls,1);
  assert.equal(args.apiKey,"eq_test");
  assert.equal(typeof args.fetchImpl,"function");
  assert.equal(out,ready);
});

test("runtime does not override a provider PARTIAL/null result",async()=>{
  const partial={id:"breadth",status:"PARTIAL",score:null,missing:["EQUIBLES_PRO_ENTITLEMENT_REQUIRED"]};
  const out=await collectBreadthB1R1Runtime({
    env:{EQUIBLES_B1_PLAN:"PRO",EQUIBLES_API_KEY:"eq_test"},
    collect:async()=>partial,
  });
  assert.equal(out,partial);
  assert.equal(out.score,null);
});
