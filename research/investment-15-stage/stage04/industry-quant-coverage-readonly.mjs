/**
 * R15: neutral coverage of live industry observations for the nine approved F themes.
 *
 * This is an evidence inventory, NOT a score, filter, rank or permission to trade.
 * Different calendars, scopes, proxies, rounded figures or short histories are
 * disclosed instead of being forced into one exact-match pass/fail condition.
 */

const METRICS = Object.freeze({
  '로봇·자동화': { scope: 'WORLD_INDUSTRIAL_ROBOT_INSTALLATIONS', unit: 'robots_per_calendar_year' },
  '클라우드·SaaS': { scope: 'EU_ENTERPRISE_CLOUD_ADOPTION_NOT_SAAS_REVENUE', unit: 'percent_of_eligible_enterprises' },
  '자율주행': { scope: 'CALIFORNIA_WAYMO_DRIVERLESS_TRIPS_ONLY', unit: 'trips_per_calendar_quarter' },
  '원전·SMR': { scope: 'IAEA_PRIS_NOT_CONNECTED', unit: 'not_observed' },
  '방산': { scope: 'SIPRI_RIGHTS_PENDING', unit: 'not_observed' },
  '핀테크': { scope: 'US_FEDNOW_NETWORK_TRANSFERS_NOT_FINTECH_MARKET', unit: 'transfers_per_calendar_quarter' },
  '사이버보안': { scope: 'EU_NIS2_SURVEY_RESPONDENTS_NOT_CYBER_MARKET', unit: 'percent_of_respondents_it_budgets' },
  '바이오·신약': { scope: 'US_FDA_CDER_NOVEL_APPROVALS_NOT_BIOTECH_MARKET', unit: 'novel_approvals_per_calendar_year' },
  '데이터센터·전력': { scope: 'WORLD_DATA_CENTRE_ELECTRICITY_NOT_POWER_REVENUE', unit: 'estimated_TWh_per_calendar_year' },
});

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

function observedRow(row) {
  return typeof row.industryEvidenceState === 'string'
    && row.industryEvidenceState.startsWith('LIVE_');
}

function inventoryRow(row, fetchedAtUtc) {
  const metric = METRICS[row.theme];
  if (!metric || !row.industryOfficialSource || !row.industryInstitution) {
    throw new Error('QUANT_COVERAGE_UNKNOWN_SOURCE_CONTRACT');
  }
  const originalObserved = observedRow(row);
  const exact = row.industryGrowthPct;
  const rounded = row.industryReportedRoundedGrowthPct;
  const accel = row.industryAccelerationPctPoints;
  const twoYear = row.industryTwoYearDeltaPctPoints;
  const deltaWindows = row.industryTwoYearWindowChangePctPoints;

  if ([exact, rounded, accel, twoYear, deltaWindows].some((x) => x !== null && !finite(x))) {
    throw new Error('QUANT_COVERAGE_INVALID_NUMERIC_VALUE');
  }
  if (!originalObserved && [exact, rounded, accel, twoYear, deltaWindows,
    row.industryRawCount, row.industryRawTwh, row.industryRawPercent].some((x) => x !== null)) {
    throw new Error('QUANT_COVERAGE_UNOBSERVED_VALUE');
  }

  const profile = !originalObserved ? 'SOURCE_UNAVAILABLE_NOT_THEME_FAILURE'
    : finite(exact) ? 'COMPUTED_SAME_SOURCE_YOY'
      : finite(rounded) ? 'SOURCE_PUBLISHED_ROUNDED_YOY'
        : finite(twoYear) ? 'SPARSE_MULTIYEAR_PERCENTAGE_POINT_CHANGE'
          : 'OBSERVED_LEVEL_NO_GROWTH';

  return {
    theme: row.theme,
    officialInstitution: row.industryInstitution,
    officialUrl: row.industryOfficialSource,
    fetchedAtUtc,
    observationPeriod: originalObserved ? row.industryObservationPeriod : null,
    sourceObservedThisRun: originalObserved,
    themeRetained: true,
    verificationDisposition: originalObserved ? 'OBSERVED_USABLE_WITH_LIMITS' : 'NOT_OBSERVED_KEEP_THEME_PENDING',
    metricScope: metric.scope,
    metricUnit: metric.unit,
    evidenceProfile: profile,
    observedRawCount: originalObserved ? row.industryRawCount : null,
    observedRawTwh: originalObserved ? row.industryRawTwh : null,
    observedRawPercent: originalObserved ? row.industryRawPercent : null,
    exactWithinSourceYoyPct: exact,
    sourcePublishedRoundedYoyPct: rounded,
    withinSourceAccelerationPctPoints: accel,
    twoYearPercentagePointDeltaNotYoy: twoYear,
    changeBetweenTwoYearWindowsNotAnnualAccel: deltaWindows,
    calculatedGlobalIndustryGrowthPct: null,
    limitedProxy: originalObserved ? row.provisionalIndustryProxy : null,
    limitation: row.industryReviewFlag,
    noExactMatchRequired: true,
    approvedGrowthG: null,
    approvedDislocationD: null,
    approvedAttractivenessM: null,
    officialRank: null,
  };
}

export function buildIndustryQuantCoverage(gate) {
  if (!gate || !/^INVESTMENT_BOT_STAGE04_INPUT_GATE_R1[234567]$/.test(gate.runType ?? '')
    || !/^\d{4}-\d{2}-\d{2}T/.test(gate.runAtUtc ?? '')
    || !Array.isArray(gate.themes) || gate.themes.length !== 9
    || new Set(gate.themes.map((x) => x.theme)).size !== 9
    || gate.automatedTradeEnabled !== false || !Array.isArray(gate.orderRequests)
    || gate.orderRequests.length !== 0
    || gate.themes.some((x) => x.approvedGrowthG !== null || x.approvedDislocationD !== null
      || x.approvedAttractivenessM !== null || x.officialRank !== null)) {
    throw new Error('QUANT_COVERAGE_INPUT_OR_NO_TRADE_CONTRACT_DRIFT');
  }
  const rows = gate.themes.map((row) => inventoryRow(row, gate.runAtUtc));
  if (Object.keys(METRICS).some((theme) => !rows.some((row) => row.theme === theme))) {
    throw new Error('QUANT_COVERAGE_MISSING_THEME');
  }
  const profileCounts = Object.fromEntries([
    'COMPUTED_SAME_SOURCE_YOY', 'SOURCE_PUBLISHED_ROUNDED_YOY',
    'SPARSE_MULTIYEAR_PERCENTAGE_POINT_CHANGE', 'OBSERVED_LEVEL_NO_GROWTH',
    'SOURCE_UNAVAILABLE_NOT_THEME_FAILURE',
  ].map((profile) => [profile, rows.filter((x) => x.evidenceProfile === profile).length]));
  return {
    state: 'QUANT_OBSERVATIONS_CLASSIFIED_NO_THRESHOLD_DISQUALIFICATION',
    gateCompletedAtUtc: gate.runAtUtc,
    evaluatedThemes: rows.length,
    retainedThemes: rows.length,
    originalIndustrySourcesObserved: rows.filter((x) => x.sourceObservedThisRun).length,
    exactWithinSourceYoyAvailable: rows.filter((x) => finite(x.exactWithinSourceYoyPct)).length,
    observedWithinSourceAccelerationAvailable: rows.filter((x) => finite(x.withinSourceAccelerationPctPoints)).length,
    profileCounts,
    rules: [
      'No identical publication date, unit, annual sample count or history length is a required PASS gate.',
      'Partial, sparse, rounded, and level-only official observations remain usable with precise scope labels.',
      'Published rounded growth does not fabricate exact growth or prior-year values.',
      'Budget share and multi-year adoption-point deltas are not annual market growth or acceleration.',
      'Unavailable official sources remain pending without rejecting an approved theme or reusing stored observations.',
      'Across-industry percentage metrics are not directly comparable until a separate approved normalization exists.',
      'No numeric confidence weights, G/D/M scores, official ranking, data-provider change or trade is authorized.',
    ],
    rows,
  };
}
