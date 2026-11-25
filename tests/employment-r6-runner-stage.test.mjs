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

test("PIT-04-02 Runner exposes only fixed History counts and an approved ambiguity HOLD",async t=>{
  const env=environment(t);fixture(env.core);fixture(env.candidate,{row:true});
  const options=runnerOptionsFrom(argv(env));
  const body=await stageEmploymentR6OneYear(options);
  const secret="DO_NOT_LEAK_PRIVATE_HASH_OR_ROW";
  const report=projectEmploymentR6RunnerResult({body,pitCoverage:{
    coreHistoryAsOfUniqueKeys:120,coreHistoryPriorRevisionKeys:4,
    coreHistoryPriorRevisionRows:7,coreHistoryAmbiguousLatestKeys:1,
    coreHistorySameInstantAdditionalRows:2,candidateHistoryAsOfUniqueKeys:41,
    candidateHistoryPriorRevisionKeys:3,candidateHistoryPriorRevisionRows:5,
    candidateHistoryAmbiguousLatestKeys:2,candidateHistorySameInstantAdditionalRows:1,
    candidateReconciliationPreviewStatus:"HOLD_AMBIGUOUS_LATEST_REVISIONS",
    source_hash:secret,history:[{rawValue:secret,sourceHash:secret}],
  }});
  assert.equal(report.status,"PASS");
  assert.deepEqual({
    coreUnique:report.pit.coreHistoryAsOfUniqueKeys,
    corePriorKeys:report.pit.coreHistoryPriorRevisionKeys,
    corePriorRows:report.pit.coreHistoryPriorRevisionRows,
    coreAmbiguous:report.pit.coreHistoryAmbiguousLatestKeys,
    coreSameInstant:report.pit.coreHistorySameInstantAdditionalRows,
    candidateUnique:report.pit.candidateHistoryAsOfUniqueKeys,
    candidatePriorKeys:report.pit.candidateHistoryPriorRevisionKeys,
    candidatePriorRows:report.pit.candidateHistoryPriorRevisionRows,
    candidateAmbiguous:report.pit.candidateHistoryAmbiguousLatestKeys,
    candidateSameInstant:report.pit.candidateHistorySameInstantAdditionalRows,
  },{coreUnique:120,corePriorKeys:4,corePriorRows:7,coreAmbiguous:1,
    coreSameInstant:2,candidateUnique:41,candidatePriorKeys:3,
    candidatePriorRows:5,candidateAmbiguous:2,candidateSameInstant:1});
  assert.equal(report.pit.candidateReconciliationPreviewStatus,"HOLD_AMBIGUOUS_LATEST_REVISIONS");
  assert.equal(report.providerCalls,0);
  assert.equal(report.d1Writes,0);
  assert.equal(report.promotionApproved,false);
  assert.doesNotMatch(JSON.stringify(report),/DO_NOT_LEAK_PRIVATE_HASH_OR_ROW|source_hash|rawValue|sourceHash/);
  assert.ok(Buffer.byteLength(JSON.stringify(report))<12000);
});

test("PIT-04-02 Runner refuses unbounded or negative History counts without leaking values",async t=>{
  const env=environment(t);
  fixture(env.core);fixture(env.candidate,{row:true});
  const body=await stageEmploymentR6OneYear(runnerOptionsFrom(argv(env)));
  const secret="DO_NOT_LEAK_PRIVATE_REVISION";
  const report=projectEmploymentR6RunnerResult({body,pitCoverage:{
    coreHistoryPriorRevisionRows:-1,
    coreHistoryAsOfUniqueKeys:2.4,
    candidateHistoryAmbiguousLatestKeys:secret,
    candidateHistoryPriorRevisionKeys:0,
    candidateReconciliationPreviewStatus:secret,
    rawHistoryBody:secret,
  }});
  assert.equal(report.pit.coreHistoryPriorRevisionRows,null);
  assert.equal(report.pit.coreHistoryAsOfUniqueKeys,null);
  assert.equal(report.pit.candidateHistoryAmbiguousLatestKeys,null);
  assert.equal(report.pit.candidateHistoryPriorRevisionKeys,0);
  assert.equal(report.pit.candidateReconciliationPreviewStatus,"NO_RUNTIME_EVIDENCE");
  assert.doesNotMatch(JSON.stringify(report),/DO_NOT_LEAK_PRIVATE_REVISION|rawHistoryBody/);
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
  try {
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
  } finally {
    // Close the WAL connection before Windows removes the temporary fixture directory.
    writer.close();
  }
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

test("PIT-04-03 Runner exposes only bounded Core match/conflict/unknown/missing counts",async t=>{
  const env=environment(t);fixture(env.core);fixture(env.candidate,{row:true});
  const body=await stageEmploymentR6OneYear(runnerOptionsFrom(argv(env)));
  const secret="PRIVATE_SOURCE_HASH_MUST_NOT_LEAK";
  const report=projectEmploymentR6RunnerResult({body,pitCoverage:{
    coreCurrentHistoryMatchingKeys:37000,
    coreCurrentHistoryConflictingKeys:100,
    coreCurrentHistoryUnverifiedKeys:777,
    coreCurrentHistoryMissingKeys:2880,
    rawSourceHash:secret,rows:[{value:secret,sourceHash:secret}],
  }});
  assert.deepEqual([
    report.pit.coreCurrentHistoryMatchingKeys,
    report.pit.coreCurrentHistoryConflictingKeys,
    report.pit.coreCurrentHistoryUnverifiedKeys,
    report.pit.coreCurrentHistoryMissingKeys,
  ],[37000,100,777,2880]);
  assert.equal(report.promotionApproved,false);
  assert.equal(report.providerCalls,0);
  assert.equal(report.d1Writes,0);
  assert.doesNotMatch(JSON.stringify(report),/PRIVATE_SOURCE_HASH_MUST_NOT_LEAK|rawSourceHash|sourceHash/);
  assert.ok(Buffer.byteLength(JSON.stringify(report))<12000);
  const invalid=projectEmploymentR6RunnerResult({body,pitCoverage:{
    coreCurrentHistoryMatchingKeys:-1,
    coreCurrentHistoryConflictingKeys:1.5,
    coreCurrentHistoryUnverifiedKeys:secret,
    coreCurrentHistoryMissingKeys:Number.MAX_SAFE_INTEGER+1,
  }});
  assert.deepEqual([
    invalid.pit.coreCurrentHistoryMatchingKeys,
    invalid.pit.coreCurrentHistoryConflictingKeys,
    invalid.pit.coreCurrentHistoryUnverifiedKeys,
    invalid.pit.coreCurrentHistoryMissingKeys,
  ],[null,null,null,null]);
});

test("PIT-04-08 Runner allows exactly one bounded key page offset, never arbitrary arguments",t=>{
 const env=environment(t);fixture(env.core);fixture(env.candidate,{row:true});
 const options=runnerOptionsFrom([...argv(env),"--pit04-offset","24"]);
 assert.equal(options.keyReviewOffset,24);
 assert.equal(options.candidateDbExternal,true);
 assert.equal(runnerOptionsFrom(argv(env)).keyReviewOffset,null);
 for(const invalid of ["-1","50001","24.0"," 24","01","0x18","9999999999"]){
  assert.throws(()=>runnerOptionsFrom([...argv(env),"--pit04-offset",invalid]),
   /RUNNER_R6_ARGUMENT_NOT_ALLOWED/);
 }
 assert.throws(()=>runnerOptionsFrom([...argv(env),"--pit04-offset","0",
   "--pit04-offset","24"]),/RUNNER_R6_ARGUMENT_NOT_ALLOWED/);
});

test("PIT-04-08 Runner rejects nonallowlisted key data and preserves bounded whitelist",async t=>{
 const env=environment(t);fixture(env.core);fixture(env.candidate,{row:true});
 const body=await stageEmploymentR6OneYear(runnerOptionsFrom(argv(env)));
 const counts={coreKeys:1,coreHistoryMissing:1,coreHistoryConflict:0,
  coreHistoryAmbiguous:0,candidateOverlapConflicts:0,
  missingCandidateInternalMatch:0,missingCandidateIncomplete:0,
  missingWithoutCandidate:1,duplicateCurrentKeys:0};
 const review={kind:"EMPLOYMENT_R6_PIT0408_KEY_REVIEW_SOURCE_ONLY_V1",
  status:"HOLD_KEY_CLASSIFICATION_NOT_RAW_PIT_ATTESTATION",
  counts,evidenceTotal:1,offset:0,pageSize:8,evidenceTruncated:false,nextOffset:null,
  evidence:[{logicalSeriesId:"STATE_INITIAL_CLAIMS",geographyCode:"AL",
   observationDate:"2026-11-07",reason:"MISSING_HISTORY_NO_CANDIDATE",
   coreHistoryMissing:true,candidateCurrentConflict:false,
   rawPitAttested:false,repairAuthorized:false,
   source_hash:"SECRET_RAW_HASH_SHOULD_NOT_SURFACE",value:1234}],
  rawPitAttested:false,promotionApproved:false,repairAuthorized:false,
  absolutePath:"PRIVATE_PATH_SHOULD_NOT_SURFACE"};
 const report=projectEmploymentR6RunnerResult({body,pitCoverage:{pit04KeyReview:review}});
 assert.equal(report.pit04KeyReview.evidenceTotal,1);
 assert.equal(report.pit04KeyReview.evidence.length,1);
 assert.equal(report.pit04KeyReview.nextOffset,null);
 assert.equal(report.pit04KeyReview.evidence[0].geographyCode,"AL");
 assert.equal(report.pit04KeyReview.promotionApproved,false);
 assert.doesNotMatch(JSON.stringify(report),/SECRET_RAW_HASH|PRIVATE_PATH_SHOULD_NOT_SURFACE|source_hash/);
 assert.ok(Buffer.byteLength(JSON.stringify(report))<12000);
 assert.equal(Object.hasOwn(projectEmploymentR6RunnerResult({body,pitCoverage:{}}),"pit04KeyReview"),false);
 for(const bad of [
  {...review,nextOffset:24},
  {...review,evidence:[{...review.evidence[0],reason:"FORGED"}]},
  {...review,rawPitAttested:true},
  {...review,evidence:[{...review.evidence[0],geographyCode:"ZZ"}]},
  {...review,counts:{...counts,missingWithoutCandidate:0}},
 ]){
  assert.throws(()=>projectEmploymentR6RunnerResult({body,pitCoverage:{pit04KeyReview:bad}}),
   /RUNNER_R6_PIT04_REVIEW_INVALID/);
 }
});

test("R1 minimal diagnostic exposes bounded missing reference date without raw input",async t=>{
  const env=environment(t);fixture(env.core);fixture(env.candidate,{row:true});
  const body=await stageEmploymentR6OneYear(runnerOptionsFrom(argv(env)));
  const u3=body.indicators.find(x=>x.id==="U3_UNEMPLOYMENT");
  assert.equal(u3.scoreStatus,"PARTIAL_HISTORY");
  assert.match(u3.firstMissingReferenceDate,/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
  u3.sourcePath="PRIVATE_RAW_SOURCE_PATH";
  const report=projectEmploymentR6RunnerResult({body,pitCoverage:{}});
  const output=report.indicators.find(x=>x.id==="U3_UNEMPLOYMENT");
  assert.equal(output.firstMissingReferenceDate,u3.firstMissingReferenceDate);
  assert.equal(report.indicators.length,29);
  assert.equal(report.providerCalls,0);
  assert.equal(report.d1Writes,0);
  assert.equal(report.promotionApproved,false);
  assert.ok(Buffer.byteLength(JSON.stringify(report))<12000);
  assert.doesNotMatch(JSON.stringify(report),/PRIVATE_RAW_SOURCE_PATH|sourcePath|sourceHash|sourceHashes/);
  for(const invalid of ["2026-02-30","2026-11-03","not-a-date","2026-10-31T12:00:00Z",123]){
    u3.firstMissingReferenceDate=invalid;
    assert.throws(()=>projectEmploymentR6RunnerResult({body,pitCoverage:{}}),
      /RUNNER_R6_INDICATOR_STATUS_INVALID/);
  }
  u3.firstMissingReferenceDate=null;
  assert.equal(Object.hasOwn(projectEmploymentR6RunnerResult({body,pitCoverage:{}}).indicators
    .find(x=>x.id==="U3_UNEMPLOYMENT"),"firstMissingReferenceDate"),false);
  u3.firstMissingReferenceDate="2026-10-31";
  u3.scoreStatus="READY";
  assert.throws(()=>projectEmploymentR6RunnerResult({body,pitCoverage:{}}),
    /RUNNER_R6_INDICATOR_STATUS_INVALID/);
});
