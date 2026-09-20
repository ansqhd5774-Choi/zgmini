import {exactAlign, expandingPercentileRows, normalizeRows} from './series-math.mjs';

export function buildInflationExpectationsComponent(rows = []) {
  const distance = normalizeRows(rows).map(row => ({
    observationDate: row.observationDate,
    value: Math.abs(row.value - 2),
  }));
  const score = expandingPercentileRows(distance, {inverse: true, minValid: 60});
  return {
    status: score.length ? 'READY_CURRENT_VINTAGE' : 'INSUFFICIENT_HISTORY',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    target: 2,
    distance,
    score,
  };
}

export function buildOfrRepoGapComponent(dvpRows = [], triPartyRows = []) {
  const raw = exactAlign({dvp: dvpRows, triParty: triPartyRows}).map(row => ({
    observationDate: row.observationDate,
    value: Math.abs(row.dvp - row.triParty),
    dvp: row.dvp,
    triParty: row.triParty,
  }));
  const score = expandingPercentileRows(raw, {inverse: true, minValid: 252});
  return {
    status: score.length ? 'READY_CURRENT_VINTAGE' : 'INSUFFICIENT_HISTORY',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    raw,
    score,
  };
}

export function buildBatchBKnownComponents({
  inflationExpectations = [],
  dvpRepo = [],
  triPartyRepo = [],
} = {}) {
  return {
    inflationExpectations: buildInflationExpectationsComponent(inflationExpectations),
    repoGap: buildOfrRepoGapComponent(dvpRepo, triPartyRepo),
    fundingStress: {
      status: 'PARTIAL',
      missing: [
        'sofrIorbScore',
        'obfrIorbScore',
        'sofrIorbRv20Score',
        'bankEmergencyScore',
      ],
      reason: 'R7_FULL_FUNDING_STRESS_NOT_ASSEMBLED_WITHOUT_REMAINING_COMPONENT_CONTRACTS',
    },
  };
}
