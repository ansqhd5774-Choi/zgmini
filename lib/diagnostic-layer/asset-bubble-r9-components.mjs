import {
  assetBubbleSafety,
  priceAcceleration,
  speculativeFlowScore,
} from './model.mjs';
import {
  expandingPercentileRows,
  normalizeRows,
} from './series-math.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);

function monthKey(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : null;
}

function shiftMonthKey(month, delta) {
  const match = /^(\d{4})-(\d{2})$/.exec(month ?? '');
  if (!match) return null;
  const total = Number(match[1]) * 12 + Number(match[2]) - 1 + delta;
  const year = Math.floor(total / 12);
  const m = total - year * 12 + 1;
  return `${String(year).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
}

function quarterKey(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month ?? '');
  if (!match) return null;
  return `${match[1]}-Q${Math.floor((Number(match[2]) - 1) / 3) + 1}`;
}

function quarterStartDate(quarter) {
  const match = /^(\d{4})-Q([1-4])$/.exec(quarter ?? '');
  if (!match) return null;
  const month = (Number(match[2]) - 1) * 3 + 1;
  return `${match[1]}-${String(month).padStart(2, '0')}-01`;
}

function shiftQuarterKey(quarter, delta) {
  const match = /^(\d{4})-Q([1-4])$/.exec(quarter ?? '');
  if (!match) return null;
  const total = Number(match[1]) * 4 + Number(match[2]) - 1 + delta;
  const year = Math.floor(total / 4);
  const q = total - year * 4 + 1;
  return `${String(year).padStart(4, '0')}-Q${q}`;
}

function normalizeQuarterValueRows(rows) {
  if (!Array.isArray(rows)) return [];
  const byQuarter = new Map();
  for (const row of rows) {
    const quarter = row?.quarter
      ?? (typeof row?.observationDate === 'string'
        ? quarterKey(row.observationDate.slice(0, 7))
        : null);
    const value = row?.value ?? row?.flowMagnitude4Q ?? null;
    if (!/^\d{4}-Q[1-4]$/.test(quarter ?? '') || !finite(value)) continue;
    if (byQuarter.has(quarter) && byQuarter.get(quarter) !== value) {
      throw new Error(`DUPLICATE_QUARTER_CONFLICT:${quarter}`);
    }
    byQuarter.set(quarter, value);
  }
  return [...byQuarter]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([quarter, value]) => ({quarter, observationDate: quarterStartDate(quarter), value}));
}

export function buildSpeculativeFlowMagnitudeR57({
  transactionRows = [],
  holdingsRows = [],
} = {}) {
  const transactions = normalizeQuarterValueRows(transactionRows);
  const holdings = normalizeQuarterValueRows(holdingsRows);
  const transactionByQuarter = new Map(transactions.map(row => [row.quarter, row]));
  const holdingsByQuarter = new Map(holdings.map(row => [row.quarter, row]));
  const rows = [];

  for (const current of transactions) {
    const quarters = [0, -1, -2, -3].map(delta => shiftQuarterKey(current.quarter, delta));
    if (quarters.some(quarter => !quarter)) continue;
    const transactionWindow = quarters.map(quarter => transactionByQuarter.get(quarter));
    if (transactionWindow.some(row => !finite(row?.value))) continue;
    const holdingsQuarter = shiftQuarterKey(current.quarter, -4);
    const holding = holdingsByQuarter.get(holdingsQuarter);
    if (!finite(holding?.value) || holding.value === 0) continue;

    const flowSum4Q = transactionWindow.reduce((sum, row) => sum + row.value, 0);
    const value = Math.abs(flowSum4Q / holding.value);
    if (!finite(value)) continue;
    rows.push({
      quarter: current.quarter,
      observationDate: quarterStartDate(current.quarter),
      value,
      flowMagnitude4Q: value,
      flowSum4Q,
      holdingsLag4Q: holding.value,
      holdingsQuarter,
    });
  }

  return {
    status: rows.length ? 'READY_CURRENT_VINTAGE' : 'INSUFFICIENT_HISTORY',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    formula: 'ABS(SUM_T_T3_DIV_H_T4)',
    rows,
  };
}

export function buildPriceAccelerationR9(priceRows = []) {
  const normalized = normalizeRows(priceRows);
  const monthEnd = new Map();
  for (const row of normalized) monthEnd.set(monthKey(row.observationDate), row);

  const months = [...monthEnd.keys()].filter(Boolean).sort();
  const raw = [];
  for (const month of months) {
    const current = monthEnd.get(month);
    const lag3 = monthEnd.get(shiftMonthKey(month, -3));
    const lag12 = monthEnd.get(shiftMonthKey(month, -12));
    const value = priceAcceleration(current?.value, lag3?.value, lag12?.value);
    if (!finite(value)) continue;
    raw.push({
      observationDate: current.observationDate,
      month,
      close: current.value,
      value,
    });
  }

  const scored = expandingPercentileRows(
    raw.map(row => ({observationDate: row.observationDate, value: row.value})),
    {inverse: true, minValid: 60},
  );
  const scoreByDate = new Map(scored.map(row => [row.observationDate, row]));

  const monthly = raw.map(row => ({
    ...row,
    score: scoreByDate.get(row.observationDate)?.value ?? null,
    validHistory: scoreByDate.get(row.observationDate)?.validHistory ?? null,
  }));

  const quarterMap = new Map();
  for (const row of monthly) {
    const quarter = quarterKey(row.month);
    if (quarter) quarterMap.set(quarter, {
      quarter,
      observationDate: row.observationDate,
      priceAccelRaw: row.value,
      priceAccelScore: row.score,
      validHistory: row.validHistory,
    });
  }

  return {
    status: scored.length ? 'READY_CURRENT_VINTAGE' : 'INSUFFICIENT_HISTORY',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    monthly,
    quarterly: [...quarterMap.values()].sort((a, b) => a.quarter.localeCompare(b.quarter)),
  };
}

export function buildSpeculativeFlowsR9(flowMagnitude4QRows = [], priceAccelerationQuarterRows = []) {
  const flow = normalizeQuarterValueRows(flowMagnitude4QRows);
  const flowScores = expandingPercentileRows(
    flow.map(row => ({observationDate: row.observationDate, value: row.value})),
    {inverse: true, minValid: 1},
  );
  const flowSafetyByDate = new Map(flowScores.map(row => [row.observationDate, row]));

  const priceByQuarter = new Map();
  for (const row of priceAccelerationQuarterRows ?? []) {
    if (!/^\d{4}-Q[1-4]$/.test(row?.quarter ?? '')) continue;
    if (!finite(row?.priceAccelRaw)) continue;
    priceByQuarter.set(row.quarter, row);
  }

  const rows = flow.map(row => {
    const price = priceByQuarter.get(row.quarter);
    const inverseFlowPercentileScore = flowSafetyByDate.get(row.observationDate)?.value ?? null;
    const score = speculativeFlowScore(price?.priceAccelRaw, inverseFlowPercentileScore);
    return {
      quarter: row.quarter,
      observationDate: row.observationDate,
      flowMagnitude4Q: row.value,
      inverseFlowPercentileScore,
      priceAccelRaw: price?.priceAccelRaw ?? null,
      score,
    };
  });

  return {
    status: rows.some(row => finite(row.score)) ? 'READY_CURRENT_VINTAGE' : 'PARTIAL',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    sourceContract: 'PRECOMPUTED_FLOW_MAGNITUDE_4Q_REQUIRED',
    rows,
  };
}

export function buildAssetBubbleR9Partial({
  valuationScoreRows = [],
  priceAccelerationQuarterRows = [],
  riskAssetShareScoreRows = [],
  speculativeFlowRows = [],
  excessLiquidityScoreRows = [],
  breadthScoreRows = [],
} = {}) {
  const toQuarterScoreMap = rows => {
    const map = new Map();
    for (const row of rows ?? []) {
      const quarter = row?.quarter
        ?? (typeof row?.observationDate === 'string'
          ? quarterKey(row.observationDate.slice(0, 7))
          : null);
      const score = row?.score ?? row?.value ?? null;
      if (/^\d{4}-Q[1-4]$/.test(quarter ?? '') && finite(score)) map.set(quarter, score);
    }
    return map;
  };

  const valuation = toQuarterScoreMap(valuationScoreRows);
  const price = new Map(
    (priceAccelerationQuarterRows ?? [])
      .filter(row => /^\d{4}-Q[1-4]$/.test(row?.quarter ?? '') && finite(row?.priceAccelScore))
      .map(row => [row.quarter, row.priceAccelScore]),
  );
  const risk = toQuarterScoreMap(riskAssetShareScoreRows);
  const spec = new Map(
    (speculativeFlowRows ?? [])
      .filter(row => /^\d{4}-Q[1-4]$/.test(row?.quarter ?? '') && finite(row?.score))
      .map(row => [row.quarter, row.score]),
  );
  const excess = toQuarterScoreMap(excessLiquidityScoreRows);
  const breadth = toQuarterScoreMap(breadthScoreRows);

  const quarters = [...new Set([
    ...valuation.keys(), ...price.keys(), ...risk.keys(),
    ...spec.keys(), ...excess.keys(), ...breadth.keys(),
  ])].sort();

  const rows = quarters.map(quarter => {
    const input = {
      valuationPressure: valuation.get(quarter) ?? null,
      priceAcceleration: price.get(quarter) ?? null,
      riskAssetShare: risk.get(quarter) ?? null,
      speculativeFlows: spec.get(quarter) ?? null,
      breadthDivergence: breadth.get(quarter) ?? null,
      excessLiquidity: excess.get(quarter) ?? null,
    };
    const final = assetBubbleSafety(input);
    const known = [
      ['valuationPressure', input.valuationPressure, 0.35],
      ['priceAcceleration', input.priceAcceleration, 0.25],
      ['riskAssetShare', input.riskAssetShare, 0.15],
      ['speculativeFlows', input.speculativeFlows, 0.10],
      ['excessLiquidity', input.excessLiquidity, 0.05],
    ];
    const knownComplete = known.every(([, score]) => finite(score));
    const knownContribution0to90 = knownComplete
      ? known.reduce((sum, [, score, weight]) => sum + score * weight, 0)
      : null;

    return {
      quarter,
      observationDate: quarterStartDate(quarter),
      ...input,
      knownWeight: knownComplete ? 0.90 : null,
      knownContribution0to90,
      status: final.status,
      score: final.score,
      missing: final.missing,
    };
  });

  return {
    status: rows.length && rows.at(-1)?.status === 'READY' ? 'READY_CURRENT_VINTAGE' : 'PARTIAL',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    noReweight: true,
    rows,
  };
}
