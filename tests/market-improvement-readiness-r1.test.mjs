import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {parseIciCombinedFlowHtml} from "../lib/market-score/ici-combined-flow-provider-r1.mjs";

const fixture=`
<table>
  <tr><th></th><th>9/23/2026</th><th>9/16/2026</th><th>9/9/2026</th><th>9/2/2026</th><th>8/26/2026</th></tr>
  <tr><td>Equity</td><td>12,875</td><td>-12,650</td><td>-11,701</td><td>-5,461</td><td>-16,105</td></tr>
  <tr><td>Domestic</td><td>5,783</td><td>-11,487</td><td>-13,318</td><td>-4,719</td><td>-18,061</td></tr>
  <tr><td>World</td><td>7,093</td><td>-1,163</td><td>1,617</td><td>-742</td><td>1,957</td></tr>
  <tr><td>Hybrid</td><td>-1,856</td><td>-2,169</td><td>1,294</td><td>-1,661</td><td>-2,438</td></tr>
  <tr><td>Bond</td><td>8,162</td><td>3,244</td><td>11,546</td><td>12,684</td><td>13,463</td></tr>
  <tr><td>Taxable</td><td>7,262</td><td>3,796</td><td>10,270</td><td>12,924</td><td>10,980</td></tr>
  <tr><td>Municipal</td><td>900</td><td>-552</td><td>1,276</td><td>-240</td><td>2,483</td></tr>
  <tr><td>Commodity</td><td>956</td><td>2,124</td><td>493</td><td>2,573</td><td>3,394</td></tr>
  <tr><td>Total</td><td>20,137</td><td>-9,450</td><td>1,631</td><td>8,136</td><td>-1,686</td></tr>
</table>`;

test("ICI combined flow parser extracts weekly equity and bond splits without a key",()=>{
  const out=parseIciCombinedFlowHtml(fixture);
  assert.equal(out.status,"READY_CURRENT_RELEASE");
  assert.equal(out.rows.length,5);
  assert.deepEqual(out.rows.at(-1),{
    observationDate:"2026-09-23",
    equity:12875,domesticEquity:5783,worldEquity:7093,hybrid:-1856,bond:8162,
    taxableBond:7262,municipalBond:900,commodity:956,total:20137,unit:"USD_MILLIONS",
  });
});

test("ICI parser fails closed when required categories are missing",()=>{
  const out=parseIciCombinedFlowHtml("<table><tr><th></th><th>9/23/2026</th><th>9/16/2026</th><th>9/9/2026</th><th>9/2/2026</th></tr><tr><td>Equity</td><td>1</td><td>2</td><td>3</td><td>4</td></tr></table>");
  assert.equal(out.status,"PARTIAL");
  assert.match(out.reason,/ICI_COMBINED_/);
});

test("readiness tooling stays analysis-only and does not publish or alter formulas",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/analyze-market-improvement-readiness.mjs",import.meta.url),"utf8");
  assert.match(src,/ANALYSIS_ONLY/);
  assert.match(src,/providerCalls:0/);
  assert.match(src,/formulaChanged:false/);
  assert.doesNotMatch(src,/publishMarket|remote\.|INSERT INTO|UPDATE |DELETE FROM/);
});
