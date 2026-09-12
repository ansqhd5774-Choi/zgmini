import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchApiShadowSeries} from '../lib/market-data/fred-api-shadow.mjs';
import {normalizeShadowSeries} from '../lib/market-data/fred-bls-shadow.mjs';

const fetchedAt = '2026-09-12T00:00:00.000Z';
const fixture = () => Array.from({length: 18}, (_, i) => ({
  date: new Date(Date.UTC(2025, 2 + i, 1)).toISOString().slice(0, 10), value: String(100 + i),
}));
const run = (rows, metric = 'cpi') => fetchApiShadowSeries(metric, 'fixture-only-key', {
  now: () => Date.parse(fetchedAt),
  fetchImpl: async () => Response.json({observations: rows}),
});
const july = () => fixture().map(p => p.date === '2026-08-01' ? {...p, value: '.'} : p);

test('CPI trailing missing: latest valid July defines all four exact calendar keys, not server September', async () => {
  const r = await run(july().reverse());
  assert.equal(r.status, 'SUCCESS');
  assert.equal(r.observedAt, '2026-07-01');
  assert.equal(r.previousObservedAt, '2026-06-01');
  assert.equal(r.yearAgoObservedAt, '2025-07-01');
  assert.equal(r.previousYearAgoObservedAt, '2025-06-01');
  assert.equal(r.fetchedAt, fetchedAt);
  assert.equal(r.currentValue, (116 / 104 - 1) * 100);
  assert.equal(r.previousValue, (115 / 103 - 1) * 100);
  assert.equal(r.providerUpdatedDataIsCurrent, 'unknown');
});
for (const date of ['2025-03-01', '2026-01-01']) test(`CPI unrelated missing ${date} does not alter results`, async () => {
  const expected = await run(july());
  const actual = await run(july().map(p => p.date === date ? {...p, value: '.'} : p));
  assert.deepEqual(actual, expected);
});
test('CPI only four required observations suffice; no contiguous-history or array-index assumption', async () => {
  const r = await run(july().filter(p => ['2026-07-01', '2026-06-01', '2025-07-01', '2025-06-01'].includes(p.date)));
  assert.equal(r.status, 'SUCCESS');
  assert.equal(r.currentValue, (116 / 104 - 1) * 100);
  assert.equal(r.previousValue, (115 / 103 - 1) * 100);
});
test('CPI no valid current fails rather than fabricating an observation', async () => {
  assert.equal((await run(july().map(p => ({...p, value: '.'})))).status, 'MISSING_OBSERVATION');
  assert.equal((await run([])).status, 'MISSING_OBSERVATION');
});
for (const [date, status] of [['2026-06-01', 'MISSING_OBSERVATION'], ['2025-07-01', 'INSUFFICIENT_HISTORY'], ['2025-06-01', 'INSUFFICIENT_HISTORY']]) {
  for (const mode of ['dot', 'absent']) test(`CPI required ${date} ${mode} fails with ${status}`, async () => {
    const rows = mode === 'dot' ? july().map(p => p.date === date ? {...p, value: '.'} : p) : july().filter(p => p.date !== date);
    const r = await run(rows);
    assert.equal(r.status, status); assert.equal(r.currentValue, undefined);
  });
}
test('CPI known complete fixture retains exact existing normalization', async () => {
  const r = await run(fixture());
  const old = normalizeShadowSeries('cpi', fixture(), {fetchedAt});
  for (const [key, value] of Object.entries(old)) assert.deepEqual(r[key], value, key);
});
test('CPI numeric zero is not missing; zero denominator keeps existing error', async () => {
  const r = await run(july().map(p => p.date === '2026-07-01' ? {...p, value: '0'} : p));
  assert.equal(r.status, 'SUCCESS'); assert.equal(r.rawCurrent, 0); assert.equal(r.currentValue, -100);
  assert.equal((await run(july().map(p => p.date === '2025-07-01' ? {...p, value: '0'} : p))).status, 'ZERO_YOY_DENOMINATOR');
});
for (const value of ['', ' ', 'nonnumeric', 'NaN', 'Infinity']) test(`CPI invalid ${JSON.stringify(value)} still rejected, even outside required keys`, async () => {
  assert.equal((await run(july().map(p => p.date === '2025-03-01' ? {...p, value} : p))).status, 'INVALID_NUMERIC');
});
for (const metric of ['ppi', 'unemployment', 'payroll']) test(`${metric} shared-helper opt-in cannot change existing result or gap policy`, async () => {
  const rows = fixture();
  assert.deepEqual(normalizeShadowSeries(metric, rows, {fetchedAt, cpiRequiredWindow: true}), normalizeShadowSeries(metric, rows, {fetchedAt}));
  assert.equal((await run(july(), metric)).status, 'MISSING_OBSERVATION');
  const gap = rows.filter(p => p.date !== '2026-01-01');
  assert.equal((await run(gap, metric)).status, 'MONTH_GAP');
  assert.throws(() => normalizeShadowSeries(metric, gap, {fetchedAt, cpiRequiredWindow: true}), /MONTH_GAP/);
});
test('graph CPI default retains its existing continuity policy', () => {
  assert.throws(() => normalizeShadowSeries('cpi', fixture().filter(p => p.date !== '2026-01-01'), {fetchedAt}), /MONTH_GAP/);
});
