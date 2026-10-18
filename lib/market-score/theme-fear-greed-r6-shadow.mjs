/**
 * ZGMINI theme Fear & Greed R6: pure, stored-input-only shadow aggregation.
 * No provider calls, persistence, scheduling or production publication.
 * Historical axis scores MUST have been computed with the unchanged sector R3
 * definitions and constituent/PIT evidence upstream. This module does not
 * certify data provenance or publication eligibility.
 */
import {
  SECTOR_FEAR_GREED_R3_REFERENCE_OBSERVATIONS,
  scoreSectorFearGreedR3,
} from './sector-fear-greed-r3-five-axis-complete.mjs';

export const THEME_FEAR_GREED_R6_VERSION = 'THEME-FEAR-GREED-R6-SHADOW-V1';
export const THEME_FEAR_GREED_R6_HISTORY_LENGTH = 252;
export const THEME_FEAR_GREED_R6_WEIGHTS = Object.freeze({
  2: Object.freeze([0.60, 0.40]),
  3: Object.freeze([0.50, 0.30, 0.20]),
  4: Object.freeze([0.45, 0.25, 0.20, 0.10]),
  5: Object.freeze([0.40, 0.25, 0.15, 0.12, 0.08]),
});

const validDate = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x + 'T00:00:00Z')) && new Date(x + 'T00:00:00Z').toISOString().slice(0,10) === x;
const finite = x => typeof x === 'number' && Number.isFinite(x);
const fail = (themeId, reason) => ({
  version: THEME_FEAR_GREED_R6_VERSION,
  status: 'NOT_READY',
  reason,
  themeId,
  current: null,
  observationDate: null,
  history: [],
  etfs: [],
  publicationApproved: false,
});

/**
 * Each ETF carries independently computed daily 5-axis scores, exactly 252
 * aligned dates, plus explicit upstream source and PIT verification markers.
 * ETF ranks/selection must be independently approved; this module NEVER picks
 * funds based solely on AUM or synthesizes missing axes.
 *
 * Output SHADOW_ONLY is a calculation status, NOT production readiness.
 */
export function buildThemeFearGreedR6Shadow({themeId, etfs} = {}) {
  if (typeof themeId !== 'string' || !themeId.trim()) return fail(null, 'THEME_ID_MISSING');
  if (!Array.isArray(etfs) || !THEME_FEAR_GREED_R6_WEIGHTS[etfs.length]) return fail(themeId, 'ETF_COUNT_NOT_2_TO_5');
  const weights = THEME_FEAR_GREED_R6_WEIGHTS[etfs.length];
  const tickers = new Set();
  let expectedDates = null;
  const inputs = [];
  for (let i = 0; i < etfs.length; i++) {
    const etf = etfs[i];
    if (!etf || typeof etf.ticker !== 'string' || !/^[A-Z][A-Z0-9.\-]{0,14}$/.test(etf.ticker)) return fail(themeId, 'ETF_TICKER_INVALID');
    if (tickers.has(etf.ticker)) return fail(themeId, 'ETF_TICKER_DUPLICATE');
    tickers.add(etf.ticker);
    if (etf.rank !== i + 1) return fail(themeId, 'ETF_RANK_NOT_LOCKED');
    if (etf.referenceObservations !== SECTOR_FEAR_GREED_R3_REFERENCE_OBSERVATIONS) return fail(themeId, 'R3_REFERENCE_MISMATCH');
    if (etf.normalization !== 'R3_ROLLING_252') return fail(themeId, 'R3_NORMALIZATION_NOT_VERIFIED');
    if (etf.pitVerified !== true || etf.holdingsVerified !== true || etf.sourceVerified !== true) return fail(themeId, 'ETF_UPSTREAM_VERIFICATION_MISSING');
    if (typeof etf.sourceVersion !== 'string' || !etf.sourceVersion || typeof etf.sourceStoredAt !== 'string' || !Number.isFinite(Date.parse(etf.sourceStoredAt))) return fail(themeId, 'ETF_SOURCE_LINEAGE_MISSING');
    if (!Array.isArray(etf.history) || etf.history.length !== THEME_FEAR_GREED_R6_HISTORY_LENGTH) return fail(themeId, 'ETF_SCORE_HISTORY_NOT_252');
    const dates = [];
    const scores = [];
    for (const row of etf.history) {
      if (!row || !validDate(row.date)) return fail(themeId, 'ETF_DATE_INVALID');
      if (dates.length && dates.at(-1) >= row.date) return fail(themeId, 'ETF_DATE_NOT_INCREASING');
      dates.push(row.date);
      let score;
      try { score = scoreSectorFearGreedR3(row.axes); }
      catch { return fail(themeId, 'ETF_AXIS_OUT_OF_RANGE'); }
      if (!finite(score)) return fail(themeId, 'ETF_AXIS_MISSING');
      scores.push(score);
    }
    if (expectedDates && dates.some((date, j) => date !== expectedDates[j])) return fail(themeId, 'ETF_DATE_MISMATCH');
    expectedDates ??= dates;
    inputs.push({ticker: etf.ticker, rank: etf.rank, weight: weights[i], scores, sourceVersion: etf.sourceVersion, sourceStoredAt: etf.sourceStoredAt});
  }
  const history = expectedDates.map((date, j) => ({date, score: inputs.reduce((sum, etf) => sum + etf.weight * etf.scores[j], 0)}));
  const current = history.at(-1)?.score;
  if (!finite(current) || current < 0 || current > 100) return fail(themeId, 'COMPOSITE_INVALID');
  return {
    version: THEME_FEAR_GREED_R6_VERSION,
    status: 'SHADOW_ONLY',
    reason: null,
    themeId,
    observationDate: history.at(-1).date,
    current,
    history,
    etfs: inputs.map(({ticker, rank, weight, sourceVersion, sourceStoredAt}) => ({ticker, rank, weight, sourceVersion, sourceStoredAt})),
    referenceObservations: SECTOR_FEAR_GREED_R3_REFERENCE_OBSERVATIONS,
    publicationApproved: false,
  };
}
