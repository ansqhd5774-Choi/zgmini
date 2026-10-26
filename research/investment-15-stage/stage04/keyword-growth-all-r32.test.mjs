import test from 'node:test';
import assert from 'node:assert/strict';
import { isDirectMarketTitle, parsePublisherSearchPage, measureKeyword } from './keyword-growth-speed-r25-readonly.mjs';
import { researchAllStrict, R32_REPORT_NAME } from './keyword-growth-all-r32-readonly.mjs';

function searchPage(cards) {
  return `<html><body>${cards.map(([slug, title]) =>
    `<h4><a href="/report/${slug}">${title}</a></h4>`).join('')}</body></html>`;
}

function report(subject) {
  return `<html><h2>What Is The ${subject} Market Size and Share 2026?</h2>` +
    `<p>It will grow from $90.91 billion in 2025 to $100 billion in 2026 ` +
    `at a compound annual growth rate (CAGR) of 10%.</p>` +
    `<h2>What Is The ${subject} Market Growth Forecast?</h2>` +
    `<p>It will grow to $146.41 billion in 2030 at a compound annual growth rate (CAGR) of 10%.</p>` +
    `<h3>${subject} Market Report Forecast Analysis</h3>` +
    `<p>Market Size Value In 2026 $100 billion Revenue Forecast In 2030 $146.41 billion ` +
    `Growth Rate CAGR of 10% from 2026 to 2030 Forecast Period 2026 - 2030</p></html>`;
}

test('R32 matches market SUBJECT only, ignoring narrower submarkets', () => {
  assert.equal(isDirectMarketTitle('FinTech Blockchain Market Report 2026', 'fintech'), false);
  assert.equal(isDirectMarketTitle('Aerospace Cyber Security Market Report 2026', 'cyber security'), false);
  assert.equal(isDirectMarketTitle('Wireless Telecommunication Service Market Report', 'telecommunications services'), false);
  assert.equal(isDirectMarketTitle('Energy Storage Market Report', 'energy'), false);
  assert.equal(isDirectMarketTitle('Cybersecurity Market Report 2026', 'cyber security'), true);
  assert.equal(isDirectMarketTitle('Biotechnology Services Market Report 2026', 'biotechnology services'), true);
  assert.equal(isDirectMarketTitle('Satellites Market Report 2026', 'satellite'), true);
});

test('R32 prefers 2026 direct topic to search top hit or old direct vintage; R31 remains unchanged', () => {
  const html = searchPage([
    ['aerospace-cyber-security-market-report', 'Aerospace Cyber Security Market Report 2026'],
    ['cybersecurity-market', 'Cybersecurity Market Report 2025'],
    ['cybersecurity-global-market-report', 'Cybersecurity Market Report 2026']
  ]);
  const legacy = parsePublisherSearchPage(html, 'cyber security');
  const strict = parsePublisherSearchPage(html, 'cyber security', { strictMarketScope: true });
  assert.ok(legacy.selected.url.endsWith('aerospace-cyber-security-market-report'));
  assert.ok(strict.selected.url.endsWith('cybersecurity-global-market-report'));
  assert.equal(strict.diagnostics.direct_market_matched_links, 2);
});

test('R32 rejects all submarket results before report GET/Ollama; preserves NULL', async () => {
  let reportRequests = 0;
  let ollamaCalls = 0;
  const result = await measureKeyword('fintech', {
    allowedKeywords: ['fintech'], searchMode: 'publisher-site',
    structuredOutput: true, auditForecast: true, rateOnlyFromSource: true,
    resolveHistoricTableMislabel: true, strictMarketScope: true,
    fetchFn: async url => {
      if (url.includes('global-market-reports?search='))
        return new Response(searchPage([
          ['fintech-blockchain-global-market-report', 'FinTech Blockchain Market Report 2026']
        ]), { status: 200 });
      if (url.includes('/report/')) reportRequests++;
      else ollamaCalls++;
      throw new Error('SHOULD_NOT_FETCH_SUBMARKET');
    }
  });
  assert.equal(result.state, 'FAILED');
  assert.equal(result.failure, 'SEARCH_SCOPE_NO_DIRECT_MARKET_REPORT');
  assert.equal(result.growth_pct, null);
  assert.equal(result.report_requests, 0);
  assert.equal(result.ollama_generations, 0);
  assert.equal(reportRequests, 0);
  assert.equal(ollamaCalls, 0);
});

test('R32 re-reads both live feeds and researches a direct market independently', async () => {
  let modelCalls = 0;
  const result = await researchAllStrict({ fetchFn: async url => {
    if (url.includes('/api/sector-fear-greed'))
      return Response.json({ status: 'READY', sectors: [] });
    if (url.includes('/api/theme-fear-greed'))
      return Response.json({ status: 'READY', themes: [{ theme: '사이버보안' }, { theme: '핀테크' }] });
    if (url.includes('global-market-reports?search=')) {
      const q = new URL(url).searchParams.get('search');
      if (q === 'cyber security') return new Response(searchPage([
        ['aerospace-cyber-security-market-report', 'Aerospace Cyber Security Market Report 2026'],
        ['cybersecurity-global-market-report', 'Cybersecurity Market Report 2026']
      ]));
      return new Response(searchPage([
        ['fintech-blockchain-global-market-report', 'FinTech Blockchain Market Report 2026']
      ]));
    }
    if (url.includes('/report/')) return new Response(report('Cybersecurity'));
    modelCalls++;
    return Response.json({ response: '{"growth_pct":10,"metric":"FORECAST_CAGR"}' });
  } });
  assert.equal(R32_REPORT_NAME, 'STAGE04_ALL_SECTORS_THEMES_R32_DIRECT_SCOPE_READONLY');
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].state, 'PASS');
  assert.ok(result.rows[0].result_url.endsWith('cybersecurity-global-market-report'));
  assert.equal(result.rows[1].failure, 'SEARCH_SCOPE_NO_DIRECT_MARKET_REPORT');
  assert.equal(result.rows[1].growth_pct, null);
  assert.equal(modelCalls, 1);
});
