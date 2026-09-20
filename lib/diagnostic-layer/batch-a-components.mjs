import {
  calendarQuarterAverage,
  changeMonths,
  exactAlign,
  exactLagTransform,
  expandingMedianRows,
  expandingPercentileRows,
  logShockRows,
  quarterlyYoyPercent,
  yoyPercent,
} from './series-math.mjs';

const scoreMap = rows => new Map(rows.map(row => [row.observationDate, row.value]));
const valueMap = rows => new Map(rows.map(row => [row.observationDate, row.value]));

function pairedTargetScore(leftRows, rightRows, {baseTarget = 2, minValid = 60} = {}) {
  const aligned = exactAlign({left: leftRows, right: rightRows});
  const wedgeRows = aligned.map(row => ({
    observationDate: row.observationDate,
    value: row.left - row.right,
  }));
  const medians = valueMap(expandingMedianRows(wedgeRows, {minValid}));
  const target = [];
  const distance = [];
  for (const row of aligned) {
    if (!medians.has(row.observationDate)) continue;
    const targetValue = baseTarget + medians.get(row.observationDate);
    target.push({observationDate: row.observationDate, value: targetValue});
    distance.push({
      observationDate: row.observationDate,
      value: Math.abs(row.left - targetValue),
    });
  }
  const score = expandingPercentileRows(distance, {inverse: true, minValid: 1});
  return {wedge: wedgeRows, target, distance, score};
}

export function buildInflationBatchA({corePce = [], headlinePce = [], coreCpi = [], headlineCpi = []} = {}) {
  const corePceYoy = yoyPercent(corePce);
  const headlinePceYoy = yoyPercent(headlinePce);
  const coreCpiYoy = yoyPercent(coreCpi);
  const headlineCpiYoy = yoyPercent(headlineCpi);

  const corePceDistance = corePceYoy.map(row => ({
    observationDate: row.observationDate,
    value: Math.abs(row.value - 2),
  }));
  const corePceScore = expandingPercentileRows(corePceDistance, {inverse: true, minValid: 60});
  const coreCpiResult = pairedTargetScore(coreCpiYoy, corePceYoy, {baseTarget: 2, minValid: 60});
  const headlineCpiResult = pairedTargetScore(headlineCpiYoy, headlinePceYoy, {baseTarget: 2, minValid: 60});

  return {
    status: 'PARTIAL',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    missing: ['inflationExpectations'],
    corePce: {yoy: corePceYoy, distance: corePceDistance, score: corePceScore, target: 2},
    coreCpi: {yoy: coreCpiYoy, ...coreCpiResult},
    headlineCpi: {yoy: headlineCpiYoy, ...headlineCpiResult},
  };
}

export function buildRecessionRealPce(realPce = []) {
  const annualized3m = exactLagTransform(realPce, 3, (current, lag) =>
    current > 0 && lag > 0 ? 100 * ((current / lag) ** 4 - 1) : null
  );
  const score = expandingPercentileRows(annualized3m, {inverse: false, minValid: 60});
  return {
    status: score.length ? 'READY_CURRENT_VINTAGE' : 'INSUFFICIENT_HISTORY',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    annualized3m,
    score,
  };
}

export function buildAssetBubbleBatchA({
  publicFinancialEquity = [],
  publicNonfinancialEquity = [],
  nominalGdp = [],
  riskAssetShare = [],
  m2 = [],
} = {}) {
  const valuationRaw = exactAlign({
    financial: publicFinancialEquity,
    nonfinancial: publicNonfinancialEquity,
    gdp: nominalGdp,
  })
    .filter(row => row.observationDate >= '1997-01-01' && row.gdp > 0)
    .map(row => ({
      observationDate: row.observationDate,
      value: (row.financial + row.nonfinancial) / row.gdp,
    }));
  const valuationScore = expandingPercentileRows(valuationRaw, {inverse: true, minValid: 12});

  const riskShareChange4q = changeMonths(
    riskAssetShare.filter(row => row.observationDate >= '1990-01-01'),
    12,
  );
  const riskShareScore = expandingPercentileRows(riskShareChange4q, {inverse: true, minValid: 12});

  const m2QuarterAverage = calendarQuarterAverage(m2);
  const m2Yoy = quarterlyYoyPercent(m2QuarterAverage);
  const gdpYoy = quarterlyYoyPercent(nominalGdp);
  const excessLiquidity = exactAlign({m2: m2Yoy, gdp: gdpYoy}).map(row => ({
    observationDate: row.observationDate,
    value: row.m2 - row.gdp,
  }));
  const excessLiquidityScore = expandingPercentileRows(excessLiquidity, {inverse: true, minValid: 20});

  return {
    status: 'PARTIAL',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    missing: ['priceAccelerationScore', 'speculativeFlowsScore', 'breadthDivergenceScore'],
    valuation: {raw: valuationRaw, score: valuationScore},
    riskAssetShare: {change4q: riskShareChange4q, score: riskShareScore},
    excessLiquidity: {m2QuarterAverage, m2Yoy, gdpYoy, raw: excessLiquidity, score: excessLiquidityScore},
  };
}

export function buildDebtRiskBatchA({
  netInterest = [],
  grossValueAdded = [],
  profitsBeforeTax = [],
} = {}) {
  const rateBurden = exactAlign({interest: netInterest, gva: grossValueAdded})
    .filter(row => row.gva !== 0)
    .map(row => ({
      observationDate: row.observationDate,
      value: 100 * row.interest / row.gva,
    }));
  const rateBurdenScore = expandingPercentileRows(rateBurden, {inverse: true, minValid: 20});

  const coverageLevel = exactAlign({profit: profitsBeforeTax, interest: netInterest})
    .filter(row => row.interest !== 0)
    .map(row => ({
      observationDate: row.observationDate,
      value: row.profit / row.interest,
    }));
  const coverageChange4q = changeMonths(coverageLevel, 12);
  const levelScore = expandingPercentileRows(coverageLevel, {inverse: false, minValid: 20});
  const momentumScore = expandingPercentileRows(coverageChange4q, {inverse: false, minValid: 20});
  const levelMap = scoreMap(levelScore);
  const momentumMap = scoreMap(momentumScore);
  const capacityScore = [...new Set([...levelMap.keys()].filter(date => momentumMap.has(date)))]
    .sort()
    .map(observationDate => ({
      observationDate,
      value: 0.5 * levelMap.get(observationDate) + 0.5 * momentumMap.get(observationDate),
    }));

  return {
    status: 'PARTIAL',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    missing: ['dsr', 'debtGdp', 'totalCmdi'],
    rateBurden: {raw: rateBurden, score: rateBurdenScore},
    debtServiceCapacity: {
      level: coverageLevel,
      change4q: coverageChange4q,
      levelScore,
      momentumScore,
      score: capacityScore,
    },
  };
}

export function buildSupplyShockRawBatchA({
  wti = [],
  gasoline = [],
  headlineCpi = [],
  coreCpi = [],
} = {}) {
  const wtiShock = logShockRows(wti);
  const gasolineShock = logShockRows(gasoline);
  const headlineYoy = yoyPercent(headlineCpi);
  const coreYoy = yoyPercent(coreCpi);
  const headlineCoreGap = exactAlign({headline: headlineYoy, core: coreYoy}).map(row => ({
    observationDate: row.observationDate,
    value: row.headline - row.core,
  }));

  return {
    status: 'RAW_ONLY_PARTIAL',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    reason: 'SCORE_WARMUP_NOT_ENCODED_WITHOUT_EXPLICIT_ACTIVE_EVIDENCE',
    wtiShock,
    gasolineShock,
    headlineCoreGap,
  };
}

export function buildBatchAKnownComponents(series = {}) {
  return {
    inflation: buildInflationBatchA({
      corePce: series.PCEPILFE,
      headlinePce: series.PCEPI,
      coreCpi: series.CPILFESL,
      headlineCpi: series.CPIAUCSL,
    }),
    recessionRealPce: buildRecessionRealPce(series.DPCERA3M086SBEA),
    assetBubble: buildAssetBubbleBatchA({
      publicFinancialEquity: series.BOGZ1LM793164115Q,
      publicNonfinancialEquity: series.BOGZ1LM103164115Q,
      nominalGdp: series.GDP,
      riskAssetShare: series.BOGZ1FL153064486Q,
      m2: series.M2SL,
    }),
    debtRisk: buildDebtRiskBatchA({
      netInterest: series.B471RC1Q027SBEA,
      grossValueAdded: series.A455RC1Q027SBEA,
      profitsBeforeTax: series.A464RC1Q027SBEA,
    }),
    supplyShockRaw: buildSupplyShockRawBatchA({
      wti: series.MCOILWTICO,
      gasoline: series.GASREGCOVM,
      headlineCpi: series.CPIAUCSL,
      coreCpi: series.CPILFESL,
    }),
    unresolvedByDesign: Object.freeze({
      recession: ['nfpScore','realGdpScore','industrialProductionScore','unemploymentScore','retailSalesScore','disposableIncomeScore'],
      liquidity: ['fundingStressFull','bankReservesScore','tgaScore','onRrpScore','m2Score'],
      credit: ['bondVolatilityScoreStdevConvention','hyCmdi','igCmdi','totalCmdi'],
      earnings: ['allExternalProviderComponents'],
      assetBubble: ['priceAccelerationScore','speculativeFlowsScore','breadthDivergenceScore'],
      debt: ['dsr','debtGdp','totalCmdi'],
      supply: ['gscpi','copper','commodityScoreWarmup','industrialProductionScore','headlineCoreGapScoreWarmup'],
    }),
  };
}
