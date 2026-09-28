import { EMPLOYMENT_R4_SHADOW_WORKER_REVISION } from "./employment-r4-shadow-contract.mjs";
import { collectEmploymentR4Shadow } from "./employment-r4-shadow-collector.mjs";
import { createEmploymentR4ShadowProvider } from "./employment-r4-shadow-provider.mjs";
import { createEmploymentR4ShadowStore } from "./employment-r4-shadow-store.mjs";

const DAY = 86_400_000;
const HOUR = 3_600_000;

export const EMPLOYMENT_R4_SHADOW_SUCCESS_INTERVAL_MS = 7 * DAY;
export const EMPLOYMENT_R4_SHADOW_RETRY_INTERVAL_MS = 6 * HOUR;

function instantMs(value) {
  const d = value instanceof Date ? value : new Date(value);
  const ms = d.valueOf();
  if (!Number.isFinite(ms)) throw new TypeError("NOW_INVALID");
  return ms;
}

export async function collectEmploymentR4ShadowStoreOnlyR1({
  env = {},
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  storeFactory = createEmploymentR4ShadowStore,
  providerFactory = createEmploymentR4ShadowProvider,
  collector = collectEmploymentR4Shadow,
  successIntervalMs = EMPLOYMENT_R4_SHADOW_SUCCESS_INTERVAL_MS,
  retryIntervalMs = EMPLOYMENT_R4_SHADOW_RETRY_INTERVAL_MS,
} = {}) {
  if (!env?.DB) return {
    workerRevision: EMPLOYMENT_R4_SHADOW_WORKER_REVISION,
    status: "SKIPPED_STORAGE_CONFIGURATION_MISSING",
    providerRequests: 0,
    scoreComputed: false,
  };

  const nowValue = now();
  const nowMs = instantMs(nowValue);
  const store = storeFactory(env.DB, { now: () => new Date(nowMs) });
  await store.initialize();
  const prior = await store.latestRun();

  if (prior?.completed_at) {
    const priorMs = Date.parse(prior.completed_at);
    if (Number.isFinite(priorMs) && nowMs >= priorMs) {
      const success = String(prior.status ?? "") === "SUCCESS";
      const interval = success ? successIntervalMs : retryIntervalMs;
      if (nowMs - priorMs < interval) {
        return {
          workerRevision: EMPLOYMENT_R4_SHADOW_WORKER_REVISION,
          status: success ? "SKIPPED_RECENT_SUCCESS" : "SKIPPED_RECENT_ATTEMPT",
          providerRequests: 0,
          scoreComputed: false,
          priorRunId: prior.run_id ?? null,
          priorStatus: prior.status ?? null,
          priorCompletedAt: prior.completed_at,
          nextEligibleAt: new Date(priorMs + interval).toISOString(),
        };
      }
    }
  }

  const provider = providerFactory({ fetchImpl, now: () => new Date(nowMs) });
  const result = await collector({ db: env.DB, provider, now: () => new Date(nowMs) });
  return {
    workerRevision: EMPLOYMENT_R4_SHADOW_WORKER_REVISION,
    ...result,
    scoreComputed: false,
  };
}

export const EMPLOYMENT_R4_SHADOW_WORKER_CONTRACT = Object.freeze({
  revision: EMPLOYMENT_R4_SHADOW_WORKER_REVISION,
  storeOnly: true,
  scoreComputed: false,
  publicScoreWiring: false,
  trigger: "MARKET_SCORE_WAITUNTIL",
  successCadenceDays: 7,
  retryCadenceHours: 6,
  bedCollection: "DEFERRED_STRUCTURAL_CANDIDATE",
});
