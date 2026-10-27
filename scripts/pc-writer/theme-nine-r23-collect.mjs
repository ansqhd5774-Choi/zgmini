// R23: private, bounded 1h OHLCV acquisition for the R20 approved legacy-nine ETF roster.
// No score calculation, publication, scheduler operation, paid API, or implicit network call.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROSTER = path.resolve(HERE, '../../config/theme-nine-r20-approved-candidates.json');
const DEFAULT_DATA = 'E:/ZGmini/data';
const COLLECTION_PATH = 'themes/legacy-nine-r23';
const SOURCE = 'https://getmarkethistory.com';
const MAX_REQUESTS = 4;
const AUTO_MAX_BATCHES = 64;
const AUTO_PAUSE_MS = 60_000;
const PAGE_LIMIT = 5000;
const MAX_BODY_BYTES = 8_000_000;
// A 23-second timeout expired during FINX response streaming on 2026-10-26.
// 45 seconds is a bounded per-call budget; an error still stops without retry.
const REQUEST_TIMEOUT_MS = 45_000;
const REVIEWED_TIMEOUT = Object.freeze({
  failedAt: '2026-10-26T14:21:27.649Z', failedReason: 23,
  firstIncompleteSymbol: 'FINX', completedSymbols: 20, manifestRawFileCount: 38
});
const sha256 = value => createHash('sha256').update(value).digest('hex');
const ny = new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York',
  year: 'numeric', month: '2-digit', day: '2-digit'});
function nyDay(timestamp) {
  const parts = Object.fromEntries(ny.formatToParts(new Date(timestamp))
    .filter(item => item.type !== 'literal').map(item => [item.type, item.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
const dateOK = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value + 'T00:00:00Z')) &&
  new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const tickerOK = value => typeof value === 'string' && /^[A-Z][A-Z0-9.]{0,11}$/.test(value);
const fail = code => { throw Object.assign(new Error('THEME_NINE_R23_' + code), {code: 'THEME_NINE_R23_' + code}); };

export function readApprovedRoster(rosterPath = DEFAULT_ROSTER) {
  const raw = fs.readFileSync(rosterPath);
  const value = JSON.parse(raw.toString('utf8'));
  if (value.schema !== 'zgmini.theme-nine.r20-approved-three-gate-candidates.v1' ||
      !Array.isArray(value.groups) || value.groups.length !== value.counts?.themes ||
      !Number.isInteger(value.counts?.positions) || !Number.isInteger(value.counts?.uniqueTickers)) fail('ROSTER_CONTRACT');
  const positions = value.groups.flatMap(group => {
    if (typeof group.theme !== 'string' || !Array.isArray(group.tickers) || !group.tickers.length) fail('ROSTER_GROUP');
    return group.tickers.map(item => {
      if (!tickerOK(item?.ticker) || item.approvedCandidate !== true) fail('UNAPPROVED_TICKER');
      return item.ticker;
    });
  });
  const unique = [...new Set(positions)].sort();
  if (positions.length !== value.counts.positions || unique.length !== value.counts.uniqueTickers) fail('ROSTER_COUNTS');
  // SPY is a benchmark, not a new approved thematic ETF.
  return {rosterSha256: sha256(raw), themes: value.groups.length, positions: positions.length,
    uniqueETFs: unique.length, symbols: [...new Set([...unique, 'SPY'])].sort()};
}

function assertWithin(root, target) {
  const relative = path.relative(root, target);
  if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) fail('PATH_OUTSIDE_DATA_ROOT');
}

function folder(root, relative) {
  const candidate = path.join(root, relative);
  assertWithin(root, candidate);
  fs.mkdirSync(candidate, {recursive: true});
  const actual = fs.realpathSync(candidate);
  assertWithin(root, actual);
  return actual;
}

function writeAtomic(filename, value) {
  const temporary = filename + '.' + process.pid + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
  try { fs.renameSync(temporary, filename); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

function validateRaw(home, entry) {
  if (!entry || typeof entry.path !== 'string' ||
      !/^raw\/[A-Z][A-Z0-9.]{0,11}_[a-f0-9]{64}\.jsonl$/.test(entry.path) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256)) fail('MANIFEST_ENTRY');
  const rawPath = path.join(home, ...entry.path.split('/'));
  assertWithin(home, rawPath);
  if (!fs.existsSync(rawPath) || sha256(fs.readFileSync(rawPath)) !== entry.sha256) fail('RAW_SHA_MISMATCH');
}

function readManifest(home, roster) {
  const filename = path.join(home, 'raw-manifest.json');
  const manifest = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) :
    {version: 1, project: 'legacy-nine-r23', rosterSha256: roster.rosterSha256, source: SOURCE,
      licenseStatus: 'PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED', files: []};
  if (manifest.version !== 1 || manifest.project !== 'legacy-nine-r23' ||
      manifest.rosterSha256 !== roster.rosterSha256 || manifest.source !== SOURCE ||
      manifest.licenseStatus !== 'PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED' ||
      !Array.isArray(manifest.files)) fail('MANIFEST_IDENTITY');
  for (const entry of manifest.files) {
    if (!roster.symbols.includes(entry.symbol) || !entry.path.startsWith('raw/' + entry.symbol + '_'))
      fail('MANIFEST_UNAPPROVED_SYMBOL');
    validateRaw(home, entry);
  }
  if (new Set(manifest.files.map(entry => entry.path)).size !== manifest.files.length) fail('DUPLICATE_MANIFEST_ENTRY');
  return manifest;
}

function readState(home, roster, start, end) {
  const key = sha256(JSON.stringify({roster: roster.rosterSha256, start, end})).slice(0, 20);
  const filename = path.join(home, 'state', 'collection-' + key + '.json');
  const state = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) :
    {version: 1, project: 'legacy-nine-r23', rosterSha256: roster.rosterSha256, start, end,
      symbols: Object.fromEntries(roster.symbols.map(symbol => [symbol,
        {complete: false, cursor: null, pages: 0, files: [], lastTimestamp: null, noBars: false}]))};
  if (state.version !== 1 || state.project !== 'legacy-nine-r23' ||
      state.rosterSha256 !== roster.rosterSha256 || state.start !== start || state.end !== end ||
      Object.keys(state.symbols || {}).length !== roster.symbols.length ||
      roster.symbols.some(symbol => !state.symbols[symbol])) fail('CHECKPOINT_IDENTITY');
  return {filename, state};
}

async function readLimitedResponse(response) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) fail('BODY_TOO_LARGE');
  const chunks = []; let length = 0;
  if (!response.body) return Buffer.alloc(0);
  for await (const chunk of response.body) {
    length += chunk.byteLength;
    if (length > MAX_BODY_BYTES) fail('BODY_TOO_LARGE');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function validatePage(buffer, symbol, previousLast) {
  const rows = buffer.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  if (rows.length > PAGE_LIMIT) fail('EXCESS_ROWS');
  let last = previousLast, validRows = 0, gaps = 0;
  let firstObservation = null, lastObservation = null;
  for (const row of rows) {
    if (row?.symbol !== symbol || typeof row.timestamp !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(row.timestamp) ||
        Number.isNaN(Date.parse(row.timestamp)) || (last && row.timestamp <= last)) fail('INVALID_BAR_IDENTITY');
    last = row.timestamp;
    const day = nyDay(row.timestamp);
    if (firstObservation === null) firstObservation = day;
    lastObservation = day;
    if (row.is_gap === true) { gaps++; continue; }
    const fields = ['open', 'high', 'low', 'close'];
    if (fields.some(key => typeof row[key] !== 'number' || !Number.isFinite(row[key]) || row[key] <= 0) ||
        row.high < row.low || row.open > row.high || row.open < row.low ||
        row.close > row.high || row.close < row.low ||
        typeof row.volume !== 'number' || !Number.isFinite(row.volume) || row.volume < 0) fail('INVALID_OHLCV');
    validRows++;
  }
  return {count: rows.length, validRows, gaps, firstTimestamp: rows[0]?.timestamp ?? null,
    lastTimestamp: last, firstObservation, lastObservation};
}

export async function collectApprovedNine({dataRoot = DEFAULT_DATA, rosterPath = DEFAULT_ROSTER,
  start, end, maxRequests = MAX_REQUESTS, fetchImpl = fetch, now = () => new Date().toISOString()} = {}) {
  if (!dateOK(start) || !dateOK(end) || start > end || !Number.isInteger(maxRequests) ||
      maxRequests < 1 || maxRequests > MAX_REQUESTS) fail('ARGUMENTS');
  const roster = readApprovedRoster(rosterPath);
  if (!fs.existsSync(dataRoot)) fail('DATA_ROOT_MISSING');
  const root = fs.realpathSync(dataRoot);
  const home = folder(root, COLLECTION_PATH);
  folder(home, 'raw'); folder(home, 'state');
  const lock = path.join(home, 'state', 'collection.lock');
  let lockFd;
  try { lockFd = fs.openSync(lock, 'wx'); }
  catch (error) { if (error.code === 'EEXIST') fail('LOCK_EXISTS_MANUAL_REVIEW'); throw error; }
  fs.closeSync(lockFd);
  const result = {contract: 'THEME_NINE_R23_PRIVATE_COLLECTION_V1', status: 'RUNNING',
    branch: 'codex/theme-fear-greed-integration-20261025', rosterSha256: roster.rosterSha256,
    themes: roster.themes, positions: roster.positions, uniqueETFs: roster.uniqueETFs,
    totalSymbolsIncludingSPY: roster.symbols.length, providerCalls: 0, rawFilesStored: 0,
    d1Writes: 0, schedulerWrites: 0, publicationWrites: 0};
  try {
    const manifestPath = path.join(home, 'raw-manifest.json');
    const manifest = readManifest(home, roster);
    const {filename: statePath, state} = readState(home, roster, start, end);
    for (const symbol of roster.symbols) {
      const progress = state.symbols[symbol];
      if (!Array.isArray(progress.files) ||
          (progress.complete && !progress.files.length && !progress.noBars)) fail('CHECKPOINT_RAW_IDENTITY');
      for (const entry of progress.files) {
        if (!entry.path.startsWith('raw/' + symbol + '_') ||
            !manifest.files.some(item => item.path === entry.path && item.sha256 === entry.sha256))
          fail('CHECKPOINT_MANIFEST_MISMATCH');
        validateRaw(home, entry);
      }
    }
    if (state.failedAt) { result.status = 'STOP_PREVIOUS_FAILURE_REVIEW_REQUIRED'; result.failedReason = state.reason; return result; }
    for (const symbol of roster.symbols) {
      const progress = state.symbols[symbol];
      while (!progress.complete && result.providerCalls < maxRequests) {
        const url = new URL('/api/v1/bars/stocks/' + symbol + '/1h', SOURCE);
        for (const [key, value] of Object.entries({start, end, limit: String(PAGE_LIMIT),
          format: 'jsonl', columns: 'timestamp,symbol,open,high,low,close,volume,is_gap'})) url.searchParams.set(key, value);
        if (progress.cursor) url.searchParams.set('cursor', progress.cursor);
        const collectedAt = now();
        state.failedAt = collectedAt; state.reason = 'REQUEST_OUTCOME_UNKNOWN';
        writeAtomic(statePath, state);
        result.providerCalls++;
        let response;
        try { response = await fetchImpl(url, {redirect: 'error', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)}); }
        catch (error) { state.reason = error?.name === 'TimeoutError' || error?.code === 23 ?
          'REQUEST_TIMEOUT_BEFORE_HEADERS' : 'NETWORK_OR_TIMEOUT'; writeAtomic(statePath, state);
          result.status = 'STOP_NETWORK_OR_TIMEOUT'; result.failedReason = state.reason;
          result.failedSymbol = symbol; return result; }
        if (!response.ok) { state.reason = 'HTTP_' + response.status; writeAtomic(statePath, state);
          result.status = 'STOP_HTTP_' + response.status; return result; }
        let body, page;
        try { body = await readLimitedResponse(response); page = validatePage(body, symbol, progress.lastTimestamp); }
        catch (error) {
          const timeout = error?.name === 'TimeoutError' || error?.code === 23;
          state.reason = timeout ? 'RESPONSE_BODY_TIMEOUT' : error?.code || 'INVALID_RESPONSE';
          writeAtomic(statePath, state);
          result.status = timeout ? 'STOP_RESPONSE_BODY_TIMEOUT' : 'STOP_INVALID_RESPONSE';
          result.failedReason = state.reason;
          result.failedSymbol = symbol;
          return result;
        }
        const next = response.headers.get('x-next-cursor');
        if ((next && (next === progress.cursor || !page.count)) || (page.count === 0 && progress.pages > 0)) {
          state.reason = 'PAGINATION_CONFLICT'; writeAtomic(statePath, state);
          result.status = 'STOP_PAGINATION_CONFLICT'; return result;
        }
        if (page.count) {
          const digest = sha256(body), relative = 'raw/' + symbol + '_' + digest + '.jsonl';
          const target = path.join(home, ...relative.split('/'));
          if (!fs.existsSync(target)) fs.writeFileSync(target, body, {flag: 'wx'});
          if (sha256(fs.readFileSync(target)) !== digest) fail('RAW_READBACK');
          const entry = {path: relative, sha256: digest, symbol, source: SOURCE,
            requestedUrl: url.toString(), collectedAt, rows: page.count,
            nonGapRows: page.validRows, gapRows: page.gaps,
            observationFrom: page.firstObservation, observationThrough: page.lastObservation,
            firstTimestampUTC: page.firstTimestamp, lastTimestampUTC: page.lastTimestamp,
            providerDataThrough: response.headers.get('x-data-through'),
            providerPreviewFrom: response.headers.get('x-preview-from'),
            priceMode: 'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
            schemaVersion: 'GMH_1H_OHLCV_NDJSON_R23'};
          if (!manifest.files.some(item => item.path === relative)) manifest.files.push(entry);
          writeAtomic(manifestPath, manifest);
          if (!progress.files.some(item => item.path === relative)) progress.files.push({path: relative, sha256: digest});
          result.rawFilesStored++;
        } else progress.noBars = true;
        progress.lastTimestamp = page.lastTimestamp;
        progress.pages++;
        progress.cursor = next || null;
        progress.complete = !next;
        delete state.failedAt; delete state.reason;
        writeAtomic(statePath, state);
      }
      if (result.providerCalls >= maxRequests) break;
    }
    const complete = roster.symbols.filter(symbol => state.symbols[symbol].complete).length;
    const empty = roster.symbols.filter(symbol => state.symbols[symbol].noBars);
    result.completedSymbols = complete;
    result.pendingSymbols = roster.symbols.length - complete;
    result.noBarsSymbols = empty;
    result.status = complete < roster.symbols.length ? 'CHECKPOINT_READY_TO_RESUME' :
      empty.length ? 'PRIVATE_RAW_COMPLETE_WITH_MISSING_SYMBOLS' : 'PRIVATE_RAW_COLLECTION_COMPLETE';
    return result;
  } finally { fs.unlinkSync(lock); }
}

export function inspectApprovedNine({dataRoot = DEFAULT_DATA, rosterPath = DEFAULT_ROSTER, start, end} = {}) {
  const roster = readApprovedRoster(rosterPath);
  const report = {contract: 'THEME_NINE_R23_READ_ONLY_INSPECT', mode: 'NO_NETWORK_NO_WRITE',
    themes: roster.themes, positions: roster.positions, uniqueETFs: roster.uniqueETFs,
    totalSymbolsIncludingSPY: roster.symbols.length, rosterSha256: roster.rosterSha256,
    sourceRootExists: fs.existsSync(dataRoot), checkpoint: 'NONE'};
  if (start !== undefined || end !== undefined) {
    if (!dateOK(start) || !dateOK(end) || start > end) fail('INSPECT_DATES');
    const home = path.join(dataRoot, COLLECTION_PATH);
    const key = sha256(JSON.stringify({roster: roster.rosterSha256, start, end})).slice(0, 20);
    const file = path.join(home, 'state', 'collection-' + key + '.json');
    if (fs.existsSync(file)) {
      const state = JSON.parse(fs.readFileSync(file, 'utf8'));
      report.checkpoint = state.failedAt ? 'STOP_REVIEW_REQUIRED' : 'PRESENT';
      report.completedSymbols = roster.symbols.filter(symbol => state.symbols?.[symbol]?.complete).length;
      report.failedReason = state.reason ?? null;
    }
  }
  return report;
}

export function inspectCollectionFailure({dataRoot = DEFAULT_DATA, rosterPath = DEFAULT_ROSTER, start, end} = {}) {
  if (!dateOK(start) || !dateOK(end) || start > end) fail('INSPECT_DATES');
  const roster = readApprovedRoster(rosterPath);
  const home = path.join(dataRoot, COLLECTION_PATH);
  const {filename, state} = readState(home, roster, start, end);
  const existing = fs.existsSync(filename);
  const incomplete = roster.symbols.filter(symbol => !state.symbols[symbol].complete);
  const symbol = incomplete[0] ?? null;
  const active = symbol ? state.symbols[symbol] : null;
  const manifestPath = path.join(home, 'raw-manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
  return {contract: 'THEME_NINE_R23_READ_ONLY_FAILURE_DIAGNOSIS',
    mode: 'NO_NETWORK_NO_DATA_WRITE', checkpointFound: existing,
    checkpointFile: existing ? path.basename(filename) : null,
    status: state.failedAt ? 'STOP_REVIEW_REQUIRED' : existing ? 'CHECKPOINT_AVAILABLE' : 'NO_CHECKPOINT',
    failedReason: state.reason ?? null, failedAt: state.failedAt ?? null,
    completedSymbols: roster.symbols.length - incomplete.length,
    pendingSymbols: incomplete.length, firstIncompleteSymbol: symbol,
    firstIncompleteProgress: active ? {pages: active.pages, rawFiles: active.files?.length,
      cursorPresent: Boolean(active.cursor), lastTimestamp: active.lastTimestamp,
      noBars: active.noBars} : null,
    manifestRawFileCount: Array.isArray(manifest?.files) ? manifest.files.length : manifest ? null : 0,
    publicationWrites: 0, schedulerWrites: 0, dataWrites: 0};
}

// Explicit one-time manual review of the exact legacy DOMException 23 timeout.
// This does not call the provider, alter raw pages, or create a new data window.
export function resumeReviewedTimeout({dataRoot = DEFAULT_DATA, rosterPath = DEFAULT_ROSTER,
  start, end, expected = REVIEWED_TIMEOUT, now = () => new Date().toISOString()} = {}) {
  if (!dateOK(start) || !dateOK(end) || start > end) fail('REVIEW_DATES');
  if (!fs.existsSync(dataRoot)) fail('DATA_ROOT_MISSING');
  const root = fs.realpathSync(dataRoot);
  const home = path.join(root, COLLECTION_PATH);
  if (!fs.existsSync(home) || !fs.statSync(home).isDirectory()) fail('REVIEW_COLLECTION_MISSING');
  assertWithin(root, fs.realpathSync(home));
  const lock = path.join(home, 'state', 'collection.lock');
  let fd;
  try { fd = fs.openSync(lock, 'wx'); }
  catch (error) { if (error.code === 'EEXIST') fail('LOCK_EXISTS_MANUAL_REVIEW'); throw error; }
  fs.closeSync(fd);
  try {
    const roster = readApprovedRoster(rosterPath);
    const manifest = readManifest(home, roster); // verifies every stored raw SHA
    const {filename, state} = readState(home, roster, start, end);
    if (!fs.existsSync(filename)) fail('REVIEW_CHECKPOINT_MISSING');
    const incomplete = roster.symbols.filter(symbol => !state.symbols[symbol].complete);
    const firstIncompleteSymbol = incomplete[0] ?? null;
    for (const symbol of roster.symbols) {
      const progress = state.symbols[symbol];
      if (!Array.isArray(progress.files) ||
          (progress.complete && !progress.files.length && !progress.noBars)) fail('CHECKPOINT_RAW_IDENTITY');
      for (const entry of progress.files) {
        if (!entry.path.startsWith('raw/' + symbol + '_') ||
            !manifest.files.some(item => item.path === entry.path && item.sha256 === entry.sha256))
          fail('CHECKPOINT_MANIFEST_MISMATCH');
        validateRaw(home, entry);
      }
    }
    if (state.failedAt !== expected.failedAt || state.reason !== expected.failedReason ||
        firstIncompleteSymbol !== expected.firstIncompleteSymbol ||
        roster.symbols.length - incomplete.length !== expected.completedSymbols ||
        manifest.files.length !== expected.manifestRawFileCount ||
        state.symbols[firstIncompleteSymbol].pages !== 0 ||
        state.symbols[firstIncompleteSymbol].files.length !== 0 ||
        state.symbols[firstIncompleteSymbol].cursor !== null)
      fail('REVIEW_EVIDENCE_CHANGED_NO_WRITE');
    const review = {at: now(), action: 'ONE_TIME_REARM_AFTER_CONFIRMED_RESPONSE_BODY_TIMEOUT',
      failedAt: state.failedAt, priorReason: state.reason, symbol: firstIncompleteSymbol,
      reviewedManifestFiles: manifest.files.length};
    state.manualReviews = [...(Array.isArray(state.manualReviews) ? state.manualReviews : []), review];
    delete state.failedAt;
    delete state.reason;
    writeAtomic(filename, state);
    return {contract: 'THEME_NINE_R23_ONE_TIME_TIMEOUT_REVIEW', status: 'CHECKPOINT_REARMED_ONCE',
      firstIncompleteSymbol, completedSymbols: expected.completedSymbols,
      preservedRawFiles: manifest.files.length, providerCalls: 0, d1Writes: 0,
      publicationWrites: 0, schedulerWrites: 0,
      nextStep: 'RUN_BOUNDED_AUTO_COLLECTION_NO_AUTO_RETRY_AFTER_STOP'};
  } finally { fs.unlinkSync(lock); }
}

// Reuse the unchanged four-request collector in bounded, paced batches.
// There are no implicit retries: any STOP status ends the automatic session.
export async function collectApprovedNineAuto(options, {collectImpl = collectApprovedNine,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), onBatch = () => {},
  maxBatches = AUTO_MAX_BATCHES, pauseMs = AUTO_PAUSE_MS} = {}) {
  if (!Number.isInteger(maxBatches) || maxBatches < 1 || maxBatches > AUTO_MAX_BATCHES ||
      !Number.isInteger(pauseMs) || pauseMs < 0 || pauseMs > AUTO_PAUSE_MS) fail('AUTO_LIMITS');
  const summary = {contract: 'THEME_NINE_R23_AUTO_COLLECTION_V1',
    mode: 'BOUNDED_FREE_1H_GET_BATCHES', branch: 'codex/theme-fear-greed-integration-20261025',
    batchRequestLimit: MAX_REQUESTS, pauseBetweenBatchesMs: pauseMs,
    maxBatches, batchesExecuted: 0, totalProviderCalls: 0, totalRawFilesStored: 0,
    d1Writes: 0, schedulerWrites: 0, publicationWrites: 0};
  for (let batch = 1; batch <= maxBatches; batch++) {
    const report = await collectImpl({...options, maxRequests: MAX_REQUESTS});
    if (!report || !Number.isInteger(report.providerCalls) || report.providerCalls < 0 ||
        report.providerCalls > MAX_REQUESTS || !Number.isInteger(report.rawFilesStored) ||
        report.rawFilesStored < 0) fail('AUTO_INVALID_BATCH_REPORT');
    summary.batchesExecuted = batch;
    summary.totalProviderCalls += report.providerCalls;
    summary.totalRawFilesStored += report.rawFilesStored;
    summary.completedSymbols = report.completedSymbols ?? null;
    summary.pendingSymbols = report.pendingSymbols ?? null;
    summary.status = report.status;
    if (report.failedReason) summary.failedReason = report.failedReason;
    onBatch({event: 'AUTO_BATCH', batch, providerCalls: report.providerCalls,
      rawFilesStored: report.rawFilesStored, completedSymbols: summary.completedSymbols,
      pendingSymbols: summary.pendingSymbols, status: report.status});
    if (report.status === 'PRIVATE_RAW_COLLECTION_COMPLETE' ||
        report.status === 'PRIVATE_RAW_COMPLETE_WITH_MISSING_SYMBOLS' ||
        report.status?.startsWith('STOP')) return summary;
    if (report.status !== 'CHECKPOINT_READY_TO_RESUME' || report.providerCalls === 0) {
      summary.status = 'STOP_AUTO_UNEXPECTED_NO_PROGRESS';
      return summary;
    }
    if (batch < maxBatches) await sleep(pauseMs);
  }
  summary.status = 'AUTO_BATCH_CAP_REACHED_RESUMABLE';
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, start, end, extra] = process.argv.slice(2);
  try {
    if (extra || !['--inspect', '--inspect-failure', '--collect', '--collect-auto',
      '--resume-reviewed-timeout'].includes(mode)) fail('USAGE_EXPECTED_INSPECT_OR_COLLECT');
    if (mode !== '--inspect' && (!start || !end)) fail('EXPLICIT_DATE_RANGE_REQUIRED');
    const options = {dataRoot: process.env.ZGMINI_DATA_ROOT || DEFAULT_DATA,
      rosterPath: process.env.ZGMINI_R23_ROSTER_PATH || DEFAULT_ROSTER,
      start: start || undefined, end: end || undefined};
    const report = mode === '--collect' ? await collectApprovedNine(options) :
      mode === '--collect-auto' ? await collectApprovedNineAuto(options, {
        onBatch: batch => process.stdout.write(JSON.stringify(batch) + '\n')}) :
      mode === '--resume-reviewed-timeout' ? resumeReviewedTimeout(options) :
      mode === '--inspect-failure' ? inspectCollectionFailure(options) : inspectApprovedNine(options);
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (report.status?.startsWith('STOP')) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(JSON.stringify({status: 'STOP', error: error.code || 'R23_EXECUTION_ERROR'}) + '\n');
    process.exitCode = 1;
  }
}
