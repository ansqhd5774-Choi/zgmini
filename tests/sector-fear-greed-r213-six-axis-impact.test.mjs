import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {combineR213SixAxis,summarizeR213Impact} from "../scripts/pc-writer/sector-fear-greed-r213-six-axis-impact.mjs";

test("R2.13 adds R2.4 research proxy at original 15% options weight without renormalization",()=>{
  const five=[{date:"2026-01-01",score:40},{date:"2026-01-02",score:42}];
  const spec=[{date:"2026-01-01",score:60},{date:"2026-01-02",score:80}];
  const out=combineR213SixAxis(five,spec,.15);
  assert.equal(out.length,2);
  assert.equal(out[0].score,49);
  assert.equal(out[1].score,54);
});

test("R2.13 impact summary reports band changes but does not select candidate",()=>{
  const five=[{date:"2026-01-01",score:43},{date:"2026-01-02",score:44}];
  const six=[{date:"2026-01-01",score:46},{date:"2026-01-02",score:50}];
  const out=summarizeR213Impact(five,six);
  assert.equal(out.n,2);
  assert.equal(out.bandChangeCount,2);
  assert.equal(out.severeBandChangeCount,0);
  assert.equal(out.current.fiveBand,"FEAR");
  assert.equal(out.current.sixBand,"NEUTRAL");
});

test("R2.13 aligns by date and ignores speculative rows without five-axis overlap",()=>{
  const five=[{date:"2026-01-02",score:40}];
  const spec=[{date:"2026-01-01",score:100},{date:"2026-01-02",score:20}];
  const out=combineR213SixAxis(five,spec,.15);
  assert.deepEqual(out.map(row=>row.date),["2026-01-02"]);
  assert.equal(out[0].score,43);
});

test("R2.13 implementation remains read-only shadow research",()=>{
  const source=fs.readFileSync(path.join(process.cwd(),"scripts/pc-writer/sector-fear-greed-r213-six-axis-impact.mjs"),"utf8");
  assert.doesNotMatch(source,/fetch\(|https?:\/\/|wrangler\s+d1|INSERT INTO|UPDATE\s+\w+\s+SET|publication-ledger/i);
  assert.match(source,/r24ApprovedForProduction:false/);
  assert.match(source,/candidateSelected:false/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/no85PercentRenormalization:true/);
});
