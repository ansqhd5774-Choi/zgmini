import test from 'node:test';
import assert from 'node:assert/strict';
import { researchFourSources, PER_PUBLISHER_MAX_MS } from './keyword-growth-all-r33-readonly.mjs';
import { FALLBACK_SOURCES, allowedSourceUrl, findDirectPublisherResult,
  extractDirectForecast, measureFallback } from './keyword-growth-fallback-r33-readonly.mjs';

const row = { type: 'THEME', id: '사이버보안', name: '사이버보안',
  keyword: 'cyber security', scope: 'RESEARCH_PROXY_NOT_ENTIRE_ETF_THEME_GROWTH' };
const firstFail = keyword => ({ keyword, state: 'FAILED',
  publisher: 'The Business Research Company', failure: 'NO_DIRECT_MARKET_REPORT',
  search_requests: 1, report_requests: 0, ollama_generations: 0, total_ms: 450 });
const providerPass = (keyword, source) => ({ keyword, state: 'PASS',
  publisher: source.publisher, result_url: 'https://' + source.host + source.path + 'cyber-security-market',
  growth_pct: 11.9, metric: 'FORECAST_CAGR', period_start: 2026, period_end: 2033,
  source_audit: 'FORECAST_TEXT_PERIOD_AND_MODEL_CHECK',
  search_requests: 1, report_requests: 1, ollama_generations: 1, total_ms: 1000 });

test('first PASS stops: zero secondary requests', async () => {
  let secondary = 0;
  const report = await researchFourSources({ universe: { rows: [row], errors: [] },
    firstResearch: () => providerPass(row.keyword, { publisher: 'The Business Research Company',
      host: 'www.thebusinessresearchcompany.com', path: '/report/' }),
    fallbackResearch: () => { secondary++; throw new Error('NEVER'); } });
  assert.equal(report.rows[0].state, 'PASS');
  assert.equal(report.rows[0].attempts.length, 1);
  assert.equal(secondary, 0);
});

test('second PASS stops: one secondary publisher, no 3rd/4th', async () => {
  const calls = [];
  const report = await researchFourSources({ universe: { rows: [row], errors: [] },
    firstResearch: (_, options) => { assert.equal(options.maxMs, PER_PUBLISHER_MAX_MS);
      assert.equal(options.strictMarketScope, true); return firstFail(row.keyword); },
    fallbackResearch: (keyword, source) => { calls.push(source.id);
      return providerPass(keyword, source); } });
  assert.deepEqual(calls, ['GVR']);
  assert.equal(report.rows[0].growth_pct, 11.9);
  assert.equal(report.rows[0].attempts.length, 2);
});

test('three fallbacks at most and unresolved stays NULL', async () => {
  const calls = [];
  const report = await researchFourSources({ universe: { rows: [row], errors: [] },
    firstResearch: () => firstFail(row.keyword),
    fallbackResearch: (keyword, source) => { calls.push(source.id);
      return { keyword, state: 'FAILED', publisher: source.publisher,
        failure: 'REPORT_MISSING', search_requests: 1, report_requests: 0,
        ollama_generations: 0, total_ms: 90 }; } });
  assert.deepEqual(calls, ['GVR', 'MORDOR', 'FORTUNE']);
  assert.equal(report.rows[0].attempts.length, 4);
  assert.equal(report.rows[0].growth_pct, null);
});

test('scope gate blocks submarkets, empty periods and historical one-year rates', () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item><title>Aerospace Cyber Security Market Growth Report</title>
      <link>https://www.grandviewresearch.com/industry-analysis/aerospace-cyber-security-market</link></item>
    <item><title>Cybersecurity Market Size And Share Report 2026-2033</title>
      <link>https://www.grandviewresearch.com/industry-analysis/cyber-security-market</link></item>
  </channel></rss>`;
  assert.equal(findDirectPublisherResult(xml, row.keyword, FALLBACK_SOURCES[0])?.url,
    'https://www.grandviewresearch.com/industry-analysis/cyber-security-market');
  assert.equal(allowedSourceUrl('https://evil.grandviewresearch.com/industry-analysis/x', FALLBACK_SOURCES[0]), false);
  assert.equal(extractDirectForecast('<h1>Cybersecurity Market</h1><p>2025 to 2026 at a CAGR of 15%</p>', row.keyword), null);
  assert.equal(extractDirectForecast('<h1>Aerospace Cyber Security Market</h1><p>Forecast 2026 to 2033 at a CAGR of 9.5%</p>', row.keyword), null);
  const parsed = extractDirectForecast('<h1>Cybersecurity Market Size</h1><p>' +
    'The global cybersecurity market is projected to grow from $302.0 billion in 2026 ' +
    'to $663.2 billion by 2033, at a CAGR of 11.9% from 2026 to 2033.</p>', row.keyword);
  assert.equal(parsed.growth_pct, 11.9);
  assert.deepEqual([parsed.period_start, parsed.period_end], [2026, 2033]);
});

test('one RSS GET, one publisher GET, one Ollama generation, no retry', async () => {
  const calls = [];
  const source = FALLBACK_SOURCES[0];
  const fetchFn = async (url, options = {}) => {
    calls.push(url);
    if (url.startsWith('https://www.bing.com/')) return new Response(
      '<?xml version="1.0"?><rss><channel><item>' +
      '<title>Cybersecurity Market Size And Share Report, 2026-2033</title>' +
      '<link>https://www.grandviewresearch.com/industry-analysis/cyber-security-market</link>' +
      '</item></channel></rss>', { status: 200 });
    if (url.startsWith('https://www.grandviewresearch.com/')) return new Response(
      '<html><body><h1>Cybersecurity Market Size And Share Report, 2026-2033</h1>' +
      '<p>Global cybersecurity market is projected to grow from USD 302 billion in 2026 ' +
      'to USD 663 billion by 2033, at a CAGR of 11.9% from 2026 to 2033.</p></body></html>',
      { status: 200 });
    assert.equal(options.method, 'POST');
    const body = JSON.parse(options.body);
    assert.equal(body.format.properties.metric.enum[0], 'FORECAST_CAGR');
    return new Response(JSON.stringify({ response: '{"growth_pct":11.9,"metric":"FORECAST_CAGR"}' }),
      { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const result = await measureFallback(row.keyword, source, { fetchFn, maxMs: 5000 });
  assert.equal(result.failure, null);
  assert.equal(result.state, 'PASS');
  assert.deepEqual([result.search_requests, result.report_requests, result.ollama_generations], [1, 1, 1]);
  assert.equal(calls.length, 3);
});

test('bad Ollama answer does not pass or retry', async () => {
  const source = FALLBACK_SOURCES[0];
  const calls = [];
  const fetchFn = async url => {
    calls.push(url);
    if (url.includes('bing.com')) return new Response(
      '<?xml version="1.0"?><rss><item><title>Cybersecurity Market Size</title>' +
      '<link>https://www.grandviewresearch.com/industry-analysis/cyber-security-market</link>' +
      '</item></rss>');
    if (url.includes('grandviewresearch.com')) return new Response(
      '<html><h1>Cybersecurity Market Size</h1><p>Projected forecast ' +
      '2026 to 2033 CAGR of 11.9%.</p></html>');
    return new Response(JSON.stringify({ response: '{"growth_pct":9.5,"metric":"FORECAST_CAGR"}' }));
  };
  const result = await measureFallback(row.keyword, source, { fetchFn });
  assert.equal(result.state, 'FAILED');
  assert.equal(result.growth_pct, null);
  assert.equal(result.ollama_generations, 1);
  assert.equal(calls.length, 3);
});
