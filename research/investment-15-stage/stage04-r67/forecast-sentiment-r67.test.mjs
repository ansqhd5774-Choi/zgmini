import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeR63ResearchSnapshot, applyPeerPercentiles, addReadOnlySentiment, parseR63Matrix } from './forecast-sentiment-r67.mjs';

const input = process.env.R63_MATRIX_PATH;

test('R63 snapshot: all 21 topics pass the two-publisher criterion', { skip: !input }, () => {
  const result = analyzeR63ResearchSnapshot(readFileSync(input, 'utf8'));
  assert.deepEqual(result.counts, {
    topics: 21, average_ready: 21, valid_observations: 58,
    two_publishers: 5, three_publishers: 16, sentiment_comparisons: 0,
  });
  const byId = new Map(result.topics.map(row => [row.topic_id, row]));
  assert.equal(byId.get(1).average_cagr_pct, 8.95);
  assert.equal(byId.get(8).average_cagr_pct, 6.97);
  assert.equal(byId.get(12).average_cagr_pct, 17.4667);
  assert.equal(byId.get(17).average_cagr_pct, 43.35);
  assert.equal(byId.get(21).average_cagr_pct, 8.7233);
  assert.equal(byId.get(6).caveats.includes('SOURCE_METADATA_CONFLICT_RETAINED'), true);
  assert.equal(byId.get(17).observations[2].cagr_pct, null);
  assert.equal(byId.get(1).observations[0].official_url.startsWith('https://'), true);
  assert.equal(result.result_status.includes('NOT_CURRENT_VERIFIED'), true);
});

const smallMatrix = `| 번호 | 섹터/테마 | TBRC | SkyQuest | Precedence |
|---:|---|---|---|---|
| 1 | A | 3% (2026-2030; VALID) | 5% (2026-2033; VALID) | 미확정 (MISSING) |
| 2 | B | 4% (2026-2030; VALID) | 4% (2026-2033; VALID) | 4% (2026-2035; VALID) |
| 12 | C | 10% (2026-2030; VALID) | 20% (2026-2033; VALID) | 미확정 (MISSING) |
| 13 | D | 미확정 (MISSING) | 미확정 (MISSING) | 99% (2026-2035; VALID) |`;

test('two independent publisher values are enough; third missing is not zero', () => {
  const topics = applyPeerPercentiles(parseR63Matrix(smallMatrix));
  assert.equal(topics[0].average_cagr_pct, 4);
  assert.equal(topics[0].observation_count, 2);
  assert.equal(topics[0].forecast_status, 'MEAN_CALCULABLE');
  assert.equal(topics[3].forecast_status, 'INSUFFICIENT_PUBLISHERS');
  assert.equal(topics[3].average_cagr_pct, null);
  assert.equal(topics[0].growth_peer_percentile, 50);
  assert.equal(topics[1].growth_peer_percentile, 50);
});

test('no sentiment never becomes zero; hypothetical 0 is valid if sourced', () => {
  const topics = applyPeerPercentiles(parseR63Matrix(smallMatrix));
  const withoutSentiment = addReadOnlySentiment(topics);
  assert.equal(withoutSentiment[0].sentiment_score, null);
  assert.equal(withoutSentiment[0].growth_sentiment_gap, null);
  const withSentiment = addReadOnlySentiment(topics, { records: [
    { topic_id: 1, score: 0, observed_at: '2026-10-27T00:00:00Z', status: 'PROVISIONAL', source: 'TEST_ONLY' },
  ] });
  assert.equal(withSentiment[0].sentiment_score, 0);
  assert.equal(withSentiment[0].growth_sentiment_gap, 50);
  assert.equal(withSentiment[1].growth_sentiment_gap, null);
  assert.equal(withSentiment[0].comparison_status, 'RESEARCH_SIMULATION_ONLY');
});

test('publisher validation and sentiment provenance reject invalid inputs', () => {
  assert.throws(() => parseR63Matrix(smallMatrix.replace('3% (2026-2030; VALID)', 'bogus')), /Unrecognized/);
  assert.throws(() => parseR63Matrix(`${smallMatrix}\n${smallMatrix.split('\n')[2]}`), /Duplicate topic/);
  const topics = applyPeerPercentiles(parseR63Matrix(smallMatrix));
  assert.throws(() => addReadOnlySentiment(topics, { records: [
    { topic_id: 1, score: 101, observed_at: 'now', source: 'TEST_ONLY', status: 'CONFIRMED' },
  ] }), /Invalid sentiment score/);
  assert.throws(() => addReadOnlySentiment(topics, { records: [
    { topic_id: 99, score: 20, observed_at: 'now', source: 'TEST_ONLY', status: 'CONFIRMED' },
  ] }), /Unmapped/);
});
