import test from "node:test";
import assert from "node:assert/strict";
import {
  E1_R5_SEC_MATCHING_SAMPLE_R1_CONTRACT,
  E1_R5_SEC_MATCHING_SAMPLE_R1_VERSION,
  buildSecMatchingSample,
} from "../scripts/pc-writer/earnings-r5-sec-matching-sample-r1.mjs";

function fixture(){
  return {
    version:"E1-R5-SEC-CROSS-FILING-AUDIT-R1",
    status:"PASS",
    asOf:"2026-10-13T17:58:27.868Z",
    audit:{
      status:"PASS",
      comparableIssuerCount:3,
      issuerPairs:[
        {cik:"0000000003",currentAccessionNumber:"0003-26-000003",priorAccessionNumber:"0003-26-000001",priorFiled:"2026-07-01",periodKey:"FY2026",basis:"GAAP",currentMidpoint:2.1,previousMidpoint:2.0},
        {cik:"0000000001",currentAccessionNumber:"0001-26-000003",priorAccessionNumber:"0001-26-000001",priorFiled:"2026-07-02",periodKey:"FY2026",basis:"ADJUSTED",currentMidpoint:1.0,previousMidpoint:1.2},
        {cik:"0000000002",currentAccessionNumber:"0002-26-000003",priorAccessionNumber:"0002-26-000001",priorFiled:"2026-07-03",periodKey:"FY2026",basis:"GAAP",currentMidpoint:3.0,previousMidpoint:3.0},
      ],
    },
  };
}

test("contract remains research-only and non-production",()=>{
  assert.equal(E1_R5_SEC_MATCHING_SAMPLE_R1_CONTRACT.researchOnly,true);
  assert.equal(E1_R5_SEC_MATCHING_SAMPLE_R1_CONTRACT.networkCalls,0);
  assert.equal(E1_R5_SEC_MATCHING_SAMPLE_R1_CONTRACT.dbWrites,0);
  assert.equal(E1_R5_SEC_MATCHING_SAMPLE_R1_CONTRACT.productionActivation,false);
});

test("buildSecMatchingSample is deterministic and directionally descriptive only",()=>{
  const report=buildSecMatchingSample(fixture(),{limit:2});
  assert.equal(report.version,E1_R5_SEC_MATCHING_SAMPLE_R1_VERSION);
  assert.equal(report.status,"REVIEW_PENDING");
  assert.equal(report.sampleCount,2);
  assert.deepEqual(report.sample.map(row=>row.cik),["0000000001","0000000002"]);
  assert.equal(report.sample[0].direction,"DOWN");
  assert.equal(report.sample[1].direction,"SAME");
  assert.equal(report.sample[0].manualReviewStatus,"PENDING_SOURCE_TEXT_REVIEW");
  assert.equal(report.productionActivation,false);
});

test("buildSecMatchingSample fails closed on wrong source version",()=>{
  const source=fixture();
  source.version="WRONG";
  assert.throws(()=>buildSecMatchingSample(source),error=>error?.code==="CROSS_FILING_VERSION_MISMATCH");
});

test("buildSecMatchingSample fails closed when cross-filing audit did not pass",()=>{
  const source=fixture();
  source.status="FAILED";
  assert.throws(()=>buildSecMatchingSample(source),error=>error?.code==="CROSS_FILING_NOT_PASS");
});

test("buildSecMatchingSample rejects empty comparable pairs",()=>{
  const source=fixture();
  source.audit.issuerPairs=[];
  assert.throws(()=>buildSecMatchingSample(source),error=>error?.code==="NO_COMPARABLE_ISSUER_PAIRS");
});
