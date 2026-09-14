import {ProviderError} from './providers.mjs';
import {withFredObservations} from './fred-api-transport.mjs';
export {observationsUrl, parseObservations} from './fred-api-transport.mjs';
import {normalizeShadowSeries, SHADOW_SERIES} from './fred-bls-shadow.mjs';

const fail = status => { throw new ProviderError(status); };
// Internal raw history is not part of the diagnostic JSON/public contract.
const rawHistories = new WeakMap();
export function getApiRawHistory(result) {
  return rawHistories.get(result)?.map(({date, value}) => ({date, value}));
}
// Version 88 evidence, comparison only. Never a fallback input.
const csvPayroll = Object.freeze({'2026-07-01': 158858, '2026-06-01': 158881, '2026-05-01': 158861});
export function compareCsvEvidence(metricId, points) {
  if (metricId === 'unemployment') {
    const recent = points.slice(-4);
    const month = date => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));
    const continuous = recent.every((point, i) => i === 0 || month(point.date) - month(recent[i - 1].date) === 1);
    return {csvStatus: 'MONTH_GAP', apiRecentMonthsContinuous: continuous, classification: continuous ? 'CSV_DATA_INTEGRITY_FAILURE' : 'UNVERIFIED', exactCsvGapLocation: 'UNVERIFIED'};
  }
  if (metricId !== 'payroll') return {csvStatus: 'HTTP_520', comparison: 'TRANSPORT_ONLY'};
  const missingLatestObservation = points.at(-1).date > '2026-07-01';
  const valueDifference = points.some(p => Object.hasOwn(csvPayroll, p.date) && csvPayroll[p.date] !== p.value);
  return {csvLatestObservedAt: '2026-07-01', missingLatestObservation, valueDifference, classification: missingLatestObservation ? 'GRAPH_CSV_STALE' : 'LATEST_DATE_NOT_NEWER', revisionDifferencePossible: valueDifference};
}

export async function fetchApiShadowSeries(metricId, key, {fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = 8000} = {}) {
  const meta = SHADOW_SERIES[metricId];
  const started = now();
  const timing = {httpStatus: null, headersMs: null, bodyReadCompleteMs: null, totalMs: 0};
  const base = {metricId, authority: 'BLS', transportProvider: 'FRED', transportMode: 'FRED_API_V1', sourceSeriesId: meta.sourceSeriesId, transportSeriesId: meta.transportSeriesId};
  let validatedRaw;
  try {
    const output = await withFredObservations(meta.transportSeriesId, key, parsed => {
        // CPI retains its required-window policy; UNRATE needs the latest pair.
        // Keep the existing four-observation diagnostic history guard for UNRATE.
        if (metricId !== 'cpi') {
          if (metricId !== 'unemployment' && parsed.missingDates.length) fail('MISSING_OBSERVATION');
          if (parsed.points.length < 4) fail('INSUFFICIENT_HISTORY');
        }
        let normalizationPoints = parsed.points;
        if (metricId === 'unemployment') {
          const current = parsed.points.at(-1);
          const previousDate = new Date(Date.UTC(Number(current.date.slice(0, 4)), Number(current.date.slice(5, 7)) - 2, 1)).toISOString().slice(0, 10);
          const previous = parsed.points.find(point => point.date === previousDate);
          if (!previous) fail('MISSING_OBSERVATION');
          normalizationPoints = [previous, current];
        }
        const normalized = normalizeShadowSeries(metricId, normalizationPoints, {fetchedAt: new Date(now()).toISOString(), cpiRequiredWindow: metricId === 'cpi'});
        validatedRaw = parsed.points.map(({date, value}) => ({date, value}));
        return {...normalized, ...base, latestObservedAt: normalized.observedAt,
          providerUpdatedDataIsCurrent: 'unknown',
          freshnessVerification: 'REQUIRES_INDEPENDENT_LATEST_RELEASE_COMPARISON',
          realtime: parsed.realtime, recentObservations: parsed.points.slice(-4),
          csvComparison: compareCsvEvidence(metricId, parsed.points),
        };
    }, {fetchImpl, now, timeoutMs, timing});
    const result = {...output, ...timing, totalMs: now() - started};
    if (result.status === 'SUCCESS') rawHistories.set(result, validatedRaw);
    return result;
  } catch (error) {
    return {...base, status: error instanceof ProviderError ? error.status : 'REQUEST_FAILED', semantic: 'FAIL', providerUpdatedDataIsCurrent: 'unknown', ...timing, totalMs: now() - started};
  }
}
