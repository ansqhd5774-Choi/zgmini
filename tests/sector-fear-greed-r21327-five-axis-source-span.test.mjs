import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {runR21327} from "../scripts/pc-writer/sector-fear-greed-r21327-five-axis-source-span.mjs";

test("R2.13.27 source-span diagnostic remains provider-free and preserves Production contracts",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/sector-fear-greed-r21327-five-axis-source-span.mjs",import.meta.url),"utf8");
  assert.match(src,/providerCalls:0/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.match(src,/referenceRequirementChanged:false/);
  assert.match(src,/approvedR1ReferenceRequirement:756/);
  assert.doesNotMatch(src,/fetch\(/);
});

test("R2.13.27 reports local source and benchmark spans",()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"r21327-"));
  fs.writeFileSync(path.join(base,"local-sector-fear-greed-r1-iex-price-history.json"),JSON.stringify({series:{SPY:[{date:"2026-01-01",close:1},{date:"2026-01-02",close:2}],XLK:[{date:"2026-01-01",close:1}]}}));
  fs.writeFileSync(path.join(base,"local-breadth-r7-pit-price-history.json"),JSON.stringify({rows:[{tradeDate:"2026-01-01"},{tradeDate:"2026-01-02"}]}));
  fs.writeFileSync(path.join(base,"local-breadth-r6-shadow-history.json"),JSON.stringify({rows:[{tradeDate:"2026-01-02"}]}));
  fs.writeFileSync(path.join(base,"local-sector-fear-greed-r21326-tail-balance-historical-smoothed-validation.json"),JSON.stringify({sectors:{technology:{alignedDates:21,firstAlignedDate:"2026-09-11",lastAlignedDate:"2026-10-09"}}}));
  const r=runR21327(base,{now:new Date("2026-10-13T00:00:00Z")});
  assert.equal(r.providerCalls,0);
  assert.equal(r.benchmark.SPY.dates,2);
  assert.equal(r.sources.r7.dates,2);
  assert.equal(r.aligned.technology.alignedDates,21);
});
