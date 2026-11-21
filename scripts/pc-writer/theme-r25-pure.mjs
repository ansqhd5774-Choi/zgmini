// Exact approved R25 pure function, extracted without arithmetic changes.
// Original section SHA256: 7a601057c58bebb6f788c6a914efb6ba9f0f6072b35d00f5480659bd46901de2
import {scoreAdaptiveTimeline} from './theme-optional-adaptive-r2.mjs';
const WINDOW=252,MIN_REAL_SESSIONS=40;
const fail=code=>{throw Object.assign(new Error('THEME_NINE_R25_'+code),{code:'THEME_NINE_R25_'+code});};
export function scoreOneR25({symbol, spySessions, ownSessions, scoring = scoreAdaptiveTimeline}) {
  if (symbol === 'SPY' || !Array.isArray(spySessions) || !Array.isArray(ownSessions)) fail('SCORE_INPUT');
  const ownByDate = new Map(ownSessions.map(row => [row.date, row.close]));
  const benchmarkDates = new Set(spySessions.map(row => row.date));
  if (ownSessions.some(row => !benchmarkDates.has(row.date))) fail('NON_SPY_DATE');
  let seen = 0;
  const observed = spySessions.map(row => {
    if (ownByDate.has(row.date)) seen++;
    return seen;
  });
  const aligned = spySessions.map(row => ({date: row.date,
    own: ownByDate.get(row.date) ?? null, spy: row.close}));
  const scored = scoring(aligned);
  if (scored.length !== aligned.length) fail('SCORER_LENGTH');
  const start = Math.max(0, spySessions.length - WINDOW);
  const history = scored.slice(start).map((row, j) => {
    const i = start + j, real = aligned[i].own !== null;
    const eligible = observed[i] >= MIN_REAL_SESSIONS;
    if (row.date !== aligned[i].date) fail('SCORER_DATE');
    const valid = real && eligible && Number.isFinite(row.score);
    if (Number.isFinite(row.score) && (row.score < 0 || row.score > 100)) fail('SCORE_RANGE');
    return {date: row.date, score: valid ? row.score : null,
      status: !real ? 'NO_REAL_CLOSE' : !eligible ? 'BELOW_40_REAL_SESSIONS' :
        valid ? row.status : 'INSUFFICIENT_REAL_OBSERVATIONS',
      realSessionCount: observed[i],
      activeMetrics: valid ? row.activeMetrics : null,
      samples: valid ? row.samples : null};
  });
  const withScores = history.filter(row => row.score !== null);
  const latest = history.at(-1);
  const lastScored = withScores.at(-1);
  return {symbol, realHourlyBars: null, realProxySessions: ownSessions.length,
    latest252RealProxySessions: history.filter(row =>
      ownByDate.has(row.date)).length,
    observed40SessionsReached: seen >= MIN_REAL_SESSIONS,
    latest252ScoredSessions: withScores.length,
    latest252MissingScores: history.length - withScores.length,
    latestBenchmarkDate: latest?.date ?? null,
    latestScore: latest?.score ?? null,
    latestStatus: latest?.status ?? 'NO_SPY_SESSIONS',
    lastScoredDate: lastScored?.date ?? null,
    lastScoredValue: lastScored?.score ?? null,
    lastScoredStatus: lastScored?.status ?? null,
    history};
}

