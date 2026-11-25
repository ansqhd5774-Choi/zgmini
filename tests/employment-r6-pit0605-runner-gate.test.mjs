import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
 runnerOptionsFrom,projectPit0605Aggregate,projectCandidateConflictBreakdown,
} from "../scripts/pc-writer/employment-r6-runner-stage.mjs";

function optionsFixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"w04-pit0605-cli-"));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const core=path.join(root,"core.sqlite");
 const candidate=path.join(root,"EMPLOYMENT_R6_CANDIDATE.sqlite");
 const output=path.join(root,"output");
 fs.writeFileSync(core,"sqlite-fixture");
 fs.writeFileSync(candidate,"isolated-fixture");
 fs.mkdirSync(output);
 return ["--db",core,"--candidate-db-external",candidate,
  "--output-dir",output,"--as-of","2026-11-19"];
}
const counts={
 ORIGINAL_VERSION_AND_HISTORICAL_AVAILABILITY_PROVED:0,
 RAW_OBSERVATION_MATCH_HISTORICAL_TIME_UNPROVEN:2,
 RAW_OBSERVATION_OR_REVISION_CONFLICT:1,
 RAW_NOT_FOUND_IN_CHECKED_SCOPE:1,
};
const raw={
 schema:"ZGMINI_W04_PIT0605_SOURCE_ONLY_V1",
 scope:"CHECKED_STORED_RAW_SNAPSHOTS_NOT_HISTORICAL_PIT",
 historicPitAttested:false,repairAuthorized:false,
 checkedAt:"2026-11-19T14:00:00.000Z",
 evidenceDigest:"e".repeat(64),missingHistoryKeys:4,
 counts,checkedRawSnapshots:2,acceptedDOLSnapshots:1,
 malformedRawSnapshotGroups:0,
 rejectedRawSnapshots:{bodyOrId:0,metadata:0,run:1,parser:0},
 providerCalls:0,sqliteWrites:0,d1Writes:0,
 privateEvidence:[{geographyCode:"AK",sourceHash:"1".repeat(64)}],
};
test("PIT0605 is opt-in and mutually exclusive with PIT04 page",t=>{
 const args=optionsFixture(t);
 assert.equal(runnerOptionsFrom(args).pit0605Raw,false);
 assert.equal(runnerOptionsFrom([...args,"--pit0605-raw","1"]).pit0605Raw,true);
 assert.throws(()=>runnerOptionsFrom([...args,"--pit0605-raw","0"]),
  /RUNNER_R6_ARGUMENT_NOT_ALLOWED/);
 assert.throws(()=>runnerOptionsFrom([...args,"--pit0605-raw","1","--pit04-offset","0"]),
  /RUNNER_R6_ARGUMENT_NOT_ALLOWED/);
});
test("public PIT0605 aggregate is count-only with strict partition",()=>{
 const report=projectPit0605Aggregate(raw);
 assert.equal(report.missingHistoryKeys,4);
 assert.equal(Object.hasOwn(report,"privateEvidence"),false);
 assert.equal(JSON.stringify(report).includes("geographyCode"),false);
 assert.equal(JSON.stringify(report).includes("sourceHash"),false);
 assert.equal(report.repairAuthorized,false);
 assert.throws(()=>projectPit0605Aggregate({...raw,counts:{...counts,
  RAW_NOT_FOUND_IN_CHECKED_SCOPE:2}}),/RUNNER_R6_PIT0605_REPORT_INVALID/);
});
test("PIT0605 rejects an impossible historical PIT promotion",()=>{
 assert.throws(()=>projectPit0605Aggregate({...raw,
  historicPitAttested:true}),/RUNNER_R6_PIT0605_REPORT_INVALID/);
 assert.throws(()=>projectPit0605Aggregate({...raw,
  counts:{...counts,ORIGINAL_VERSION_AND_HISTORICAL_AVAILABILITY_PROVED:1,
    RAW_OBSERVATION_MATCH_HISTORICAL_TIME_UNPROVEN:1}}),
  /RUNNER_R6_PIT0605_REPORT_INVALID/);
});

test("PIT0605 receipt month projection is bounded and rejects fabricated PIT",()=>{
 const receipt={keys:3,exactRawMatched:1,exactReceiptFirstObserved2025:0,
  firstExactReceiptMonth:"2026-11",lastExactReceiptMonth:"2026-11",
  scope:"EXACT_STORED_RAW_RECEIPT_NOT_HISTORICAL_PIT",
  privateSourceHash:"NEVER_LEAK_HASH"};
 const output=projectPit0605Aggregate({...raw,missingCandidateReceipts:receipt});
 assert.deepEqual(output.missingCandidateReceipts,{
  keys:3,exactRawMatched:1,exactReceiptFirstObserved2025:0,
  firstExactReceiptMonth:"2026-11",lastExactReceiptMonth:"2026-11",
  scope:receipt.scope,
 });
 assert.doesNotMatch(JSON.stringify(output),/NEVER_LEAK_HASH/);
 assert.equal(output.historicalVersionAttested,false);
 assert.throws(()=>projectPit0605Aggregate({...raw,missingCandidateReceipts:{
  ...receipt,exactRawMatched:5}}),/RUNNER_R6_PIT0605_RECEIPT_INVALID/);
 assert.throws(()=>projectPit0605Aggregate({...raw,missingCandidateReceipts:{
  ...receipt,firstExactReceiptMonth:"2025-13"}}),/RUNNER_R6_PIT0605_RECEIPT_INVALID/);
});
test("PIT0408 mismatch causes are a strictly checked safe summary",()=>{
 const input={kind:"W04_CANDIDATE_CURRENT_CAUSE_COUNTS_V1",
  sourceScope:"READONLY_CORE_CANDIDATE_SAME_SNAPSHOT_NOT_PIT",
  rawPitAttested:false,repairAuthorized:false,total:4,
  causes:{invalidNumericValue:0,providerOrSeriesDifferent:1,
   valueAndHashDifferent:1,valueOnlyDifferent:1,hashOnlyDifferent:1},
  changedFields:{numericValue:2,sourceHash:2,provider:1,
   providerSeries:0,sourceRevision:0},
  source_hash:"SENSITIVE_NEVER_PROJECT",
 };
 const projected=projectCandidateConflictBreakdown(input);
 assert.equal(projected.total,4);
 assert.deepEqual(projected.causes,input.causes);
 assert.doesNotMatch(JSON.stringify(projected),/SENSITIVE_NEVER_PROJECT/);
 assert.throws(()=>projectCandidateConflictBreakdown({
  ...input,causes:{...input.causes,hashOnlyDifferent:2}}),
  /RUNNER_R6_PIT04_CONFLICT_CAUSES_INVALID/);
 assert.throws(()=>projectCandidateConflictBreakdown({...input,rawPitAttested:true}),
  /RUNNER_R6_PIT04_CONFLICT_CAUSES_INVALID/);
});

test("repair preview uses existing explicit raw mode and is never implicit",t=>{
 const args=optionsFixture(t);
 assert.equal(runnerOptionsFrom([...args,"--pit0605-raw","1"]).repairPreview,false);
 assert.equal(runnerOptionsFrom([...args,"--pit0605-raw","1","--pit0605-repair-preview","1"]).repairPreview,true);
 assert.throws(()=>runnerOptionsFrom([...args,"--pit0605-repair-preview","1"]),/RUNNER_R6_ARGUMENT_NOT_ALLOWED/);
 assert.throws(()=>runnerOptionsFrom([...args,"--pit0605-raw","1","--pit0605-repair-preview","0"]),/RUNNER_R6_ARGUMENT_NOT_ALLOWED/);
});
