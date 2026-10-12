import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {scoreR21326TailSeries,smoothR21326Series,summarizeR21326Bands} from "../scripts/pc-writer/sector-fear-greed-r21326-tail-balance-historical-smoothed-validation.mjs";

test("R2.13.26 converts 1007 raw observations into exactly 252 trailing-756 normalized dates",()=>{
  const history=Array.from({length:1007},(_,i)=>({date:new Date(Date.UTC(2020,0,1+i)).toISOString().slice(0,10),tailBalance:i}));
  const out=scoreR21326TailSeries(history,756);
  assert.equal(out.length,252);
  assert.equal(out[0].score,100*(755.5/756));
  assert.equal(out.at(-1).score,100*(755.5/756));
});

test("R2.13.26 uses the approved 0.5 recursive smoothing seed rule",()=>{
  const out=smoothR21326Series([{date:"2026-01-01",score:20},{date:"2026-01-02",score:40},{date:"2026-01-03",score:80}],.5);
  assert.deepEqual(out.map(x=>x.score),[20,30,55]);
});

test("R2.13.26 band summary counts one-step and severe changes separately",()=>{
  const five=[{date:"2026-01-01",score:40},{date:"2026-01-02",score:20},{date:"2026-01-03",score:60}];
  const six=[{date:"2026-01-01",score:50},{date:"2026-01-02",score:60},{date:"2026-01-03",score:70}];
  const s=summarizeR21326Bands(five,six);
  assert.equal(s.n,3);
  assert.equal(s.changes,2);
  assert.equal(s.severe,1);
});

test("R2.13.26 remains provider-free and preserves Production contracts",()=>{
  const file=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../scripts/pc-writer/sector-fear-greed-r21326-tail-balance-historical-smoothed-validation.mjs");
  const src=fs.readFileSync(file,"utf8");
  assert.match(src,/providerCalls:0/);
  assert.match(src,/publicMutation:false/);
  assert.match(src,/d1Mutation:false/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.match(src,/referenceRequirementChanged:false/);
  assert.match(src,/normalizationChanged:false/);
  assert.match(src,/weightsChanged:false/);
  assert.match(src,/approvedR1ReferenceRequirement:756/);
  assert.doesNotMatch(src,/loadLocalProviders|APCA-API-KEY|fetch\(/);
  assert.doesNotMatch(src,/wrangler\s+(d1|deploy|publish)/i);
});
