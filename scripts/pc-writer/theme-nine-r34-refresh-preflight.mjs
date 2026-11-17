// R34: read-only inventory of the immutable R23 history before incremental refresh.
// Never calls a provider, changes a checkpoint, installs a task or publishes data.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const sha = value => createHash('sha256').update(value).digest('hex');
const fail = code => { throw Object.assign(new Error('THEME_NINE_R34_' + code), {code: 'THEME_NINE_R34_' + code}); };
const BASE_START = '2023-01-01';
const BASE_END = '2026-10-26';
const SOURCE = 'https://getmarkethistory.com';
const PRICE_MODE = 'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const RAW_ROOT = 'themes/legacy-nine-r23';

function json(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function within(root, file) {
  const rel = path.relative(root, file);
  return rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}

export function auditNineR34RefreshPreflight({dataRoot, rosterPath} = {}) {
  if (!dataRoot || !rosterPath || !fs.existsSync(dataRoot)) fail('DATA_ROOT_MISSING');
  const rosterBytes = fs.readFileSync(rosterPath);
  const roster = JSON.parse(rosterBytes.toString('utf8'));
  if (roster.schema !== 'zgmini.theme-nine.r20-approved-three-gate-candidates.v1' ||
      roster.counts?.themes !== 9 || roster.counts?.positions !== 64 ||
      roster.counts?.uniqueTickers !== 63 || !Array.isArray(roster.groups)) fail('ROSTER_INVALID');
  const positions = roster.groups.flatMap(g => {
    if (!Array.isArray(g.tickers)) fail('ROSTER_INVALID');
    return g.tickers.map(t => {
      if (!t.approvedCandidate || !/^[A-Z][A-Z0-9.]{0,11}$/.test(t.ticker)) fail('ROSTER_INVALID');
      return t.ticker;
    });
  });
  const symbols = [...new Set([...positions, 'SPY'])].sort();
  if (positions.length !== 64 || symbols.length !== 64) fail('ROSTER_INVALID');
  const rosterHash = sha(rosterBytes);
  const home = path.join(dataRoot, RAW_ROOT);
  if (!fs.existsSync(home)) fail('R23_COLLECTION_MISSING');
  const resolved = fs.realpathSync(home);
  const manifest = json(path.join(resolved, 'raw-manifest.json'));
  if (manifest.version !== 1 || manifest.project !== 'legacy-nine-r23' ||
      manifest.rosterSha256 !== rosterHash || manifest.source !== SOURCE ||
      manifest.licenseStatus !== 'PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED' ||
      !Array.isArray(manifest.files)) fail('MANIFEST_IDENTITY');
  const key = sha(JSON.stringify({roster: rosterHash, start: BASE_START, end: BASE_END})).slice(0, 20);
  const cp = json(path.join(resolved, 'state', 'collection-' + key + '.json'));
  if (cp.version !== 1 || cp.project !== 'legacy-nine-r23' ||
      cp.rosterSha256 !== rosterHash || cp.start !== BASE_START || cp.end !== BASE_END ||
      cp.failedAt || Object.keys(cp.symbols || {}).length !== 64 ||
      symbols.some(s => cp.symbols[s]?.complete !== true)) fail('BASE_CHECKPOINT_INCOMPLETE');

  const indexed = new Map();
  const bySymbol = new Map(symbols.map(s => [s, []]));
  for (const entry of manifest.files) {
    if (!symbols.includes(entry.symbol) ||
        typeof entry.path !== 'string' ||
        !/^raw\/[A-Z][A-Z0-9.]{0,11}_[a-f0-9]{64}\.jsonl$/.test(entry.path) ||
        !entry.path.startsWith('raw/' + entry.symbol + '_') ||
        !/^[a-f0-9]{64}$/.test(entry.sha256) ||
        indexed.has(entry.path) || entry.source !== SOURCE ||
        entry.priceMode !== PRICE_MODE || entry.schemaVersion !== 'GMH_1H_OHLCV_NDJSON_R23') fail('RAW_MANIFEST_ENTRY_INVALID');
    let url;
    try { url = new URL(entry.requestedUrl); }
    catch { fail('RAW_SOURCE_URL_INVALID'); }
    if (url.origin !== SOURCE || url.pathname !== `/api/v1/bars/stocks/${entry.symbol}/1h` ||
        url.searchParams.get('start') !== BASE_START || url.searchParams.get('end') !== BASE_END ||
        url.searchParams.get('format') !== 'jsonl') fail('RAW_SOURCE_WINDOW_MISMATCH');
    const real = fs.realpathSync(path.join(resolved, ...entry.path.split('/')));
    if (!within(resolved, real) || !fs.statSync(real).isFile()) fail('RAW_PATH_INVALID');
    if (sha(fs.readFileSync(real)) !== entry.sha256) fail('RAW_SHA_MISMATCH');
    if (typeof entry.lastTimestampUTC !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T/.test(entry.lastTimestampUTC)) fail('RAW_OBSERVATION_INVALID');
    indexed.set(entry.path, entry);
    bySymbol.get(entry.symbol).push(entry);
  }
  for (const symbol of symbols) {
    const state = cp.symbols[symbol];
    const pages = bySymbol.get(symbol);
    if (!Array.isArray(state.files) || state.files.length !== pages.length ||
        state.files.some(f => indexed.get(f.path)?.sha256 !== f.sha256 ||
          indexed.get(f.path)?.symbol !== symbol) ||
        (pages.length && state.lastTimestamp !== pages.at(-1).lastTimestampUTC) ||
        (!pages.length && !state.noBars)) fail('BASE_PAGE_CHECKPOINT_MISMATCH');
  }
  const spy = bySymbol.get('SPY');
  const latestSpyTimestampUTC = spy.at(-1)?.lastTimestampUTC ?? null;
  if (!latestSpyTimestampUTC) fail('SPY_BASELINE_MISSING');
  const ny = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit'});
  const parts = Object.fromEntries(ny.formatToParts(new Date(latestSpyTimestampUTC))
    .filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  const latestSpyNYDay = `${parts.year}-${parts.month}-${parts.day}`;
  if (latestSpyNYDay > BASE_END) fail('SPY_AFTER_COLLECTION_WINDOW');

  return {
    contract: 'THEME_NINE_R34_REFRESH_PREFLIGHT_READONLY_V1',
    status: 'R23_BASE_IMMUTABLE_VERIFIED_DELTA_NOT_COLLECTED',
    baselineWindow: {start: BASE_START, end: BASE_END},
    rosterSha256: rosterHash, verifiedRawPages: indexed.size,
    completedSymbols: symbols.length, symbolsWithoutRawPages: symbols.filter(s => !bySymbol.get(s).length),
    latestSpyTimestampUTC, latestSpyNYDay,
    suggestedOverlapStartNYDay: latestSpyNYDay,
    designOnly: 'SEPARATE_R34_DELTA_ROOT_THEN_READONLY_MERGE_WITH_IMMUTABLE_R23',
    latestNewObservation: null, providerCalls: 0, rawWrites: 0,
    dbWrites: 0, d1Writes: 0, schedulerWrites: 0, publicationWrites: 0
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3 || process.argv[2] !== '--inspect') fail('USAGE');
    const home = process.env.R34_FOLDER;
    const target = process.env.R34_JSON_RESULT;
    if (!home || !target || path.dirname(path.resolve(target)) !== path.resolve(home) ||
        !/^THEME_NINE_R34_REFRESH_PREFLIGHT_[0-9]+_[0-9]+\.json$/i.test(path.basename(target)) ||
        fs.existsSync(target)) fail('RESULT_PATH_INVALID');
    const result = auditNineR34RefreshPreflight({
      dataRoot: process.env.ZGMINI_DATA_ROOT || 'E:/ZGmini/data',
      rosterPath: path.join(path.dirname(fileURLToPath(import.meta.url)), 'theme-nine-r20-approved-candidates.json')});
    fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
    process.stdout.write(JSON.stringify({status: result.status, verifiedRawPages: result.verifiedRawPages,
      completedSymbols: result.completedSymbols, latestSpyNYDay: result.latestSpyNYDay,
      suggestedOverlapStartNYDay: result.suggestedOverlapStartNYDay,
      resultFile: path.basename(target), newDataCollected: false,
      providerCalls: 0, dbWrites: 0, schedulerWrites: 0, publicationWrites: 0}, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(JSON.stringify({status: 'STOP_R34_REFRESH_PREFLIGHT',
      error: error.code || 'UNEXPECTED_ERROR', message: error.code ? undefined : error.message}) + '\n');
    process.exitCode = 1;
  }
}
