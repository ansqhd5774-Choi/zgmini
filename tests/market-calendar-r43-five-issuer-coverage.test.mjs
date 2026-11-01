import test from 'node:test';
import assert from 'node:assert/strict';
import {rankR43Issuers, r43IssuerKey, R43_WEIGHTS} from '../lib/market-calendar-r43-issuer-rank.mjs';

const day = '2026-10-30';
const stock = (ticker, i) => ({
  ticker, eligible: true, tradeDate: day,
  price: 100 + i, volume: 1_000 + 10 * i, relativeVolume: 1 + i / 100,
  dividendYield: i / 100, eps: 1 + i / 20,
  epsGrowthPct: i / 5, dailyChangePct: i / 10,
});

test('first-phase R43 retains the 77.3%-reference ensemble coefficients', () => {
  assert.deepEqual(R43_WEIGHTS.best132, [.514, .113, .109, .132, .003, .113, -.038, .016]);
  assert.deepEqual(R43_WEIGHTS.bestJoint, [.565, .160, .057, .152, .023, .009, -.117, .034]);
  assert.equal(Object.isFrozen(R43_WEIGHTS.best132), true);
  assert.equal(Object.isFrozen(R43_WEIGHTS.bestJoint), true);
});

test('BRK share classes count as one issuer; ARM ANET SHOP DE all enter scoring without automatic ★★★', () => {
  const exceptions = ['BRK.A', 'BRK-B', 'ARM', 'ANET', 'SHOP', 'DE'];
  const rows = Array.from({length: 40}, (_, i) => stock(`T${i}`, i + 1));
  rows.splice(0, 5,
    stock('BRK.A', 0), stock('ARM', 0), stock('ANET', 0), stock('SHOP', 0), stock('DE', 0));
  rows.push(stock('BRK-B', 0));
  rows.push({...stock('BABA', 99), eligible: false});

  const result = rankR43Issuers(rows, {asOf:day, expectedEligibleIssuers: 40});
  assert.equal(result.status, 'READY_SHADOW');
  assert.equal(result.coverage.eligibleIssuers, 40);
  assert.equal(result.topCount, 2);
  assert.equal(result.rankings.filter(row => row.importance === 3).length, 2);
  const tickers = new Set(result.rankings.flatMap(row => row.tickers));
  for (const ticker of exceptions) assert.ok(tickers.has(ticker), ticker);
  assert.ok(!tickers.has('BABA'));
  assert.equal(r43IssuerKey('BRK.A'), r43IssuerKey('BRK-B'));
  assert.equal(r43IssuerKey('BRK.A', 'SOURCE_A_CLASS_A'), r43IssuerKey('BRK-B', 'SOURCE_B_CLASS_B'));
  assert.equal(r43IssuerKey('GOOG', 'SOURCE_A_CLASS_C'), r43IssuerKey('GOOGL', 'SOURCE_B_CLASS_A'));
  assert.equal(result.rankings.filter(row => row.issuerId === 'BERKSHIRE').length, 1);
  // The five manual-review cases are represented; they do not bypass the 5% quota.
  for (const ticker of exceptions) {
    const row = result.rankings.find(entry => entry.tickers.includes(ticker));
    assert.notEqual(row.importance, 3, `${ticker} must not receive an unconditional override`);
  }
});

test('source-specific issuer IDs cannot double-count Alphabet or Berkshire classes', () => {
  const rows = Array.from({length: 20}, (_, i) => stock(`Z${i}`, i + 1));
  rows[0] = {...stock('GOOG', 20), issuerId: 'CLASS_C_ISSUER'};
  rows[1] = {...stock('GOOGL', 21), issuerId: 'CLASS_A_ISSUER'};
  rows[2] = {...stock('BRK.A', 22), issuerId: 'CLASS_A_BERK'};
  rows[3] = {...stock('BRK-B', 23), issuerId: 'CLASS_B_BERK'};
  const result = rankR43Issuers(rows, {asOf:day, expectedEligibleIssuers:18});
  assert.equal(result.status, 'READY_SHADOW');
  assert.equal(result.coverage.eligibleIssuers, 18);
  assert.equal(result.rankings.find(row => row.issuerId === 'ALPHABET')?.tickers.length, 2);
  assert.equal(result.rankings.find(row => row.issuerId === 'BERKSHIRE')?.tickers.length, 2);
});
