import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {pairedFeatureCorrelation} from "../scripts/pc-writer/analyze-dollar-r24-redundancy.mjs";

test("R2.4 redundancy diagnostic computes aligned feature correlation",()=>{
  const a=[{label:"2026-01-01",value:1},{label:"2026-01-02",value:2},{label:"2026-01-03",value:3}];
  const b=[{label:"2026-01-01",value:2},{label:"2026-01-02",value:4},{label:"2026-01-03",value:6}];
  assert.equal(pairedFeatureCorrelation(a,b),1);
});

test("R2.4 redundancy diagnostic is read-only and selects no formula or weights",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/analyze-dollar-r24-redundancy.mjs",import.meta.url),"utf8");
  assert.match(src,/DOLLAR_R24_REDUNDANCY_DIAGNOSTIC_ONLY/);
  assert.match(src,/formulaSelected:false/);
  assert.match(src,/weightSelected:false/);
  assert.match(src,/providerCalls:0/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.doesNotMatch(src,/publishMarket|remote\.|--publish|INSERT INTO|UPDATE |DELETE FROM/);
});
