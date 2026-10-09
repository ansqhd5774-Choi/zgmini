// Research-only asset-bubble R10 candidate. Not imported by the production writer.
// All inputs must come from previously stored and independently verified data.
import { strictWeightedScore, speculativeFlowScore } from './model.mjs';
import { expandingPercentileRows } from './series-math.mjs';

export const ASSET_BUBBLE_R10_WEIGHTS = Object.freeze({
  valuationPressure: 0.30,
  priceAcceleration: 0.20,
  riskAssetShare: 0.15,
  speculativeFlows: 0.10,
  breadthDivergence: 0.15,
  excessLiquidity: 0.10,
});

const finite = v => typeof v === 'number' && Number.isFinite(v);
const validDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const validQuarter = v => typeof v === 'string' && /^\d{4}-Q[1-4]$/.test(v);

export function scoreAssetBubbleR10Candidate(input = {}) {
  return strictWeightedScore(Object.entries(ASSET_BUBBLE_R10_WEIGHTS).map(([id, weight]) => ({
    id, weight, score: finite(input[id]) ? input[id] : null,
  })));
}
function quarterFromDate(date) {
  return validDate(date) ? date.slice(0, 4) + '-Q' + Math.ceil(Number(date.slice(5, 7)) / 3) : null;
}
function quarterStartDate(quarter) {
  return quarter.slice(0, 4) + '-' + String((Number(quarter.at(-1)) - 1) * 3 + 1).padStart(2, '0') + '-01';
}
function shiftQuarter(quarter, offset) {
  const index = Number(quarter.slice(0, 4)) * 4 + Number(quarter.at(-1)) - 1 + offset;
  const y = Math.floor(index / 4), q = index - y * 4 + 1;
  return String(y).padStart(4, '0') + '-Q' + q;
}
function byQuarter(rows, field = 'value') {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const quarter = validQuarter(row?.quarter) ? row.quarter : quarterFromDate(row?.observationDate);
    const value = row?.[field];
    if (!quarter || !finite(value)) continue;
    if (map.has(quarter) && map.get(quarter) !== value) throw new Error('DUPLICATE_QUARTER_CONFLICT:' + quarter);
    map.set(quarter, value);
  }
  return map;
}

// FRB Z.1 BOGZ1FA153064475Q is a quarterly, annualized transaction rate.
// An actual four-quarter flow is SUM(annualized quarterly rates)/4.
// Holdings (BOGZ1FL153064475Q) are measured four quarters earlier.
// Negative net flows do not count as speculative inflows; missing quarters stay missing.
export function buildR10SpeculativeFlowCandidate({
  transactionRows = [], holdingsRows = [], priceAccelerationQuarterRows = [],
} = {}) {
  const tx = byQuarter(transactionRows);
  const holdings = byQuarter(holdingsRows);
  const accel = byQuarter(priceAccelerationQuarterRows, 'priceAccelRaw');
  const raw = [];
  for (const quarter of [...tx.keys()].sort()) {
    const dates = [0, -1, -2, -3].map(delta => shiftQuarter(quarter, delta));
    if (!dates.every(q => tx.has(q))) continue;
    const holdingQuarter = shiftQuarter(quarter, -4);
    const priorHoldings = holdings.get(holdingQuarter);
    if (!finite(priorHoldings) || priorHoldings <= 0) continue;
    const annualFlow = dates.reduce((sum, q) => sum + tx.get(q), 0) / 4;
    const positiveInflowRatio = Math.max(0, annualFlow) / priorHoldings;
    if (!finite(positiveInflowRatio)) continue;
    raw.push({
      quarter, observationDate: quarterStartDate(quarter),
      positiveInflowRatio, annualFlow, holdingQuarter,
      priceAccelRaw: accel.get(quarter) ?? null,
    });
  }
  const inverse = expandingPercentileRows(
    raw.map(row => ({ observationDate: row.observationDate, value: row.positiveInflowRatio })),
    { inverse: true, minValid: 1 },
  );
  const percentile = new Map(inverse.map(row => [row.observationDate, row.value]));
  const rows = raw.map(row => ({
    ...row,
    score: speculativeFlowScore(row.priceAccelRaw, percentile.get(row.observationDate) ?? null),
  }));
  return {
    status: rows.length && finite(rows.at(-1)?.score) ? 'READY_CURRENT_VINTAGE' : 'PARTIAL',
    methodology: 'ASSET_BUBBLE_R10_CANDIDATE',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    providerRequests: 0,
    rows,
  };
}
