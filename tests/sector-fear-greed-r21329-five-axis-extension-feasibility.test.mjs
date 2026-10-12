import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {exactPriorWindow} from "../scripts/pc-writer/sector-fear-greed-r21329-five-axis-extension-feasibility.mjs";

const source=fs.readFileSync(new URL("../scripts/pc-writer/sector-fear-greed-r21329-five-axis-extension-feasibility.mjs",import.meta.url),"utf8");

test("R2.13.29 exact prior window takes only the requested contiguous tail of the local calendar",()=>{
  const dates=[];for(let i=1;i<=120;i++)dates.push(`2024-01-${String(i).padStart(2,"0")}`);
  const valid=["2024-01-01","2024-01-02","2024-01-03","2024-01-04","2024-01-05","2024-01-08"];
  assert.deepEqual(exactPriorWindow(valid,"2024-01-08",3),{sessions:3,start:"2024-01-03",end:"2024-01-05",enough:true});
});

test("R2.13.29 remains local-only and preserves production contracts",()=>{
  assert.match(source,/providerCalls:0/);
  assert.match(source,/rawRowsStored:false/);
  assert.match(source,/publicMutation:false/);
  assert.match(source,/d1Mutation:false/);
  assert.match(source,/dbSchemaChanged:false/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
  assert.match(source,/normalizationChanged:false/);
  assert.match(source,/weightsChanged:false/);
  assert.match(source,/productionBenchmarkSourceChanged:false/);
  assert.match(source,/candidateSelected:false/);
  assert.doesNotMatch(source,/\bfetch\s*\(/);
  assert.doesNotMatch(source,/wrangler\s+d1/i);
  assert.doesNotMatch(source,/\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b/i);
});
