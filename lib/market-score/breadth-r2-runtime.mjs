import {
  fetchBeaForeignPortfolio,
  fetchSecShareFrame,
  fetchCftcTff,
  CFTC_REQUIRED_CONTRACT_CODES,
} from "./breadth-r2-provider-client.mjs";

import {
  buildBreadthR2CandidateSnapshot,
  assertCandidateOnlySnapshot,
} from "./breadth-r2-pipeline.mjs";

export const BREADTH_R2_RUNTIME_VERSION = "BREADTH-R2-RUNTIME-CANDIDATE-R59";

const DAY_MS = 86_400_000;

const DEFAULT_STALE_FALLBACK_MS = Object.freeze({
  BEA: 120 * DAY_MS,
  SEC: 150 * DAY_MS,
  CFTC: 14 * DAY_MS,
});

const finite = value => typeof value === "number" && Number.isFinite(value);

function sleep(ms) {
  return ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : Promise.resolve();
}

function canonical(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, canonical(value[key])])
  );
}

function canonicalJson(value) {
  return JSON.stringify(canonical(value));
}

async function sha256Hex(value) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WEB_CRYPTO_REQUIRED");
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : canonicalJson(value));
  const digest = await subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
}

function isoNow(now) {
  const value = typeof now === "function" ? now() : new Date();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error("RUNTIME_NOW_INVALID");
  return date.toISOString();
}

function ageMs(record, nowIso) {
  const a = Date.parse(record?.retrievedAt ?? "");
  const b = Date.parse(nowIso);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, b - a) : Infinity;
}

export function createMemoryBreadthR2Store() {
  const rawByHash = new Map();
  const latestBySource = new Map();
  const snapshots = new Map();
  const events = [];

  return {
    async getLatestRaw(sourceKey) {
      const hash = latestBySource.get(sourceKey);
      return hash ? rawByHash.get(hash) ?? null : null;
    },

    async putRaw(record) {
      if (!record || typeof record !== "object") throw new TypeError("RAW_RECORD_REQUIRED");
      if (!record.sourceKey || !record.contentHash) throw new Error("RAW_RECORD_IDENTITY_REQUIRED");

      const existing = rawByHash.get(record.contentHash);
      const deduplicated = Boolean(existing);

      if (!deduplicated) {
        rawByHash.set(record.contentHash, structuredClone(record));
      }

      latestBySource.set(record.sourceKey, record.contentHash);
      events.push({
        type: deduplicated ? "RAW_SEEN_AGAIN" : "RAW_STORED",
        sourceKey: record.sourceKey,
        contentHash: record.contentHash,
        retrievedAt: record.retrievedAt,
      });

      return {
        deduplicated,
        record: structuredClone(rawByHash.get(record.contentHash)),
      };
    },

    async getSnapshot(cacheKey) {
      const value = snapshots.get(cacheKey);
      return value ? structuredClone(value) : null;
    },

    async putSnapshot(cacheKey, value) {
      snapshots.set(cacheKey, structuredClone(value));
      events.push({ type: "SNAPSHOT_STORED", cacheKey });
      return structuredClone(value);
    },

    async dump() {
      return {
        rawRecords: [...rawByHash.values()].map(value => structuredClone(value)),
        snapshots: [...snapshots.entries()].map(([cacheKey, value]) => ({
          cacheKey,
          value: structuredClone(value),
        })),
        events: events.map(value => structuredClone(value)),
      };
    },
  };
}

function sourceKeyBea() {
  return "BEA:ITA:EquityAndInvFundSharesLiabs:QNSA:All";
}

function sourceKeySec(year, quarter) {
  return `SEC:Frames:WAVG:${year}Q${quarter}`;
}

function sourceKeyCftc() {
  return `CFTC:TFF:${CFTC_REQUIRED_CONTRACT_CODES.join(",")}`;
}

function rawPayload(sourceKey, value) {
  if (sourceKey.startsWith("BEA:")) return { rows: value?.rows ?? [] };
  if (sourceKey.startsWith("SEC:")) return {
    taxonomy: value?.taxonomy ?? null,
    tag: value?.tag ?? null,
    unit: value?.unit ?? null,
    frame: value?.frame ?? null,
    data: value?.data ?? [],
  };
  if (sourceKey.startsWith("CFTC:")) return {
    datasetId: value?.datasetId ?? null,
    rows: value?.rows ?? [],
  };
  return value;
}

function providerPayloadFromRaw(sourceKey, record) {
  const payload = record?.payload ?? null;
  if (sourceKey.startsWith("BEA:")) {
    return { source: "BEA_ITA", rows: payload?.rows ?? [] };
  }
  if (sourceKey.startsWith("SEC:")) {
    return {
      source: "SEC_XBRL_FRAME",
      taxonomy: payload?.taxonomy ?? null,
      tag: payload?.tag ?? null,
      unit: payload?.unit ?? null,
      frame: payload?.frame ?? null,
      data: payload?.data ?? [],
    };
  }
  if (sourceKey.startsWith("CFTC:")) {
    return {
      source: "CFTC_TFF_FUTURES_ONLY",
      datasetId: payload?.datasetId ?? null,
      rows: payload?.rows ?? [],
    };
  }
  return payload;
}

async function persistRaw({ store, sourceKey, providerValue, retrievedAt }) {
  const payload = rawPayload(sourceKey, providerValue);
  const contentHash = await sha256Hex({ sourceKey, payload });

  return store.putRaw({
    sourceKey,
    contentHash,
    retrievedAt,
    payload,
  });
}

function retryable(error) {
  const message = String(error?.message ?? error ?? "");
  return /HTTP_(429|5\d\d)|TIMEOUT|ECONN|EAI_AGAIN|ENET|FETCH|SOCKET/i.test(message);
}

async function callWithRetry({
  label,
  operation,
  budget,
  maxAttemptsPerCall,
  retryDelayMs,
}) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttemptsPerCall; attempt++) {
    if (budget.usedAttempts >= budget.maxAttempts) {
      const error = new Error("PROVIDER_REQUEST_BUDGET_EXHAUSTED");
      error.label = label;
      throw error;
    }

    budget.usedAttempts++;
    budget.attempts.push({ label, attempt });

    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttemptsPerCall || !retryable(error)) throw error;
      await sleep(retryDelayMs * attempt);
    }
  }

  throw lastError ?? new Error(`${label}_UNKNOWN_FAILURE`);
}

async function fetchOrFallback({
  label,
  sourceKey,
  operation,
  store,
  budget,
  maxAttemptsPerCall,
  retryDelayMs,
  maxFallbackAgeMs,
  nowIso,
}) {
  try {
    const value = await callWithRetry({
      label,
      operation,
      budget,
      maxAttemptsPerCall,
      retryDelayMs,
    });

    const stored = await persistRaw({
      store,
      sourceKey,
      providerValue: value,
      retrievedAt: nowIso,
    });

    return {
      status: "LIVE",
      value,
      contentHash: stored.record.contentHash,
      deduplicated: stored.deduplicated,
      error: null,
    };
  } catch (error) {
    const cached = await store.getLatestRaw(sourceKey);
    if (cached && ageMs(cached, nowIso) <= maxFallbackAgeMs) {
      return {
        status: "CACHED_FALLBACK",
        value: providerPayloadFromRaw(sourceKey, cached),
        contentHash: cached.contentHash,
        deduplicated: true,
        error: String(error?.message ?? error),
      };
    }

    return {
      status: "FAILED",
      value: null,
      contentHash: null,
      deduplicated: false,
      error: String(error?.message ?? error),
    };
  }
}

function cacheKeyFor({ asOfDate, beaTargetPeriod, secPrevious, secCurrent, cftcAsOfDate }) {
  return [
    BREADTH_R2_RUNTIME_VERSION,
    asOfDate ?? "",
    beaTargetPeriod ?? "",
    `SEC:${secPrevious?.year ?? ""}Q${secPrevious?.quarter ?? ""}-${secCurrent?.year ?? ""}Q${secCurrent?.quarter ?? ""}`,
    cftcAsOfDate ?? "",
  ].join("|");
}

function latestBeaPeriod(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(row => String(row?.TimePeriod ?? ""))
    .filter(value => /^\d{4}Q[1-4]$/.test(value))
    .sort()
    .at(-1) ?? null;
}

function latestCftcDate(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(row => String(row?.report_date_as_yyyy_mm_dd ?? "").slice(0, 10))
    .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort()
    .at(-1) ?? null;
}

export async function runBreadthR2CandidateRuntime({
  asOfDate,
  beaUserId,
  secPrevious = { year: 2026, quarter: 1 },
  secCurrent = { year: 2026, quarter: 2 },
  store = createMemoryBreadthR2Store(),
  provider = {
    fetchBeaForeignPortfolio,
    fetchSecShareFrame,
    fetchCftcTff,
  },
  maxProviderAttempts = 8,
  maxAttemptsPerCall = 2,
  retryDelayMs = 500,
  staleFallbackMs = DEFAULT_STALE_FALLBACK_MS,
  snapshotCacheTtlMs = 5 * 60_000,
  now = () => new Date(),
  includeBenchmark = true,
} = {}) {
  if (typeof store?.getLatestRaw !== "function" || typeof store?.putRaw !== "function") {
    throw new TypeError("BREADTH_R2_STORE_INVALID");
  }
  if (!Number.isInteger(maxProviderAttempts) || maxProviderAttempts < 4) {
    throw new Error("PROVIDER_BUDGET_INVALID");
  }

  const nowIso = isoNow(now);
  const beaSourceKey = sourceKeyBea();
  const secPreviousKey = sourceKeySec(secPrevious.year, secPrevious.quarter);
  const secCurrentKey = sourceKeySec(secCurrent.year, secCurrent.quarter);
  const cftcSourceKey = sourceKeyCftc();

  const preliminaryCacheKey = cacheKeyFor({
    asOfDate,
    beaTargetPeriod: "LATEST",
    secPrevious,
    secCurrent,
    cftcAsOfDate: "LATEST",
  });

  const cachedSnapshot = await store.getSnapshot(preliminaryCacheKey);
  if (
    cachedSnapshot &&
    ageMs({ retrievedAt: cachedSnapshot.cachedAt }, nowIso) <= snapshotCacheTtlMs
  ) {
    return {
      ...cachedSnapshot.runtimeResult,
      runtime: {
        ...cachedSnapshot.runtimeResult.runtime,
        snapshotCacheHit: true,
      },
    };
  }

  const budget = {
    maxAttempts: maxProviderAttempts,
    usedAttempts: 0,
    attempts: [],
  };

  const bea = await fetchOrFallback({
    label: "BEA",
    sourceKey: beaSourceKey,
    operation: () => provider.fetchBeaForeignPortfolio({
      userId: beaUserId,
      year: "All",
      frequency: "QNSA",
    }),
    store,
    budget,
    maxAttemptsPerCall,
    retryDelayMs,
    maxFallbackAgeMs: staleFallbackMs.BEA,
    nowIso,
  });

  const secPrev = await fetchOrFallback({
    label: "SEC_PREVIOUS",
    sourceKey: secPreviousKey,
    operation: () => provider.fetchSecShareFrame(secPrevious),
    store,
    budget,
    maxAttemptsPerCall,
    retryDelayMs,
    maxFallbackAgeMs: staleFallbackMs.SEC,
    nowIso,
  });

  const secCur = await fetchOrFallback({
    label: "SEC_CURRENT",
    sourceKey: secCurrentKey,
    operation: () => provider.fetchSecShareFrame(secCurrent),
    store,
    budget,
    maxAttemptsPerCall,
    retryDelayMs,
    maxFallbackAgeMs: staleFallbackMs.SEC,
    nowIso,
  });

  const cftc = await fetchOrFallback({
    label: "CFTC",
    sourceKey: cftcSourceKey,
    operation: () => provider.fetchCftcTff({
      limit: 500,
      offset: 0,
      order: "report_date_as_yyyy_mm_dd DESC",
    }),
    store,
    budget,
    maxAttemptsPerCall,
    retryDelayMs,
    maxFallbackAgeMs: staleFallbackMs.CFTC,
    nowIso,
  });

  const sources = { bea, secPrevious: secPrev, secCurrent: secCur, cftc };
  const failed = Object.entries(sources)
    .filter(([, value]) => value.status === "FAILED")
    .map(([key, value]) => ({ source: key, error: value.error }));

  if (failed.length) {
    return {
      runtimeVersion: BREADTH_R2_RUNTIME_VERSION,
      status: "PARTIAL",
      score: null,
      candidate: null,
      sources: Object.fromEntries(
        Object.entries(sources).map(([key, value]) => [
          key,
          {
            status: value.status,
            contentHash: value.contentHash,
            deduplicated: value.deduplicated,
            error: value.error,
          },
        ])
      ),
      missingFactors: failed.map(item => `${item.source.toUpperCase()}_SOURCE_FAILED`),
      runtime: {
        asOfDate: asOfDate ?? null,
        now: nowIso,
        providerBudget: budget,
        snapshotCacheHit: false,
        productionWired: false,
        productionReady: false,
      },
    };
  }

  const beaTargetPeriod = latestBeaPeriod(bea.value.rows);
  const cftcAsOfDate = latestCftcDate(cftc.value.rows);

  if (!beaTargetPeriod || !cftcAsOfDate) {
    return {
      runtimeVersion: BREADTH_R2_RUNTIME_VERSION,
      status: "PARTIAL",
      score: null,
      candidate: null,
      sources: Object.fromEntries(
        Object.entries(sources).map(([key, value]) => [
          key,
          { status: value.status, contentHash: value.contentHash, error: value.error },
        ])
      ),
      missingFactors: [
        ...(!beaTargetPeriod ? ["BEA_TARGET_PERIOD_MISSING"] : []),
        ...(!cftcAsOfDate ? ["CFTC_LATEST_DATE_MISSING"] : []),
      ],
      runtime: {
        asOfDate: asOfDate ?? null,
        now: nowIso,
        providerBudget: budget,
        snapshotCacheHit: false,
        productionWired: false,
        productionReady: false,
      },
    };
  }

  const candidate = buildBreadthR2CandidateSnapshot({
    beaRows: bea.value.rows,
    beaTargetPeriod,
    secPreviousFrame: secPrev.value,
    secCurrentFrame: secCur.value,
    cftcRows: cftc.value.rows,
    cftcAsOfDate,
    cftcRequiredCodes: CFTC_REQUIRED_CONTRACT_CODES,
    includeBenchmark,
  });

  assertCandidateOnlySnapshot(candidate);

  const result = {
    runtimeVersion: BREADTH_R2_RUNTIME_VERSION,
    status: candidate.status === "CANDIDATE_READY" ? "CANDIDATE_READY" : "PARTIAL",
    score: null,
    candidate,
    sources: Object.fromEntries(
      Object.entries(sources).map(([key, value]) => [
        key,
        {
          status: value.status,
          contentHash: value.contentHash,
          deduplicated: value.deduplicated,
          error: value.error,
        },
      ])
    ),
    missingFactors: candidate.missingFactors ?? [],
    runtime: {
      asOfDate: asOfDate ?? null,
      now: nowIso,
      beaTargetPeriod,
      cftcAsOfDate,
      providerBudget: budget,
      snapshotCacheHit: false,
      productionWired: false,
      productionReady: false,
    },
  };

  await store.putSnapshot(preliminaryCacheKey, {
    cachedAt: nowIso,
    runtimeResult: result,
  });

  return result;
}
