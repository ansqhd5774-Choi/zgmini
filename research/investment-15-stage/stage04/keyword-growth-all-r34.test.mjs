import test from 'node:test';
import assert from 'node:assert/strict';
import { FALLBACK_SOURCES, findDirectCatalogReport } from './keyword-growth-fallback-r33-readonly.mjs';
import { makeOfficialIndexFallback, directMordorUrl,
  GVR_REPORT_CATALOG } from './keyword-growth-all-r34-readonly.mjs';

const gvr = FALLBACK_SOURCES[0];
const mordor = FALLBACK_SOURCES[1];
const catalog = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
  '<url><loc>https://www.grandviewresearch.com/industry-analysis/aerospace-cyber-security-market</loc></url>' +
  '<url><loc>https://www.grandviewresearch.com/industry-analysis/cyber-security-market</loc></url>' +
  '<url><loc>https://www.grandviewresearch.com/industry-analysis/fintech-blockchain-market-report</loc></url>' +
  '</urlset>';

test('GVR sitemap selects only the direct parent market, not submarkets', () => {
  const found = findDirectCatalogReport(catalog, 'cyber security', gvr);
  assert.equal(found?.url,
    'https://www.grandviewresearch.com/industry-analysis/cyber-security-market');
  assert.equal(findDirectCatalogReport(catalog, 'fintech', gvr), null);
});

test('GVR uses a single shared official-index GET and one report/model for a match', async () => {
  const calls = [];
  const fetchFn = async (url, opts = {}) => {
    calls.push(url);
    if (url === GVR_REPORT_CATALOG) return new Response(catalog, { status: 200 });
    if (url.includes('/industry-analysis/cyber-security-market')) return new Response(
      '<html><h1>Cybersecurity Market Size</h1><p>Global cybersecurity market ' +
      'is projected to grow at a CAGR of 11.9% from 2026 to 2033.</p></html>');
    if (url.includes('/api/generate')) {
      assert.equal(opts.method, 'POST');
      return new Response(JSON.stringify({ response: '{"growth_pct":11.9,"metric":"FORECAST_CAGR"}' }));
    }
    throw new Error('UNEXPECTED_FETCH=' + url);
  };
  const { fallback, diagnostics } = makeOfficialIndexFallback({ fetchFn });
  const missing = await fallback('fintech', gvr, { maxMs: 5000 });
  const found = await fallback('cyber security', gvr, { maxMs: 5000 });
  assert.equal(missing.state, 'FAILED');
  assert.equal(missing.failure, 'CATALOG_NO_DIRECT_MARKET_REPORT');
  assert.equal(missing.report_requests, 0);
  assert.equal(found.state, 'PASS');
  assert.equal(found.growth_pct, 11.9);
  assert.deepEqual([found.search_requests, found.report_requests, found.ollama_generations],
    [0, 1, 1]);
  assert.equal(diagnostics.gvr_catalog_requests, 1);
  assert.deepEqual(calls, [GVR_REPORT_CATALOG,
    'https://www.grandviewresearch.com/industry-analysis/cyber-security-market',
    'http://127.0.0.1:11434/api/generate']);
});

test('Mordor attempts exactly one direct official report GET; 404 stays null', async () => {
  const calls = [];
  const { fallback } = makeOfficialIndexFallback({ fetchFn: async url => {
    calls.push(url);
    return new Response('Not Found', { status: 404 });
  } });
  const result = await fallback('fintech', mordor, { maxMs: 5000 });
  assert.equal(directMordorUrl('fintech'),
    'https://www.mordorintelligence.com/industry-reports/fintech-market');
  assert.equal(result.state, 'FAILED');
  assert.equal(result.failure, 'HTTP_404');
  assert.deepEqual([result.search_requests, result.report_requests,
    result.ollama_generations], [0, 1, 0]);
  assert.equal(calls.length, 1);
});

test('failed official catalog is cached as failed: no second attempt or retry', async () => {
  let requests = 0;
  const { fallback, diagnostics } = makeOfficialIndexFallback({ fetchFn: async () => {
    requests++;
    return new Response('blocked', { status: 503 });
  } });
  const first = await fallback('fintech', gvr);
  const second = await fallback('cyber security', gvr);
  assert.match(first.failure, /^OFFICIAL_CATALOG_/);
  assert.match(second.failure, /^OFFICIAL_CATALOG_/);
  assert.equal(requests, 1);
  assert.equal(diagnostics.gvr_catalog_requests, 1);
  assert.equal(second.search_requests, 0);
});
