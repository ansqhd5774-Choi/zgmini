import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {R21310_CANDIDATES,summarizeR21310Candidate} from "../scripts/pc-writer/sector-fear-greed-r21310-r23-vs-r24-head-to-head.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const scriptPath=path.join(here,"..","scripts","pc-writer","sector-fear-greed-r21310-r23-vs-r24-head-to-head.mjs");

test("R2.13.10 compares only the existing R23 and R24 candidates without auto-selection",()=>{
  assert.deepEqual(R21310_CANDIDATES,["R23","R24"]);
});

test("R2.13.10 candidate summary keeps source stability, redundancy and economic signs separate",()=>{
  const sectors={
    a:{canonicalStatus:"READY_CROSS_SECTION",alpacaStatus:"READY_CROSS_SECTION",canonicalCurrent:10,alpacaCurrent:11,sourceSpearman:.8,redundancy:{maxAbs:.4,fiveAxis:.2},economic:{corrTrailing20:.3,corrRv20:-.2,corrForward20:-.1,corrForward60:.1,corrForwardDrawdown20:-.05,corrForwardDrawdown60:.03}},
    b:{canonicalStatus:"READY_CROSS_SECTION",alpacaStatus:"READY_CROSS_SECTION",canonicalCurrent:20,alpacaCurrent:21,sourceSpearman:.9,redundancy:{maxAbs:.6,fiveAxis:-.3},economic:{corrTrailing20:.1,corrRv20:.1,corrForward20:.2,corrForward60:-.2,corrForwardDrawdown20:.04,corrForwardDrawdown60:-.02}},
    c:{canonicalStatus:"READY_CROSS_SECTION",alpacaStatus:"READY_CROSS_SECTION",canonicalCurrent:30,alpacaCurrent:31,sourceSpearman:1,redundancy:{maxAbs:.5,fiveAxis:.1},economic:{corrTrailing20:-.1,corrRv20:-.1,corrForward20:-.2,corrForward60:.3,corrForwardDrawdown20:-.03,corrForwardDrawdown60:.01}},
  };
  const out=summarizeR21310Candidate(sectors);
  assert.equal(out.canonicalReady,3);
  assert.equal(out.alpacaReady,3);
  assert.equal(out.sourceSpearmanMin,.8);
  assert.equal(out.sourceSpearmanMedian,.9);
  assert.equal(out.currentSourceRankSpearman,1);
  assert.equal(out.redundancyMaxAbsMedian,.5);
  assert.equal(out.redundancyFiveAxisAbsMedian,.2);
  assert.equal(out.economic.signs.trailing20Positive,2);
  assert.equal(out.economic.signs.rv20Negative,2);
  assert.equal(out.economic.signs.forward20Negative,2);
  assert.equal(out.economic.signs.drawdown20Negative,2);
});

test("R2.13.10 remains local read-only and introduces no new formula or options-equivalence claim",()=>{
  const source=fs.readFileSync(scriptPath,"utf8");
  assert.equal(/\bfetch\s*\(/.test(source),false);
  assert.equal(/wrangler\s+d1|publication-ledger|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM/i.test(source),false);
  assert.match(source,/buildSectorSpeculativeCandidateR23/);
  assert.match(source,/buildSectorSpeculativeCandidateR24/);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
  assert.match(source,/candidateSelected:false/);
  assert.match(source,/selectionThresholdIntroduced:false/);
  assert.match(source,/optionsEquivalenceClaimed:false/);
  assert.match(source,/r23ApprovedForProduction:false/);
  assert.match(source,/r24ApprovedForProduction:false/);
  assert.match(source,/currentR24WeightsChanged:false/);
  assert.match(source,/newFormulaIntroduced:false/);
});
