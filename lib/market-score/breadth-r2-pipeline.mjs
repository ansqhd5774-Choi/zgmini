import {
  buildCandidateInputBundle,
} from "./breadth-r2-input-adapter.mjs";

import {
  buildBreadthR2Outputs,
  buildEqualWeightBreadthBenchmark,
} from "./breadth-r2-candidate.mjs";

export const BREADTH_R2_PIPELINE_VERSION = "BREADTH-R2-PIPELINE-CANDIDATE-R56";

const finite = value => typeof value === "number" && Number.isFinite(value);

function detailMeta(input, output) {
  return {
    inputStatus: input?.status ?? null,
    outputStatus: output?.status ?? null,
    observationDate:
      input?.observationDate ??
      input?.targetPeriod ??
      null,
    score: finite(output?.score) ? output.score : null,
    reason: output?.reason ?? input?.reason ?? null,
  };
}

export function buildBreadthR2CandidateSnapshot({
  beaRows,
  beaTargetPeriod,
  secPreviousFrame,
  secCurrentFrame,
  secCorporateActionAdjuster = null,
  cftcRows,
  cftcAsOfDate,
  cftcRequiredCodes = [],
  shareSupplyOptions = {},
  includeBenchmark = false,
} = {}) {
  const inputBundle = buildCandidateInputBundle({
    beaRows,
    beaTargetPeriod,
    secPreviousFrame,
    secCurrentFrame,
    secCorporateActionAdjuster,
    cftcRows,
    cftcAsOfDate,
    cftcRequiredCodes,
  });

  const scoreBundle = buildBreadthR2Outputs({
    foreignPortfolio: inputBundle.foreignPortfolio,
    shareSupply: {
      ...inputBundle.shareSupply,
      ...shareSupplyOptions,
    },
    institutionalFutures: inputBundle.institutionalFutures,
    leveragedFutures: inputBundle.leveragedFutures,
  });

  const benchmark = includeBenchmark
    ? buildEqualWeightBreadthBenchmark(scoreBundle)
    : null;

  const details = scoreBundle.indicators.map((output, index) => {
    const key = [
      "foreignPortfolio",
      "shareSupply",
      "institutionalFutures",
      "leveragedFutures",
    ][index];

    return {
      id: output.id,
      name: output.name,
      ...detailMeta(inputBundle[key], output),
    };
  });

  return {
    pipelineVersion: BREADTH_R2_PIPELINE_VERSION,
    methodologyVersion: scoreBundle.methodologyVersion,
    status: scoreBundle.status,
    score: null,
    productionReady: false,
    productionWired: false,
    finalWeightsApproved: false,
    inputs: inputBundle,
    indicators: scoreBundle.indicators,
    details,
    benchmark: benchmark
      ? {
          ...benchmark,
          benchmarkOnly: true,
          productionScore: false,
        }
      : null,
    missingFactors: scoreBundle.missingFactors,
  };
}

export function assertCandidateOnlySnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new TypeError("snapshot must be an object");
  }
  if (snapshot.score !== null) {
    throw new Error("candidate snapshot must not expose a final area score");
  }
  if (snapshot.productionReady !== false || snapshot.productionWired !== false) {
    throw new Error("candidate snapshot must remain production-disabled");
  }
  if (snapshot.finalWeightsApproved !== false) {
    throw new Error("candidate snapshot must not claim final weights");
  }
  if (!Array.isArray(snapshot.indicators) || snapshot.indicators.length !== 4) {
    throw new Error("candidate snapshot must contain exactly four indicators");
  }
  return true;
}
