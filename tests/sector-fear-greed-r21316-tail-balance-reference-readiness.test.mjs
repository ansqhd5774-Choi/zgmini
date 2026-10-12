import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {summarizeR21316ReferenceReadiness,summarizeR21316InputRange} from "../scripts/pc-writer/sector-fear-greed-r21316-tail-balance-reference-readiness.mjs";

const HERE=path.dirname(fileURLToPath(import.meta.url));
const SCRIPT=path.join(HERE,"..","scripts","pc-writer","sector-fear-greed-r21316-tail-balance-reference-readiness.mjs");

test("R2.13.16 preserves the approved 756-observation reference requirement",()=>{
  const short=Array.from({length:463},(_,i)=>({date:`2025-01-${String((i%28)+1).padStart(2,"0")}`,tailBalance:i+1}));
  const summary=summarizeR21316ReferenceReadiness(short,756);
  assert.equal(summary.observations,463);
  assert.equal(summary.required,756);
  assert.equal(summary.missing,293);
  assert.equal(summary.ready,false);
  const ready=Array.from({length:756},(_,i)=>({date:`2025-01-${String((i%28)+1).padStart(2,"0")}`,tailBalance:i+1}));
  assert.equal(summarizeR21316ReferenceReadiness(ready,756).ready,true);
});

test("R2.13.16 reports local input date range without inventing rows",()=>{
  const r=summarizeR21316InputRange([{tradeDate:"2024-01-03"},{trade_date:"2023-12-29"},{date:"bad"}]);
  assert.equal(r.rows,3);
  assert.equal(r.firstDate,"2023-12-29");
  assert.equal(r.lastDate,"2024-01-03");
});

test("R2.13.16 remains local read-only and cannot lower reference or define a new normalization",()=>{
  const source=fs.readFileSync(SCRIPT,"utf8");
  assert.match(source,/providerCalls:0/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
  assert.match(source,/newFormulaIntroduced:false/);
  assert.match(source,/normalizationChanged:false/);
  assert.match(source,/candidateSelected:false/);
  assert.doesNotMatch(source,/fetch\s*\(/);
  assert.doesNotMatch(source,/wrangler\s+d1/i);
  assert.doesNotMatch(source,/INSERT\s+INTO/i);
  assert.doesNotMatch(source,/UPDATE\s+.+SET/i);
});
