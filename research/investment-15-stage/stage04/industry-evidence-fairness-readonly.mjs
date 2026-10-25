/**
 * R16: numerical provenance / missingness fairness diagnostic.
 *
 * No confidence-score weights, historical-minimum cutoff, automatic theme
 * rejection, population projection, G/D/M normalization or trading.
 * Read only the immediately completed R16/R17 gate and R15 evidence inventory.
 */

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

function numericReference(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function previousCount(row) {
  if (row.industryPriorComparableCount === null) return { count: null, basis: 'NO_PRIOR_RAW_COUNT' };
  if (!Number.isSafeInteger(row.industryPriorComparableCount) || row.industryPriorComparableCount <= 0) {
    return { count: null, basis: 'INVALID_PRIOR_RAW_COUNT_REVIEW_NOT_DISQUALIFIED' };
  }
  return { count: row.industryPriorComparableCount, basis: 'SAME_INSTITUTION_SAME_SEASON_OR_YEAR' };
}

export function buildIndustryEvidenceFairness(gate, quantCoverage) {
  if (!gate || !/^INVESTMENT_BOT_STAGE04_INPUT_GATE_R1[67]$/.test(gate.runType ?? '')
    || !Array.isArray(gate.themes) || gate.themes.length !== 9
    || !quantCoverage || quantCoverage.gateCompletedAtUtc !== gate.runAtUtc
    || !Array.isArray(quantCoverage.rows) || quantCoverage.rows.length !== 9
    || gate.automatedTradeEnabled !== false || !Array.isArray(gate.orderRequests)
    || gate.orderRequests.length !== 0
    || gate.themes.some((x) => x.approvedGrowthG !== null || x.approvedDislocationD !== null
      || x.approvedAttractivenessM !== null || x.officialRank !== null)) {
    throw new Error('EVIDENCE_FAIRNESS_INVALID_GATE_NO_TRADE_CONTRACT');
  }
  const quantByName = new Map(quantCoverage.rows.map((row) => [row.theme, row]));
  const rows = gate.themes.map((row) => {
    const quant = quantByName.get(row.theme);
    if (!quant || quant.officialInstitution !== row.industryInstitution
      || quant.sourceObservedThisRun !== (typeof row.industryEvidenceState === 'string'
        && row.industryEvidenceState.startsWith('LIVE_'))
      || quant.approvedGrowthG !== null || quant.approvedDislocationD !== null
      || quant.approvedAttractivenessM !== null || quant.officialRank !== null) {
      throw new Error('EVIDENCE_FAIRNESS_SOURCE_ROW_DRIFT');
    }
    const available = quant.sourceObservedThisRun;
    if (!available && [row.industryPriorComparableCount, row.industryHistoricalYoyReferenceCount,
      row.industryHistoricalAccelerationReferenceCount].some((x) => x !== null)) {
      throw new Error('EVIDENCE_FAIRNESS_UNOBSERVED_HISTORY_NOT_NULL');
    }
    const historyYoy = available ? numericReference(row.industryHistoricalYoyReferenceCount) : null;
    const historyAccel = available ? numericReference(row.industryHistoricalAccelerationReferenceCount) : null;
    const prior = available ? previousCount(row) : { count: null, basis: 'SOURCE_UNOBSERVED' };
    const currentCount = available && Number.isSafeInteger(row.industryRawCount)
      && row.industryRawCount > 0 ? row.industryRawCount : null;
    const canRecompute = currentCount !== null && prior.count !== null
      && isFiniteNumber(quant.exactWithinSourceYoyPct);
    const recomputed = canRecompute ? 100 * (currentCount / prior.count - 1) : null;
    const diff = canRecompute ? quant.exactWithinSourceYoyPct - recomputed : null;
    return {
      theme: row.theme,
      sourceObservedThisRun: available,
      observationPeriod: quant.observationPeriod,
      retainedFromApprovedThemeList: true,
      exactSourceYoyObserved: isFiniteNumber(quant.exactWithinSourceYoyPct),
      sourcePublishedRoundedYoyObserved: isFiniteNumber(quant.sourcePublishedRoundedYoyPct),
      historicalYoyReferenceCount: historyYoy,
      historicalAccelerationReferenceCount: historyAccel,
      currentRawCount: currentCount,
      priorComparableRawCount: prior.count,
      priorComparableCountBasis: prior.basis,
      independentlyRecomputedYoyFromTwoLiveCountsPct: recomputed,
      differenceFromReportedExactYoyPctPoints: diff,
      historicalMinimumApplied: false,
      lowHistoryPenaltyPoints: null,
      inventedMissingGrowthPct: null,
      comparativeConfidenceScore: null,
      approvedGrowthG: null,
      approvedDislocationD: null,
      approvedAttractivenessM: null,
      officialRank: null,
    };
  });
  return {
    state: 'NUMERIC_PROVENANCE_WITHOUT_CONFIDENCE_WEIGHT_OR_MISSINGNESS_PENALTY',
    gateCompletedAtUtc: gate.runAtUtc,
    retainedThemes: rows.length,
    observedSourceThemes: rows.filter((r) => r.sourceObservedThisRun).length,
    priorComparableRawCountAvailable: rows.filter((r) => r.priorComparableRawCount !== null).length,
    independentTwoCountYoyRecomputations: rows.filter((r) => r.independentlyRecomputedYoyFromTwoLiveCountsPct !== null).length,
    historiesWithAtLeastOneYoyReference: rows.filter((r) => r.historicalYoyReferenceCount > 0).length,
    zeroImputedMissingGrowthValues: 0,
    themesDroppedDueToMissingness: 0,
    inventedMinimumHistoryThreshold: null,
    confidenceWeightsApproved: false,
    crossIndustryGrowthRankingEnabled: false,
    safetyNotes: [
      'Historical YoY and acceleration reference counts are information, not pass/fail thresholds.',
      'Current same-quarter or same-year growth can be observed despite zero historical acceleration references.',
      'Differences in reported precision are diagnostic; they neither reject a theme nor create an industry-wide score.',
      'Source-unavailable and unknown prior count stay NULL. Do not backsolve a prior count from rounded growth.',
      'The 2025 ENISA budget share is not an exact growth rate, and Eurostat multi-year pp differences are not annual YoY.',
      'Across-source proxy growth rates are never ranked before approved normalization, reliability and G/D/M rules.',
    ],
    rows,
  };
}
