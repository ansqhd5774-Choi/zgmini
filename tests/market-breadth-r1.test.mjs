import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMarketBreadthCounts, MARKET_BREADTH_COUNTS_METHOD } from '../lib/market-breadth/compute.mjs';

const base = {
  market: 'usa', observationDate: '2026-10-30', expectedCount: 4,
  rows: [
    { securityId: 'A', change: 1.5 },
    { securityId: 'B', change: 0 },
    { securityId: 'C', change: -0.1 },
    { securityId: 'D', change: 10 },
  ],
};

test('counts positive, unchanged and negative issues without weighting', () => {
  const result = calculateMarketBreadthCounts(base);
  assert.equal(result.methodologyVersion, MARKET_BREADTH_COUNTS_METHOD);
  assert.equal(result.status, 'READY');
  assert.deepEqual(result.counts, { rising: 2, unchanged: 1, falling: 1 });
  assert.equal(result.coverage, 1);
});

test('zero change is a real unchanged issue, missing is not', () => {
  const data = {
    ...base,
    rows: base.rows.map(row => row.securityId === 'B' ? { ...row, change: null } : row),
  };
  const result = calculateMarketBreadthCounts(data);
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.invalidCount, 1);
  assert.equal(result.counts, null);
  assert.equal(result.eligibleCount, 3);
});

test('a separately approved 98% source gate can retain explicit coverage', () => {
  const rows = Array.from({ length: 98 }, (_, i) => ({ securityId: String(i), change: i % 2 ? 1 : -1 }));
  const result = calculateMarketBreadthCounts({ ...base, expectedCount: 100, minimumCoverage: .98, rows });
  assert.equal(result.status, 'READY');
  assert.equal(result.eligibleCount, 98);
  assert.equal(result.coverage, .98);
  assert.deepEqual(result.counts, { rising: 49, unchanged: 0, falling: 49 });
});

test('duplicates, nonfinite changes and malformed dates are not publishable', () => {
  assert.equal(calculateMarketBreadthCounts({ ...base, rows: [base.rows[0], base.rows[0]] }), null);
  assert.equal(calculateMarketBreadthCounts({ ...base, rows: [{ securityId: 'A', change: Infinity }] }).status, 'PARTIAL');
  assert.equal(calculateMarketBreadthCounts({ ...base, observationDate: '2026-02-30' }), null);
  assert.equal(calculateMarketBreadthCounts({ ...base, expectedCount: 3 }).status, 'PARTIAL');
});
