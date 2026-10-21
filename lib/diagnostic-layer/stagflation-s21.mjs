/** Stored-data-only S2.1 research calculator. No operational score wiring. */
export const STAGFLATION_S21_VERSION = 'STAGFLATION_S2.1_SHADOW';
export const STAGFLATION_S21_SERIES = Object.freeze([
  'PCEPI', 'PCEPILFE', 'INDPRO', 'DPCERA3M086SBEA',
  'DSPIC96', 'PAYEMS', 'EXPINF5YR', 'MCOILWTICO',
]);
const clip = x => Math.min(1, Math.max(0, x));
const validMonth = s => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])-01$/.test(s);
const shift = (s, n) => {
  const [y, m] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
};
const percentile = (x, ref) => 100 * ref.reduce((n, v) => n + (v < x ? 1 : v === x ? .5 : 0), 0) / ref.length;
const relativeRisk = (x, ref, up) => 100 * clip((up ? percentile(x, ref) - 50 : 50 - percentile(x, ref)) / 40);

export function calculateStagflationS21({ series, observationMonth, sourceHash = null } = {}) {
  const common = { methodVersion: STAGFLATION_S21_VERSION, historyPolicy: 'CURRENT_VINTAGE_RECONSTRUCTION_NOT_PIT', sourceHash };
  const fail = reason => ({ ...common, status: 'PARTIAL', score: null, history: [], reasons: [reason] });
  const maps = {};
  for (const id of STAGFLATION_S21_SERIES) {
    if (!Array.isArray(series?.[id]) || !series[id].length) return fail(`SERIES_MISSING:${id}`);
    const map = new Map();
    for (const row of series[id]) {
      if (!validMonth(row?.observationDate)) return fail(`INVALID_MONTH:${id}`);
      if (map.has(row.observationDate)) return fail(`DUPLICATE_MONTH:${id}:${row.observationDate}`);
      map.set(row.observationDate, row.value);
    }
    maps[id] = map;
  }
  const latestCommonLimit = STAGFLATION_S21_SERIES.map(id => [...maps[id].keys()].sort().at(-1)).sort()[0];
  const end = observationMonth ?? latestCommonLimit;
  if (!validMonth(end) || end > latestCommonLimit) return fail('OBSERVATION_MONTH_UNAVAILABLE');
  const reasons = new Set();
  const value = (id, t) => {
    const x = maps[id].get(t);
    if (!Number.isFinite(x) || (id !== 'EXPINF5YR' && x <= 0)) { reasons.add(`INVALID_INPUT:${id}:${t}`); return null; }
    return x;
  };
  const change = (id, t, lag, annual) => {
    const a = value(id, t), b = value(id, shift(t, -lag));
    if (a === null || b === null) return null;
    const x = 100 * ((a / b) ** (annual ? 12 / lag : 1) - 1);
    if (!Number.isFinite(x)) { reasons.add(`NONFINITE_TRANSFORM:${id}:${t}`); return null; }
    return x;
  };
  const rawCache = new Map();
  const raw = t => {
    if (rawCache.has(t)) return rawCache.get(t);
    const job = change('PAYEMS', t, 3, true), priorJob = change('PAYEMS', shift(t, -3), 3, true);
    const f = [change('PCEPI', t, 12), change('PCEPILFE', t, 12), change('PCEPILFE', t, 3, true),
      change('INDPRO', t, 3, true), change('DPCERA3M086SBEA', t, 3, true), change('DSPIC96', t, 3, true),
      job, job === null || priorJob === null ? null : job - priorJob, value('EXPINF5YR', t), change('MCOILWTICO', t, 12)];
    rawCache.set(t, f); return f;
  };
  const points = new Map();
  for (let offset = -14; offset <= 0; offset++) {
    const t = shift(end, offset), f = raw(t);
    const ref = Array.from({ length: 120 }, (_, i) => raw(shift(t, i - 120)));
    if ([f, ...ref].some(a => a.some(x => !Number.isFinite(x)))) { points.set(t, null); continue; }
    const n = f.map((x, i) => i < 3 ? 100 * clip((x - 2) / 4) : relativeRisk(x, ref.map(a => a[i]), i >= 8));
    n[8] *= clip((f[8] - 2) / 2);
    if (f[9] <= 0) n[9] = 0;
    const I = .25 * n[0] + .35 * n[1] + .40 * n[2];
    const R = .35 * n[3] + .40 * n[4] + .25 * n[5];
    const L = .70 * n[6] + .30 * n[7], E = .50 * n[8] + .50 * n[9], D = .65 * R + .35 * L;
    const J = Math.min(100, Math.sqrt(I * D) * (1 + E / 1000));
    points.set(t, { observationMonth: t, raw: f, signalRisk: n, axes: { inflation: I, realEconomy: R, labor: L, expectationsEnergy: E, slowdown: D }, jointRisk: J,
      contraction: { production: f[3] < 0, consumption: f[4] < 0, income: f[5] < 0, employment: f[6] < 0 } });
  }
  const history = Array.from({ length: 13 }, (_, i) => {
    const t = shift(end, i - 12), p = points.get(t), p1 = points.get(shift(t, -1)), p2 = points.get(shift(t, -2));
    if (!p || !p1 || !p2) return { observationMonth: t, score: null, status: 'PARTIAL' };
    return { ...p, score: 100 - (13 * p.jointRisk + p1.jointRisk + p2.jointRisk) / 15, status: 'READY' };
  });
  const ready = history.every(p => p.status === 'READY');
  return { ...common, status: ready ? 'READY' : 'PARTIAL', observationMonth: end, referenceMonths: 120,
    score: ready ? history.at(-1).score : null, history, reasons: [...reasons] };
}
