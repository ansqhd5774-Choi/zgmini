import {
  expandingPercentileRows,
  normalizeRows,
} from './series-math.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);

function normalizePositiveRows(rows) {
  return normalizeRows(rows).filter(row => row.value > 0);
}

function lagDifferenceRows(rows, lagObservations) {
  const normalized = normalizeRows(rows);
  const out = [];
  for (let i = lagObservations; i < normalized.length; i += 1) {
    const current = normalized[i];
    const prior = normalized[i - lagObservations];
    out.push({
      observationDate: current.observationDate,
      value: current.value - prior.value,
      sourceValue: current.value,
      lagValue: prior.value,
      lagObservations,
    });
  }
  return out;
}

function yoyGrowthRows(rows, lagObservations = 12) {
  const normalized = normalizePositiveRows(rows);
  const out = [];
  for (let i = lagObservations; i < normalized.length; i += 1) {
    const current = normalized[i];
    const prior = normalized[i - lagObservations];
    if (!(prior.value > 0)) continue;
    out.push({
      observationDate: current.observationDate,
      value: 100 * (current.value / prior.value - 1),
      sourceValue: current.value,
      lagValue: prior.value,
      lagObservations,
    });
  }
  return out;
}

function mergeRawAndScore(rawRows, scoredRows) {
  const scoreByDate = new Map(scoredRows.map(row => [row.observationDate, row]));
  return rawRows.map(row => ({
    ...row,
    score: scoreByDate.get(row.observationDate)?.value ?? null,
    validHistory: scoreByDate.get(row.observationDate)?.validHistory ?? null,
  }));
}

export function scoreCmdiR1(value) {
  if (!finite(value) || value < 0 || value > 1) return null;
  return 100 * (1 - value);
}

export function scoreCmdiRowsR1(rows = []) {
  return normalizeRows(rows).map(row => ({
    ...row,
    score: scoreCmdiR1(row.value),
  }));
}

export function buildBankReservesR1(rows = []) {
  const raw = normalizeRows(rows);
  const scored = expandingPercentileRows(raw, {
    inverse: false,
    minValid: 52,
  });
  return {
    revision: 'DIAGNOSTIC_SCORE_TRANSFORM_R1',
    component: 'bankReserves',
    transform: 'WEEKLY_LEVEL_EXPANDING_PERCENTILE',
    minHistory: 52,
    historyUnit: 'WEEKLY_OBSERVATIONS',
    status: scored.length ? 'READY_CURRENT_VINTAGE' : 'INSUFFICIENT_HISTORY',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    rows: mergeRawAndScore(raw, scored),
  };
}

export function buildTgaR1(rows = []) {
  const raw = lagDifferenceRows(rows, 4);
  const scored = expandingPercentileRows(
    raw.map(row => ({observationDate: row.observationDate, value: row.value})),
    { inverse: true, minValid: 52 },
  );
  return {
    revision: 'DIAGNOSTIC_SCORE_TRANSFORM_R1',
    component: 'tga',
    transform: '4_WEEK_CHANGE_INVERSE_EXPANDING_PERCENTILE',
    changeDefinition: 'CURRENT_MINUS_4_PRIOR_WEEKLY_OBSERVATIONS',
    minHistory: 52,
    historyUnit: 'VALID_4_WEEK_CHANGES',
    status: scored.length ? 'READY_CURRENT_VINTAGE' : 'INSUFFICIENT_HISTORY',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    rows: mergeRawAndScore(raw, scored),
  };
}

export function buildOnRrpR1(rows = []) {
  const raw = lagDifferenceRows(rows, 20);
  const scored = expandingPercentileRows(
    raw.map(row => ({observationDate: row.observationDate, value: row.value})),
    { inverse: true, minValid: 252 },
  );
  return {
    revision: 'DIAGNOSTIC_SCORE_TRANSFORM_R1',
    component: 'onRrp',
    transform: '20_BUSINESS_DAY_CHANGE_INVERSE_EXPANDING_PERCENTILE',
    changeDefinition: 'CURRENT_MINUS_20_PRIOR_DAILY_OBSERVATIONS',
    minHistory: 252,
    historyUnit: 'VALID_20_BUSINESS_DAY_CHANGES',
    status: scored.length ? 'READY_CURRENT_VINTAGE' : 'INSUFFICIENT_HISTORY',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    rows: mergeRawAndScore(raw, scored),
  };
}

export function buildM2R1(rows = []) {
  const raw = yoyGrowthRows(rows, 12);
  const scored = expandingPercentileRows(
    raw.map(row => ({observationDate: row.observationDate, value: row.value})),
    { inverse: false, minValid: 60 },
  );
  return {
    revision: 'DIAGNOSTIC_SCORE_TRANSFORM_R1',
    component: 'm2',
    transform: 'YOY_GROWTH_EXPANDING_PERCENTILE',
    growthDefinition: '100*(CURRENT/LAG12-1)',
    minHistory: 60,
    historyUnit: 'VALID_YOY_MONTHLY_GROWTH_OBSERVATIONS',
    status: scored.length ? 'READY_CURRENT_VINTAGE' : 'INSUFFICIENT_HISTORY',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    rows: mergeRawAndScore(raw, scored),
  };
}
