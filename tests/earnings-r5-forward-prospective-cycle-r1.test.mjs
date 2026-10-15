
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

test("local-cycle integration is explicitly nonblocking",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/local-cycle.mjs",import.meta.url),"utf8");
  assert.match(src,/earnings-r5-forward-prospective-cycle-r1\.mjs/);
  assert.match(src,/local-earnings-r5-forward-prospective-last-run\.json/);
  assert.match(src,/researchEarningsR5Prospective/);
  assert.match(src,/nonBlocking:true/);
  assert.doesNotMatch(src,/if\s*\(\s*earningsR5Prospective\.status\s*!==\s*0\s*\)\s*process\.exitCode\s*=\s*1/);
});
