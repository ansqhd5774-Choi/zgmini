import test from "node:test";
import assert from "node:assert/strict";
import {
  E1_R5_FISCAL_POLICY,
  E1_R5_INPUT_CONTRACT_VERSION,
  E1_R5_S5_CAPEX_FALLBACKS,
  E1_R5_SEC_CONTRACT,
  approvedS5FallbackForCik,
  canDeriveQ4FromAnnualMinusNineMonths,
} from "../lib/market-score/earnings-e1-r5-input-contract.mjs";

test("E1-R5 input R3 locks approved fiscal common-anchor policy",()=>{
  assert.equal(E1_R5_INPUT_CONTRACT_VERSION,"E1-R5-INPUT-R3");
  assert.equal(E1_R5_FISCAL_POLICY.status,"APPROVED");
  assert.equal(E1_R5_FISCAL_POLICY.mode,"ISSUER_FISCAL_COMMON_ANCHOR");
  assert.equal(E1_R5_FISCAL_POLICY.commonAnchorMetric,"revenue");
  assert.equal(E1_R5_FISCAL_POLICY.maxCurrentAgeDays,210);
  assert.equal(E1_R5_FISCAL_POLICY.fyFpBinding,"DIAGNOSTIC_ONLY");
  assert.deepEqual(E1_R5_FISCAL_POLICY.pairYearGapDays,{min:320,max:410});
  assert.equal(E1_R5_FISCAL_POLICY.sameQuarterEndToleranceDays,15);
  assert.equal(E1_R5_FISCAL_POLICY.sameQuarterDurationToleranceDays,15);
  assert.equal(E1_R5_FISCAL_POLICY.s8Policy,"CURRENT_NET_INCOME_ALIGNED_TO_CURRENT_REVENUE_ONLY");
  assert.equal(E1_R5_FISCAL_POLICY.q4EpsAnnualMinusNineMonths,"FORBIDDEN");
});

test("S5 fallback is an issuer-CIK whitelist, not a global tag expansion",()=>{
  assert.equal(E1_R5_S5_CAPEX_FALLBACKS.length,4);
  assert.deepEqual(E1_R5_S5_CAPEX_FALLBACKS.map(row=>`${row.cik}:${row.tag}`),[
    "0000008670:PaymentsToAcquireOtherPropertyPlantAndEquipment",
    "0001751788:PaymentsToAcquireMachineryAndEquipment",
    "0000059478:PaymentsToAcquireOtherPropertyPlantAndEquipment",
    "0000024741:PaymentsForCapitalImprovements",
  ]);
  assert.equal(approvedS5FallbackForCik("8670")?.ticker,"ADP");
  assert.equal(approvedS5FallbackForCik("1751788")?.ticker,"DOW");
  assert.equal(approvedS5FallbackForCik("9999999"),null);
  assert.equal(E1_R5_SEC_CONTRACT.s5FallbackPolicy.globalTagExpansion,false);
  assert.equal(E1_R5_SEC_CONTRACT.s5FallbackPolicy.productiveAssetsAccepted,false);
  assert.equal(E1_R5_SEC_CONTRACT.s5FallbackPolicy.customTagsAccepted,false);
  assert.ok(!E1_R5_S5_CAPEX_FALLBACKS.some(row=>/ProductiveAssets/.test(row.tag)));
});

test("approved SEC tags and Q4 EPS prohibition remain unchanged",()=>{
  assert.deepEqual(E1_R5_SEC_CONTRACT.tags.capex,[
    "PaymentsToAcquirePropertyPlantAndEquipment",
    "PaymentsForAdditionsToPropertyPlantAndEquipment",
  ]);
  assert.equal(E1_R5_SEC_CONTRACT.customTagPolicy,"REJECT_UNMAPPED_CUSTOM_TAGS");
  assert.equal(canDeriveQ4FromAnnualMinusNineMonths("eps"),false);
  for(const metric of ["revenue","operatingIncome","netIncome","operatingCashFlow","capex"]){
    assert.equal(canDeriveQ4FromAnnualMinusNineMonths(metric),true);
  }
});
