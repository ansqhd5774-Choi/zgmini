const finite = value => typeof value === "number" && Number.isFinite(value);

export const DIAGNOSTIC_METHOD_REVISION = "R7_ACTIVE";

export function clamp100(value) {
  if (!finite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

export function percentileRankExpanding(values, minValid = 1) {
  const history = [];
  return values.map(value => {
    if (!finite(value)) return null;
    history.push(value);
    if (history.length < minValid) return null;
    let lower = 0, equal = 0;
    for (const item of history) {
      if (item < value) lower += 1;
      else if (item === value) equal += 1;
    }
    return (lower + 0.5 * equal) / history.length;
  });
}

export function percentileScores(values, minValid = 1) {
  return percentileRankExpanding(values, minValid).map(p => p === null ? null : 100 * p);
}

export function inversePercentileScores(values, minValid = 1) {
  return percentileRankExpanding(values, minValid).map(p => p === null ? null : 100 * (1 - p));
}

export function strictWeightedScore(parts) {
  const missing = parts.filter(part => !finite(part.score)).map(part => part.id);
  const weightSum = parts.reduce((sum, part) => sum + part.weight, 0);
  if (Math.abs(weightSum - 1) > 1e-12) throw new Error("INVALID_WEIGHT_SUM");
  if (missing.length) return { status: "PARTIAL", score: null, missing };
  return {
    status: "READY",
    score: clamp100(parts.reduce((sum, part) => sum + part.weight * part.score, 0)),
    missing: [],
  };
}

export function inflationStability(input) {
  return strictWeightedScore([
    { id: "corePce", score: input.corePce, weight: 0.35 },
    { id: "coreCpi", score: input.coreCpi, weight: 0.25 },
    { id: "cpi", score: input.cpi, weight: 0.15 },
    { id: "inflationExpectations", score: input.inflationExpectations, weight: 0.25 },
  ]);
}

export function recessionDefense(input) {
  return strictWeightedScore([
    { id: "nfp", score: input.nfp, weight: 0.25 },
    { id: "realGdp", score: input.realGdp, weight: 0.15 },
    { id: "industrialProduction", score: input.industrialProduction, weight: 0.15 },
    { id: "realPce", score: input.realPce, weight: 0.15 },
    { id: "unemployment", score: input.unemployment, weight: 0.10 },
    { id: "retailSales", score: input.retailSales, weight: 0.10 },
    { id: "disposableIncome", score: input.disposableIncome, weight: 0.10 },
  ]);
}

export function liquidityCrisisDefense(input) {
  return strictWeightedScore([
    { id: "fundingStress", score: input.fundingStress, weight: 0.25 },
    { id: "bankReserves", score: input.bankReserves, weight: 0.25 },
    { id: "tga", score: input.tga, weight: 0.15 },
    { id: "onRrp", score: input.onRrp, weight: 0.15 },
    { id: "m2", score: input.m2, weight: 0.10 },
    { id: "bondVolatility", score: input.bondVolatility, weight: 0.10 },
  ]);
}

export function creditRiskDefense(input) {
  return strictWeightedScore([
    { id: "hyCmdi", score: input.hyCmdi, weight: 0.35 },
    { id: "igCmdi", score: input.igCmdi, weight: 0.35 },
    { id: "totalCmdi", score: input.totalCmdi, weight: 0.10 },
    { id: "bondVolatility", score: input.bondVolatility, weight: 0.20 },
  ]);
}

export function earningsRecessionDefense(input) {
  return strictWeightedScore([
    { id: "epsGrowth", score: input.epsGrowth, weight: 0.35 },
    { id: "margin", score: input.margin, weight: 0.25 },
    { id: "revenueGrowth", score: input.revenueGrowth, weight: 0.20 },
    { id: "earningsGrowthBreadth", score: input.earningsGrowthBreadth, weight: 0.20 },
  ]);
}

export function assetBubbleSafety(input) {
  return strictWeightedScore([
    { id: "valuationPressure", score: input.valuationPressure, weight: 0.35 },
    { id: "priceAcceleration", score: input.priceAcceleration, weight: 0.25 },
    { id: "riskAssetShare", score: input.riskAssetShare, weight: 0.15 },
    { id: "speculativeFlows", score: input.speculativeFlows, weight: 0.10 },
    { id: "breadthDivergence", score: input.breadthDivergence, weight: 0.10 },
    { id: "excessLiquidity", score: input.excessLiquidity, weight: 0.05 },
  ]);
}

export function debtRiskSafety(input) {
  return strictWeightedScore([
    { id: "dsr", score: input.dsr, weight: 0.35 },
    { id: "debtGdp", score: input.debtGdp, weight: 0.25 },
    { id: "rateBurden", score: input.rateBurden, weight: 0.15 },
    { id: "creditStress", score: input.creditStress, weight: 0.15 },
    { id: "debtServiceCapacity", score: input.debtServiceCapacity, weight: 0.10 },
  ]);
}

export function supplyShockSafety(input) {
  return strictWeightedScore([
    { id: "gscpi", score: input.gscpi, weight: 0.40 },
    { id: "oilShock", score: input.oilShock, weight: 0.20 },
    { id: "gasolineShock", score: input.gasolineShock, weight: 0.10 },
    { id: "copperShock", score: input.copperShock, weight: 0.10 },
    { id: "industrialProduction", score: input.industrialProduction, weight: 0.10 },
    { id: "headlineCoreGap", score: input.headlineCoreGap, weight: 0.10 },
  ]);
}

export function fundingStressScore(input) {
  const market = strictWeightedScore([
    { id: "sofrIorb", score: input.sofrIorb, weight: 0.35 },
    { id: "obfrIorb", score: input.obfrIorb, weight: 0.30 },
    { id: "repoGap", score: input.repoGap, weight: 0.20 },
    { id: "sofrIorbRv20", score: input.sofrIorbRv20, weight: 0.15 },
  ]);
  if (market.status !== "READY" || !finite(input.bankEmergency)) {
    return {
      status: "PARTIAL",
      score: null,
      missing: [
        ...(market.status === "READY" ? [] : market.missing.map(id => `marketFunding.${id}`)),
        ...(!finite(input.bankEmergency) ? ["bankEmergency"] : []),
      ],
    };
  }
  return {
    status: "READY",
    score: clamp100(0.70 * market.score + 0.30 * input.bankEmergency),
    missing: [],
  };
}

export function debtServiceCapacityScore(levelScore, momentumScore) {
  if (!finite(levelScore) || !finite(momentumScore)) {
    return { status: "PARTIAL", score: null };
  }
  return { status: "READY", score: clamp100(0.5 * levelScore + 0.5 * momentumScore) };
}

export function bondVolatilityScore(input) {
  const values = [input.y2, input.y5, input.y10, input.y30];
  if (!values.every(finite)) return { status: "PARTIAL", score: null };
  return { status: "READY", score: clamp100(values.reduce((a, b) => a + b, 0) / 4) };
}

export function priceAcceleration(current, lag3m, lag12m) {
  if (![current, lag3m, lag12m].every(v => finite(v) && v > 0)) return null;
  return 4 * Math.log(current / lag3m) - Math.log(current / lag12m);
}

export function riskShareChange4Q(current, lag4q) {
  return finite(current) && finite(lag4q) ? current - lag4q : null;
}

export function speculativeFlowScore(priceAccel, inverseFlowPercentileScore) {
  if (!finite(priceAccel) || !finite(inverseFlowPercentileScore)) return null;
  return priceAccel <= 0 ? 100 : clamp100(inverseFlowPercentileScore);
}

export function riskOverlay(input) {
  if (!finite(input.baseOverall)) return { status: "ERROR", finalOverall: null, penalty: null };
  const ids = ["liquidityCrisisDefense", "assetBubbleSafety", "debtRiskSafety", "supplyShockSafety"];
  const missing = ids.filter(id => !finite(input[id]));
  if (missing.length) {
    return {
      status: "PARTIAL",
      baseOverall: clamp100(input.baseOverall),
      finalOverall: clamp100(input.baseOverall),
      penalty: null,
      missing,
    };
  }

  const risk = score => Math.max(0, (45 - score) / 45);
  const penalty = Math.min(
    7,
    2.0 * risk(input.liquidityCrisisDefense)
      + 1.5 * risk(input.assetBubbleSafety)
      + 1.5 * risk(input.debtRiskSafety)
      + 2.0 * risk(input.supplyShockSafety),
  );

  return {
    status: "READY",
    baseOverall: clamp100(input.baseOverall),
    finalOverall: clamp100(input.baseOverall - penalty),
    penalty,
    missing: [],
  };
}
