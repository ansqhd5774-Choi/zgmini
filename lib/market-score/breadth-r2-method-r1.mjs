export const BREADTH_R2_METHOD_R1 = "ZGMINI_BREADTH_R2_METHOD_R1";

export const BREADTH_R2_FINAL_WEIGHTS = Object.freeze({
  "breadth-37": 0.25,
  "breadth-38": 0.25,
  "breadth-39": 0.25,
  "breadth-40": 0.25,
});

const ORDER = Object.freeze([
  "breadth-37",
  "breadth-38",
  "breadth-39",
  "breadth-40",
]);

const finiteScore = value =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 100;

function interpretation(score) {
  if (score > 50) return { state: "BUY_DOMINANT", label: "매수 우위", strength: score - 50 };
  if (score < 50) return { state: "SELL_DOMINANT", label: "매도 우위", strength: 50 - score };
  return { state: "BALANCED", label: "균형", strength: 0 };
}

export function finalizeBreadthR2Candidate(candidateLike = {}) {
  const candidate = candidateLike?.candidate ?? candidateLike;
  const items = Array.isArray(candidate?.indicators) ? candidate.indicators : [];
  const byId = new Map(items.map(item => [item?.id, item]));
  const indicators = ORDER.map(id => byId.get(id) ?? null);

  const missing = [];
  for (let i = 0; i < ORDER.length; i++) {
    const id = ORDER[i];
    const item = indicators[i];
    if (!item || item.status !== "READY" || !finiteScore(item.score)) {
      missing.push(item?.reason ?? `${id.toUpperCase()}_NOT_READY`);
    }
  }

  if (missing.length) {
    return {
      methodologyVersion: BREADTH_R2_METHOD_R1,
      status: "PARTIAL",
      score: null,
      state: null,
      interpretation: null,
      strength: null,
      weights: { ...BREADTH_R2_FINAL_WEIGHTS },
      indicators: items,
      missingFactors: [...new Set(missing)],
      finalWeightsApproved: true,
      predictionClaim: false,
      integrationReady: false,
    };
  }

  const score = ORDER.reduce(
    (sum, id, index) => sum + BREADTH_R2_FINAL_WEIGHTS[id] * indicators[index].score,
    0
  );
  const direction = interpretation(score);

  return {
    methodologyVersion: BREADTH_R2_METHOD_R1,
    status: "READY",
    score,
    state: direction.state,
    interpretation: direction.label,
    strength: direction.strength,
    weights: { ...BREADTH_R2_FINAL_WEIGHTS },
    indicators,
    missingFactors: [],
    finalWeightsApproved: true,
    predictionClaim: false,
    integrationReady: true,
  };
}

export function finalizeBreadthR2Runtime(runtimeResult = {}) {
  const final = finalizeBreadthR2Candidate(runtimeResult);
  return {
    ...runtimeResult,
    methodologyVersion: BREADTH_R2_METHOD_R1,
    status: final.status,
    score: final.score,
    state: final.state,
    interpretation: final.interpretation,
    strength: final.strength,
    finalMethodology: final,
    finalWeightsApproved: true,
    predictionClaim: false,
    integrationReady: final.integrationReady,
    productionWired: false,
    productionReady: false,
  };
}

export function assertBreadthR2FinalMethod(result) {
  if (!result || result.methodologyVersion !== BREADTH_R2_METHOD_R1) {
    throw new Error("BREADTH_R2_METHOD_VERSION_INVALID");
  }
  if (result.status === "READY") {
    if (!finiteScore(result.score)) throw new Error("BREADTH_R2_READY_SCORE_INVALID");
    if (result.integrationReady !== true) throw new Error("BREADTH_R2_READY_INTEGRATION_FLAG_INVALID");
  } else if (result.status === "PARTIAL") {
    if (result.score !== null) throw new Error("BREADTH_R2_PARTIAL_SCORE_MUST_BE_NULL");
  } else {
    throw new Error("BREADTH_R2_STATUS_INVALID");
  }
  if (result.finalWeightsApproved !== true) {
    throw new Error("BREADTH_R2_FINAL_WEIGHTS_NOT_APPROVED");
  }
  return true;
}
