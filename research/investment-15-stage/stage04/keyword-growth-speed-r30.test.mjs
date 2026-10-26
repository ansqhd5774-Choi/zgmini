import test from 'node:test';
import assert from 'node:assert/strict';
import { KEYWORDS, measureKeyword, FORECAST_RATE_ONLY_OUTPUT_SCHEMA,
  validateModelForecastRateOnly } from './keyword-growth-speed-r25-readonly.mjs';

const EXAMPLES = [
  { keyword: 'nuclear reactor', from: 31.08, to: 38.54, pct: 5.5, table: 5.5, state: 'PASS' },
  { keyword: 'robotics and automation', from: 94.53, to: 202.54, pct: 21, table: 21, state: 'PASS' },
  { keyword: 'artificial intelligence semiconductors', from: 228.94, to: 555.37, pct: 24.8, table: 24.8, state: 'PASS' },
  { keyword: 'biotechnology services', from: 196.54, to: 314.12, pct: 12.4, table: 10.1, state: 'SOURCE_CONFLICT' },
  { keyword: 'data center', from: 324.25, to: 460.61, pct: 9.2, table: 8.2, state: 'SOURCE_CONFLICT' }
];

const search = (v) => `<html><h4><a href="/report/${v.keyword.replaceAll(' ', '-')}-global-market-report">` +
  `${v.keyword} Market Report 2026</a></h4></html>`;

const report = (v) => `<html><body><h1>${v.keyword} Market Report 2026</h1>` +
  `<h2>What Is The ${v.keyword} Market Size and Share 2026?</h2>` +
  `<p>It will grow from $20 billion in 2025 to $${v.from} billion in 2026 ` +
  `at a compound annual growth rate (CAGR) of ${v.table}%.</p>` +
  `<h2>What Is The ${v.keyword} Market Growth Forecast?</h2>` +
  `<p>In the next few years, it will grow to $${v.to} billion in 2030 at a compound annual ` +
  `growth rate (CAGR) of ${v.pct}%. Forecast activity continues.</p>` +
  `<h3>${v.keyword} Market Report Forecast Analysis</h3>` +
  `<table><tr><td>Market Size Value In 2026</td><td>$${v.from} billion</td></tr>` +
  `<tr><td>Revenue Forecast In 2030</td><td>$${v.to} billion</td></tr>` +
  `<tr><td>Growth Rate</td><td>CAGR of ${v.table}% from 2026 to 2030</td></tr></table></body></html>`;

test('R30 model rate schema has no model-generated years', () => {
  assert.deepEqual(FORECAST_RATE_ONLY_OUTPUT_SCHEMA.required, ['growth_pct', 'metric']);
  assert.deepEqual(Object.keys(FORECAST_RATE_ONLY_OUTPUT_SCHEMA.properties), ['growth_pct', 'metric']);
  assert.deepEqual(validateModelForecastRateOnly('{"growth_pct":21,"metric":"FORECAST_CAGR"}',
    'It will grow at CAGR of 21.0% until 2030.'), { growth_pct: 21, metric: 'FORECAST_CAGR' });
  assert.throws(() => validateModelForecastRateOnly('{"growth_pct":21,"metric":"FORECAST_CAGR","period_start":2030}',
    'CAGR of 21%'), /OLLAMA_RATE_SCHEMA_MISMATCH/);
  assert.throws(() => validateModelForecastRateOnly('{"growth_pct":10.1,"metric":"FORECAST_CAGR"}',
    'CAGR of 12.4%'), /OLLAMA_VALUE_NOT_IN_SOURCE/);
  assert.throws(() => validateModelForecastRateOnly('{"growth_pct":12.4,"metric":"GROWTH"}',
    'CAGR of 12.4%'), /OLLAMA_WRONG_GROWTH_TYPE/);
});

test('R30 independently measures five keywords and gets periods from verified report attributes', async () => {
  const requests = [];
  const outputs = [];
  for (const v of EXAMPLES) {
    const result = await measureKeyword(v.keyword, {
      searchMode: 'publisher-site', structuredOutput: true,
      auditForecast: true, rateOnlyFromSource: true,
      fetchFn: async (url, init) => {
        requests.push(url);
        if (url.includes('/global-market-reports?')) return new Response(search(v));
        if (url.includes('/report/')) return new Response(report(v));
        const body = JSON.parse(init.body);
        assert.deepEqual(body.format, FORECAST_RATE_ONLY_OUTPUT_SCHEMA);
        assert.match(body.prompt, /Do not provide period_start, period_end/);
        return Response.json({ response: JSON.stringify({ growth_pct: v.pct, metric: 'FORECAST_CAGR' }),
          total_duration: 710_000_000, done_reason: 'stop' });
      }
    });
    outputs.push(result);
    assert.equal(result.state, v.state);
    assert.equal(result.source_audit, v.state === 'PASS' ? 'CONSISTENT' : 'SOURCE_CONFLICT');
    assert.equal(result.period_source, 'PUBLISHER_FORECAST_ATTRIBUTES');
    assert.equal(result.ollama_generations, 1);
    assert.equal(result.model_candidate_pct, v.pct);
    assert.equal(result.growth_pct, v.state === 'PASS' ? v.pct : null);
    assert.equal(result.period_start, v.state === 'PASS' ? 2026 : null);
    assert.equal(result.period_end, v.state === 'PASS' ? 2030 : null);
  }
  assert.equal(requests.length, KEYWORDS.length * 3);
  assert.equal(outputs.filter((r) => r.state === 'PASS').length, 3);
  assert.equal(outputs.filter((r) => r.state === 'SOURCE_CONFLICT').length, 2);
});

test('R30 preserves old mode isolation and never passes an invented growth number', async () => {
  await assert.rejects(() => measureKeyword('nuclear reactor', { rateOnlyFromSource: true }),
    /INVALID_RATE_ONLY_MODE/);
  const v = EXAMPLES[0];
  const result = await measureKeyword(v.keyword, {
    searchMode: 'publisher-site', structuredOutput: true, auditForecast: true,
    rateOnlyFromSource: true,
    fetchFn: async (url) => url.includes('/global-market-reports?') ? new Response(search(v)) :
      url.includes('/report/') ? new Response(report(v)) :
        Response.json({ response: '{"growth_pct":90,"metric":"FORECAST_CAGR"}' })
  });
  assert.equal(result.state, 'FAILED');
  assert.equal(result.failure, 'OLLAMA_VALUE_NOT_IN_SOURCE');
  assert.equal(result.growth_pct, null);
});
