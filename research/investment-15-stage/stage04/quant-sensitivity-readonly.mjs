/**
 * Stage 04 historical growth sensitivity (research only).
 *
 * Only public, small official annual/quarterly observations are represented.
 * No network, no orders, no writes, no published M score, no historical F fallback.
 * Candidate weights are NOT approved for investment use.
 *
 * FDA: 2025 CDER annual report, 2016–2025 same reporting vintage.
 * https://www.fda.gov/media/190705/download
 * FedNow: published settled customer credit transfer counts, 2024 Q1–2026 Q3.
 * https://www.frbservices.org/resources/financial-services/fednow-service-resources/fednow-service-volume-value-statistics/
 */

const fda = [22, 46, 59, 48, 53, 50, 37, 54, 50, 46];
const fednow = [
  97424, 156076, 336487, 915263,
  1310017, 2130889, 2506002, 2466494,
  2728510, 4997811, 6376467,
];

function pct(current, previous) {
  if (!(previous > 0)) throw new Error('INVALID_DENOMINATOR');
  return 100 * (current / previous - 1);
}

function percentile(value, history) {
  if (history.length === 0 || !history.every(Number.isFinite)) {
    throw new Error('INSUFFICIENT_HISTORY');
  }
  const eps = 1e-9;
  const less = history.filter((x) => x < value - eps).length;
  const equal = history.filter((x) => Math.abs(x - value) <= eps).length;
  return (100 * (less + equal / 2)) / history.length;
}

function signedScore(change, p) {
  return change > 0 ? 50 + 0.5 * p : 0.5 * p;
}

function buildSeries(values, lag) {
  const growth = values.map((v, i) => (i >= lag ? pct(v, values[i - lag]) : null));
  const accel = growth.map((v, i) => (
    i > lag && v !== null && growth[i - 1] !== null
      ? v - growth[i - 1]
      : null
  ));
  return { growth: growth.filter((v) => v !== null), accel: accel.filter((v) => v !== null) };
}

function assess(series, skipFirstGrowth = 0, skipFirstAccel = 0) {
  const { growth, accel } = series;
  const g = growth.at(-1);
  const a = accel.at(-1);
  const gHistory = growth.slice(skipFirstGrowth, -1);
  const aHistory = accel.slice(skipFirstAccel, -1);
  const gPercentile = percentile(g, gHistory);
  const aPercentile = percentile(a, aHistory);
  const g1 = signedScore(g, gPercentile);
  const g2 = signedScore(a, aPercentile);
  return {
    status: 'RESEARCH_ONLY_UNRANKED_NOT_APPROVED',
    growthPct: g,
    accelerationPctPoints: a,
    growthHistoryCount: gHistory.length,
    accelerationHistoryCount: aHistory.length,
    growthPercentile: gPercentile,
    accelerationPercentile: aPercentile,
    G1_proposed: g1,
    G2_proposed: g2,
    candidateG: {
      '50_50': 0.5 * g1 + 0.5 * g2,
      '60_40': 0.6 * g1 + 0.4 * g2,
      '70_30': 0.7 * g1 + 0.3 * g2,
    },
  };
}

const fdaResult = assess(buildSeries(fda, 1));
const fednowResult = assess(buildSeries(fednow, 4));
const fednowDropEarly = assess(buildSeries(fednow, 4), 2, 2);

function assertNear(actual, expected, message) {
  if (Math.abs(actual - expected) > 0.025) {
    throw new Error(`${message}: ${actual} != ${expected}`);
  }
}

assertNear(fdaResult.growthPct, -8, 'FDA_2025_GROWTH');
assertNear(fdaResult.accelerationPctPoints, -0.592593, 'FDA_2025_ACCEL_NOT_MIXED_VINTAGE');
assertNear(fdaResult.growthPercentile, 25, 'FDA_GROWTH_PERCENTILE');
assertNear(fdaResult.accelerationPercentile, 71.428571, 'FDA_ACCEL_PERCENTILE');
assertNear(fednowResult.growthPct, 154.4462, 'FEDNOW_Q3_YOY');
assertNear(fednowResult.accelerationPctPoints, 19.9067, 'FEDNOW_Q3_ACCEL');
assertNear(fednowResult.growthPercentile, 33.333333, 'FEDNOW_GROWTH_PERCENTILE');
assertNear(fednowResult.accelerationPercentile, 60, 'FEDNOW_ACCEL_PERCENTILE');

process.stdout.write(`${JSON.stringify({
  status: 'PASS_RESEARCH_ONLY',
  note: 'Historic industry growth sensitivities only: no F, D, M, ranking or user approval',
  sourceVintage: 'FDA_2025_SINGLE_REPORT_AND_FEDNOW_OFFICIAL_20261020',
  fda: fdaResult,
  fednow: fednowResult,
  fednowExcludingEarliestTwoHistoricalSamples: fednowDropEarly,
}, null, 2)}\n`);
