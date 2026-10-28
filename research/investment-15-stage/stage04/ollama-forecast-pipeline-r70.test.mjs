import test from 'node:test';
import assert from 'node:assert/strict';
import { runForecastPipeline, tbrcR30Adapter } from './ollama-forecast-pipeline-r70.mjs';

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
  assert.equal(called.options.resolveHistoricTableMislabel, false);
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
