
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_CONTRACT,
  evaluateProspectiveRefresh,
} from "../scripts/pc-writer/earnings-r5-forward-prospective-cycle-r1.mjs";

test("prospective cycle is shadow-only and nonblocking by contract",()=>{
  assert.equal(E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_CONTRACT.productionActivation,false);
  assert.equal(E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_CONTRACT.networkCalls,0);
  assert.equal(E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_CONTRACT.dbWrites,0);
  assert.equal(E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_CONTRACT.nonBlockingCaller,true);
  assert.equal(E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_CONTRACT.g4PitLedger,"E1-R5-G4-PIT-R1");
  assert.equal(E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_CONTRACT.g4PitNonBlocking,true);
  assert.equal(E1_R5_FORWARD_PROSPECTIVE_CYCLE_R1_CONTRACT.g4PitOrder,"BEFORE_HEAVY_SEC_CROSS_AUDIT");
});

test("new UTC day refreshes",()=>{
  const ledger={snapshots:[{snapshotDate:"2026-10-15",recordedAt:"2026-10-15T11:23:19Z"}]};
  const out=evaluateProspectiveRefresh({now:"2026-10-16T00:01:00Z",ledger,inputStats:[{mtime:"2026-10-15T11:00:00Z"}]});
  assert.equal(out.refresh,true);
  assert.equal(out.reason,"NEW_UTC_DAY");
});

test("changed source input refreshes",()=>{
  const ledger={snapshots:[{snapshotDate:"2026-10-15",recordedAt:"2026-10-15T11:23:19Z"}]};
  const out=evaluateProspectiveRefresh({now:"2026-10-15T12:00:00Z",ledger,inputStats:[{mtime:"2026-10-15T11:30:00Z"}]});
  assert.equal(out.refresh,true);
  assert.equal(out.reason,"INPUT_CHANGED_AFTER_LAST_SNAPSHOT");
});

test("same UTC day and unchanged inputs NOOP",()=>{
  const ledger={snapshots:[{snapshotDate:"2026-10-15",recordedAt:"2026-10-15T11:23:19Z"}]};
  const out=evaluateProspectiveRefresh({now:"2026-10-15T12:00:00Z",ledger,inputStats:[{mtime:"2026-10-15T11:20:00Z"}]});
  assert.equal(out.refresh,false);
  assert.equal(out.reason,"UNCHANGED_SAME_UTC_DAY");
});

test("G4 PIT is persisted before the heavy SEC cross-filing audit",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/earnings-r5-forward-prospective-cycle-r1.mjs",import.meta.url),"utf8");
  const g4Index=src.indexOf("const g4Pit=runG4PitNonBlocking");
  const crossIndex=src.indexOf("const cross=runEarningsR5SecCrossFilingAudit");
  assert.ok(g4Index>=0);
  assert.ok(crossIndex>=0);
  assert.ok(g4Index<crossIndex);
  assert.match(src,/g4PitOrder:"BEFORE_HEAVY_SEC_CROSS_AUDIT"/);
  assert.match(src,/CROSS_AUDIT_NOT_READY[\s\S]*\.\.\.g4Fields/);
  assert.match(src,/READINESS_NOT_READY[\s\S]*\.\.\.g4Fields/);
});

test("prospective cycle integrates G4 PIT as a nonblocking research ledger",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/earnings-r5-forward-prospective-cycle-r1.mjs",import.meta.url),"utf8");
  assert.match(src,/runG4PitLedgerR1/);
  assert.match(src,/g4PitStatus/);
  assert.match(src,/g4-pit-r1/);
  assert.match(src,/optionalG4Inputs/);
  assert.match(src,/catch\s*\(error\)/);
  assert.doesNotMatch(src,/productionActivation:true/);
});

test("local-cycle ignores stale prospective last-run after a timeout",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/local-cycle.mjs",import.meta.url),"utf8");
  assert.match(src,/earningsR5ProspectiveStartedAt=Date\.now\(\)/);
  assert.match(src,/candidateAt>=earningsR5ProspectiveStartedAt-1000/);
  assert.match(src,/earningsR5ProspectiveReport=fresh\?candidate:null/);
  assert.match(src,/staleReportIgnored:earningsR5ProspectiveReportStale/);
  assert.match(src,/earningsR5Prospective\?\.error\?\.code/);
});

test("local-cycle gives measured heavy E1-R5 path five minutes of headroom",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/local-cycle.mjs",import.meta.url),"utf8");
  assert.match(src,/earnings-r5-forward-prospective-cycle-r1\.mjs'\)\],\{windowsHide:true,stdio:\['ignore','pipe','pipe'\],timeout:5\*60000\}/);
  assert.doesNotMatch(src,/earnings-r5-forward-prospective-cycle-r1\.mjs'\)\],\{windowsHide:true,stdio:\['ignore','pipe','pipe'\],timeout:2\*60000\}/);
});

test("local-cycle integration is explicitly nonblocking",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/local-cycle.mjs",import.meta.url),"utf8");
  assert.match(src,/earnings-r5-forward-prospective-cycle-r1\.mjs/);
  assert.match(src,/local-earnings-r5-forward-prospective-last-run\.json/);
  assert.match(src,/researchEarningsR5Prospective/);
  assert.match(src,/nonBlocking:true/);
  assert.doesNotMatch(src,/if\s*\(\s*earningsR5Prospective\.status\s*!==\s*0\s*\)\s*process\.exitCode\s*=\s*1/);
});
