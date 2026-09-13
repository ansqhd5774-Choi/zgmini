import {ProviderError, numberValue} from './providers.mjs';
const fail = status => {throw new ProviderError(status);};
const monthly = Object.freeze({nativeFrequency: 'MONTHLY', datePolicy: 'MONTH_START', limit: 100});
export const FRED_PROFILES = Object.freeze({
  CPIAUCNS: monthly, PPIFIS: monthly, UNRATE: monthly, PAYEMS: monthly,
  PCEPILFE: Object.freeze({...monthly, valueMeaning: 'RAW_INDEX_LEVEL', authority: 'BEA'}),
  DCOILWTICO: Object.freeze({nativeFrequency: 'DAILY', datePolicy: 'ISO_CALENDAR_DATE', limit: 1000, valueMeaning: 'RAW_PRICE_LEVEL', authority: 'EIA'}),
});
const dateValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function observationsUrl(seriesId, key, now = new Date()) {
  if (!Object.hasOwn(FRED_PROFILES, seriesId)) fail('INVALID_SERIES');
  const profile = FRED_PROFILES[seriesId];
  if (typeof key !== 'string' || !key.trim()) fail('KEY_MISSING');
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 18, 1));
  const url = new URL('https://api.stlouisfed.org/fred/series/observations');
  url.search = new URLSearchParams({series_id: seriesId, api_key: key.trim(), file_type: 'json', sort_order: 'asc', units: 'lin', observation_start: start.toISOString().slice(0, 10), observation_end: now.toISOString().slice(0, 10), limit: String(profile.limit), offset: '0'});
  // Internal request URL only: never serialize or log this object.
  return url;
}

export function parseObservations(payload, seriesId = 'CPIAUCNS') {
  if (!Object.hasOwn(FRED_PROFILES, seriesId)) fail('INVALID_SERIES');
  const profile = FRED_PROFILES[seriesId];
  if (!payload || payload.error_code || !Array.isArray(payload.observations)) fail('INVALID_RESPONSE');
  if (payload.units !== undefined && payload.units !== 'lin') fail('TRANSFORMED_RESPONSE');
  if (payload.offset !== undefined && payload.offset !== 0) fail('INCOMPLETE_RESPONSE');
  if (payload.count !== undefined && (!Number.isInteger(payload.count) || payload.count !== payload.observations.length)) fail('INCOMPLETE_RESPONSE');
  const byDate = new Map();
  for (const row of payload.observations) {
    if (!dateValid(row.date) || (profile.datePolicy === 'MONTH_START' && !row.date.endsWith('-01'))) fail('INVALID_DATE');
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

/** Extracted official shadow transport; one bounded request, no retries/CSV. */
export async function withFredObservations(seriesId, key, consume, {fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = 8000, timing = {}} = {}) {
  const started = now(), controller = new AbortController();
  let timer, reader;
  try {
    return await Promise.race([
      (async () => {
        const url = observationsUrl(seriesId, key, new Date(started));
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
        return consume(parseObservations(payload, seriesId));
      })(),
      new Promise((_, reject) => {timer = setTimeout(() => {controller.abort(); reject(new ProviderError('TIMEOUT'));}, Math.min(timeoutMs, 8000));}),
    ]);
  } catch (error) {
    if (controller.signal.aborted) throw new ProviderError('TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timer);
    if (reader) void reader.cancel().catch(() => {});
  }
}

