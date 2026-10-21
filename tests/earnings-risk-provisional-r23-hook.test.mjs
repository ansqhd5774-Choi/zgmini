import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {dispatchEarningsRiskProvisionalR23} from "../scripts/pc-writer/earnings-risk-provisional-r23-hook.mjs";

test("R23 never changes the scheduler, DB, writer or config; refuses absent package",()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-earnings-r23-"));
 try{
  const base=path.join(root,"base"),here=path.join(root,"src","scripts","pc-writer");
  fs.mkdirSync(base,{recursive:true});fs.mkdirSync(here,{recursive:true});
  assert.equal(dispatchEarningsRiskProvisionalR23({base,here,platform:"linux"}).status,"SKIPPED_NON_WINDOWS");
  assert.equal(dispatchEarningsRiskProvisionalR23({base,here,platform:"win32"}).status,"BLOCKED_CONFIG_MISSING");
  fs.writeFileSync(path.join(base,"config.json"),JSON.stringify({collectionTarget:"pc",enabled:true,source:"a".repeat(40)}));
  assert.equal(dispatchEarningsRiskProvisionalR23({base,here,platform:"win32"}).status,"NOT_INSTALLED");
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test("R23 dispatches only with exact approved runtime SHA and all three installed files",()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-earnings-r23-"));
 try{
  const base=path.join(root,"base"),here=path.join(root,"src","scripts","pc-writer"),dir=path.join(base,"earnings-risk-provisional-r23");
  fs.mkdirSync(here,{recursive:true});fs.mkdirSync(dir,{recursive:true});
  const sha="a".repeat(40);
  fs.writeFileSync(path.join(base,"config.json"),JSON.stringify({source:sha,collectionTarget:"pc",enabled:true}));
  for(const name of ["ZGMINI_EARNINGS_R20_PROVISIONAL_SHADOW_READONLY.mjs","ZGMINI_EARNINGS_R21_OBSERVATION_LEDGER.mjs","ZGMINI_EARNINGS_R22_CHANGE_GATE.mjs","ZGMINI_EARNINGS_R31_SCOPED_PUBLICATION.mjs","ZGMINI_EARNINGS_R33_OBSERVE_PUBLISH_CYCLE.mjs"])
   fs.writeFileSync(path.join(dir,name),"// fixture\n");
  let calls=0,options=null,runnerArg=null;
  const gitImpl=(_cmd,args)=>args.includes("rev-parse")?sha:"";
  const spawnImpl=(_exe,args,opts)=>{calls++;runnerArg=args[0];options=opts;return {pid:321,on:()=>{},unref:()=>{}};};
  fs.writeFileSync(path.join(base,"local-earnings-risk-provisional-r22.lock"),'{"pid":123}');
  const busy=dispatchEarningsRiskProvisionalR23({base,here,platform:"win32",gitImpl,spawnImpl});
  assert.equal(busy.status,"PREVIOUS_OBSERVATION_RUNNING_OR_UNKNOWN");
  assert.equal(calls,0);
  fs.unlinkSync(path.join(base,"local-earnings-risk-provisional-r22.lock"));
  const result=dispatchEarningsRiskProvisionalR23({base,here,platform:"win32",gitImpl,spawnImpl});
  assert.equal(result.status,"DISPATCHED_UNVERIFIED");
  assert.equal(calls,1);
  assert.equal(options.detached,true);
  assert.equal(runnerArg,path.join(dir,"ZGMINI_EARNINGS_R33_OBSERVE_PUBLISH_CYCLE.mjs"));
  assert.equal(options.env.ZGMINI_EARNINGS_R23_SOURCE,sha);
  assert.match(fs.readFileSync("scripts/pc-writer/earnings-risk-provisional-r23-hook.mjs","utf8"),/core\.fsmonitor=false/);
  const blocked=dispatchEarningsRiskProvisionalR23({base,here,platform:"win32",gitImpl:(_c,args)=>args.includes("rev-parse")?"b".repeat(40):"",spawnImpl});
  assert.equal(blocked.status,"BLOCKED_RUNTIME_SHA_DRIFT");assert.equal(calls,1);
  const dirty=dispatchEarningsRiskProvisionalR23({base,here,platform:"win32",gitImpl:(_c,args)=>args.includes("rev-parse")?sha:" M tracked.js",spawnImpl});
  assert.equal(dirty.status,"BLOCKED_RUNTIME_SHA_DRIFT");assert.equal(calls,1);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test("Core-only integration does not add a new scheduler or publish branch",()=>{
 const local=fs.readFileSync("scripts/pc-writer/local-cycle.mjs","utf8");
 const hook=fs.readFileSync("scripts/pc-writer/earnings-risk-provisional-r23-hook.mjs","utf8");
 assert.match(local,/dispatchEarningsRiskProvisionalR23\(\{base,here\}\)/);
 assert.match(local,/if\(lane==='core'\)/);
 assert.match(local,/researchEarningsRiskProvisionalR23/);
 assert.doesNotMatch(hook,/schtasks|createTask|publishMarket\(|DB\.prepare\(|fetch\(/);
});
