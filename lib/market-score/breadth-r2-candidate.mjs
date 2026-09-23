export const BREADTH_R2_CANDIDATE_VERSION = "BREADTH-R2-CANDIDATE-R49";

const finite = value => typeof value === "number" && Number.isFinite(value);
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function median(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = values.filter(finite).slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : 0.5 * (sorted[mid - 1] + sorted[mid]);
}

export function scoreForeignPortfolioFlow({
  value,
  priorValues = [],
  scaleQuarters = 20,
} = {}) {
  if (!finite(value)) {
    return { status: "PARTIAL", score: null, reason: "FOREIGN_FLOW_VALUE_MISSING" };
  }
  if (!Number.isInteger(scaleQuarters) || scaleQuarters < 1) {
    return { status: "PARTIAL", score: null, reason: "INVALID_SCALE_QUARTERS" };
  }

  const usable = priorValues.filter(finite);
  if (usable.length < scaleQuarters) {
    return {
      status: "PARTIAL",
      score: null,
      reason: "FOREIGN_FLOW_HISTORY_TOO_SHORT",
      requiredHistory: scaleQuarters,
      availableHistory: usable.length,
    };
  }

  const window = usable.slice(-scaleQuarters);
  const scale = median(window.map(v => Math.abs(v)));
  if (!finite(scale) || scale <= 0) {
    return { status: "PARTIAL", score: null, reason: "FOREIGN_FLOW_INVALID_SCALE" };
  }

  const score = 50 + 50 * value / (scale + Math.abs(value));
  return {
    status: "READY",
    score: clamp(score),
    value,
    scale,
    scaleQuarters,
    neutralRaw: 0,
  };
}

export function scoreShareSupplyBreadth({
  issuers = [],
  extremeGate = 0.50,
  noiseBand = 0,
  minValid = 2000,
  retention = null,
  minRetention = 0.75,
} = {}) {
  if (!Array.isArray(issuers)) {
    return { status: "PARTIAL", score: null, reason: "SUPPLY_ISSUERS_INVALID" };
  }
  if (!finite(extremeGate) || extremeGate <= 0 || !finite(noiseBand) || noiseBand < 0) {
    return { status: "PARTIAL", score: null, reason: "SUPPLY_THRESHOLD_INVALID" };
  }
  if (!Number.isInteger(minValid) || minValid < 1) {
    return { status: "PARTIAL", score: null, reason: "SUPPLY_MIN_VALID_INVALID" };
  }
  if (retention !== null && (!finite(retention) || retention < 0 || retention > 1)) {
    return { status: "PARTIAL", score: null, reason: "SUPPLY_RETENTION_INVALID" };
  }

  let expansion = 0;
  let contraction = 0;
  let unchanged = 0;
  let extremeExcluded = 0;
  let invalidExcluded = 0;

  for (const issuer of issuers) {
    const previous = issuer?.previousShares;
    const current = issuer?.currentShares;
    if (!finite(previous) || !finite(current) || previous <= 0 || current <= 0) {
      invalidExcluded++;
      continue;
    }
    const change = current / previous - 1;
    if (!finite(change)) {
      invalidExcluded++;
      continue;
    }
    if (Math.abs(change) > extremeGate) {
      extremeExcluded++;
      continue;
    }
    if (change > noiseBand) expansion++;
    else if (change < -noiseBand) contraction++;
    else unchanged++;
  }

  const valid = expansion + contraction + unchanged;
  if (retention !== null && retention < minRetention) {
    return {
      status: "PARTIAL",
      score: null,
      reason: "SUPPLY_RETENTION_TOO_LOW",
      quality: { valid, expansion, contraction, unchanged, extremeExcluded, invalidExcluded, retention },
    };
  }
  if (valid < minValid) {
    return {
      status: "PARTIAL",
      score: null,
      reason: "SUPPLY_VALID_COVERAGE_TOO_LOW",
      quality: { valid, expansion, contraction, unchanged, extremeExcluded, invalidExcluded, retention },
    };
  }

  const breadth = (contraction - expansion) / valid;
  return {
    status: "READY",
    score: clamp(50 + 50 * breadth),
    breadth,
    quality: {
      valid,
      expansion,
      contraction,
      unchanged,
      extremeExcluded,
      invalidExcluded,
      retention,
    },
    extremeGate,
    noiseBand,
    minValid,
    minRetention,
  };
}

export function scoreCftcLevelContract({
  long,
  short,
  openInterest,
} = {}) {
  if (![long, short, openInterest].every(finite) || openInterest <= 0) {
    return { status: "PARTIAL", score: null, reason: "CFTC_LEVEL_INPUT_INVALID" };
  }
  const net = long - short;
  const levelPct = 100 * net / openInterest;
  return {
    status: "READY",
    score: clamp(50 + 0.5 * levelPct),
    net,
    levelPct,
  };
}

export function scoreCftcGroup({
  contracts = [],
  requiredContracts = 4,
} = {}) {
  if (!Array.isArray(contracts) || contracts.length !== requiredContracts) {
    return {
      status: "PARTIAL",
      score: null,
      reason: "CFTC_REQUIRED_CONTRACTS_MISSING",
      requiredContracts,
      actualContracts: Array.isArray(contracts) ? contracts.length : 0,
    };
  }

  const components = contracts.map(scoreCftcLevelContract);
  if (components.some(item => item.status !== "READY")) {
    return {
      status: "PARTIAL",
      score: null,
      reason: "CFTC_CONTRACT_INPUT_INVALID",
      components,
    };
  }

  return {
    status: "READY",
    score: components.reduce((sum, item) => sum + item.score, 0) / components.length,
    components,
    requiredContracts,
  };
}

export function buildBreadthR2Outputs({
  foreignPortfolio,
  shareSupply,
  institutionalFutures,
  leveragedFutures,
} = {}) {
  const indicators = [
    {
      id: "breadth-37",
      name: "Foreign Portfolio Equity Flow",
      ...scoreForeignPortfolioFlow(foreignPortfolio),
    },
    {
      id: "breadth-38",
      name: "Share Supply Breadth",
      ...scoreShareSupplyBreadth(shareSupply),
    },
    {
      id: "breadth-39",
      name: "Institutional Futures Positioning",
      ...scoreCftcGroup(institutionalFutures),
    },
    {
      id: "breadth-40",
      name: "Leveraged Futures Positioning",
      ...scoreCftcGroup(leveragedFutures),
    },
  ];

  const allReady = indicators.every(item => item.status === "READY" && finite(item.score));
  return {
    methodologyVersion: BREADTH_R2_CANDIDATE_VERSION,
    status: allReady ? "CANDIDATE_READY" : "PARTIAL",
    score: null,
    finalWeightsApproved: false,
    indicators,
    missingFactors: indicators.filter(item => item.status !== "READY").map(item => item.reason),
  };
}

export function buildEqualWeightBreadthBenchmark(outputs) {
  const indicators = Array.isArray(outputs?.indicators) ? outputs.indicators : [];
  if (indicators.length !== 4 || indicators.some(item => item.status !== "READY" || !finite(item.score))) {
    return { status: "PARTIAL", score: null, reason: "BENCHMARK_INPUTS_INCOMPLETE" };
  }
  return {
    status: "READY",
    score: indicators.reduce((sum, item) => sum + item.score, 0) / 4,
    benchmarkOnly: true,
    finalWeightsApproved: false,
  };
}
