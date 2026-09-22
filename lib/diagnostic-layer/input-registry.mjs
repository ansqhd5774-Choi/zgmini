// Diagnostic official-macro input registry.
// Source IDs are locked to previously validated diagnostic evidence.
// This registry does not imply look-ahead-safe historical availability.

const s = (authority, frequency, roles, extra = {}) => Object.freeze({
  transport: 'FRED_API',
  authority,
  frequency,
  roles: Object.freeze([...roles]),
  historyMode: 'CURRENT_VINTAGE_ONLY',
  releaseDatePolicy: 'NULL_UNTIL_PROVEN',
  availableAtPolicy: 'NULL_UNTIL_PROVEN',
  ...extra,
});

export const DIAGNOSTIC_FRED_SERIES = Object.freeze({
  PCEPILFE: s('BEA', 'MONTHLY', ['inflation.corePce']),
  PCEPI: s('BEA', 'MONTHLY', ['inflation.headlinePceTargetBridge']),
  CPILFESL: s('BLS', 'MONTHLY', ['inflation.coreCpi', 'supply.coreCpi']),
  CPIAUCSL: s('BLS', 'MONTHLY', ['inflation.headlineCpi', 'supply.headlineCpi']),
  EXPINF5YR: s('CLEVELAND_FED', 'MONTHLY', ['inflation.inflationExpectations']),
  PAYEMS: s('BLS', 'MONTHLY', ['recession.nfp']),
  GDPC1: s('BEA', 'QUARTERLY', ['recession.realGdp']),
  INDPRO: s('FRB', 'MONTHLY', ['recession.industrialProduction', 'supply.industrialProduction']),
  DPCERA3M086SBEA: s('BEA', 'MONTHLY', ['recession.realPce']),
  UNRATE: s('BLS', 'MONTHLY', ['recession.unemployment']),
  RRSFS: s('US_CENSUS', 'MONTHLY', ['recession.retailSales']),
  DSPIC96: s('BEA', 'MONTHLY', ['recession.disposableIncome']),
  DTWEXBGS: s('FRB', 'DAILY', ['dollarFx.broadDollar']),

  SOFR: s('NY_FED', 'DAILY', ['liquidity.sofr']),
  IORB: s('FRB', 'DAILY', ['liquidity.iorb']),
  OBFR: s('NY_FED', 'DAILY', ['liquidity.obfr']),
  WRESBAL: s('FRB', 'WEEKLY', ['liquidity.bankReserves']),
  WTREGEN: s('US_TREASURY', 'WEEKLY', ['liquidity.tga']),
  RRPONTSYD: s('NY_FED', 'DAILY', ['liquidity.onRrp']),
  M2SL: s('FRB', 'MONTHLY', ['liquidity.m2', 'assetBubble.m2']),
  WLCFLPCL: s('FRB', 'WEEKLY', ['liquidity.primaryCredit']),
  WLCFLSCL: s('FRB', 'WEEKLY', ['liquidity.secondaryCredit']),
  H41RESPPALDKNWW: s('FRB', 'WEEKLY', ['liquidity.btfp']),
  WLCFOCEL: s('FRB', 'WEEKLY', ['liquidity.otherCreditExtensions']),
  TLAACBM027NBOG: s('FRB', 'WEEKLY', ['liquidity.bankAssets']),

  DGS2: s('US_TREASURY_FRB', 'DAILY', ['credit.treasury2y']),
  DGS5: s('US_TREASURY_FRB', 'DAILY', ['credit.treasury5y']),
  DGS10: s('US_TREASURY_FRB', 'DAILY', ['credit.treasury10y']),
  DGS30: s('US_TREASURY_FRB', 'DAILY', ['credit.treasury30y']),

  GDP: s('BEA', 'QUARTERLY', ['assetBubble.nominalGdp']),
  BOGZ1LM793164115Q: s('FRB_Z1', 'QUARTERLY', ['assetBubble.publicFinancialEquityValue']),
  BOGZ1LM103164115Q: s('FRB_Z1', 'QUARTERLY', ['assetBubble.publicNonfinancialEquityValue']),
  BOGZ1FL153064486Q: s('FRB_Z1', 'QUARTERLY', ['assetBubble.riskAssetShare']),
  BOGZ1FA153064475Q: s('FRB_Z1', 'QUARTERLY', ['assetBubble.householdEquityTransactions']),
  BOGZ1FL153064475Q: s('FRB_Z1', 'QUARTERLY', ['assetBubble.householdEquityHoldings']),

  B471RC1Q027SBEA: s('BEA', 'QUARTERLY', ['debt.netInterest']),
  A455RC1Q027SBEA: s('BEA', 'QUARTERLY', ['debt.grossValueAdded']),
  A464RC1Q027SBEA: s('BEA', 'QUARTERLY', ['debt.profitsBeforeTax']),

  MCOILWTICO: s('EIA', 'MONTHLY', ['supply.wti']),
  GASREGCOVM: s('EIA', 'MONTHLY', ['supply.gasoline']),
});

export const DIAGNOSTIC_BLS_FALLBACKS = Object.freeze({
  CPIAUCSL: Object.freeze({seriesId: 'CUSR0000SA0', authority: 'BLS', role: 'CROSS_CHECK_ONLY'}),
  CPILFESL: Object.freeze({seriesId: 'CUSR0000SA0L1E', authority: 'BLS', role: 'CROSS_CHECK_ONLY'}),
  PAYEMS: Object.freeze({seriesId: 'CES0000000001', authority: 'BLS', role: 'CROSS_CHECK_ONLY'}),
  UNRATE: Object.freeze({seriesId: 'LNS14000000', authority: 'BLS', role: 'CROSS_CHECK_ONLY'}),
});

export const DIAGNOSTIC_BEA_CROSSCHECKS = Object.freeze({
  PCEPILFE: Object.freeze({dataset: 'NIPA', table: 'T20804', frequency: 'M', role: 'CROSS_CHECK_ONLY'}),
  GDPC1: Object.freeze({dataset: 'NIPA', table: 'T10106', frequency: 'Q', role: 'CROSS_CHECK_ONLY'}),
});

export const BATCH_A_FRED_SERIES_IDS = Object.freeze(Object.keys(DIAGNOSTIC_FRED_SERIES).filter(id => id !== 'EXPINF5YR'));
export const BATCH_B_FRED_SERIES_IDS = Object.freeze(['EXPINF5YR']);

export function diagnosticSeriesSpec(seriesId) {
  return DIAGNOSTIC_FRED_SERIES[seriesId] ?? null;
}

export function diagnosticRoleIndex() {
  const out = new Map();
  for (const [seriesId, spec] of Object.entries(DIAGNOSTIC_FRED_SERIES)) {
    for (const role of spec.roles) {
      if (out.has(role)) throw new Error(`DUPLICATE_DIAGNOSTIC_ROLE:${role}`);
      out.set(role, Object.freeze({seriesId, ...spec}));
    }
  }
  return out;
}
