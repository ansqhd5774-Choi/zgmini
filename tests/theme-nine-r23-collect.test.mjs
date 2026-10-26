import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {collectApprovedNine, collectApprovedNineAuto, inspectApprovedNine,
  inspectCollectionFailure, readApprovedRoster, resumeReviewedTimeout}
  from '../scripts/pc-writer/theme-nine-r23-collect.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zgmini-nine-r23-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const rosterPath = path.join(root, 'approved.json');
  const roster = {schema: 'zgmini.theme-nine.r20-approved-three-gate-candidates.v1',
    counts: {themes: 2, positions: 4, uniqueTickers: 3}, groups: [
      {theme: 'robotics', tickers: [
        {ticker: 'BOTZ', approvedCandidate: true}, {ticker: 'ROBO', approvedCandidate: true}]},
      {theme: 'driving', tickers: [
        {ticker: 'BOTZ', approvedCandidate: true}, {ticker: 'DRIV', approvedCandidate: true}]}]};
  fs.writeFileSync(rosterPath, JSON.stringify(roster));
  return {root, rosterPath, roster};
}

const makeBar = (symbol, day) => ({symbol, timestamp: `2026-10-${day}T19:00:00Z`,
  open: 101, high: 105, low: 99, close: 102, volume: 3500, is_gap: false});

test('reads approved positions with deduplicated symbols plus SPY; inspection is read-only', t => {
  const {root, rosterPath, roster} = workspace(t);
  assert.deepEqual(readApprovedRoster(rosterPath).symbols, ['BOTZ', 'DRIV', 'ROBO', 'SPY']);
  const inspection = inspectApprovedNine({rosterPath, dataRoot: root});
  assert.equal(inspection.uniqueETFs, 3);
  assert.equal(inspection.positions, 4);
  assert.equal(inspection.mode, 'NO_NETWORK_NO_WRITE');
  assert.equal(fs.existsSync(path.join(root, 'themes')), false);
  roster.groups[0].tickers[0].approvedCandidate = false;
  fs.writeFileSync(rosterPath, JSON.stringify(roster));
  assert.throws(() => readApprovedRoster(rosterPath), /UNAPPROVED_TICKER/);
});

test('four GET maximum, exact-window resume, SHA manifest and no repeated committed pages', async t => {
  const {root, rosterPath} = workspace(t);
  const seen = [];
  const fetchImpl = async url => {
    const symbol = url.pathname.split('/').at(-2);
    assert.equal(url.origin, 'https://getmarkethistory.com');
    assert.equal(url.pathname, `/api/v1/bars/stocks/${symbol}/1h`);
    assert.equal(url.searchParams.get('limit'), '5000');
    assert.equal(url.searchParams.get('format'), 'jsonl');
    assert.match(url.searchParams.get('columns'), /volume/);
    const page = url.searchParams.get('cursor') === 'page2' ? 2 : 1;
    seen.push(symbol + ':' + page);
    return new Response(JSON.stringify(makeBar(symbol, page === 1 ? '21' : '22')) + '\n',
      {headers: page === 1 ? {'x-next-cursor': 'page2', 'x-data-through': '2026-10-22T20:00:00Z'} : {}});
  };
  const args = {rosterPath, dataRoot: root, start: '2023-01-01', end: '2026-10-26', fetchImpl};
  const one = await collectApprovedNine(args);
  assert.equal(one.providerCalls, 4);
  assert.equal(one.completedSymbols, 2);
  assert.equal(one.status, 'CHECKPOINT_READY_TO_RESUME');
  const two = await collectApprovedNine(args);
  assert.equal(two.providerCalls, 4);
  assert.equal(two.completedSymbols, 4);
  assert.equal(two.status, 'PRIVATE_RAW_COLLECTION_COMPLETE');
  assert.equal((await collectApprovedNine(args)).providerCalls, 0);
  assert.equal(seen.length, 8);
  const home = path.join(root, 'themes/legacy-nine-r23');
  const manifest = JSON.parse(fs.readFileSync(path.join(home, 'raw-manifest.json'), 'utf8'));
  assert.equal(manifest.files.length, 8);
  for (const entry of manifest.files) {
    assert.equal(hash(fs.readFileSync(path.join(home, entry.path))), entry.sha256);
    assert.equal(entry.priceMode, 'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE');
    assert.equal(entry.rows, 1);
    assert.equal(entry.nonGapRows, 1);
  }
  assert.equal(inspectApprovedNine(args).completedSymbols, 4);
});

test('failed provider response is persisted and cannot be retried implicitly', async t => {
  const {root, rosterPath} = workspace(t);
  let calls = 0;
  const args = {rosterPath, dataRoot: root, start: '2026-10-19', end: '2026-10-26',
    fetchImpl: async () => { calls++; return new Response('', {status: 429}); }};
  assert.equal((await collectApprovedNine(args)).status, 'STOP_HTTP_429');
  assert.equal((await collectApprovedNine(args)).status, 'STOP_PREVIOUS_FAILURE_REVIEW_REQUIRED');
  assert.equal(calls, 1);
  assert.equal(inspectApprovedNine(args).checkpoint, 'STOP_REVIEW_REQUIRED');
});

test('SHA mismatch stops all future provider calls', async t => {
  const {root, rosterPath} = workspace(t);
  let calls = 0;
  const args = {rosterPath, dataRoot: root, start: '2026-10-21', end: '2026-10-26',
    fetchImpl: async url => {calls++;
      const symbol = url.pathname.split('/').at(-2);
      return new Response(JSON.stringify(makeBar(symbol, '21')) + '\n');}};
  await collectApprovedNine(args);
  const home = path.join(root, 'themes/legacy-nine-r23');
  const entry = JSON.parse(fs.readFileSync(path.join(home, 'raw-manifest.json'), 'utf8')).files[0];
  fs.appendFileSync(path.join(home, entry.path), 'corruption');
  await assert.rejects(() => collectApprovedNine(args), /RAW_SHA_MISMATCH/);
  assert.equal(calls, 4);
});

test('same raw pages do not duplicate manifest entries in another window', async t => {
  const {root, rosterPath} = workspace(t);
  const fetchImpl = async url => new Response(JSON.stringify(makeBar(url.pathname.split('/').at(-2), '21')) + '\n');
  const args = {rosterPath, dataRoot: root, start: '2026-10-21', end: '2026-10-26', fetchImpl};
  await collectApprovedNine(args);
  const second = await collectApprovedNine({...args, end: '2026-10-27'});
  assert.equal(second.status, 'PRIVATE_RAW_COLLECTION_COMPLETE');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'themes/legacy-nine-r23/raw-manifest.json'), 'utf8'));
  assert.equal(manifest.files.length, 4);
});

test('invalid OHLCV never becomes raw data or success', async t => {
  const {root, rosterPath} = workspace(t);
  const args = {rosterPath, dataRoot: root, start: '2026-10-21', end: '2026-10-26',
    fetchImpl: async url => {const bad = makeBar(url.pathname.split('/').at(-2), '21');
      bad.high = 90;return new Response(JSON.stringify(bad) + '\n');}};
  const result = await collectApprovedNine(args);
  assert.equal(result.status, 'STOP_INVALID_RESPONSE');
  assert.equal(fs.readdirSync(path.join(root, 'themes/legacy-nine-r23/raw')).length, 0);
});

test('automatic collector advances in bounded four-GET batches with pauses', async () => {
  const results = [
    {status: 'CHECKPOINT_READY_TO_RESUME', providerCalls: 4, rawFilesStored: 4,
      completedSymbols: 1, pendingSymbols: 63},
    {status: 'CHECKPOINT_READY_TO_RESUME', providerCalls: 4, rawFilesStored: 4,
      completedSymbols: 3, pendingSymbols: 61},
    {status: 'PRIVATE_RAW_COLLECTION_COMPLETE', providerCalls: 2, rawFilesStored: 2,
      completedSymbols: 64, pendingSymbols: 0}
  ];
  const pauses = [], batches = [], limits = [];
  const summary = await collectApprovedNineAuto({start: '2023-01-01', end: '2026-10-26'}, {
    collectImpl: async options => {limits.push(options.maxRequests); return results.shift();},
    sleep: async ms => {pauses.push(ms);}, onBatch: batch => batches.push(batch)});
  assert.equal(summary.status, 'PRIVATE_RAW_COLLECTION_COMPLETE');
  assert.equal(summary.totalProviderCalls, 10);
  assert.equal(summary.totalRawFilesStored, 10);
  assert.equal(summary.batchesExecuted, 3);
  assert.deepEqual(limits, [4, 4, 4]);
  assert.deepEqual(pauses, [60_000, 60_000]);
  assert.deepEqual(batches.map(batch => batch.completedSymbols), [1, 3, 64]);
});

test('automatic collector never retries after an HTTP 429', async () => {
  let calls = 0, pauses = 0;
  const summary = await collectApprovedNineAuto({}, {
    collectImpl: async () => { calls++; return {status: 'STOP_HTTP_429',
      providerCalls: 1, rawFilesStored: 0};},
    sleep: async () => {pauses++;}});
  assert.equal(summary.status, 'STOP_HTTP_429');
  assert.equal(summary.totalProviderCalls, 1);
  assert.equal(calls, 1);
  assert.equal(pauses, 0);
});

test('automatic collector exits at a finite cap or no-progress state', async () => {
  const item = {status: 'CHECKPOINT_READY_TO_RESUME', providerCalls: 4, rawFilesStored: 4,
    completedSymbols: 3, pendingSymbols: 61};
  let calls = 0;
  const capped = await collectApprovedNineAuto({}, {maxBatches: 2, pauseMs: 0,
    sleep: async () => {}, collectImpl: async () => {calls++; return item;}});
  assert.equal(capped.status, 'AUTO_BATCH_CAP_REACHED_RESUMABLE');
  assert.equal(capped.batchesExecuted, 2);
  assert.equal(calls, 2);
  const stalled = await collectApprovedNineAuto({}, {collectImpl: async () => ({
    status: 'CHECKPOINT_READY_TO_RESUME', providerCalls: 0, rawFilesStored: 0})});
  assert.equal(stalled.status, 'STOP_AUTO_UNEXPECTED_NO_PROGRESS');
});

test('failure diagnosis reveals reason and first affected symbol without writing', async t => {
  const {root, rosterPath} = workspace(t);
  const args = {rosterPath, dataRoot: root, start: '2023-01-01', end: '2026-10-26',
    fetchImpl: async url => {const bad = makeBar(url.pathname.split('/').at(-2), '21');
      bad.high = 90; return new Response(JSON.stringify(bad) + '\n');}};
  const attempt = await collectApprovedNine(args);
  assert.equal(attempt.status, 'STOP_INVALID_RESPONSE');
  const stateDir = path.join(root, 'themes/legacy-nine-r23/state');
  const stateFile = fs.readdirSync(stateDir).find(name => name.startsWith('collection-') && name.endsWith('.json'));
  const before = fs.readFileSync(path.join(stateDir, stateFile));
  const detail = inspectCollectionFailure(args);
  assert.equal(detail.mode, 'NO_NETWORK_NO_DATA_WRITE');
  assert.equal(detail.status, 'STOP_REVIEW_REQUIRED');
  assert.equal(detail.failedReason, 'THEME_NINE_R23_INVALID_OHLCV');
  assert.equal(detail.firstIncompleteSymbol, 'BOTZ');
  assert.equal(detail.completedSymbols, 0);
  assert.equal(detail.manifestRawFileCount, 0);
  assert.deepEqual(fs.readFileSync(path.join(stateDir, stateFile)), before);
});

test('response-body TimeoutError 23 is classified as timeout rather than invalid market data', async t => {
  const {root, rosterPath} = workspace(t);
  const args = {rosterPath, dataRoot: root, start: '2023-01-01', end: '2026-10-26',
    now: () => '2026-10-26T14:21:27.649Z',
    fetchImpl: async () => new Response(new ReadableStream({start(controller) {
      controller.error(new DOMException('Stream timeout', 'TimeoutError'));
    }}))};
  const result = await collectApprovedNine(args);
  assert.equal(result.status, 'STOP_RESPONSE_BODY_TIMEOUT');
  assert.equal(result.failedReason, 'RESPONSE_BODY_TIMEOUT');
  assert.equal(result.failedSymbol, 'BOTZ');
  assert.equal(result.providerCalls, 1);
  assert.equal(inspectCollectionFailure(args).failedReason, 'RESPONSE_BODY_TIMEOUT');
  assert.equal(fs.readdirSync(path.join(root, 'themes/legacy-nine-r23/raw')).length, 0);
});

test('one-time exact review rearms legacy numeric timeout only after SHA and identity verification', async t => {
  const {root, rosterPath} = workspace(t);
  const args = {rosterPath, dataRoot: root, start: '2023-01-01', end: '2026-10-26',
    now: () => '2026-10-26T14:21:27.649Z',
    fetchImpl: async () => new Response(new ReadableStream({start(controller) {
      controller.error(new DOMException('Stream timeout', 'TimeoutError'));
    }}))};
  await collectApprovedNine(args);
  const checkpoint = path.join(root, 'themes/legacy-nine-r23/state');
  const file = path.join(checkpoint, fs.readdirSync(checkpoint).find(name => name.endsWith('.json')));
  const state = JSON.parse(fs.readFileSync(file));
  // Model the pre-fix software that wrote `error.code` (the numeric DOMException 23).
  state.reason = 23;
  fs.writeFileSync(file, JSON.stringify(state));
  const expected = {failedAt: '2026-10-26T14:21:27.649Z', failedReason: 23,
    firstIncompleteSymbol: 'BOTZ', completedSymbols: 0, manifestRawFileCount: 0};
  assert.throws(() => resumeReviewedTimeout({...args, expected: {...expected, completedSymbols: 1}}),
    /REVIEW_EVIDENCE_CHANGED_NO_WRITE/);
  assert.equal(JSON.parse(fs.readFileSync(file)).reason, 23);
  const result = resumeReviewedTimeout({...args, expected});
  assert.equal(result.status, 'CHECKPOINT_REARMED_ONCE');
  assert.equal(result.providerCalls, 0);
  const revised = JSON.parse(fs.readFileSync(file));
  assert.equal(revised.failedAt, undefined);
  assert.equal(revised.manualReviews.length, 1);
  assert.equal(revised.manualReviews[0].priorReason, 23);
  assert.throws(() => resumeReviewedTimeout({...args, expected}),
    /REVIEW_EVIDENCE_CHANGED_NO_WRITE/);
  let resumedCalls = 0;
  const resumed = await collectApprovedNine({...args, fetchImpl: async url => {
    resumedCalls++;
    return new Response(JSON.stringify(makeBar(url.pathname.split('/').at(-2), '21')) + '\n');
  }});
  assert.equal(resumed.status, 'PRIVATE_RAW_COLLECTION_COMPLETE');
  assert.equal(resumedCalls, 4);
});

test('one-time timeout review refuses an HTTP failure without changing state', async t => {
  const {root, rosterPath} = workspace(t);
  const args = {rosterPath, dataRoot: root, start: '2023-01-01', end: '2026-10-26',
    fetchImpl: async () => new Response('', {status: 429})};
  await collectApprovedNine(args);
  const folder = path.join(root, 'themes/legacy-nine-r23/state');
  const filename = path.join(folder, fs.readdirSync(folder).find(name => name.endsWith('.json')));
  const before = fs.readFileSync(filename);
  assert.throws(() => resumeReviewedTimeout(args), /REVIEW_EVIDENCE_CHANGED_NO_WRITE/);
  assert.deepEqual(fs.readFileSync(filename), before);
});
