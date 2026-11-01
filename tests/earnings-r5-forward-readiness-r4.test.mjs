import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  E1_R5_FORWARD_READINESS_R4_VERSION,
  E1_R5_G2_MANUAL_REVIEW_R1_VERSION,
  fingerprintSecMatchingSourceReview,
  auditG2ManualReview,
  buildForwardReadinessR4,
  runForwardReadinessR4,
} from "../scripts/pc-writer/earnings-r5-forward-readiness-r4.mjs";

const HASH_A="a".repeat(64);
const HASH_B="b".repeat(64);

function crossReport(){
  return {
    version:"E1-R5-SEC-CROSS-FILING-AUDIT-R1",
    status:"PASS",
    backfillStatus:"COMPLETE",
    audit:{
      status:"PASS",
      currentIssuerCount:499,
      integrity:{currentMissing:0,currentHashMismatch:0,currentHashMissing:0,historyMissing:0,historyHashMismatch:0,historyHashMissing:0,historyPathInvalid:0},
      currentParse:{readyIssuers:41,ambiguousIssuers:2,noGuidanceIssuers:458},
      comparableIssuerCount:16,
      comparableIssuerCoverage:16/499,
      s12aRaw:0.014996767937944317,
      s13Raw:0.8125,
      directions:{up:14,same:1,down:1},
      issuerMissingReasons:{NO_CURRENT_COMPARABLE_GUIDANCE:458,NO_PRIOR_COMPARABLE_GUIDANCE:25},
    },
  };
}
function cfoDocument(){
  return {releases:[
    {surveyYear:2026,surveyQuarter:2,releaseAt:"2026-06-24T14:00:00Z",storedAt:"2026-10-13T15:00:00Z",currentYearGrowth:6.5,nextYearGrowth:7.4,sourceHash:HASH_A,revisionId:"2026Q2_INITIAL"},
    {surveyYear:2026,surveyQuarter:3,releaseAt:"2026-09-23T14:00:00Z",storedAt:"2026-10-13T15:05:00Z",currentYearGrowth:7.7,nextYearGrowth:7.2,sourceHash:HASH_B,revisionId:"2026Q3_INITIAL"},
  ]};
}
function ledger(){
  return {version:"E1-R5-SEC-HISTORY-BACKFILL-R1",completed:{
    a:{filed:"2026-04-20",acceptedAt:"2026-04-20T20:00:00Z",storedAt:"2026-10-13T16:00:00Z"},
    b:{filed:"2026-07-20",acceptedAt:"2026-07-20T20:00:00Z",storedAt:"2026-10-13T16:01:00Z"},
  }};
}
function sourceReview(){
  return {
    version:"E1-R5-SEC-MATCHING-SOURCE-REVIEW-R1",
    status:"REVIEW_READY",
    sourceAsOf:"2026-10-15T13:27:06.331Z",
    sampleCount:2,
    rows:[
      {sampleIndex:1,cik:"0000002969",currentAccessionNumber:"0000002969-26-000034",priorAccessionNumber:"0000002969-26-000018",periodKey:"FY2026",basis:"ADJUSTED",currentMidpoint:13.440000000000001,previousMidpoint:13.125},
      {sampleIndex:2,cik:"0000031791",currentAccessionNumber:"0000031791-26-000022",priorAccessionNumber:"0000031791-26-000016",periodKey:"FY2026",basis:"ADJUSTED",currentMidpoint:5.35,previousMidpoint:5.25},
    ],
  };
}
function manualReview(source=sourceReview()){
  return {
    version:E1_R5_G2_MANUAL_REVIEW_R1_VERSION,
    status:"PASS",
    reviewMethod:"HUMAN_SOURCE_TEXT_REVIEW",
    reviewDate:"2026-10-15",
    reviewer:"MANUAL_SOURCE_TEXT_REVIEW",
    sourceVersion:source.version,
    sourceFingerprint:fingerprintSecMatchingSourceReview(source),
    reviewedCount:source.sampleCount,
    passCount:source.sampleCount,
    requiredChecks:["ISSUER","TARGET_PERIOD","EPS_METRIC","GAAP_OR_ADJUSTED_BASIS","USD_PER_SHARE_UNIT","CURRENT_RANGE_OR_MIDPOINT","PRIOR_RANGE_OR_MIDPOINT"],
    decisions:source.rows.map(row=>({sampleIndex:row.sampleIndex,decision:"PASS"})),
  };
}

test("R4 records completed G2 review without activating production",()=>{
  const source=sourceReview();
  const out=buildForwardReadinessR4({crossReport:crossReport(),cfoDocument:cfoDocument(),historyLedger:ledger(),sourceReview:source,manualReview:manualReview(source),asOf:"2026-10-15T14:00:00Z"});
  assert.equal(E1_R5_FORWARD_READINESS_R4_VERSION,"E1-R5-FORWARD-READINESS-R4");
  assert.equal(out.status,"RAW_READY_VALIDATION_PENDING");
  assert.equal(out.rawComponentsReady,true);
  assert.equal(out.productionReady,false);
  assert.equal(out.g2ManualReview.status,"PASS");
  assert.equal(out.validationGates.find(row=>row.id==="G2_MATCHING_ACCURACY").status,"PASS");
  assert.equal(out.nextRequiredEvidence.includes("MANUAL_SAMPLE_REVIEW_OF_SEC_PERIOD_BASIS_UNIT_MATCHING"),false);
  assert.equal(out.validationGates.find(row=>row.id==="G3_S12A_S13_SPEARMAN").status,"NOT_EVALUABLE");
  assert.equal(out.productionActivation,false);
});

test("R4 rejects stale or mismatched G2 evidence",()=>{
  const source=sourceReview();
  const manual=manualReview(source);
  manual.sourceFingerprint="0".repeat(64);
  const audit=auditG2ManualReview({sourceReview:source,manualReview:manual});
  assert.equal(audit.status,"BLOCKED");
  assert.equal(audit.reason,"MANUAL_REVIEW_SOURCE_FINGERPRINT_MISMATCH");
});

test("R4 leaves G2 pending when manual evidence is absent",()=>{
  const source=sourceReview();
  const audit=auditG2ManualReview({sourceReview:source,manualReview:null});
  assert.equal(audit.status,"PARTIAL_AUTOMATED_EVIDENCE");
  assert.equal(audit.reason,"MANUAL_SAMPLE_ACCURACY_NOT_YET_RECORDED");
});

test("R4 end-to-end runner writes local reports only",()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r5-readiness-r4-"));
  try{
    const reports=path.join(base,"manual-input","e1-r5","reports");
    const cfoDir=path.join(base,"manual-input","e1-r5","cfo-survey-r1");
    const secDir=path.join(base,"manual-input","e1-r5","sec-guidance-r17");
    fs.mkdirSync(reports,{recursive:true});
    fs.mkdirSync(cfoDir,{recursive:true});
    fs.mkdirSync(secDir,{recursive:true});
    const source=sourceReview();
    fs.writeFileSync(path.join(reports,"e1-r5-sec-cross-filing-audit-last.json"),JSON.stringify(crossReport(),null,2));
    fs.writeFileSync(path.join(cfoDir,"releases.json"),JSON.stringify(cfoDocument(),null,2));
    fs.writeFileSync(path.join(secDir,"historical-backfill-r1.json"),JSON.stringify(ledger(),null,2));
    fs.writeFileSync(path.join(reports,"e1-r5-sec-matching-source-review-r1-last.json"),JSON.stringify(source,null,2));
    fs.writeFileSync(path.join(reports,"e1-r5-sec-matching-manual-review-r1-last.json"),JSON.stringify(manualReview(source),null,2));
    const result=runForwardReadinessR4({base,asOf:"2026-10-15T14:00:00Z"});
    assert.equal(result.report.g2ManualReview.status,"PASS");
    assert.equal(fs.existsSync(result.jsonReport),true);
    assert.equal(fs.existsSync(result.textReport),true);
    const text=fs.readFileSync(result.textReport,"utf8");
    assert.match(text,/G2_MANUAL_REVIEW: PASS/);
    assert.match(text,/GATE G2_MATCHING_ACCURACY: PASS/);
    assert.match(text,/PRODUCTION_READY: NO/);
    assert.match(text,/PRODUCTION_ACTIVATION: NO/);
  }finally{
    fs.rmSync(base,{recursive:true,force:true});
  }
});
