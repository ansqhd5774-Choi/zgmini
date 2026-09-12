import {fetchFred, ProviderError, numberValue} from './providers.mjs';
import {payrollChanges} from './semantics.mjs';

// Approved secondary candidates, not a public provider selection policy.
export const SHADOW_SERIES = Object.freeze({
  cpi: Object.freeze({sourceSeriesId: 'CUUR0000SA0', transportSeriesId: 'CPIAUCNS', mappingClassification: 'SEMANTIC_EQUIVALENT', unit: 'Index 1982-1984=100', seasonalAdjustment: 'NSA', history: 14}),
  ppi: Object.freeze({sourceSeriesId: 'WPSFD4', transportSeriesId: 'PPIFIS', mappingClassification: 'SEMANTIC_AND_VALUE_EQUIVALENT', mappingQualification: 'VINTAGE_SENSITIVE', unit: 'Index Nov 2009=100', seasonalAdjustment: 'SA', history: 14, revisionSensitive: true, vintagePolicy: 'LATEST_AVAILABLE'}),
  unemployment: Object.freeze({sourceSeriesId: 'LNS14000000', transportSeriesId: 'UNRATE', mappingClassification: 'EXACT_SOURCE_MAPPING', unit: 'Percent', seasonalAdjustment: 'SA', history: 2}),
  payroll: Object.freeze({sourceSeriesId: 'CES0000000001', transportSeriesId: 'PAYEMS', mappingClassification: 'EXACT_SOURCE_MAPPING', unit: 'Thousands of Persons', seasonalAdjustment: 'SA', history: 3}),
});
const serial = date => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));

export function normalizeShadowSeries(metricId, points, {fetchedAt, maxObservationLagMonths = 2, cpiRequiredWindow = false} = {}) {
  const metadata = SHADOW_SERIES[metricId];
  if (!metadata) throw new ProviderError('UNKNOWN_SERIES');
  const fetched = new Date(fetchedAt);
  if (!Number.isFinite(fetched.getTime())) throw new ProviderError('INVALID_FETCH_DATE');
  const months = new Map();
  for (const point of points) {
    if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(point.date)) throw new ProviderError('INVALID_DATE');
    const value = numberValue(point.value);
    if (value === null) throw new ProviderError('NONFINITE_OR_INVALID_VALUE');
    if (months.has(point.date) && months.get(point.date) !== value) throw new ProviderError('DUPLICATE_CONFLICT');
    months.set(point.date, value);
  }
  const ordered = [...months].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({date, value}));
  const requiredOnly = metricId === 'cpi' && cpiRequiredWindow;
  if (!requiredOnly) {
    for (let i = 1; i < ordered.length; i++) {
      if (serial(ordered[i].date) - serial(ordered[i - 1].date) !== 1) throw new ProviderError('MONTH_GAP');
    }
    if (ordered.length < metadata.history) throw new ProviderError('INSUFFICIENT_HISTORY');
  }
  const current = ordered.at(-1);
  if (!current) throw new ProviderError('MISSING_OBSERVATION');
  const previous = requiredOnly
    ? ordered.find(point => serial(point.date) === serial(current.date) - 1)
    : ordered.at(-2);
  if (!previous) throw new ProviderError('MISSING_OBSERVATION');
  const lag = serial(fetched.toISOString()) - serial(current.date);
  if (lag < 0) throw new ProviderError('FUTURE_OBSERVATION');
  // Conservative shadow-only freshness gate; does not change public stale policy.
  if (lag > maxObservationLagMonths) throw new ProviderError('STALE');
  const {history, ...providerMetadata} = metadata;
  const result = {
    metricId, authority: 'BLS', transportProvider: 'FRED', ...providerMetadata,
    frequency: 'Monthly', status: 'SUCCESS', semantic: 'PASS',
    fetchedAt: fetched.toISOString(), observedAt: current.date, previousObservedAt: previous.date,
    rawCurrent: current.value, rawPrevious: previous.value,
    currentValue: current.value, previousValue: previous.value,
    freshness: {observationLagMonths: lag, maxObservationLagMonths},
  };
  if (metricId === 'cpi' || metricId === 'ppi') {
    const prior = point => months.get(`${Number(point.date.slice(0, 4)) - 1}${point.date.slice(4)}`);
    const yearAgo = prior(current), previousYearAgo = prior(previous);
    if (yearAgo === undefined || previousYearAgo === undefined) throw new ProviderError('INSUFFICIENT_HISTORY');
    if (yearAgo === 0 || previousYearAgo === 0) throw new ProviderError('ZERO_YOY_DENOMINATOR');
    result.rawYearAgo = yearAgo;
    result.rawPreviousYearAgo = previousYearAgo;
    result.yearAgoObservedAt = `${Number(current.date.slice(0, 4)) - 1}${current.date.slice(4)}`;
    result.previousYearAgoObservedAt = `${Number(previous.date.slice(0, 4)) - 1}${previous.date.slice(4)}`;
    result.currentValue = (current.value / yearAgo - 1) * 100;
    result.previousValue = (previous.value / previousYearAgo - 1) * 100;
    result.semanticUnit = 'Percent YoY';
  } else if (metricId === 'payroll') {
    const changes = payrollChanges(ordered);
    result.rawPrior = ordered.at(-3).value;
    result.priorObservedAt = ordered.at(-3).date;
    result.currentValue = changes.at(-1).value;
    result.previousValue = changes.at(-2).value;
    result.semanticUnit = 'Monthly change, thousand persons';
  } else result.semanticUnit = 'Percent';
  if (![result.currentValue, result.previousValue].every(Number.isFinite)) throw new ProviderError('NONFINITE_RESULT');
  return result;
}

export async function fetchShadowSeries(metricId, {fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = 8000} = {}) {
  const metadata = SHADOW_SERIES[metricId];
  let httpStatus = null;
  const result = await fetchFred(metadata.transportSeriesId, {
    timeoutMs: Math.min(timeoutMs, 8000),
    fetchImpl: async (url, init) => {
      const response = await Reflect.apply(fetchImpl, globalThis, [url, {...init, redirect: 'manual'}]);
      httpStatus = response.status;
      return response;
    },
  });
  const timing = {
    httpStatus, totalMs: result.durationMs,
    headersMs: result.timings.headersReceived === null ? null : result.timings.headersReceived - result.timings.requestStart,
    bodyReadCompleteMs: result.timings.bodyReadComplete === null ? null : result.timings.bodyReadComplete - result.timings.requestStart,
  };
  if (result.status !== 'SUCCESS') return {metricId, authority: 'BLS', transportProvider: 'FRED', sourceSeriesId: metadata.sourceSeriesId, transportSeriesId: metadata.transportSeriesId, status: result.status, semantic: 'FAIL', ...timing};
  try {
    return {...normalizeShadowSeries(metricId, result.data, {fetchedAt: new Date(now()).toISOString()}), ...timing};
  } catch (error) {
    return {metricId, authority: 'BLS', transportProvider: 'FRED', sourceSeriesId: metadata.sourceSeriesId, transportSeriesId: metadata.transportSeriesId, status: error instanceof ProviderError ? error.status : 'INVALID_RESPONSE', semantic: 'FAIL', ...timing};
  }
}
