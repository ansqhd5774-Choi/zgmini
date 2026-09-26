import {
  fetchBeaForeignPortfolio,
  fetchSecShareFrame,
  fetchCftcTff,
} from "./breadth-r2-provider-client.mjs";
import {
  normalizeBeaForeignPortfolioRows,
  normalizeSecFrameRows,
  normalizeCftcTffRows,
} from "./breadth-r2-input-adapter.mjs";
import { selectBreadthR2SecFramePair } from "./breadth-r2-sec-period-r1.mjs";
import { createBreadthR2D1StoreR2 } from "./breadth-r2-d1-store-r2.mjs";
import {
  BREADTH_R2_PROVIDERS,
  BREADTH_R2_METRICS,
  BREADTH_R2_CFTC_REQUIRED_CODES,
  BREADTH_R2_SEC_UNIVERSE_KEY,
  BREADTH_R2_CFTC_UNIVERSE_KEY,
  quarterEndDate,
  normalizeCik,
} from "./breadth-r2-storage-contract-r1.mjs";

export const BREADTH_R2_COLLECTOR_R2 = "BREADTH-R2-COLLECTOR-R2";

const nowIso = now => {
  const value = typeof now === "function" ? now() : new Date();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error("COLLECTOR_NOW_INVALID");
  return date.toISOString();
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function canonical(value) {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}
async function sha256(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(value)));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, "0")).join("");
}
function retryable(error) {
  return /HTTP_(429|5\d\d)|TIMEOUT|ECONN|EAI_AGAIN|ENET|FETCH|SOCKET/i.test(String(error?.message ?? error ?? ""));
}

async function withRetry(label, operation, counter, { maxAttemptsPerCall = 2, retryDelayMs = 500 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttemptsPerCall; attempt++) {
    counter.providerRequests++;
    counter.attempts.push({ label, attempt });
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttemptsPerCall || !retryable(error)) throw error;
      await sleep(retryDelayMs * attempt);
    }
  }
  throw lastError ?? new Error(`${label}_FAILED`);
}

function rawRecord(sourceKey, providerValue, retrievedAt) {
  let payload;
  if (sourceKey.startsWith("BEA:")) payload = { rows: providerValue?.rows ?? [] };
  else if (sourceKey.startsWith("SEC:")) payload = {
    taxonomy: providerValue?.taxonomy ?? null,
    tag: providerValue?.tag ?? null,
    unit: providerValue?.unit ?? null,
    frame: providerValue?.frame ?? null,
    data: providerValue?.data ?? [],
  };
  else payload = { datasetId: providerValue?.datasetId ?? null, rows: providerValue?.rows ?? [] };
  return { sourceKey, payload, retrievedAt };
}

async function archiveRaw(store, sourceKey, providerValue, retrievedAt) {
  const record = rawRecord(sourceKey, providerValue, retrievedAt);
  return await store.putRaw({ ...record, contentHash: await sha256({ sourceKey, payload: record.payload }) });
}

function beaRows(value) {
  return normalizeBeaForeignPortfolioRows(value?.rows ?? []).map(row => ({
    provider: BREADTH_R2_PROVIDERS.BEA,
    observationKey: row.timePeriod,
    observationDate: quarterEndDate(row.timePeriod),
    entityType: "aggregate",
    entityId: "ALL",
    metric: BREADTH_R2_METRICS.BEA_FOREIGN_PORTFOLIO,
    value: row.value,
    unit: row.unit,
    provenance: { dataset: "ITA", indicator: BREADTH_R2_METRICS.BEA_FOREIGN_PORTFOLIO, frequency: "QNSA", unitMult: row.unitMult },
  })).filter(row => row.observationDate);
}

function secRows(value) {
  const frame = String(value?.frame ?? "").trim();
  const observationDate = quarterEndDate(frame);
  if (!frame || !observationDate) return [];
  const normalized = normalizeSecFrameRows(value);
  return [...normalized.values()].map(row => {
    const cik = normalizeCik(row.cik);
    if (!cik) return null;
    return {
      provider: BREADTH_R2_PROVIDERS.SEC,
      observationKey: frame,
      observationDate,
      entityType: "cik",
      entityId: cik,
      metric: BREADTH_R2_METRICS.SEC_SHARES,
      value: row.shares,
      unit: value?.unit ?? "shares",
      provenance: {
        taxonomy: value?.taxonomy ?? "us-gaap",
        tag: value?.tag ?? BREADTH_R2_METRICS.SEC_SHARES,
        frame,
        entityName: row.entityName,
        start: row.start,
        end: row.end,
        filed: row.filed,
        accn: row.accn,
      },
    };
  }).filter(Boolean);
}

function cftcRows(value) {
  const rows = normalizeCftcTffRows(value?.rows ?? [], BREADTH_R2_CFTC_REQUIRED_CODES);
  const out = [];
  for (const row of rows) {
    const common = {
      provider: BREADTH_R2_PROVIDERS.CFTC,
      observationKey: row.date,
      observationDate: row.date,
      entityType: "contract",
      entityId: row.contractCode,
      unit: "contracts",
      provenance: { datasetId: value?.datasetId ?? "gpe5-46if", contractCode: row.contractCode },
    };
    out.push(
      { ...common, metric: BREADTH_R2_METRICS.CFTC_OPEN_INTEREST, value: row.openInterest },
      { ...common, metric: BREADTH_R2_METRICS.CFTC_ASSET_LONG, value: row.assetLong },
      { ...common, metric: BREADTH_R2_METRICS.CFTC_ASSET_SHORT, value: row.assetShort },
      { ...common, metric: BREADTH_R2_METRICS.CFTC_LEV_LONG, value: row.leveragedLong },
      { ...common, metric: BREADTH_R2_METRICS.CFTC_LEV_SHORT, value: row.leveragedShort },
    );
  }
  return out;
}

function sumStats(items) {
  return items.reduce((acc, item) => {
    for (const key of ["inserted", "updated", "noop", "validSeen", "historyRowsAdded"]) acc[key] += Number(item?.[key] ?? 0);
    acc.currentRows = Math.max(acc.currentRows, Number(item?.currentRows ?? 0));
    return acc;
  }, { inserted: 0, updated: 0, noop: 0, validSeen: 0, currentRows: 0, historyRowsAdded: 0 });
}

export async function collectBreadthR2ToStore({
  env = {},
  db = env?.DB,
  asOfDate,
  beaUserId = env?.BEA_USER_ID,
  store = null,
  provider = { fetchBeaForeignPortfolio, fetchSecShareFrame, fetchCftcTff },
  now = () => new Date(),
  retryDelayMs = 500,
  maxAttemptsPerCall = 2,
  cftcLimit = 500,
} = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(asOfDate ?? ""))) throw new TypeError("AS_OF_DATE_INVALID");
  if (typeof beaUserId !== "string" || !beaUserId.trim()) throw new Error("BEA_USERID_REQUIRED");
  const resolvedStore = store ?? createBreadthR2D1StoreR2(db);
  const startedAt = nowIso(now);
  const runId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  const lease = await resolvedStore.acquire(`breadth-r2-collect:${asOfDate}`);
  if (!lease.acquired) {
    const completedAt = nowIso(now);
    await resolvedStore.recordRun({ runId, asOfDate, status: "SKIPPED_LOCKED", startedAt, completedAt, failureCode: "COLLECTION_ALREADY_RUNNING", detail: {} });
    return { collectorVersion: BREADTH_R2_COLLECTOR_R2, status: "SKIPPED_LOCKED", runId, providerRequests: 0, scoreComputed: false };
  }

  const counter = { providerRequests: 0, attempts: [] };
  const secPair = selectBreadthR2SecFramePair(asOfDate);
  const upstreamStart = Date.now();
  let results;
  try {
    const jobs = [
      ["BEA", () => provider.fetchBeaForeignPortfolio({ userId: beaUserId, year: "All", frequency: "QNSA" })],
      ["SEC_PREVIOUS", () => provider.fetchSecShareFrame({ year: secPair.previous.year, quarter: secPair.previous.quarter })],
      ["SEC_CURRENT", () => provider.fetchSecShareFrame({ year: secPair.current.year, quarter: secPair.current.quarter })],
      ["CFTC", () => provider.fetchCftcTff({ limit: cftcLimit, offset: 0, order: "report_date_as_yyyy_mm_dd DESC" })],
    ];
    results = await Promise.allSettled(jobs.map(([label, op]) => withRetry(label, op, counter, { maxAttemptsPerCall, retryDelayMs })));
    const upstreamMs = Date.now() - upstreamStart;
    const [beaResult, secPrevResult, secCurResult, cftcResult] = results;
    const fulfilled = results.filter(item => item.status === "fulfilled").length;
    const retrievedAt = nowIso(now);
    const writeStart = Date.now();
    const writeStats = [];
    const detail = { secPeriodPolicy: secPair, attempts: counter.attempts, sources: {} };

    async function processResult(name, result, sourceKey, toRows, universe = null) {
      if (result.status !== "fulfilled") {
        detail.sources[name] = { status: "FAILED", error: String(result.reason?.message ?? result.reason) };
        return;
      }
      const value = result.value;
      const archived = await archiveRaw(resolvedStore, sourceKey, value, retrievedAt);
      const rows = toRows(value);
      const stats = await resolvedStore.upsertCurrentRows({ asOfDate, rows, retrievedAt });
      writeStats.push(stats);
      detail.sources[name] = { status: "STORED", rows: rows.length, rawDeduplicated: archived.deduplicated };
      if (typeof universe === "function") await universe(value, rows);
    }

    await processResult("BEA", beaResult, "BEA:ITA:EquityAndInvFundSharesLiabs:QNSA:All", beaRows);
    await processResult("SEC_PREVIOUS", secPrevResult, `SEC:Frames:WAVG:${secPair.previous.frame}`, secRows, async (value, rows) => {
      await resolvedStore.putUniverse({
        universeKey: BREADTH_R2_SEC_UNIVERSE_KEY,
        observationKey: secPair.previous.frame,
        observationDate: quarterEndDate(secPair.previous.frame),
        members: rows.map(row => row.entityId),
        provenance: { source: "SEC_XBRL_FRAME", frame: secPair.previous.frame },
        retrievedAt,
      });
    });
    await processResult("SEC_CURRENT", secCurResult, `SEC:Frames:WAVG:${secPair.current.frame}`, secRows, async (value, rows) => {
      await resolvedStore.putUniverse({
        universeKey: BREADTH_R2_SEC_UNIVERSE_KEY,
        observationKey: secPair.current.frame,
        observationDate: quarterEndDate(secPair.current.frame),
        members: rows.map(row => row.entityId),
        provenance: { source: "SEC_XBRL_FRAME", frame: secPair.current.frame },
        retrievedAt,
      });
    });
    await processResult("CFTC", cftcResult, `CFTC:TFF:${BREADTH_R2_CFTC_REQUIRED_CODES.join(",")}`, cftcRows, async () => {
      const latest = cftcResult.status === "fulfilled"
        ? normalizeCftcTffRows(cftcResult.value?.rows ?? [], BREADTH_R2_CFTC_REQUIRED_CODES).map(row => row.date).sort().at(-1)
        : null;
      if (latest) await resolvedStore.putUniverse({
        universeKey: BREADTH_R2_CFTC_UNIVERSE_KEY,
        observationKey: latest,
        observationDate: latest,
        members: BREADTH_R2_CFTC_REQUIRED_CODES,
        provenance: { source: "CFTC_TFF_FUTURES_ONLY", datasetId: cftcResult.value?.datasetId ?? "gpe5-46if" },
        retrievedAt,
      });
    });

    const stats = sumStats(writeStats);
    const storageWriteMs = Date.now() - writeStart;
    const completedAt = nowIso(now);
    const status = fulfilled === results.length ? "SUCCESS" : fulfilled > 0 ? "PARTIAL" : "FAILED";
    const failureCode = status === "SUCCESS" ? null : status === "PARTIAL" ? "PROVIDER_PARTIAL_FAILURE" : "ALL_PROVIDERS_FAILED";
    await resolvedStore.recordRun({
      runId, asOfDate, status, startedAt, completedAt,
      providerRequests: counter.providerRequests,
      collectedRows: stats.validSeen,
      insertedCount: stats.inserted,
      updatedCount: stats.updated,
      noopCount: stats.noop,
      currentRows: stats.currentRows,
      historyRowsAdded: stats.historyRowsAdded,
      upstreamMs, storageWriteMs, storageReadMs: null, scoreComputeMs: null,
      failureCode, detail,
    });
    return {
      collectorVersion: BREADTH_R2_COLLECTOR_R2,
      status,
      runId,
      providerRequests: counter.providerRequests,
      collectedRows: stats.validSeen,
      inserted: stats.inserted,
      updated: stats.updated,
      noop: stats.noop,
      historyRowsAdded: stats.historyRowsAdded,
      scoreComputed: false,
      failureCode,
      detail,
    };
  } finally {
    await resolvedStore.release(lease).catch(() => false);
  }
}
