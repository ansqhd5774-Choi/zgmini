import test from 'node:test';
import assert from 'node:assert/strict';
import { firstPartyOllamaAdapter, discoverPublisherReports } from './official-publisher-ollama-adapters-r71.mjs';
import { runForecastPipeline } from './ollama-forecast-pipeline-r70.mjs';
import { PUBLISHERS } from './stage04-four-publisher-r37-readonly.mjs';

const sources = {
  SkyQuest: {
    catalog: 'https://www.skyquestt.com/report',
    report: 'https://www.skyquestt.com/report/robotics-market'
  },
  Precedence: {
    catalog: 'https://www.precedenceresearch.com/',
    report: 'https://www.precedenceresearch.com/robotics-market'
  }
};
const topic = { id: 'topic-dynamic', keyword: 'robotics' };

function mockHttp({ rates = { SkyQuest: 8, Precedence: 10 }, blocked = [], conflict = [] } = {}) {
  const calls = [];
  const fn = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === 'http://127.0.0.1:11434/api/generate') {
      const body = JSON.parse(options.body);
      assert.equal(body.stream, false);
      assert.deepEqual(body.format.required, ['index', 'scope']);
      return new Response(JSON.stringify({ response: JSON.stringify({ index: 0, scope: 'DIRECT' }) }));
    }
    const entry = Object.values(sources).find(s => s.catalog === url || s.report === url);
    if (!entry) return new Response('<html></html>');
    if (blocked.includes(url)) return new Response('Access denied', { status: 403 });
    const id = Object.entries(sources).find(([,s]) => s === entry)[0];
    if (url === entry.catalog) {
      return new Response(`<html><body><a href="${entry.report}">Robotics Market</a></body></html>`);
    }
    const rate = rates[id];
    const text = `<html><h1>Global Robotics Market Report</h1>` +
      `<p>The global robotics market forecast is projected at a compound annual growth rate (CAGR) of ${rate}% from 2026 to 2031.</p>` +
      (conflict.includes(id) ? `<p>Robotics market forecast CAGR of ${rate + 2}% from 2026 to 2031.</p>` : '') +
      `</html>`;
    return new Response(text);
  };
  fn.calls = calls;
  return fn;
}

test('SkyQuest uses live official catalog+report and local Ollama selector, with no historical input', async () => {
  const fn = mockHttp();
  const report = await firstPartyOllamaAdapter('SkyQuest', { fetchFn: fn,
    searchFn: async () => '<html></html>' }).run(topic);
  assert.equal(report.state, 'PASS');
  assert.equal(report.growth_pct, 8);
  assert.equal(report.source_audit, 'EXCERPT_PERIOD_VERIFIED');
  assert.equal(report.period_start, 2026);
  assert.equal(report.period_end, 2031);
  assert.ok(fn.calls.some(c => c.url === sources.SkyQuest.report));
  assert.ok(fn.calls.some(c => c.url.includes('127.0.0.1:11434/api/generate')));
});

test('Precedence official homepage report path is discovered without hard-coded report seeds', async () => {
  const fn = mockHttp();
  const report = await firstPartyOllamaAdapter('Precedence', { fetchFn: fn,
    searchFn: async () => '<html></html>' }).run(topic);
  assert.equal(report.state, 'PASS');
  assert.equal(report.growth_pct, 10);
  assert.equal(report.report_market_title, 'Global Robotics Market Report');
});

test('real two independent publisher adapters may calculate only research mean', async () => {
  const fn = mockHttp();
  const adapters = ['SkyQuest', 'Precedence'].map(id =>
    firstPartyOllamaAdapter(id, { fetchFn: fn, searchFn: async () => '<html></html>' }));
  const report = await runForecastPipeline([topic], adapters);
  assert.equal(report.results[0].mean_pct, 9);
  assert.equal(report.results[0].source_count, 2);
  assert.ok(report.results[0].warnings.includes('EXCERPT_ONLY_AUDIT_NO_SIZE_TRIANGULATION'));
});

test('one source conflicting inside the official report yields NULL and cannot fill two-source gate', async () => {
  const fn = mockHttp({ conflict: ['SkyQuest'] });
  const adapters = ['SkyQuest', 'Precedence'].map(id =>
    firstPartyOllamaAdapter(id, { fetchFn: fn, searchFn: async () => '<html></html>' }));
  const report = await runForecastPipeline([topic], adapters);
  assert.equal(report.results[0].mean_pct, null);
  assert.equal(report.results[0].source_count, 1);
  assert.equal(report.results[0].publishers[0].state, 'SOURCE_CONFLICT');
});

test('official HTTP 403 does not call Ollama or create CAGR', async () => {
  const fn = mockHttp({ blocked: [sources.SkyQuest.report] });
  const report = await firstPartyOllamaAdapter('SkyQuest', { fetchFn: fn,
    searchFn: async () => '<html></html>' }).run(topic);
  assert.equal(report.state, 'FAILED');
  assert.equal(report.growth_pct, null);
  assert.equal(fn.calls.filter(c => c.url.includes('/api/generate')).length, 0);
});

test('official source with a CAGR but no nearby period remains unresolved', async () => {
  const fn = async (url, options) => {
    if (url === sources.SkyQuest.catalog) return new Response(`<a href="${sources.SkyQuest.report}">Robotics</a>`);
    if (url === sources.SkyQuest.report) return new Response('<h1>Robotics Market</h1><p>Forecast CAGR of 8% is anticipated.</p>');
    if (url.includes('/api/generate')) return new Response(JSON.stringify({response:'{"index":0,"scope":"DIRECT"}'}));
    return new Response('<html></html>');
  };
  const report = await firstPartyOllamaAdapter('SkyQuest', { fetchFn: fn,
    searchFn: async () => '<html></html>' }).run(topic);
  assert.equal(report.growth_pct, null);
  assert.equal(report.failure, 'FORECAST_PERIOD_NOT_EXPLICIT_IN_CAGR_EXCERPT');
});

test('the search process rejects unrelated and nonofficial report links', async () => {
  const publisher = PUBLISHERS.find(p => p.id === 'SkyQuest');
  const fn = async url => new Response(url === sources.SkyQuest.catalog ?
    '<a href="https://evil.example/report/robotics-market">Robotics</a><a href="/report/unrelated-market">Other</a>' : '<html></html>');
  const report = await discoverPublisherReports(publisher, 'robotics', { fetchFn: fn,
    searchFn: async () => '<html></html>' });
  assert.deepEqual(report.candidates, []);
});

test('BRI cannot be added as a current publisher adapter', () => {
  assert.throws(() => firstPartyOllamaAdapter('BRI'), /R71_UNSUPPORTED_PUBLISHER/);
});

test('a source only recognized as market proxy cannot enter the mean', async () => {
  const fn = mockHttp();
  const chooseFn = async () => ({ index: 0, scope: 'PROXY' });
  const report = await runForecastPipeline([topic], [
    firstPartyOllamaAdapter('SkyQuest', { fetchFn: fn, chooseFn,
      searchFn: async () => '<html></html>' }),
    firstPartyOllamaAdapter('Precedence', { fetchFn: fn,
      searchFn: async () => '<html></html>' })
  ]);
  assert.equal(report.results[0].mean_pct, null);
  assert.equal(report.results[0].source_count, 1);
  assert.equal(report.results[0].publishers[0].reason, 'PROXY_MARKET_SCOPE_EXCLUDED');
});
