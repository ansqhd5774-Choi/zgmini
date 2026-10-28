import test from 'node:test';
import assert from 'node:assert/strict';
import { R63_ADDRESS_HINTS, officialAddressHint } from './stage04-r63-official-address-hints-r78.mjs';
import { firstPartyOllamaAdapter } from './official-publisher-ollama-adapters-r71.mjs';
import { runForecastPipeline } from './ollama-forecast-pipeline-r70.mjs';
import { topicsFromArgs } from './run-ollama-forecast-r71.mjs';
import { executeR72 } from './run-ollama-forecast-r72-safe.mjs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const NO_DISCOVERY = async () => ({
  candidates: [], diagnostics: [], search_requests: 0, search_ms: 0
});

test('R78 locks 21 original themes and 60 official URLs; BRI stays excluded', () => {
  const entries = Object.entries(R63_ADDRESS_HINTS);
  assert.equal(entries.length, 21);
  const urls = entries.flatMap(([, reports]) => Object.values(reports).filter(Boolean));
  assert.equal(urls.length, 60);
  assert.equal(new Set(urls).size, 60);
  assert.equal(officialAddressHint('data center', 'BRI'), null);
  assert.equal(officialAddressHint('unknown market', 'SkyQuest'), null);
  assert.equal(officialAddressHint('data center', 'InvalidPublisher'), null);
  for (const [keyword, publishers] of entries) {
    assert.deepEqual(Object.keys(publishers).sort(), ['Precedence','SkyQuest','TBRC']);
    for (const [id, url] of Object.entries(publishers)) {
      assert.equal(officialAddressHint(keyword, id), url);
      if (!url) continue;
      const parsed = new URL(url);
      assert.equal(parsed.protocol, 'https:');
      assert.equal(parsed.username, '');
      assert.equal(parsed.password, '');
      assert.equal(parsed.hostname,
        {TBRC:'www.thebusinessresearchcompany.com',
          SkyQuest:'www.skyquestt.com',
          Precedence:'www.precedenceresearch.com'}[id]);
      assert.doesNotMatch(url, /(?:^|[?&])(?:growth|cagr|mean|rate|score)=/i);
    }
  }
});

test('R78 archived address is re-fetched live and Ollama decides a new DIRECT rate', async () => {
  const report = officialAddressHint('data center', 'SkyQuest');
  const calls = [];
  let modelCalls = 0;
  const adapter = firstPartyOllamaAdapter('SkyQuest', {
    fetchFn: async url => {
      calls.push(url);
      if (url !== report) throw Error('ONLY_ARCHIVED_OFFICIAL_URL_IS_AVAILABLE');
      return new Response('<h1>Data Center Market</h1><p>The data center market ' +
        'is forecast to grow at a compound annual growth rate (CAGR) of 11% from 2026 to 2032.</p>');
    },
    chooseFn: async () => {modelCalls++; return {index:0, scope:'DIRECT'};},
    discoverFn: NO_DISCOVERY
  });
  const result = await adapter.run({id:'topic-20',keyword:'data center'});
  assert.equal(result.state,'PASS');
  assert.equal(result.growth_pct,11);
  assert.equal(result.result_url,report);
  assert.deepEqual(calls,[report]);
  assert.equal(modelCalls,1);
  assert.equal(result.search_requests,0);
  assert.equal(result.discovery_diagnostics[0].method,'R63_OFFICIAL_ADDRESS_HINT');
});

test('R78 archived numbers never replace a live failed or blocked GET', async () => {
  const report = officialAddressHint('data center', 'Precedence');
  let modelCalls = 0;
  const adapter = firstPartyOllamaAdapter('Precedence', {
    fetchFn: async url => {
      assert.equal(url,report);
      return new Response('Denied', {status:403});
    },
    chooseFn: async () => {modelCalls++; return {index:0,scope:'DIRECT'};},
    discoverFn: NO_DISCOVERY
  });
  const result = await adapter.run({id:'topic-20',keyword:'data center'});
  assert.equal(result.state,'FAILED');
  assert.equal(result.growth_pct,null);
  assert.equal(modelCalls,0);
});

test('R78 historical submarket address cannot count toward theme research', async () => {
  const report = officialAddressHint('consumer discretionary', 'SkyQuest');
  let modelCalls = 0;
  const adapter = firstPartyOllamaAdapter('SkyQuest', {
    fetchFn: async url => {
      assert.equal(url,report);
      return new Response('<h1>Passenger Cars Market</h1><p>' +
        'Passenger cars market forecast CAGR 30% from 2026 to 2031.</p>');
    },
    chooseFn: async () => {modelCalls++; return {index:0,scope:'DIRECT'};},
    discoverFn: NO_DISCOVERY
  });
  const result = await adapter.run({id:'topic-03',keyword:'consumer discretionary'});
  assert.equal(result.state,'FAILED');
  assert.ok(['REPORT_MARKET_IDENTITY_UNVERIFIED',
    'SUBMARKET_OR_PROXY_REPORT_EXCLUDED'].includes(result.failure));
  assert.equal(result.growth_pct,null);
  assert.equal(modelCalls,0);
});

test('R78 two-source mean is calculated only from two independently refreshed publisher pages', async () => {
  const seen = [];
  const liveRates = { SkyQuest: 8, Precedence: 12 };
  const adapters = Object.keys(liveRates).map(id => firstPartyOllamaAdapter(id, {
    fetchFn: async url => {
      seen.push(url);
      assert.equal(url,officialAddressHint('data center',id));
      return new Response('<h1>Data Center Market</h1><p>' +
        `Data center market forecast CAGR ${liveRates[id]}% from 2026 to 2031.</p>`);
    },
    chooseFn: async () => ({index:0,scope:'DIRECT'}),
    discoverFn: NO_DISCOVERY
  }));
  const output = await runForecastPipeline([{id:'topic-20',keyword:'data center'}], adapters);
  assert.equal(output.results[0].source_count,2);
  assert.equal(output.results[0].mean_pct,10);
  assert.equal(new Set(seen).size,2);
});

test('R78 full 21-topic Windows runner accepts all 21, never silently returns to 5', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zgmini-r78-21-'));
  const keywords = Object.keys(R63_ADDRESS_HINTS);
  try {
    const report = await executeR72({outputDir:dir,args:keywords,
      loadProgram:async()=>({
        topicsFromArgs,
        r71Adapters:()=>[{id:'TBRC'},{id:'SkyQuest'},{id:'Precedence'}],
        runR71:async topics=>({results:[{
          keyword:topics[0].keyword,
          state:'INSUFFICIENT_INDEPENDENT_PUBLISHERS',
          source_count:0,mean_pct:null,publishers:[],warnings:[]
        }]})
      })
    });
    assert.equal(report.run_state,'COMPLETED');
    assert.equal(report.topics_total,21);
    assert.equal(report.topics_done,21);
    assert.equal(report.means_calculable,0);
    assert.equal(report.historical_cagr_used,false);
    assert.deepEqual(report.results.map(x=>x.keyword),keywords);
    const persisted=JSON.parse(await readFile(join(dir,
      'R72_OLLAMA_FORECAST_PIPELINE_RESULT.json'),'utf8'));
    assert.equal(persisted.results.length,21);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
