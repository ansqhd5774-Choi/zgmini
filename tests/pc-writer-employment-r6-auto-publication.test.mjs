import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {buildEmploymentR6OneYearReadModel} from "../lib/market-score/employment-r6-one-year-read-model.mjs";
import {hash} from "../scripts/pc-writer/d1.mjs";
import {persistEmploymentR6PublicResult,runEmploymentR6AutoPublication} from "../scripts/pc-writer/employment-r6-auto-publication.mjs";
import {EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY,employmentR6StoredDisplayResponse}
  from "../worker/employment-r6-public-display.mjs";

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

test("real Core SQLite to local result to D1 readback to visitor GET stays on one approved snapshot",async()=>{
 const pcHome=temporaryPcHome();
 try{
  fs.mkdirSync(path.join(pcHome,"storage"));
  const corePath=path.join(pcHome,"storage","core.sqlite");
  const db=new DatabaseSync(corePath);
  try{
   db.exec(`CREATE TABLE market_score_employment_r4_shadow_history_v1 (
     history_id INTEGER PRIMARY KEY AUTOINCREMENT,
     logical_series_id TEXT,geography_type TEXT,geography_code TEXT,
     observation_date TEXT,retrieved_at TEXT,available_at TEXT,value REAL,source_hash TEXT
   )`);
   db.prepare(`INSERT INTO market_score_employment_r4_shadow_history_v1 (
     logical_series_id,geography_type,geography_code,observation_date,
     retrieved_at,available_at,value,source_hash) VALUES (?,?,?,?,?,?,?,?)`)
    .run("U3_UNEMPLOYMENT_RATE","NATIONAL","US","2026-10-31",
      "2026-11-01T09:00:00.000Z",null,4.2,"a".repeat(64));
  }finally{db.close();}
  const coreBefore=fs.readFileSync(corePath);
  const d1=new Map();let writes=0;
  const remote={
   async query(_id,sql,params){
    assert.match(sql,/SELECT body,stored_at FROM market_public_snapshots_v1/);
    return {results:d1.has(params[0])?[d1.get(params[0])]:[]};
   },
   async request(_id,statements){
    assert.equal(statements.length,1);
    const p=statements[0].params;
    assert.equal(p[0],EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY);
    d1.set(p[0],{body:p[1],stored_at:p[2]});writes++;
   },
  };
  const published=await runEmploymentR6AutoPublication({...opts,pcHome,enabled:true,remote});
  assert.equal(published.status,"VERIFIED");
  assert.equal(published.sourceFeatures,1);
  assert.equal(writes,1);
  assert.deepEqual(fs.readFileSync(corePath),coreBefore);
  const savedPath=path.join(pcHome,"employment-r6-public-results",published.localResultHash+".json");
  const saved=JSON.parse(fs.readFileSync(savedPath,"utf8"));
  assert.equal(saved.indicators.length,29);
  assert.equal(saved.indicators.find(item=>item.id==="U3_UNEMPLOYMENT").rawStatus,"READY");
  assert.equal(d1.get(EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY).body,JSON.stringify(saved));
  const d1Reader={prepare:()=>({bind:key=>({first:async()=>d1.get(key)??null})})};
  const response=await employmentR6StoredDisplayResponse(new Request("https://example.test/api/employment-r6/observations"),
    d1Reader,{now:now+1000});
  assert.equal(response.status,200);
  assert.equal(response.headers.get("x-employment-r6-source"),"STORED_D1");
  assert.deepEqual(await response.json(),saved);
 }finally{fs.rmSync(pcHome,{recursive:true,force:true});}
});
