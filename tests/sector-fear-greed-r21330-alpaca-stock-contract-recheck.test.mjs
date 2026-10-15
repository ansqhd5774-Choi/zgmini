import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {adaptMergedAlpacaRowsForStoredInput} from "../scripts/pc-writer/sector-fear-greed-r21330-alpaca-stock-contract-recheck.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(here,"..","scripts","pc-writer","sector-fear-greed-r21330-alpaca-stock-contract-recheck.mjs"),"utf8");

test("R2.13.30 adapts merged Alpaca date/close/volume rows to stored input contract",()=>{
  const rows=adaptMergedAlpacaRowsForStoredInput([{ticker:"AAA",date:"2024-01-02",close:12.5,volume:1000}]);
  assert.deepEqual(rows,[{tradeDate:"2024-01-02",ticker:"AAA",currentClose:12.5,currentVolume:1000}]);
});

test("R2.13.30 accepts already-compatible stored row aliases without mutation side effects",()=>{
  const rows=adaptMergedAlpacaRowsForStoredInput([{ticker:"BBB",tradeDate:"2024-01-03",currentClose:7,currentVolume:22}]);
  assert.deepEqual(rows,[{tradeDate:"2024-01-03",ticker:"BBB",currentClose:7,currentVolume:22}]);
});

test("R2.13.30 remains provider-free and preserves Production contracts",()=>{
  assert.equal(source.includes("https://data.alpaca.markets"),false);
  assert.equal(source.includes("fetch("),false);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
  assert.match(source,/normalizationChanged:false/);
  assert.match(source,/weightsChanged:false/);
});
