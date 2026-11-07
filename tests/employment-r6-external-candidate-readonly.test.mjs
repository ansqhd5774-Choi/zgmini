import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {DatabaseSync} from "node:sqlite";
import {test} from "node:test";

import {EMPLOYMENT_R6_FEATURES,EMPLOYMENT_R6_REQUIRED_LOGICAL_SERIES} from "../lib/market-score/employment-r6-formula.mjs";
import {optionsFrom,stageEmploymentR6OneYear} from "../scripts/pc-writer/employment-r6-one-year-stage.mjs";

const script=new URL("../scripts/pc-writer/employment-r6-one-year-stage.mjs",import.meta.url);
const CANDIDATE_BASENAME="EMPLOYMENT_R6_CANDIDATE.sqlite";
const TABLE="market_score_employment_r4_shadow_history_v1";
const AS_OF="2026-11-02";
const RETRIEVED="2026-11-01T09:00:00.000Z";
const states=Array.from({length:51},(_,i)=>`S${String(i).padStart(2,"0")}`);

function environment(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"employment-r6-external-test-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const outputDir=path.join(dir,"stage-output");
  const outsideDir=path.join(dir,"private-original-package-token-KEEP-SECRET");
  fs.mkdirSync(outputDir);fs.mkdirSync(outsideDir);
  return {
    dir,outputDir,outsideDir,
    core:path.join(dir,"core.sqlite"),
    external:path.join(outsideDir,CANDIDATE_BASENAME),
    adjacent:path.join(outputDir,CANDIDATE_BASENAME),
  };
}
function fixture(file,rows=[]){
  const db=new DatabaseSync(file);
  try{
    db.exec(`CREATE TABLE ${TABLE}(
      history_id INTEGER PRIMARY KEY AUTOINCREMENT,
      logical_series_id TEXT,geography_type TEXT,geography_code TEXT,
      observation_date TEXT,retrieved_at TEXT,available_at TEXT,
      value REAL,source_hash TEXT
    )`);
    const insert=db.prepare(`INSERT INTO ${TABLE}
      (logical_series_id,geography_type,geography_code,observation_date,retrieved_at,value,source_hash)
      VALUES(?,?,?,?,?,?,?)`);
    db.exec("BEGIN");
    for(const row of rows){
      const sourceHash=crypto.createHash("sha256").update([row.id,row.date,row.code].join(":"))
        .digest("hex");
      insert.run(row.id,row.code==="US"?"NATIONAL":"STATE",row.code,row.date,
        row.retrieved??RETRIEVED,row.value,sourceHash);
    }
    db.exec("COMMIT");
  }finally{db.close();}
}
const isoDate=t=>new Date(t).toISOString().slice(0,10);
const monthly=Array.from({length:14},(_,i)=>isoDate(Date.UTC(2025,9+i,0)));
const quarterly=Array.from({length:5},(_,i)=>isoDate(Date.UTC(2025,9+3*i,0)));
const weekly=Array.from({length:58},(_,i)=>isoDate(Date.UTC(2025,8,26+i*7)));

function syntheticTwentyNineFeatureHistory(){
  const rows=[];
  const add=(id,date,code="US",value=100)=>rows.push({id,date,code,value});
  for(const id of EMPLOYMENT_R6_REQUIRED_LOGICAL_SERIES){
    const feature=EMPLOYMENT_R6_FEATURES.find(x=>x.logical.includes(id));
    const dates=feature.freq==="WEEKLY"?weekly:
      feature.freq==="QUARTERLY"?quarterly:monthly;
    for(const [i,date] of dates.entries()){
      if(id==="STATE_INITIAL_CLAIMS"){
        for(const [s,code] of states.entries())add(id,date,code,100+i+s/10);
      }else if(id==="BED_STATE_GAINS_LEVEL"||id==="BED_STATE_LOSSES_LEVEL"){
        for(const [s,code] of states.entries())add(id,date,code,
          (id==="BED_STATE_GAINS_LEVEL"?200:100)+i+s/10);
      }else if(id==="BED_SMALL_FIRM_GAINS_LEVEL"||id==="BED_SMALL_FIRM_LOSSES_LEVEL"){
        for(let firm=0;firm<4;firm++)add(id,date,`SF${firm}`,
          (id==="BED_SMALL_FIRM_GAINS_LEVEL"?200:100)+i+firm/10);
      }else add(id,date,"US",100+i/10);
    }
  }
  return rows;
}
const runStage=(env,candidate=env.external)=>spawnSync(process.execPath,[
  new URL(script).pathname,"--db",env.core,"--output-dir",env.outputDir,
  "--as-of",AS_OF,"--candidate-db-external",candidate,
],{encoding:"utf8",timeout:30_000,env:{...process.env,ZGMINI_PC_HOME:path.join(env.dir,"NO_APPROVED_PUBLISHER")}});

test("explicit external candidate stages all 29 synthetic raw features without PC Core, candidate or D1 writes",async t=>{
  const env=environment(t);
  fixture(env.core,[]);
  fixture(env.external,syntheticTwentyNineFeatureHistory());
  const beforeCore=fs.readFileSync(env.core),beforeCandidate=fs.readFileSync(env.external);
  const parsed=optionsFrom(["--db",env.core,"--output-dir",env.outputDir,
    "--as-of",AS_OF,"--candidate-db-external",env.external]);
  assert.equal(parsed.publish,false);
  assert.equal(parsed.candidateDbPath,env.external);
  const body=await stageEmploymentR6OneYear(parsed);
  assert.equal(body.summary.sourceFeatures,29);
  assert.equal(body.summary.recentlyObservedFeatures,29);
  assert.equal(body.indicators.length,29);
  assert.deepEqual(body.indicators.filter(x=>x.rawStatus==="UNAVAILABLE"),[]);

  const child=runStage(env);
  assert.equal(child.status,0,child.stderr+child.stdout);
  const reports=fs.readdirSync(env.outputDir).filter(x=>x.endsWith(".json"));
  assert.equal(reports.length,1);
  const reportText=fs.readFileSync(path.join(env.outputDir,reports[0]),"utf8");
  const {report,body:reportedBody}=JSON.parse(reportText);
  assert.equal(report.stageStatus,"STAGED");
  assert.equal(report.publicationStatus,"NOT_REQUESTED");
  assert.equal(report.remoteWritten,false);
  assert.equal(report.dbWritesByStage,0);
  assert.equal(report.providerCallsByStage,0);
  assert.equal(report.sourceMode,"CORE_PLUS_ISOLATED_CANDIDATE_READONLY");
  assert.equal(report.summary.sourceFeatures,29);
  assert.equal(reportedBody.summary.recentlyObservedFeatures,29);
  assert.deepEqual(fs.readFileSync(env.core),beforeCore);
  assert.deepEqual(fs.readFileSync(env.external),beforeCandidate);
  assert.equal(fs.existsSync(env.core+"-wal"),false);
  assert.equal(fs.existsSync(env.external+"-wal"),false);
  const txtPath=path.join(env.outputDir,reports[0].replace(/\.json$/,".txt"));
  const emitted=[child.stdout,child.stderr,reportText,fs.readFileSync(txtPath,"utf8")].join("\n");
  assert.doesNotMatch(emitted,/private-original-package-token-KEEP-SECRET/);
  assert.doesNotMatch(emitted,new RegExp(env.external.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  assert.doesNotMatch(emitted,/ZGMINI_PC_HOME|NO_APPROVED_PUBLISHER/);
});

test("existing adjacent candidate is still valid independently of explicit external handoff",async t=>{
  const env=environment(t);
  fixture(env.core,[{id:"U3_UNEMPLOYMENT_RATE",date:"2026-10-31",code:"US",value:5,
    retrieved:"2026-10-31T09:00:00.000Z"}]);
  fixture(env.adjacent,[{id:"U3_UNEMPLOYMENT_RATE",date:"2026-10-31",code:"US",value:4}]);
  const parsed=optionsFrom(["--db",env.core,"--output-dir",env.outputDir,
    "--as-of",AS_OF,"--candidate-db",env.adjacent]);
  assert.equal(parsed.candidateDbPath,env.adjacent);
  const body=await stageEmploymentR6OneYear(parsed);
  assert.equal(body.indicators[0].value,4);
});

test("external candidate refuses PUBLISH, discovery, adjacent candidate and ambiguous repeated flags",t=>{
  const env=environment(t);
  fixture(env.core,[]);fixture(env.external,[]);fixture(env.adjacent,[]);
  const common=["--db",env.core,"--output-dir",env.outputDir,"--as-of",AS_OF];
  for(const tail of [
    ["--candidate-db-external",env.external,"--publish"],
    ["--publish","--candidate-db-external",env.external],
    ["--candidate-db-external",env.external,"--discover-approved-candidate"],
    ["--candidate-db-external",env.external,"--candidate-db",env.adjacent],
    ["--candidate-db",env.adjacent,"--candidate-db-external",env.external],
    ["--candidate-db-external",env.external,"--candidate-db-external",env.external],
  ]){
    assert.throws(()=>optionsFrom([...common,...tail]),
      error=>/^[A-Z0-9_]+$/.test(error.message));
  }
});

test("external candidate rejects relative path, basename mismatch and missing file",t=>{
  const env=environment(t);
  fixture(env.core,[]);
  const wrongName=path.join(env.outsideDir,"OTHER.sqlite");
  fixture(wrongName,[]);
  const common=["--db",env.core,"--output-dir",env.outputDir,"--as-of",AS_OF];
  for(const bad of [
    CANDIDATE_BASENAME,
    wrongName,
    path.join(env.outsideDir,"missing",CANDIDATE_BASENAME),
  ]){
    assert.throws(()=>optionsFrom([...common,"--candidate-db-external",bad]),
      error=>/^[A-Z0-9_]+$/.test(error.message)&&!error.message.includes(env.outsideDir));
  }
});

test("invalid external SQLite fails closed at read time without leaking its private location or content",async t=>{
  const env=environment(t);
  fixture(env.core,[]);
  const secret="PRIVATE_DB_CONTENT_TOKEN_DO_NOT_DISCLOSE";
  fs.writeFileSync(env.external,`not SQLite: ${secret}`);
  const before=fs.readFileSync(env.external);
  const child=runStage(env);
  // Some restricted CI sandboxes allow one child process per test worker.
  // The positive 29/29 CLI test uses that slot; keep the negative read check
  // meaningful if this worker is denied a second subprocess with EPERM.
  if(child.error?.code==="EPERM"){
    const parsed=optionsFrom(["--db",env.core,"--output-dir",env.outputDir,
      "--as-of",AS_OF,"--candidate-db-external",env.external]);
    await assert.rejects(stageEmploymentR6OneYear(parsed));
    assert.deepEqual(fs.readFileSync(env.external),before);
    t.diagnostic("CLI subprocess unavailable (EPERM); invalid SQLite read rejection verified in-process");
    return;
  }
  assert.equal(child.error,undefined);
  assert.equal(child.status,2);
  assert.match(child.stdout+child.stderr,/EXTERNAL_CANDIDATE_READ_FAILED/);
  assert.doesNotMatch(child.stdout+child.stderr,/private-original-package-token-KEEP-SECRET/);
  assert.doesNotMatch(child.stdout+child.stderr,/PRIVATE_DB_CONTENT_TOKEN_DO_NOT_DISCLOSE/);
  const jsons=fs.readdirSync(env.outputDir).filter(x=>x.endsWith(".json"));
  assert.equal(jsons.length,1);
  const saved=fs.readFileSync(path.join(env.outputDir,jsons[0]),"utf8");
  assert.match(saved,/EXTERNAL_CANDIDATE_READ_FAILED/);
  assert.doesNotMatch(saved,/private-original-package-token-KEEP-SECRET|PRIVATE_DB_CONTENT_TOKEN_DO_NOT_DISCLOSE/);
  assert.deepEqual(fs.readFileSync(env.external),before);
});

test("external candidate rejects Core aliases through symlink, realpath and inode hardlink",t=>{
  const env=environment(t);
  fixture(env.core,[]);
  const common=["--db",env.core,"--output-dir",env.outputDir,"--as-of",AS_OF];
  fs.symlinkSync(env.core,env.external);
  assert.throws(()=>optionsFrom([...common,"--candidate-db-external",env.external]),
    error=>/^[A-Z0-9_]+$/.test(error.message));
  fs.unlinkSync(env.external);
  fs.linkSync(env.core,env.external);
  assert.throws(()=>optionsFrom([...common,"--candidate-db-external",env.external]),
    error=>/^[A-Z0-9_]+$/.test(error.message));
});

test("external candidate file identity is sealed against parse-to-open substitution",async t=>{
  const env=environment(t);
  fixture(env.core,[]);fixture(env.external,[]);
  const common=["--db",env.core,"--output-dir",env.outputDir,"--as-of",AS_OF,
    "--candidate-db-external",env.external];
  const parsed=optionsFrom(common);
  fs.unlinkSync(env.external);
  fs.linkSync(env.core,env.external);
  await assert.rejects(stageEmploymentR6OneYear(parsed),/CANDIDATE_CORE_FILE_ALIAS_FORBIDDEN/);
  fs.unlinkSync(env.external);
  fixture(env.external,[]);
  await assert.rejects(stageEmploymentR6OneYear(parsed),/EXTERNAL_CANDIDATE_FILE_CHANGED/);
});

test("Windows CMD passes one explicit STAGE candidate to Node but blocks external PUBLISH",()=>{
  const cmd=fs.readFileSync(new URL("../scripts/pc-writer/employment-r6-one-year-display.cmd",import.meta.url),"utf8");
  const stage=cmd.split(/^:stage\r?$/m)[1]?.split(/^:publish\r?$/m)[0];
  const publish=cmd.split(/^:publish\r?$/m)[1];
  assert.ok(stage&&publish);
  assert.match(stage,/if not "%~3"=="" goto usage/);
  assert.match(stage,/--candidate-db-external "%~2"/);
  assert.match(stage,/--candidate-db-external "%EMP_R6_EXTERNAL_CANDIDATE%"/);
  assert.match(stage,/--candidate-db "%~dp0EMPLOYMENT_R6_CANDIDATE\.sqlite"/);
  assert.match(stage,/--discover-approved-candidate/);
  assert.match(publish,/if defined EMP_R6_EXTERNAL_CANDIDATE/);
  assert.match(publish,/if not "%~2"==""/);
  assert.match(publish,/CANDIDATE_PUBLICATION_NOT_APPROVED/);
  assert.doesNotMatch(publish,/--candidate-db-external/);
});
