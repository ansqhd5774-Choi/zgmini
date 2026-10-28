import test from 'node:test';
import assert from 'node:assert/strict';
import { runForecastPipeline, tbrcR30Adapter } from './ollama-forecast-pipeline-r70.mjs';
import { auditForecastSource } from './forecast-source-audit-r29-readonly.mjs';
import { proveR82ForecastMetadataPeriodMislabel } from './forecast-source-audit-r82-supplement.mjs';
import { measureKeyword } from './keyword-growth-speed-r25-readonly.mjs';

const hosts = {
  TBRC: ['www.thebusinessresearchcompany.com'],
  SkyQuest: ['www.skyquestt.com'],
  Precedence: ['www.precedenceresearch.com']
};
const sourceUrl = {
  TBRC: 'https://www.thebusinessresearchcompany.com/report/example-global-market-report',
  SkyQuest: 'https://www.skyquestt.com/report/example-market',
  Precedence: 'https://www.precedenceresearch.com/example-market'
};
const valid = (id, pct, dates = [2026, 2030]) => ({
  publisher: id, state: 'PASS', result_url: sourceUrl[id], source_audit: 'CONSISTENT',
  metric: 'FORECAST_CAGR', growth_pct: pct, model_candidate_pct: pct,
  forecast_narrative_pct: pct, period_start: dates[0], period_end: dates[1],
  forecast_base_year: dates[0], forecast_end_year: dates[1], model: 'gemma3:4b'
});
const adapter = (id, raw) => ({ id, officialHosts: hosts[id], run: async () => raw });
const topic = [{ id: 'test', keyword: 'robotics and automation' }];

test('one live publisher is never silently presented as a two-publisher mean', async () => {
  const report = await runForecastPipeline(topic, [adapter('TBRC', valid('TBRC', 21))],
    { observedAt: () => '2026-10-28T00:00:00.000Z' });
  assert.equal(report.results[0].mean_pct, null);
  assert.equal(report.results[0].source_count, 1);
  assert.equal(report.results[0].state, 'INSUFFICIENT_INDEPENDENT_PUBLISHERS');
  assert.deepEqual(report.missing_publisher_adapters, ['SkyQuest', 'Precedence']);
});

test('two distinct verified publishers form arithmetic research mean', async () => {
  const report = await runForecastPipeline(topic,
    [adapter('TBRC', valid('TBRC', 3)), adapter('SkyQuest', valid('SkyQuest', 5))]);
  assert.equal(report.results[0].mean_pct, 4);
  assert.deepEqual(report.results[0].included_publishers, ['TBRC', 'SkyQuest']);
});

test('three publishers with one actual source conflict still give valid 2-publisher mean', async () => {
  const conflict = { ...valid('SkyQuest', 7), state: 'SOURCE_CONFLICT',
    source_audit: 'SOURCE_CONFLICT', failure: 'SOURCE_FORECAST_VALUES_DISAGREE' };
  const report = await runForecastPipeline(topic, [adapter('TBRC', valid('TBRC', 3)),
    adapter('SkyQuest', conflict), adapter('Precedence', valid('Precedence', 5))]);
  assert.equal(report.results[0].mean_pct, 4);
  assert.equal(report.results[0].publishers[1].growth_pct, null);
  assert.equal(report.results[0].publishers[1].state, 'SOURCE_CONFLICT');
});

test('zero percent is not NULL and counts as valid CAGR', async () => {
  const report = await runForecastPipeline(topic,
    [adapter('TBRC', valid('TBRC', 0)), adapter('SkyQuest', valid('SkyQuest', 4))]);
  assert.equal(report.results[0].mean_pct, 2);
});

test('same publisher cannot appear twice even under distinct adapter objects', async () => {
  await assert.rejects(runForecastPipeline(topic,
    [adapter('TBRC', valid('TBRC', 3)), adapter('TBRC', valid('TBRC', 5))]),
  /DUPLICATE_PUBLISHER_ADAPTER/);
});

test('bad original host, period, audit or metric are rejected independently of model PASS', async () => {
  for (const tampered of [
    { result_url: 'https://evil.example/report/pretend' },
    { period_start: 2030 },
    { source_audit: 'INCOMPLETE' },
    { metric: 'HISTORIC_YOY' },
    { forecast_narrative_pct: 99 }
  ]) {
    const report = await runForecastPipeline(topic, [adapter('TBRC', { ...valid('TBRC', 3), ...tampered }),
      adapter('SkyQuest', valid('SkyQuest', 5))]);
    assert.equal(report.results[0].mean_pct, null);
    assert.equal(report.results[0].publishers[0].growth_pct, null);
  }
});

test('different but source-verified forecast periods yield explicit warning, not silent equivalence', async () => {
  const report = await runForecastPipeline(topic, [adapter('TBRC', valid('TBRC', 3)),
    adapter('SkyQuest', valid('SkyQuest', 5, [2027, 2032]))]);
  assert.equal(report.results[0].mean_pct, 4);
  assert.ok(report.results[0].warnings.includes('DIFFERENT_FORECAST_PERIODS_REVIEW_SCOPE'));
});

test('adapter errors are isolated per publisher, allowing remaining sources to pass', async () => {
  const fail = { id: 'TBRC', officialHosts: hosts.TBRC,
    run: async () => { throw new Error('HTTP_403'); } };
  const report = await runForecastPipeline(topic, [fail,
    adapter('SkyQuest', valid('SkyQuest', 6)), adapter('Precedence', valid('Precedence', 8))]);
  assert.equal(report.results[0].mean_pct, 7);
  assert.equal(report.results[0].publishers[0].reason, 'HTTP_403');
});

test('R30 adapter always requests verified rate-only mode and direct official market title', async () => {
  let called;
  const a = tbrcR30Adapter(async (keyword, options) => { called = { keyword, options }; return valid('TBRC', 5); });
  await a.run({ id: 'random', keyword: 'fresh market without hardcoded list' });
  assert.equal(called.keyword, 'fresh market without hardcoded list');
  assert.equal(called.options.strictMarketScope, true);
  assert.equal(called.options.rateOnlyFromSource, true);
  assert.equal(called.options.resolveHistoricTableMislabel, true);
  assert.deepEqual(called.options.allowedKeywords, [called.keyword]);
});

test('R79 TBRC R30 uses original official report-market keyword, not broad sector', async () => {
  let queried;
  const adapterWithR63 = tbrcR30Adapter(async (keyword, options) => {
    queried = {keyword,options};
    return valid('TBRC',7);
  }, {researchMarketFn:()=> 'passenger car'});
  const out = await adapterWithR63.run({id:'topic-03',keyword:'consumer discretionary'});
  assert.equal(queried.keyword,'passenger car');
  assert.deepEqual(queried.options.allowedKeywords,['passenger car']);
  assert.equal(out.market_scope,'R63_REFERENCE');
  assert.equal(out.research_market_provenance,'R63_OFFICIAL_REPORT_URL');
  assert.equal(out.growth_pct,7);
});

test('R79 refuses forged reference report provenance or unverified proxy scope', async () => {
  const fake = {...valid('SkyQuest',6),source_audit:'EXCERPT_PERIOD_VERIFIED',
    market_scope:'R63_REFERENCE',research_market_keyword:'passenger cars'};
  const report = await runForecastPipeline(topic,[
    adapter('SkyQuest',fake),adapter('Precedence',valid('Precedence',8))]);
  assert.equal(report.results[0].mean_pct,null);
  assert.equal(report.results[0].publishers[0].reason,'R63_REFERENCE_PROVENANCE_NOT_VERIFIED');
});

function r31HistoricMislabelFixture(name, historic, base, forecast, historicRate, forecastRate) {
  return `<html><h2>What Is The ${name} Market Size and Share 2026?</h2>` +
    `<p>It will grow from $${historic} billion in 2025 to $${base} billion in 2026 ` +
    `at a compound annual growth rate (CAGR) of ${historicRate}%.</p>` +
    `<h2>What Is The ${name} Market Growth Forecast?</h2>` +
    `<p>It will grow to $${forecast} billion in 2030 at a compound annual ` +
    `growth rate (CAGR) of ${forecastRate}%.</p>` +
    `<h2>${name} Market Report Forecast Analysis</h2><p>Market Size Value In 2026 ` +
    `$${base} billion Revenue Forecast In 2030 $${forecast} billion ` +
    `Growth Rate CAGR of ${historicRate}% from 2026 to 2030</p></html>`;
}

test('R81 applies the established independent R31 proof to every TBRC topic', async () => {
  for (const keyword of ['consumer staples','fintech','biotechnology services',
    'data center','cloud computing','consumer discretionary','random legitimate topic']) {
    let called;
    await tbrcR30Adapter(async (query, opts) => {
      called = opts;
      return valid('TBRC',5);
    }).run({id:'t',keyword});
    assert.equal(called.resolveHistoricTableMislabel,true);
    assert.equal(called.rateOnlyFromSource,true);
    assert.equal(called.strictMarketScope,true);
  }
});

test('R81 retains all ten mathematically proven R31 historic-mislabel reports; invented proof still fails', async () => {
  for (const entry of [
    ['Passenger Car', 1644.2, 1749.76, 2325.31, 6.4, 7.4],
    ['Financial Services', 36130.35, 38583.29, 51116.31, 6.8, 7.3],
    ['Advanced Materials', 91.27, 98.22, 134.03, 7.6, 8.1],
    ['Staple Food', 1838.96, 1963.65, 2485.28, 6.8, 6.1],
    ['Real Estate', 4443.46, 4744.35, 6267.22, 6.8, 7.2],
    ['Cloud Computing', 832.8, 959.79, 1711.49, 15.2, 15.6],
    ['Defense', 506.9, 542.72, 739.43, 7.1, 8.0],
    ['FinTech Blockchain', 6.45, 9.55, 39.18, 48.2, 42.3],
    ['Biotechnology Services', 178.54, 196.54, 314.12, 10.1, 12.4],
    ['Data Center', 299.63, 324.25, 460.61, 8.2, 9.2]
  ]) {
    const [name,historic,base,forecast,historicRate,forecastRate]=entry;
    const html=r31HistoricMislabelFixture(name,historic,base,forecast,historicRate,forecastRate);
    const before=auditForecastSource(html);
    assert.equal(before.source_audit,'SOURCE_CONFLICT');
    assert.equal(before.source_conflict_reason,'TABLE_DISAGREES_WITH_MARKET_SIZES');
    const proven=auditForecastSource(html,{resolveHistoricTableMislabel:true});
    assert.equal(proven.source_audit,'RESOLVED_HISTORIC_RATE_MISLABEL');
    assert.equal(proven.source_conflict_reason,'FORECAST_METADATA_REPEATS_VERIFIED_HISTORIC_CAGR');
    const source={...valid('TBRC',forecastRate),...proven};
    const report=await runForecastPipeline(topic,[
      adapter('TBRC',source),adapter('SkyQuest',valid('SkyQuest',6))]);
    assert.equal(report.results[0].source_count,2);
    assert.equal(report.results[0].mean_pct,Number(((forecastRate+6)/2).toFixed(6)));
    assert.ok(report.results[0].warnings.includes(
      'R31_PUBLISHER_FORECAST_TABLE_HISTORIC_CAGR_MISLABEL_PROVEN'));
    const fake=await runForecastPipeline(topic,[
      adapter('TBRC',{...source,historic_math_pct:999}),
      adapter('SkyQuest',valid('SkyQuest',6))]);
    assert.equal(fake.results[0].source_count,1);
    assert.equal(fake.results[0].mean_pct,null);
  }
});

test('R82: archived TBRC address is a fresh GET hint, never a cached growth rate', async () => {
  const calls = [];
  const hint = 'https://www.thebusinessresearchcompany.com/report/information-technology-global-market-report';
  const report = await tbrcR30Adapter(async (keyword, options) => {
    calls.push({keyword,options});
    return valid('TBRC',8.3);
  }).run({id:'it', keyword:'information technology'});
  assert.equal(calls.length,1);
  assert.equal(calls[0].keyword,'information technology');
  assert.equal(calls[0].options.officialReportHint,hint);
  assert.equal(calls[0].options.resolveForecastMetadataYearMislabel,true);
  assert.equal(report.growth_pct,8.3);
});

test('R82: rejected or unavailable TBRC hint falls back to live report-store search', async () => {
  const calls = [];
  const output = await tbrcR30Adapter(async (keyword, options) => {
    calls.push(options);
    return options.officialReportHint ? {
      state:'FAILED', failure:'PUBLISHER_HINT_MARKET_TITLE_NOT_DIRECT'
    } : valid('TBRC', 8.3);
  }).run({id:'it',keyword:'information technology'});
  assert.equal(calls.length,2);
  assert.ok(calls[0].officialReportHint);
  assert.equal(calls[1].officialReportHint,undefined);
  assert.equal(output.state,'PASS');
});

function r82UtilitiesFixture() {
  return '<html><h1>Utilities Market Report 2026</h1>' +
    '<h2>Utilities Market Overview</h2><p>Utilities market size has reached to $7022.7 billion in 2025. ' +
    'Expected to grow to $9392.75 billion in 2030 at a compound annual growth rate (CAGR) of 6.1%.</p>' +
    '<h2>What Is Covered Under Utilities Market?</h2><p>electricity and water.</p>' +
    '<h2>What Is The Utilities Market Size and Share 2026?</h2>' +
    '<p>It will grow from $7022.7 billion in 2025 to $7411.11 billion in 2026 ' +
    'at a compound annual growth rate (CAGR) of 5.5%.</p>' +
    '<h2>What Is The Utilities Market Growth Forecast?</h2>' +
    '<p>It will grow to $9392.75 billion in 2030 at a compound annual ' +
    'growth rate (CAGR) of 6.1%.</p>' +
    '<h2>Utilities Market Report Forecast Analysis</h2><p>Market Size Value In 2026 $7411.11 billion ' +
    'Revenue Forecast In 2035 $9392.75 billion Growth Rate CAGR of 5.5% from 2026 to 2035</p></html>';
}

test('R82: live overview, forecast, historic sizes and table prove mislabelled metadata without editing R29', () => {
  const html = r82UtilitiesFixture();
  const original = auditForecastSource(html,{resolveHistoricTableMislabel:true});
  assert.equal(original.source_audit,'INCOMPLETE');
  assert.equal(original.source_conflict_reason,'INCONSISTENT_REPORT_PERIOD_OR_UNITS');
  const proven = proveR82ForecastMetadataPeriodMislabel(html);
  assert.equal(proven?.source_audit,'RESOLVED_FORECAST_METADATA_YEAR_AND_HISTORIC_RATE_MISLABEL');
  assert.equal(proven?.forecast_base_year,2026);
  assert.equal(proven?.forecast_end_year,2030);
  assert.equal(proven?.forecast_metadata_end_year,2035);
  assert.equal(proven?.forecast_narrative_pct,6.1);
  assert.equal(proven?.historic_narrative_pct,5.5);
  for (const tampered of [
    html.replace('Expected to grow to $9392.75 billion','Expected to grow to $8392.75 billion'),
    html.replace('in 2030 at a compound annual growth rate (CAGR) of 6.1%.','in 2031 at a compound annual growth rate (CAGR) of 6.1%.'),
    html.replace('Revenue Forecast In 2035 $9392.75 billion','Revenue Forecast In 2035 $8392.75 billion'),
    html.replace('in 2026 at a compound annual growth rate (CAGR) of 5.5%.','in 2026 at a compound annual growth rate (CAGR) of 8.5%.')
  ]) assert.equal(proveR82ForecastMetadataPeriodMislabel(tampered),null);
});

test('R82: TBRC direct hint calls only the official report and local Ollama after source audit', async () => {
  const hint='https://www.thebusinessresearchcompany.com/report/utilities-global-market-report';
  const requested=[];
  const fetchFn=async (url,options={})=>{
    requested.push(url);
    if (url === hint) return new Response(r82UtilitiesFixture());
    if (url === 'http://127.0.0.1:11434/api/generate') {
      return new Response(JSON.stringify({response:'{"growth_pct":6.1,"metric":"FORECAST_CAGR"}'}));
    }
    throw new Error('UNEXPECTED_NETWORK_CALL');
  };
  const raw=await measureKeyword('utilities', {
    fetchFn, searchMode:'publisher-site', structuredOutput:true,
    auditForecast:true, rateOnlyFromSource:true, strictMarketScope:true,
    resolveHistoricTableMislabel:true, resolveForecastMetadataYearMislabel:true,
    officialReportHint:hint, allowedKeywords:['utilities']
  });
  assert.equal(raw.state,'PASS',raw.failure);
  assert.equal(raw.growth_pct,6.1);
  assert.equal(raw.search_requests,0);
  assert.equal(raw.report_requests,1);
  assert.equal(raw.ollama_generations,1);
  assert.deepEqual(requested,[hint,'http://127.0.0.1:11434/api/generate']);
  const combined=await runForecastPipeline([{id:'utilities',keyword:'utilities'}], [
    adapter('TBRC',raw), adapter('SkyQuest',valid('SkyQuest',4.4)),
    adapter('Precedence',valid('Precedence',3.91))]);
  assert.equal(combined.results[0].source_count,3);
  assert.equal(combined.results[0].mean_pct,4.803333);
  assert.ok(combined.results[0].warnings.some(w=>w.startsWith('R82_PUBLISHER_METADATA')));
});
