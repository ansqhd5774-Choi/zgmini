// R24 / R22 stage 2: read-only audit of the approved R23 private 1h raw history.
// This module makes no network requests and does not create or modify data files.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROSTER = path.resolve(HERE, '../../config/theme-nine-r20-approved-candidates.json');
const DEFAULT_DATA = 'E:/ZGmini/data';
const RAW_SUBDIR = 'themes/legacy-nine-r23';
const EXPECTED_PRICE_MODE = 'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const EXPECTED_SCHEMA = 'GMH_1H_OHLCV_NDJSON_R23';
const EXPECTED_SOURCE = 'https://getmarkethistory.com';
const AUDIT_WINDOW = 252;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const dateOK = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value + 'T00:00:00Z')) &&
  new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const ny = new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York',
  year: 'numeric', month: '2-digit', day: '2-digit'});
function nyDay(timestamp) {
  const parts = Object.fromEntries(ny.formatToParts(new Date(timestamp))
    .filter(item => item.type !== 'literal').map(item => [item.type, item.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function fail(code) {
  throw Object.assign(new Error('THEME_NINE_R24_' + code), {code: 'THEME_NINE_R24_' + code});
}

function loadRoster(rosterPath) {
  const bytes = fs.readFileSync(rosterPath);
  const parsed = JSON.parse(bytes.toString('utf8'));
  if (parsed.schema !== 'zgmini.theme-nine.r20-approved-three-gate-candidates.v1' ||
      !Array.isArray(parsed.groups) || parsed.groups.length !== parsed.counts?.themes) fail('ROSTER_SCHEMA');
  const positions = parsed.groups.flatMap(group => {
    if (!Array.isArray(group.tickers) || !group.tickers.length) fail('ROSTER_GROUP');
    return group.tickers.map(item => {
      if (item.approvedCandidate !== true || !/^[A-Z][A-Z0-9.]{0,11}$/.test(item.ticker))
        fail('ROSTER_UNAPPROVED_TICKER');
      return item.ticker;
    });
  });
  const unique = [...new Set(positions)];
  if (positions.length !== parsed.counts.positions || unique.length !== parsed.counts.uniqueTickers)
    fail('ROSTER_COUNTS');
  return {sha: sha(bytes), symbols: [...new Set([...unique, 'SPY'])].sort(),
    themes: parsed.groups.length, positions: positions.length, uniqueETFs: unique.length};
}

function jsonFile(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function rawFile(home, entry) {
  if (!entry || typeof entry.path !== 'string' ||
      !/^raw\/[A-Z][A-Z0-9.]{0,11}_[a-f0-9]{64}\.jsonl$/.test(entry.path) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256)) fail('MANIFEST_ENTRY_PATH');
  const file = path.join(home, ...entry.path.split('/'));
  const canonical = fs.realpathSync(file);
  if (!canonical.startsWith(home + path.sep) || !fs.statSync(canonical).isFile())
    fail('RAW_PATH_OUTSIDE_COLLECTION');
  const bytes = fs.readFileSync(canonical);
  if (sha(bytes) !== entry.sha256) fail('RAW_SHA_MISMATCH');
  return bytes;
}

function validateRows(buffer, symbol, state) {
  const lines = buffer.toString('utf8').split(/\r?\n/).filter(Boolean);
  if (lines.length > 5000) fail('TOO_MANY_ROWS_IN_PAGE');
  let valid = 0, gaps = 0, firstTimestamp = null;
  for (const line of lines) {
    let row;
    try { row = JSON.parse(line); }
    catch { fail('RAW_INVALID_JSONL'); }
    const timestamp = row?.timestamp;
    if (row?.symbol !== symbol || typeof timestamp !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(timestamp) ||
        Number.isNaN(Date.parse(timestamp)) || (state.lastTimestamp && timestamp <= state.lastTimestamp))
      fail('RAW_TIME_OR_SYMBOL_IDENTITY');
    if (firstTimestamp === null) firstTimestamp = timestamp;
    state.lastTimestamp = timestamp;
    const day = nyDay(timestamp);
    if (row.is_gap === true) { gaps++; state.gapDays.add(day); continue; }
    if (['open', 'high', 'low', 'close'].some(key => !Number.isFinite(row[key]) || row[key] <= 0) ||
        row.high < row.low || row.open < row.low || row.open > row.high ||
        row.close < row.low || row.close > row.high ||
        !Number.isFinite(row.volume) || row.volume < 0) fail('RAW_INVALID_OHLCV');
    valid++;
    state.sessions.add(day);
    state.nonGapBars++;
  }
  return {rows: lines.length, valid, gaps, firstTimestamp, lastTimestamp: state.lastTimestamp};
}

export function auditNineR24({dataRoot = DEFAULT_DATA, rosterPath = DEFAULT_ROSTER,
  start = '2023-01-01', end = '2026-10-26'} = {}) {
  if (!dateOK(start) || !dateOK(end) || start > end) fail('WINDOW');
  const roster = loadRoster(rosterPath);
  const home = path.join(dataRoot, RAW_SUBDIR);
  if (!fs.existsSync(home)) fail('R23_DATA_MISSING');
  const resolvedHome = fs.realpathSync(home);
  const manifest = jsonFile(path.join(resolvedHome, 'raw-manifest.json'));
  if (manifest.version !== 1 || manifest.project !== 'legacy-nine-r23' ||
      manifest.rosterSha256 !== roster.sha || manifest.source !== EXPECTED_SOURCE ||
      manifest.licenseStatus !== 'PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED' ||
      !Array.isArray(manifest.files)) fail('MANIFEST_IDENTITY');
  const key = sha(JSON.stringify({roster: roster.sha, start, end})).slice(0, 20);
  const checkpoint = jsonFile(path.join(resolvedHome, 'state', 'collection-' + key + '.json'));
  if (checkpoint.version !== 1 || checkpoint.rosterSha256 !== roster.sha ||
      checkpoint.start !== start || checkpoint.end !== end || checkpoint.failedAt ||
      Object.keys(checkpoint.symbols || {}).length !== roster.symbols.length ||
      roster.symbols.some(symbol => checkpoint.symbols[symbol]?.complete !== true))
    fail('CHECKPOINT_NOT_COMPLETE');
  const uniquePaths = new Set();
  const manifestByPath = new Map(manifest.files.map(entry => [entry.path, entry]));
  const data = new Map(roster.symbols.map(symbol => [symbol,
    {sessions: new Set(), gapDays: new Set(), nonGapBars: 0, lastTimestamp: null,
      files: 0, rows: 0, gaps: 0, priceModes: new Set()}]));
  for (const entry of manifest.files) {
    if (!data.has(entry.symbol) || uniquePaths.has(entry.path) ||
        entry.source !== EXPECTED_SOURCE || entry.priceMode !== EXPECTED_PRICE_MODE ||
        entry.schemaVersion !== EXPECTED_SCHEMA) fail('MANIFEST_ENTRY_IDENTITY');
    let request;
    try { request = new URL(entry.requestedUrl); }
    catch { fail('MANIFEST_REQUEST_URL'); }
    if (request.origin !== EXPECTED_SOURCE ||
        request.pathname !== `/api/v1/bars/stocks/${entry.symbol}/1h` ||
        request.searchParams.get('start') !== start || request.searchParams.get('end') !== end ||
        request.searchParams.get('format') !== 'jsonl' ||
        request.searchParams.get('limit') !== '5000') fail('MANIFEST_SOURCE_WINDOW');
    uniquePaths.add(entry.path);
    const fileBytes = rawFile(resolvedHome, entry);
    const state = data.get(entry.symbol);
    const firstBefore = state.lastTimestamp;
    const page = validateRows(fileBytes, entry.symbol, state);
    if (entry.rows !== page.rows || entry.nonGapRows !== page.valid || entry.gapRows !== page.gaps ||
        entry.firstTimestampUTC !== page.firstTimestamp || entry.lastTimestampUTC !== page.lastTimestamp ||
        (firstBefore && page.firstTimestamp <= firstBefore)) fail('MANIFEST_PAGE_METADATA_MISMATCH');
    state.files++;
    state.rows += page.rows;
    state.gaps += page.gaps;
    state.priceModes.add(entry.priceMode);
  }
  for (const symbol of roster.symbols) {
    const progress = checkpoint.symbols[symbol];
    const state = data.get(symbol);
    if (!Array.isArray(progress.files) || progress.files.length !== state.files ||
        progress.files.some(entry => !uniquePaths.has(entry.path) ||
          manifestByPath.get(entry.path)?.sha256 !== entry.sha256) ||
        progress.lastTimestamp !== state.lastTimestamp ||
        (state.files === 0 && !progress.noBars)) fail('CHECKPOINT_PAGE_COUNT_MISMATCH');
  }
  const spyDays = [...data.get('SPY').sessions].sort();
  const latest252 = spyDays.slice(-AUDIT_WINDOW);
  const spySet = new Set(latest252);
  const etfs = roster.symbols.map(symbol => {
    const state = data.get(symbol);
    const days = [...state.sessions].sort();
    const observedInSpyWindow = days.filter(day => spySet.has(day));
    const allSPY = new Set(spyDays);
    const extraDays = days.filter(day => !allSPY.has(day));
    const missingSpyDates = latest252.filter(day => !state.sessions.has(day));
    return {symbol, rawPages: state.files, rawRows: state.rows, nonGapBars: state.nonGapBars,
      gapBars: state.gaps, uniqueValidSessions: days.length,
      firstObservedNY: days[0] || null, lastObservedNY: days.at(-1) || null,
      latestSpyWindowSessions: observedInSpyWindow.length,
      missingSpySessions: missingSpyDates.length,
      missingSpySampleLast5: missingSpyDates.slice(-5),
      validDatesOutsideSPY: extraDays.length, outsideSPYSampleLast5: extraDays.slice(-5),
      observedGapDays: state.gapDays.size,
      priceMode: state.priceModes.size ? [...state.priceModes][0] : null,
      note: days.length < 40 ? 'HISTORY_SHORTER_THAN_40_SESSIONS_NOT_DISQUALIFIED' :
        latest252.length < AUDIT_WINDOW ? 'SPY_BASELINE_SHORTER_THAN_252' :
        missingSpyDates.length ? 'HAS_MISSING_SESSIONS_NOT_FILLED' : 'FULL_252_SPY_SESSIONS'};
  });
  const outsideSpy = etfs.filter(item => item.validDatesOutsideSPY).map(item => item.symbol);
  const missing = etfs.filter(item => item.missingSpySessions).map(item => item.symbol);
  return {contract: 'THEME_NINE_R24_READ_ONLY_SESSIONS_V1',
    status: spyDays.length ? 'AUDIT_READ_ONLY_COMPLETE' : 'STOP_NO_SPY_VALID_SESSIONS',
    mode: 'NO_NETWORK_NO_DATA_WRITE', collectionWindow: {start, end},
    roster: {themes: roster.themes, positions: roster.positions, uniqueETFs: roster.uniqueETFs,
      totalSymbolsIncludingSPY: roster.symbols.length, sha256: roster.sha},
    source: EXPECTED_SOURCE, priceMode: EXPECTED_PRICE_MODE,
    manifestRawPages: manifest.files.length,
    spySessionsTotal: spyDays.length, spyLast252Sessions: latest252.length,
    spyFirstObservedNY: spyDays[0] || null, spyLastObservedNY: spyDays.at(-1) || null,
    symbolsWithMissingSPYSessions: missing,
    symbolsWithValidDatesOutsideSPY: outsideSpy,
    symbolsBelow40Sessions: etfs.filter(item => item.uniqueValidSessions < 40).map(item => item.symbol),
    perSymbol: etfs, providerCalls: 0, rawWrites: 0, d1Writes: 0,
    publicationWrites: 0, schedulerWrites: 0};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, start, end, extra] = process.argv.slice(2);
    if (mode !== '--audit' || extra || !start || !end) fail('USAGE');
    const report = auditNineR24({dataRoot: process.env.ZGMINI_DATA_ROOT || DEFAULT_DATA,
      rosterPath: process.env.ZGMINI_R24_ROSTER_PATH || DEFAULT_ROSTER, start, end});
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (report.status.startsWith('STOP')) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(JSON.stringify({status: 'STOP_R24_AUDIT',
      error: error.code || 'UNEXPECTED_AUDIT_FAILURE'}) + '\n');
    process.exitCode = 1;
  }
}
