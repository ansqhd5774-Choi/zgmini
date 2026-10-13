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


test("SEC EPS parser separates two explicit target periods in one Walmart-style sentence",()=>{
  const html=`<p>Company issues guidance for Q3; raises outlook for FY27. Adjusted EPS is expected to be $0.62 to $0.64 for Q3 and $2.80 to $2.87 for FY27.</p>`;
  const out=extractSecEpsGuidance(html,META);
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2027Q3"&&Math.abs(row.midpoint-0.63)<1e-12));
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2027"&&Math.abs(row.midpoint-2.835)<1e-12));
  assert.equal(out.candidates.some(row=>row.periodKey==="FY2027"&&Math.abs(row.midpoint-0.63)<1e-12),false);
});


test("SEC EPS parser annual section header propagates to a later adjusted EPS table row",()=>{
  const html=`
    <table>
      <tr><td>Fiscal year 2027</td></tr>
      <tr><td>The Company's fiscal year guidance is based on FY26 figures.</td></tr>
      <tr><td>Consolidated metric</td><td>FY27</td></tr>
      <tr><td>Net sales (cc)</td><td>Increase 3.5% to 4.5%</td></tr>
      <tr><td>Adjusted operating income (cc)</td><td>Increase 6.0% to 8.0%</td></tr>
      <tr><td>Adjusted EPS</td><td>$2.75 to $2.85</td></tr>
    </table>`;
  const out=extractSecEpsGuidance(html,META);
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2027"&&Math.abs(row.midpoint-2.8)<1e-12));
});


test("SEC EPS parser annual section evidence beats a later historical-quarter footnote",()=>{
  const html=`
    <table>
      <tr><td>Fiscal year 2027</td></tr>
      <tr><td>The Company's fiscal year guidance is based on FY26 figures.</td></tr>
      <tr><td>Consolidated metric</td><td>Original from 2.19.2026</td><td>As of 5.21.2026</td></tr>
      <tr><td>Adjusted EPS</td><td>$2.75 to $2.85</td><td>Unchanged</td></tr>
      <tr><td>For relevant non-GAAP reconciliations, see Q2 FY26 and Q4 FY26 earnings releases.</td></tr>
    </table>`;
  const out=extractSecEpsGuidance(html,META);
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2027"&&Math.abs(row.midpoint-2.8)<1e-12));
  assert.equal(out.candidates.some(row=>row.periodKey==="FY2026Q2"&&Math.abs(row.midpoint-2.8)<1e-12),false);
});


test("SEC EPS parser revision table uses latest numeric annual EPS rather than original prior column",()=>{
  const html=`<table>
    <tr><td>Fiscal year 2027</td></tr>
    <tr><td>Consolidated metric</td><td>Original from 2.19.2026</td><td>As of 5.21.2026</td><td>As of 8.20.2026</td></tr>
    <tr><td>Adj. EPS</td><td>$2.75 to $2.85</td><td>Unchanged</td><td>$2.80 to $2.87</td></tr>
    <tr><td>Capital expenditures</td><td>3.5% to 4.0%</td></tr>
  </table>`;
  const out=extractSecEpsGuidance(html,META);
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2027"&&Math.abs(row.midpoint-2.835)<1e-12));
  assert.equal(out.candidates.some(row=>row.periodKey==="FY2027"&&Math.abs(row.midpoint-2.8)<1e-12),false);
});


test("SEC EPS parser unchanged latest annual column carries forward original numeric range",()=>{
  const html=`<table>
    <tr><td>Fiscal year 2027</td></tr>
    <tr><td>Consolidated metric</td><td>Original from 2.19.2026</td><td>As of 5.21.2026</td></tr>
    <tr><td>Adjusted EPS</td><td>$2.75 to $2.85</td><td>Unchanged</td></tr>
  </table>`;
  const out=extractSecEpsGuidance(html,META);
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2027"&&Math.abs(row.midpoint-2.8)<1e-12));
});


test("SEC EPS parser narrative full-year EPS remains available when annual table helper is present",()=>{
  const html=`<p>Outlook</p><p>Full Year 2026</p><p>The Company expects full year sales growth between 14% and 16%.</p><p>Non-GAAP diluted earnings per share are expected to be in the range of $20.75 to $21.25.</p>`;
  const out=extractSecEpsGuidance(html,META);
  assert.ok(out.candidates.some(row=>row.periodKey==="FY2026"&&row.basis==="ADJUSTED"&&Math.abs(row.midpoint-21)<1e-12));
});
