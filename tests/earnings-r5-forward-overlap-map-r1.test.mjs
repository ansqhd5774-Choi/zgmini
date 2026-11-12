import test from "node:test";
import assert from "node:assert/strict";
import {
  E1_R5_G4_COMPONENT_MAP,
  E1_R5_FORWARD_OVERLAP_MAP_R1_CONTRACT,
  buildG4OverlapReadiness,
} from "../scripts/pc-writer/inspect-earnings-r5-forward-overlap-map-r1.mjs";

test("G4 component map binds S1 S2 S6 and Growth to approved sources without changing production",()=>{
  assert.equal(E1_R5_G4_COMPONENT_MAP.S1.componentKey,"epsGrowthStrength");
  assert.equal(E1_R5_G4_COMPONENT_MAP.S2.componentKey,"revenueGrowth");
  assert.equal(E1_R5_G4_COMPONENT_MAP.S6.componentKey,"beaCorporateProfitGrowth");
  assert.equal(E1_R5_G4_COMPONENT_MAP.S6.seriesCode,"A051RC");
  assert.equal(E1_R5_G4_COMPONENT_MAP.Growth.localTable,"market_public_snapshots_v1");
  assert.equal(E1_R5_G4_COMPONENT_MAP.S1.e1r4Use,"OVERLAP_PROXY_ONLY");
  assert.equal(E1_R5_G4_COMPONENT_MAP.S2.e1r4Use,"OVERLAP_PROXY_ONLY");
  assert.equal(E1_R5_FORWARD_OVERLAP_MAP_R1_CONTRACT.productionActivation,false);
  assert.equal(E1_R5_FORWARD_OVERLAP_MAP_R1_CONTRACT.formulaChanged,false);
  assert.equal(E1_R5_FORWARD_OVERLAP_MAP_R1_CONTRACT.weightChanged,false);
  assert.equal(E1_R5_FORWARD_OVERLAP_MAP_R1_CONTRACT.normalizationChanged,false);
  assert.equal(E1_R5_FORWARD_OVERLAP_MAP_R1_CONTRACT.gatePassThresholdsDefined,false);
});

test("one CFO revision remains not evaluable even when source mapping is complete",()=>{
  const out=buildG4OverlapReadiness({
    cfoRevisionCount:1,
    s1AlignedCount:1,
    s2AlignedCount:1,
    s6AlignedCount:1,
    growthAlignedCount:1,
  });
  assert.equal(out.sourceMapComplete,true);
  assert.equal(out.descriptiveEvaluable,false);
  assert.equal(out.status,"NOT_EVALUABLE_INSUFFICIENT_MULTI_PERIOD_ALIGNMENT");
  assert.equal(out.productionGatePass,false);
});

test("multi-point alignment becomes descriptive only and never a production gate pass",()=>{
  const out=buildG4OverlapReadiness({
    cfoRevisionCount:3,
    s1AlignedCount:3,
    s2AlignedCount:3,
    s6AlignedCount:3,
    growthAlignedCount:3,
  });
  assert.equal(out.descriptiveEvaluable,true);
  assert.equal(out.status,"DESCRIPTIVE_MULTI_POINT_ALIGNMENT_READY_NO_GATE_THRESHOLD");
  assert.equal(out.productionGatePass,false);
});
