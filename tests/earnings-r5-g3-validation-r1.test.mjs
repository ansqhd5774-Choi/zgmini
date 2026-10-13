import assert from "node:assert/strict";
import test from "node:test";
import {
  E1_R5_G3_VALIDATION_R1_CONTRACT,
  evaluateG3Validation,
} from "../scripts/pc-writer/earnings-r5-g3-validation-r1.mjs";

const currentReplay=()=>[
  {month:"2026-04",comparableIssuerCount:6,s12aRaw:0,s13Raw:1/3},
  {month:"2026-05",comparableIssuerCount:16,s12aRaw:0,s13Raw:0.3125},
  {month:"2026-06",comparableIssuerCount:16,s12aRaw:0,s13Raw:0.3125},
  {month:"2026-07",comparableIssuerCount:27,s12aRaw:0.008178100863243967,s13Raw:0.5925925925925926},
  {month:"2026-08",comparableIssuerCount:23,s12aRaw:0.014104372355430182,s13Raw:0.782608695652174},
  {month:"2026-09",comparableIssuerCount:20,s12aRaw:0.01280458671763016,s13Raw:0.8},
  {month:"2026-10",comparableIssuerCount:19,s12aRaw:0.013186813186813062,s13Raw:0.7894736842105263},
];

test("G3 contract remains Shadow-only and does not change formula or weights",()=>{
  assert.equal(E1_R5_G3_VALIDATION_R1_CONTRACT.researchOnly,true);
  assert.equal(E1_R5_G3_VALIDATION_R1_CONTRACT.productionActivation,false);
  assert.equal(E1_R5_G3_VALIDATION_R1_CONTRACT.formulaChanged,false);
  assert.equal(E1_R5_G3_VALIDATION_R1_CONTRACT.weightChanged,false);
  assert.equal(E1_R5_G3_VALIDATION_R1_CONTRACT.pitBacktestClaim,false);
  assert.equal(E1_R5_G3_VALIDATION_R1_CONTRACT.minComparableIssuersPerPoint,10);
});

test("current 995-file replay evidence passes the non-redundancy gate after low-coverage April is excluded",()=>{
  const out=evaluateG3Validation(currentReplay());
  assert.equal(out.status,"EVIDENCE_PRESENT");
  assert.equal(out.reason,"S12A_S13_INCREMENTAL_INFORMATION_NON_REDUNDANT");
  assert.deepEqual(out.validMonths,["2026-05","2026-06","2026-07","2026-08","2026-09","2026-10"]);
  assert.equal(out.validMonthlyPointCount,6);
  assert.equal(out.minComparableIssuersPerPoint,16);
  assert.ok(Math.abs(out.spearmanS12aVsS13-0.7647058823529411)<1e-12);
  assert.ok(Math.abs(out.firstDifferenceSpearman-0.6)<1e-12);
  assert.ok(Math.abs(out.maxAbsLeaveOneOut-0.8947368421052632)<1e-12);
  assert.equal(out.rankVectorsIdentical,false);
  assert.ok(out.rankResidualShare>0.4);
});

test("fewer than six valid monthly points stays not evaluable",()=>{
  const out=evaluateG3Validation(currentReplay().slice(-5));
  assert.equal(out.status,"NOT_EVALUABLE");
  assert.equal(out.reason,"INSUFFICIENT_VALID_MONTHLY_POINTS");
});

test("identical ranks fail as redundant even with enough observations",()=>{
  const rows=[1,2,3,4,5,6].map((v,i)=>({
    month:`m${i+1}`,
    comparableIssuerCount:20,
    s12aRaw:v,
    s13Raw:v*10,
  }));
  const out=evaluateG3Validation(rows);
  assert.equal(out.status,"FAILED");
  assert.equal(out.reason,"RANK_VECTORS_IDENTICAL");
  assert.equal(out.rankVectorsIdentical,true);
});

test("near-duplicate monotonic signals fail the static redundancy ceiling",()=>{
  const x=[1,2,3,4,5,6,7];
  const y=[1,2,3,4,5,7,6];
  const rows=x.map((v,i)=>({month:`m${i+1}`,comparableIssuerCount:20,s12aRaw:v,s13Raw:y[i]}));
  const out=evaluateG3Validation(rows);
  assert.equal(out.status,"FAILED");
  assert.equal(out.reason,"STATIC_SPEARMAN_NEAR_DUPLICATE");
  assert.ok(Math.abs(out.spearmanS12aVsS13)>=0.9);
});
