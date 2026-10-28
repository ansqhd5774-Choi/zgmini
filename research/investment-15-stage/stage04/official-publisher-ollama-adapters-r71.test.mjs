import test from 'node:test';
import assert from 'node:assert/strict';
import { firstPartyOllamaAdapter, discoverPublisherReports, exactMarketIdentity,
  livePublisherSlugProbes, reportLeadEvidence } from './official-publisher-ollama-adapters-r71.mjs';
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
  assert.deepEqual(report.candidates, [sources.SkyQuest.report]);
  assert.equal(report.search_requests, 4);
  assert.ok(report.diagnostics.some(x => x.method === 'UNVERIFIED_SLUG_PROBES'));
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

test('a narrow submarket cannot masquerade as an exact target market', () => {
  assert.equal(exactMarketIdentity('Data Center Liquid Cooling Valves Market', 'data center'), false);
  assert.equal(exactMarketIdentity('Global Data Center Market Report', 'data center'), true);
  assert.equal(exactMarketIdentity('Robotics and Automation Market 2030', 'robotics and automation'), true);
});

test('discovery continues search when official homepage contains only a submarket', async () => {
  const publisher = PUBLISHERS.find(p => p.id === 'Precedence');
  const unrelated = 'https://www.precedenceresearch.com/data-center-liquid-cooling-valves-market';
  let searchCount = 0;
  const found = await discoverPublisherReports(publisher, 'data center', {
    fetchFn: async url => new Response(url === sources.Precedence.catalog ?
      `<a href="${unrelated}">Data Center Liquid Cooling Valves</a>` : '<html/>'),
    searchFn: async () => { searchCount++; return '<html/>'; }
  });
  assert.equal(searchCount, 3);
  assert.ok(found.candidates.includes('https://www.precedenceresearch.com/data-center-market'));
  assert.ok(found.candidates.indexOf(unrelated) > found.candidates.indexOf('https://www.precedenceresearch.com/data-center-market'));
});

test('unverified direct slug probes are generated from dynamic keyword, never from stored CAGR', () => {
  const publisher = PUBLISHERS.find(p => p.id === 'SkyQuest');
  assert.deepEqual(livePublisherSlugProbes(publisher, 'robotics and automation'), [
    'https://www.skyquestt.com/report/robotics-and-automation-market',
    'https://www.skyquestt.com/report/robotics-automation-market'
  ]);
});

test('a direct official report found in Bing RSS stops additional engines', async () => {
  const publisher = PUBLISHERS.find(p => p.id === 'Precedence');
  const urls = [];
  const found = await discoverPublisherReports(publisher, 'robotics', {
    fetchFn: async () => new Response('<html/>'),
    searchFn: async url => {
      urls.push(url);
      return `<rss><item><link>${sources.Precedence.report}</link></item></rss>`;
    }
  });
  assert.equal(urls.length, 1);
  assert.match(urls[0], /format=rss/);
  assert.deepEqual(found.candidates, [sources.Precedence.report]);
});

test('submarket official report is excluded before calling local Ollama', async () => {
  const reportUrl = 'https://www.precedenceresearch.com/data-center-liquid-cooling-valves-market';
  let modelCalls = 0;
  const report = await firstPartyOllamaAdapter('Precedence', {
    fetchFn: async url => {
      if (url === sources.Precedence.catalog) return new Response(`<a href="${reportUrl}">Report</a>`);
      if (url === reportUrl) return new Response('<h1>Data Center Liquid Cooling Valves Market</h1><p>Forecast CAGR 8% from 2026 to 2033.</p>');
      return new Response('missing', { status: 404 });
    },
    searchFn: async () => '<html/>',
    chooseFn: async () => { modelCalls++; return {index:0,scope:'DIRECT'}; }
  }).run({ id: 'dc', keyword: 'data center' });
  assert.equal(report.growth_pct, null);
  assert.equal(modelCalls, 0);
  assert.equal(report.failure, 'SUBMARKET_OR_PROXY_REPORT_EXCLUDED');
});

test('regional CAGR below h2 cannot cancel the lead whole-market forecast CAGR', async () => {
  const doc = '<html><h1>Global Data Center Market</h1>' +
    '<p>The global data center market is projected to grow at CAGR 11.06% from 2026 to 2035.</p>' +
    '<h2>U.S. Data Center Market</h2>' +
    '<p>The U.S. data center market is forecast CAGR 11.30% from 2026 to 2035.</p></html>';
  assert.match(reportLeadEvidence(doc), /11\.06%/);
  assert.doesNotMatch(reportLeadEvidence(doc), /11\.30%/);
  const report = await firstPartyOllamaAdapter('Precedence', {
    fetchFn: async url => url === sources.Precedence.catalog ?
      new Response('<html/>') : url === 'https://www.precedenceresearch.com/data-center-market' ?
      new Response(doc) : new Response('missing', {status:404}),
    searchFn: async () => '<html/>',
    chooseFn: async () => ({index:0,scope:'DIRECT'})
  }).run({id:'dc',keyword:'data center'});
  assert.equal(report.state,'PASS');
  assert.equal(report.growth_pct,11.06);
  assert.equal(report.period_end,2035);
});

test('two explicit forecast periods in selected market excerpt are SOURCE_CONFLICT', async () => {
  const doc = '<html><h1>Nuclear Reactor Market</h1>' +
    '<p>The global market forecast CAGR 6.04% from 2026 to 2035, but the ' +
    'same market forecast CAGR 6.04% from 2025 to 2034.</p></html>';
  const report = await firstPartyOllamaAdapter('Precedence', {
    fetchFn: async url => url === sources.Precedence.catalog ?
      new Response('<html/>') : url === sources.Precedence.catalog + 'nuclear-reactor-market' ?
      new Response(doc) : new Response('missing', {status:404}),
    searchFn: async () => '<html/>',
    chooseFn: async () => ({index:0,scope:'DIRECT'})
  }).run({id:'nuclear',keyword:'nuclear reactor'});
  assert.equal(report.state,'SOURCE_CONFLICT');
  assert.equal(report.growth_pct,null);
  assert.equal(report.source_conflict_reason,
    'MULTIPLE_EXPLICIT_FORECAST_PERIODS_IN_SAME_CAGR_EXCERPT');
});
