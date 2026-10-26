// ETF fund-size proportional weights for NEW thematic research only.
// No provider calls, persisted writes, or connection to the R144/R158 50:50 reader.
// Fund size means the ETF's own net assets (not its portfolio companies' market caps).
export const THEME_ETF_AUM_WEIGHT_METHOD = 'ETF_FUND_NET_ASSETS_PROPORTIONAL_R1';

const fail = code => { throw new Error('THEME_AUM_R1_' + code); };
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value + 'T00:00:00Z'))
  && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const finite = value => typeof value === 'number' && Number.isFinite(value);

/**
 * A single day's exact, uncompensated ETF-fund-size weights.
 * Each observation must contain its own same-day net-assets figure and provenance.
 * Scores may be absent for a fund-size-only diagnostic, but must be present together
 * if a weighted sentiment score is requested. No cap, smoothing, 50:50 fallback,
 * minimum size, minimum allocation, or guessed missing values.
 */
export function weightEtfsByFundNetAssets({date, etfs} = {}) {
  if (!validDate(date)) fail('DATE_INVALID');
  if (!Array.isArray(etfs) || etfs.length < 2) fail('AT_LEAST_TWO_ETFS_REQUIRED');

  const seen = new Set();
  let scored = 0;
  for (const item of etfs) {
    if (!item || typeof item.ticker !== 'string' || !/^[A-Z0-9.]{1,12}$/.test(item.ticker)
      || seen.has(item.ticker)) fail('TICKER_INVALID_OR_DUPLICATE');
    seen.add(item.ticker);
    if (!finite(item.netAssetsUSD) || item.netAssetsUSD <= 0) fail('NET_ASSETS_INVALID_' + item.ticker);
    if (item.netAssetsAsOf !== date) fail('NET_ASSETS_NOT_SAME_DATE_' + item.ticker);
    if (typeof item.source !== 'string' || !item.source.trim()) fail('SOURCE_MISSING_' + item.ticker);
    if (item.score !== undefined) {
      if (!finite(item.score) || item.score < 0 || item.score > 100) fail('SCORE_INVALID_' + item.ticker);
      scored++;
    }
  }
  if (scored !== 0 && scored !== etfs.length) fail('SCORE_COVERAGE_INCOMPLETE');

  // Divide by the maximum first: resists overflow and makes the largest ETF
  // the ratio reference, without imposing a market-cap threshold or exponent.
  const largest = Math.max(...etfs.map(item => item.netAssetsUSD));
  const ratios = etfs.map(item => item.netAssetsUSD / largest);
  const sumRatios = ratios.reduce((sum, ratio) => sum + ratio, 0);
  if (!finite(sumRatios) || sumRatios <= 0) fail('TOTAL_NET_ASSETS_INVALID');

  const weights = etfs.map((item, index) => ({
    ticker: item.ticker,
    netAssetsUSD: item.netAssetsUSD,
    netAssetsAsOf: item.netAssetsAsOf,
    source: item.source,
    weight: ratios[index] / sumRatios,
  }));
  const result = { date, methodologyVersion: THEME_ETF_AUM_WEIGHT_METHOD, weights };
  if (scored === etfs.length) {
    result.score = weights.reduce((sum, item, index) => sum + item.weight * etfs[index].score, 0);
  }
  return result;
}

/**
 * Private shadow only: exactly 252 distinct ordered trading-session observations.
 * Does not infer trading calendars, fabricate ETF histories, or recycle today's
 * fund sizes into prior dates. Caller must separately verify ETF price warmup,
 * thematic eligibility, data rights and source-lineage completeness.
 */
export function buildAumWeightedThemeShadow({theme, etfTickers, observations} = {}) {
  if (typeof theme !== 'string' || !theme.trim()) fail('THEME_REQUIRED');
  if (!Array.isArray(etfTickers) || etfTickers.length < 2 || new Set(etfTickers).size !== etfTickers.length)
    fail('ETF_SET_INVALID');
  if (!Array.isArray(observations) || observations.length !== 252) fail('252_OBSERVATIONS_REQUIRED');
  let previous = '';
  const history = observations.map(row => {
    if (!row || !validDate(row.date) || row.date <= previous) fail('HISTORY_DATE_ORDER');
    previous = row.date;
    if (!Array.isArray(row.etfs) || row.etfs.map(item => item?.ticker).join('|') !== etfTickers.join('|'))
      fail('ETF_SET_DRIFT');
    if (row.etfs.some(item => item.score === undefined)) fail('HISTORY_SCORE_MISSING');
    const weighted = weightEtfsByFundNetAssets(row);
    return {date: weighted.date, score: weighted.score, weights: weighted.weights.map(({ticker, weight}) => ({ticker, weight}))};
  });
  return {
    status: 'PRIVATE_RESEARCH_READY_NOT_PUBLIC',
    theme, etfs: [...etfTickers],
    methodologyVersion: THEME_ETF_AUM_WEIGHT_METHOD,
    individualStocksUsed: 0, publicationAuthorized: false,
    upstreamCommercialRightsVerified: false, derivedLicenseVerified: false,
    observationDate: previous, history, latestScore: history.at(-1).score,
  };
}
