// R43: pure, offline issuer-level market importance candidate model.
// Market-cap and vendor-calendar payloads are never required or exported.
export const R43_METHOD = 'R43_RANK_ENSEMBLE_20261031';
export const R43_FEATURES = Object.freeze([
  'logTurnNorm', 'logTurn', 'logP', 'yield', 'logEps', 'logRv', 'absChg', 'growth',
]);
export const R43_WEIGHTS = Object.freeze({
  // Benchmark-derived exploratory weights; not validated out of sample.
  best132: Object.freeze([.514, .113, .109, .132, .003, .113, -.038, .016]),
  bestJoint: Object.freeze([.565, .160, .057, .152, .023, .009, -.117, .034]),
});
export const R43_REVIEWED_EXCEPTION_POLICY = 'R43_REVIEWED_5_ISSUERS_20261101';
export const R43_REVIEWED_EXCEPTION_ISSUERS = Object.freeze([
  'BERKSHIRE', 'ARM', 'ANET', 'SHOP', 'DE',
]);

const TICKER = /^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const DATE = /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const positive = value => finite(value) && value > 0;
const cleanTicker = value => String(value ?? '').trim().toUpperCase();

export function r43IssuerKey(ticker, issuerId = null) {
  const symbol = cleanTicker(ticker);
  if (!TICKER.test(symbol)) throw Error('R43_TICKER_INVALID');
  // Known multiple share classes must never become two issuers merely because
  // upstream sources supply class-specific (or conflicting) issuer IDs.
  const canonical = symbol === 'GOOG' || symbol === 'GOOGL' ? 'ALPHABET' :
    /^BRK[.\-][AB]$/.test(symbol) ? 'BERKSHIRE' : null;
  if (issuerId !== null && issuerId !== undefined) {
    const id = String(issuerId).trim().toUpperCase();
    if (!/^[A-Z0-9_.:\-]{1,80}$/.test(id)) throw Error('R43_ISSUER_ID_INVALID');
    return canonical ?? id;
  }
  return canonical ?? symbol;
}

// Mid-rank empirical percentiles. Missing/non-comparable values are neutral .5.
function percentiles(values) {
  const sorted = values.map((value, i) => ({value, i}))
    .filter(row => finite(row.value))
    .sort((a, b) => a.value - b.value || a.i - b.i);
  const result = Array(values.length).fill(.5), n = sorted.length;
  for (let i = 0; i < n;) {
    let end = i + 1;
    while (end < n && sorted[end].value === sorted[i].value) end++;
    const mid = (i + end) / (2 * n);
    for (let j = i; j < end; j++) result[sorted[j].i] = mid;
    i = end;
  }
  return result;
}

function issuerRows(rows, asOf) {
  const grouped = new Map(), tickers = new Set();
  for (const row of rows) {
    if (!row || row.eligible !== true && row.eligible !== false)
      throw Error('R43_ELIGIBILITY_NOT_VERIFIED');
    const ticker = cleanTicker(row.ticker);
    if (!TICKER.test(ticker) || tickers.has(ticker)) throw Error('R43_TICKER_DUPLICATE_OR_INVALID');
    tickers.add(ticker);
    if (row.eligible === false) continue; // Exclusions are explicit and pre-reviewed.
    if (row.tradeDate !== asOf) throw Error('R43_MIXED_OR_STALE_TRADE_DATE');
    const issuerId = r43IssuerKey(ticker, row.issuerId);
    const list = grouped.get(issuerId) ?? [];
    list.push({...row, ticker});
    grouped.set(issuerId, list);
  }
  return grouped;
}

function combineClasses(issuerId, classes) {
  const priced = classes.filter(row => positive(row.price) && finite(row.volume) && row.volume >= 0);
  const dailyTurnover = priced.reduce((sum, row) => sum + row.price * row.volume, 0);
  // Convert each valid class to its own baseline turnover before summation.
  const normalized = priced.filter(row => positive(row.relativeVolume));
  const baselineTurnover = normalized.reduce((sum, row) => sum + row.price * row.volume / row.relativeVolume, 0);
  const lead = priced.slice().sort((a, b) => b.price * b.volume - a.price * a.volume || a.ticker.localeCompare(b.ticker))[0] ?? null;
  // An incomplete class baseline must not exaggerate issuer relative volume.
  const rv = normalized.length === priced.length && baselineTurnover > 0 ?
    dailyTurnover / baselineTurnover : null;
  const pick = key => lead && finite(lead[key]) ? lead[key] : null;
  return {
    issuerId,
    tickers: classes.map(row => row.ticker).sort(),
    liquid: priced.length > 0 && dailyTurnover > 0,
    relativeVolumeAvailable: positive(rv),
    features: {
      logTurnNorm: positive(baselineTurnover) ? Math.log(baselineTurnover) : null,
      logTurn: positive(dailyTurnover) ? Math.log(dailyTurnover) : null,
      logP: lead ? Math.log(lead.price) : null,
      yield: pick('dividendYield'),
      logEps: positive(pick('eps')) ? Math.log(pick('eps')) : null,
      logRv: positive(rv) ? Math.log(rv) : null,
      absChg: finite(pick('dailyChangePct')) ? Math.abs(pick('dailyChangePct')) : null,
      growth: pick('epsGrowthPct'),
    },
  };
}

/**
 * Rank all reviewed eligible issuers, never an event-window subset.
 * Returns BLOCKED with no grades if PC input population/coverage is unverified.
 * Offline inputs: price, volume, relative volume, optional fundamentals, issuer ID.
 */
export function rankR43Issuers(rows, {
  asOf,
  expectedEligibleIssuers = 2634,
  minUniverseCoverage = .98,
  minPriceVolumeCoverage = .98,
  minRelativeVolumeCoverage = .90,
  topFraction = .05,
} = {}) {
  if (!Array.isArray(rows) || !DATE.test(String(asOf ?? '')) ||
    !Number.isInteger(expectedEligibleIssuers) || expectedEligibleIssuers < 1 ||
    !finite(minUniverseCoverage) || minUniverseCoverage <= 0 || minUniverseCoverage > 1 ||
    !finite(minPriceVolumeCoverage) || minPriceVolumeCoverage <= 0 || minPriceVolumeCoverage > 1 ||
    !finite(minRelativeVolumeCoverage) || minRelativeVolumeCoverage <= 0 || minRelativeVolumeCoverage > 1 ||
    !finite(topFraction) || topFraction <= 0 || topFraction > .1)
    throw Error('R43_RANK_CONFIG_INVALID');

  const grouped = issuerRows(rows, asOf);
  const issuers = [...grouped].map(([id, classes]) => combineClasses(id, classes));
  const eligible = issuers.length, liquid = issuers.filter(row => row.liquid).length;
  const relative = issuers.filter(row => row.relativeVolumeAvailable).length;
  const coverage = {
    expectedEligibleIssuers, eligibleIssuers: eligible, inputTickers: rows.length,
    priceVolume: eligible ? liquid / eligible : 0,
    relativeVolume: eligible ? relative / eligible : 0,
    universe: eligible / expectedEligibleIssuers,
  };
  let reason = null;
  if (eligible < Math.ceil(expectedEligibleIssuers * minUniverseCoverage) || eligible > expectedEligibleIssuers * 1.05)
    reason = 'R43_UNIVERSE_COVERAGE_NOT_VERIFIED';
  else if (coverage.priceVolume < minPriceVolumeCoverage) reason = 'R43_PRICE_VOLUME_COVERAGE_INSUFFICIENT';
  else if (coverage.relativeVolume < minRelativeVolumeCoverage) reason = 'R43_RELATIVE_VOLUME_COVERAGE_INSUFFICIENT';
  if (reason) return {status:'BLOCKED', reason, method:R43_METHOD, asOf, coverage, topCount:0, rankings:[]};

  const matrix = R43_FEATURES.map(key => percentiles(issuers.map(row => row.features[key])));
  const weighted = weights => issuers.map((_, i) =>
    weights.reduce((sum, weight, j) => sum + weight * matrix[j][i], 0));
  const rankA = percentiles(weighted(R43_WEIGHTS.best132));
  const rankB = percentiles(weighted(R43_WEIGHTS.bestJoint));
  const rankings = issuers.map((row, i) => ({
    issuerId: row.issuerId, tickers: row.tickers,
    score: .1 * rankA[i] + .9 * rankB[i],
  })).sort((a, b) => b.score - a.score || a.issuerId.localeCompare(b.issuerId));
  const topCount = Math.round(eligible * topFraction);
  for (let i = 0; i < rankings.length; i++) {
    rankings[i].rank = i + 1;
    rankings[i].importance = i < topCount ? 3 : null; // Existing ★★ / ★ policy stays intact.
  }
  return {status:'READY_SHADOW', method:R43_METHOD, asOf, coverage, topCount, rankings};
}

function reviewedExceptionPlan(rankings, topCount) {
  if (!Array.isArray(rankings) || !Number.isInteger(topCount) ||
    topCount < 1 || topCount > rankings.length) return null;
  const selectedByReview = new Map();
  for (const row of rankings) {
    if (!Array.isArray(row.tickers) || !row.tickers.length) return null;
    const matches = new Set();
    for (const ticker of row.tickers) {
      let canonical;
      try { canonical = r43IssuerKey(ticker); } catch { return null; }
      if (R43_REVIEWED_EXCEPTION_ISSUERS.includes(canonical)) matches.add(canonical);
    }
    if (matches.size > 1) return null; // A bad issuer group cannot merge distinct exceptions.
    if (matches.size === 1) {
      const exceptionKey = [...matches][0];
      if (selectedByReview.has(exceptionKey)) return null; // Never count one issuer twice.
      selectedByReview.set(exceptionKey, row.issuerId);
    }
  }
  // A small test universe cannot silently override the immutable 5% quota.
  if (selectedByReview.size > topCount) return null;
  const reviewedIssuerIds = new Set(selectedByReview.values());
  if (reviewedIssuerIds.size !== selectedByReview.size) return null;
  const selected = new Set(reviewedIssuerIds);
  for (const row of rankings) {
    if (selected.size === topCount) break;
    selected.add(row.issuerId);
  }
  if (selected.size !== topCount) return null;
  return {
    selected, reviewedIssuerIds,
    reviewedExceptionsApplied: R43_REVIEWED_EXCEPTION_ISSUERS.filter(key => selectedByReview.has(key)),
  };
}

/**
 * Explicit first-phase exception policy. Original model ranks and scores remain
 * untouched; reviewed issuers take slots within (never above) the 5% cap.
 * The caller must supply a full, verified R43 ranking, not a fabricated shortlist.
 */
export function selectR43ReviewedExceptions(ranked) {
  if (!ranked || ranked.status !== 'READY_SHADOW' || ranked.method !== R43_METHOD ||
    ranked.selectionPolicy !== undefined ||
    !DATE.test(String(ranked.asOf ?? '')) || !Array.isArray(ranked.rankings) ||
    !Number.isInteger(ranked.topCount) ||
    ranked.topCount !== Math.round(ranked.rankings.length * .05) ||
    ranked.rankings.length !== ranked.coverage?.eligibleIssuers ||
    ranked.coverage.universe < .98 || ranked.coverage.priceVolume < .98 ||
    ranked.coverage.relativeVolume < .90)
    throw Error('R43_REVIEWED_INPUT_NOT_VERIFIED');
  const plan = reviewedExceptionPlan(ranked.rankings, ranked.topCount);
  if (!plan) throw Error('R43_REVIEWED_EXCEPTIONS_EXCEED_OR_CONFLICT_WITH_QUOTA');
  const tickers = new Set(), issuers = new Set();
  let previousScore = Infinity;
  for (let i = 0; i < ranked.rankings.length; i++) {
    const row = ranked.rankings[i];
    if (row.rank !== i + 1 || !finite(row.score) || row.score > previousScore ||
      row.importance !== (i < ranked.topCount ? 3 : null) ||
      typeof row.issuerId !== 'string' || issuers.has(row.issuerId) ||
      !Array.isArray(row.tickers) || !row.tickers.length) throw Error('R43_REVIEWED_INPUT_NOT_VERIFIED');
    previousScore = row.score; issuers.add(row.issuerId);
    for (const t of row.tickers) {
      const ticker = cleanTicker(t);
      if (!TICKER.test(ticker) || tickers.has(ticker)) throw Error('R43_REVIEWED_INPUT_NOT_VERIFIED');
      tickers.add(ticker);
    }
  }
  return {
    ...ranked,
    selectionPolicy: R43_REVIEWED_EXCEPTION_POLICY,
    reviewedExceptionsApplied: plan.reviewedExceptionsApplied,
    rankings: ranked.rankings.map(row => {
      const reviewed = plan.reviewedIssuerIds.has(row.issuerId);
      const selected = plan.selected.has(row.issuerId);
      return {...row, importance: selected ? 3 : null,
        selectionReason: reviewed ? 'REVIEWED_EXCEPTION' :
          selected ? 'MODEL_SCORE' : null};
    }),
  };
}

// Validate the local PC-derived result; do not accept an unverified short list.
// R43 is refreshed from approved PC-stored inputs once per year, by hand.
// Leave roughly one month of scheduling grace without silently carrying an
// abandoned annual snapshot indefinitely.
export const R43_ANNUAL_MANUAL_MAX_AGE_DAYS = 400;
export function r43ImportanceIndex(result, {now = Date.now(), maxAgeDays = R43_ANNUAL_MANUAL_MAX_AGE_DAYS} = {}) {
  if (!result || result.status !== 'READY_SHADOW' || result.method !== R43_METHOD ||
    !DATE.test(String(result.asOf ?? '')) ||
    !Number.isFinite(Date.parse(result.asOf + 'T00:00:00Z')) ||
    !Number.isInteger(result.topCount) || result.topCount < 1 ||
    !Array.isArray(result.rankings) || !result.rankings.length ||
    result.topCount !== Math.round(result.rankings.length * .05) ||
    result.rankings.length !== result.coverage?.eligibleIssuers ||
    result.coverage.universe < .98 || result.coverage.priceVolume < .98 ||
    result.coverage.relativeVolume < .90 ||
    now - Date.parse(result.asOf + 'T00:00:00Z') > maxAgeDays * 86400000 ||
    Date.parse(result.asOf + 'T00:00:00Z') > now + 86400000)
    return null;
  const reviewedPolicy = result.selectionPolicy !== undefined;
  if (reviewedPolicy && result.selectionPolicy !== R43_REVIEWED_EXCEPTION_POLICY) return null;
  const plan = reviewedPolicy ? reviewedExceptionPlan(result.rankings, result.topCount) : null;
  if (reviewedPolicy && (!plan ||
    !Array.isArray(result.reviewedExceptionsApplied) ||
    result.reviewedExceptionsApplied.length !== plan.reviewedExceptionsApplied.length ||
    result.reviewedExceptionsApplied.some((key, i) => key !== plan.reviewedExceptionsApplied[i])))
    return null;
  const index = new Map(), issuers = new Set(); let triples = 0, previousScore = Infinity;
  for (let i = 0; i < result.rankings.length; i++) {
    const row = result.rankings[i];
    const selected = reviewedPolicy ? plan.selected.has(row.issuerId) : i < result.topCount;
    const reason = reviewedPolicy ? plan.reviewedIssuerIds.has(row.issuerId) ?
      'REVIEWED_EXCEPTION' : selected ? 'MODEL_SCORE' : null : undefined;
    if (row.rank !== i + 1 || !Number.isFinite(row.score) || row.score > previousScore ||
      typeof row.issuerId !== 'string' || issuers.has(row.issuerId) ||
      !Array.isArray(row.tickers) || !row.tickers.length ||
      row.importance !== (selected ? 3 : null) ||
      (reviewedPolicy && row.selectionReason !== reason)) return null;
    issuers.add(row.issuerId); previousScore = row.score;
    if (row.importance === 3) triples++;
    for (const ticker of row.tickers) {
      const t = cleanTicker(ticker);
      if (!TICKER.test(t) || index.has(t)) return null;
      index.set(t, row.importance);
    }
  }
  return triples === result.topCount ? index : null;
}
