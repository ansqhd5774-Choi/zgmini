import {ProviderError, numberValue} from './providers.mjs';
import {normalizeShadowSeries, SHADOW_SERIES} from './fred-bls-shadow.mjs';

const fail = status => { throw new ProviderError(status); };
// Internal raw history is not part of the diagnostic JSON/public contract.
const rawHistories = new WeakMap();
export function getApiRawHistory(result) {
  return rawHistories.get(result)?.map(({date, value}) => ({date, value}));
}
const dateValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function observationsUrl(seriesId, key, now = new Date()) {
  if (!Object.values(SHADOW_SERIES).some(x => x.transportSeriesId === seriesId)) fail('INVALID_SERIES');
  if (typeof key !== 'string' || !key.trim()) fail('KEY_MISSING');
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 18, 1));
  const url = new URL('https://api.stlouisfed.org/fred/series/observations');
  url.search = new URLSearchParams({series_id: seriesId, api_key: key.trim(), file_type: 'json', sort_order: 'asc', units: 'lin', observation_start: start.toISOString().slice(0, 10), observation_end: now.toISOString().slice(0, 10), limit: '100', offset: '0'});
  // Internal request URL only: never serialize or log this object.
  return url;
}

export function parseObservations(payload) {
  if (!payload || payload.error_code || !Array.isArray(payload.observations)) fail('INVALID_RESPONSE');
  if (payload.units !== undefined && payload.units !== 'lin') fail('TRANSFORMED_RESPONSE');
  if (payload.offset !== undefined && payload.offset !== 0) fail('INCOMPLETE_RESPONSE');
  if (payload.count !== undefined && (!Number.isInteger(payload.count) || payload.count !== payload.observations.length)) fail('INCOMPLETE_RESPONSE');
  const byDate = new Map();
  for (const row of payload.observations) {
    if (!dateValid(row.date) || !row.date.endsWith('-01')) fail('INVALID_DATE');
    const value = row.value === '.' ? null : numberValue(row.value);
    if (row.value !== '.' && value === null) fail('INVALID_NUMERIC');
    const realtime = {};
    for (const field of ['realtime_start', 'realtime_end']) {
      if (row[field] !== undefined) {if (!dateValid(row[field])) fail('INVALID_REALTIME_DATE'); realtime[field] = row[field];}
    }
    if (byDate.has(row.date) && byDate.get(row.date).value !== value) fail('DUPLICATE_CONFLICT');
    byDate.set(row.date, {date: row.date, value, ...realtime});
  }
  const all = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const realtime = {};
  for (const field of ['realtime_start', 'realtime_end']) {
    if (payload[field] !== undefined) {if (!dateValid(payload[field])) fail('INVALID_REALTIME_DATE'); realtime[field] = payload[field];}
  }
  return {points: all.filter(p => p.value !== null), missingDates: all.filter(p => p.value === null).map(p => p.date), realtime};
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
  const controller = new AbortController();
  let timer, reader, validatedRaw;
  try {
    const output = await Promise.race([
      (async () => {
        const url = observationsUrl(meta.transportSeriesId, key, new Date(started));
        const response = await Reflect.apply(fetchImpl, globalThis, [url, {redirect: 'manual', signal: controller.signal, headers: {accept: 'application/json'}}]);
        timing.httpStatus = response.status; timing.headersMs = now() - started;
        if (!response.ok) {if (response.body) void response.body.cancel().catch(() => {}); fail('HTTP_ERROR');}
        reader = response.body?.getReader();
        if (!reader) fail('INVALID_RESPONSE');
        let bytes = 0, text = ''; const decoder = new TextDecoder();
        while (true) {
          const {done, value} = await reader.read(); if (done) break;
          bytes += value.byteLength; if (bytes > 262144) fail('BODY_LIMIT');
          text += decoder.decode(value, {stream: true});
        }
        text += decoder.decode(); timing.bodyReadCompleteMs = now() - started;
        let payload; try {payload = JSON.parse(text);} catch {fail('INVALID_JSON');}
        const parsed = parseObservations(payload);
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
      })(),
      new Promise((_, reject) => {timer = setTimeout(() => {controller.abort(); reject(new ProviderError('TIMEOUT'));}, Math.min(timeoutMs, 8000));}),
    ]);
    const result = {...output, ...timing, totalMs: now() - started};
    if (result.status === 'SUCCESS') rawHistories.set(result, validatedRaw);
    return result;
  } catch (error) {
    return {...base, status: controller.signal.aborted ? 'TIMEOUT' : error instanceof ProviderError ? error.status : 'REQUEST_FAILED', semantic: 'FAIL', providerUpdatedDataIsCurrent: 'unknown', ...timing, totalMs: now() - started};
  } finally {
    clearTimeout(timer);
    if (reader) void reader.cancel().catch(() => {});
  }
}
