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

test("SEC EPS parser anchors quarterly guidance to Q3 instead of nearby FY outlook",()=>{
  const html=`
    <p>Company issues guidance for Q3; raises outlook for FY27.</p>
    <p>For Q3 2026, adjusted EPS is expected to be $0.62 to $0.64.</p>`;
  const out=extractSecEpsGuidance(html,META);
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2026Q3"&&Math.abs(row.midpoint-0.63)<1e-12));
  assert.equal(out.candidates.some(row=>row.periodKey==="FY2027"&&Math.abs(row.midpoint-0.63)<1e-12),false);
});

test("SEC EPS parser keeps sequential quarter guidance on different target periods",()=>{
  const current=extractSecEpsGuidance(`
    <p>Outlook for Q3 2026</p>
    <p>The company expects non-GAAP EPS of $0.84 to $0.88.</p>
  `,META);
  const prior=extractSecEpsGuidance(`
    <p>Outlook for Q2 2026</p>
    <p>The company expects non-GAAP EPS of $0.78 to $0.82.</p>
  `,META);
  assert.ok(current.candidates.some(row=>row.periodKey==="FY2026Q3"&&Math.abs(row.midpoint-0.86)<1e-12));
  assert.ok(prior.candidates.some(row=>row.periodKey==="FY2026Q2"&&Math.abs(row.midpoint-0.80)<1e-12));
  assert.equal(current.candidates.some(row=>row.periodKey==="FY2026Q2"&&Math.abs(row.midpoint-0.86)<1e-12),false);
});

test("SEC EPS parser ignores comparator fiscal year when anchoring full-year EPS",()=>{
  const html=`
    <p>The Company's outlook for fiscal 2026 is for adjusted net revenue to grow 9.5% to 10.0% over fiscal 2025, adjusted EBITDA margin to range from 14.7% to 14.8%, adjusted EPS to range from $7.20 to $7.30.</p>`;
  const out=extractSecEpsGuidance(html,META);
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2026"&&Math.abs(row.midpoint-7.25)<1e-12));
  assert.equal(out.candidates.some(row=>row.periodKey==="FY2025"&&Math.abs(row.midpoint-7.25)<1e-12),false);
});

test("SEC EPS parser rejects overlapping historical-quarter contamination for Uber-style outlook blocks",()=>{
  const html=`
    <p>Outlook for Q3 2026</p>
    <p>For Q3 2026, we anticipate:</p>
    <p>We expect Non-GAAP EPS of $0.84 to $0.88, representing growth of 28% to 35% YoY.</p>
    <p>Financial and Operational Highlights for Second Quarter 2026</p>`;
  const out=extractSecEpsGuidance(html,META);
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2026Q3"&&Math.abs(row.midpoint-0.86)<1e-12));
  assert.equal(out.candidates.some(row=>row.periodKey==="FY2026Q2"&&Math.abs(row.midpoint-0.86)<1e-12),false);
});

test("SEC EPS parser keeps Walmart-style Q3 and FY27 table periods separate",()=>{
  const html=`
    <p>Company issues guidance for Q3; raises outlook for FY27.</p>
    <p>Third quarter</p>
    <p>The Company's third quarter fiscal 2027 guidance is based on the following Q3 FY26 figures.</p>
    <p>Consolidated metric | Q3 FY27</p>
    <p>Adjusted EPS | $0.62 to $0.64</p>
    <p>Fiscal year 2027</p>
    <p>The Company's fiscal year guidance is based on the following FY26 figures.</p>
    <p>Consolidated metric | As of 8.20.2026</p>
    <p>Adjusted EPS | $2.80 to $2.87</p>`;
  const out=extractSecEpsGuidance(html,META);
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2027Q3"&&Math.abs(row.midpoint-0.63)<1e-12));
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2027"&&Math.abs(row.midpoint-2.835)<1e-12));
  assert.equal(out.candidates.some(row=>row.periodKey==="FY2027"&&Math.abs(row.midpoint-0.63)<1e-12),false);
  assert.equal(out.candidates.some(row=>row.periodKey==="FY2026"&&Math.abs(row.midpoint-2.835)<1e-12),false);
});

test("SEC EPS parser keeps pipe-packed Walmart Q3 table from inheriting following FY27 heading",()=>{
  const pipes=" |".repeat(31);
  const html=`
    <p>Third quarter | The Company's third quarter fiscal 2027 guidance is based on the following Q3 FY26 figures: adjusted EPS $0.62. | Consolidated metric | Q3 FY27 | Net sales (cc) | Increase 3.0% to 3.75% | Operating income (cc) | Increase 2.0% to 4.0% | Adjusted EPS | $0.62 to $0.64 ${pipes} | Fiscal year 2027 | The Company's fiscal year guidance is based on the following FY26 figures: adjusted EPS $2.64.</p>`;
  const out=extractSecEpsGuidance(html,META);
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2027Q3"&&Math.abs(row.midpoint-0.63)<1e-12));
  assert.equal(out.candidates.some(row=>row.periodKey==="FY2027"&&Math.abs(row.midpoint-0.63)<1e-12),false);
});

test("SEC EPS parser infers Walmart-style undated quarter from nearby FY outlook without collapsing to annual",()=>{
  const html=`
    <p>Company issues guidance for Q2; reiterates outlook for FY27.</p>
    <p>Looking ahead, the Company issues guidance for the second quarter with net sales expected to grow 4% to 5% and adjusted operating income to grow 7% to 10%. Adjusted EPS is expected to be $0.72 to $0.74. The Company's outlook for fiscal 2027 remains unchanged from prior guidance.</p>`;
  const out=extractSecEpsGuidance(html,META);
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2027Q2"&&Math.abs(row.midpoint-0.73)<1e-12));
  assert.equal(out.candidates.some(row=>row.periodKey==="FY2027"&&Math.abs(row.midpoint-0.73)<1e-12),false);
});
