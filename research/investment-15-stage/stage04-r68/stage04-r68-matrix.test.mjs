import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildR68Comparison } from './stage04-r68-matrix.mjs';

const path = process.env.R63_MATRIX_PATH;

test('R63 21-topic research means remain intact and no investment score is inferred', { skip: !path }, () => {
  const result = buildR68Comparison(readFileSync(path, 'utf8'));
  assert.equal(result.counts.forecast_topics, 21);
  assert.equal(result.counts.forecast_mean_ready, 21);
  assert.equal(result.counts.valid_publisher_values, 58);
  assert.equal(result.counts.calculated_attractiveness_scores, 0);
  assert.equal(result.topics.filter(row => row.approved_stage03_theme).length, 9);
  assert.equal(result.topics.find(row => row.topic_id === 17).forecast.mean_cagr_pct, 43.35);
  assert.equal(result.topics.find(row => row.topic_id === 17).forecast.publisher_count, 2);
  assert.equal(result.topics.find(row => row.topic_id === 21).approved_stage03_theme, false);
  assert(result.topics.every(row => row.investment_attractiveness_m === null));
  assert(result.topics.every(row => row.forecast_minus_sentiment_gap === null));
});

test('nine-versus-ten theme universe changes percentile even when CAGR itself does not', { skip: !path }, () => {
  const result = buildR68Comparison(readFileSync(path, 'utf8'));
  const dataCenter = result.percentile_universe_sensitivity_not_a_score.find(row => row.topic_id === 20);
  assert.equal(dataCenter.unchanged_mean_cagr_pct, 10.59);
  assert.equal(dataCenter.nine_approved_theme_percentile, 27.78);
  assert.equal(dataCenter.ten_research_theme_percentile, 35);
  assert.equal(dataCenter.percentile_change_only_from_peer_universe, 7.22);
});

test('even an observed F=0 is shown as independent axis, not a subtraction or buy signal', { skip: !path }, () => {
  const result = buildR68Comparison(readFileSync(path, 'utf8'), { records: [{
    topic_id: 12,
    score: 0,
    observed_at: '2026-10-26',
    source: 'MOCK_ONLY',
    status: 'PROVISIONAL',
  }], fStatus: 'MOCK_ONLY' });
  const robot = result.topics.find(row => row.topic_id === 12);
  assert.equal(robot.sentiment_f.score, 0);
  assert.equal(robot.sentiment_f.observation_date, '2026-10-26');
  assert.equal(robot.comparison_status, 'TWO_AXES_DISPLAY_ONLY');
  assert.equal(robot.forecast_minus_sentiment_gap, null);
  assert.equal(robot.investment_attractiveness_m, null);
  assert.equal(result.counts.paired_f_observations, 1);
  assert.equal(result.topics.find(row => row.topic_id === 1).sentiment_f, null);
});

test('new theme/sector F mapping, invalid observations and duplicates cannot produce false metrics', { skip: !path }, () => {
  const markdown = readFileSync(path, 'utf8');
  const record = { topic_id: 12, score: 24, observed_at: '2026-10-26', source: 'TEST', status: 'CONFIRMED' };
  assert.throws(() => buildR68Comparison(markdown, { records: [record, record] }), /duplicate/);
  assert.throws(() => buildR68Comparison(markdown, { records: [{ ...record, topic_id: 21 }] }), /Unexpected/);
  assert.throws(() => buildR68Comparison(markdown, { records: [{ ...record, score: 101 }] }), /Invalid F/);
  assert.throws(() => buildR68Comparison(markdown, { records: [{ ...record, observed_at: null }] }), /provenance/);
});
