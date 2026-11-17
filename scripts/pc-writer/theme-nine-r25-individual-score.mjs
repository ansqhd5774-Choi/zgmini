// R25 / R22 stage 3: SHA-verified, local-only individual ETF scoring.
// The exact approved R2 function and proxy selector are bundled by the R25 CMD builder.
// Never writes into the R23 data root, D1, scheduler, publication, or registry.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditNineR24} from './theme-nine-r24-session-audit.mjs';
import {scoreAdaptiveTimeline} from './theme-optional-adaptive-r2.mjs';
import {selectRealHourlySessions} from './theme-nine-r25-approved-selector.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA = 'E:/ZGmini/data';
const DEFAULT_ROSTER = path.resolve(HERE, '../../config/theme-nine-r20-approved-candidates.json');
const RAW_SUBDIR = 'themes/legacy-nine-r23';
const WINDOW = 252;
const MIN_REAL_SESSIONS = 40;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => {throw Object.assign(new Error('THEME_NINE_R25_' + code), {code: 'THEME_NINE_R25_' + code});};

function approvedSymbols(parsed) {
  const names = [...new Set(parsed.groups.flatMap(group => group.tickers.map(item => item.ticker)))].sort();
  if (names.length !== 63 || names.includes('SPY')) fail('ROSTER_SYMBOLS');
  return names;
}

// A further SHA check after the approved R24 manifest, page ordering and checkpoint audit.
function readVerifiedHourly(home, manifest, symbols) {
  const expected = new Set([...symbols, 'SPY']);
  const all = new Map([...expected].map(symbol => [symbol, []]));
  const last = new Map();
  for (const entry of manifest.files) {
    if (!expected.has(entry.symbol) ||
      !/^raw\/[A-Z][A-Z0-9.]{0,11}_[a-f0-9]{64}\.jsonl$/.test(entry.path) ||
      entry.path !== 'raw/' + entry.symbol + '_' + entry.sha256 + '.jsonl') fail('RAW_ENTRY');
    const filename = path.join(home, ...entry.path.split('/'));
    const canonical = fs.realpathSync(filename);
    if (!canonical.startsWith(home + path.sep)) fail('RAW_PATH_ESCAPE');
    const bytes = fs.readFileSync(canonical);
    if (sha256(bytes) !== entry.sha256) fail('RAW_HASH_CHANGED_AFTER_R24');
    for (const line of bytes.toString('utf8').split(/\r?\n/).filter(Boolean)) {
      const row = JSON.parse(line);
      if (row.symbol !== entry.symbol || typeof row.timestamp !== 'string' ||
        (last.get(entry.symbol) && row.timestamp <= last.get(entry.symbol)))
        fail('RAW_ORDER_CHANGED_AFTER_R24');
      last.set(entry.symbol, row.timestamp);
      if (row.is_gap === true) continue;
      if (!Number.isFinite(row.close) || row.close <= 0) fail('RAW_CLOSE_INVALID');
      all.get(entry.symbol).push({timestamp: row.timestamp, close: row.close});
    }
  }
  return all;
}

// Pure timeline calculation: each null represents a missing *actual* proxy-close,
// never a fabricated price. The scorer is the imported, approved R2 source.
export function scoreOneR25({symbol, spySessions, ownSessions, scoring = scoreAdaptiveTimeline}) {
  if (symbol === 'SPY' || !Array.isArray(spySessions) || !Array.isArray(ownSessions)) fail('SCORE_INPUT');
  const ownByDate = new Map(ownSessions.map(row => [row.date, row.close]));
  const benchmarkDates = new Set(spySessions.map(row => row.date));
  if (ownSessions.some(row => !benchmarkDates.has(row.date))) fail('NON_SPY_DATE');
  let seen = 0;
  const observed = spySessions.map(row => {
    if (ownByDate.has(row.date)) seen++;
    return seen;
  });
  const aligned = spySessions.map(row => ({date: row.date,
    own: ownByDate.get(row.date) ?? null, spy: row.close}));
  const scored = scoring(aligned);
  if (scored.length !== aligned.length) fail('SCORER_LENGTH');
  const start = Math.max(0, spySessions.length - WINDOW);
  const history = scored.slice(start).map((row, j) => {
    const i = start + j, real = aligned[i].own !== null;
    const eligible = observed[i] >= MIN_REAL_SESSIONS;
    if (row.date !== aligned[i].date) fail('SCORER_DATE');
    const valid = real && eligible && Number.isFinite(row.score);
    if (Number.isFinite(row.score) && (row.score < 0 || row.score > 100)) fail('SCORE_RANGE');
    return {date: row.date, score: valid ? row.score : null,
      status: !real ? 'NO_REAL_CLOSE' : !eligible ? 'BELOW_40_REAL_SESSIONS' :
        valid ? row.status : 'INSUFFICIENT_REAL_OBSERVATIONS',
      realSessionCount: observed[i],
      activeMetrics: valid ? row.activeMetrics : null,
      samples: valid ? row.samples : null};
  });
  const withScores = history.filter(row => row.score !== null);
  const latest = history.at(-1);
  const lastScored = withScores.at(-1);
  return {symbol, realHourlyBars: null, realProxySessions: ownSessions.length,
    latest252RealProxySessions: history.filter(row =>
      ownByDate.has(row.date)).length,
    observed40SessionsReached: seen >= MIN_REAL_SESSIONS,
    latest252ScoredSessions: withScores.length,
    latest252MissingScores: history.length - withScores.length,
    latestBenchmarkDate: latest?.date ?? null,
    latestScore: latest?.score ?? null,
    latestStatus: latest?.status ?? 'NO_SPY_SESSIONS',
    lastScoredDate: lastScored?.date ?? null,
    lastScoredValue: lastScored?.score ?? null,
    lastScoredStatus: lastScored?.status ?? null,
    history};
}

export function calculateNineR25({dataRoot = DEFAULT_DATA, rosterPath = DEFAULT_ROSTER,
  start = '2023-01-01', end = '2026-10-26'} = {}) {
  const audit = auditNineR24({dataRoot, rosterPath, start, end});
  if (audit.status !== 'AUDIT_READ_ONLY_COMPLETE' || audit.spyLast252Sessions !== WINDOW ||
    audit.roster.uniqueETFs !== 63 || audit.roster.totalSymbolsIncludingSPY !== 64 ||
    audit.symbolsWithValidDatesOutsideSPY.length) fail('R24_AUDIT_NOT_READY');
  const rosterBytes = fs.readFileSync(rosterPath);
  if (sha256(rosterBytes) !== audit.roster.sha256) fail('ROSTER_SHA_CHANGED');
  const symbols = approvedSymbols(JSON.parse(rosterBytes));
  const home = fs.realpathSync(path.join(dataRoot, RAW_SUBDIR));
  const manifestBytes = fs.readFileSync(path.join(home, 'raw-manifest.json'));
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const hours = readVerifiedHourly(home, manifest, symbols);
  const sessions = new Map([...hours].map(([symbol, rows]) =>
    [symbol, selectRealHourlySessions(rows)]));
  const spySessions = sessions.get('SPY');
  if (spySessions.length < WINDOW) fail('INSUFFICIENT_SPY_PROXY_DAYS');
  const allDates = new Set(spySessions.map(row => row.date));
  const summaries = symbols.map(symbol => {
    const etfSessions = sessions.get(symbol);
    if (etfSessions.some(row => !allDates.has(row.date))) fail('ETF_DATE_NOT_IN_SPY');
    const result = scoreOneR25({symbol, spySessions, ownSessions: etfSessions});
    result.realHourlyBars = hours.get(symbol).length;
    return result;
  });
  const individual = Object.fromEntries(summaries.map(entry => [entry.symbol, entry]));
  const lastSpyDate = spySessions.at(-1).date;
  const output = {contract: 'THEME_NINE_R25_PRIVATE_INDIVIDUAL_ETF_R2_V1',
    status: 'PRIVATE_STAGE3_CALCULATED_NOT_PUBLISHED',
    branch: 'codex/theme-fear-greed-integration-20261025',
    approvedFormula: 'EXACT_EXISTING_THEME_OPTIONAL_ADAPTIVE_R2_T40_R20_V40',
    priceSelector: 'EXACT_EXISTING_SPACE_SATELLITE_R2_NY_15_EARLY_CLOSE_12',
    priceMode: 'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
    publicationAuthorized: false, candidateRosterUnchanged: true,
    dataRootWriteCount: 0, providerCalls: 0, d1Writes: 0,
    schedulerWrites: 0, publicationWrites: 0,
    source: {manifestSha256: sha256(manifestBytes),
      rosterSha256: audit.roster.sha256, manifestRawPages: manifest.files.length,
      spyProxySessions: spySessions.length, latest252SpySessions: WINDOW,
      latestSpySessionDate: lastSpyDate},
    counts: {themes: audit.roster.themes, approvedETFPositions: audit.roster.positions,
      uniqueApprovedETFs: symbols.length,
      withAny252Score: summaries.filter(v => v.latest252ScoredSessions > 0).length,
      withCurrentDateScore: summaries.filter(v => v.latestScore !== null).length,
      below40RealSessions: summaries.filter(v => !v.observed40SessionsReached)
        .map(v => v.symbol),
      withMissing252ProxyDates: summaries.filter(v => v.latest252RealProxySessions < WINDOW).length},
    latest252TradingDates: spySessions.slice(-WINDOW).map(row => row.date),
    individual};
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, start, end, extra] = process.argv.slice(2);
    if (mode !== '--private-score' || extra || !start || !end) fail('USAGE');
    const result = calculateNineR25({
      dataRoot: process.env.ZGMINI_DATA_ROOT || DEFAULT_DATA,
      rosterPath: process.env.ZGMINI_R25_ROSTER_PATH || DEFAULT_ROSTER, start, end});
    const resultPath = process.env.ZGMINI_R25_JSON_RESULT;
    if (!resultPath || !path.isAbsolute(resultPath)) fail('RESULT_PATH_REQUIRED');
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
    process.stdout.write(JSON.stringify({contract: result.contract, status: result.status,
      source: result.source, counts: result.counts,
      individualSummary: Object.values(result.individual).map(v => ({symbol: v.symbol,
        realHourlyBars: v.realHourlyBars, realProxySessions: v.realProxySessions,
        latest252RealProxySessions: v.latest252RealProxySessions,
        observed40SessionsReached: v.observed40SessionsReached,
        latest252ScoredSessions: v.latest252ScoredSessions,
        latest252MissingScores: v.latest252MissingScores,
        latestScore: v.latestScore, latestStatus: v.latestStatus,
        lastScoredDate: v.lastScoredDate, lastScoredValue: v.lastScoredValue,
        lastScoredStatus: v.lastScoredStatus})),
      resultJSON: path.basename(resultPath),
      providerCalls: 0, rawWrites: 0, dataRootWrites: 0, d1Writes: 0,
      publicationWrites: 0, schedulerWrites: 0}, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(JSON.stringify({status: 'STOP_R25_PRIVATE_SCORE',
      error: error.code || 'UNEXPECTED_SCORE_FAILURE',
      message: error.code ? undefined : error.message}) + '\n');
    process.exitCode = 1;
  }
}
