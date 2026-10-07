import test from "node:test";
import assert from "node:assert/strict";
import {renameWithRetrySync} from "../scripts/pc-writer/d1.mjs";

test("Windows atomic rename retries transient EPERM before succeeding",()=>{
  let calls=0;
  const sleeps=[];
  renameWithRetrySync("from.tmp","to.json",{
    platform:"win32",
    sleep:ms=>sleeps.push(ms),
    renameSync:()=>{
      calls++;
      if(calls<4)throw Object.assign(new Error("locked"),{code:"EPERM"});
    },
  });
  assert.equal(calls,4);
  assert.deepEqual(sleeps,[25,50,100]);
});

test("Windows atomic rename does not retry non-transient errors",()=>{
  let calls=0;
  assert.throws(()=>renameWithRetrySync("from.tmp","to.json",{
    platform:"win32",
    sleep:()=>{},
    renameSync:()=>{
      calls++;
      throw Object.assign(new Error("bad path"),{code:"ENOENT"});
    },
  }),error=>error?.code==="ENOENT");
  assert.equal(calls,1);
});

test("non-Windows atomic rename preserves immediate failure semantics",()=>{
  let calls=0;
  assert.throws(()=>renameWithRetrySync("from.tmp","to.json",{
    platform:"linux",
    sleep:()=>{},
    renameSync:()=>{
      calls++;
      throw Object.assign(new Error("denied"),{code:"EPERM"});
    },
  }),error=>error?.code==="EPERM");
  assert.equal(calls,1);
});
