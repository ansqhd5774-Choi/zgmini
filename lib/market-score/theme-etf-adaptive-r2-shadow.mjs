// R2 research only. ETF prices, SPY prices, and same-date ETF fund net assets
// arrive as already stored caller inputs. No provider call, DB write, or public
// reader connection. The published R144/R158/R178 formulas remain untouched.
import {weightEtfsByFundNetAssets} from './theme-etf-aum-weight-r1.mjs';

export const R2_THEME_SHADOW_VERSION = 'THEME_ETF_TRV_ADAPTIVE_AUM_R2_SHADOW';
export const R2_RANK_MAX = 252;
export const R2_RANK_MIN_PROPOSED = 63;
export const R2_PRICE_LOOKBACK = 125;
export const R2_HISTORY_WINDOW = 252;

const AXES = Object.freeze({
  trend: Object.freeze([['m125', .5, false], ['r60', .3, false], ['r20', .2, false]]),
  relativeStrength: Object.freeze([['rs20', .25, false], ['rs60', .45, false], ['rs125', .3, false]]),
  volatility: Object.freeze([['rv20', .4, true], ['dsv20', .35, true], ['dd63', .25, false]]),
});
const valid = value => typeof value === 'number' && Number.isFinite(value);
const price = value => valid(value) && value > 0;
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value + 'T00:00:00Z'))
  && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const mean = rows => rows.reduce((sum, x) => sum + x, 0) / rows.length;
const std = rows => { const average = mean(rows); return Math.sqrt(mean(rows.map(x => (x - average) ** 2))); };
const fail = message => { throw Error('THEME_R2_SHADOW_' + message); };

function validateDates(dates) {
  if (!Array.isArray(dates) || !dates.length) fail('DATES_REQUIRED');
  if (dates.some((day, i) => !date(day) || (i > 0 && day <= dates[i - 1]))) fail('DATE_ORDER');
}

function featureAt(own, spy, i) {
  if (i < R2_PRICE_LOOKBACK) return null;
  // This is a strict contiguous prerequisite. An absent close resets the
  // lookback rather than being silently bridged or forward-filled.
  if (!own.slice(i - R2_PRICE_LOOKBACK, i + 1).every(price)
    || !spy.slice(i - R2_PRICE_LOOKBACK, i + 1).every(price)) return null;
  const current = own[i];
  const relative = period => (current / own[i - period] - 1) - (spy[i] / spy[i - period] - 1);
  const returns = [];
  for (let j = i - 19; j <= i; j++) returns.push(own[j] / own[j - 1] - 1);
  return {
    m125: current / mean(own.slice(i - 124, i + 1)) - 1,
    r60: current / own[i - 60] - 1,
    r20: current / own[i - 20] - 1,
    rs20: relative(20),
    rs60: relative(60),
    rs125: relative(125),
    rv20: std(returns) * Math.sqrt(252),
    dsv20: Math.sqrt(252 * mean(returns.map(x => Math.min(x, 0) ** 2))),
    dd63: current / Math.max(...own.slice(i - 62, i + 1)) - 1,
  };
}

function scoreFeatures(part) {
  const last = part.at(-1);
  const n = part.length;
  const result = {};
  for (const [axis, spec] of Object.entries(AXES)) {
    let sum = 0;
    for (const [key, weight, invert] of spec) {
      const x = last[key];
      const below = part.filter(row => row[key] < x).length;
      const equal = part.filter(row => row[key] === x).length;
      const midrank = 100 * (below + .5 * equal) / n;
      sum += weight * (invert ? 100 - midrank : midrank);
    }
    result[axis] = sum;
  }
  const value = result.trend * .4 + result.relativeStrength * .2 + result.volatility * .4;
  if (!valid(value) || value < 0 || value > 100) fail('SCORE_OUT_OF_RANGE');
  return {score: value, axes: result};
}

/**
 * Pure ETF price scoring with an explicit short-rank-sample quality label.
 * `dates` is the caller's real aligned exchange-session calendar; it is never
 * generated here. Missing entries stay null and break the contiguous window.
 * `minRankObservations` is a research parameter; default 63 is NOT a proven
 * economic law or a production admission condition.
 */
export function scoreEtfAdaptiveR2({dates, closes, spyCloses, minRankObservations = R2_RANK_MIN_PROPOSED} = {}) {
  validateDates(dates);
  if (!Array.isArray(closes) || !Array.isArray(spyCloses)
    || closes.length !== dates.length || spyCloses.length !== dates.length) fail('PRICE_DATE_ALIGNMENT');
  if (!Number.isInteger(minRankObservations) || minRankObservations < 1
    || minRankObservations > R2_RANK_MAX) fail('RANK_MIN_INVALID');

  const features = [];
  const full = [];
  let run = 0;
  for (let i = 0; i < dates.length; i++) {
    const row = featureAt(closes, spyCloses, i);
    features.push(row);
    run = row ? run + 1 : 0;
    const n = Math.min(run, R2_RANK_MAX);
    const point = {date: dates[i], score: null, rankSampleN: n,
      historyMaturity: n < minRankObservations ? 'UNAVAILABLE'
        : n === R2_RANK_MAX ? 'MATURE' : 'SHORT_SAMPLE', reason: null};
    if (!row) point.reason = 'PRICE_OR_FEATURE_HISTORY_MISSING';
    else if (n < minRankObservations) point.reason = 'INSUFFICIENT_RANK_SAMPLE';
    else {
      const scored = scoreFeatures(features.slice(i - n + 1, i + 1));
      point.score = scored.score;
      point.axes = scored.axes;
    }
    full.push(point);
  }
  return {methodologyVersion: R2_THEME_SHADOW_VERSION, minRankObservations,
    historyWindowSessions: R2_HISTORY_WINDOW, observationDate: dates.at(-1),
    calendarCoverage: Math.min(dates.length, R2_HISTORY_WINDOW),
    history: full.slice(-R2_HISTORY_WINDOW)};
}

function netAssetsOn(etf, calendar) {
  if (!Array.isArray(etf.netAssets)) fail('NET_ASSETS_ARRAY_REQUIRED_' + etf.ticker);
  const map = new Map();
  for (const row of etf.netAssets) {
    if (!row || !date(row.date) || !calendar.has(row.date) || map.has(row.date))
      fail('NET_ASSETS_DATE_INVALID_OR_DUPLICATE_' + etf.ticker);
    map.set(row.date, row);
  }
  return map;
}

/** Build 252-calendar-session research only; score/composition null on any gap. */
export function buildThemeAumAdaptiveShadowR2({theme, dates, spyCloses, etfs,
  minRankObservations = R2_RANK_MIN_PROPOSED} = {}) {
  if (typeof theme !== 'string' || !theme.trim()) fail('THEME_REQUIRED');
  validateDates(dates);
  if (!Array.isArray(etfs) || etfs.length < 2 || new Set(etfs.map(e => e?.ticker)).size !== etfs.length)
    fail('AT_LEAST_TWO_DISTINCT_ETFS');
  const calendar = new Set(dates);
  const scored = etfs.map(etf => {
    if (!etf || typeof etf.ticker !== 'string' || !/^[A-Z0-9.]{1,12}$/.test(etf.ticker))
      fail('TICKER_INVALID');
    return {ticker: etf.ticker, history: scoreEtfAdaptiveR2({dates, closes: etf.closes,
      spyCloses, minRankObservations}).history, aum: netAssetsOn(etf, calendar)};
  });
  const n = scored[0].history.length;
  const history = [];
  for (let i = 0; i < n; i++) {
    const day = scored[0].history[i].date;
    const point = {date: day, score: null, reason: null, weights: null,
      rankSamples: Object.fromEntries(scored.map(x => [x.ticker, x.history[i].rankSampleN]))};
    const missingScore = scored.find(x => x.history[i].score === null);
    if (missingScore) point.reason = 'ETF_SCORE_MISSING_' + missingScore.ticker;
    else {
      const inputs = [];
      for (const etf of scored) {
        const aum = etf.aum.get(day);
        if (!aum) {point.reason = 'AUM_MISSING_' + etf.ticker; break;}
        if (aum.netAssetsAsOf !== day || !valid(aum.netAssetsUSD) || aum.netAssetsUSD <= 0
          || typeof aum.source !== 'string' || !aum.source.trim()) {
          point.reason = 'AUM_INVALID_OR_UNRECONCILED_' + etf.ticker; break;
        }
        inputs.push({ticker: etf.ticker, netAssetsUSD: aum.netAssetsUSD,
          netAssetsAsOf: aum.netAssetsAsOf, source: aum.source, score: etf.history[i].score});
      }
      if (!point.reason) {
        const result = weightEtfsByFundNetAssets({date: day, etfs: inputs});
        point.score = result.score;
        point.weights = result.weights.map(({ticker, weight}) => ({ticker, weight}));
      }
    }
    history.push(point);
  }
  const latest = history.at(-1);
  return {status: 'PRIVATE_SHADOW_NOT_PUBLIC', methodologyVersion: R2_THEME_SHADOW_VERSION,
    theme, benchmark: 'SPY', tickers: scored.map(x => x.ticker), individualStocksUsed: 0,
    publicationAuthorized: false, upstreamCommercialRightsVerified: false,
    derivedLicenseVerified: false, sourcePriceReconciled: false,
    weightsMode: 'POINT_IN_TIME_FUND_NET_ASSETS_PROPORTIONAL',
    minRankObservations, historyWindowSessions: R2_HISTORY_WINDOW,
    calendarCoverage: n, observationDate: latest.date,
    validPoints: history.filter(x => x.score !== null).length,
    latestScore: latest.score, history};
}

/**
 * Historical window ablation on already available ETF/SPY closes. Each
 * comparison imagines an ETF started only 125+sample observations ago, then
 * measures the new percentile score against the same-day 252-rank reference.
 * This yields an empirical validation procedure, NOT a permission to publish.
 */
export function evaluateEtfRankStabilityR2({dates, closes, spyCloses,
  samples = [63, 126], maxAnchors = 36} = {}) {
  validateDates(dates);
  if (!Array.isArray(closes) || !Array.isArray(spyCloses)
    || closes.length !== dates.length || spyCloses.length !== dates.length)
    fail('PRICE_DATE_ALIGNMENT');
  if (!Array.isArray(samples) || !samples.length || samples.some(n => !Number.isInteger(n)
    || n < 1 || n >= R2_RANK_MAX) || new Set(samples).size !== samples.length)
    fail('SAMPLES_INVALID');
  if (!Number.isInteger(maxAnchors) || maxAnchors < 1 || maxAnchors > R2_HISTORY_WINDOW)
    fail('ANCHORS_INVALID');
  const mature = scoreEtfAdaptiveR2({dates, closes, spyCloses,
    minRankObservations: R2_RANK_MAX}).history;
  const matureByDate = new Map(mature.map(x => [x.date, x]));
  const limit = Math.min(maxAnchors, dates.length);
  const output = samples.map(n => ({n, differences: [], flipsAround50: 0, anchors: []}));
  for (let k = 0; k < limit; k++) {
    const end = dates.length - 1 - k;
    const reference = matureByDate.get(dates[end]);
    if (reference?.score === null || reference?.historyMaturity !== 'MATURE') continue;
    for (const entry of output) {
      const start = end + 1 - (R2_PRICE_LOOKBACK + entry.n);
      if (start < 0) continue;
      const trial = scoreEtfAdaptiveR2({dates: dates.slice(start, end+1),
        closes: closes.slice(start, end+1), spyCloses: spyCloses.slice(start, end+1),
        minRankObservations: entry.n}).history.at(-1);
      if (trial?.score === null || trial.rankSampleN !== entry.n) continue;
      const difference = trial.score - reference.score;
      entry.differences.push(Math.abs(difference));
      if ((trial.score > 50) !== (reference.score > 50)) entry.flipsAround50++;
      entry.anchors.push({date: dates[end], referenceScore: reference.score,
        shortSampleScore: trial.score, difference});
    }
  }
  return {status: 'PRIVATE_RESEARCH_ONLY_NOT_VALIDATED_FOR_PRODUCTION',
    methodologyVersion: R2_THEME_SHADOW_VERSION,
    benchmark: 'SPY', reviewedAnchors: limit,
    sampleComparisons: output.map(({n, differences, flipsAround50, anchors}) => ({
      sampleN: n, pairedObservations: differences.length,
      meanAbsoluteError: differences.length ? mean(differences) : null,
      maximumAbsoluteError: differences.length ? Math.max(...differences) : null,
      flipsAround50, anchors,
    }))};
}
