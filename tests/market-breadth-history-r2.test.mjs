import test from 'node:test';
import assert from 'node:assert/strict';
import {US_BREADTH_DAILY_KEY_PREFIX, US_BREADTH_SOURCE} from '../lib/market-breadth/us-public-r1.mjs';
import {selectVerifiedUsBreadthHistory, usBreadthHistoryWindow} from '../lib/market-breadth/history-public-r2.mjs';

const window = usBreadthHistoryWindow('2026-10-30');
const stored = (date, counts = {rising: 226, unchanged: 0, falling: 277}, overrides = {}) => ({
  snapshot_key: `${US_BREADTH_DAILY_KEY_PREFIX}${date}`,
  stored_at: Date.parse('2026-10-31T03:00:00Z'),
  body: JSON.stringify({
    version: 1, market: 'usa', universe: 'SP500', source: US_BREADTH_SOURCE,
    methodologyVersion: 'ISSUE_DIRECTION_COUNTS_R1', status: 'READY', observationDate: date,
    expectedCount: 503, eligibleCount: 503, coverage: 1, counts,
    calculatedAt: '2026-10-31T01:00:00Z', ...overrides,
  }),
});

test('1Y range is fixed to the latest completed session', () => {
  assert.deepEqual(window, {from: '2025-10-30', to: '2026-10-30'});
  assert.throws(() => usBreadthHistoryWindow('2026-02-30'), /INVALID_COMPLETED_SESSION/);
});

test('only verified daily keys within 1Y are exposed in chronological order', () => {
  const records = selectVerifiedUsBreadthHistory([
    stored('2026-10-30'),
    stored('2025-10-29'), // outside requested range
    stored('2026-10-28', {rising: 230, unchanged: 1, falling: 272}),
    stored('2026-10-28'), // duplicate daily key
    stored('2026-10-29', {rising: 503, unchanged: 0, falling: 0}, {status: 'PARTIAL'}),
    stored('2026-10-27', undefined, {observationDate: '2026-10-26'}),
    {...stored('2026-10-26'), stored_at: 0},
    {...stored('2026-10-25'), body: '{broken'},
    {...stored('2026-10-24'), stored_at: Date.now() + 3600_000},
  ], window);
  assert.deepEqual(records.map(record => record.observationDate), ['2026-10-28', '2026-10-30']);
  assert.deepEqual(records[0].counts, {rising: 230, unchanged: 1, falling: 272});
  assert.equal(records[1].eligibleCount, 503);
  assert.equal('calculatedAt' in records[1], false);
});

test('missing history stays empty; raw constituent data is never returned', () => {
  assert.deepEqual(selectVerifiedUsBreadthHistory([], window), []);
  const [record] = selectVerifiedUsBreadthHistory([stored('2026-10-30')], window);
  assert.deepEqual(Object.keys(record).sort(), ['counts', 'eligibleCount', 'observationDate']);
});
