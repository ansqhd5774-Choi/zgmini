
import {
  EMPLOYMENT_R6_API_BUDGET,
  EMPLOYMENT_R6_COLLECTOR_REVISION,
  EMPLOYMENT_R6_GROUPS,
} from "./employment-r6-contract.mjs";
import {
  createEmploymentR6Store,
} from "./employment-r6-store.mjs";
import {
  createEmploymentR6Provider,
  expectedBlsCallsForGroup,
} from "./employment-r6-provider.mjs";
import {
  orderDuePlans,
  releasePlanForGroup,
} from "./employment-r6-scheduler.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;

function asDate(value) {
  const out = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(out.getTime())) throw new TypeError("NOW_INVALID");
  return out;
}
function n(value) {
  const out = Number(value ?? 0);
  return Number.isFinite(out) ? out : 0;
}
function providerRunName(groupName) {
  return `EMPLOYMENT_R6_${groupName}`;
}
function errorCode(error) {
  return String(error?.code ?? error?.message ?? "COLLECTOR_EXCEPTION").slice(0, 180);
}

async function collectOneGroup({
  groupName,
  mode,
  releaseAt,
  store,
  provider,
  now,
} = {}) {
  const runProvider = providerRunName(groupName);
  const lockKey = `employment-r6:${groupName.toLowerCase()}`;
  const lease = await store.acquire(lockKey, { ttlMs: 15 * 60 * 1000 });
  if (!lease?.acquired) {
    return {
      groupName,
      status: "SKIPPED_LOCKED",
      providerRequests: 0,
      dbWrites: 0,
      scoreComputed: false,
      publicOutput: false,
      changedSeriesIds: [],
    };
  }

  const startedAt = now().toISOString();
  try {
    const fetched = await provider.fetchGroup(groupName, {
      mode,
      releaseAt,
      currentYear: Number(now().toISOString().slice(0, 4)),
    });

    const snapshotResults = [];
    for (const snapshot of fetched?.snapshots ?? []) {
      snapshotResults.push(await store.writeRawSnapshot(snapshot));
    }

    const write = await store.upsertObservationRows({
      rows: fetched?.rows ?? [],
      retrievedAt: now().toISOString(),
    });

    const missing = Array.isArray(fetched?.missingSeries) ? fetched.missingSeries : [];
    const partial = missing.length > 0 || n(write?.rejected) > 0;
    const status = partial ? "PARTIAL" : "SUCCESS";
    const completedAt = now().toISOString();

    const runId = await store.recordRun({
      provider: runProvider,
      collectorRevision: EMPLOYMENT_R6_COLLECTOR_REVISION,
      status,
      startedAt,
      completedAt,
      providerRequests: n(fetched?.requestCount),
      collectedRows: n(fetched?.rows?.length),
      insertedCount: n(write?.inserted),
      revisedCount: n(write?.revised),
      noopCount: n(write?.noop),
      rejectedCount: n(write?.rejected),
      partialCount: partial ? 1 : 0,
      currentRows: n(write?.currentRows),
      historyRowsAdded: n(write?.historyRowsAdded),
      failureCode: missing.length ? "SERIES_PARTIAL" : n(write?.rejected) ? "ROW_REJECTED" : null,
      detail: {
        groupName,
        mode,
        releaseAt: releaseAt ?? null,
        missingSeries: missing,
        rawSnapshots: snapshotResults.map(x => ({
          snapshotId: x.snapshotId,
          bodySha256: x.bodySha256,
          chunkCount: x.chunkCount,
          noop: x.noop,
        })),
        scoreComputed: false,
        publicOutput: false,
        publicScoreChanged: false,
      },
    });

    return {
      groupName,
      status,
      runId,
      providerRequests: n(fetched?.requestCount),
      collectedRows: n(fetched?.rows?.length),
      rawSnapshots: snapshotResults.length,
      rawSnapshotNoops: snapshotResults.filter(x => x.noop).length,
      inserted: n(write?.inserted),
      revised: n(write?.revised),
      noop: n(write?.noop),
      rejected: n(write?.rejected),
      historyRowsAdded: n(write?.historyRowsAdded),
      changedSeriesIds: Array.isArray(write?.changedSeriesIds)
        ? [...new Set(write.changedSeriesIds.map(x => String(x ?? "").trim()).filter(Boolean))].sort()
        : [],
      missingSeries: missing,
      scoreComputed: false,
      publicOutput: false,
    };
  } catch (error) {
    const completedAt = now().toISOString();
    const failureCode = errorCode(error);
    await store.recordRun({
      provider: runProvider,
      collectorRevision: EMPLOYMENT_R6_COLLECTOR_REVISION,
      status: "FAIL",
      startedAt,
      completedAt,
      providerRequests: n(error?.requestCount),
      collectedRows: 0,
      insertedCount: 0,
      revisedCount: 0,
      noopCount: 0,
      rejectedCount: 0,
      partialCount: 1,
      currentRows: 0,
      historyRowsAdded: 0,
      failureCode,
      detail: {
        groupName,
        mode,
        releaseAt: releaseAt ?? null,
        error: String(error?.message ?? error),
        scoreComputed: false,
        publicOutput: false,
      },
    }).catch(() => null);
    return {
      groupName,
      status: "FAIL",
      failureCode,
      providerRequests: n(error?.requestCount),
      dbWrites: 0,
      scoreComputed: false,
      publicOutput: false,
      changedSeriesIds: [],
    };
  } finally {
    await store.release(lease).catch(() => false);
  }
}

export async function planEmploymentR6Collection({
  db,
  now = () => new Date(),
  mode = "RELEASE",
  groups = Object.keys(EMPLOYMENT_R6_GROUPS),
  storeFactory = createEmploymentR6Store,
} = {}) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("D1_DATABASE_REQUIRED");
  const store = storeFactory(db, { now });
  await store.initialize();
  const current = asDate(now());

  if (mode === "BACKFILL") {
    return groups.map(groupName => ({
      groupName,
      due: true,
      status: "BACKFILL_DUE",
      releaseAt: null,
      collectAt: current.toISOString(),
    }));
  }

  const plans = [];
  for (const groupName of groups) {
    const latestRun = await store.getLatestRun(providerRunName(groupName));
    plans.push(releasePlanForGroup(groupName, { now: current, latestRun }));
  }
  return plans;
}

export async function runEmploymentR6CollectionStep({
  env,
  db = env?.DB,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  mode = "RELEASE",
  groups = Object.keys(EMPLOYMENT_R6_GROUPS),
  storeFactory = createEmploymentR6Store,
  providerFactory = createEmploymentR6Provider,
} = {}) {
  if (!db || typeof db.prepare !== "function") {
    return {
      status: "SKIPPED_DB_UNAVAILABLE",
      providerRequests: 0,
      scoreComputed: false,
      publicOutput: false,
      groups: [],
    };
  }

  const current = asDate(now());
  const store = storeFactory(db, { now });
  await store.initialize();
  const provider = providerFactory({ fetchImpl, now });
  const plans = await planEmploymentR6Collection({ db, now, mode, groups, storeFactory: () => store });
  const due = mode === "BACKFILL" ? plans.filter(x => x.due) : orderDuePlans(plans);

  const results = [];
  for (const plan of due) {
    const group = EMPLOYMENT_R6_GROUPS[plan.groupName];
    if (group?.kind === "BLS" || group?.kind === "BED") {
      const since = new Date(current.getTime() - DAY_MS).toISOString();
      const used = await store.getProviderRequestsSince("EMPLOYMENT_R6_BLS_", since);
      const expected = expectedBlsCallsForGroup(plan.groupName, { mode });
      if (used + expected > EMPLOYMENT_R6_API_BUDGET.blsUnregisteredDailyQueries) {
        results.push({
          groupName: plan.groupName,
          status: "SKIPPED_BLS_BUDGET",
          providerRequests: 0,
          usedBlsRequests24h: used,
          expectedRequests: expected,
          dailyLimit: EMPLOYMENT_R6_API_BUDGET.blsUnregisteredDailyQueries,
          scoreComputed: false,
          publicOutput: false,
        });
        continue;
      }
    }

    results.push(await collectOneGroup({
      groupName: plan.groupName,
      mode,
      releaseAt: plan.releaseAt ?? null,
      store,
      provider,
      now,
    }));
  }

  const attempted = results.filter(x => !String(x.status).startsWith("SKIPPED_"));
  const failed = attempted.filter(x => x.status === "FAIL");
  const partial = attempted.filter(x => x.status === "PARTIAL");
  const status = failed.length ? "FAIL" : partial.length ? "PARTIAL" : attempted.length ? "SUCCESS" : "NOOP";
  return {
    status,
    mode,
    providerRequests: results.reduce((sum, x) => sum + n(x.providerRequests), 0),
    groupResults: results,
    plannedGroups: plans,
    scoreComputed: false,
    publicOutput: false,
  };
}

export const EMPLOYMENT_R6_COLLECTOR_CONTRACT = Object.freeze({
  revision: EMPLOYMENT_R6_COLLECTOR_REVISION,
  routeWiring: false,
  storeOnly: true,
  rawSnapshotBeforeObservationWrite: true,
  currentHistoryRunReuse: true,
  hashNoop: true,
  revisionAppend: true,
  partialNullProtection: true,
  circuitBreaker: true,
  globalBlsBudgetGuard: true,
  correctedInitialBackfillBlsCalls: 18,
  correctedInitialBackfillDolCalls: 2,
  scoreComputed: false,
  livePublicOutput: false,
});
