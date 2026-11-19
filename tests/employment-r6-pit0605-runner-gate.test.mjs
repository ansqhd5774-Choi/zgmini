import test from "node:test";
import assert from "node:assert/strict";
import {
 runnerOptionsFrom,projectPit0605Aggregate,
} from "../scripts/pc-writer/employment-r6-runner-stage.mjs";

const args=[
 "--db","C:/temp/core.sqlite","--candidate-db-external","C:/temp/EMPLOYMENT_R6_CANDIDATE.sqlite",
 "--output-dir","C:/temp/output","--as-of","2026-11-19",
];
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
test("PIT0605 is opt-in and mutually exclusive with PIT04 page",()=>{
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
