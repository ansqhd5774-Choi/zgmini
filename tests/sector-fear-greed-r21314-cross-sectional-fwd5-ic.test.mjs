import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {spearmanR21314,summarizeR21314Date} from "../scripts/pc-writer/sector-fear-greed-r21314-cross-sectional-fwd5-ic.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE=path.join(ROOT,"scripts","pc-writer","sector-fear-greed-r21314-cross-sectional-fwd5-ic.mjs");

test("R2.13.14 Spearman ranks cross-sectional order without imposing a sign rule",()=>{
  assert.equal(spearmanR21314([1,2,3,4],[10,20,30,40]),1);
  assert.equal(spearmanR21314([1,2,3,4],[40,30,20,10]),-1);
  assert.equal(spearmanR21314([1,2],[10,20]),null);
});

test("R2.13.14 summarizes a mature 11-sector date and top-minus-bottom spread",()=>{
  const rows=Array.from({length:11},(_,i)=>({sectorId:`s${i}`,score:i+1,forwardReturn5:(i+1)/100,forwardDrawdown5:-(11-i)/100}));
  const out=summarizeR21314Date(rows);
  assert.equal(out.sectors,11);
  assert.equal(out.returnN,11);
  assert.equal(out.drawdownN,11);
  assert.equal(out.returnIC,1);
  assert.equal(out.drawdownIC,1);
  assert.equal(out.spread.k,3);
  assert.ok(out.spread.topMinusBottomReturn>0);
  assert.ok(out.spread.topMinusBottomDrawdown>0);
});

test("R2.13.14 remains local read-only and does not change production formulas, windows, or selection",()=>{
  const src=fs.readFileSync(SOURCE,"utf8");
  for(const token of [
    "providerCalls:0","rawRowsStored:false","publicMutation:false","d1Mutation:false","dbSchemaChanged:false",
    "productionFormulaChanged:false","schedulerChanged:false","referenceRequirementChanged:false","approvedR1ReferenceRequirement:756",
    "fillForwardFill:false","sourceFilesMutated:false","candidateSelected:false","selectionThresholdIntroduced:false",
    "optionsEquivalenceClaimed:false","newFormulaIntroduced:false","residualizationChanged:false","referenceWindowChanged:false","diagnosticOnly:true"
  ])assert.ok(src.includes(token),`missing safety token ${token}`);
  assert.match(src,/CROSS_SECTIONAL_FWD5/);
  assert.doesNotMatch(src,/fetch\s*\(/i);
  assert.doesNotMatch(src,/UPDATE\s+|INSERT\s+|DELETE\s+|wrangler|d1 execute/i);
});
