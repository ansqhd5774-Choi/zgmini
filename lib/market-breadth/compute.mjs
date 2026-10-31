/**
 * Market breadth issue-count arithmetic, independent of a price provider.
 * This is deliberately not the weighted/cumulative B1 or A/D-line formula.
 * Consumers must prove the dated universe and input lineage separately.
 */
export const MARKET_BREADTH_COUNTS_METHOD = 'ISSUE_DIRECTION_COUNTS_R1';

const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/**
 * Calculate from already verified per-issue daily price changes.
 * Each row: { securityId, change }, where change is today's price minus the
 * preceding *trading* session's close, from the same adjusted-price basis.
 * Never interpret missing change as an unchanged issue.
 */
export function calculateMarketBreadthCounts({ market, observationDate, expectedCount, rows, minimumCoverage = 1 } = {}) {
  if (!['usa', 'korea'].includes(market) || !validDate(observationDate)
    || !Number.isSafeInteger(expectedCount) || expectedCount <= 0
    || !Array.isArray(rows) || !Number.isFinite(minimumCoverage)
    || minimumCoverage <= 0 || minimumCoverage > 1) return null;

  const ids = new Set();
  const counts = { rising: 0, unchanged: 0, falling: 0 };
  let invalid = 0;
  for (const row of rows) {
    const securityId = row?.securityId;
    if (typeof securityId !== 'string' || !securityId.trim() || ids.has(securityId)) return null;
    ids.add(securityId);
    if (typeof row.change !== 'number' || !Number.isFinite(row.change)) {
      invalid++;
      continue;
    }
    if (row.change > 0) counts.rising++;
    else if (row.change < 0) counts.falling++;
    else counts.unchanged++;
  }

  const eligibleCount = counts.rising + counts.unchanged + counts.falling;
  const coverage = eligibleCount / expectedCount;
  const complete = ids.size <= expectedCount && eligibleCount > 0 && coverage >= minimumCoverage;
  if (!complete) return {
    methodologyVersion: MARKET_BREADTH_COUNTS_METHOD,
    market, observationDate, status: 'PARTIAL', expectedCount, eligibleCount,
    invalidCount: invalid, coverage, counts: null,
  };

  return {
    methodologyVersion: MARKET_BREADTH_COUNTS_METHOD,
    market, observationDate, status: 'READY', expectedCount, eligibleCount,
    invalidCount: invalid, coverage, counts,
  };
}
