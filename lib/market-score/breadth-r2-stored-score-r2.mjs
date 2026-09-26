import { createBreadthR2D1StoreR2 } from "./breadth-r2-d1-store-r2.mjs";
import { selectBreadthR2SecFramePair } from "./breadth-r2-sec-period-r1.mjs";
import { buildBreadthR2CandidateSnapshot } from "./breadth-r2-pipeline.mjs";
import { BREADTH_R2_METHOD_R1, finalizeBreadthR2Runtime } from "./breadth-r2-method-r1.mjs";
import {
  BREADTH_R2_PROVIDERS,
  BREADTH_R2_METRICS,
  BREADTH_R2_CFTC_REQUIRED_CODES,
  BREADTH_R2_SEC_UNIVERSE_KEY,
} from "./breadth-r2-storage-contract-r1.mjs";

export const BREADTH_R2_STORED_SCORE_R2 = "BREADTH-R2-STORED-SCORE-R2";

function beaPayload(rows) {
  return rows.map(row => ({
    TimePeriod: row.observation_key,
    DataValue: String(row.value),
    CL_UNIT: row.unit ?? row.provenance?.sourceUnit ?? null,
    UNIT_MULT: row.provenance?.unitMult ?? null,
  }));
}

function secPayload(rows, frame) {
  return {
    source: "SEC_XBRL_FRAME",
    taxonomy: rows[0]?.provenance?.taxonomy ?? "us-gaap",
    tag: BREADTH_R2_METRICS.SEC_SHARES,
    unit: rows[0]?.unit ?? "shares",
    frame,
    data: rows
      .filter(row => row.metric === BREADTH_R2_METRICS.SEC_SHARES)
      .map(row => ({
        cik: row.entity_id,
        entityName: row.provenance?.entityName ?? null,
        val: row.value,
        start: row.provenance?.start ?? null,
        end: row.provenance?.end ?? null,
        filed: row.provenance?.filed ?? null,
        accn: row.provenance?.accn ?? null,
      })),
  };
}

function cftcPayload(rows, observationDate) {
  const byEntity = new Map();
  for (const row of rows) {
    if (!byEntity.has(row.entity_id)) byEntity.set(row.entity_id, {});
    byEntity.get(row.entity_id)[row.metric] = row.value;
  }
  return [...byEntity.entries()]
    .filter(([code]) => BREADTH_R2_CFTC_REQUIRED_CODES.includes(code))
    .map(([code, metrics]) => ({
      report_date_as_yyyy_mm_dd: observationDate,
      cftc_contract_market_code: code,
      open_interest_all: metrics[BREADTH_R2_METRICS.CFTC_OPEN_INTEREST],
      asset_mgr_positions_long: metrics[BREADTH_R2_METRICS.CFTC_ASSET_LONG],
      asset_mgr_positions_short: metrics[BREADTH_R2_METRICS.CFTC_ASSET_SHORT],
      lev_money_positions_long: metrics[BREADTH_R2_METRICS.CFTC_LEV_LONG],
      lev_money_positions_short: metrics[BREADTH_R2_METRICS.CFTC_LEV_SHORT],
    }));
}

function sourceState(available) {
  return { status: available ? "STORED" : "MISSING", contentHash: null, deduplicated: true, error: available ? null : "STORED_DATA_MISSING" };
}

export async function readBreadthR2StoredScore({
  env = {},
  db = env?.DB,
  store = null,
  asOfDate,
  includeBenchmark = false,
  now = () => new Date(),
} = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(asOfDate ?? ""))) throw new TypeError("AS_OF_DATE_INVALID");
  const resolvedStore = store ?? createBreadthR2D1StoreR2(db);
  const readStarted = Date.now();
  const secPair = selectBreadthR2SecFramePair(asOfDate);

  const [beaSeries, secPrevRows, secCurRows, secPrevUniverse, secCurUniverse, cftcObservation] = await Promise.all([
    resolvedStore.getMetricSeries(BREADTH_R2_PROVIDERS.BEA, BREADTH_R2_METRICS.BEA_FOREIGN_PORTFOLIO, asOfDate),
    resolvedStore.getObservationRows(BREADTH_R2_PROVIDERS.SEC, secPair.previous.frame),
    resolvedStore.getObservationRows(BREADTH_R2_PROVIDERS.SEC, secPair.current.frame),
    resolvedStore.getUniverse(BREADTH_R2_SEC_UNIVERSE_KEY, secPair.previous.frame),
    resolvedStore.getUniverse(BREADTH_R2_SEC_UNIVERSE_KEY, secPair.current.frame),
    resolvedStore.getLatestCompleteObservation(BREADTH_R2_PROVIDERS.CFTC, BREADTH_R2_METRICS.CFTC_OPEN_INTEREST, asOfDate, BREADTH_R2_CFTC_REQUIRED_CODES.length),
  ]);

  const latestBea = beaSeries.at(-1)?.observation_key ?? null;
  const cftcRows = cftcObservation
    ? await resolvedStore.getObservationRows(BREADTH_R2_PROVIDERS.CFTC, cftcObservation.observationKey)
    : [];
  const storageReadMs = Date.now() - readStarted;

  const secPrevMembers = new Set(secPrevUniverse?.members ?? []);
  const secCurMembers = new Set(secCurUniverse?.members ?? []);
  const secPrevFiltered = secPrevMembers.size ? secPrevRows.filter(row => secPrevMembers.has(row.entity_id)) : [];
  const secCurFiltered = secCurMembers.size ? secCurRows.filter(row => secCurMembers.has(row.entity_id)) : [];

  const computeStarted = Date.now();
  const candidate = buildBreadthR2CandidateSnapshot({
    beaRows: beaPayload(beaSeries),
    beaTargetPeriod: latestBea,
    secPreviousFrame: secPayload(secPrevFiltered, secPair.previous.frame),
    secCurrentFrame: secPayload(secCurFiltered, secPair.current.frame),
    cftcRows: cftcPayload(cftcRows, cftcObservation?.observationDate ?? asOfDate),
    cftcAsOfDate: cftcObservation?.observationDate ?? asOfDate,
    cftcRequiredCodes: BREADTH_R2_CFTC_REQUIRED_CODES,
    includeBenchmark,
  });

  const missing = [];
  if (!latestBea) missing.push("BEA_STORED_DATA_MISSING");
  if (!secPrevUniverse || !secPrevFiltered.length) missing.push("SEC_PREVIOUS_STORED_DATA_MISSING");
  if (!secCurUniverse || !secCurFiltered.length) missing.push("SEC_CURRENT_STORED_DATA_MISSING");
  if (!cftcObservation || !cftcRows.length) missing.push("CFTC_STORED_DATA_MISSING");
  if (missing.length) {
    candidate.status = "PARTIAL";
    candidate.missingFactors = [...new Set([...(candidate.missingFactors ?? []), ...missing])];
    for (const item of candidate.indicators) {
      if (!item || item.status === "READY") continue;
    }
  }

  const base = {
    runtimeVersion: BREADTH_R2_STORED_SCORE_R2,
    status: candidate.status,
    score: null,
    candidate,
    sources: {
      bea: sourceState(Boolean(latestBea)),
      secPrevious: sourceState(Boolean(secPrevUniverse && secPrevFiltered.length)),
      secCurrent: sourceState(Boolean(secCurUniverse && secCurFiltered.length)),
      cftc: sourceState(Boolean(cftcObservation && cftcRows.length)),
    },
    missingFactors: candidate.missingFactors ?? [],
    runtime: {
      asOfDate,
      now: (typeof now === "function" ? now() : new Date()).toISOString(),
      beaTargetPeriod: latestBea,
      cftcAsOfDate: cftcObservation?.observationDate ?? null,
      secPeriodPolicy: secPair,
      providerRequests: 0,
      storageMode: "D1_STORED_ONLY",
      storageReadMs,
      scoreComputeMs: null,
      snapshotCacheHit: false,
      productionWired: false,
      productionReady: false,
    },
  };
  const finalized = finalizeBreadthR2Runtime(base);
  finalized.runtime.scoreComputeMs = Date.now() - computeStarted;
  finalized.runtime.providerRequests = 0;
  finalized.runtime.storageMode = "D1_STORED_ONLY";
  finalized.methodologyVersion = BREADTH_R2_METHOD_R1;
  return finalized;
}
