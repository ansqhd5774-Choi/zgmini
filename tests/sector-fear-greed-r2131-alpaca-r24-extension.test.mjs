import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {summarizeR2131Overlap} from "../scripts/pc-writer/sector-fear-greed-r2131-alpaca-r24-extension.mjs";

test("R2.13.1 overlap summary aligns scores by date",()=>{
  const reference=[{date:"2026-01-01",score:40},{date:"2026-01-02",score:50},{date:"2026-01-03",score:60}];
  const candidate=[{date:"2026-01-01",score:42},{date:"2026-01-03",score:58},{date:"2026-01-04",score:80}];
  const result=summarizeR2131Overlap(reference,candidate);
  assert.equal(result.n,2);
  assert.equal(result.mae,2);
  assert.equal(result.meanDelta,0);
  assert.equal(result.maxAbsDelta,2);
  assert.equal(result.firstDate,"2026-01-01");
  assert.equal(result.lastDate,"2026-01-03");
});

test("R2.13.1 reports empty overlap without inventing values",()=>{
  assert.deepEqual(summarizeR2131Overlap([{date:"2026-01-01",score:40}],[{date:"2026-01-02",score:50}]),{n:0,mae:null,meanDelta:null,maxAbsDelta:null,pearson:null,spearman:null,firstDate:null,lastDate:null});
});

test("R2.13.1 remains local read-only shadow research",()=>{
  const source=fs.readFileSync(new URL("../scripts/pc-writer/sector-fear-greed-r2131-alpaca-r24-extension.mjs",import.meta.url),"utf8");
  assert.match(source,/EXISTING_LOCAL_ALPACA_REUSE_ONLY/);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/publicMutation:false/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/r24ApprovedForProduction:false/);
  assert.match(source,/alpacaApprovedForProduction:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
  assert.doesNotMatch(source,/fetch\s*\(/);
  assert.doesNotMatch(source,/INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM/i);
});
