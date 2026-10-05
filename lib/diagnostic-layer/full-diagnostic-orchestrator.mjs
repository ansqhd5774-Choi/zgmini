import {
  buildAssetBubbleBatchA,
  buildDebtRiskBatchA,
  buildInflationBatchA,
} from './batch-a-components.mjs';
import {buildInflationExpectationsComponent} from './batch-b-components.mjs';
import {buildBisDebtRiskComponents} from './bis-debt-components.mjs';
import {buildBondVolatilityR6} from './bond-vol-r6-components.mjs';
import {
  buildBankEmergencyR7,
  buildFundingStressR7,
} from './liquidity-funding-r7-components.mjs';
import {buildRecessionDefenseR13} from './recession-r13-components.mjs';
import {
  buildAssetBubbleR9Partial,
  buildPriceAccelerationR9,
  buildSpeculativeFlowMagnitudeR57,
  buildSpeculativeFlowsR9,
} from './asset-bubble-r9-components.mjs';
import {buildSupplyShockR9} from './supply-r9-components.mjs';
import {buildR1DiagnosticSnapshot} from './r1-diagnostic-pipeline.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function latestRowAtOrBefore(rows, asOfDate) {
  let latest = null;
  for (const row of rows ?? []) {
    if (!validDate(row?.observationDate) || row.observationDate > asOfDate) continue;
    if (!latest || row.observationDate > latest.observationDate) latest = row;
  }
  return latest;
}

function latestValueAtOrBefore(rows, asOfDate, field = 'value') {
  let latest = null;
  for (const row of rows ?? []) {
    if (!validDate(row?.observationDate) || row.observationDate > asOfDate) continue;
    if (!finite(row?.[field])) continue;
    if (!latest || row.observationDate > latest.observationDate) {
      latest = {observationDate: row.observationDate, value: row[field]};
    }
  }
  return latest;
}

function safeBisDebt(bisDsrParsed, bisDebtGdpParsed) {
  if (!bisDsrParsed || !bisDebtGdpParsed) {
    return {
      status: 'PARTIAL',
      reason: 'BIS_PARSED_INPUTS_NOT_SUPPLIED',
      historyMode: 'CURRENT_VINTAGE_ONLY',
      lookAheadSafe: false,
      dsr: {score: []},
      debtGdp: {score: []},
    };
  }
  try {
    return buildBisDebtRiskComponents(bisDsrParsed, bisDebtGdpParsed);
  } catch (error) {
    return {
      status: 'ERROR',
      reason: String(error?.message ?? error),
      historyMode: 'CURRENT_VINTAGE_ONLY',
      lookAheadSafe: false,
      dsr: {score: []},
      debtGdp: {score: []},
    };
  }
}

function diagnosticMissing(snapshot) {
  const out = {};
  for (const [key, value] of Object.entries(snapshot?.diagnostics ?? {})) {
    if (value?.status === 'READY') continue;
    out[key] = Array.isArray(value?.missing) ? value.missing : [];
  }
  return out;
}

export function buildFullDiagnosticOrchestrator({
  asOfDate,
  baseOverall,
  series = {},
  external = {},
  compute = (fn,...args)=>fn(...args),
} = {}) {
  if (!validDate(asOfDate)) {
    throw new Error('AS_OF_DATE_REQUIRED');
  }

  const inflationBatchA = compute(buildInflationBatchA,{
    corePce: series.PCEPILFE ?? [],
    headlinePce: series.PCEPI ?? [],
    coreCpi: series.CPILFESL ?? [],
    headlineCpi: series.CPIAUCSL ?? [],
  });
  const inflationExpectations = compute(buildInflationExpectationsComponent,
    external.inflationExpectationsRows ?? series.EXPINF5YR ?? [],
  );

  const recession = compute(buildRecessionDefenseR13,{
    payems: series.PAYEMS ?? [],
    gdpc1: series.GDPC1 ?? [],
    indpro: series.INDPRO ?? [],
    realPce: series.DPCERA3M086SBEA ?? [],
    unemployment: series.UNRATE ?? [],
    retailSales: series.RRSFS ?? [],
    disposableIncome: series.DSPIC96 ?? [],
  });

  const bankEmergency = compute(buildBankEmergencyR7,{
    primaryCredit: series.WLCFLPCL ?? [],
    secondaryCredit: series.WLCFLSCL ?? [],
    btfp: series.H41RESPPALDKNWW ?? [],
    otherCreditExtensions: series.WLCFOCEL ?? [],
    totalCommercialBankAssets: series.TLAACBM027NBOG ?? [],
  });

  const fundingStress = compute(buildFundingStressR7,{
    sofr: series.SOFR ?? [],
    iorb: series.IORB ?? [],
    obfr: series.OBFR ?? [],
    dvpRepo: external.dvpRepoRows ?? [],
    triPartyRepo: external.triPartyRepoRows ?? [],
    bankEmergency,
  });

  const bondVolatility = compute(buildBondVolatilityR6,{
    y2: series.DGS2 ?? [],
    y5: series.DGS5 ?? [],
    y10: series.DGS10 ?? [],
    y30: series.DGS30 ?? [],
  });

  const assetBatchA = compute(buildAssetBubbleBatchA,{
    publicFinancialEquity: series.BOGZ1LM793164115Q ?? [],
    publicNonfinancialEquity: series.BOGZ1LM103164115Q ?? [],
    nominalGdp: series.GDP ?? [],
    riskAssetShare: series.BOGZ1FL153064486Q ?? [],
    m2: series.M2SL ?? [],
  });
  const assetPriceRows =
    Array.isArray(external.assetPriceRows) && external.assetPriceRows.length
      ? external.assetPriceRows
      : series.SPASTT01USM661N ?? [];
  const priceAcceleration = compute(buildPriceAccelerationR9,assetPriceRows);
  const speculativeFlowMagnitudeR57 = compute(buildSpeculativeFlowMagnitudeR57,{
    transactionRows: series.BOGZ1FA153064475Q ?? [],
    holdingsRows: series.BOGZ1FL153064475Q ?? [],
  });
  const speculativeFlowMagnitude4QRows =
    Array.isArray(external.speculativeFlowMagnitude4QRows)
    && external.speculativeFlowMagnitude4QRows.length
      ? external.speculativeFlowMagnitude4QRows
      : speculativeFlowMagnitudeR57.rows;
  const speculativeFlows = compute(buildSpeculativeFlowsR9,
    speculativeFlowMagnitude4QRows,
    priceAcceleration.quarterly,
  );
  const assetBubble = compute(buildAssetBubbleR9Partial,{
    valuationScoreRows: assetBatchA.valuation.score,
    priceAccelerationQuarterRows: priceAcceleration.quarterly,
    riskAssetShareScoreRows: assetBatchA.riskAssetShare.score,
    speculativeFlowRows: speculativeFlows.rows,
    excessLiquidityScoreRows: assetBatchA.excessLiquidity.score,
    breadthScoreRows: external.breadthScoreRows ?? [],
  });

  const debtBatchA = compute(buildDebtRiskBatchA,{
    netInterest: series.B471RC1Q027SBEA ?? [],
    grossValueAdded: series.A455RC1Q027SBEA ?? [],
    profitsBeforeTax: series.A464RC1Q027SBEA ?? [],
  });
  const bisDebt = compute(safeBisDebt,
    external.bisDsrParsed ?? null,
    external.bisDebtGdpParsed ?? null,
  );

  const supply = compute(buildSupplyShockR9,{
    gscpi: external.gscpiRows ?? [],
    wti: series.MCOILWTICO ?? [],
    gasoline: series.GASREGCOVM ?? [],
    copper: external.copperRows ?? [],
    industrialProduction: series.INDPRO ?? [],
    headlineCpi: series.CPIAUCSL ?? [],
    coreCpi: series.CPILFESL ?? [],
  });

  const inflationInput = {
    corePce: latestValueAtOrBefore(inflationBatchA.corePce.score, asOfDate)?.value ?? null,
    coreCpi: latestValueAtOrBefore(inflationBatchA.coreCpi.score, asOfDate)?.value ?? null,
    cpi: latestValueAtOrBefore(inflationBatchA.headlineCpi.score, asOfDate)?.value ?? null,
    inflationExpectations: latestValueAtOrBefore(inflationExpectations.score, asOfDate)?.value ?? null,
  };

  // Recession components are released on different calendars.
  // Preserve the approved as-of contract by selecting each finite component
  // independently at or before asOfDate. This is carry-to-asOf, not interpolation.
  const recessionInput = {
    nfp: latestValueAtOrBefore(recession.rows, asOfDate, 'nfpScore')?.value ?? null,
    realGdp: latestValueAtOrBefore(recession.rows, asOfDate, 'realGdpScore')?.value ?? null,
    industrialProduction: latestValueAtOrBefore(recession.rows, asOfDate, 'industrialProductionScore')?.value ?? null,
    realPce: latestValueAtOrBefore(recession.rows, asOfDate, 'realPceScore')?.value ?? null,
    unemployment: latestValueAtOrBefore(recession.rows, asOfDate, 'unemploymentScore')?.value ?? null,
    retailSales: latestValueAtOrBefore(recession.rows, asOfDate, 'retailSalesScore')?.value ?? null,
    disposableIncome: latestValueAtOrBefore(recession.rows, asOfDate, 'disposableIncomeScore')?.value ?? null,
  };

  const assetRow = latestRowAtOrBefore(assetBubble.rows, asOfDate);
  const assetInput = {
    valuationPressure: assetRow?.valuationPressure ?? null,
    priceAcceleration: assetRow?.priceAcceleration ?? null,
    riskAssetShare: assetRow?.riskAssetShare ?? null,
    speculativeFlows: assetRow?.speculativeFlows ?? null,
    breadthDivergence: assetRow?.breadthDivergence ?? null,
    excessLiquidity: assetRow?.excessLiquidity ?? null,
  };

  const debtInput = {
    dsr: latestValueAtOrBefore(bisDebt.dsr?.score ?? [], asOfDate)?.value ?? null,
    debtGdp: latestValueAtOrBefore(bisDebt.debtGdp?.score ?? [], asOfDate)?.value ?? null,
    rateBurden: latestValueAtOrBefore(debtBatchA.rateBurden.score, asOfDate)?.value ?? null,
    debtServiceCapacity: latestValueAtOrBefore(
      debtBatchA.debtServiceCapacity.score,
      asOfDate,
    )?.value ?? null,
  };

  const supplyRow = latestRowAtOrBefore(supply.rows, asOfDate);
  const supplyInput = {
    gscpi: supplyRow?.gscpiScore ?? null,
    oilShock: supplyRow?.oilScore ?? null,
    gasolineShock: supplyRow?.gasolineScore ?? null,
    copperShock: supplyRow?.copperScore ?? null,
    industrialProduction: supplyRow?.industrialProductionScore ?? null,
    headlineCoreGap: supplyRow?.headlineCoreGapScore ?? null,
  };

  const earningsInput = {
    epsGrowth: finite(external.earningsScores?.epsGrowth)
      ? external.earningsScores.epsGrowth : null,
    margin: finite(external.earningsScores?.margin)
      ? external.earningsScores.margin : null,
    revenueGrowth: finite(external.earningsScores?.revenueGrowth)
      ? external.earningsScores.revenueGrowth : null,
    earningsGrowthBreadth: finite(external.earningsScores?.earningsGrowthBreadth)
      ? external.earningsScores.earningsGrowthBreadth : null,
  };

  const snapshot = buildR1DiagnosticSnapshot({
    asOfDate,
    baseOverall,
    series,
    cmdiRows: external.cmdiRows ?? [],
    fundingStressRows: fundingStress.rows,
    bondVolatilityRows: bondVolatility.rows,
    inflation: inflationInput,
    recession: recessionInput,
    earnings: earningsInput,
    assetBubble: assetInput,
    debt: debtInput,
    supply: supplyInput,
  });

  return {
    status: snapshot.status,
    asOfDate,
    activeRevision: 'DIAGNOSTIC_SCORE_TRANSFORM_R1',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    snapshot,
    artifacts: {
      inflationBatchA,
      inflationExpectations,
      recession,
      bankEmergency,
      fundingStress,
      bondVolatility,
      assetBatchA,
      priceAcceleration,
      speculativeFlowMagnitudeR57,
      speculativeFlows,
      assetBubble,
      debtBatchA,
      bisDebt,
      supply,
    },
    partials: diagnosticMissing(snapshot),
    limitations: {
      earningsHistoricalPointInTime: 'PARTIAL',
      assetBreadthPointInTime: (external.breadthScoreRows ?? []).length
        ? 'EXTERNAL_INPUT_SUPPLIED'
        : 'PARTIAL',
      gscpiProductionFetch: 'DEFERRED_EXACT_CURRENT_URL_UNRESOLVED',
      releaseDateAvailableAt: 'CURRENT_VINTAGE_ONLY_NOT_PROVEN',
    },
  };
}
