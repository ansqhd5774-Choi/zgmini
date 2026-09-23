import {DIAGNOSTIC_FRED_SERIES} from '../lib/diagnostic-layer/input-registry.mjs';
import {fetchDiagnosticFredSeries} from '../lib/diagnostic-layer/official-macro-adapters.mjs';
import {OFR_MNEMONICS, fetchOfrRepoSeries} from '../lib/diagnostic-layer/batch-b-official-adapters.mjs';
import {
  fetchCmdiWorkbook,
  fetchGscpiWorkbook,
  fetchWorldBankCopper,
} from '../lib/diagnostic-layer/nyfed-worldbank-adapters.mjs';
import {parseBisColumnCsv} from '../lib/diagnostic-layer/bis-bulk-parser.mjs';
import {unzipSelected} from '../lib/diagnostic-layer/xlsx-lite.mjs';
import {buildFullDiagnosticOrchestrator} from '../lib/diagnostic-layer/full-diagnostic-orchestrator.mjs';
import {collectBreadthB1R1Runtime} from '../lib/market-score/breadth-b1-r1-runtime.mjs';
import {collectEarningsE1R2PublicDomain} from '../lib/market-score/sec-earnings-e1-r2-provider.mjs';
import {fetchSecRegisteredFundFlows} from '../lib/market-score/sec-fund-flow-r1-provider.mjs';

const OPERATOR_ENV = 'KFG_V2_CANARY_OPERATOR_EMAIL';
const REQUEST_CAP = 64;
const FRED_CONCURRENCY = 6;
const ALLOWED_HOSTS = new Set([
  'api.stlouisfed.org',
  'data.financialresearch.gov',
  'www.newyorkfed.org',
  'thedocs.worldbank.org',
  'data.bis.org',
  'www.sec.gov',
  'sec.gov',
  'data.sec.gov',
  'en.wikipedia.org',
]);

const BIS_DATASETS = Object.freeze({
  WS_DSR: Object.freeze({
    url: 'https://data.bis.org/static/bulk/WS_DSR_csv_col.zip',
    csv: 'WS_DSR_csv_col.csv',
  }),
  WS_TC: Object.freeze({
    url: 'https://data.bis.org/static/bulk/WS_TC_csv_col.zip',
    csv: 'WS_TC_csv_col.csv',
  }),
});

const finite = value => typeof value === 'number' && Number.isFinite(value);
const validDate = value =>
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value;
const normalizeEmail = value =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null;

class DiagnosticCanaryError extends Error {
  constructor(status) {
    super(status);
    this.name = 'DiagnosticCanaryError';
    this.status = status;
  }
}
const fail = status => { throw new DiagnosticCanaryError(status); };

function safeJson(body, status = 200) {
  return Response.json(
    {temporary: 'TEMPORARY_DIAGNOSTIC_V1_CANARY_ONLY', ...body},
    {
      status,
      headers: {
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex, nofollow',
      },
    },
  );
}

function createCountedFetch(fetchImpl, requestCap = REQUEST_CAP) {
  let count = 0;
  const networkLog = [];
  const countedFetch = async (input, init) => {
    const raw = input instanceof Request ? input.url : String(input);
    const url = new URL(raw);
    if (!ALLOWED_HOSTS.has(url.hostname)) fail('HOST_NOT_ALLOWED');
    if (count >= requestCap) fail('REQUEST_CAP_EXCEEDED');
    count += 1;
    const response = await Reflect.apply(fetchImpl, globalThis, [input, init]);
    networkLog.push({host: url.hostname, status: response.status});
    return response;
  };
  return {
    fetchImpl: countedFetch,
    requestCount: () => count,
    networkLog: () => [...networkLog],
  };
}

async function mapLimit(items, limit, fn) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      output[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, () => worker()));
  return output;
}

async function readResponseBytes(response, maxBytes = 25_000_000) {
  if (!response.ok) fail(response.status === 429 ? 'QUOTA_EXCEEDED' : 'HTTP_ERROR');
  const reader = response.body?.getReader();
  if (!reader) fail('INVALID_RESPONSE');
  const chunks = [];
  let total = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) fail('BODY_LIMIT');
    chunks.push(value);
  }
  return new Uint8Array(await new Blob(chunks).arrayBuffer());
}

export async function fetchBisBulkDataset(dataset, {
  fetchImpl = globalThis.fetch,
} = {}) {
  const spec = BIS_DATASETS[dataset];
  if (!spec) return {dataset, status: 'INVALID_DATASET', requestCount: 0, parsed: null};

  try {
    const response = await Reflect.apply(fetchImpl, globalThis, [
      new URL(spec.url),
      {redirect: 'follow', headers: {accept: 'application/zip,*/*'}},
    ]);
    const bytes = await readResponseBytes(response);
    const entries = await unzipSelected(bytes, {
      include: name => name.endsWith(spec.csv),
      maxEntries: 64,
      maxEntryBytes: 50_000_000,
      maxTotalBytes: 50_000_000,
    });
    const entry = [...entries].find(([name]) => name.endsWith(spec.csv));
    if (!entry) fail('BIS_CSV_NOT_FOUND');
    const csvText = new TextDecoder('utf-8').decode(entry[1]);
    return {
      dataset,
      status: 'READY_CURRENT_VINTAGE_RAW',
      requestCount: 1,
      parsed: parseBisColumnCsv(csvText, dataset),
    };
  } catch (error) {
    return {
      dataset,
      status: error?.status ?? 'REQUEST_FAILED',
      requestCount: 0,
      parsed: null,
    };
  }
}

const DEFAULT_ADAPTERS = Object.freeze({
  fetchFred: fetchDiagnosticFredSeries,
  fetchOfr: fetchOfrRepoSeries,
  fetchCmdi: fetchCmdiWorkbook,
  fetchGscpi: fetchGscpiWorkbook,
  fetchCopper: fetchWorldBankCopper,
  fetchBis: fetchBisBulkDataset,
  fetchFundFlows: fetchSecRegisteredFundFlows,
  fetchEarnings: collectEarningsE1R2PublicDomain,
});

export async function collectDiagnosticLiveInputs({
  env,
  asOf,
  fetchImpl = globalThis.fetch,
  requestCap = REQUEST_CAP,
  adapters = {},
} = {}) {
  if (!validDate(asOf)) fail('INVALID_AS_OF');
  if (typeof env?.FRED_API_KEY !== 'string' || !env.FRED_API_KEY.trim()) {
    fail('FRED_API_KEY_MISSING');
  }

  const bounded = createCountedFetch(fetchImpl, requestCap);
  const impl = {...DEFAULT_ADAPTERS, ...adapters};
  const fredIds = Object.keys(DIAGNOSTIC_FRED_SERIES);

  const [fredResults, externalResults, fundFlows, breadth, earnings] = await Promise.all([
  mapLimit(fredIds, FRED_CONCURRENCY, seriesId =>
    impl.fetchFred(seriesId, {
      key: env.FRED_API_KEY,
      asOf,
      fetchImpl: bounded.fetchImpl,
      timeoutMs: 8000,
    })
  ),
  Promise.all([
    impl.fetchOfr(OFR_MNEMONICS.DVP, {
      asOf,
      fetchImpl: bounded.fetchImpl,
      timeoutMs: 8000,
    }),
    impl.fetchOfr(OFR_MNEMONICS.TRI_PARTY, {
      asOf,
      fetchImpl: bounded.fetchImpl,
      timeoutMs: 8000,
    }),
    impl.fetchCmdi({
      fetchImpl: bounded.fetchImpl,
      timeoutMs: 12000,
      maxBytes: 15_000_000,
      maxRequests: 4,
    }),
    impl.fetchGscpi({
      fetchImpl: bounded.fetchImpl,
      timeoutMs: 12000,
      maxBytes: 15_000_000,
      maxRequests: 4,
    }),
    impl.fetchCopper({
      fetchImpl: bounded.fetchImpl,
      timeoutMs: 12000,
      maxBytes: 15_000_000,
      maxRequests: 4,
    }),
    impl.fetchBis('WS_DSR', {fetchImpl: bounded.fetchImpl}),
    impl.fetchBis('WS_TC', {fetchImpl: bounded.fetchImpl}),
  ]),
  impl.fetchFundFlows({fetchImpl: bounded.fetchImpl}),
  collectBreadthB1R1Runtime({env, fetchImpl}),
  impl.fetchEarnings({asOf, fetchImpl:bounded.fetchImpl}),
  ]);
  const [dvp,triParty,cmdi,gscpi,copper,bisDsr,bisTc]=externalResults;

  const series = {};
  for (const result of fredResults) {
    if (result?.status === 'READY_CURRENT_VINTAGE' && Array.isArray(result.rows)) {
      series[result.seriesId] = result.rows;
    }
  }

  const fredFailed = fredResults
    .filter(result => result?.status !== 'READY_CURRENT_VINTAGE')
    .map(result => ({seriesId: result?.seriesId ?? null, status: result?.status ?? 'UNKNOWN'}));

  const latestDate = rows =>
    Array.isArray(rows) && rows.length ? rows.at(-1)?.observationDate ?? null : null;


return {
    series,
    external: {
      publicDomainScores: {breadth, earnings},
      registeredFundFlowRows: fundFlows?.status === 'READY_CURRENT_VINTAGE_RAW' ? fundFlows.rows : [],
      dvpRepoRows: dvp?.status === 'READY_CURRENT_VINTAGE' ? dvp.rows : [],
      triPartyRepoRows: triParty?.status === 'READY_CURRENT_VINTAGE' ? triParty.rows : [],
      cmdiRows: cmdi?.status === 'READY_CURRENT_VINTAGE_RAW' ? cmdi.rows : [],
      gscpiRows: gscpi?.status === 'READY_CURRENT_VINTAGE_RAW' ? gscpi.rows : [],
      copperRows: copper?.status === 'READY_CURRENT_VINTAGE_RAW' ? copper.rows : [],
      bisDsrParsed: bisDsr?.status === 'READY_CURRENT_VINTAGE_RAW' ? bisDsr.parsed : null,
      bisDebtGdpParsed: bisTc?.status === 'READY_CURRENT_VINTAGE_RAW' ? bisTc.parsed : null,

      // Intentionally unresolved / separately deferred inputs.
      assetPriceRows: [],
      speculativeFlowMagnitude4QRows: [],
      breadthScoreRows: [],
      earningsScores: null,
    },    providerSummary: {
      secFundFlows: {
        status: fundFlows?.status ?? 'UNKNOWN',
        rows: Array.isArray(fundFlows?.rows) ? fundFlows.rows.length : 0,
        latest: latestDate(fundFlows?.rows),
        sourceReleaseDate: fundFlows?.sourceReleaseDate ?? null,
      },
      fred: {
        requested: fredIds.length,
        ready: fredIds.length - fredFailed.length,
        failed: fredFailed,
      },
      ofr: {
        dvp: {status: dvp?.status ?? 'UNKNOWN', latest: latestDate(dvp?.rows)},
        triParty: {status: triParty?.status ?? 'UNKNOWN', latest: latestDate(triParty?.rows)},
      },
      cmdi: {
        status: cmdi?.status ?? 'UNKNOWN',
        rows: Array.isArray(cmdi?.rows) ? cmdi.rows.length : 0,
        latest: latestDate(cmdi?.rows),
      },
      gscpi: {
        status: gscpi?.status ?? 'UNKNOWN',
        rows: Array.isArray(gscpi?.rows) ? gscpi.rows.length : 0,
        latest: latestDate(gscpi?.rows),
      },
      copper: {
        status: copper?.status ?? 'UNKNOWN',
        rows: Array.isArray(copper?.rows) ? copper.rows.length : 0,
        latest: latestDate(copper?.rows),
      },
      bis: {
        dsr: {status: bisDsr?.status ?? 'UNKNOWN'},
        debtGdp: {status: bisTc?.status ?? 'UNKNOWN'},
      },
      earnings: {
        status: earnings?.status ?? 'UNKNOWN',
        methodologyVersion: earnings?.methodologyVersion ?? null,
        asOfDate: earnings?.asOfDate ?? null,
        financialPeriodEnd: earnings?.financialPeriodEnd ?? null,
        providerRequests: earnings?.providerRequests ?? 0,
      },
      deferred: {
        assetPriceRuntime: 'DEFERRED_NON_BLOCKING',
        speculativeFlowRawRuntime: 'DEFERRED_NON_BLOCKING',
        earningsHistoricalPointInTime: 'RESEARCH_VALIDATED_RUNTIME_CURRENT_ONLY',
        assetBreadthPointInTime: 'PARTIAL',
      },
    },
    requestCount: bounded.requestCount(),
    networkLog: bounded.networkLog(),
  };
}

export function summarizeDiagnosticCanary(result, collected) {
  const diagnostics = Object.fromEntries(
    Object.entries(result?.snapshot?.diagnostics ?? {}).map(([key, value]) => [
      key,
      {
        status: value?.status ?? 'UNKNOWN',
        score: finite(value?.score) ? value.score : null,
        missing: Array.isArray(value?.missing) ? value.missing : [],
      },
    ]),
  );

  return {
    status: 'SUCCESS',
    diagnosticStatus: result?.status ?? 'PARTIAL',
    asOfDate: result?.asOfDate ?? null,
    activeRevision: result?.activeRevision ?? 'DIAGNOSTIC_SCORE_TRANSFORM_R1',
    requestCount: collected?.requestCount ?? 0,
    providerSummary: collected?.providerSummary ?? {},
    diagnostics,
    overlay: result?.snapshot?.overlay ?? null,
    partials: result?.partials ?? {},
    limitations: result?.limitations ?? {},
  };
}

export function createDiagnosticV1CanaryHandler({
  authenticate,
  env,
  fetchImpl = globalThis.fetch,
  collectInputs = collectDiagnosticLiveInputs,
  orchestrate = buildFullDiagnosticOrchestrator,
} = {}) {
  if (typeof authenticate !== 'function') throw new Error('AUTHENTICATOR_REQUIRED');

  return async request => {
    if (request.method !== 'POST') {
      return safeJson({status: 'FAILED', reason: 'METHOD_NOT_ALLOWED'}, 405);
    }

    const user = await authenticate(request);
    const email = normalizeEmail(user?.email);
    if (!user?.userId || !email) {
      return safeJson({status: 'FAILED', reason: 'AUTH_REQUIRED'}, 401);
    }

    const operator = normalizeEmail(env?.[OPERATOR_ENV]);
    if (!operator) {
      return safeJson({status: 'FAILED', reason: 'OPERATOR_NOT_CONFIGURED'}, 503);
    }
    if (email !== operator) {
      return safeJson({status: 'FAILED', reason: 'OPERATOR_REQUIRED'}, 403);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return safeJson({status: 'FAILED', reason: 'INVALID_JSON'}, 400);
    }

    if (!validDate(body?.asOf)) {
      return safeJson({status: 'FAILED', reason: 'INVALID_AS_OF'}, 400);
    }
    if (!finite(body?.baseOverall) || body.baseOverall < 0 || body.baseOverall > 100) {
      return safeJson({status: 'FAILED', reason: 'INVALID_BASE_OVERALL'}, 400);
    }

    try {
      const collected = await collectInputs({
        env,
        asOf: body.asOf,
        fetchImpl,
        requestCap: REQUEST_CAP,
      });
      const result = orchestrate({
        asOfDate: body.asOf,
        baseOverall: body.baseOverall,
        series: collected.series,
        external: collected.external,
      });
      return safeJson(summarizeDiagnosticCanary(result, collected), 200);
    } catch (error) {
      return safeJson({
        status: 'FAILED',
        reason: error?.status ?? 'DIAGNOSTIC_CANARY_FAILED',
      }, 502);
    }
  };
}

export const DIAGNOSTIC_V1_CANARY_CONTRACT = Object.freeze({
  temporary: true,
  method: 'POST',
  operatorEnv: OPERATOR_ENV,
  requestCap: REQUEST_CAP,
  publicContractChanged: false,
  historyMode: 'CURRENT_VINTAGE_ONLY',
  lookAheadSafe: false,
});
