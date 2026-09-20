import {logShockRows} from './series-math.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);

function erfApprox(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly =
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return sign * (1 - poly * Math.exp(-ax * ax));
}

export function normalCdf(x) {
  if (!finite(x)) return null;
  return 0.5 * (1 + erfApprox(x / Math.SQRT2));
}

export function buildGscpiScore(rows = []) {
  const score = [];
  for (const row of rows) {
    if (!row || typeof row.observationDate !== 'string' || !finite(row.value)) continue;
    const cdf = normalCdf(-row.value);
    score.push({
      observationDate:row.observationDate,
      value:100 * cdf,
      rawValue:row.value,
    });
  }
  return {
    status:score.length ? 'READY_CURRENT_VINTAGE' : 'INSUFFICIENT_HISTORY',
    historyMode:'CURRENT_VINTAGE_ONLY',
    lookAheadSafe:false,
    formula:'100*Phi(-GSCPI)',
    score,
  };
}

export function buildCopperShockRaw(rows = []) {
  return {
    status:'RAW_ONLY_PARTIAL',
    historyMode:'CURRENT_VINTAGE_ONLY',
    lookAheadSafe:false,
    reason:'COPPER_SCORE_WARMUP_NOT_ENCODED_WITHOUT_EXPLICIT_ACTIVE_EVIDENCE',
    shock:logShockRows(rows),
  };
}

export function buildCmdiRawContext(parsed) {
  const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
  return {
    status:rows.length ? 'READY_CURRENT_VINTAGE_RAW' : 'INSUFFICIENT_HISTORY',
    historyMode:'CURRENT_VINTAGE_ONLY',
    lookAheadSafe:false,
    scoringStatus:'UNRESOLVED_NO_FABRICATION',
    rows,
  };
}
