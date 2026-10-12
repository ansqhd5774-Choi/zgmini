import test from "node:test";
import assert from "node:assert/strict";
import {
  E1_R5_CFO_SURVEY_R1_CONTRACT,
  E1_R5_CFO_SURVEY_R1_VERSION,
  auditCfoSurveyPITVersions,
  buildCfoSurveyPITRecord,
  buildCfoSurveyShadowDiagnostic,
  compareCfoSurveyReleases,
  previousSurveyQuarter,
  selectCfoSurveyReleaseAsOf,
  validateCfoSurveyRelease,
} from "../lib/market-score/earnings-e1-r5-cfo-survey-r1.mjs";

const HASH_A="a".repeat(64);
const HASH_B="b".repeat(64);
const base=(overrides={})=>({
  surveyYear:2026,
  surveyQuarter:2,
  releaseAt:"2026-06-24T14:00:00Z",
  storedAt:"2026-06-24T14:05:00Z",
  currentYearGrowth:6,
  nextYearGrowth:4,
  sourceHash:HASH_A,
  revisionId:"2026Q2_INITIAL",
  sourceUrl:"https://www.richmondfed.org/example",
  ...overrides,
});

test("CFO Survey R1 is Shadow-only and preserves PIT versions",()=>{
  assert.equal(E1_R5_CFO_SURVEY_R1_VERSION,"E1-R5-CFO-SURVEY-R1");
  assert.equal(E1_R5_CFO_SURVEY_R1_CONTRACT.status,"SHADOW_ONLY");
  assert.equal(E1_R5_CFO_SURVEY_R1_CONTRACT.productionActivation,false);
  assert.equal(E1_R5_CFO_SURVEY_R1_CONTRACT.overwriteHistoricalPIT,false);
  assert.equal(E1_R5_CFO_SURVEY_R1_CONTRACT.apiKeyRequired,false);
});

test("release validation requires PIT timestamp, hash, revision and needed horizon values",()=>{
  assert.equal(validateCfoSurveyRelease(base()).status,"READY");
  assert.equal(validateCfoSurveyRelease(base({sourceHash:"bad"})).reason,"SOURCE_HASH_INVALID");
  assert.equal(validateCfoSurveyRelease(base({revisionId:""})).reason,"REVISION_ID_MISSING");
  assert.equal(validateCfoSurveyRelease(base({storedAt:"2026-06-23T00:00:00Z"})).reason,"STORED_BEFORE_RELEASE");
  assert.equal(validateCfoSurveyRelease(base({currentTargetYear:2025})).reason,"CURRENT_TARGET_YEAR_MISMATCH");
  assert.equal(validateCfoSurveyRelease(base({nextYearGrowth:null})).reason,"NEXT_YEAR_GROWTH_MISSING");
  assert.equal(validateCfoSurveyRelease(base({surveyQuarter:4,currentYearGrowth:null,nextYearGrowth:5})).status,"READY");
});

test("PIT record fixes target years and computes approved rolling-forward level",()=>{
  const row=buildCfoSurveyPITRecord(base());
  assert.equal(row.status,"READY");
  assert.equal(row.currentTargetYear,2026);
  assert.equal(row.nextTargetYear,2027);
  assert.equal(row.rollingForwardRevenueGrowth,5);
  assert.equal(row.releaseAt,"2026-06-24T14:00:00.000Z");
  assert.equal(row.sourceHash,HASH_A);
});

test("as-of selection cannot see a later historical revision",()=>{
  const initial=buildCfoSurveyPITRecord(base());
  const revised=buildCfoSurveyPITRecord(base({
    releaseAt:"2026-12-15T14:00:00Z",
    storedAt:"2026-12-15T14:05:00Z",
    currentYearGrowth:7,
    nextYearGrowth:5,
    sourceHash:HASH_B,
    revisionId:"2026Q2_ANNUAL_REVISION",
  }));
  const rows=[initial,revised];
  assert.equal(selectCfoSurveyReleaseAsOf(rows,{asOf:"2026-08-01",surveyYear:2026,surveyQuarter:2})?.revisionId,"2026Q2_INITIAL");
  assert.equal(selectCfoSurveyReleaseAsOf(rows,{asOf:"2026-12-20",surveyYear:2026,surveyQuarter:2})?.revisionId,"2026Q2_ANNUAL_REVISION");
});

test("quarter sequencing handles Q1 rollover and rejects skipped quarters",()=>{
  assert.deepEqual(previousSurveyQuarter(2027,1),{surveyYear:2026,surveyQuarter:4});
  assert.deepEqual(previousSurveyQuarter(2026,3),{surveyYear:2026,surveyQuarter:2});

  const q2=buildCfoSurveyPITRecord(base());
  const q3=buildCfoSurveyPITRecord(base({
    surveyQuarter:3,
    releaseAt:"2026-09-23T14:00:00Z",
    storedAt:"2026-09-23T14:05:00Z",
    currentYearGrowth:8,
    nextYearGrowth:4,
    sourceHash:HASH_B,
    revisionId:"2026Q3_INITIAL",
  }));
  const comparison=compareCfoSurveyReleases(q3,q2);
  assert.equal(comparison.status,"READY");
  assert.equal(comparison.currentLevel,5);
  assert.equal(comparison.previousLevel,5);
  assert.equal(comparison.raw,0);

  const q4=buildCfoSurveyPITRecord(base({
    surveyQuarter:4,
    releaseAt:"2026-12-20T14:00:00Z",
    storedAt:"2026-12-20T14:05:00Z",
    currentYearGrowth:null,
    nextYearGrowth:4,
    sourceHash:HASH_A,
    revisionId:"2026Q4_INITIAL",
  }));
  assert.equal(compareCfoSurveyReleases(q4,q2).reason,"NON_CONSECUTIVE_SURVEY_QUARTERS");
});

test("Shadow diagnostic uses only current and previous releases available as of evaluation time",()=>{
  const q2=buildCfoSurveyPITRecord(base());
  const q3=buildCfoSurveyPITRecord(base({
    surveyQuarter:3,
    releaseAt:"2026-09-23T14:00:00Z",
    storedAt:"2026-09-23T14:05:00Z",
    currentYearGrowth:8,
    nextYearGrowth:6,
    sourceHash:HASH_B,
    revisionId:"2026Q3_INITIAL",
  }));
  const before=buildCfoSurveyShadowDiagnostic([q2,q3],{asOf:"2026-09-01",surveyYear:2026,surveyQuarter:3});
  assert.equal(before.status,"MISSING");
  assert.equal(before.reason,"RELEASE_MISSING");

  const after=buildCfoSurveyShadowDiagnostic([q2,q3],{asOf:"2026-09-24",surveyYear:2026,surveyQuarter:3});
  assert.equal(after.status,"READY");
  assert.equal(after.previous.revisionId,"2026Q2_INITIAL");
  assert.equal(after.current.revisionId,"2026Q3_INITIAL");
  assert.equal(after.currentLevel,6.5);
  assert.equal(after.previousLevel,5);
  assert.equal(after.raw,1.5);
});

test("PIT audit exposes versions without collapsing later revisions",()=>{
  const initial=buildCfoSurveyPITRecord(base());
  const revised=buildCfoSurveyPITRecord(base({
    releaseAt:"2026-12-15T14:00:00Z",storedAt:"2026-12-15T14:05:00Z",
    sourceHash:HASH_B,revisionId:"2026Q2_REV2",
  }));
  const audit=auditCfoSurveyPITVersions([initial,revised]);
  assert.equal(audit.status,"READY");
  assert.equal(audit.periodCount,1);
  assert.equal(audit.versionCount,2);
  assert.equal(audit.periods[0].distinctHashes,2);
  assert.equal(audit.periods[0].distinctRevisions,2);
});
