import {
  createBreadthR2D1Store,
} from "./breadth-r2-d1-store.mjs";

import {
  runBreadthR2CandidateRuntime,
} from "./breadth-r2-runtime.mjs";

export const BREADTH_R2_SERVICE_VERSION = "BREADTH-R2-SERVICE-CANDIDATE-R62";

function text(value) {
  return value == null ? "" : String(value).trim();
}

export function createBreadthR2CandidateService({
  env = {},
  db = env?.DB,
  store = null,
  provider = undefined,
  runtimeOptions = {},
} = {}) {
  const resolvedStore = store ?? createBreadthR2D1Store(db);

  return {
    version: BREADTH_R2_SERVICE_VERSION,

    async run({
      beaUserId,
      asOfDate,
      secPrevious,
      secCurrent,
      includeBenchmark = true,
      ...overrides
    } = {}) {
      const secret = text(beaUserId);
      if (!secret) throw new Error("BEA_USERID_REQUIRED");

      const options = {
        ...runtimeOptions,
        ...overrides,
        beaUserId: secret,
        asOfDate,
        secPrevious,
        secCurrent,
        includeBenchmark,
        store: resolvedStore,
      };

      if (provider) options.provider = provider;

      const result = await runBreadthR2CandidateRuntime(options);

      return {
        serviceVersion: BREADTH_R2_SERVICE_VERSION,
        ...result,
        score: null,
        productionWired: false,
        productionReady: false,
      };
    },
  };
}
