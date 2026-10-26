import test from 'node:test';
import assert from 'node:assert/strict';
import { KEYWORDS, measureKeyword, parsePublisherSearchPage } from './keyword-growth-speed-r25-readonly.mjs';

const slugs = [
  'nuclear-reactor-global-market-report',
  'robotics-and-automation-market-global-report',
  'artificial-intelligence-ai-semiconductors-market-report',
  'Biotechnology-Services-Global-Market-Report',
  'data-center-global-market-report'
];
const page = (slug, title) => `<html><body><main><div class="report-grid">` +
  `<h4><a href="/report/${slug}" class="ReportCard_reportlink__CjXNL">` +
  `${title} Market Report 2026<!-- --> - Global Outlook</a></h4>` +
  `</div></main></body></html>`;

test('selects official report-store h4 link and rejects wrong topic cards', () => {
  const html = `<html><body><h4><a href="/report/data-center-global-market-report">Data Center Market</a></h4>` +
    `<h4><a href="/report/robotics-and-automation-market-global-report">Robotics And Automation Market</a></h4></body></html>`;
  const parsed = parsePublisherSearchPage(html, 'robotics and automation');
  assert.match(parsed.selected.url, /robotics-and-automation-market-global-report/);
  assert.equal(parsed.diagnostics.search_page_cards, 2);
  assert.equal(parsed.diagnostics.title_matched_links, 1);
});

test('five official-site searches and five distinct report lookups each reach Ollama', async () => {
  const measured = [];
  const allCalls = [];
  for (let i = 0; i < KEYWORDS.length; i++) {
    const keyword = KEYWORDS[i];
    const result = await measureKeyword(keyword, {
      searchMode: 'publisher-site',
      fetchFn: async (url, opts) => {
        allCalls.push(url);
        if (url.includes('/global-market-reports?search=')) {
          assert.equal(new URL(url).searchParams.get('search'), keyword);
          return new Response(page(slugs[i], keyword), { status: 200 });
        }
        if (url.includes('/report/')) {
          assert.equal(url, `https://www.thebusinessresearchcompany.com/report/${slugs[i]}`);
          return new Response(`<html><h1>${keyword}</h1><p>${keyword} market ` +
            `2026 revenue $10 billion; forecast 2030 $15 billion. Growth Rate CAGR of 12.4% ` +
            `from 2026 to 2030.</p></html>`);
        }
        assert.equal(url, 'http://127.0.0.1:11434/api/generate');
        assert.match(JSON.parse(opts.body).prompt, /CAGR of 12\.4%/);
        return Response.json({ response: JSON.stringify({ growth_pct: 12.4,
          metric: 'FORECAST_CAGR', period_start: 2026, period_end: 2030 }),
          total_duration: 2_000_000 });
      }
    });
    measured.push(result);
  }
  assert.equal(allCalls.length, 15);
  assert.ok(allCalls.every((url) => !url.includes('bing.com')));
  assert.ok(measured.every((r) => r.state === 'PASS' && r.search_requests === 1 &&
    r.report_requests === 1 && r.ollama_generations === 1 && r.growth_pct === 12.4));
  assert.ok(measured.every((r) => r.search_ms !== null && r.report_ms !== null &&
    r.ollama_ms !== null && r.total_ms !== null));
});

test('missing matching topic on official site fails without a report or Ollama request', async () => {
  const result = await measureKeyword('nuclear reactor', {
    searchMode: 'publisher-site',
    fetchFn: async () => new Response(page('data-center-global-market-report', 'Data Center'))
  });
  assert.equal(result.state, 'FAILED');
  assert.equal(result.failure, 'SEARCH_NO_MATCHED_PUBLISHER_REPORT');
  assert.equal(result.search_page_cards, 1);
  assert.equal(result.title_matched_links, 0);
  assert.equal(result.report_requests, 0);
  assert.equal(result.ollama_generations, 0);
});
