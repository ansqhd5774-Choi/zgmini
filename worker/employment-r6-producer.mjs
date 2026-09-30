import { runEmploymentR6CollectionStep } from "../lib/market-score/employment-r6-collector.mjs";
import { precomputeEmploymentR6ReadModel } from "../lib/market-score/employment-r6-precompute.mjs";

const sortedUnique = values => [...new Set((values ?? []).map(x => String(x ?? "").trim()).filter(Boolean))].sort();

export async function runEmploymentR6Producer({
  env,
  now = () => new Date(),
  collector = runEmploymentR6CollectionStep,
  precompute = precomputeEmploymentR6ReadModel,
} = {}) {
  if (!env?.DB || typeof env.DB.prepare !== "function") return { status: "CONFIGURATION_MISSING", providerRequests: 0, changedSeriesIds: [], precomputeRan: false };

  const collection = await collector({ env, db: env.DB, now });
  const groupResults = Array.isArray(collection?.groupResults) ? collection.groupResults : [];
  const changedSeriesIds = sortedUnique(groupResults.flatMap(x => Array.isArray(x?.changedSeriesIds) ? x.changedSeriesIds : []));

  if (collection?.status === "FAIL") {
    return {
      status: "ERROR",
      reason: "COLLECTION_FAILED",
      collectionStatus: collection.status,
      providerRequests: Number(collection?.providerRequests ?? 0),
      changedSeriesIds,
      precomputeRan: false,
    };
  }

  let calculated;
  try {
    calculated = await precompute({
      db: env.DB,
      scoreAsOf: now().toISOString(),
      changedSeriesIds,
    });
  } catch {
    return {
      status: "ERROR",
      reason: "PRECOMPUTE_FAILED",
      collectionStatus: collection?.status ?? null,
      providerRequests: Number(collection?.providerRequests ?? 0),
      changedSeriesIds,
      precomputeRan: true,
    };
  }

  return {
    status: "COMPLETE",
    collectionStatus: collection?.status ?? null,
    providerRequests: Number(collection?.providerRequests ?? 0),
    changedSeriesIds,
    precomputeRan: true,
    precomputeStatus: calculated?.status ?? null,
    servingVersionId: calculated?.servingVersionId ?? null,
    readPointerUpdated: calculated?.readPointerUpdated === true,
  };
}

export const EMPLOYMENT_R6_PRODUCER_R4_CONTRACT = Object.freeze({
  revision: "EMP-R6-PRODUCER-R4",
  schedulerAuth: "EXISTING_KOREA_REV7_EXTERNAL_SCHEDULER",
  visitorSessionDependency: false,
  queryStringSecret: false,
  publicWaitUntilWiring: false,
  collectorStoreOnly: true,
  precomputeStoredOnly: true,
  exactChangedSeriesIds: true,
  providerCallsOnPublicPath: 0,
});
