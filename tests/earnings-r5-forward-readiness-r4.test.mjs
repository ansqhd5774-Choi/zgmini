import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  E1_R5_FORWARD_READINESS_R4_CONTRACT,
  E1_R5_FORWARD_READINESS_R4_VERSION,
  E1_R5_SEC_MATCHING_MANUAL_REVIEW_R1_VERSION,
  buildForwardReadinessR4,
  buildSecMatchingManualReviewTemplate,
  evaluateSecMatchingManualReview,
  evaluateSourceReviewCurrentBinding,
  runForwardReadinessR4,
} from "../scripts/pc-writer/earnings-r5-forward-readiness-r4.mjs";

const HASH_A="a".repeat(64);
const HASH_B="b".repeat(64);

function comparablePairs(){
  return [
    {cik:"0000104169",currentAccessionNumber:"0000104169-26-000145",priorAccessionNumber:"0000104169-26-000095",periodKey:"FY2027",basis:"ADJUSTED",currentMidpoint:2.835,previousMidpoint:2.8},
    {cik:"0001699150",currentAccessionNumber:"0001628280-26-051068",priorAccessionNumber:"0001628280-26-033204",periodKey:"FY2026",basis:"ADJUSTED",currentMidpoint:3.51,previousMidpoint:3.51},
  ];
}
function crossReport(){
  return {
    version:"E1-R5-SEC-CROSS-FILING-AUDIT-R1",
    status:"PASS",
    backfillStatus:"COMPLETE",
    asOf:"2026-10-14T00:00:00Z",
    audit:{
      status:"PASS",
      currentIssuerCount:499,
      integrity:{currentMissing:0,currentHashMismatch:0,currentHashMissing:0,historyMissing:0,historyHashMismatch:0,historyHashMissing:0,historyPathInvalid:0},
      currentParse:{readyIssuers:43,ambiguousIssuers:2,noGuidanceIssuers:456},
      comparableIssuerCount:19,
      comparableIssuerCoverage:19/499,
      issuerPairs:comparablePairs(),
      s12aRaw:0.013186813186813062,
      s13Raw:0.7894736842105263,
      directions:{up:16,same:2,down:1},
      issuerMissingReasons:{NO_PRIOR_COMPARABLE_GUIDANCE:24},
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
    sourceVersion:"E1-R5-SEC-MATCHING-SAMPLE-R1",
    sourceAsOf:"2026-10-14T00:00:00Z",
    sampleCount:2,
    sourceReadyCount:2,
    flaggedYearRangeCount:0,
    manualAccuracyGate:"PENDING_HUMAN_SOURCE_TEXT_DECISION",
    rows:comparablePairs().map((row,index)=>({sampleIndex:index+1,...row})),
  };
}
function passEvidence(review=sourceReview()){
  return {...buildSecMatchingManualReviewTemplate(review),decision:"PASS",reviewedAt:"2026-10-14T01:00:00Z"};
}

test("R4 contract is shadow-only and preserves approved production baseline",()=>{
  assert.equal(E1_R5_FORWARD_READINESS_R4_VERSION,"E1-R5-FORWARD-READINESS-R4");
  assert.equal(E1_R5_SEC_MATCHING_MANUAL_REVIEW_R1_VERSION,"E1-R5-SEC-MATCHING-MANUAL-REVIEW-R1");
  assert.equal(E1_R5_FORWARD_READINESS_R4_CONTRACT.productionActivation,false);
  assert.equal(E1_R5_FORWARD_READINESS_R4_CONTRACT.productionBaseline,"E1-R4");
  assert.equal(E1_R5_FORWARD_READINESS_R4_CONTRACT.networkCalls,0);
  assert.equal(E1_R5_FORWARD_READINESS_R4_CONTRACT.dbWrites,0);
  assert.equal(E1_R5_FORWARD_READINESS_R4_CONTRACT.formulaChanged,false);
  assert.equal(E1_R5_FORWARD_READINESS_R4_CONTRACT.weightChanged,false);
});

test("current source review binds to exact cross-report pairs",()=>{
  const binding=evaluateSourceReviewCurrentBinding(sourceReview(),crossReport());
  assert.equal(binding.status,"MATCH");
  assert.equal(binding.matchedCount,2);
});

test("old source review cannot be reused after a current cross-report pair changes",()=>{
  const review=sourceReview();
  const current=crossReport();
  current.audit.issuerPairs[0]={...current.audit.issuerPairs[0],currentMidpoint:2.84};
  const binding=evaluateSourceReviewCurrentBinding(review,current);
  assert.equal(binding.status,"STALE");
  assert.equal(binding.reason,"SOURCE_REVIEW_CROSS_REPORT_PAIR_MISMATCH");
});

test("source review from another cross-report asOf is stale even if pair values match",()=>{
  const current=crossReport();
  current.asOf="2026-10-14T04:00:00Z";
  const binding=evaluateSourceReviewCurrentBinding(sourceReview(),current);
  assert.equal(binding.status,"STALE");
  assert.equal(binding.reason,"SOURCE_REVIEW_CROSS_REPORT_AS_OF_MISMATCH");
});

test("missing manual evidence keeps G2 partial without changing raw readiness",()=>{
  const out=buildForwardReadinessR4({crossReport:crossReport(),cfoDocument:cfoDocument(),historyLedger:ledger(),sourceReview:sourceReview(),manualEvidence:null,asOf:"2026-10-14T02:00:00Z"});
  const g2=out.validationGates.find(row=>row.id==="G2_MATCHING_ACCURACY");
  assert.equal(out.status,"RAW_READY_VALIDATION_PENDING");
  assert.equal(out.rawComponentsReady,true);
  assert.equal(g2.status,"PARTIAL_AUTOMATED_EVIDENCE");
  assert.equal(g2.reason,"MANUAL_REVIEW_EVIDENCE_MISSING");
  assert.equal(g2.evidence.sourceBindingStatus,"MATCH");
  assert.equal(out.productionReady,false);
  assert.deepEqual(out.approvedWeights,{s12a:4,s12b:3,s13:3,futureBlock:10});
  assert.equal(out.nextRequiredEvidence.includes("MANUAL_SAMPLE_REVIEW_OF_SEC_PERIOD_BASIS_UNIT_MATCHING"),true);
});

test("exact PASS evidence elevates only G2 and removes the manual-review requirement",()=>{
  const review=sourceReview();
  const evidence=passEvidence(review);
  const out=buildForwardReadinessR4({crossReport:crossReport(),cfoDocument:cfoDocument(),historyLedger:ledger(),sourceReview:review,manualEvidence:evidence,asOf:"2026-10-14T02:00:00Z"});
  const g2=out.validationGates.find(row=>row.id==="G2_MATCHING_ACCURACY");
  assert.equal(g2.status,"EVIDENCE_PRESENT");
  assert.equal(g2.reason,"MANUAL_SAMPLE_REVIEW_EXACT_MATCH_PASS");
  assert.equal(out.secMatchingManualReview.evidencePresent,true);
  assert.equal(out.secMatchingManualReview.sourceBindingStatus,"MATCH");
  assert.equal(out.nextRequiredEvidence.includes("MANUAL_SAMPLE_REVIEW_OF_SEC_PERIOD_BASIS_UNIT_MATCHING"),false);
  assert.equal(out.normalization.status,"NOT_READY");
  assert.equal(out.productionReady,false);
  assert.equal(out.productionActivation,false);
  assert.equal(out.formulaChanged,false);
  assert.equal(out.weightChanged,false);
});

test("matching manual evidence still cannot pass against a stale source review",()=>{
  const review=sourceReview();
  const evidence=passEvidence(review);
  const current=crossReport();
  current.audit.issuerPairs[0]={...current.audit.issuerPairs[0],currentMidpoint:2.84};
  const out=buildForwardReadinessR4({crossReport:current,cfoDocument:cfoDocument(),historyLedger:ledger(),sourceReview:review,manualEvidence:evidence,asOf:"2026-10-14T02:00:00Z"});
  const g2=out.validationGates.find(row=>row.id==="G2_MATCHING_ACCURACY");
  assert.equal(g2.status,"PARTIAL_AUTOMATED_EVIDENCE");
  assert.equal(g2.reason,"SOURCE_REVIEW_CROSS_REPORT_PAIR_MISMATCH");
  assert.equal(out.secMatchingManualReview.evidencePresent,false);
});

test("sample drift rejects stale manual evidence",()=>{
  const review=sourceReview();
  const evidence=passEvidence(review);
  const drifted=structuredClone(review);
  drifted.rows[0].currentMidpoint=2.84;
  const checked=evaluateSecMatchingManualReview(drifted,evidence);
  assert.equal(checked.status,"PARTIAL_AUTOMATED_EVIDENCE");
  assert.equal(checked.reason,"MANUAL_REVIEW_SAMPLE_FINGERPRINT_MISMATCH");
  assert.equal(checked.evidencePresent,false);
});

test("sourceAsOf drift rejects stale manual evidence",()=>{
  const review=sourceReview();
  const evidence=passEvidence(review);
  const drifted={...review,sourceAsOf:"2026-10-14T03:00:00Z"};
  const checked=evaluateSecMatchingManualReview(drifted,evidence);
  assert.equal(checked.status,"PARTIAL_AUTOMATED_EVIDENCE");
  assert.equal(checked.reason,"MANUAL_REVIEW_SOURCE_AS_OF_MISMATCH");
});

test("runner writes an approval template and consumes exact local evidence without DB or Production writes",()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r5-readiness-r4-"));
  try{
    const reports=path.join(base,"manual-input","e1-r5","reports");
    const cfoDir=path.join(base,"manual-input","e1-r5","cfo-survey-r1");
    const secDir=path.join(base,"manual-input","e1-r5","sec-guidance-r17");
    const manualDir=path.join(base,"manual-input","e1-r5","manual-review");
    fs.mkdirSync(reports,{recursive:true});fs.mkdirSync(cfoDir,{recursive:true});fs.mkdirSync(secDir,{recursive:true});fs.mkdirSync(manualDir,{recursive:true});
    fs.writeFileSync(path.join(reports,"e1-r5-sec-cross-filing-audit-last.json"),JSON.stringify(crossReport(),null,2));
    fs.writeFileSync(path.join(cfoDir,"releases.json"),JSON.stringify(cfoDocument(),null,2));
    fs.writeFileSync(path.join(secDir,"historical-backfill-r1.json"),JSON.stringify(ledger(),null,2));
    fs.writeFileSync(path.join(reports,"e1-r5-sec-matching-source-review-r1-last.json"),JSON.stringify(sourceReview(),null,2));

    const first=runForwardReadinessR4({base,asOf:"2026-10-14T02:00:00Z"});
    assert.equal(first.report.validationGates.find(row=>row.id==="G2_MATCHING_ACCURACY").status,"PARTIAL_AUTOMATED_EVIDENCE");
    assert.equal(fs.existsSync(first.manualTemplateFile),true);
    const template=JSON.parse(fs.readFileSync(first.manualTemplateFile,"utf8"));
    assert.equal(template.decision,"PENDING");

    const evidence={...template,decision:"PASS",reviewedAt:"2026-10-14T02:30:00Z"};
    fs.writeFileSync(path.join(manualDir,"e1-r5-sec-matching-manual-review-r1.json"),JSON.stringify(evidence,null,2));
    const second=runForwardReadinessR4({base,asOf:"2026-10-14T03:00:00Z"});
    assert.equal(second.report.validationGates.find(row=>row.id==="G2_MATCHING_ACCURACY").status,"EVIDENCE_PRESENT");
    assert.equal(second.report.productionReady,false);
    assert.equal(second.report.dbWrites,0);
    assert.equal(second.report.productionActivation,false);
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test("R4 CMD wrapper remains CMD-only and local-only",()=>{
  const source=fs.readFileSync(new URL("../ZGMINI_EARNINGS_R5_FORWARD_READINESS_R4.cmd",import.meta.url),"utf8");
  assert.match(source,/earnings-r5-forward-readiness-r4\.mjs/i);
  assert.doesNotMatch(source,/curl|wrangler|powershell|wsl|--publish/i);
});
