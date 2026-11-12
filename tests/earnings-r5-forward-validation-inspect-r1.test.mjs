import test from "node:test";
import assert from "node:assert/strict";
import {
  E1_R5_FORWARD_VALIDATION_INSPECT_R1_CONTRACT,
  spearmanCorrelation,
  analyzeForwardShadowLedger,
  buildCfoRevisions,
  alignCfoRevisionsToGrowth,
  aggregateEarningsOutcomes,
  alignForwardOutcomes,
} from "../scripts/pc-writer/inspect-earnings-r5-forward-validation-r1.mjs";

test("research-only inspector cannot activate production or change formula contracts",()=>{
  assert.equal(E1_R5_FORWARD_VALIDATION_INSPECT_R1_CONTRACT.researchOnly,true);
  assert.equal(E1_R5_FORWARD_VALIDATION_INSPECT_R1_CONTRACT.productionActivation,false);
  assert.equal(E1_R5_FORWARD_VALIDATION_INSPECT_R1_CONTRACT.networkCalls,0);
  assert.equal(E1_R5_FORWARD_VALIDATION_INSPECT_R1_CONTRACT.dbWrites,0);
  assert.equal(E1_R5_FORWARD_VALIDATION_INSPECT_R1_CONTRACT.formulaChanged,false);
  assert.equal(E1_R5_FORWARD_VALIDATION_INSPECT_R1_CONTRACT.weightChanged,false);
  assert.equal(E1_R5_FORWARD_VALIDATION_INSPECT_R1_CONTRACT.normalizationChanged,false);
  assert.equal(E1_R5_FORWARD_VALIDATION_INSPECT_R1_CONTRACT.productionBaseline,"E1-R4");
  assert.equal(E1_R5_FORWARD_VALIDATION_INSPECT_R1_CONTRACT.gatePassThresholdsDefined,false);
});

test("G3 analysis computes descriptive Spearman without declaring gate pass",()=>{
  const ledger={snapshots:[
    {snapshotDate:"2026-10-13",recordedAt:"2026-10-13T18:00:00Z",sourceStoredAt:"2026-10-13T17:59:00Z",sourceAsOf:"2026-10-13T17:58:00Z",checkpoint:"a",state:{raw:{s12a:0.1,s13:0.2}}},
    {snapshotDate:"2026-10-15",recordedAt:"2026-10-15T12:00:00Z",sourceStoredAt:"2026-10-15T11:59:00Z",sourceAsOf:"2026-10-15T11:58:00Z",checkpoint:"b",state:{raw:{s12a:0.2,s13:0.4}}},
  ]};
  const out=analyzeForwardShadowLedger(ledger);
  assert.equal(out.snapshotCount,2);
  assert.equal(out.g3.pairCount,2);
  assert.equal(out.g3.spearman,1);
  assert.equal(out.g3.status,"DESCRIPTIVE_ONLY_THRESHOLD_NOT_APPROVED");
  assert.equal(out.g3.productionGatePass,false);
  assert.equal(out.g6.pitLedgerIntegrity,"PASS");
  assert.equal(out.g6.productionGatePass,false);
});

test("PIT ledger integrity catches look-ahead and duplicate checkpoints",()=>{
  const ledger={snapshots:[
    {snapshotDate:"2026-10-13",recordedAt:"2026-10-13T18:00:00Z",sourceStoredAt:"2026-10-13T18:01:00Z",sourceAsOf:"2026-10-13T17:58:00Z",checkpoint:"a",state:{raw:{s12a:0.1,s13:0.2}}},
    {snapshotDate:"2026-10-12",recordedAt:"2026-10-12T18:00:00Z",sourceStoredAt:"2026-10-12T17:59:00Z",sourceAsOf:"2026-10-12T17:58:00Z",checkpoint:"a",state:{raw:{s12a:0.2,s13:0.1}}},
  ]};
  const out=analyzeForwardShadowLedger(ledger);
  assert.equal(out.g6.pitLedgerIntegrity,"FAIL");
  assert.equal(out.g6.timeViolationCount,1);
  assert.equal(out.g6.orderViolationCount,1);
  assert.equal(out.g6.duplicateCheckpointCount,1);
});

test("CFO revision builder and Growth alignment remain descriptive",()=>{
  const cfo=buildCfoRevisions([
    {status:"READY",surveyYear:2026,surveyQuarter:1,releaseAt:"2026-03-20T12:00:00Z",rollingForwardRevenueGrowth:6},
    {status:"READY",surveyYear:2026,surveyQuarter:2,releaseAt:"2026-06-20T12:00:00Z",rollingForwardRevenueGrowth:7},
    {status:"READY",surveyYear:2026,surveyQuarter:3,releaseAt:"2026-09-20T12:00:00Z",rollingForwardRevenueGrowth:6.5},
  ]);
  assert.equal(cfo.readyPeriodCount,3);
  assert.equal(cfo.readyRevisionCount,2);
  assert.deepEqual(cfo.revisions.map(x=>x.s12bRaw),[1,-0.5]);
  const aligned=alignCfoRevisionsToGrowth(cfo.revisions,[
    {snapshotKey:"2026-06-21",storedAt:Date.parse("2026-06-21T00:00:00Z"),score:55},
    {snapshotKey:"2026-09-21",storedAt:Date.parse("2026-09-21T00:00:00Z"),score:48},
  ]);
  assert.equal(aligned.alignedCount,2);
  assert.equal(aligned.status,"DESCRIPTIVE_ALIGNMENT_READY");
  assert.equal(aligned.productionGatePass,false);
});

test("earnings outcomes aggregate stored issuer facts and align future quarters",()=>{
  const outcomes=aggregateEarningsOutcomes([
    {period_end:"2026-06-30",metric:"epsGrowth",value:0.1},
    {period_end:"2026-06-30",metric:"epsGrowth",value:0.3},
    {period_end:"2026-06-30",metric:"revenueGrowth",value:0.05},
    {period_end:"2026-06-30",metric:"operatingMargin",value:0.2},
    {period_end:"2026-09-30",metric:"epsGrowth",value:-0.1},
    {period_end:"2026-09-30",metric:"epsGrowth",value:0.2},
    {period_end:"2026-09-30",metric:"revenueGrowth",value:0.02},
    {period_end:"2026-09-30",metric:"operatingMargin",value:0.18},
    {period_end:"2026-12-31",metric:"epsGrowth",value:0.4},
    {period_end:"2026-12-31",metric:"revenueGrowth",value:0.1},
    {period_end:"2026-12-31",metric:"operatingMargin",value:0.21},
  ]);
  assert.equal(outcomes.length,3);
  assert.equal(outcomes[0].epsMedian,0.2);
  assert.equal(outcomes[0].epsImprovementBreadth,1);
  const aligned=alignForwardOutcomes([
    {snapshotDate:"2026-08-01",recordedAt:"2026-08-01T00:00:00Z",state:{raw:{s12a:0.1,s12b:0.2,s13:0.3}}},
  ],outcomes);
  assert.equal(aligned.next1QAlignedCount,1);
  assert.equal(aligned.next2QAlignedCount,1);
  assert.equal(aligned.rows[0].next1Q.periodEnd,"2026-09-30");
  assert.equal(aligned.rows[0].next2Q.periodEnd,"2026-12-31");
  assert.equal(aligned.productionGatePass,false);
});

test("Spearman handles ties and invalid inputs conservatively",()=>{
  assert.equal(spearmanCorrelation([1,1,2],[10,10,20]),1);
  assert.equal(spearmanCorrelation([1],[2]),null);
  assert.equal(spearmanCorrelation([1,Number.NaN],[2,3]),null);
});
