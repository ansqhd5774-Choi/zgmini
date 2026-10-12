import test from "node:test";
import assert from "node:assert/strict";
import {E1_R5_COMPONENTS} from "../lib/market-score/earnings-e1-r5-contract.mjs";
import {
  E1_R5_S13_R33_SHADOW_POLICY,
  bindR33GuidanceAuditToS13,
  buildEarningsR5RawComponentsWithS13R33,
  buildEarningsR5ShadowWithS13R33,
} from "../lib/market-score/earnings-e1-r5-s13-r33-shadow.mjs";

function r33Audit(overrides={}){
  return {
    version:"E1-R5-R33-GUIDANCE-CANDIDATE-AUDIT-R1",
    policyVersion:"E1-R5-R33-GUIDANCE-CANDIDATE-R1",
    status:"COMPLETE",
    r17Complete:true,
    checkpointEntries:499,
    hashMatched:499,
    missingDocuments:0,
    hashMismatch:0,
    r33DirectionCounts:{UP:111,FLAT:42,DOWN:4,WITHDRAW:1,MIXED:1,UNCLASSIFIED:340},
    r33Eligible:157,
    r33NetBreadth:107/157,
    ...overrides,
  };
}

function input(){
  return {
    issuerRows:[
      {cik:"1",sectorId:"tech",isFinancial:false,current:{eps:2,revenue:110,operatingIncome:20,netIncome:15,operatingCashFlow:30,capex:10},priorYear:{eps:1,revenue:100,operatingIncome:15,netIncome:10}},
      {cik:"2",sectorId:"tech",isFinancial:false,current:{eps:-1,revenue:210,operatingIncome:10,netIncome:-2,operatingCashFlow:20,capex:5},priorYear:{eps:-2,revenue:200,operatingIncome:5,netIncome:-5}},
      {cik:"3",sectorId:"finance",isFinancial:true,current:{eps:1,revenue:150,operatingIncome:999,netIncome:8,operatingCashFlow:999,capex:1},priorYear:{eps:2,revenue:150,operatingIncome:999,netIncome:9}},
    ],
    beaCorporateProfits:{current:4709.5,priorYear:4500},
    producerIndustries:[
      {industryId:"334",priorRevenue:100,inputCurrent:103,inputLag3m:100,outputCurrent:101.5,outputLag3m:100},
      {industryId:"335",priorRevenue:200,inputCurrent:102,inputLag3m:100,outputCurrent:101,outputLag3m:100},
    ],
    unitLaborCostYoY:1.4,
    forwardEpsRows:[{current:2,prior30d:1.8},{current:-0.5,prior30d:-0.8}],
    guidanceR33Audit:r33Audit(),
  };
}

function historyFor(raw){
  return [
    {value:raw-3,availableAt:"2025-01-01T00:00:00Z"},
    {value:raw-2,availableAt:"2025-04-01T00:00:00Z"},
    {value:raw-1,availableAt:"2025-07-01T00:00:00Z"},
    {value:raw+1,availableAt:"2025-10-01T00:00:00Z"},
  ];
}

test("approved R33 audit is bound to S13 with the reviewed 499-document counts",()=>{
  const binding=bindR33GuidanceAuditToS13(r33Audit());
  assert.equal(binding.status,"READY");
  assert.equal(binding.source,"SEC_R33");
  assert.equal(binding.sourceVersion,"E1-R5-R33-GUIDANCE-CANDIDATE-R1");
  assert.deepEqual(binding.guidance,{up:111,flat:42,down:4});
  assert.equal(binding.eligibleCount,157);
  assert.equal(binding.totalCount,499);
  assert.ok(Math.abs(binding.netBreadth-107/157)<1e-12);
  assert.deepEqual(binding.excludedCounts,{withdraw:1,mixed:1,unclassified:340});
  assert.equal(E1_R5_S13_R33_SHADOW_POLICY.productionActivation,false);
  assert.equal(E1_R5_S13_R33_SHADOW_POLICY.formulaChanged,false);
  assert.equal(E1_R5_S13_R33_SHADOW_POLICY.scoringGateChanged,false);
});

test("official S13 shadow wrapper ignores legacy generic guidance and requires R33 audit provenance",()=>{
  const value=input();
  delete value.guidanceR33Audit;
  value.guidance={up:999,flat:0,down:0};
  const raw=buildEarningsR5RawComponentsWithS13R33(value);
  assert.equal(raw.status,"PARTIAL");
  assert.ok(raw.missing.includes("S13"));
  assert.equal(raw.s13Binding.status,"INVALID");
  assert.equal(raw.s13Binding.reason,"R33_AUDIT_REQUIRED");
  assert.equal(raw.components.guidanceBreadth.raw,null);
  assert.equal(raw.components.guidanceBreadth.source,"SEC_R33");
});

test("S13 raw value comes from R33 eligible UP/FLAT/DOWN counts without formula or weight changes",()=>{
  const raw=buildEarningsR5RawComponentsWithS13R33(input());
  assert.equal(raw.status,"READY");
  assert.equal(raw.components.guidanceBreadth.source,"SEC_R33");
  assert.equal(raw.components.guidanceBreadth.sourceVersion,"E1-R5-R33-GUIDANCE-CANDIDATE-R1");
  assert.equal(raw.components.guidanceBreadth.eligibleCount,157);
  assert.equal(raw.components.guidanceBreadth.totalCount,499);
  assert.ok(Math.abs(raw.components.guidanceBreadth.raw-107/157)<1e-12);
  assert.equal(E1_R5_COMPONENTS.guidanceBreadth.weight,0.03);
  assert.equal(E1_R5_COMPONENTS.guidanceBreadth.direction,"UP");
});

test("tampered or structurally incomplete R33 audit cannot populate S13",()=>{
  const value=input();
  value.guidanceR33Audit=r33Audit({hashMatched:498});
  const raw=buildEarningsR5RawComponentsWithS13R33(value);
  assert.equal(raw.status,"PARTIAL");
  assert.ok(raw.missing.includes("S13"));
  assert.equal(raw.s13Binding.status,"INVALID");
  assert.equal(raw.s13Binding.reason,"R33_DOCUMENT_INTEGRITY_FAILED");
});

test("S13 R33 wrapper reuses the existing Shadow scoring contract and remains inactive",()=>{
  const value=input();
  const raw=buildEarningsR5RawComponentsWithS13R33(value);
  const histories=Object.fromEntries(Object.keys(E1_R5_COMPONENTS).map(key=>[key,historyFor(raw.components[key].raw)]));
  const minPoints=Object.fromEntries(Object.keys(E1_R5_COMPONENTS).map(key=>[key,4]));
  const scored=buildEarningsR5ShadowWithS13R33(value,{
    histories,
    asOf:"2026-10-12T00:00:00Z",
    historyPolicy:{status:"TEST",operationalApproved:false,minPoints},
  });
  assert.equal(scored.status,"READY");
  assert.equal(scored.active,false);
  assert.equal(scored.reweighted,false);
  assert.equal(scored.components.guidanceBreadth.source,"SEC_R33");
  assert.equal(scored.s13Binding.status,"READY");
});
