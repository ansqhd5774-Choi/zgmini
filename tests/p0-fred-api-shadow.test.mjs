import test from 'node:test';
import assert from 'node:assert/strict';
import {observationsUrl, parseObservations, fetchApiShadowSeries} from '../lib/market-data/fred-api-shadow.mjs';
import {createFredApiShadow} from '../worker/p0-fred-api-shadow.mjs';
const now = () => Date.parse('2026-09-13');
const context = {nodeEnv: 'production', importMetaProd: true, workerContext: {waitUntil() {}, passThroughOnException() {}}, workerUserAgent: 'Cloudflare-Workers'};
const req = () => new Request('https://zgmini.kr/api/internal/p0-fred-api-shadow-check');
const key = 'fixture-private-key';
function fixture() {return {units: 'lin', count: 18, offset: 0, realtime_start: '2026-09-13', realtime_end: '2026-09-13', observations: Array.from({length: 18}, (_, i) => ({date: new Date(Date.UTC(2025, 2 + i, 1)).toISOString().slice(0, 10), value: String(100 + i), realtime_start: '2026-09-01', realtime_end: '2026-09-13'}))};}
const fetchFixture = async () => Response.json(fixture());
const config = {fetchImpl: fetchFixture, now, cacheStore: () => undefined};
const run = async (h = createFredApiShadow(config), env = {FRED_API_KEY: key}, ctx = context) => (await h(req(), env, ctx)).json();
test('official URL: fixed scope, raw units, 18 month bounded range', () => {
  const url = observationsUrl('PAYEMS', key, new Date(now()));
  assert.equal(url.origin + url.pathname, 'https://api.stlouisfed.org/fred/series/observations');
  const q = url.searchParams;
  assert.equal(q.get('api_key'), key); assert.equal(q.get('series_id'), 'PAYEMS');
  assert.equal(q.get('units'), 'lin'); assert.equal(q.get('file_type'), 'json'); assert.equal(q.get('sort_order'), 'asc');
  assert.equal(q.get('observation_start'), '2025-03-01'); assert.equal(q.get('observation_end'), '2026-09-13');
  assert.throws(() => observationsUrl('OTHER', key), /INVALID_SERIES/);
});
test('JSON parsing preserves zero and separates realtime dates', () => {
  const f = fixture(); f.observations[0].value = '0';
  const parsed = parseObservations(f);
  assert.equal(parsed.points[0].value, 0); assert.equal(parsed.points[0].date, '2025-03-01');
  assert.equal(parsed.points[0].realtime_start, '2026-09-01'); assert.equal(parsed.realtime.realtime_start, '2026-09-13');
});
test('dot is explicit missing; route cannot silently use older trailing data', async () => {
  const f = fixture(); f.observations.at(-1).value = '.';
  assert.deepEqual(parseObservations(f).missingDates, ['2026-08-01']);
  const r = await fetchApiShadowSeries('payroll', key, {now, fetchImpl: async () => Response.json(f)});
  assert.equal(r.status, 'MISSING_OBSERVATION'); assert.equal(r.currentValue, undefined);
});
test('same duplicate dedupes; different duplicate fails', () => {
  const f = fixture(); f.observations.push({...f.observations[0]}); f.count++;
  assert.equal(parseObservations(f).points.length, 18);
  f.observations.at(-1).value = '7'; assert.throws(() => parseObservations(f), /DUPLICATE_CONFLICT/);
});
for (const v of ['Infinity', 'NaN', '', null]) test(`invalid numeric ${v}`, () => {
  const f = fixture(); f.observations[0].value = v; assert.throws(() => parseObservations(f), /INVALID_NUMERIC/);
});
test('invalid dates, transformed and paginated responses rejected', () => {
  const f = fixture(); f.observations[0].date = '2025-02-30'; assert.throws(() => parseObservations(f), /INVALID_DATE/);
  assert.throws(() => parseObservations({...fixture(), units: 'chg'}), /TRANSFORMED_RESPONSE/);
  assert.throws(() => parseObservations({...fixture(), count: 100}), /INCOMPLETE_RESPONSE/);
  assert.throws(() => parseObservations({...fixture(), offset: 1}), /INCOMPLETE_RESPONSE/);
});
for (const id of ['cpi', 'ppi', 'unemployment', 'payroll']) test(`${id}: raw observations produce existing semantics`, async () => {
  const r = await fetchApiShadowSeries(id, key, config);
  assert.equal(r.status, 'SUCCESS'); assert.equal(r.transportMode, 'FRED_API_V1'); assert.equal(r.authority, 'BLS');
  assert.equal(r.latestObservedAt, '2026-08-01'); assert.equal(r.previousObservedAt, '2026-07-01');
  assert.equal(r.recentObservations.length, 4); assert.equal(r.fetchedAt, '2026-09-13T00:00:00.000Z');
  assert.equal(r.providerUpdatedDataIsCurrent, 'unknown');
  if (id === 'cpi' || id === 'ppi') {
    assert.equal(r.currentValue, (117 / 105 - 1) * 100); assert.equal(r.previousValue, (116 / 104 - 1) * 100);
  }
  if (id === 'ppi') {assert.equal(r.revisionSensitive, true); assert.equal(r.mappingQualification, 'VINTAGE_SENSITIVE');}
  if (id === 'unemployment') {assert.equal(r.currentValue, 117); assert.equal(r.previousValue, 116); assert.equal(r.csvComparison.apiRecentMonthsContinuous, true);}
  if (id === 'payroll') {assert.equal(r.currentValue, 1); assert.equal(r.previousValue, 1); assert.equal(r.csvComparison.classification, 'GRAPH_CSV_STALE'); assert.equal(r.csvComparison.missingLatestObservation, true);}
});
test('payroll same-date revisions are separate from missing latest month', async () => {
  const f = fixture(); f.observations.pop(); f.count--;
  const r = await fetchApiShadowSeries('payroll', key, {now, fetchImpl: async () => Response.json(f)});
  assert.equal(r.csvComparison.missingLatestObservation, false); assert.equal(r.csvComparison.valueDifference, true);
  assert.equal(r.csvComparison.classification, 'LATEST_DATE_NOT_NEWER');
});
for (const id of ['cpi', 'ppi', 'unemployment', 'payroll']) test(`${id}: month gap remains failure`, async () => {
  const f = fixture(); f.observations.splice(-2, 1); f.count--;
  assert.equal((await fetchApiShadowSeries(id, key, {now, fetchImpl: async () => Response.json(f)})).status, ['cpi', 'unemployment'].includes(id) ? 'MISSING_OBSERVATION' : 'MONTH_GAP');
});
for (const [label, fetchImpl, expected] of [
  ['HTTP', async () => new Response(key, {status: 403}), 'HTTP_ERROR'],
  ['invalid JSON', async () => new Response(key), 'INVALID_JSON'],
  ['missing observations', async () => Response.json({error_message: key}), 'INVALID_RESPONSE'],
  ['timeout', async () => new Promise(() => {}), 'TIMEOUT'],
  ['body timeout', async () => new Response(new ReadableStream({start() {}})), 'TIMEOUT'],
  ['network secret', async () => {throw Error('https://private/?api_key=' + key);}, 'REQUEST_FAILED'],
]) test(label + ' redacted failure', async () => {
  const r = await fetchApiShadowSeries('cpi', key, {now, fetchImpl, timeoutMs: 10});
  assert.equal(r.status, expected); assert.ok(!JSON.stringify(r).includes(key)); assert.ok(!JSON.stringify(r).includes('api_key'));
});
for (const [label, ctx] of [['LOCAL', {...context, nodeEnv: 'development'}], ['TEST', {...context, nodeEnv: 'test'}], ['UNKNOWN', {}]]) test(label + ' no fetch', async () => {
  let n = 0; const h = createFredApiShadow({...config, fetchImpl: async () => {n++; throw Error();}});
  assert.equal((await run(h, {FRED_API_KEY: key}, ctx)).requestCount, 0); assert.equal(n, 0);
});
test('missing binding blocks before fetch', async () => {
  const h = createFredApiShadow({...config, fetchImpl: async () => assert.fail('no fetch')});
  assert.equal((await run(h, {})).status, 'BLOCKED_BY_FRED_API_KEY');
});
test('one request per series; cache/coalescing; no CSV requests or secret output', async () => {
  const seen = []; const h = createFredApiShadow({...config, fetchImpl: async (url, init) => {
    assert.equal(url.hostname, 'api.stlouisfed.org'); assert.equal(init.redirect, 'manual');
    seen.push(url.searchParams.get('series_id')); return fetchFixture();
  }});
  const results = await Promise.all([run(h), run(h)]); await run(h);
  assert.deepEqual(seen.sort(), ['CPIAUCNS', 'PAYEMS', 'PPIFIS', 'UNRATE']);
  assert.equal(results[0].secondaryReady, false); assert.equal(results[0].classification, 'FRED_API_SEMANTICS_PASS_FRESHNESS_UNVERIFIED');
  assert.equal(results[1].requestCount, 0); assert.ok(!JSON.stringify(results).includes(key));
});
test('platform cache reuses result and expiry blocks', async () => {
  let saved, n = 0; const store = {async match(){return saved?.clone();}, async put(k,v){saved=v.clone();}};
  const cfg = {...config, cacheStore: () => store, fetchImpl: async () => {n++; return fetchFixture();}};
  await run(createFredApiShadow(cfg)); assert.equal((await run(createFredApiShadow(cfg))).requestCount, 0); assert.equal(n, 4);
  const h = createFredApiShadow({...cfg, now: () => Date.parse('2026-09-20')}); assert.equal((await h(req(),{FRED_API_KEY:key},context)).status,410); assert.equal(n,4);
});
