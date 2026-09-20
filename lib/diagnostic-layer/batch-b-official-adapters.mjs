import {DiagnosticInputError, diagnosticNumberValue} from './official-macro-adapters.mjs';

const fail = status => { throw new DiagnosticInputError(status); };

const OFR_MNEMONICS = Object.freeze({
  DVP: 'REPO-DVP_AR_TOT-P',
  TRI_PARTY: 'REPO-TRIV1_AR_TOT-P',
});
const OFR_ALLOWED = new Set(Object.values(OFR_MNEMONICS));
const MAX_BODY_BYTES = 2_000_000;

const dateValid = value =>
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value;

export {OFR_MNEMONICS};

export function ofrRepoUrl(mnemonic) {
  if (!OFR_ALLOWED.has(mnemonic)) fail('INVALID_OFR_MNEMONIC');
  const url = new URL('https://data.financialresearch.gov/v1/series/timeseries');
  url.searchParams.set('mnemonic', mnemonic);
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
          {redirect: 'follow', signal: controller.signal, headers: {accept: 'application/json'}},
        ]);
        if (!response.ok) {
          if (response.body) void response.body.cancel().catch(() => {});
          fail(response.status === 429 ? 'QUOTA_EXCEEDED' : 'HTTP_ERROR');
        }
        reader = response.body?.getReader();
        if (!reader) fail('INVALID_RESPONSE');
        const decoder = new TextDecoder();
        let bytes = 0;
        let text = '';
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
          reject(new DiagnosticInputError('TIMEOUT'));
        }, Math.min(timeoutMs, 8000));
      }),
    ]);
  } catch (error) {
    if (controller.signal.aborted) throw new DiagnosticInputError('TIMEOUT');
    throw error instanceof DiagnosticInputError ? error : new DiagnosticInputError('REQUEST_FAILED');
  } finally {
    clearTimeout(timer);
    if (reader) void reader.cancel().catch(() => {});
  }
}

export function parseOfrRepoTimeseries(payload, mnemonic, asOf) {
  if (!OFR_ALLOWED.has(mnemonic)) fail('INVALID_OFR_MNEMONIC');
  if (!dateValid(asOf)) fail('INVALID_AS_OF');
  if (!Array.isArray(payload)) fail('INVALID_RESPONSE');

  const byDate = new Map();
  for (const row of payload) {
    if (!Array.isArray(row) || row.length < 2 || !dateValid(row[0])) fail('INVALID_RESPONSE');
    if (row[0] > asOf) continue;
    const value = diagnosticNumberValue(row[1]);
    if (value === null) fail('INVALID_NUMERIC');
    if (byDate.has(row[0]) && byDate.get(row[0]) !== value) fail('DUPLICATE_CONFLICT');
    byDate.set(row[0], value);
  }

  const rows = [...byDate]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([observationDate, value]) => ({
      observationDate,
      value,
      releaseDate: null,
      availableAt: null,
      vintageId: null,
      vintageMethod: 'CURRENT_VINTAGE_ONLY',
    }));
  if (!rows.length) fail('MISSING_OBSERVATION');
  return rows;
}

export async function fetchOfrRepoSeries(mnemonic, {
  asOf = new Date().toISOString().slice(0, 10),
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000,
} = {}) {
  const started = Date.now();
  try {
    const payload = await boundedJson(ofrRepoUrl(mnemonic), {fetchImpl, timeoutMs});
    const rows = parseOfrRepoTimeseries(payload, mnemonic, asOf);
    return {
      mnemonic,
      status: 'READY_CURRENT_VINTAGE',
      authority: 'OFR',
      transport: 'OFR_PUBLIC_API',
      historyMode: 'CURRENT_VINTAGE_ONLY',
      releaseDatePolicy: 'NULL_UNTIL_PROVEN',
      availableAtPolicy: 'NULL_UNTIL_PROVEN',
      requestCount: 1,
      durationMs: Date.now() - started,
      rows,
    };
  } catch (error) {
    return {
      mnemonic,
      status: error instanceof DiagnosticInputError ? error.status : 'REQUEST_FAILED',
      authority: 'OFR',
      transport: 'OFR_PUBLIC_API',
      historyMode: 'CURRENT_VINTAGE_ONLY',
      releaseDatePolicy: 'NULL_UNTIL_PROVEN',
      availableAtPolicy: 'NULL_UNTIL_PROVEN',
      requestCount: 1,
      durationMs: Date.now() - started,
      rows: [],
    };
  }
}
