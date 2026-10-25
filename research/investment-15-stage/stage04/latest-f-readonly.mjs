/**
 * 04단계 전용 LIVE F reader — 기존 공개 산식은 절대 수정하지 않는다.
 * Manual GET only, no persistence, no database, no ranking, no scheduler.
 * The top-level phase is not a per-theme phase: compare observation dates.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const F_ENDPOINT = 'https://zgmini.kr/api/theme-fear-greed';

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isScore(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function kstToday() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul',
  }).format(new Date());
}

export function selectThemeF(payload, { asOfDate = kstToday(), expectedThemes = 9 } = {}) {
  if (!isDate(asOfDate)) throw new Error('INVALID_AS_OF_DATE');
  if (!payload || payload.status !== 'READY' || !Array.isArray(payload.themes)) {
    throw new Error('THEME_API_NOT_READY');
  }

  const provisionalByTheme = new Map();
  for (const point of payload.provisional?.points ?? []) {
    if (!isDate(point?.date) || point.date > asOfDate) continue;
    for (const [name, value] of Object.entries(point?.scores ?? {})) {
      if (!isScore(value)) continue;
      const existing = provisionalByTheme.get(name);
      if (!existing || point.date >= existing.date) {
        provisionalByTheme.set(name, { date: point.date, score: value });
      }
    }
  }

  const seen = new Set();
  const themes = payload.themes.map((theme) => {
    const name = theme?.theme;
    if (typeof name !== 'string' || name.length === 0 || seen.has(name)) {
      throw new Error('DUPLICATE_OR_INVALID_THEME');
    }
    seen.add(name);
    const baseDate = theme.history?.at(-1)?.date;
    const baseValid = isDate(baseDate) && baseDate <= asOfDate && isScore(theme.score);
    const baseline = baseValid ? { date: baseDate, score: theme.score } : null;
    const provisional = provisionalByTheme.get(name);

    // A valid equal-date provisional observation takes precedence over base.
    const selected = provisional && (!baseline || provisional.date >= baseline.date)
      ? { ...provisional, phase: 'PROVISIONAL' }
      : baseline
        ? { ...baseline, phase: 'BASE_OBSERVED' }
        : null;

    return {
      theme: name,
      currentInput: selected?.score ?? null,
      observationDate: selected?.date ?? null,
      phase: selected?.phase ?? 'UNAVAILABLE',
      priorBaseForComparison: selected?.phase === 'PROVISIONAL' ? baseline : null,
      // Never claim the last observation occurred on the fetch date.
      sourceObservationMayLag: selected?.date !== asOfDate,
    };
  });

  return {
    status: themes.length === expectedThemes && themes.every((t) => t.phase !== 'UNAVAILABLE')
      ? 'LIVE_F_OBSERVED'
      : 'PARTIAL_LIVE_F',
    fetchedAt: new Date().toISOString(),
    evaluatedAsOfKst: asOfDate,
    sourceVersion: payload.sourceVersion ?? null,
    sourceStoredAt: payload.sourceStoredAt ?? null,
    apiTopLevelPhase: payload.phase ?? null,
    themes,
    notes: [
      'Current provisional observations take priority over older confirmed/base F.',
      'API top-level phase does not determine all themes phases.',
      'Older available base dates are labeled explicitly, never represented as current-day observations.',
      'No existing ETF scoring, theme qualification, G, D, M, or order logic changed.',
    ],
  };
}

async function main() {
  const response = await fetch(F_ENDPOINT, { signal: AbortSignal.timeout(15000), headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`THEME_API_HTTP_${response.status}`);
  const selected = selectThemeF(await response.json());
  process.stdout.write(`${JSON.stringify(selected, null, 2)}\n`);
  if (selected.status !== 'LIVE_F_OBSERVED') process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`LIVE_F_UNAVAILABLE: ${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
