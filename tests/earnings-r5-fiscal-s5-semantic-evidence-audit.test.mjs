import test from "node:test";
import assert from "node:assert/strict";
import {classifyCandidateTag,summarizeStrictRecoveries} from "../scripts/pc-writer/earnings-r5-fiscal-s5-semantic-evidence-audit.mjs";

test("semantic classifier only treats direct PP&E and flight equipment as strict",()=>{
  assert.equal(classifyCandidateTag("PaymentsToAcquireOtherPropertyPlantAndEquipment"),"STRICT_PP_E");
  assert.equal(classifyCandidateTag("PaymentsForFlightEquipment"),"STRICT_PP_E");
  assert.equal(classifyCandidateTag("PaymentsToAcquireOilAndGasPropertyAndEquipment"),"REVIEW_OIL_GAS");
  assert.equal(classifyCandidateTag("PaymentsToAcquireOilAndGasProperty"),"REVIEW_OIL_GAS");
  assert.equal(classifyCandidateTag("PaymentsToAcquireProductiveAssets"),"REJECT");
});

test("strict summary excludes multi-candidate issuer from unique-safe count",()=>{
  const rows=[
    {cik:"1",tag:"PaymentsToAcquireOtherPropertyPlantAndEquipment"},
    {cik:"2",tag:"PaymentsForFlightEquipment"},
    {cik:"3",tag:"PaymentsToAcquireOtherPropertyPlantAndEquipment"},
    {cik:"3",tag:"PaymentsToAcquireOilAndGasPropertyAndEquipment"},
    {cik:"4",tag:"PaymentsToAcquireOilAndGasProperty"},
  ];
  const s=summarizeStrictRecoveries(rows,277,401);
  assert.equal(s.strictUnique,2);
  assert.equal(s.strictAny,3);
  assert.equal(s.ambiguousMulti,1);
  assert.equal(s.reviewOnly,1);
  assert.equal(s.strictUniqueCombined,279);
  assert.equal(s.strictAnyCombined,280);
});

test("strict semantic audit does not modify production policy",()=>{
  const s=summarizeStrictRecoveries([],277,401);
  assert.equal(s.strictUniqueNeed,4);
  assert.equal(s.strictAnyNeed,4);
});
