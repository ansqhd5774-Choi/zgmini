import test from "node:test";
import assert from "node:assert/strict";
import {buildSectorProspectiveReadiness,renderSectorProspectiveReadiness,SECTOR_FEAR_GREED_R1_REQUIRED_REFERENCE_OBSERVATIONS} from "../scripts/pc-writer/sector-fear-greed-r1-prospective-readiness.mjs";

function component(referenceObservations,status="PARTIAL"){return {status,referenceObservations};}

function readiness(){
  const sectors={};
  for(const [sectorId,ticker] of [["technology","XLK"],["communication","XLC"]])sectors[sectorId]={ticker,status:"PARTIAL",options:{status:"BLOCKED",reason:"OPTIONS_BLOCKED_BY_DATA_LICENSE"},components:{trend:component(415),breadth:component(272),demand:component(503),relativeStrength:component(414),volatility:component(477)}};
  return {sectors};
}

test("prospective monitor reports exact 756-reference gaps without calendar estimate",()=>{
  const report=buildSectorProspectiveReadiness(readiness(),{now:new Date("2026-10-12T00:00:00Z")});
  assert.equal(SECTOR_FEAR_GREED_R1_REQUIRED_REFERENCE_OBSERVATIONS,756);
  assert.equal(report.status,"ACCUMULATING");
  assert.equal(report.readinessDateEstimate,null);
  assert.equal(report.componentSummary.trend.maxRemaining,341);
  assert.equal(report.componentSummary.breadth.maxRemaining,484);
  assert.equal(report.componentSummary.demand.maxRemaining,253);
  assert.equal(report.componentSummary.relativeStrength.maxRemaining,342);
  assert.equal(report.componentSummary.volatility.maxRemaining,279);
  assert.equal(report.maxRemainingReferenceObservations,484);
  assert.equal(report.providerCalls,0);
  assert.equal(report.publicMutation,false);
  assert.equal(report.schedulerChanged,false);
  assert.equal(report.options.status,"BLOCKED");
});

test("prospective monitor treats READY component as zero remaining and never renormalizes options",()=>{
  const input=readiness();
  input.sectors.technology.components.trend=component(756,"READY");
  const report=buildSectorProspectiveReadiness(input);
  assert.equal(report.sectors.technology.components.trend.remainingReferenceObservations,0);
  assert.equal(report.sectors.technology.options.status,"BLOCKED");
  assert.ok(report.warnings.includes("OPTIONS_REMAIN_BLOCKED_AND_85_PERCENT_IS_NOT_RENORMALIZED"));
});

test("prospective text exposes count-only gaps and no date estimate",()=>{
  const text=renderSectorProspectiveReadiness(buildSectorProspectiveReadiness(readiness()));
  assert.match(text,/readinessDateEstimate=NONE/);
  assert.match(text,/T \| 415 \| 341/);
  assert.match(text,/B \| 272 \| 484/);
  assert.match(text,/REFERENCE_GAP_IS_COUNT_ONLY_NOT_A_CALENDAR_DATE_ESTIMATE/);
});
