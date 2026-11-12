import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {scoreRawAxisExpanding,summarizeTemporalPair} from "../scripts/pc-writer/sector-fear-greed-r210-temporal-validation.mjs";

test("R2.10 expanding scorer starts at requested history and uses all prior observations",()=>{
  const rows=[1,2,3,4,5].map((x,i)=>({date:`2026-01-0${i+1}`,x}));
  const spec={metrics:[{key:"x",weight:1}]};
  const out=scoreRawAxisExpanding(rows,spec,3);
  assert.equal(out.length,3);
  assert.deepEqual(out.map(row=>row.date),["2026-01-03","2026-01-04","2026-01-05"]);
  assert.ok(out.every(row=>row.score>80));
});

test("R2.10 temporal pair summary measures aligned rolling versus expanding scores",()=>{
  const rolling=[{date:"2026-01-01",score:40},{date:"2026-01-02",score:50},{date:"2026-01-03",score:60}];
  const expanding=[{date:"2026-01-01",score:42},{date:"2026-01-02",score:52},{date:"2026-01-03",score:58}];
  const out=summarizeTemporalPair(rolling,expanding);
  assert.equal(out.n,3);
  assert.equal(out.mae,2);
  assert.equal(out.maxAbsDelta,2);
  assert.equal(out.currentAbsDelta,2);
});

test("R2.10 implementation remains read-only shadow research",()=>{
  const source=fs.readFileSync(path.join(process.cwd(),"scripts/pc-writer/sector-fear-greed-r210-temporal-validation.mjs"),"utf8");
  assert.doesNotMatch(source,/fetch\(|https?:\/\/|wrangler\s+d1|INSERT INTO|UPDATE\s+\w+\s+SET|publication-ledger/i);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
  assert.match(source,/candidateSelected:false/);
});
