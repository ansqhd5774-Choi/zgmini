import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../worker/diagnostic-v1-canary.mjs",import.meta.url),"utf8");

test("diagnostic live collector imports and concurrently calls B1-R1 runtime gate",()=>{
  assert.match(source,/import\s*\{\s*collectBreadthB1R1Runtime\s*\}\s*from\s*['"]\.\.\/lib\/market-score\/breadth-b1-r1-runtime\.mjs['"]/);
  assert.match(source,/tracked\('breadth',\(\)=>collectBreadthB1R1Runtime\(\{env, fetchImpl\}\)\)/);
});

test("diagnostic live collector exposes B1 through external publicDomainScores and permits other approved public domains",()=>{
  assert.match(source,/external\s*:\s*\{[\s\S]*?publicDomainScores\s*:\s*\{[^}]*\bbreadth\b[^}]*\}/);
});

test("B1 public breadth wiring does not repurpose diagnostic Asset Bubble breadthScoreRows",()=>{
  assert.match(source,/breadthScoreRows\s*:\s*\[\s*\]/);
  assert.match(source,/assetBreadthPointInTime\s*:\s*'PARTIAL'/);
});
