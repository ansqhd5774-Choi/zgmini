import test from 'node:test';
import assert from 'node:assert/strict';
import { topicsFromArgs, r71Adapters, runR71 } from './run-ollama-forecast-r71.mjs';

test('R71 has three real configured adapters and excludes BRI', () => {
  const adapters = r71Adapters();
  assert.deepEqual(adapters.map(x => x.id), ['TBRC', 'SkyQuest', 'Precedence']);
  assert.ok(adapters.every(x => typeof x.run === 'function'));
});

test('user topics are distinct, no cached CAGR supplied by command line', () => {
  assert.deepEqual(topicsFromArgs(['robotics', 'robotics', 'semiconductors']), [
    { id: 'topic-1', keyword: 'robotics' },
    { id: 'topic-2', keyword: 'semiconductors' }
  ]);
  assert.throws(() => topicsFromArgs(['   ']), /TOPIC_COUNT_OUT_OF_BOUNDS/);
});

test('a valid R71 execution wrapper keeps R70 independent publisher gate', async () => {
  const adapters = ['SkyQuest', 'Precedence'].map(id => ({
    id, officialHosts: [id === 'SkyQuest' ? 'www.skyquestt.com' : 'www.precedenceresearch.com'],
    run: async () => ({ state: 'PASS', source_audit: 'EXCERPT_PERIOD_VERIFIED',
      market_scope: 'DIRECT', metric: 'FORECAST_CAGR', growth_pct: id === 'SkyQuest' ? 6 : 10,
      period_start: 2026, period_end: 2031,
      forecast_base_year: 2026, forecast_end_year: 2031,
      forecast_narrative_pct: id === 'SkyQuest' ? 6 : 10,
      result_url: id === 'SkyQuest' ? 'https://www.skyquestt.com/report/robotics-market' :
        'https://www.precedenceresearch.com/robotics-market' })
  }));
  const report = await runR71([{ id: '1', keyword: 'robotics' }], adapters);
  assert.equal(report.results[0].mean_pct, 8);
  assert.equal(report.automatic_publish_or_score, false);
  assert.equal(report.report, 'STAGE04_OLLAMA_FORECAST_PIPELINE_R71');
});
