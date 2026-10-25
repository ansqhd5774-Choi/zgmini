/**
 * R17: juxtapose current observed ETF fear/greed F with source-specific industry
 * activity directions. This is an exploratory review list, NOT an approved
 * growth G, dislocation D, attractiveness M, ranking, filter or trade signal.
 *
 * A positive proxy trend does not establish whole-industry growth, and a
 * depressed F does not establish investment value. No metric is silently
 * converted from two-year pp, rounded YoY, level-only or missing evidence.
 */

const finite = (x) => typeof x === 'number' && Number.isFinite(x);

export function describeSentimentBand(score) {
  if (!finite(score) || score < 0 || score > 100) return null;
  // Existing display-guide boundaries only; not a selection/approval cutoff.
  return score < 25 ? 'EXTREME_FEAR' : score < 45 ? 'FEAR'
    : score < 55 ? 'NEUTRAL' : score < 75 ? 'GREED' : 'EXTREME_GREED';
}

function industryDirection(row) {
  const exact = row.exactWithinSourceYoyPct;
  const rounded = row.sourcePublishedRoundedYoyPct;
  const multiYear = row.twoYearPercentagePointDeltaNotYoy;
  if (!row.sourceObservedThisRun) {
    return { basis: 'SOURCE_NOT_OBSERVED', direction: 'UNKNOWN', observedChange: null,
      changeUnit: null, observationWindow: null };
  }
  const candidate = finite(exact) ? { value: exact, basis: 'SAME_SOURCE_SAME_PERIOD_EXACT_YOY', unit: 'pct_yoy' }
    : finite(rounded) ? { value: rounded, basis: 'SOURCE_PUBLISHED_ROUNDED_YOY', unit: 'pct_yoy_rounded' }
      : finite(multiYear) ? { value: multiYear, basis: 'SPARSE_MULTIYEAR_PERCENTAGE_POINT_DELTA_NOT_YOY', unit: 'percentage_points_over_multiple_years' }
        : null;
  if (!candidate) return { basis: 'OBSERVED_LEVEL_ONLY_NO_CHANGE', direction: 'UNKNOWN', observedChange: null,
    changeUnit: null, observationWindow: row.observationPeriod };
  return {
    basis: candidate.basis,
    direction: candidate.value > 0 ? 'UP' : candidate.value < 0 ? 'DOWN' : 'FLAT',
    observedChange: candidate.value,
    changeUnit: candidate.unit,
    observationWindow: row.observationPeriod,
  };
}

export function buildSentimentIndustryContrast(gate, quantCoverage) {
  if (!gate || gate.runType !== 'INVESTMENT_BOT_STAGE04_INPUT_GATE_R17'
    || !Array.isArray(gate.themes) || gate.themes.length !== 9
    || new Set(gate.themes.map((r) => r.theme)).size !== 9
    || !quantCoverage || quantCoverage.gateCompletedAtUtc !== gate.runAtUtc
    || !Array.isArray(quantCoverage.rows) || quantCoverage.rows.length !== 9
    || gate.automatedTradeEnabled !== false || !Array.isArray(gate.orderRequests)
    || gate.orderRequests.length !== 0
    || gate.themes.some((r) => r.approvedGrowthG !== null || r.approvedDislocationD !== null
      || r.approvedAttractivenessM !== null || r.officialRank !== null)) {
    throw new Error('SENTIMENT_INDUSTRY_CONTRAST_INVALID_READONLY_GATE');
  }
  const evidence = new Map(quantCoverage.rows.map((r) => [r.theme, r]));
  if (evidence.size !== 9) throw new Error('SENTIMENT_INDUSTRY_CONTRAST_DUPLICATE_EVIDENCE');
  const rows = gate.themes.map((theme) => {
    const metric = evidence.get(theme.theme);
    if (!metric || metric.officialInstitution !== theme.industryInstitution
      || metric.approvedGrowthG !== null || metric.approvedDislocationD !== null
      || metric.approvedAttractivenessM !== null || metric.officialRank !== null) {
      throw new Error('SENTIMENT_INDUSTRY_CONTRAST_SOURCE_MISMATCH');
    }
    const fBand = describeSentimentBand(theme.sentimentF);
    const phase = theme.sentimentPhase;
    if ((fBand === null) !== (theme.sentimentF === null)
      || !['PROVISIONAL', 'BASE_OBSERVED', 'UNAVAILABLE'].includes(phase)
      || (fBand === null) !== (phase === 'UNAVAILABLE')
      || (fBand === null) !== (theme.sentimentObservationDate === null)) {
      throw new Error('SENTIMENT_INDUSTRY_CONTRAST_F_VALUE_OR_PHASE_INVALID');
    }
    const activity = industryDirection(metric);
    const fear = fBand === 'FEAR' || fBand === 'EXTREME_FEAR';
    const candidate = fear && activity.direction === 'UP';
    return {
      theme: theme.theme,
      F: theme.sentimentF,
      fBandDisplayOnly: fBand,
      fObservationDate: theme.sentimentObservationDate,
      fObservationPhase: phase,
      institution: metric.officialInstitution,
      industryProxyScope: metric.metricScope,
      industryObservedThisRun: metric.sourceObservedThisRun,
      industryObservationPeriod: activity.observationWindow,
      industryTrendBasis: activity.basis,
      industryTrendDirection: activity.direction,
      industryObservedChange: activity.observedChange,
      industryChangeUnit: activity.changeUnit,
      // No AND-gate disqualification: this is a description, not a PASS/FAIL.
      exploratoryReviewCase: candidate
        ? activity.basis === 'SPARSE_MULTIYEAR_PERCENTAGE_POINT_DELTA_NOT_YOY'
          ? 'LOW_F_WITH_POSITIVE_SPARSE_MULTIYEAR_PROXY_REVIEW'
          : 'LOW_F_WITH_POSITIVE_YOY_PROXY_REVIEW'
        : fear && activity.direction === 'UNKNOWN' ? 'LOW_F_INDUSTRY_DIRECTION_UNKNOWN_KEEP'
          : fear && activity.direction === 'DOWN' ? 'LOW_F_WITH_DECLINING_PROXY_KEEP'
            : fBand === null ? 'F_MISSING_KEEP_UNASSESSED'
              : activity.direction === 'UNKNOWN' ? 'INDUSTRY_DIRECTION_UNKNOWN_KEEP'
                : 'OBSERVED_PAIR_NO_LOW_F_POSITIVE_PROXY_HYPOTHESIS',
      possibleLowFPositiveProxyContrast: candidate,
      allNineThemesRetained: true,
      requiresComparabilityReview: true,
      approvedGrowthG: null,
      approvedDislocationD: null,
      approvedAttractivenessM: null,
      officialRank: null,
    };
  });
  return {
    state: 'LIVE_F_AND_INDUSTRY_PROXY_SIDE_BY_SIDE_EXPLORATORY_NOT_AN_INVESTMENT_SCORE',
    gateCompletedAtUtc: gate.runAtUtc,
    themeCount: rows.length,
    retainedThemes: rows.length,
    FObservedCount: rows.filter((r) => r.fBandDisplayOnly !== null).length,
    industryDirectionalEvidenceCount: rows.filter((r) => r.industryTrendDirection !== 'UNKNOWN').length,
    exploratoryLowFPositiveProxyCases: rows.filter((r) => r.possibleLowFPositiveProxyContrast).length,
    exactOrRoundedYoyContrastCases: rows.filter((r) => r.possibleLowFPositiveProxyContrast
      && r.industryChangeUnit !== 'percentage_points_over_multiple_years').length,
    sparseMultiYearContrastCases: rows.filter((r) => r.possibleLowFPositiveProxyContrast
      && r.industryChangeUnit === 'percentage_points_over_multiple_years').length,
    themeFailures: 0,
    zeroFilledMissingValues: 0,
    growthGApproved: false,
    dislocationDApproved: false,
    attractivenessMApproved: false,
    officialRankingEnabled: false,
    automatedTradeEnabled: false,
    notes: [
      'F bands 25/45/55/75 are existing display context only, not newly approved investment cutoffs.',
      'A research case flags low observed ETF sentiment and upward activity in a LIMITED proxy. It is not attractive-value or undervaluation proof.',
      'Exact annual YoY, source-rounded annual YoY, and sparse two-year percentage-point movement retain distinct bases and may never be added or ranked as equivalent.',
      'A downward, level-only or missing industry proxy does not reject the ETF theme and is never assigned zero growth.',
      'Source observation periods can differ from F observation dates. Never claim same-day industry growth or whole-industry representation.',
      'No G/D/M weights, normalization, approved industry score, official priority list, brokerage connection or order is produced.',
    ],
    rows,
  };
}
