import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../worker/diagnostic-v1-canary.mjs",import.meta.url),"utf8");

test("E1-R3 public collector is wired and legacy E1-R1 runtime is not active",()=>{
  assert.match(source,/import\s*\{\s*readEarningsE1R3StoredScore\s*\}\s*from\s*['"]\.\.\/lib\/market-score\/sec-earnings-e1-r3-provider\.mjs['"]/);
  assert.match(source,/fetchEarnings:\s*readEarningsE1R3StoredScore/);
  assert.match(source,/impl\.fetchEarnings\(\{\s*asOf\s*,\s*db\s*:\s*env\?\.DB\s*\}\)/s);
  assert.doesNotMatch(source,/collectEarningsE1R1Runtime/);
});

test("E1-R3 adds only required SEC/Wikipedia hosts to the counted fetch allowlist",()=>{
  assert.match(source,/'data\.sec\.gov'/);
  assert.match(source,/'en\.wikipedia\.org'/);
});

test("E1-R3 enters only CM-R1 publicDomainScores and keeps diagnostic earnings separate",()=>{
  assert.match(source,/publicDomainScores\s*:\s*\{\s*breadth\s*,\s*earnings\s*\}/s);
  assert.match(source,/earningsScores\s*:\s*null/);
});

test("E1-R3 runtime remains current-only; no historical earnings backfill wiring is created",()=>{
  assert.doesNotMatch(source,/earningsHistoryRows\s*:/);
  assert.doesNotMatch(source,/historicalEarningsScores\s*:/);
  assert.match(source,/earningsHistoricalPointInTime:\s*'RESEARCH_VALIDATED_RUNTIME_CURRENT_ONLY'/);
});
