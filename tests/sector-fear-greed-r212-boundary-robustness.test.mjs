import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {summarizeR212BoundaryRobustnessGroups} from "../scripts/pc-writer/sector-fear-greed-r212-boundary-robustness.mjs";

test("R2.12 keeps sector groups isolated while measuring boundary distance",()=>{
  const groups=[
    {rolling:[{date:"2026-01-01",score:44.8},{date:"2026-01-02",score:60}],expanding:[{date:"2026-01-01",score:45.2},{date:"2026-01-02",score:61}]},
    {rolling:[{date:"2026-01-01",score:30}],expanding:[{date:"2026-01-01",score:31}]}
  ];
  const out=summarizeR212BoundaryRobustnessGroups(groups,[0,1,3,5]);
  assert.equal(out.baseline.n,3);
  assert.equal(out.baseline.mismatchCount,1);
  assert.equal(out.mismatchDistanceBuckets.le1,1);
  assert.equal(out.byBuffer["1"].mismatchCount,0);
  assert.equal(out.byBuffer["1"].matchShare,1);
});

test("R2.12 counts far-from-boundary mismatch separately",()=>{
  const groups=[{rolling:[{date:"2026-01-01",score:40}],expanding:[{date:"2026-01-01",score:50}]}];
  const out=summarizeR212BoundaryRobustnessGroups(groups,[0,3,5]);
  assert.equal(out.baseline.mismatchCount,1);
  assert.equal(out.mismatchDistanceBuckets.gt5,0);
  assert.equal(out.mismatchDistanceBuckets.gt3le5,1);
  assert.equal(out.byBuffer["3"].mismatchCount,1);
});

test("R2.12 implementation remains read-only shadow research",()=>{
  const source=fs.readFileSync(path.join(process.cwd(),"scripts/pc-writer/sector-fear-greed-r212-boundary-robustness.mjs"),"utf8");
  assert.doesNotMatch(source,/fetch\(|https?:\/\/|wrangler\s+d1|INSERT INTO|UPDATE\s+\w+\s+SET|publication-ledger/i);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/candidateSelected:false/);
});
