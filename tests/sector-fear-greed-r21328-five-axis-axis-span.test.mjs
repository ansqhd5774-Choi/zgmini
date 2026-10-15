import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const SOURCE="scripts/pc-writer/sector-fear-greed-r21328-five-axis-axis-span.mjs";
const text=fs.readFileSync(SOURCE,"utf8");

test("R2.13.28 remains provider-free and preserves Production contracts",()=>{
  assert.match(text,/providerCalls:0/);
  assert.match(text,/publicMutation:false/);
  assert.match(text,/productionFormulaChanged:false/);
  assert.match(text,/referenceRequirementChanged:false/);
  assert.match(text,/approvedR1ReferenceRequirement:756/);
});

test("R2.13.28 inspects all five scored axis spans at the unchanged 252 diagnostic window",()=>{
  assert.match(text,/const WINDOW=252/);
  for(const name of ["trend","breadth","demand","relativeStrength","volatility"]) assert.match(text,new RegExp(name));
  assert.match(text,/scoreRawAxis/);
  assert.match(text,/buildCompositeSeries/);
  assert.match(text,/limiters/);
});
