export class DiagnosticInputError extends Error {
  constructor(status) { super(status); this.status = status; }
}
export function diagnosticNumberValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim() || !/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
const ProviderError = DiagnosticInputError;
const numberValue = diagnosticNumberValue;
import {
  BATCH_A_FRED_SERIES_IDS,
  DIAGNOSTIC_BEA_CROSSCHECKS,
  DIAGNOSTIC_BLS_FALLBACKS,
  diagnosticSeriesSpec,
} from './input-registry.mjs';

const fail = status => { throw new ProviderError(status); };
const dateValid = value =>
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value;

const MAX_FRED_PAGE = 10000;
const MAX_FRED_PAGES = 4;
const MAX_BODY_BYTES = 2_000_000;

export function diagnosticFredUrl(seriesId, key, asOf, offset = 0) {
  if (!diagnosticSeriesSpec(seriesId)) fail('INVALID_SERIES');
  if (typeof key !== 'string' || !key.trim()) fail('KEY_MISSING');
  if (!dateValid(asOf)) fail('INVALID_AS_OF');
  if (!Number.isInteger(offset) || offset < 0 || offset % MAX_FRED_PAGE !== 0) fail('INVALID_OFFSET');

  const url = new URL('https://api.stlouisfed.org/fred/series/observations');
  url.search = new URLSearchParams({
    series_id: seriesId,
    api_key: key.trim(),
    file_type: 'json',
    sort_order: 'asc',
    units: 'lin',
    observation_end: asOf,
    limit: String(MAX_FRED_PAGE),
    offset: String(offset),
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
          fail(response.status === 429 ? 'QUOTA_EXCEEDED' : 'HTTP_ERROR');
        }
        reader = response.body?.getReader();
        if (!reader) fail('INVALID_RESPONSE');
        let bytes = 0;
        let text = '';
        const decoder = new TextDecoder();
        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > maxBytes) fail('BODY_LIMIT');
          text += decoder.decode(value, {stream: true});
        }
        text += decoder.decode();
        try { return JSON.parse(text); }
        catch { fail('INVALID_JSON'); }
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new ProviderError('TIMEOUT'));
        }, Math.min(timeoutMs, 8000));
      }),
    ]);
  } catch (error) {
    if (controller.signal.aborted) throw new ProviderError('TIMEOUT');
    throw error instanceof ProviderError ? error : new ProviderError('REQUEST_FAILED');
  } finally {
    clearTimeout(timer);
    if (reader) void reader.cancel().catch(() => {});
  }
}

export function parseDiagnosticFredPage(payload, seriesId, asOf, expectedOffset = 0) {
  if (!diagnosticSeriesSpec(seriesId)) fail('INVALID_SERIES');
  if (!dateValid(asOf)) fail('INVALID_AS_OF');
  if (!payload || payload.error_code || !Array.isArray(payload.observations)) fail('INVALID_RESPONSE');
  if (payload.units !== undefined && payload.units !== 'lin') fail('TRANSFORMED_RESPONSE');

  const offset = Number(payload.offset ?? expectedOffset);
  const count = Number(payload.count ?? payload.observations.length);
  if (!Number.isInteger(offset) || offset !== expectedOffset) fail('OFFSET_MISMATCH');
  if (!Number.isInteger(count) || count < 0) fail('INVALID_COUNT');

  const byDate = new Map();
  for (const row of payload.observations) {
    if (!dateValid(row.date)) fail('INVALID_DATE');
    if (row.date > asOf) fail('FUTURE_OBSERVATION');
    const value = row.value === '.' ? null : numberValue(row.value);
    if (row.value !== '.' && value === null) fail('INVALID_NUMERIC');

    const realtimeStart = row.realtime_start ?? null;
    const realtimeEnd = row.realtime_end ?? null;
    if (realtimeStart !== null && !dateValid(realtimeStart)) fail('INVALID_REALTIME_DATE');
    if (realtimeEnd !== null && !dateValid(realtimeEnd)) fail('INVALID_REALTIME_DATE');

    const normalized = {
      observationDate: row.date,
      value,
      releaseDate: null,
      availableAt: null,
      realtimeStart,
      realtimeEnd,
      vintageId: realtimeStart || realtimeEnd ? `${realtimeStart ?? ''}:${realtimeEnd ?? ''}` : null,
      vintageMethod: 'CURRENT_VINTAGE_ONLY',
    };

    if (byDate.has(row.date) && byDate.get(row.date).value !== value) fail('DUPLICATE_CONFLICT');
    byDate.set(row.date, normalized);
  }

  const rows = [...byDate.values()]
    .filter(row => row.value !== null)
    .sort((a, b) => a.observationDate.localeCompare(b.observationDate));

  return {offset, count, received: payload.observations.length, rows};
}

export async function fetchDiagnosticFredSeries(seriesId, {
  key,
  asOf = new Date().toISOString().slice(0, 10),
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000,
} = {}) {
  const spec = diagnosticSeriesSpec(seriesId);
  if (!spec) return {seriesId, status: 'INVALID_SERIES', rows: []};

  const started = Date.now();
  const byDate = new Map();
  let requestCount = 0;
  let totalCount = null;

  try {
    for (let page = 0; page < MAX_FRED_PAGES; page++) {
      const offset = page * MAX_FRED_PAGE;
      const url = diagnosticFredUrl(seriesId, key, asOf, offset);
      const payload = await boundedJson(url, {fetchImpl, timeoutMs});
      requestCount += 1;
      const parsed = parseDiagnosticFredPage(payload, seriesId, asOf, offset);

      if (totalCount === null) totalCount = parsed.count;
      if (parsed.count !== totalCount) fail('COUNT_CHANGED_DURING_FETCH');

      for (const row of parsed.rows) {
        if (byDate.has(row.observationDate) && byDate.get(row.observationDate).value !== row.value) {
          fail('DUPLICATE_CONFLICT');
        }
        byDate.set(row.observationDate, row);
      }

      if (offset + parsed.received >= totalCount) break;
      if (page === MAX_FRED_PAGES - 1) fail('REQUEST_CAP_EXCEEDED');
    }

    const rows = [...byDate.values()].sort((a, b) => a.observationDate.localeCompare(b.observationDate));
    if (!rows.length) fail('MISSING_OBSERVATION');
    if (totalCount !== null && rows.length > totalCount) fail('INVALID_COUNT');

    return {
      seriesId,
      status: 'READY_CURRENT_VINTAGE',
      authority: spec.authority,
      transport: spec.transport,
      frequency: spec.frequency,
      roles: [...spec.roles],
      historyMode: spec.historyMode,
      releaseDatePolicy: spec.releaseDatePolicy,
      availableAtPolicy: spec.availableAtPolicy,
      asOf,
      requestCount,
      sourceCount: totalCount,
      durationMs: Date.now() - started,
      rows,
    };
  } catch (error) {
    return {
      seriesId,
      status: error instanceof ProviderError ? error.status : 'REQUEST_FAILED',
      authority: spec.authority,
      transport: spec.transport,
      frequency: spec.frequency,
      roles: [...spec.roles],
      historyMode: spec.historyMode,
      releaseDatePolicy: spec.releaseDatePolicy,
      availableAtPolicy: spec.availableAtPolicy,
      asOf,
      requestCount,
      sourceCount: totalCount,
      durationMs: Date.now() - started,
      rows: [],
    };
  }
}

export function parseDiagnosticBlsSeries(payload, fredSeriesId) {
  const mapping = DIAGNOSTIC_BLS_FALLBACKS[fredSeriesId];
  if (!mapping) fail('INVALID_SERIES');
  if (payload?.status !== 'REQUEST_SUCCEEDED' || !Array.isArray(payload?.Results?.series)) {
    fail('INVALID_RESPONSE');
  }
  const matches = payload.Results.series.filter(series => series.seriesID === mapping.seriesId);
  if (matches.length !== 1 || !Array.isArray(matches[0].data)) fail('INVALID_RESPONSE');

  const months = new Map();
  for (const row of matches[0].data) {
    if (row.period === 'M13') continue;
    if (!/^\d{4}$/.test(row.year) || !/^M(0[1-9]|1[0-2])$/.test(row.period)) fail('INVALID_DATE');
    const value = numberValue(row.value);
    if (value === null) fail('INVALID_NUMERIC');
    const observationDate = `${row.year}-${row.period.slice(1)}-01`;
    if (months.has(observationDate) && months.get(observationDate) !== value) fail('DUPLICATE_CONFLICT');
    months.set(observationDate, value);
  }

  return [...months]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([observationDate, value]) => ({
      observationDate,
      value,
      releaseDate: null,
      availableAt: null,
      vintageId: null,
      vintageMethod: 'CURRENT_VINTAGE_ONLY',
      authority: 'BLS',
      transport: 'BLS_API',
      role: mapping.role,
    }));
}

export function parseDiagnosticBeaSeries(payload, fredSeriesId) {
  const mapping = DIAGNOSTIC_BEA_CROSSCHECKS[fredSeriesId];
  if (!mapping) fail('INVALID_SERIES');
  const rows = payload?.BEAAPI?.Results?.Data;
  if (!Array.isArray(rows)) fail('INVALID_RESPONSE');

  const normalized = [];
  for (const row of rows) {
    let selected = false;
    if (fredSeriesId === 'GDPC1') selected = row.LineNumber === '1';
    if (fredSeriesId === 'PCEPILFE') {
      selected = /excluding food and energy/i.test(row.LineDescription ?? '')
        && !/market.based/i.test(row.LineDescription ?? '');
    }
    if (!selected) continue;

    const value = numberValue(
      typeof row.DataValue === 'string' ? row.DataValue.replaceAll(',', '') : row.DataValue,
    );
    if (value === null) continue;

    let observationDate = null;
    if (/^\d{4}M\d{2}$/.test(row.TimePeriod ?? '')) {
      observationDate = `${row.TimePeriod.slice(0, 4)}-${row.TimePeriod.slice(5)}-01`;
    } else if (/^\d{4}Q[1-4]$/.test(row.TimePeriod ?? '')) {
      const month = String((Number(row.TimePeriod.slice(5)) - 1) * 3 + 1).padStart(2, '0');
      observationDate = `${row.TimePeriod.slice(0, 4)}-${month}-01`;
    }
    if (!observationDate) continue;

    normalized.push({
      observationDate,
      value,
      releaseDate: null,
      availableAt: null,
      vintageId: null,
      vintageMethod: 'CURRENT_VINTAGE_ONLY',
      authority: 'BEA',
      transport: 'BEA_API',
      role: mapping.role,
    });
  }

  normalized.sort((a, b) => a.observationDate.localeCompare(b.observationDate));
  if (!normalized.length) fail('MATCHING_DATA_NOT_FOUND');
  return normalized;
}

export function batchARegistryCoverage() {
  return {
    fredSeries: BATCH_A_FRED_SERIES_IDS.length,
    blsCrossChecks: Object.keys(DIAGNOSTIC_BLS_FALLBACKS).length,
    beaCrossChecks: Object.keys(DIAGNOSTIC_BEA_CROSSCHECKS).length,
    releaseDateFabricated: false,
    availableAtFabricated: false,
  };
}
