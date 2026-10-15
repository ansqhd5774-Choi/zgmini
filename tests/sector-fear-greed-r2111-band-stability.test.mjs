import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {classifyR2111Band,smoothR2111Series,summarizeR2111BandPairs,summarizeR2111BandGroups} from "../scripts/pc-writer/sector-fear-greed-r2111-band-stability.mjs";

test("R2.11.1 classifies approved band cutpoints exactly",()=>{
  assert.equal(classifyR2111Band(24.999).name,"EXTREME_FEAR");
  assert.equal(classifyR2111Band(25).name,"FEAR");
  assert.equal(classifyR2111Band(44.999).name,"FEAR");
  assert.equal(classifyR2111Band(45).name,"NEUTRAL");
  assert.equal(classifyR2111Band(55.999).name,"NEUTRAL");
  assert.equal(classifyR2111Band(56).name,"GREED");
  assert.equal(classifyR2111Band(75.999).name,"GREED");
  assert.equal(classifyR2111Band(76).name,"EXTREME_GREED");
});

test("R2.11.1 applies approved 0.5 smoothing recursively",()=>{
  const rows=[{date:"2026-01-01",score:20},{date:"2026-01-02",score:40},{date:"2026-01-03",score:60}];
  assert.deepEqual(smoothR2111Series(rows).map(row=>row.score),[20,30,45]);
});

test("R2.11.1 summarizes band mismatches and keeps sector groups isolated",()=>{
  const a={rolling:[{date:"2026-01-01",score:44},{date:"2026-01-02",score:60}],expanding:[{date:"2026-01-01",score:46},{date:"2026-01-02",score:61}]};
  const b={rolling:[{date:"2026-01-01",score:20},{date:"2026-01-02",score:80}],expanding:[{date:"2026-01-01",score:70},{date:"2026-01-02",score:80}]};
  const one=summarizeR2111BandPairs(a.rolling,a.expanding);
  assert.equal(one.n,2);
  assert.equal(one.matchCount,1);
  assert.equal(one.mismatchCount,1);
  const pooled=summarizeR2111BandGroups([a,b]);
  assert.equal(pooled.n,4);
  assert.equal(pooled.matchCount,2);
  assert.equal(pooled.mismatchCount,2);
  assert.equal(pooled.severeMismatchCount,1);
  assert.equal(pooled.oppositeSideCount,1);
});

test("R2.11.1 implementation remains read-only shadow research",()=>{
  const source=fs.readFileSync(path.join(process.cwd(),"scripts/pc-writer/sector-fear-greed-r2111-band-stability.mjs"),"utf8");
  assert.doesNotMatch(source,/fetch\(|https?:\/\/|wrangler\s+d1|INSERT INTO|UPDATE\s+\w+\s+SET|publication-ledger/i);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/candidateSelected:false/);
});
