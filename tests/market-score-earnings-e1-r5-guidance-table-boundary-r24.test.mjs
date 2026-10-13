import test from "node:test";
import assert from "node:assert/strict";
import {extractSecEpsGuidance} from "../lib/market-score/earnings-e1-r5-guidance-r2.mjs";

const META={form:"8-K",acceptedAt:"2026-08-20T12:00:00Z"};

test("SEC EPS parser keeps a pipe-flattened Q3 row attached to Q3 instead of the following FY section",()=>{
  const html=`
    <p>
      Third quarter | The Company's third quarter fiscal 2027 guidance is based on the following Q3 FY26 figures: Net sales: $177.8 billion, adjusted operating income: $7.3 billion, and adjusted EPS: $0.62. |
      Consolidated metric | Q3 FY27 | Net sales (cc) | Increase 3.0% to 3.75% | Operating income (cc) | Increase 2.0% to 4.0% | Adjusted EPS | $0.62 to $0.64 | | | | | Fiscal year 2027 | | | The Company's fiscal year guidance is based on the following FY26 figures.
    </p>`;
  const out=extractSecEpsGuidance(html,META);
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2027Q3"&&Math.abs(row.midpoint-0.63)<1e-12));
  assert.equal(out.candidates.some(row=>row.periodKey==="FY2027"&&Math.abs(row.midpoint-0.63)<1e-12),false);
});
