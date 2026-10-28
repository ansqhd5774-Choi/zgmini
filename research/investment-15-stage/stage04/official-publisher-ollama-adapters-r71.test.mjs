import test from 'node:test';
import assert from 'node:assert/strict';
import { firstPartyOllamaAdapter, discoverPublisherReports, exactMarketIdentity,
  livePublisherSlugProbes, reportLeadEvidence, officialSitemapReports,
  primaryWholeMarketEvidence } from './official-publisher-ollama-adapters-r71.mjs';
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

test('R82: publisher spellings accept plural vehicles and unspaced cybersecurity, never a submarket', () => {
  assert.equal(exactMarketIdentity('Autonomous Vehicles Market Growth & Competitive Insights 2033',
    'autonomous vehicle'), true);
  assert.equal(exactMarketIdentity('Cybersecurity Market Companies, Size & Trends 2026-2035',
    'cyber security'), true);
  assert.equal(exactMarketIdentity('Autonomous Vehicles Sensors Market', 'autonomous vehicle'), false);
  assert.equal(exactMarketIdentity('Cybersecurity Insurance Market', 'cyber security'), false);
  assert.equal(exactMarketIdentity('Autonomous Vehicle Hardware Market', 'autonomous vehicle'), false);
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
    addressHintFn: () => null, // R75 generic fixture, not the R63 nuclear-power report
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

test('R75: official table of contents before the global section cannot cause US CAGR conflict', async () => {
  const doc = '<html><h1>Data Center Market Size and Trends</h1>' +
    '<p>Report updated 2026.</p><h2>List of Contents</h2>' +
    '<p>Revenue 2026, forecast 2035, CAGR 2026 - 2035 11.06%</p>' +
    '<h2>What is the Data Center Market Size?</h2>' +
    '<p>The global data center market is projected at CAGR of 11.06% from 2026 to 2035.</p>' +
    '<h2>Regional Insights</h2><p>U.S. data center market is projected at ' +
    'CAGR of 11.30% from 2026 to 2035.</p></html>';
  assert.match(primaryWholeMarketEvidence(doc, 'data center'), /11\.06%/);
  assert.doesNotMatch(primaryWholeMarketEvidence(doc, 'data center'), /11\.30%/);
  const report = await firstPartyOllamaAdapter('Precedence', {
    fetchFn: async url => url === sources.Precedence.catalog ?
      new Response('<html/>') : url === 'https://www.precedenceresearch.com/data-center-market' ?
      new Response(doc) : new Response('missing', {status:404}),
    searchFn: async () => '<html/>',
    chooseFn: async ({candidates}) => {
      assert.ok(candidates.every(c => c.pct === 11.06));
      return {index:0,scope:'DIRECT'};
    }
  }).run({id:'dc',keyword:'data center'});
  assert.equal(report.state, 'PASS');
  assert.equal(report.growth_pct, 11.06);
  assert.equal(report.evidence_region, 'PRIMARY_WHOLE_MARKET_SECTION');
});

test('R75: conflicting lead, title, and primary whole-market forecast periods remain NULL', async () => {
  const doc = '<html><h1>Nuclear Reactor Market</h1>' +
    '<p>The global nuclear reactor market is projected to grow from USD 31.51 billion ' +
    'in 2026 to USD 50.37 billion by 2034, registering a CAGR of 6.04% ' +
    'during the forecast period.</p>' +
    '<h2>List of Contents</h2><p>Nuclear reactor forecast</p>' +
    '<h2>Nuclear Reactor Market Size and Forecast 2026 to 2034</h2>' +
    '<p>The global nuclear reactor market is projected CAGR of 6.04% ' +
    'from 2025 to 2034.</p></html>';
  const report = await firstPartyOllamaAdapter('Precedence', {
    addressHintFn: () => null, // Exercise the legacy generic nuclear-reactor discovery fixture
    fetchFn: async url => url === sources.Precedence.catalog ?
      new Response('<html/>') : url === sources.Precedence.catalog + 'nuclear-reactor-market' ?
      new Response(doc) : new Response('missing', {status:404}),
    searchFn: async () => '<html/>',
    chooseFn: async () => ({index:0,scope:'DIRECT'})
  }).run({id:'reactor',keyword:'nuclear reactor'});
  assert.equal(report.state, 'SOURCE_CONFLICT');
  assert.equal(report.growth_pct, null);
  assert.equal(report.source_conflict_reason, 'WHOLE_MARKET_LEAD_AND_SECTION_PERIOD_MISMATCH');
});

test('R81: Precedence same-rate one-year labels pass only with independently matching whole-market sizes', async () => {
  for (const input of [
    { keyword:'fintech blockchain', baseYear:2026, endYear:2034,
      base:'1.02', end:'21.59', pct:46.31,
      lead:'The global FinTech blockchain market has a projected CAGR of 46.31% from 2025 to 2034.',
      heading:'FinTech Blockchain Market Size and Forecast 2026 to 2034' },
    { keyword:'biotechnology', baseYear:2025, endYear:2035,
      base:'1.77', end:'6.34', pct:13.61,
      lead:'The global biotechnology market is projected to grow from USD 2.02 trillion in 2026 to USD 6.34 trillion by 2035, registering a CAGR of 13.61%.',
      heading:'What is the Biotechnology Market Size?' }
  ]) {
    const reportUrl=`https://www.precedenceresearch.com/${input.keyword.replaceAll(' ','-')}-market`;
    const makeDocument=(end=input.end)=>(
      `<html><h1>${input.keyword} Market Size and Forecast</h1><p>${input.lead}</p>`+
      `<h2>${input.heading}</h2><p>The global ${input.keyword} market is forecast `+
      `to grow from USD ${input.base} trillion in ${input.baseYear} to USD ${end} `+
      `trillion by ${input.endYear}, registering a CAGR of ${input.pct}% `+
      `from ${input.baseYear} to ${input.endYear}.</p></html>`);
    const run=async end=>firstPartyOllamaAdapter('Precedence', {
      addressHintFn:()=>reportUrl,
      fetchFn:async url=>url===reportUrl?new Response(makeDocument(end)):
        new Response('missing',{status:404}),
      chooseFn:async()=>({index:0,scope:'DIRECT'})
    }).run({id:'check',keyword:input.keyword});
    const verified=await run(input.end);
    assert.equal(verified.state,'PASS',input.keyword);
    assert.equal(verified.growth_pct,input.pct);
    assert.deepEqual([verified.period_start,verified.period_end],
      [input.baseYear,input.endYear]);
    assert.equal(verified.source_conflict_reason,
      'WHOLE_MARKET_PERIOD_LABEL_VARIATION_SIZE_VERIFIED');
    const report=await runForecastPipeline([{id:'check',keyword:input.keyword}], [
      {id:'Precedence',officialHosts:['www.precedenceresearch.com'],run:async()=>verified},
      {id:'SkyQuest',officialHosts:['www.skyquestt.com'],run:async()=>({
        state:'PASS',result_url:'https://www.skyquestt.com/report/example-market',
        source_audit:'CONSISTENT',metric:'FORECAST_CAGR',growth_pct:5,
        forecast_narrative_pct:5,forecast_base_year:2026,forecast_end_year:2033,
        period_start:2026,period_end:2033
      })}
    ]);
    assert.equal(report.results[0].source_count,2);
    assert.ok(report.results[0].warnings.includes(
      'PUBLISHER_PERIOD_LABEL_VARIATION_VERIFIED_BY_MARKET_SIZES'));
    const unsupported=await run('999');
    assert.equal(unsupported.state,'SOURCE_CONFLICT');
    assert.equal(unsupported.growth_pct,null);
  }
});

test('R82: Precedence lead may repeat both adjacent labels; only independently size-proven primary rate passes', async () => {
  const url='https://www.precedenceresearch.com/fintech-blockchain-market';
  const doc=(size='21.59',leadExtra='2026 to 2034')=>
    '<html><h1>FinTech Blockchain Market Companies, Size & Trends</h1>' +
    '<p>The global fintech blockchain market has a projected CAGR of 46.31% from 2025 to 2034. ' +
    `The same rate is also listed for ${leadExtra} in the report highlights.</p>` +
    '<h2>FinTech Blockchain Market Size and Forecast 2026 to 2034</h2>' +
    `<p>The global fintech blockchain market size was calculated at USD 1.02 trillion in 2026 ` +
    `and is predicted to reach USD ${size} trillion by 2034, expanding at a CAGR of 46.31% ` +
    'from 2026 to 2034.</p></html>';
  const run=async (html)=>firstPartyOllamaAdapter('Precedence',{
    addressHintFn:()=>url,
    fetchFn:async target=>target===url?new Response(html):new Response('missing',{status:404}),
    chooseFn:async()=>({index:0,scope:'DIRECT'})
  }).run({id:'fintech',keyword:'fintech blockchain'});
  const pass=await run(doc());
  assert.equal(pass.state,'PASS',pass.failure);
  assert.equal(pass.growth_pct,46.31);
  assert.equal(pass.period_start,2026);
  assert.equal(pass.period_end,2034);
  const mismatch=await run(doc('19.59'));
  assert.equal(mismatch.state,'SOURCE_CONFLICT');
  const unrelated=await run(doc('21.59','2023 to 2034'));
  assert.equal(unrelated.state,'SOURCE_CONFLICT');
});

test('R76: official SkyQuest Market Insights separates 2025 size baseline from the 2026-2033 CAGR forecast', async () => {
  const doc = '<html><h1>Data Center Market Size, Share, and Growth Analysis</h1>' +
    '<h2>Data Center Market Size, Share & Trends Analysis Report</h2><p>Overview</p>' +
    '<h2>Data Center Market Insights</h2>' +
    '<p>Global Data Center market size is poised to grow from USD 564.02 Billion ' +
    'in 2025 to USD 1348.35 Billion by 2033, growing at a CAGR of 11.51% ' +
    'in the forecast period (2026&amp;ndash;2033).</p>' +
    '<h2>Data Center Market Segments Analysis</h2><p>The hardware segment CAGR is 10.7% ' +
    'from 2026 to 2033.</p></html>';
  // Real publisher HTML uses the literal &ndash; entity; it should not be
  // confused with the reference year of its prior market-size estimate.
  const officialDoc = doc.replace('&amp;ndash;', '&ndash;');
  const source = primaryWholeMarketEvidence(officialDoc, 'data center');
  assert.match(source, /11\.51%/);
  assert.doesNotMatch(source, /10\.7%/);
  const report = await firstPartyOllamaAdapter('SkyQuest', {
    fetchFn: async url => url === sources.SkyQuest.catalog ?
      new Response('<html/>') : url === 'https://www.skyquestt.com/report/data-center-market' ?
      new Response(officialDoc) : new Response('missing', {status:404}),
    searchFn: async () => '<html/>',
    chooseFn: async ({candidates}) => {
      assert.deepEqual(candidates.map(x => x.pct), [11.51]);
      return {index:0, scope:'DIRECT'};
    }
  }).run({id:'dc',keyword:'data center'});
  assert.equal(report.state, 'PASS');
  assert.equal(report.period_start, 2026);
  assert.equal(report.period_end, 2033);
  assert.equal(report.evidence_region, 'PRIMARY_WHOLE_MARKET_SECTION');
});

test('R76: independent publisher mean accepts verified different periods with explicit warning', async () => {
  const doc = '<html><h1>Data Center Market</h1><h2>Data Center Market Insights</h2>' +
    '<p>The global data center market forecast CAGR is 11.51% from 2026 to 2033.</p></html>';
  const doc2 = '<html><h1>Data Center Market</h1><h2>What is the Data Center Market Size?</h2>' +
    '<p>The global data center market is forecast CAGR of 11.06% from 2026 to 2035.</p></html>';
  const fetchFn = async url => url === sources.SkyQuest.catalog || url === sources.Precedence.catalog ?
    new Response('<html/>') : url === 'https://www.skyquestt.com/report/data-center-market' ?
    new Response(doc) : url === 'https://www.precedenceresearch.com/data-center-market' ?
    new Response(doc2) : new Response('missing', {status:404});
  const result = await runForecastPipeline([{id:'dc',keyword:'data center'}], [
    firstPartyOllamaAdapter('SkyQuest', {fetchFn,searchFn:async()=>'<html/>',
      chooseFn:async()=>({index:0,scope:'DIRECT'})}),
    firstPartyOllamaAdapter('Precedence', {fetchFn,searchFn:async()=>'<html/>',
      chooseFn:async()=>({index:0,scope:'DIRECT'})})
  ]);
  assert.equal(result.results[0].state, 'RESEARCH_MEAN_CALCULABLE');
  assert.equal(result.results[0].source_count, 2);
  assert.ok(result.results[0].warnings.includes('DIFFERENT_FORECAST_PERIODS_REVIEW_SCOPE'));
});

test('R77: official robots-advertised report sitemap discovers only literal exact-market URLs', async () => {
  const publisher = PUBLISHERS.find(p => p.id === 'SkyQuest');
  const sitemapUrl = 'https://www.skyquestt.com/reports.xml';
  let engineCalls = 0;
  const fetchFn = async url => {
    if (url === sources.SkyQuest.catalog) return new Response('<html/>');
    if (url === 'https://www.skyquestt.com/robots.txt') {
      return new Response(`User-agent: *\nSitemap: ${sitemapUrl}\n`);
    }
    if (url === sitemapUrl) return new Response('<urlset>' +
      '<url><loc>https://www.skyquestt.com/report/data-center-cooling-market</loc></url>' +
      '<url><loc>https://www.skyquestt.com/report/data-center-market</loc></url>' +
      '<url><loc>https://evil.example/report/data-center-market</loc></url></urlset>');
    return new Response('missing', {status:404});
  };
  const sitemap = await officialSitemapReports(publisher, {fetchFn});
  assert.equal(sitemap.requests, 2);
  assert.equal(sitemap.urls.length, 2);
  const found = await discoverPublisherReports(publisher, 'data center', {
    fetchFn, searchFn: async () => {engineCalls++; return '<html/>';}
  });
  assert.equal(found.candidates[0], 'https://www.skyquestt.com/report/data-center-market');
  assert.equal(engineCalls, 0);
  assert.equal(found.search_requests, 3);
  assert.ok(found.diagnostics.some(x => x.method === 'OFFICIAL_SITEMAP' && x.found === 1));
});

test('R77: official sitemap is fetched once for multiple topics in the same PC run', async () => {
  let robotCalls = 0, sitemapCalls = 0, modelCalls = 0;
  const url1 = 'https://www.skyquestt.com/report/robotics-market';
  const url2 = 'https://www.skyquestt.com/report/data-center-market';
  const fetchFn = async url => {
    if (url === sources.SkyQuest.catalog) return new Response('<html/>');
    if (url === 'https://www.skyquestt.com/robots.txt') {
      robotCalls++;
      return new Response('Sitemap: https://www.skyquestt.com/reports.xml');
    }
    if (url === 'https://www.skyquestt.com/reports.xml') {
      sitemapCalls++;
      return new Response(`<urlset><loc>${url1}</loc><loc>${url2}</loc></urlset>`);
    }
    if (url === url1 || url === url2) return new Response('<h1>' +
      (url === url1 ? 'Robotics Market' : 'Data Center Market') +
      '</h1><p>The global market is forecast CAGR 8% from 2026 to 2033.</p>');
    return new Response('missing', {status:404});
  };
  const adapter = firstPartyOllamaAdapter('SkyQuest', {fetchFn,
    searchFn:async()=>'<html/>', addressHintFn:()=>null,
    chooseFn:async()=>{modelCalls++;return {index:0,scope:'DIRECT'};}});
  const first = await adapter.run({id:'robotics',keyword:'robotics'});
  const second = await adapter.run({id:'data-center',keyword:'data center'});
  assert.equal(first.state,'PASS');
  assert.equal(second.state,'PASS');
  assert.equal(robotCalls,1);
  assert.equal(sitemapCalls,1);
  assert.equal(modelCalls,2);
  assert.ok(second.discovery_diagnostics.some(x =>
    x.method === 'OFFICIAL_SITEMAP' && x.state === 'REUSED_CURRENT_RUN'));
});
