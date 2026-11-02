// ER1: read-only quarterly earnings score candidate. No provider calls or D1 writes.
// The public R43 reader/publisher does not accept this method until separately integrated.
export const ER1_METHOD = 'ER1_REVENUE_EPS_FIXED_97_20261102';
export const ER1_STAR3_THRESHOLD = 97;
export const ER1_WEIGHTS = Object.freeze({revenuePercentile: 60, epsProfitability: 40});

const ID = /^[A-Z0-9_.:\-]{1,80}$/;
const TICKER = /^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const DAY = /^20\d\d-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const finite = x => typeof x === 'number' && Number.isFinite(x);
const stop = code => {throw Error(code)};
const clamp = x => Math.max(0, Math.min(1, x));

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

function quarterlyAverages(row, asOf) {
  // Exactly four consecutive, completed quarters: omitted values are explicit nulls.
  if (!Array.isArray(row.quarters) || row.quarters.length !== 4)
    stop('ER1_FOUR_QUARTER_SLOTS_REQUIRED');
  const dates = new Set(), quarters = [];
  for (const q of row.quarters) {
    if (!q || !validDay(q.quarterEnd) || q.quarterEnd > asOf || dates.has(q.quarterEnd))
      stop('ER1_QUARTER_DATE_INVALID');
    dates.add(q.quarterEnd);
    const eps = q.eps === null ? null : q.eps;
    const revenue = q.revenue === null ? null : q.revenue;
    if (eps !== null && !finite(eps) ||
      revenue !== null && (!finite(revenue) || revenue < 0))
      stop('ER1_QUARTER_VALUE_INVALID');
    quarters.push({quarterEnd: q.quarterEnd, eps, revenue});
  }
  quarters.sort((a, b) => b.quarterEnd.localeCompare(a.quarterEnd));
  for (let i = 1; i < quarters.length; i++) {
    const gap = (Date.parse(quarters[i - 1].quarterEnd + 'T00:00:00Z') -
      Date.parse(quarters[i].quarterEnd + 'T00:00:00Z')) / 86400000;
    if (gap < 60 || gap > 120) stop('ER1_QUARTER_SEQUENCE_INVALID');
  }
  const eps = quarters.map(q => q.eps).filter(finite);
  const revenue = quarters.map(q => q.revenue).filter(finite);
  if (eps.length < 2 || revenue.length < 2) return null;
  const averageEPS = eps.reduce((sum, x) => sum + x, 0) / eps.length;
  const meanAbsEPS = eps.reduce((sum, x) => sum + Math.abs(x), 0) / eps.length;
  const averageRevenue = revenue.reduce((sum, x) => sum + x, 0) / revenue.length;
  const epsProfitability = clamp(.5 * (1 + averageEPS / Math.max(.01, meanAbsEPS)));
  return {averageRevenue, epsProfitability, epsQuarters: eps.length,
    revenueQuarters: revenue.length};
}

/**
 * Approved issuer rows, not the two-week earnings-event subset.
 * All four completed fiscal-quarter slots must be present (null values allowed).
 * Never replace an unreported actual EPS/revenue with an invented actual value.
 * No issuer grades are emitted if whole-universe or metric coverage is unverified.
 */
export function scoreER1Issuers(rows, {asOf, expectedEligibleIssuers,
  minCoverage = .98} = {}) {
  if (!Array.isArray(rows) || !validDay(asOf) ||
    !Number.isInteger(expectedEligibleIssuers) || expectedEligibleIssuers < 1 ||
    !finite(minCoverage) || minCoverage <= 0 || minCoverage > 1)
    stop('ER1_INPUT_CONFIG_INVALID');
  const ids = new Set(), tickers = new Set(), knownAliases = new Map();
  const scored = [];
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
    const averages = quarterlyAverages(row, asOf);
    if (averages) scored.push({issuerId: row.issuerId,
      tickers: [...row.tickers].sort(), ...averages});
  }
  const coverage = {
    expectedEligibleIssuers, reviewedEligibleIssuers: reviewedEligible,
    scoreableIssuers: scored.length,
    universe: reviewedEligible / expectedEligibleIssuers,
    earnings: reviewedEligible ? scored.length / reviewedEligible : 0,
  };
  const blocked = reviewedEligible < Math.ceil(expectedEligibleIssuers * minCoverage) ||
    reviewedEligible > expectedEligibleIssuers * 1.05 ||
    coverage.earnings < minCoverage;
  if (blocked) return {status: 'BLOCKED', reason: coverage.universe < minCoverage ||
    reviewedEligible > expectedEligibleIssuers * 1.05 ?
      'ER1_APPROVED_UNIVERSE_INCOMPLETE' : 'ER1_QUARTER_COVERAGE_INSUFFICIENT',
    method: ER1_METHOD, asOf, coverage, threshold: ER1_STAR3_THRESHOLD,
    star3Count: 0, rankings: []};

  const percentiles = midrankPercentiles(scored.map(x => Math.log1p(x.averageRevenue)));
  const rankings = scored.map((row, i) => ({
    issuerId: row.issuerId, tickers: row.tickers,
    score: ER1_WEIGHTS.revenuePercentile * percentiles[i] +
      ER1_WEIGHTS.epsProfitability * row.epsProfitability,
    epsQuarters: row.epsQuarters, revenueQuarters: row.revenueQuarters,
  })).sort((a, b) => b.score - a.score || a.issuerId.localeCompare(b.issuerId));
  for (let i = 0; i < rankings.length; i++) {
    rankings[i].rank = i + 1;
    rankings[i].importance = rankings[i].score >= ER1_STAR3_THRESHOLD ? 3 : null;
  }
  return {status: 'READY_SHADOW', method: ER1_METHOD, asOf, coverage,
    threshold: ER1_STAR3_THRESHOLD,
    star3Count: rankings.filter(x => x.importance === 3).length, rankings};
}
