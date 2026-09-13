import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {BLS_SERIES, parseBls} from '../lib/market-data/providers.mjs';
import {fetchApiShadowSeries, getApiRawHistory} from '../lib/market-data/fred-api-shadow.mjs';
import {integrateProviderResults, collectProviderCandidates, FALLBACK_PRODUCTION_ENABLED} from '../lib/market-data/fallback-integration.mjs';
import {consumerCompatibilityAdapter as adapt, consumerInputMap} from '../lib/market-data/consumer-compatibility.mjs';
import {payrollChanges} from '../lib/market-data/semantics.mjs';

const fetchedAt = '2026-09-12T00:00:00.000Z', now = () => Date.parse(fetchedAt);
const ids = {...BLS_SERIES, payroll: BLS_SERIES.payrolls};
const rows = metric => Array.from({length: 18}, (_, i) => ({
  date: new Date(Date.UTC(2025, 2 + i, 1)).toISOString().slice(0, 10),
  value: metric === 'unemployment' ? (i >= 16 ? 4.1 : 4.2)
    : metric === 'payroll' ? (i === 17 ? 159075 : i === 16 ? 158913 : 158877 + i) : 100 + i,
}));
const payload = () => ({status: 'REQUEST_SUCCEEDED', Results: {series: ['cpi', 'ppi', 'unemployment', 'payroll'].map(metric => ({
  seriesID: ids[metric], data: rows(metric).map(p => ({year: p.date.slice(0, 4), period: 'M' + p.date.slice(5, 7), value: String(p.value)})).reverse(),
}))}});
const batch = () => ({...parseBls(payload()), durationMs: 1, requestCount: 1, registered: false});
const secondary = (metric, points = rows(metric)) => fetchApiShadowSeries(metric, 'fixture-key', {
  now, fetchImpl: async () => Response.json({observations: points.map(p => ({...p, value: String(p.value)}))}),
});
const route = fs.readFileSync(new URL('../app/api/market-data/route.ts', import.meta.url), 'utf8');
class FixedDate extends Date {constructor(...args) {super(...(args.length ? args : [fetchedAt]));}}
function consumer(b) {
  return new Function('env', 'fetchBls', 'fetchFred', 'payrollChanges', 'Date', ts.transpile(
    route.replace(/^import .*;\r?\n/gm, '').replace('export async function GET', 'async function GET'),
    {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None}) + ';return {GET,makeYoyIndicator,makeDirectIndicator};')(
    {}, async () => b, async () => ({data: rows('cpi'), status: 'SUCCESS', durationMs: 1}), payrollChanges, FixedDate);
}
const funcs = consumer();
function output(metric, raw) {
  return metric === 'cpi' || metric === 'ppi' ? funcs.makeYoyIndicator(raw, {})
    : funcs.makeDirectIndicator(metric === 'payroll' ? payrollChanges(raw) : raw, {suffix: ''});
}
async function selected(metric, points) {
  const b = batch(); b.statuses[ids[metric]] = 'TIMEOUT'; b.data.delete(ids[metric]);
  const s = await secondary(metric, points);
  const integration = integrateProviderResults({batch: b, fetchedAt, secondaryResults: {[metric]: s}});
  assert.equal(integration.metrics[metric].candidate.decision, 'USE_SECONDARY');
  return {metricId: metric, candidate: integration.metrics[metric].candidate, batch: b, secondaryResult: s, integration};
}

for (const metric of ['cpi', 'ppi', 'unemployment', 'payroll']) test(metric + ': BLS/FRED raw parity through existing consumer', async () => {
  const b = batch(), integration = integrateProviderResults({batch: b, fetchedAt});
  const primary = adapt({metricId: metric, candidate: integration.metrics[metric].candidate, batch: b});
  const fixture = await selected(metric);
  const raw = adapt(fixture);
  assert.deepEqual(raw, primary);
  assert.deepEqual(raw, rows(metric));
  assert.deepEqual(output(metric, raw), output(metric, primary));
  assert.equal(output(metric, raw).currentDate, '2026-08-01');
  assert.equal(output(metric, raw).previousDate, '2026-07-01');
  for (const point of raw) assert.deepEqual(Object.keys(point), ['date', 'value']);
  // Poison only derived/provenance fields: raw input and formula result stay equal.
  fixture.candidate.selected.currentValue = -999999;
  fixture.candidate.selected.previousValue = -999999;
  fixture.secondaryResult.currentValue = -999999;
  fixture.secondaryResult.derivedValue = -999999;
  assert.deepEqual(adapt(fixture), raw);
  if (metric === 'cpi' || metric === 'ppi') {
    assert.equal(output(metric, raw).currentValue, (117 / 105 - 1) * 100);
    assert.equal(output(metric, raw).previousValue, (116 / 104 - 1) * 100);
  } else assert.equal(output(metric, raw).currentValue, metric === 'payroll' ? 162 : 4.1);
});

test('OFF: original Map identity and complete public JSON byte equality, even supplied FRED', async () => {
  const b = batch(), integration = integrateProviderResults({batch: b, fetchedAt});
  const data = consumerInputMap({integration, secondaryResults: {get cpi() {throw Error('must not read');}}});
  assert.equal(data, b.data);
  const original = await (await consumer(b).GET()).text();
  const adapted = await (await consumer({...b, data}).GET()).text();
  assert.equal(adapted, original);
  assert.deepEqual(Object.keys(JSON.parse(adapted)), ['status', 'updatedAt', 'indicators', 'summary', 'sources', 'warnings']);
  assert.equal(FALLBACK_PRODUCTION_ENABLED, false);
});

test('OFF does not apply eligible secondary; ON fixture produces public-compatible indicator', async () => {
  const f = await selected('unemployment');
  assert.equal(consumerInputMap({integration: f.integration}), f.batch.data);
  assert.equal(f.batch.data.has(ids.unemployment), false);
  const data = consumerInputMap({integration: f.integration, secondaryResults: {unemployment: f.secondaryResult}, simulateSelection: true});
  const json = await (await consumer({...f.batch, data}).GET()).json();
  assert.equal(json.indicators.unemployment.currentValue, 4.1);
  assert.equal(json.status, 'live');
  assert.equal(json.summary.length, 5);
  assert.deepEqual(Object.keys(json), ['status', 'updatedAt', 'indicators', 'summary', 'sources', 'warnings']);
  assert.equal(f.batch.data.has(ids.unemployment), false);
});

for (const change of [0, -20]) test('payroll preserves change ' + change, async () => {
  const p = rows('payroll'); p.at(-1).value = p.at(-2).value + change;
  const raw = adapt(await selected('payroll', p));
  assert.equal(output('payroll', raw).currentValue, change);
  assert.equal(output('payroll', raw).previousValue, p.at(-2).value - p.at(-3).value);
});
test('zero raw UNRATE stays valid', async () => {
  const p = rows('unemployment'); p.at(-1).value = 0;
  assert.equal(output('unemployment', adapt(await selected('unemployment', p))).currentValue, 0);
});
test('serialized/derived/recent preview cannot stand in for raw history', async () => {
  const f = await selected('cpi');
  assert.equal(getApiRawHistory(JSON.parse(JSON.stringify(f.secondaryResult))), undefined);
  assert.throws(() => adapt({...f, secondaryResult: {...f.secondaryResult}}), /RAW_HISTORY_UNAVAILABLE/);
  assert.ok(!JSON.stringify(f.secondaryResult).includes('rawHistory'));
  const raw = getApiRawHistory(f.secondaryResult); raw[0].value = -999;
  assert.notEqual(getApiRawHistory(f.secondaryResult)[0].value, -999);
});
for (const metric of ['cpi', 'ppi', 'unemployment', 'payroll']) test(metric + ' missing required raw month fails closed', () => {
  const b = batch(), integration = integrateProviderResults({batch: b, fetchedAt});
  const candidate = integration.metrics[metric].candidate;
  const required = metric === 'cpi' || metric === 'ppi' ? '2025-07-01' : metric === 'payroll' ? '2026-06-01' : '2026-07-01';
  b.data.set(ids[metric], b.data.get(ids[metric]).filter(p => p.date !== required));
  assert.throws(() => adapt({metricId: metric, candidate, batch: b}), /MISSING_OBSERVATION/);
});
for (const value of [NaN, Infinity, null, '4.1']) test('invalid numeric ' + value + ' rejected', () => {
  const b = batch(), integration = integrateProviderResults({batch: b, fetchedAt});
  b.data.get(ids.unemployment).at(-1).value = value;
  assert.throws(() => adapt({metricId: 'unemployment', candidate: integration.metrics.unemployment.candidate, batch: b}), /INVALID_NUMERIC/);
});
test('cross-series raw result is rejected', async () => {
  const f = await selected('cpi');
  assert.throws(() => adapt({...f, secondaryResult: awaitNever}), /RAW_IDENTITY_MISMATCH/);
});
const awaitNever = {metricId: 'ppi'};
test('duplicate conflict rejected; same-value duplicate deduped', () => {
  const b = batch(), integration = integrateProviderResults({batch: b, fetchedAt});
  const args = {metricId: 'unemployment', candidate: integration.metrics.unemployment.candidate, batch: b};
  b.data.get(ids.unemployment).push({...b.data.get(ids.unemployment).at(-1)});
  assert.equal(adapt(args).length, 18);
  b.data.get(ids.unemployment).at(-1).value = 999;
  assert.throws(() => adapt(args), /DUPLICATE_CONFLICT/);
});
test('real collector mock handoff retains full validated raw history with OFF batch unchanged', async () => {
  const result = await collectProviderCandidates({now, blsKey: 'fixture-key', fredKey: 'fixture-key', inspectSecondary: true,
    fetchImpl: async url => String(url).includes('api.bls.gov')
      ? Response.json({status: 'REQUEST_SUCCEEDED', Results: {series: []}})
      : Response.json({observations: rows('cpi').map(p => ({...p, value: String(p.value)}))}),
  });
  assert.deepEqual(result.requestCounts, {bls: 1, fred: 4});
  assert.equal(result.consumerCandidates.size, 4);
  for (const rows of result.consumerCandidates.values()) assert.equal(rows.length, 18);
  assert.equal(result.appliedBlsResult.data.size, 0);
});
