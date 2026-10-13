import test from "node:test";
import assert from "node:assert/strict";
import {
  extractSecEpsGuidance,
} from "../lib/market-score/earnings-e1-r5-guidance-r2.mjs";

const META={form:"8-K",acceptedAt:"2026-08-01T00:00:00Z"};

test("SEC EPS parser ignores calendar-year framework ranges near EPS guidance",()=>{
  const html=`
    <p>The company provided its fiscal year 2027 adjusted EPS guidance of $7.30 to $7.45.</p>
    <p>Multi-Year Financial Framework for Fiscal Years 2028 through 2030.</p>`;
  const out=extractSecEpsGuidance(html,META);
  assert.equal(out.status,"READY");
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2027"&&Math.abs(row.midpoint-7.375)<1e-12));
  assert.equal(out.candidates.some(row=>row.midpoint===2029),false);
});

test("SEC EPS parser does not treat closed-sales dollar ranges as EPS guidance",()=>{
  const html=`
    <p>Fiscal Year 2027 Financial Guidance</p>
    <p>Adjusted earnings per share growth (Non-GAAP) | 8 - 12% | Free cash flow conversion (Non-GAAP) | 100%+ | Closed sales | $290 - $330 million</p>`;
  const out=extractSecEpsGuidance(html,META);
  assert.equal(out.status,"MISSING");
  assert.equal(out.candidates.length,0);
});

test("SEC EPS parser rejects retrospective achieved-versus-guidance ranges",()=>{
  const html=`
    <p>Second Quarter 2026 results: achieved adjusted EPS of $0.86 per share, compared to the guidance range of $0.82 to $0.84 per share.</p>
    <p>Outlook for Q3 2026</p>
    <p>The company expects non-GAAP EPS for third quarter 2026 of $0.90 to $0.94.</p>`;
  const out=extractSecEpsGuidance(html,META);
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2026Q3"&&Math.abs(row.midpoint-0.92)<1e-12));
  assert.equal(out.candidates.some(row=>Math.abs(row.midpoint-0.83)<1e-12),false);
});
