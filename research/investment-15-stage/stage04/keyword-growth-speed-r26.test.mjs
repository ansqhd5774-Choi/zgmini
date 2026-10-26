import test from 'node:test';
import assert from 'node:assert/strict';
import { relaxedDiscoveryQuery } from './keyword-growth-speed-r26-readonly.mjs';
import { KEYWORDS, measureKeyword } from './keyword-growth-speed-r25-readonly.mjs';

const reportUrl = 'https://www.thebusinessresearchcompany.com/report/robotics-and-automation-market-global-report';
const description = 'Robotics and automation market size grows from $10 billion in 2026 to $21.44 billion in 2030 with CAGR of 21% in the forecast period.';
const item = (title, link, summary) => `<item><title>${title}</title><link>${link}</link>` +
  `<description><![CDATA[${summary}]]></description></item>`;

test('R26 creates five different unquoted search terms without the restrictive date clauses', () => {
  const queries = KEYWORDS.map(relaxedDiscoveryQuery);
  assert.equal(new Set(queries).size, 5);
  assert.ok(queries.every((query) => query.startsWith('thebusinessresearchcompany ')));
  assert.ok(queries.every((query) => !query.includes('site:') && !query.includes('2026 2030')));
  assert.equal(queries[1], 'thebusinessresearchcompany robotics automation global market report');
});

test('R26 exposes RSS candidate counts while keeping the single matched specialist source', async () => {
  const xml = `<rss version="2.0"><channel>${item('Other domain',
    'https://elsewhere.example/report/robotics-and-automation', description)}${item('Data Center Market',
    'https://www.thebusinessresearchcompany.com/report/data-center-global-market-report', description)}${item('Robotics and Automation Market',
    reportUrl, description)}</channel></rss>`;
  let requests = 0;
  const result = await measureKeyword('robotics and automation', {
    searchQuery: relaxedDiscoveryQuery('robotics and automation'),
    fetchFn: async (url) => {
      requests++;
      if (url.startsWith('https://www.bing.com/')) return new Response(xml, { status: 200 });
      assert.equal(url, 'http://127.0.0.1:11434/api/generate');
      return Response.json({ response: JSON.stringify({ growth_pct: 21,
        metric: 'FORECAST_CAGR', period_start: 2026, period_end: 2030 }) });
    }
  });
  assert.equal(result.state, 'PASS');
  assert.equal(result.rss_items, 3);
  assert.equal(result.publisher_index_links, 2);
  assert.equal(result.title_matched_links, 1);
  assert.equal(result.result_url, reportUrl);
  assert.equal(result.search_http_status, 200);
  assert.match(result.indexed_sample, /elsewhere\.example/);
  assert.equal(requests, 2);
});

test('empty RSS result is diagnosed separately from HTTP or Ollama failure', async () => {
  const result = await measureKeyword('data center', {
    searchQuery: relaxedDiscoveryQuery('data center'),
    fetchFn: async () => new Response('<rss version="2.0"><channel></channel></rss>')
  });
  assert.equal(result.state, 'FAILED');
  assert.equal(result.rss_items, 0);
  assert.equal(result.publisher_index_links, 0);
  assert.equal(result.title_matched_links, 0);
  assert.equal(result.ollama_generations, 0);
  assert.equal(result.failure, 'SEARCH_NO_MATCHED_PUBLISHER_REPORT');
});
