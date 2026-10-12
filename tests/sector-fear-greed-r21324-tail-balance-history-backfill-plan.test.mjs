import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {TARGET_NORMALIZED_DATES,FEATURE_WARMUP_SESSIONS,PRIOR_CALENDAR_START,PRIOR_CALENDAR_END,buildR21324NyseSessions,buildR21324Plan,summarizeR21324GroupUniverse,summarizeR21324SectorCoverage} from "../scripts/pc-writer/sector-fear-greed-r21324-tail-balance-history-backfill-plan.mjs";

test("R2.13.24 fixed NYSE prior calendar contains exactly 251 sessions",()=>{
  const sessions=buildR21324NyseSessions();
  assert.equal(PRIOR_CALENDAR_START,"2022-07-12");
  assert.equal(PRIOR_CALENDAR_END,"2023-07-11");
  assert.equal(sessions.length,251);
  assert.equal(sessions[0],"2022-07-12");
  assert.equal(sessions.at(-1),"2023-07-11");
  assert.ok(!sessions.includes("2022-09-05"));
  assert.ok(!sessions.includes("2023-07-04"));
});

test("R2.13.24 maps 756 raw observations to the 251-session minimum plan for 252 normalized dates",()=>{
  const plan=buildR21324Plan({currentRawObservations:756,currentUnderlyingSessions:816});
  assert.equal(TARGET_NORMALIZED_DATES,252);
  assert.equal(FEATURE_WARMUP_SESSIONS,60);
  assert.equal(plan.targetRawObservations,1007);
  assert.equal(plan.missingRawObservations,251);
  assert.equal(plan.theoreticalUnderlyingRequired,1067);
  assert.equal(plan.theoreticalAdditionalUnderlying,251);
  assert.equal(plan.neededPriorSessions,251);
  assert.equal(plan.targetStart,"2022-07-12");
  assert.equal(plan.targetEnd,"2023-07-11");
  assert.equal(plan.plannedSessions,251);
  assert.equal(plan.projectedRawObservations,1007);
  assert.equal(plan.projectedNormalizedDates,252);
  assert.equal(plan.targetMet,true);
});

test("R2.13.24 shortens the prior window if additional current raw observations already exist",()=>{
  const plan=buildR21324Plan({currentRawObservations:757,currentUnderlyingSessions:817});
  assert.equal(plan.neededPriorSessions,250);
  assert.equal(plan.targetStart,"2022-07-13");
  assert.equal(plan.targetEnd,"2023-07-11");
  assert.equal(plan.projectedNormalizedDates,252);
});

test("R2.13.24 PIT and existing group universe readiness require at least eight members",()=>{
  const rows=Array.from({length:8},(_,i)=>({ticker:`T${i+1}`}));
  const universe=summarizeR21324GroupUniverse([rows]);
  const byTicker=Object.fromEntries(rows.map((row,i)=>[row.ticker,[{dateAdded:"2020-01-01",dateRemoved:null,sectorId:"technology"}]]));
  const coverage=summarizeR21324SectorCoverage({byTicker},universe.symbols,["2022-07-12"]);
  assert.equal(universe.symbolCount,8);
  assert.equal(coverage.technology.minPitActive,8);
  assert.equal(coverage.technology.minGroupSymbols,8);
  assert.equal(coverage.technology.pitReady,true);
  assert.equal(coverage.technology.groupUniverseReady,true);
});

test("R2.13.24 remains local read-only and does not mutate Production or reference contracts",()=>{
  const file=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../scripts/pc-writer/sector-fear-greed-r21324-tail-balance-history-backfill-plan.mjs");
  const src=fs.readFileSync(file,"utf8");
  assert.match(src,/providerCalls:0/);
  assert.match(src,/backfillExecuted:false/);
  assert.match(src,/publicMutation:false/);
  assert.match(src,/d1Mutation:false/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.match(src,/referenceRequirementChanged:false/);
  assert.match(src,/sectorEtfBackfillRequired:false/);
  assert.doesNotMatch(src,/data\.alpaca\.markets/);
  assert.doesNotMatch(src,/loadLocalProviders/);
  assert.doesNotMatch(src,/wrangler\s+(d1|deploy|publish)/i);
});
