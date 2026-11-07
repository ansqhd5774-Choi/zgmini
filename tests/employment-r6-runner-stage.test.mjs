import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {test} from "node:test";

import {
  inspectWalSidecars,captureWalSidecarSeal,assertWalSidecarSeal,
  projectEmploymentR6RunnerResult,runnerOptionsFrom,runEmploymentR6Runner,
} from "../scripts/pc-writer/employment-r6-runner-stage.mjs";
import {stageEmploymentR6OneYear} from "../scripts/pc-writer/employment-r6-one-year-stage.mjs";

const CANDIDATE="EMPLOYMENT_R6_CANDIDATE.sqlite";
const TABLE="market_score_employment_r4_shadow_history_v1";
const AS_OF="2026-11-02";

function environment(t){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"employment-r6-runner-fixture-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const output=path.join(dir,"runner-output");
  const source=path.join(dir,"ORIGINAL-CANDIDATE-PATH-MUST-NOT-APPEAR");
  fs.mkdirSync(output);fs.mkdirSync(source);
  return {dir,output,core:path.join(dir,"core.sqlite"),candidate:path.join(source,CANDIDATE)};
}
function fixture(file,{row=false,wal=false}={}){
  const db=new DatabaseSync(file);
  try{
    if(wal)db.exec("PRAGMA journal_mode=WAL");
    db.exec(`CREATE TABLE ${TABLE} (
      history_id INTEGER PRIMARY KEY AUTOINCREMENT,
      logical_series_id TEXT,geography_type TEXT,geography_code TEXT,
      observation_date TEXT,retrieved_at TEXT,available_at TEXT,
      value REAL,source_hash TEXT
    )`);
    if(row)db.prepare(`INSERT INTO ${TABLE} (
      logical_series_id,geography_type,geography_code,observation_date,
      retrieved_at,available_at,value,source_hash) VALUES (?,?,?,?,?,?,?,?)`)
      .run("U3_UNEMPLOYMENT_RATE","NATIONAL","US","2026-10-31",
        "2026-11-01T09:00:00.000Z",null,4.2,
        crypto.createHash("sha256").update("fixture").digest("hex"));
  }finally{db.close();}
}
const argv=env=>["--db",env.core,"--candidate-db-external",env.candidate,
  "--output-dir",env.output,"--as-of",AS_OF];

test("Runner-facing stage emits only bounded aggregate and 29 statuses from real isolated SQLite",async t=>{
  const env=environment(t);
  fixture(env.core);fixture(env.candidate,{row:true});
  const coreBefore=fs.readFileSync(env.core),candidateBefore=fs.readFileSync(env.candidate);
  const result=await runEmploymentR6Runner(argv(env));
  assert.equal(result.status,"PASS",JSON.stringify(result));
  assert.equal(result.code,"EMPLOYMENT_R6_READONLY_STAGE_COMPLETED");
  assert.match(result.reportFile,/^EMPLOYMENT_R6_RUNNER_/);
  const json=fs.readFileSync(path.join(env.output,result.reportFile+".json"),"utf8");
  const txt=fs.readFileSync(path.join(env.output,result.reportFile+".txt"),"utf8");
  const report=JSON.parse(json);
  assert.equal(report.status,"PASS");
  assert.equal(report.dataStatus,"PARTIAL");
  assert.match(report.bodyDigest,/^[a-f0-9]{64}$/);
  assert.equal(report.summary.sourceFeatures,1);
  assert.equal(report.indicators.length,29);
  assert.equal(report.indicators.find(x=>x.id==="U3_UNEMPLOYMENT").rawStatus,"READY");
  assert.equal(report.publicationStatus,"NOT_REQUESTED");
  assert.equal(report.promotionApproved,false);
  assert.equal(report.providerCalls,0);
  assert.equal(report.d1Writes,0);
  assert.equal(report.sqliteOpened,true);
  assert.equal(report.operationalDirectoryWrites,"NOT_ASSERTED");
  assert.equal(report.walFailure,null);
  assert.equal(report.walPreflight.coreObserved,true);
  assert.equal(report.walPreflight.candidateObserved,true);
  assert.ok(Buffer.byteLength(json)+Buffer.byteLength(txt)<16384);
  assert.doesNotMatch(json+txt,/ORIGINAL-CANDIDATE-PATH-MUST-NOT-APPEAR/);
  assert.doesNotMatch(json+txt,/4\.2|sourceHash|sourceHashes|sourceStoredAt|history\W*:/);
  assert.deepEqual(fs.readFileSync(env.core),coreBefore);
  assert.deepEqual(fs.readFileSync(env.candidate),candidateBefore);
  assert.deepEqual(fs.readdirSync(path.dirname(env.candidate)),[CANDIDATE]);
});

test("Runner projection ignores injected source paths, raw values and unbounded optional PIT metadata",async t=>{
  const env=environment(t);fixture(env.core);fixture(env.candidate,{row:true});
  const options=runnerOptionsFrom(argv(env));
  const body=await stageEmploymentR6OneYear(options);
  const secret="PRIVATE_RAW_OR_KEY_MUST_NEVER_LEAK";
  body.indicators[0].sourcePath=secret;
  body.extra=secret;
  const report=projectEmploymentR6RunnerResult({body,pitCoverage:{
    coreCurrentKeysMissingHistory:2880,
    candidateReconciliationPreviewStatus:"NO_RUNTIME_EVIDENCE",
    missingBySeries:[{secret,rawValue:secret}],
  }});
  const text=JSON.stringify(report);
  assert.equal(report.bodyDigest,crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex"));
  assert.equal(report.pit.coreCurrentKeysMissingHistory,2880);
  assert.equal(report.indicators.length,29);
  assert.doesNotMatch(text,/PRIVATE_RAW_OR_KEY_MUST_NEVER_LEAK|sourcePath|history|retrievedAt|sourceStoredAt/);
  assert.ok(Buffer.byteLength(text)<12000);
});

test("Runner requires a single explicit candidate and rejects publish, discovery and unknown args",t=>{
  const env=environment(t);fixture(env.core);fixture(env.candidate,{row:true});
  for(const added of [
    ["--publish","true"],
    ["--discover-approved-candidate","yes"],
    ["--candidate-db-external",env.candidate],
    ["--command","cmd.exe"],
    ["--candidate-db",env.candidate],
  ]){
    assert.throws(()=>runnerOptionsFrom([...argv(env),...added]),/RUNNER_R6_ARGUMENT_NOT_ALLOWED/);
  }
  assert.throws(()=>runnerOptionsFrom(["--db",env.core,"--output-dir",env.output]),
    /RUNNER_R6_REQUIRED_ARGUMENT_MISSING/);
});

test("uppercase private exception text is not mistaken for a public diagnostic code",()=>{
  const secret="PRIVATE_TOKEN_MUST_NOT_LEAK";
  const report=projectEmploymentR6RunnerResult({error:Error(secret),pitCoverageError:secret});
  assert.equal(report.status,"FAIL");
  assert.equal(report.code,"RUNNER_R6_READ_FAILED");
  assert.equal(report.pitAuditError,"RUNNER_R6_READ_FAILED");
  assert.doesNotMatch(JSON.stringify(report),/PRIVATE_TOKEN_MUST_NOT_LEAK/);
  const blocked=projectEmploymentR6RunnerResult({
    error:Error("WAL_SIDECAR_NOT_READY"),
    walFailure:{dbRole:secret,phase:secret,
      detail:{headerMode:secret,walState:secret,shmState:secret,observedAt:secret}},
  });
  assert.equal(blocked.walFailure.dbRole,"UNKNOWN");
  assert.equal(blocked.walFailure.phase,"UNKNOWN");
  assert.equal(blocked.walFailure.walState,"UNOBSERVED");
  assert.doesNotMatch(JSON.stringify(blocked),/PRIVATE_TOKEN_MUST_NOT_LEAK/);
});

test("SQLite-open evidence remains true when both PIT audit and stage fail after opening",async t=>{
  const env=environment(t);
  fixture(env.core);fixture(env.candidate);
  const db=new DatabaseSync(env.core);
  try{db.exec(`CREATE TABLE market_score_employment_r4_shadow_current_v1 (logical_series_id TEXT)`);}
  finally{db.close();}
  const result=await runEmploymentR6Runner(argv(env));
  assert.equal(result.status,"FAIL");
  const report=JSON.parse(fs.readFileSync(path.join(env.output,result.reportFile+".json"),"utf8"));
  assert.equal(report.sqliteOpened,true);
  assert.equal(report.pitAuditError,"PIT_AUDIT_READ_FAILED");
  assert.equal(report.status,"FAIL");
});

test("WAL read-only open is fail-closed before SQLite can create missing sidecars",async t=>{
  const env=environment(t);fixture(env.core,{wal:true});fixture(env.candidate,{row:true});
  const filesBefore=fs.readdirSync(env.dir).sort();
  assert.equal(fs.existsSync(env.core+"-wal"),false);
  assert.throws(()=>inspectWalSidecars(env.core),/WAL_SIDECAR_NOT_READY/);
  const result=await runEmploymentR6Runner(argv(env));
  assert.equal(result.status,"BLOCKED");
  assert.equal(result.code,"WAL_SIDECAR_NOT_READY");
  assert.equal(fs.existsSync(env.core+"-wal"),false);
  assert.equal(fs.existsSync(env.core+"-shm"),false);
  assert.deepEqual(fs.readdirSync(env.dir).sort(),filesBefore);
  const report=JSON.parse(fs.readFileSync(path.join(env.output,result.reportFile+".json"),"utf8"));
  assert.equal(report.sqliteOpened,false);
  assert.equal(report.walPreflight.coreObserved,false);
  assert.equal(report.walPreflight.candidateObserved,false);
  assert.deepEqual({role:report.walFailure.dbRole,phase:report.walFailure.phase,
    header:report.walFailure.headerMode,wal:report.walFailure.walState,
    shm:report.walFailure.shmState},{role:"CORE",phase:"INITIAL_SEAL",
    header:"WAL",wal:"ABSENT",shm:"ABSENT"});
  assert.match(report.walFailure.observedAt,/^\d{4}-\d{2}-\d{2}T/);
  const txt=fs.readFileSync(path.join(env.output,result.reportFile+".txt"),"utf8");
  assert.match(txt,/WAL_FAILURE_ROLE: CORE/);
  assert.doesNotMatch(txt,/employment-r6-runner-fixture-|PRIVATE/);
});

test("WAL failure identifies isolated candidate when Core preflight succeeded",async t=>{
  const env=environment(t);fixture(env.core);fixture(env.candidate,{wal:true,row:true});
  assert.equal(fs.existsSync(env.candidate+"-wal"),false);
  const result=await runEmploymentR6Runner(argv(env));
  assert.equal(result.status,"BLOCKED");
  const report=JSON.parse(fs.readFileSync(path.join(env.output,result.reportFile+".json"),"utf8"));
  assert.equal(report.walPreflight.coreObserved,true);
  assert.equal(report.walPreflight.candidateObserved,false);
  assert.equal(report.walFailure.dbRole,"CANDIDATE");
  assert.equal(report.walFailure.phase,"INITIAL_SEAL");
  assert.equal(report.walFailure.walState,"ABSENT");
  assert.equal(report.walFailure.shmState,"ABSENT");
  assert.equal(report.sqliteOpened,false);
  assert.equal(fs.existsSync(env.candidate+"-wal"),false);
});

test("already-present WAL sidecars permit a bounded read without claiming zero directory I/O",async t=>{
  const env=environment(t);
  const writer=new DatabaseSync(env.core);
  t.after(()=>writer.close());
  writer.exec(`PRAGMA journal_mode=WAL; CREATE TABLE ${TABLE} (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    logical_series_id TEXT,geography_type TEXT,geography_code TEXT,
    observation_date TEXT,retrieved_at TEXT,available_at TEXT,value REAL,source_hash TEXT
  )`);
  fixture(env.candidate,{row:true});
  assert.equal(fs.existsSync(env.core+"-shm"),true);
  assert.equal(fs.existsSync(env.core+"-wal"),true);
  assert.deepEqual(inspectWalSidecars(env.core),{walMode:true,walSidecarsPreexisting:true});
  const result=await runEmploymentR6Runner(argv(env));
  assert.equal(result.status,"PASS",JSON.stringify(result));
  const report=JSON.parse(fs.readFileSync(path.join(env.output,result.reportFile+".json"),"utf8"));
  assert.equal(report.walPreflight.coreWalMode,true);
  assert.equal(report.walPreflight.coreWalSidecarsPreexisting,true);
  assert.equal(report.operationalDirectoryWrites,"NOT_ASSERTED");
});

test("WAL seal catches sidecar disappearance/replacement before a second read",t=>{
  const env=environment(t);
  const writer=new DatabaseSync(env.core);
  writer.exec("PRAGMA journal_mode=WAL; CREATE TABLE sealed(value TEXT)");
  const seal=captureWalSidecarSeal(env.core);
  assert.doesNotThrow(()=>assertWalSidecarSeal(env.core,seal));
  writer.close();
  assert.throws(()=>assertWalSidecarSeal(env.core,seal),/WAL_SIDECAR_NOT_READY|WAL_SIDECAR_CHANGED/);
  assert.equal(fs.existsSync(env.core+"-wal"),false);
  assert.equal(fs.existsSync(env.core+"-shm"),false);
});

test("Core hardlink candidate, missing file and malformed SQLite cannot trigger candidate read",async t=>{
  const env=environment(t);fixture(env.core);
  fs.linkSync(env.core,env.candidate);
  assert.equal((await runEmploymentR6Runner(argv(env))).status,"BLOCKED");
  fs.unlinkSync(env.candidate);
  assert.equal((await runEmploymentR6Runner(argv(env))).status,"BLOCKED");
  fs.writeFileSync(env.candidate,"NOT-SQLITE-PRIVATE-CONTENT");
  const result=await runEmploymentR6Runner(argv(env));
  assert.equal(result.status,"FAIL");
  assert.equal(result.code,"RUNNER_R6_SQLITE_HEADER_INVALID");
  const data=fs.readFileSync(path.join(env.output,result.reportFile+".json"),"utf8");
  assert.doesNotMatch(data,/PRIVATE-CONTENT|ORIGINAL-CANDIDATE-PATH-MUST-NOT-APPEAR/);
});
