import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {scoreR21323TailBalance,combineR21323Current} from "../scripts/pc-writer/sector-fear-greed-r21323-tail-balance-current-shadow-score.mjs";

test("R2.13.23 reproduces trailing-reference percentile with midrank ties",()=>{
  const unique=scoreR21323TailBalance([{date:"2026-10-06",tailBalance:1},{date:"2026-10-07",tailBalance:2},{date:"2026-10-08",tailBalance:3},{date:"2026-10-09",tailBalance:4}],4);
  assert.equal(unique.ready,true);
  assert.equal(unique.normalizableDates,1);
  assert.equal(unique.date,"2026-10-09");
  assert.equal(unique.score,87.5);
  const ties=scoreR21323TailBalance([{date:"2026-10-06",tailBalance:1},{date:"2026-10-07",tailBalance:2},{date:"2026-10-08",tailBalance:2},{date:"2026-10-09",tailBalance:2}],4);
  assert.equal(ties.score,62.5);
});

test("R2.13.23 keeps the fixed 15 percent speculative slot without 85 percent renormalization",()=>{
  assert.equal(combineR21323Current(60,80),72);
  assert.equal(combineR21323Current(50,0),50);
  assert.equal(combineR21323Current(50,100),65);
});

test("R2.13.23 does not score before the full approved reference is available",()=>{
  const partial=scoreR21323TailBalance([{date:"2026-10-08",tailBalance:1},{date:"2026-10-09",tailBalance:2}],3);
  assert.equal(partial.ready,false);
  assert.equal(partial.score,null);
  assert.equal(partial.normalizableDates,0);
});

test("R2.13.23 is local read-only and does not mutate Production contracts",()=>{
  const file=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../scripts/pc-writer/sector-fear-greed-r21323-tail-balance-current-shadow-score.mjs");
  const src=fs.readFileSync(file,"utf8");
  assert.match(src,/providerCalls:0/);
  assert.match(src,/publicMutation:false/);
  assert.match(src,/d1Mutation:false/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.match(src,/referenceRequirementChanged:false/);
  assert.match(src,/productionBenchmarkSourceChanged:false/);
  assert.match(src,/normalizationChanged:false/);
  assert.match(src,/weightsChanged:false/);
  assert.match(src,/candidateSelected:false/);
  assert.match(src,/optionsEquivalenceClaimed:false/);
  assert.match(src,/SPEC_WEIGHT=\.15/);
  assert.match(src,/SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS!==SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS/);
  assert.doesNotMatch(src,/\bfetch\s*\(/);
  assert.doesNotMatch(src,/wrangler\s+(d1|deploy|publish)/i);
  assert.doesNotMatch(src,/DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|UPDATE\s+\w+\s+SET|INSERT\s+INTO/i);
});
