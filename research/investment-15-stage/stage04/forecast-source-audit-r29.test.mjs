import test from 'node:test';
import assert from 'node:assert/strict';
import { auditForecastSource } from './forecast-source-audit-r29-readonly.mjs';
import { KEYWORDS, measureKeyword, FORECAST_CAGR_OUTPUT_SCHEMA } from './keyword-growth-speed-r25-readonly.mjs';

const CASES = [
  { keyword: 'nuclear reactor', from: 31.08, to: 38.54, narrative: 5.5, table: 5.5, state: 'PASS' },
  { keyword: 'robotics and automation', from: 94.53, to: 202.54, narrative: 21, table: 21, state: 'PASS' },
  { keyword: 'artificial intelligence semiconductors', from: 228.94, to: 555.37, narrative: 24.8, table: 24.8, state: 'PASS' },
  { keyword: 'biotechnology services', from: 196.54, to: 314.12, narrative: 12.4, table: 10.1, state: 'SOURCE_CONFLICT' },
  { keyword: 'data center', from: 324.25, to: 460.61, narrative: 9.2, table: 8.2, state: 'SOURCE_CONFLICT' }
];

function officialReport({ keyword, from, to, narrative, table }) {
  return `<html><body><h1>${keyword} Market Report 2026</h1>` +
    `<h2>What Is The ${keyword} Market Size and Share 2026?</h2>` +
    `<p>The ${keyword} market size will grow from $88.8 billion in 2025 to $${from} billion in 2026 ` +
    `at a compound annual growth rate (CAGR) of ${table}%.</p>` +
    `<h2>What Is The ${keyword} Market Growth Forecast?</h2>` +
    `<p>The ${keyword} market size is expected to grow in the next few years. ` +
    `It will grow to $${to} billion in 2030 at a compound annual growth rate (CAGR) of ${narrative}%. ` +
    `The growth in the forecast period is associated with greater adoption.</p>` +
    `<h3>${keyword} Market Report Forecast Analysis</h3>` +
    `<table><tr><td>Market Size Value In 2026</td><td>$${from} billion</td></tr>` +
    `<tr><td>Revenue Forecast In 2030</td><td>$${to} billion</td></tr>` +
    `<tr><td>Growth Rate</td><td>CAGR of ${table}% from 2026 to 2030</td></tr>` +
    `<tr><td>Forecast Period</td><td>2026 - 2030</td></tr></table></body></html>`;
}

const search = (c) => `<html><body><h4><a href="/report/${c.keyword.replaceAll(' ', '-')}-global-market-report">` +
  `${c.keyword} Market Report 2026</a></h4></body></html>`;

test('R29 distinguishes the two contradictory source tables from three consistent ones', () => {
  for (const c of CASES) {
    const r = auditForecastSource(officialReport(c));
    assert.equal(r.source_audit, c.state === 'PASS' ? 'CONSISTENT' : 'SOURCE_CONFLICT');
    assert.equal(r.forecast_narrative_pct, c.narrative);
    assert.equal(r.forecast_table_pct, c.table);
    assert.equal(r.forecast_base_year, 2026);
    assert.equal(r.forecast_end_year, 2030);
    assert.ok(Math.abs(r.forecast_math_pct - c.narrative) < 0.15);
    assert.match(r.forecast_excerpt, /Market Growth Forecast/);
    assert.ok(!r.forecast_excerpt.includes(`CAGR of ${c.table}% from 2026 to 2030`));
  }
});

test('R29 never treats absent or contradictory source evidence as a valid rate', () => {
  const missing = auditForecastSource('<html><h1>Data Center</h1><p>CAGR of 8.2% in 2026</p></html>');
  assert.equal(missing.source_audit, 'INCOMPLETE');
  assert.equal(missing.forecast_excerpt, null);
  const misleading = officialReport(CASES[3]).replaceAll('$314.12 billion', '$400 billion');
  const inconsistent = auditForecastSource(misleading);
  assert.equal(inconsistent.source_audit, 'SOURCE_CONFLICT');
  assert.match(inconsistent.source_conflict_reason, /NARRATIVE/);
});

test('R29 five live-shaped independent requests call Ollama once and suppress both ambiguous outputs', async () => {
  const calls = [];
  const outputs = [];
  for (const c of CASES) {
    const r = await measureKeyword(c.keyword, {
      searchMode: 'publisher-site', structuredOutput: true, auditForecast: true,
      fetchFn: async (url, opts) => {
        calls.push(url);
        if (url.includes('/global-market-reports?')) return new Response(search(c));
        if (url.includes('/report/')) return new Response(officialReport(c));
        const request = JSON.parse(opts.body);
        assert.deepEqual(request.format, FORECAST_CAGR_OUTPUT_SCHEMA);
        assert.match(request.prompt, new RegExp(`CAGR\\) of ${c.narrative}%`));
        return Response.json({ response: JSON.stringify({ growth_pct: c.narrative,
          metric: 'FORECAST_CAGR', period_start: 2026, period_end: 2030 }),
          done_reason: 'stop', total_duration: 800_000_000 });
      }
    });
    outputs.push(r);
    assert.equal(r.state, c.state);
    assert.equal(r.ollama_generations, 1);
    assert.equal(r.model_candidate_pct, c.narrative);
    assert.equal(r.growth_pct, c.state === 'PASS' ? c.narrative : null);
    if (c.state === 'SOURCE_CONFLICT') assert.equal(r.failure, 'SOURCE_FORECAST_VALUES_DISAGREE');
  }
  assert.equal(calls.length, KEYWORDS.length * 3);
  assert.equal(outputs.filter((r) => r.state === 'PASS').length, 3);
  assert.equal(outputs.filter((r) => r.state === 'SOURCE_CONFLICT').length, 2);
});
