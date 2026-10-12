import test from "node:test";
import assert from "node:assert/strict";
import {classifyInventoryCandidate,summarizeInventoryCandidates} from "../scripts/pc-writer/earnings-r5-fiscal-s5-exhaustive-total-capex-inventory.mjs";

test("approved tag with FSDS direct quarter has highest-priority classification",()=>{
  assert.equal(classifyInventoryCandidate({approvedTag:true,custom:false,standardRecoverable:false,fsdsDirect:true}),"APPROVED_TAG_FSDS_DIRECT");
});

test("standard total presentation requires recoverable standard value",()=>{
  assert.equal(classifyInventoryCandidate({approvedTag:false,custom:false,standardRecoverable:true,fsdsDirect:false}),"STANDARD_TOTAL_PRESENTATION");
  assert.equal(classifyInventoryCandidate({approvedTag:false,custom:false,standardRecoverable:false,fsdsDirect:false}),"STANDARD_TOTAL_PRESENTATION_REVIEW");
});

test("custom direct remains research-only class",()=>{
  assert.equal(classifyInventoryCandidate({approvedTag:false,custom:true,standardRecoverable:false,fsdsDirect:true}),"CUSTOM_TOTAL_PRESENTATION_DIRECT");
});

test("summary deduplicates issuer recovery and keeps custom separate",()=>{
  const rows=[
    {cik:"1",classification:"APPROVED_TAG_FSDS_DIRECT"},
    {cik:"1",classification:"STANDARD_TOTAL_PRESENTATION"},
    {cik:"2",classification:"STANDARD_TOTAL_PRESENTATION"},
    {cik:"3",classification:"CUSTOM_TOTAL_PRESENTATION_DIRECT"},
  ];
  const s=summarizeInventoryCandidates(rows,277,401);
  assert.equal(s.approvedFsdsDirect,1);
  assert.equal(s.standardTotal,2);
  assert.equal(s.customDirect,1);
  assert.equal(s.strictStandardRecovered,2);
  assert.equal(s.strictStandardCombined,279);
  assert.equal(s.withCustomRecovered,3);
  assert.equal(s.withCustomCombined,280);
});
