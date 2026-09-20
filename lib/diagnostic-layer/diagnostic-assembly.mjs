import {
  assetBubbleSafety,
  creditRiskDefense,
  debtRiskSafety,
  earningsRecessionDefense,
  inflationStability,
  liquidityCrisisDefense,
  recessionDefense,
  riskOverlay,
  supplyShockSafety,
} from './model.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const scoreOrNull = value => finite(value) ? value : null;

export function assembleDiagnosticSnapshot({
  baseOverall,
  inflation = {},
  recession = {},
  liquidity = {},
  credit = {},
  earnings = {},
  assetBubble = {},
  debt = {},
  supply = {},
} = {}) {
  const diagnostics = {
    inflationStability: inflationStability({
      corePce: scoreOrNull(inflation.corePce),
      coreCpi: scoreOrNull(inflation.coreCpi),
      cpi: scoreOrNull(inflation.cpi),
      inflationExpectations: scoreOrNull(inflation.inflationExpectations),
    }),
    recessionDefense: recessionDefense({
      nfp: scoreOrNull(recession.nfp),
      realGdp: scoreOrNull(recession.realGdp),
      industrialProduction: scoreOrNull(recession.industrialProduction),
      realPce: scoreOrNull(recession.realPce),
      unemployment: scoreOrNull(recession.unemployment),
      retailSales: scoreOrNull(recession.retailSales),
      disposableIncome: scoreOrNull(recession.disposableIncome),
    }),
    liquidityCrisisDefense: liquidityCrisisDefense({
      fundingStress: scoreOrNull(liquidity.fundingStress),
      bankReserves: scoreOrNull(liquidity.bankReserves),
      tga: scoreOrNull(liquidity.tga),
      onRrp: scoreOrNull(liquidity.onRrp),
      m2: scoreOrNull(liquidity.m2),
      bondVolatility: scoreOrNull(liquidity.bondVolatility),
    }),
    creditRiskDefense: creditRiskDefense({
      hyCmdi: scoreOrNull(credit.hyCmdi),
      igCmdi: scoreOrNull(credit.igCmdi),
      totalCmdi: scoreOrNull(credit.totalCmdi),
      bondVolatility: scoreOrNull(credit.bondVolatility),
    }),
    earningsRecessionDefense: earningsRecessionDefense({
      epsGrowth: scoreOrNull(earnings.epsGrowth),
      margin: scoreOrNull(earnings.margin),
      revenueGrowth: scoreOrNull(earnings.revenueGrowth),
      earningsGrowthBreadth: scoreOrNull(earnings.earningsGrowthBreadth),
    }),
    assetBubbleSafety: assetBubbleSafety({
      valuationPressure: scoreOrNull(assetBubble.valuationPressure),
      priceAcceleration: scoreOrNull(assetBubble.priceAcceleration),
      riskAssetShare: scoreOrNull(assetBubble.riskAssetShare),
      speculativeFlows: scoreOrNull(assetBubble.speculativeFlows),
      breadthDivergence: scoreOrNull(assetBubble.breadthDivergence),
      excessLiquidity: scoreOrNull(assetBubble.excessLiquidity),
    }),
    debtRiskSafety: debtRiskSafety({
      dsr: scoreOrNull(debt.dsr),
      debtGdp: scoreOrNull(debt.debtGdp),
      rateBurden: scoreOrNull(debt.rateBurden),
      creditStress: scoreOrNull(debt.creditStress),
      debtServiceCapacity: scoreOrNull(debt.debtServiceCapacity),
    }),
    supplyShockSafety: supplyShockSafety({
      gscpi: scoreOrNull(supply.gscpi),
      oilShock: scoreOrNull(supply.oilShock),
      gasolineShock: scoreOrNull(supply.gasolineShock),
      copperShock: scoreOrNull(supply.copperShock),
      industrialProduction: scoreOrNull(supply.industrialProduction),
      headlineCoreGap: scoreOrNull(supply.headlineCoreGap),
    }),
  };

  const overlay = riskOverlay({
    baseOverall: scoreOrNull(baseOverall),
    liquidityCrisisDefense: diagnostics.liquidityCrisisDefense.score,
    assetBubbleSafety: diagnostics.assetBubbleSafety.score,
    debtRiskSafety: diagnostics.debtRiskSafety.score,
    supplyShockSafety: diagnostics.supplyShockSafety.score,
  });

  return {
    status: Object.values(diagnostics).every(item => item.status === 'READY')
      && overlay.status === 'READY'
      ? 'READY_CURRENT_VINTAGE'
      : 'PARTIAL',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    diagnostics,
    overlay,
  };
}
