import test from "node:test";
import assert from "node:assert/strict";
import {buildEarningsR5RawComponents} from "../lib/market-score/earnings-e1-r5-shadow-calculator.mjs";
import {
  buildCurrentFrameRawComponents,
  classifyCurrentFrameS13,
} from "../scripts/pc-writer/earnings-r5-current-frame-audit.mjs";

function approvedAudit(){
  return {
    version:"E1-R5-R33-GUIDANCE-CANDIDATE-AUDIT-R1",
    policyVersion:"E1-R5-R33-GUIDANCE-CANDIDATE-R1",
    status:"COMPLETE",
    r17Complete:true,
    checkpointEntries:499,
    hashMatched:499,
    missingDocuments:0,
    hashMismatch:0,
    r33DirectionCounts:{
      UP:111,
      FLAT:42,
      DOWN:4,
      WITHDRAW:1,
      MIXED:1,
      UNCLASSIFIED:340,
    },
    r33Eligible:157,
    r33NetBreadth:107/157,
  };
}

test("current-frame S13 uses only approved R33 audit and preserves S1-S12 raw components",()=>{
  const baseInput={issuerRows:[],unitLaborCostYoY:null};
  const baseline=buildEarningsR5RawComponents(baseInput);
  const integrated=buildCurrentFrameRawComponents({...baseInput,guidanceR33Audit:approvedAudit()});

  for(const [key,value] of Object.entries(baseline.components)){
    if(key==="guidanceBreadth")continue;
    assert.deepEqual(integrated.components[key],value,`${key} changed`);
  }

  assert.equal(integrated.s13Binding.status,"READY");
  assert.equal(integrated.components.guidanceBreadth.raw,107/157);
  assert.equal(integrated.components.guidanceBreadth.eligibleCount,157);
  assert.equal(integrated.components.guidanceBreadth.totalCount,499);
  assert.equal(integrated.components.guidanceBreadth.source,"SEC_R33");
});

test("current-frame path does not accept legacy generic guidance",()=>{
  const raw=buildCurrentFrameRawComponents({
    issuerRows:[],
    unitLaborCostYoY:null,
    guidance:{up:999,flat:0,down:0},
  });
  assert.equal(raw.components.guidanceBreadth.raw,null);
  assert.equal(raw.s13Binding.status,"INVALID");
  assert.equal(raw.s13Binding.reason,"R33_AUDIT_REQUIRED");
});

test("current-frame S13 state distinguishes missing from rejected audit",()=>{
  assert.deepEqual(
    classifyCurrentFrameS13({auditFileExists:false,auditParsed:false,binding:null}),
    {status:"MISSING",reason:"R33_AUDIT_FILE_MISSING",source:"SEC_R33",sourceVersion:null},
  );
  assert.deepEqual(
    classifyCurrentFrameS13({auditFileExists:true,auditParsed:false,binding:null}),
    {status:"REJECTED",reason:"R33_AUDIT_JSON_INVALID",source:"SEC_R33",sourceVersion:null},
  );

  const tampered=approvedAudit();
  tampered.hashMismatch=1;
  tampered.hashMatched=498;
  const raw=buildCurrentFrameRawComponents({issuerRows:[],guidanceR33Audit:tampered});
  const state=classifyCurrentFrameS13({auditFileExists:true,auditParsed:true,binding:raw.s13Binding});
  assert.equal(state.status,"REJECTED");
  assert.equal(state.reason,"R33_DOCUMENT_INTEGRITY_FAILED");
  assert.equal(raw.components.guidanceBreadth.raw,null);
});

test("approved R33 maps to READY without changing production policy",()=>{
  const raw=buildCurrentFrameRawComponents({issuerRows:[],guidanceR33Audit:approvedAudit()});
  const state=classifyCurrentFrameS13({auditFileExists:true,auditParsed:true,binding:raw.s13Binding});
  assert.equal(state.status,"READY");
  assert.equal(state.reason,null);
  assert.equal(state.source,"SEC_R33");
  assert.equal(state.sourceVersion,"E1-R5-R33-GUIDANCE-CANDIDATE-R1");
});
