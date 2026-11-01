import {marketDataFeedFixtureSource} from './market-data-feed-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {parseFred} from '../lib/market-data/providers.mjs';
import {normalizeShadowSeries, SHADOW_SERIES} from '../lib/market-data/fred-bls-shadow.mjs';
import {createFredBlsShadow} from '../worker/p0-fred-bls-shadow.mjs';

const now = () => Date.parse('2026-09-13T00:00:00Z');
const context = {nodeEnv: 'production', importMetaProd: true, workerContext: {waitUntil() {}, passThroughOnException() {}}, workerUserAgent: 'Cloudflare-Workers'};
const req = (url = 'https://zgmini.kr/api/internal/p0-fred-bls-shadow-check', options) => new Request(url, options);
const options = {fetchedAt: new Date(now()).toISOString()};
function points() {
  return Array.from({length: 14}, (_, i) => ({date: new Date(Date.UTC(2025, 6 + i, 1)).toISOString().slice(0, 10), value: 100 + i * 2}));
}
function csv(id, data = points()) { return `observation_date,${id}\n` + data.map(p => `${p.date},${p.value}`).join('\n'); }
const fixtureFetch = async url => new Response(csv(new URL(url).searchParams.get('id')), {headers: {'content-type': 'text/csv'}});
const handler = extra => createFredBlsShadow({now, cacheStore: () => undefined, fetchImpl: fixtureFetch, ...extra});
const run = async (h, request = req(), ctx = context) => (await h(request, ctx)).json();

for (const id of Object.keys(SHADOW_SERIES)) test(`${id}: CSV parses, metadata and semantic values retained`, () => {
  const meta = SHADOW_SERIES[id], data = parseFred(csv(meta.transportSeriesId));
  const result = normalizeShadowSeries(id, data, options);
  assert.equal(result.authority, 'BLS'); assert.equal(result.transportProvider, 'FRED');
  assert.equal(result.sourceSeriesId, meta.sourceSeriesId); assert.equal(result.transportSeriesId, meta.transportSeriesId);
  assert.equal(result.observedAt, '2026-08-01'); assert.equal(result.previousObservedAt, '2026-07-01');
  assert.notEqual(result.observedAt, result.fetchedAt.slice(0, 10));
  assert.equal(result.semantic, 'PASS');
  if (id === 'unemployment') {assert.equal(result.currentValue, 126); assert.equal(result.previousValue, 124);}
  if (id === 'payroll') {assert.equal(result.currentValue, 2); assert.equal(result.previousValue, 2); assert.equal(result.rawPrior, 122);}
  if (id === 'ppi') {assert.equal(result.revisionSensitive, true); assert.equal(result.vintagePolicy, 'LATEST_AVAILABLE'); assert.notEqual(result.mappingClassification, 'EXACT_SOURCE_MAPPING');}
});
test('CPI/PPI calendar YoY matches unchanged production function', () => {
  const src = marketDataFeedFixtureSource().replace(/^import .*;\r?\n/gm, '').replace('export async function collectMarketDataFeed', 'async function collectMarketDataFeed');
  const makeYoy = new Function(ts.transpile(src, {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None}) + ';return makeYoyIndicator;')();
  for (const id of ['cpi', 'ppi']) {
    const p = points().reverse(), result = normalizeShadowSeries(id, p, options), baseline = makeYoy(p.reverse(), {});
    assert.equal(result.currentValue, baseline.currentValue); assert.equal(result.previousValue, baseline.previousValue);
    assert.equal(result.yearAgoObservedAt, '2025-08-01'); assert.equal(result.previousYearAgoObservedAt, '2025-07-01');
  }
});
for (const id of Object.keys(SHADOW_SERIES)) test(`${id}: month gaps rejected instead of skipping`, () => {
  const p = points(); p.splice(-2, 1);
  assert.throws(() => normalizeShadowSeries(id, p, options), /MONTH_GAP/);
});
test('identical duplicates deduped; conflicting duplicate rejected', () => {
  const p = points(); p.push({...p[0]});
  assert.equal(normalizeShadowSeries('cpi', p, options).status, 'SUCCESS');
  assert.equal(parseFred(csv('CPIAUCNS', p)).length, 14);
  p.at(-1).value = 500;
  assert.throws(() => normalizeShadowSeries('cpi', p, options), /DUPLICATE_CONFLICT/);
  assert.throws(() => parseFred(csv('CPIAUCNS', p)), /INVALID_RESPONSE/);
});
for (const id of Object.keys(SHADOW_SERIES)) test(`${id}: insufficient history rejected`, () => {
  assert.throws(() => normalizeShadowSeries(id, points().slice(-(SHADOW_SERIES[id].history - 1)), options), /INSUFFICIENT_HISTORY/);
});
test('zeros preserved and zero YoY denominator rejected', () => {
  const p = points(); p.at(-1).value = 0;
  assert.equal(normalizeShadowSeries('unemployment', p, options).currentValue, 0);
  assert.equal(normalizeShadowSeries('payroll', p, options).currentValue, -124);
  assert.equal(normalizeShadowSeries('cpi', p, options).currentValue, -100);
  p[1].value = 0;
  assert.throws(() => normalizeShadowSeries('cpi', p, options), /ZERO_YOY_DENOMINATOR/);
});
for (const value of [NaN, Infinity, -Infinity, '', null]) test(`invalid value ${value} rejected`, () => {
  const p = points(); p.at(-1).value = value;
  assert.throws(() => normalizeShadowSeries('cpi', p, options), /NONFINITE_OR_INVALID_VALUE/);
});
for (const date of ['2026-13-01', '2026-02-30', '2026-08-02', '2026-8-01']) test(`invalid monthly date ${date}`, () => {
  const p = points(); p.at(-1).date = date;
  assert.throws(() => normalizeShadowSeries('cpi', p, options), /INVALID_DATE/);
});
test('stale and future observations fail closed', () => {
  assert.throws(() => normalizeShadowSeries('cpi', points(), {fetchedAt: '2027-01-01'}), /STALE/);
  assert.throws(() => normalizeShadowSeries('cpi', points(), {fetchedAt: '2026-07-01'}), /FUTURE_OBSERVATION/);
});
test('exactly four fixed FRED GETs, manual redirect, compact response and no secrets', async () => {
  const seen = [];
  const h = handler({fetchImpl: async (url, init) => {
    seen.push(new URL(url).searchParams.get('id'));
    assert.equal(new URL(url).hostname, 'fred.stlouisfed.org'); assert.equal(init.method, undefined);
    assert.equal(init.redirect, 'manual'); assert.ok(init.signal instanceof AbortSignal);
    return new Response(csv(seen.at(-1)), {headers: {'set-cookie': 'fixture-secret', 'x-private': 'fixture-private'}});
  }});
  const result = await run(h);
  assert.deepEqual(seen.sort(), ['CPIAUCNS', 'PAYEMS', 'PPIFIS', 'UNRATE']);
  assert.equal(result.classification, 'FRED_BLS_SECONDARY_SHADOW_PASS'); assert.equal(result.requestCount, 4);
  assert.equal(result.publicFallbackEnabled, false);
  for (const s of Object.values(result.series)) {assert.equal(s.httpStatus, 200); assert.ok(s.bodyReadCompleteMs >= 0);}
  const text = JSON.stringify(result);
  for (const secret of ['fixture-secret', 'fixture-private', 'observation_date,', 'stack', 'cookies']) assert.ok(!text.includes(secret));
});
for (const [name, request, ctx] of [
  ['LOCAL', req('http://127.0.0.1:8799/api/internal/p0-fred-bls-shadow-check'), context],
  ['TEST', req(), {...context, nodeEnv: 'test'}],
  ['UNKNOWN', req(), {}],
]) test(`${name} no outbound calls`, async () => {
  let calls = 0; const h = handler({fetchImpl: async () => {calls++; throw Error();}});
  const result = await run(h, request, ctx);
  assert.equal(result.runtimeClassification, name); assert.equal(result.requestCount, 0); assert.equal(calls, 0);
});
test('missing cf and false PROD alone do not block validated platform context', async () => {
  assert.equal((await run(handler(), req(), {...context, importMetaProd: false})).classification, 'FRED_BLS_SECONDARY_SHADOW_PASS');
});
for (const [name, fetchImpl, expected] of [
  ['HTTP', async () => new Response('private error', {status: 503}), 'HTTP_ERROR'],
  ['CSV', async () => new Response('<html>not CSV</html>'), 'INVALID_RESPONSE'],
  ['network', async () => {throw Error('fixture-secret');}, 'REQUEST_FAILED'],
  ['timeout', async () => new Promise(() => {}), 'TIMEOUT'],
  ['body timeout', async () => new Response(new ReadableStream({start() {}})), 'TIMEOUT'],
  ['nonfinite CSV', async () => new Response(csv('UNRATE', [{date: '2026-07-01', value: 1}, {date: '2026-08-01', value: 'NaN'}])), 'INVALID_RESPONSE'],
]) test(`${name} partial, no fallback and no leaked error`, async () => {
  const result = await run(handler({fetchImpl, timeoutMs: 10}));
  assert.equal(result.classification, 'FRED_BLS_SECONDARY_SHADOW_PARTIAL');
  for (const s of Object.values(result.series)) {assert.equal(s.status, expected); assert.equal(s.semantic, 'FAIL'); assert.equal(s.currentValue, undefined);}
  assert.ok(!JSON.stringify(result).includes('fixture-secret'));
});
test('one failed series makes overall result partial', async () => {
  const result = await run(handler({fetchImpl: async url => new URL(url).searchParams.get('id') === 'PPIFIS' ? new Response('', {status: 500}) : fixtureFetch(url)}));
  assert.equal(result.classification, 'FRED_BLS_SECONDARY_SHADOW_PARTIAL');
  assert.equal(result.series.cpi.semantic, 'PASS'); assert.equal(result.series.ppi.semantic, 'FAIL');
});
test('cache, coalescing, and 15 minute expiry', async () => {
  let calls = 0, time = now();
  const h = handler({now: () => time, fetchImpl: async url => {calls++; await new Promise(r => setTimeout(r, 5)); return fixtureFetch(url);}});
  const results = await Promise.all([run(h), run(h)]);
  assert.equal(calls, 4); assert.deepEqual(results.map(x => x.requestCount), [4, 0]);
  assert.equal((await run(h)).cacheHit, true); assert.equal(calls, 4);
  time += 900000; await run(h); assert.equal(calls, 8);
});
test('platform cache reused by a new handler', async () => {
  let saved, calls = 0;
  const cache = {async match() {return saved?.clone();}, async put(key, response) {saved = response.clone();}};
  const config = {cacheStore: () => cache, fetchImpl: async url => {calls++; return fixtureFetch(url);}};
  await run(handler(config)); assert.equal((await run(handler(config))).requestCount, 0); assert.equal(calls, 4);
});
test('method, query and diagnostic expiry block all upstream calls', async () => {
  let calls = 0; const config = {fetchImpl: async () => {calls++; throw Error();}};
  assert.equal((await handler(config)(req(undefined, {method: 'POST'}), context)).status, 405);
  assert.equal((await handler(config)(req('https://zgmini.kr/api/internal/p0-fred-bls-shadow-check?x=1'), context)).status, 400);
  assert.equal((await handler({...config, now: () => Date.parse('2026-09-20')})(req(), context)).status, 410);
  assert.equal(calls, 0);
});
test('public market-data route does not import shadow provider', () => {
  const source = marketDataFeedFixtureSource();
  assert.ok(!source.includes('fred-bls-shadow')); assert.ok(!source.includes('SHADOW_SERIES'));
  const worker = fs.readFileSync('worker/index.ts', 'utf8');
  assert.ok(worker.includes('url.pathname === "/api/internal/p0-fred-bls-shadow-check"'));
});
