import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchApiShadowSeries} from '../lib/market-data/fred-api-shadow.mjs';
const rows = () => Array.from({length: 18}, (_, i) => ({date: new Date(Date.UTC(2025, 2 + i, 1)).toISOString().slice(0, 10), value: String(4 + i / 100)}));
const run = (observations, metric = 'unemployment', date = '2026-09-12') => fetchApiShadowSeries(metric, 'fixture-only', {
  now: () => Date.parse(date), fetchImpl: async () => Response.json({observations}),
});
test('UNRATE trailing dot uses latest valid and exact previous month, not server month', async () => {
  const r = await run([...rows(), {date: '2026-09-01', value: '.'}].reverse());
  assert.equal(r.status, 'SUCCESS'); assert.equal(r.observedAt, '2026-08-01');
  assert.equal(r.previousObservedAt, '2026-07-01');
  assert.equal(r.currentValue, 4.17); assert.equal(r.previousValue, 4.16);
});
for (const month of ['2025-03-01', '2026-01-01', '2026-06-01']) test(`UNRATE unrelated dot ${month} allowed`, async () => {
  const r = await run(rows().map(p => p.date === month ? {...p, value: '.'} : p));
  assert.equal(r.status, 'SUCCESS'); assert.equal(r.currentValue, 4.17); assert.equal(r.previousValue, 4.16);
  assert.equal(r.csvComparison.apiRecentMonthsContinuous, month !== '2026-06-01');
  if (month === '2026-06-01') assert.equal(r.csvComparison.classification, 'UNVERIFIED');
});
for (const mode of ['dot', 'absent']) test(`UNRATE previous ${mode} fails; June cannot replace July`, async () => {
  const data = mode === 'dot' ? rows().map(p => p.date === '2026-07-01' ? {...p, value: '.'} : p) : rows().filter(p => p.date !== '2026-07-01');
  const r = await run(data); assert.equal(r.status, 'MISSING_OBSERVATION'); assert.equal(r.currentValue, undefined);
});
test('UNRATE zero remains a valid raw rate', async () => {
  const r = await run(rows().map(p => p.date === '2026-08-01' ? {...p, value: '0'} : p));
  assert.equal(r.status, 'SUCCESS'); assert.equal(r.currentValue, 0); assert.equal(r.observedAt, '2026-08-01');
});
for (const value of ['NaN', 'not-a-number', '', 'Infinity']) test(`UNRATE ${value} remains invalid even at unrelated month`, async () => {
  assert.equal((await run(rows().map((p, i) => i === 0 ? {...p, value} : p))).status, 'INVALID_NUMERIC');
});
test('UNRATE existing four-valid-observation guard retained', async () => {
  for (const count of [0, 1, 2, 3]) assert.equal((await run(rows().slice(0, count))).status, 'INSUFFICIENT_HISTORY');
  assert.equal((await run(rows().slice(-4))).status, 'SUCCESS');
});
test('UNRATE previous calendar month crosses year boundary', async () => {
  const data = ['2025-10-01','2025-11-01','2025-12-01','2026-01-01'].map(date => ({date, value:'4.1'}));
  const r = await run(data, 'unemployment', '2026-02-12');
  assert.equal(r.status, 'SUCCESS'); assert.equal(r.previousObservedAt, '2025-12-01');
});
for (const metric of ['ppi', 'payroll']) test(`${metric} full-range missing and gap policy retained`, async () => {
  assert.equal((await run([...rows(),{date:'2026-09-01',value:'.'}],metric)).status,'MISSING_OBSERVATION');
  assert.equal((await run(rows().filter(p=>p.date!=='2026-01-01'),metric)).status,'MONTH_GAP');
});
