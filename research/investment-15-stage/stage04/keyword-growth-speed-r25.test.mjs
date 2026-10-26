import test from 'node:test';
import assert from 'node:assert/strict';
import { measureKeyword, parseOneSpecialistResult, KEYWORDS } from './keyword-growth-speed-r25-readonly.mjs';

const link = 'https://www.thebusinessresearchcompany.com/report/robotics-and-automation-market-global-report';
const sample = 'Robotics And Automation market size reached $100.0 billion in 2025 and is expected to grow from $115.0 billion in 2026 to $202.54 billion by 2030 at a CAGR of 21.0% during the forecast period.';
const item = (title, href, description) => `<item><title>${title}</title><link>${href}</link><description><![CDATA[${description}]]></description></item>`;
const feed = (items) => `<rss version="2.0"><channel>${items.join('')}</channel></rss>`;
const completion = Response.json({ response: JSON.stringify({ growth_pct: 21,
  metric: 'FORECAST_CAGR', period_start: 2026, period_end: 2030 }),
  total_duration: 2_300_000 });

test('selects ONE keyword-matched specialist result, rejecting unrelated domains', () => {
  const xml = feed([
    item('Robotics And Automation', 'https://unrelated.com/report', sample),
    item('Robotics And Automation Market', link, sample)
  ]);
  const selected = parseOneSpecialistResult(xml, 'robotics and automation');
  assert.equal(selected.url, link);
  assert.match(selected.description, /21\.0%/);
});

test('short indexed excerpt goes to Ollama without visiting report page', async () => {
  const calls = [];
  const output = await measureKeyword('robotics and automation', {
    fetchFn: async (url, opt) => {
      calls.push(url);
      if (url.includes('bing.com/search')) {
        assert.match(decodeURIComponent(url), /site:thebusinessresearchcompany.com\/report\//);
        return new Response(feed([item('Robotics And Automation Market', link, sample)]));
      }
      assert.equal(url, 'http://127.0.0.1:11434/api/generate');
      assert.ok(JSON.parse(opt.body).prompt.length < 1250);
      return completion.clone();
    }
  });
  assert.equal(output.state, 'PASS');
  assert.equal(output.growth_pct, 21);
  assert.equal(output.search_requests, 1);
  assert.equal(output.report_requests, 0);
  assert.equal(output.ollama_generations, 1);
  assert.equal(calls.length, 2);
});

test('incomplete index description fetches only ONE matched report', async () => {
  const calls = [];
  const output = await measureKeyword('robotics and automation', {
    fetchFn: async (url) => {
      calls.push(url);
      if (url.includes('bing.com/search')) {
        return new Response(feed([item('Robotics And Automation Market', link, 'Report summary') ]));
      }
      if (url === link) return new Response(`<html><p>${sample}</p></html>`);
      return completion.clone();
    }
  });
  assert.equal(output.state, 'PASS');
  assert.equal(output.report_requests, 1);
  assert.equal(calls.length, 3);
});

test('Bing 403 halts this keyword without crawling or model invocation', async () => {
  let calls = 0;
  const output = await measureKeyword(KEYWORDS[0], { fetchFn: async () => {
    calls++; return new Response('blocked', { status: 403 });
  } });
  assert.equal(output.state, 'FAILED');
  assert.equal(output.failure, 'SEARCH_HTTP_403');
  assert.ok(Number.isFinite(output.search_ms));
  assert.equal(output.ollama_generations, 0);
  assert.equal(calls, 1);
});

test('no indexed specialist result is a missing measurement', async () => {
  const output = await measureKeyword(KEYWORDS[0], { fetchFn: async () =>
    new Response(feed([item('Unrelated', 'https://www.thebusinessresearchcompany.com/report/other', 'x')])) });
  assert.equal(output.state, 'FAILED');
  assert.equal(output.failure, 'SEARCH_NO_MATCHED_PUBLISHER_REPORT');
});

test('all five distinct keywords produce separately measured search failures', async () => {
  const urls = [];
  const results = [];
  for (const keyword of KEYWORDS) {
    const output = await measureKeyword(keyword, { fetchFn: async (url) => {
      urls.push(decodeURIComponent(url));
      return new Response('denied', { status: 403 });
    } });
    results.push(output);
  }
  assert.equal(KEYWORDS.length, 5);
  assert.equal(new Set(urls).size, 5);
  assert.ok(KEYWORDS.every((keyword, index) => urls[index].includes(`"${keyword}"`)));
  assert.ok(results.every((result) => result.state === 'FAILED' && result.search_requests === 1 &&
    result.report_requests === 0 && result.ollama_generations === 0 && result.search_ms !== null && result.total_ms !== null));
});

test('one shared 20-second maximum can abort search for a single keyword', async () => {
  let calls = 0;
  const output = await measureKeyword(KEYWORDS[0], { maxMs: 25, fetchFn: (_, { signal }) => {
    calls++;
    return new Promise((_, reject) => signal.addEventListener('abort',
      () => reject(new Error('aborted')), { once: true }));
  } });
  assert.equal(output.failure, 'KEYWORD_DEADLINE_EXCEEDED');
  assert.equal(output.state, 'FAILED');
  assert.equal(calls, 1);
});
