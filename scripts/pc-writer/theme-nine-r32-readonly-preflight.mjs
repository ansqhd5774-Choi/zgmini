// R22 stage 5 preflight. NO score aggregation, AUM normalization, provider calls,
// publication or writes to existing source data. Only print an audit report.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const evidencePath = name => {
  const bundled = path.join(HERE, name);
  return fs.existsSync(bundled) ? bundled : path.resolve(HERE, '../../config', name);
};
const ROSTER_FILE = evidencePath('theme-nine-r20-approved-candidates.json');
const AUM_FILE = evidencePath('theme-nine-r26-official-aum-evidence.json');
const CONTRACT = 'THEME_NINE_R25_PRIVATE_INDIVIDUAL_ETF_R2_V1';
const EXPECTED_ROSTER_SHA = 'e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c';
const EXPECTED_RAW_MANIFEST_SHA = '8c6aa292da35310ce37093b73a331177582fb741d16d8a6423bee7413ddbcdb5';
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const fail = code => {throw Object.assign(new Error(code), {code});};
const sha = b => createHash('sha256').update(b).digest('hex');
const validDate = d => typeof d === 'string' && ISO.test(d) &&
  Number.isFinite(Date.parse(d + 'T00:00:00Z')) &&
  new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;

const readJSON = filename => {
  const size = fs.statSync(filename).size;
  if (size <= 0 || size > 30 * 1024 * 1024) fail('JSON_SIZE_INVALID');
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
};
function exactlySameSymbols(actual, expected, code) {
  if (!Array.isArray(actual) || actual.length !== expected.length ||
    new Set(actual).size !== expected.length ||
    expected.some(s => !actual.includes(s))) fail(code);
}
function findR25(directory, explicitPath = '') {
  if (explicitPath) {
    const resolved = path.resolve(explicitPath);
    if (!fs.statSync(resolved).isFile()) fail('R25_NOT_A_FILE');
    return resolved;
  }
  const names = fs.readdirSync(directory)
    .filter(n => /^THEME_NINE_R25_INDIVIDUAL_SCORES_[0-9]+_[0-9]+\.json$/i.test(n));
  if (names.length === 0) fail('R25_JSON_NOT_NEXT_TO_CMD');
  if (names.length !== 1) fail('R25_MULTIPLE_JSON_SELECT_BY_DRAG_DROP');
  return path.join(directory, names[0]);
}

export function inspectNineR32({r25, roster, aum}) {
  if (r25.contract !== CONTRACT || r25.status !== 'PRIVATE_STAGE3_CALCULATED_NOT_PUBLISHED' ||
    r25.publicationAuthorized !== false || r25.candidateRosterUnchanged !== true ||
    r25.priceMode !== 'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE') fail('R25_CONTRACT_CHANGED');
  if (!r25.source || r25.source.rosterSha256 !== EXPECTED_ROSTER_SHA ||
    r25.source.manifestSha256 !== EXPECTED_RAW_MANIFEST_SHA ||
    r25.source.manifestRawPages !== 121 ||
    r25.source.latest252SpySessions !== 252 ||
    r25.source.latestSpySessionDate !== '2026-10-23') fail('R25_SOURCE_MISMATCH');
  const groups = roster.groups;
  if (!Array.isArray(groups) || groups.length !== 9 ||
    groups.reduce((sum, g) => sum + g.tickers.length, 0) !== 64) fail('ROSTER_POSITIONS');
  const approved = [...new Set(groups.flatMap(g => g.tickers.map(t => t.ticker)))].sort();
  if (approved.length !== 63 || approved.includes('SPY')) fail('ROSTER_UNIQUE');
  if (aum.contract !== 'THEME_NINE_R26_OFFICIAL_AUM_RESEARCH_EVIDENCE_V1' ||
    aum.status !== 'RESEARCH_ONLY_NOT_APPROVED_FOR_LIVE_R32_WEIGHTS' ||
    aum.currency !== 'USD' || aum.candidateRosterSha256 !== EXPECTED_ROSTER_SHA ||
    !Array.isArray(aum.rows)) fail('AUM_CONTRACT_CHANGED');
  exactlySameSymbols(aum.rows.map(r => r.ticker), approved, 'AUM_SYMBOLS');
  exactlySameSymbols(Object.keys(r25.individual || {}), approved, 'R25_SYMBOLS');
  if (!Array.isArray(r25.latest252TradingDates) || r25.latest252TradingDates.length !== 252 ||
    new Set(r25.latest252TradingDates).size !== 252 ||
    r25.latest252TradingDates.some((date, i, all) => !validDate(date) ||
      (i && date <= all[i - 1])) ||
    r25.latest252TradingDates.at(-1) !== r25.source.latestSpySessionDate)
    fail('R25_DATES');
  const dates = r25.latest252TradingDates;
  const dateIndex = new Map(dates.map((d, i) => [d, i]));
  const amounts = new Map();
  for (const row of aum.rows) {
    if (!Number.isFinite(row.aumUsd) || row.aumUsd <= 0 ||
      !validDate(row.aumAsOf) || row.aumAsOf > dates.at(-1) ||
      typeof row.issuerUrl !== 'string' || !row.issuerUrl.startsWith('https://') ||
      typeof row.quality !== 'string' || !row.quality.startsWith('OFFICIAL_') ||
      typeof row.amountApproximate !== 'boolean') fail('AUM_VALUE_OR_SOURCE');
    amounts.set(row.ticker, row);
  }
  const presentByDate = Object.fromEntries(dates.map(date => [date, new Set()]));
  for (const symbol of approved) {
    const v = r25.individual[symbol];
    if (!v || v.symbol !== symbol || !Array.isArray(v.history) ||
      v.history.length !== 252) fail('R25_HISTORY_LENGTH');
    const counted = {scores: 0, real: 0};
    for (let i = 0; i < 252; i++) {
      const h = v.history[i];
      if (h.date !== dates[i] || !Number.isInteger(h.realSessionCount) ||
        h.realSessionCount < 0 || typeof h.status !== 'string') fail('R25_ROW_INVALID');
      if (h.status !== 'NO_REAL_CLOSE') counted.real++;
      if (h.score !== null) {
        if (!Number.isFinite(h.score) || h.score < 0 || h.score > 100 ||
          h.realSessionCount < 40 ||
          !['ADAPTIVE_PROVISIONAL', 'R188_COMPATIBLE'].includes(h.status))
          fail('R25_SCORE_CONTRACT');
        presentByDate[dates[i]].add(symbol);
        counted.scores++;
      }
    }
    if (counted.scores !== v.latest252ScoredSessions ||
      252 - counted.scores !== v.latest252MissingScores ||
      v.latestScore !== v.history.at(-1).score) fail('R25_SUMMARY_MISMATCH');
  }
  const currentAum = aum.rows.filter(row => row.aumAsOf === dates.at(-1));
  const earlierAum = aum.rows.filter(row => row.aumAsOf < dates.at(-1));
  const latest = presentByDate[dates.at(-1)];
  const themeCounts = groups.map(g => {
    const sym = g.tickers.map(t => t.ticker);
    const buckets = {none: 0, one: 0, two: 0, threePlus: 0};
    for (const date of dates) {
      const n = sym.filter(s => presentByDate[date].has(s)).length;
      buckets[n === 0 ? 'none' : n === 1 ? 'one' : n === 2 ? 'two' : 'threePlus']++;
    }
    return {
      theme: g.theme, rosterPositions: sym.length,
      latestScoreEligible: sym.filter(s => latest.has(s)).length,
      currentDateAumEvidence: sym.filter(s => amounts.get(s).aumAsOf === dates.at(-1)).length,
      priorDateAumEvidence: sym.filter(s => amounts.get(s).aumAsOf < dates.at(-1))
        .map(s => ({ticker: s, aumAsOf: amounts.get(s).aumAsOf})),
      dateBuckets: buckets
    };
  });
  return {
    contract: 'THEME_NINE_R32_READ_ONLY_PREFLIGHT_V1',
    status: 'PRECHECK_ONLY_NO_AGGREGATE',
    source: {
      r25Contract: r25.contract,
      rawManifestSha256: r25.source.manifestSha256,
      rosterSha256: r25.source.rosterSha256,
      scoreBenchmarkDate: dates.at(-1),
      officialAumResearchDate: aum.asOfResearchDate
    },
    counts: {
      themes: 9, candidatePositions: 64, uniqueETFs: 63, tradingDates: 252,
      latestEligibleScores: latest.size, latestScoreMissing: 63 - latest.size,
      issuerAumSources: aum.rows.length,
      officialAumAsOfBenchmarkDate: currentAum.length,
      earlierDatedOfficialAum: earlierAum.length,
      totalIndividualScoreDates: Object.values(presentByDate)
        .reduce((sum, set) => sum + set.size, 0)
    },
    olderOfficialAum: earlierAum.map(x => ({ticker: x.ticker, asOf: x.aumAsOf, quality: x.quality})),
    themeCounts,
    blockers: [
      '21_OFFICIAL_AUM_VALUES_PREDATE_BENCHMARK_DATE',
      '18_ETFS_MISSING_LATEST_R25_SCORE',
      'DATED_OFFICIAL_AUM_FRESHNESS_RULE_NOT_APPROVED',
      'DO_NOT_CALCULATE_AUM_WEIGHTS_OR_PUBLISH_WITHOUT_REVIEW'
    ],
    providerCalls: 0, dataRootWrites: 0, d1Writes: 0, schedulerWrites: 0,
    publicationWrites: 0, formulaWrites: 0
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, folder, explicitPath, extra] = process.argv.slice(2);
    if (mode !== '--preflight' || !folder || extra) fail('USAGE');
    const rosterBytes = fs.readFileSync(ROSTER_FILE);
    if (sha(rosterBytes) !== EXPECTED_ROSTER_SHA) fail('ROSTER_BYTES_SHA');
    const sourceFile = findR25(path.resolve(folder), explicitPath);
    const result = inspectNineR32({
      r25: readJSON(sourceFile), roster: JSON.parse(rosterBytes),
      aum: readJSON(AUM_FILE)
    });
    process.stdout.write(JSON.stringify({
      ...result,
      inputR25Name: path.basename(sourceFile), inputR25Sha256: sha(fs.readFileSync(sourceFile))
    }, null, 2) + '\n');
  } catch (err) {
    process.stderr.write(JSON.stringify({
      status: 'STOP_R32_PREFLIGHT',
      error: err.code || 'UNEXPECTED_FAILURE',
      message: err.code ? undefined : err.message
    }) + '\n');
    process.exitCode = 1;
  }
}
