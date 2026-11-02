// ER1: read-only earnings-release score candidate. No provider calls or D1 writes.
// The public R43 reader/publisher does not accept this method until separately integrated.
export const ER1_METHOD = 'ER1_RELEASE1TO4_REVENUE_EPS_FIXED_97_20261102';
export const ER1_STAR3_THRESHOLD = 97;
export const ER1_WEIGHTS = Object.freeze({revenuePercentile: 60, epsProfitability: 40});

const ID = /^[A-Z0-9_.:\-]{1,80}$/;
const TICKER = /^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const DAY = /^20\d\d-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const finite = x => typeof x === 'number' && Number.isFinite(x);
const stop = code => {throw Error(code)};
const clamp = x => Math.max(0, Math.min(1, x));
// Announcement dates are NOT fiscal-quarter ends. Exclude same-day records because
// EarningsAPI does not publish an actual-report timestamp to prevent intraday leakage.
const MAX_RECENT_RELEASE_AGE_DAYS = 140;

function validDay(value) {
  return typeof value === 'string' && DAY.test(value) &&
    !Number.isNaN(Date.parse(value + 'T00:00:00Z')) &&
    new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
}

// Tie-aware ascending percentile. Equal revenue means equal revenue component.
function midrankPercentiles(values) {
  const sorted = values.map((value, index) => ({value, index}))
    .sort((a, b) => a.value - b.value || a.index - b.index);
  const result = Array(values.length);
  for (let from = 0; from < sorted.length;) {
    let to = from + 1;
    while (to < sorted.length && sorted[to].value === sorted[from].value) to++;
    const percentile = (from + to) / (2 * sorted.length);
    for (let at = from; at < to; at++) result[sorted[at].index] = percentile;
    from = to;
  }
  return result;
}

function uniqueIssuerAlias(ticker) {
  if (ticker === 'GOOG' || ticker === 'GOOGL') return 'ALPHABET';
  if (/^BRK[.\-][AB]$/.test(ticker)) return 'BERKSHIRE';
  return ticker;
}

function releaseAverages(row, asOf) {
  // Raw, locally stored /v1/earnings rows, not selectively chosen four slots.
  // Keep a past, date-stamped row with null/null metrics as a missing observation;
  // never shift to the older fifth event to make an issuer appear profitable.
  if (!row.tickers.includes(row.earningsSymbol) ||
    !Array.isArray(row.releases)) stop('ER1_RELEASE_SOURCE_REQUIRED');
  const byDate = new Map();
  for (const event of row.releases) {
    if (!event || !validDay(event.date) || event.symbol !== row.earningsSymbol)
      stop('ER1_RELEASE_RECORD_INVALID');
    const eps = event.eps, revenue = event.revenue;
    if (eps !== null && !finite(eps) ||
      revenue !== null && (!finite(revenue) || revenue < 0))
      stop('ER1_RELEASE_VALUE_INVALID');
    if (event.date >= asOf) continue; // future and today's unverified reports
    const prior = byDate.get(event.date);
    if (prior && (prior.eps !== eps || prior.revenue !== revenue))
      stop('ER1_RELEASE_DUPLICATE_CONFLICT');
    byDate.set(event.date, {date: event.date, eps, revenue});
  }
  const latest = [...byDate.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4);
  if (!latest.length) return {reason:'ER1_RELEASE_HISTORY_INSUFFICIENT'};
  const newestAgeDays = (Date.parse(asOf + 'T00:00:00Z') -
    Date.parse(latest[0].date + 'T00:00:00Z')) / 86400000;
  if (newestAgeDays > MAX_RECENT_RELEASE_AGE_DAYS)
    return {reason:'ER1_STALE_RELEASE_WINDOW'};
  for (let i = 1; i < latest.length; i++) {
    const gap = (Date.parse(latest[i - 1].date + 'T00:00:00Z') -
      Date.parse(latest[i].date + 'T00:00:00Z')) / 86400000;
    if (gap < 60 || gap > 120) return {reason:'ER1_RELEASE_SEQUENCE_INVALID'};
  }
  const eps = latest.map(x => x.eps).filter(finite);
  const revenue = latest.map(x => x.revenue).filter(finite);
  if (!eps.length || !revenue.length)
    return {reason:'ER1_METRIC_OBSERVATIONS_INSUFFICIENT'};
  const averageEPS = eps.reduce((sum, x) => sum + x, 0) / eps.length;
  const meanAbsEPS = eps.reduce((sum, x) => sum + Math.abs(x), 0) / eps.length;
  const averageRevenue = revenue.reduce((sum, x) => sum + x, 0) / revenue.length;
  const epsProfitability = clamp(.5 * (1 + averageEPS / Math.max(.01, meanAbsEPS)));
  return {averageRevenue, epsProfitability, epsReleases: eps.length,
    revenueReleases: revenue.length};
}

/**
 * Approved issuer rows, not the two-week earnings-event subset.
 * Select up to four latest, past earnings announcements for a selected issuer
 * earningsSymbol. A single actual observation per metric is sufficient;
 * do not collect additional records merely to fill four slots.
 * These announcement dates are not fiscal-quarter dates.
 * Null actuals are included as missing observations (no estimate fallback).
 * Never replace an unreported actual EPS/revenue with an invented actual value.
 * No issuer grades are emitted if whole-universe or metric coverage is unverified.
 */
export function scoreER1Issuers(rows, {asOf, expectedEligibleIssuers,
  minCoverage = .98} = {}) {
  if (!Array.isArray(rows) || !validDay(asOf) ||
    !Number.isInteger(expectedEligibleIssuers) || expectedEligibleIssuers < 1 ||
    !finite(minCoverage) || minCoverage < .98 || minCoverage > 1)
    stop('ER1_INPUT_CONFIG_INVALID');
  const ids = new Set(), tickers = new Set(), knownAliases = new Map();
  const scored = [];
  const unscoreableReasons = {};
  let reviewedEligible = 0;
  for (const row of rows) {
    if (!row || (row.eligible !== true && row.eligible !== false) ||
      typeof row.issuerId !== 'string' || !ID.test(row.issuerId) ||
      ids.has(row.issuerId) || !Array.isArray(row.tickers) || !row.tickers.length)
      stop('ER1_APPROVED_ISSUER_REQUIRED');
    ids.add(row.issuerId);
    for (const ticker of row.tickers) {
      if (typeof ticker !== 'string' || !TICKER.test(ticker) || tickers.has(ticker))
        stop('ER1_TICKER_DUPLICATE_OR_INVALID');
      tickers.add(ticker);
      const alias = uniqueIssuerAlias(ticker), prior = knownAliases.get(alias);
      if (prior && prior !== row.issuerId) stop('ER1_SHARE_CLASS_SPLIT');
      knownAliases.set(alias, row.issuerId);
    }
    if (row.eligible === false) continue;
    reviewedEligible++;
    const averages = releaseAverages(row, asOf);
    if (averages.reason) unscoreableReasons[averages.reason] =
      (unscoreableReasons[averages.reason] || 0) + 1;
    else scored.push({issuerId: row.issuerId,
      tickers: [...row.tickers].sort(), ...averages});
  }
  const coverage = {
    expectedEligibleIssuers, reviewedEligibleIssuers: reviewedEligible,
    scoreableIssuers: scored.length,
    universe: reviewedEligible / expectedEligibleIssuers,
    earnings: reviewedEligible ? scored.length / reviewedEligible : 0,
    unscoreableReasons,
  };
  const blocked = reviewedEligible < Math.ceil(expectedEligibleIssuers * minCoverage) ||
    reviewedEligible > expectedEligibleIssuers ||
    coverage.earnings < minCoverage;
  if (blocked) return {status: 'BLOCKED', reason: coverage.universe < minCoverage ||
    reviewedEligible > expectedEligibleIssuers ?
      'ER1_APPROVED_UNIVERSE_INCOMPLETE' : 'ER1_RELEASE_COVERAGE_INSUFFICIENT',
    method: ER1_METHOD, asOf, coverage, threshold: ER1_STAR3_THRESHOLD,
    star3Count: 0, rankings: []};

  const percentiles = midrankPercentiles(scored.map(x => Math.log1p(x.averageRevenue)));
  const rankings = scored.map((row, i) => ({
    issuerId: row.issuerId, tickers: row.tickers,
    score: ER1_WEIGHTS.revenuePercentile * percentiles[i] +
      ER1_WEIGHTS.epsProfitability * row.epsProfitability,
    epsReleases: row.epsReleases, revenueReleases: row.revenueReleases,
  })).sort((a, b) => b.score - a.score || a.issuerId.localeCompare(b.issuerId));
  for (let i = 0; i < rankings.length; i++) {
    rankings[i].rank = i + 1;
    rankings[i].importance = rankings[i].score >= ER1_STAR3_THRESHOLD ? 3 : null;
  }
  return {status: 'READY_SHADOW', method: ER1_METHOD, asOf, coverage,
    threshold: ER1_STAR3_THRESHOLD,
    star3Count: rankings.filter(x => x.importance === 3).length, rankings};
}
