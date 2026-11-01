import test from 'node:test';
import assert from 'node:assert/strict';
import {rankR43Issuers, r43ImportanceIndex, R43_ANNUAL_MANUAL_MAX_AGE_DAYS} from '../lib/market-calendar-r43-issuer-rank.mjs';

// Synthetic fixtures guard the scoring contract. They do NOT reproduce the
// user's 500-stock reference list or independently validate 77.3% / 81.1%.
const day = '2026-10-30';
const stock = (i, extra = {}) => ({
  ticker: `T${i}`, eligible: true, tradeDate: day,
  price: 100, volume: 1_000 + i * 200,
  relativeVolume: 1, dailyChangePct: 0,
  dividendYield: 0, eps: 0, epsGrowthPct: 0,
  ...extra,
});

test('the five R42 illustrative exceptions are not hardcoded R43 triple guarantees', () => {
  const rows = Array.from({length: 2634}, (_, i) => stock(i));
  for (const [i, ticker] of ['BRK.A', 'ARM', 'ANET', 'SHOP', 'DE'].entries()) {
    rows[i] = stock(i, {ticker});
  }
  const result = rankR43Issuers(rows, {asOf: day});
  assert.equal(result.status, 'READY_SHADOW');
  assert.equal(result.topCount, 132);
  assert.equal(result.rankings.filter(row => row.importance === 3).length, 132);
  for (const ticker of ['BRK.A', 'ARM', 'ANET', 'SHOP', 'DE']) {
    const row = result.rankings.find(item => item.tickers.includes(ticker));
    assert.ok(row, ticker);
    assert.equal(row.importance, null, `${ticker} must compete on score`);
  }
});

test('share classes count as one issuer without expanding the 5% quota', () => {
  const rows = Array.from({length: 2634}, (_, i) => stock(i));
  rows[0] = stock(0, {ticker: 'BRK.A'});
  rows[1] = stock(1, {ticker: 'GOOG'});
  rows.push(stock(2634, {ticker: 'BRK-B'}));
  rows.push(stock(2635, {ticker: 'GOOGL'}));
  const result = rankR43Issuers(rows, {asOf: day});
  assert.equal(result.status, 'READY_SHADOW');
  assert.equal(result.coverage.eligibleIssuers, 2634);
  assert.equal(result.topCount, 132);
  assert.deepEqual(result.rankings.find(row => row.issuerId === 'BERKSHIRE')?.tickers, ['BRK-B', 'BRK.A']);
  assert.deepEqual(result.rankings.find(row => row.issuerId === 'ALPHABET')?.tickers, ['GOOG', 'GOOGL']);
});

test('500-reference subset is valid for research comparison, not for an operational 132-grade file', () => {
  const rows = Array.from({length: 495}, (_, i) => stock(i));
  const result = rankR43Issuers(rows, {asOf: day});
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'R43_UNIVERSE_COVERAGE_NOT_VERIFIED');
  assert.equal(result.rankings.length, 0);
  assert.equal(result.topCount, 0);
});

test('R43 annual manual snapshot remains valid through 400 days and expires after', () => {
  const rows = Array.from({length: 2634}, (_, i) => stock(i));
  const result = rankR43Issuers(rows, {asOf: day});
  const at = Date.parse(day + 'T00:00:00Z');
  assert.equal(R43_ANNUAL_MANUAL_MAX_AGE_DAYS, 400);
  assert.ok(r43ImportanceIndex(result, {now: at + 400 * 86400000}));
  assert.equal(r43ImportanceIndex(result, {now: at + 401 * 86400000}), null);
});
