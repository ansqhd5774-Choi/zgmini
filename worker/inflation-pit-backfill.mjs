import {persistInflationApiHistory} from './api-history-store.mjs';

export const INFLATION_PIT_SERIES = Object.freeze([
  'PCEPILFE',
  'PCEPI',
  'CPILFESL',
  'CPIAUCSL',
  'EXPINF5YR',
  'INDPRO',
  'MCOILWTICO',
  'GASREGCOVM',
  'MEDCPIM094SFRBCLE',
  'TRMMEANCPIM094SFRBCLE',
  'PPIFIS',
  'WPSFD49116',
  'IREXFUELS',
  'CES0500000003',
  'ECIALLCIV',
  'PRS85006111',
]);

export const INFLATION_PIT_BATCHES = Object.freeze([
  Object.freeze(INFLATION_PIT_SERIES.slice(0, 8)),
  Object.freeze(INFLATION_PIT_SERIES.slice(8, 16)),
]);

const PIT_SET = new Set(INFLATION_PIT_SERIES);
const MAX_REQUESTS_PER_RUN = 8;
const MAX_BODY_BYTES = 4_000_000;
const validDate = value =>
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value;
const finite = value => typeof value === 'number' && Number.isFinite(value);

export function fredInitialReleaseUrl(seriesId, key, {
  observationEnd = new Date().toISOString().slice(0, 10),
} = {}) {
  if (!PIT_SET.has(seriesId)) throw new Error('PIT_SERIES_NOT_ALLOWED');
  if (typeof key !== 'string' || !key.trim()) throw new Error('FRED_API_KEY_MISSING');
  if (!validDate(observationEnd)) throw new Error('PIT_OBSERVATION_END_INVALID');
  const url = new URL('https://api.stlouisfed.org/fred/series/observations');
  url.search = new URLSearchParams({
    series_id: seriesId,
    api_key: key.trim(),
    file_type: 'json',
    units: 'lin',
    sort_order: 'asc',
    output_type: '4',
    realtime_start: '1776-07-04',
    realtime_end: '9999-12-31',
    observation_end: observationEnd,
    limit: '100000',
    offset: '0',
  });
  return url;
}

async function boundedJson(url, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000,
  maxBytes = MAX_BODY_BYTES,
} = {}) {
  const controller = new AbortController();
  let timer;
  let reader;
  try {
    return await Promise.race([
      (async () => {
        const response = await Reflect.apply(fetchImpl, globalThis, [
          url,
          {redirect: 'manual', signal: controller.signal, headers: {accept: 'application/json'}},
        ]);
        if (!response.ok) {
          if (response.body) void response.body.cancel().catch(() => {});
          throw new Error(response.status === 429 ? 'QUOTA_EXCEEDED' : 'HTTP_ERROR');
        }
        reader = response.body?.getReader();
        if (!reader) throw new Error('INVALID_RESPONSE');
        let total = 0;
        let text = '';
        const decoder = new TextDecoder();
        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > maxBytes) throw new Error('BODY_LIMIT');
          text += decoder.decode(value, {stream: true});
        }
        text += decoder.decode();
        try { return JSON.parse(text); }
        catch { throw new Error('INVALID_JSON'); }
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('TIMEOUT'));
        }, Math.min(timeoutMs, 8000));
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (reader) void reader.cancel().catch(() => {});
  }
}

export function parseFredInitialReleasePayload(payload, seriesId, {
  observationEnd,
} = {}) {
  if (!PIT_SET.has(seriesId)) throw new Error('PIT_SERIES_NOT_ALLOWED');
  if (!validDate(observationEnd)) throw new Error('PIT_OBSERVATION_END_INVALID');
  if (!payload || payload.error_code || !Array.isArray(payload.observations)) {
    throw new Error('INVALID_RESPONSE');
  }
  if (payload.output_type !== undefined && Number(payload.output_type) !== 4) {
    throw new Error('PIT_OUTPUT_TYPE_MISMATCH');
  }
  const byDate = new Map();
  for (const row of payload.observations) {
    if (!validDate(row?.date) || row.date > observationEnd) throw new Error('INVALID_OBSERVATION_DATE');
    if (!validDate(row?.realtime_start) || row.realtime_start > observationEnd) {
      throw new Error('INVALID_INITIAL_RELEASE_DATE');
    }
    if (row.realtime_end != null && row.realtime_end !== '.' && !validDate(row.realtime_end)) {
      throw new Error('INVALID_REALTIME_END');
    }
    if (row.value === '.') continue;
    const value = Number(row.value);
    if (!finite(value)) throw new Error('INVALID_NUMERIC');
    const normalized = {
      observationDate: row.date,
      value,
      releaseDate: row.realtime_start,
      availableAt: row.realtime_start,
      realtimeStart: row.realtime_start,
      realtimeEnd: validDate(row.realtime_end) ? row.realtime_end : null,
      vintageId: row.realtime_start,
      vintageMethod: 'FRED_INITIAL_RELEASE_OUTPUT_TYPE_4',
      revision: 'INITIAL_RELEASE',
    };
    if (byDate.has(row.date)) {
      const prior = byDate.get(row.date);
      if (prior.value !== value || prior.availableAt !== normalized.availableAt) {
        throw new Error('INITIAL_RELEASE_DUPLICATE_CONFLICT');
      }
    }
    byDate.set(row.date, normalized);
  }
  const rows = [...byDate.values()].sort((a, b) => a.observationDate.localeCompare(b.observationDate));
  if (!rows.length) throw new Error('MISSING_OBSERVATION');
  return rows;
}

export async function fetchFredInitialReleaseSeries(seriesId, {
  key,
  observationEnd = new Date().toISOString().slice(0, 10),
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000,
} = {}) {
  const url = fredInitialReleaseUrl(seriesId, key, {observationEnd});
  const payload = await boundedJson(url, {fetchImpl, timeoutMs});
  const rows = parseFredInitialReleasePayload(payload, seriesId, {observationEnd});
  return {
    seriesId,
    status: 'READY_INITIAL_RELEASE_HISTORY',
    authority: 'FRED_SOURCE_AUTHORITY_PRESERVED_BY_SERIES',
    transport: 'FRED_API_OUTPUT_TYPE_4',
    frequency: null,
    historyMode: 'INITIAL_RELEASE_ONLY',
    releaseDatePolicy: 'FRED_REALTIME_START_INITIAL_RELEASE',
    availableAtPolicy: 'FRED_REALTIME_START_INITIAL_RELEASE',
    asOf: observationEnd,
    requestCount: 1,
    sourceCount: Number.isInteger(Number(payload.count)) ? Number(payload.count) : rows.length,
    rows,
  };
}

export async function collectInflationPitBatch({
  key,
  batch = 1,
  observationEnd = new Date().toISOString().slice(0, 10),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!Number.isInteger(batch) || batch < 1 || batch > INFLATION_PIT_BATCHES.length) {
    throw new Error('PIT_BATCH_INVALID');
  }
  const seriesIds = INFLATION_PIT_BATCHES[batch - 1];
  if (typeof key !== 'string' || !key.trim()) throw new Error('FRED_API_KEY_MISSING');
  if (seriesIds.length > MAX_REQUESTS_PER_RUN) throw new Error('PIT_REQUEST_CAP_EXCEEDED');
  const results = [];
  let requestCount = 0;
  for (const seriesId of seriesIds) {
    requestCount += 1;
    if (requestCount > MAX_REQUESTS_PER_RUN) throw new Error('PIT_REQUEST_CAP_EXCEEDED');
    try {
      const result = await fetchFredInitialReleaseSeries(seriesId, {
        key,
        observationEnd,
        fetchImpl,
      });
      results.push(result);
    } catch (error) {
      // No automatic retry. Each series is attempted at most once per run.
      results.push({
        seriesId,
        status: error instanceof Error ? error.message : 'PIT_REQUEST_FAILED',
        historyMode: 'INITIAL_RELEASE_ONLY',
        requestCount: 1,
        rows: [],
      });
    }
  }
  return {batch, seriesIds: [...seriesIds], requestCount, results};
}

export async function persistInflationPitBatch(db, {
  key,
  batch = 1,
  observationEnd = new Date().toISOString().slice(0, 10),
  retrievedAt = new Date().toISOString(),
  fetchImpl = globalThis.fetch,
} = {}) {
  const collected = await collectInflationPitBatch({key, batch, observationEnd, fetchImpl});
  const ready = collected.results.filter(result => result.status === 'READY_INITIAL_RELEASE_HISTORY');
  const storage = await persistInflationApiHistory(db, ready, {
    asOf: observationEnd,
    retrievedAt,
  });
  return {
    status: ready.length === collected.seriesIds.length ? 'STORED' : ready.length ? 'PARTIAL' : 'FAILED',
    batch,
    seriesIds: collected.seriesIds,
    requestCount: collected.requestCount,
    readyCount: ready.length,
    failed: collected.results
      .filter(result => result.status !== 'READY_INITIAL_RELEASE_HISTORY')
      .map(result => ({seriesId: result.seriesId, status: result.status})),
    storage,
  };
}

export const INFLATION_PIT_BACKFILL_CONTRACT = Object.freeze({
  schemaVersion: 1,
  purpose: 'API_COLLECTION_TO_STORED_PIT_HISTORY_ONLY',
  outputType: 4,
  historyMode: 'INITIAL_RELEASE_ONLY',
  batches: INFLATION_PIT_BATCHES,
  maxRequestsPerRun: MAX_REQUESTS_PER_RUN,
  automaticRetries: 0,
  scoringReadsLiveProvider: false,
  wiredToPublicRoute: false,
});
