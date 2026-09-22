import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../worker/diagnostic-v1-canary.mjs",import.meta.url),"utf8");

test("E1-R1 collector imports and calls the entitlement-guarded runtime",()=>{
  assert.match(source,/import\s*\{\s*collectEarningsE1R1Runtime\s*\}\s*from\s*['"]\.\.\/lib\/market-score\/earnings-e1-r1-runtime\.mjs['"]/);
  assert.match(source,/const\s+earnings\s*=\s*await\s+collectEarningsE1R1Runtime\(\{\s*env\s*,\s*fetchImpl\s*\}\)/s);
});

test("E1-R1 enters only CM-R1 publicDomainScores and keeps diagnostic earnings separate",()=>{
  assert.match(source,/publicDomainScores\s*:\s*\{\s*breadth\s*,\s*earnings\s*\}/s);
  assert.match(source,/earningsScores\s*:\s*null/);
});

test("E1-R1 does not create historical backfill wiring from current fundamentals",()=>{
  assert.doesNotMatch(source,/earningsHistoryRows\s*:/);
  assert.doesNotMatch(source,/historicalEarningsScores\s*:/);
});
