import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {buildEmploymentR6OneYearReadModel} from "../lib/market-score/employment-r6-one-year-read-model.mjs";
import {hash} from "../scripts/pc-writer/d1.mjs";
import {persistEmploymentR6PublicResult,runEmploymentR6AutoPublication} from "../scripts/pc-writer/employment-r6-auto-publication.mjs";

const now=Date.parse("2026-11-02T03:04:05.000Z");
const opts={pcHome:path.resolve("/tmp/approved-pc-home"),approvedSource:"approved-sha",runningSource:"approved-sha",dbId:"core-db",now};
const body=buildEmploymentR6OneYearReadModel([],{asOfDate:"2026-11-02",sourceStoredAt:now-1000});
const resultFile=pcHome=>path.join(pcHome,"employment-r6-public-results",hash(body)+".json");
const temporaryPcHome=()=>fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-r6-public-"));

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

test("approved lane stages Core, persists and rereads the public display before D1",async()=>{
 const pcHome=temporaryPcHome();
 try{
  const calls=[];
  const remote={existing:"D1_MOCK"};
  const stage=async args=>{
    calls.push(["stage",args]);
    return body;
  };
  const publish=async args=>{
    calls.push(["publish",args]);
    assert.deepEqual(JSON.parse(fs.readFileSync(resultFile(pcHome),"utf8")),args.body);
    assert.notStrictEqual(args.body,body);
    return {status:"VERIFIED"};
  };
  const result=await runEmploymentR6AutoPublication({...opts,pcHome,enabled:true,remote,stage,publish});
  assert.deepEqual(result,{status:"VERIFIED",asOfDate:"2026-11-02",sourceStoredAt:now-1000,
    localResultHash:hash(body),localResultStored:true,
    sourceFeatures:body.summary.sourceFeatures,chartReadyFeatures:body.summary.chartReadyFeatures,
    recentlyObservedFeatures:body.summary.recentlyObservedFeatures});
  assert.deepEqual(calls[0],["stage",{dbPath:path.join(pcHome,"storage","core.sqlite"),asOfDate:"2026-11-02"}]);
  assert.equal(calls[1][0],"publish");
  assert.equal(calls[1][1].remote,remote);
  assert.equal(calls[1][1].dbId,"core-db");
  assert.equal(calls[1][1].now,now);
  assert.equal(Object.hasOwn(calls[0][1],"candidateDbPath"),false);
 }finally{fs.rmSync(pcHome,{recursive:true,force:true});}
});

test("identical computed result reuses immutable local result without rewriting",()=>{
 const pcHome=temporaryPcHome();
 try{
  const first=persistEmploymentR6PublicResult({pcHome,body});
  const before=fs.statSync(resultFile(pcHome)).mtimeMs;
  const second=persistEmploymentR6PublicResult({pcHome,body});
  assert.equal(first.stored,true);
  assert.equal(second.stored,false);
  assert.equal(first.hash,second.hash);
  assert.equal(fs.statSync(resultFile(pcHome)).mtimeMs,before);
  assert.deepEqual(second.body,body);
 }finally{fs.rmSync(pcHome,{recursive:true,force:true});}
});

test("local result failure blocks D1 and retains previously saved snapshot",async()=>{
 const pcHome=temporaryPcHome();
 try{
  persistEmploymentR6PublicResult({pcHome,body});
  const original=fs.readFileSync(resultFile(pcHome));
  let d1Writes=0;
  await assert.rejects(runEmploymentR6AutoPublication({
   ...opts,pcHome:path.join(pcHome,"not-installed"),enabled:true,remote:{},
   stage:async()=>body,publish:async()=>{d1Writes++;},
  }),/R6_PC_HOME_UNAVAILABLE/);
  assert.equal(d1Writes,0);
  assert.deepEqual(fs.readFileSync(resultFile(pcHome)),original);
  fs.writeFileSync(resultFile(pcHome),"{invalid");
  await assert.rejects(runEmploymentR6AutoPublication({
   ...opts,pcHome,enabled:true,remote:{},
   stage:async()=>body,publish:async()=>{d1Writes++;},
  }),/R6_LOCAL_RESULT_READBACK_FAILED/);
  assert.equal(d1Writes,0);
 }finally{fs.rmSync(pcHome,{recursive:true,force:true});}
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
