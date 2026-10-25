/**
 * Read the originally preregistered Eurostat paid-cloud adoption series.
 * Dynamic JSON-stat 2.0 source; no missing-year interpolation or annual YoY.
 * No stage04 investment scoring, rank, scheduled calls or market orders.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const EUROSTAT_CLOUD_API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/isoc_cicce_use?lang=EN&freq=A&indic_is=E_CC&size_emp=GE10&unit=PC_ENT&geo=EU27_2020';
const EXPECTED_CODES = Object.freeze({
  freq: 'A', size_emp: 'GE10', nace_r2: 'C10-S951_X_K',
  indic_is: 'E_CC', unit: 'PC_ENT', geo: 'EU27_2020',
});

function scorePoint(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function parseEurostatCloud(json) {
  if (!json || json.class !== 'dataset' || json.version !== '2.0' || json.source !== 'ESTAT') {
    throw new Error('EUROSTAT_NOT_OFFICIAL_JSONSTAT2');
  }
  const id = json.id;
  const size = json.size;
  const dims = json.dimension;
  if (!Array.isArray(id) || !Array.isArray(size) || id.length !== size.length || !id.includes('time')) {
    throw new Error('EUROSTAT_DIMENSION_CONTRACT_CHANGED');
  }
  const expected = [...Object.keys(EXPECTED_CODES), 'time'];
  if (id.length !== expected.length || !expected.every((key) => id.includes(key))) {
    throw new Error('EUROSTAT_DIMENSION_CONTRACT_CHANGED');
  }
  for (const [name, code] of Object.entries(EXPECTED_CODES)) {
    const position = id.indexOf(name);
    const categories = dims?.[name]?.category?.index;
    if (size[position] !== 1 || Object.keys(categories ?? {}).length !== 1 || categories?.[code] !== 0) {
      throw new Error('EUROSTAT_DATA_SCOPE_DRIFT');
    }
  }
  const timePosition = id.indexOf('time');
  const timeIndexes = dims.time?.category?.index;
  if (!timeIndexes || Object.keys(timeIndexes).length !== size[timePosition]) {
    throw new Error('EUROSTAT_TIME_INDEX_DRIFT');
  }
  // Filtered API has one member per non-time dimension, so the flat JSON-stat
  // index equals the time index. Any changed dimensions are rejected above.
  const entries = Object.entries(timeIndexes).map(([year, index]) => {
    if (!/^20\d{2}$/.test(year) || !Number.isSafeInteger(index) || index < 0 || index >= size[timePosition]) {
      throw new Error('EUROSTAT_TIME_INDEX_DRIFT');
    }
    const value = json.value?.[String(index)];
    if (value !== undefined && !scorePoint(value)) throw new Error('EUROSTAT_OUT_OF_RANGE_VALUE');
    return { year: Number(year), pct: value ?? null };
  }).sort((a, b) => a.year - b.year);
  if (new Set(entries.map((e) => e.year)).size !== entries.length) {
    throw new Error('EUROSTAT_TIME_INDEX_DRIFT');
  }
  const available = entries.filter((e) => e.pct !== null);
  if (available.length < 3) throw new Error('EUROSTAT_INSUFFICIENT_OBSERVATIONS');
  const latestAvailable = available.at(-1);
  // The paired evidence must end at the actual newest observation. Never
  // recover an older 2016-2020 comparison and present it alongside 2025 F.
  const previous = available.find((entry) => entry.year === latestAvailable.year - 2);
  const earlier = available.find((entry) => entry.year === latestAvailable.year - 4);
  const paired = previous && earlier ? [earlier, previous, latestAvailable] : null;
  const deltas = paired
    ? { olderTwoYearPp: paired[1].pct - paired[0].pct,
        recentTwoYearPp: paired[2].pct - paired[1].pct,
        changeBetweenTwoYearWindowsPp: paired[2].pct - 2 * paired[1].pct + paired[0].pct }
    : null;
  return {
    source: 'Eurostat ISOC_CICCE_USE',
    officialApi: EUROSTAT_CLOUD_API,
    sourceUpdatedAt: json.updated ?? null,
    datasetVersion: json.extension?.datastructure?.version ?? null,
    metric: 'paid_cloud_computing_enterprise_adoption_share',
    regionAndScope: 'EU27_2020; enterprises >=10 employees; nonfinancial sector; E_CC',
    unit: 'percent_of_enterprises',
    latestAvailableYear: latestAvailable.year,
    latestRawPct: latestAvailable.pct,
    twoYearComparisonYears: paired?.map((p) => p.year) ?? null,
    twoYearDeltaPctPoints: deltas?.recentTwoYearPp ?? null,
    changeBetweenTwoYearWindowsPctPoints: deltas?.changeBetweenTwoYearWindowsPp ?? null,
    previousTwoYearDeltaPctPoints: deltas?.olderTwoYearPp ?? null,
    missingYears: entries.filter((e) => e.pct === null).map((e) => e.year),
    state: paired ? 'OFFICIAL_SPARSE_SURVEY_RESEARCH_ONLY' : 'OFFICIAL_SERIES_HISTORY_LIMITED',
    G: null, D: null, M: null, ranking: null,
    notes: [
      'The two-year percentage-point change is not annual YoY industry revenue growth.',
      'No missing survey years are interpolated or filled with 0.',
      'A newer unpaired observation is disclosed separately from the most recent matched comparison.',
      'Eurostat content reuse requires source credit and checking specific exceptions.',
    ],
  };
}

export async function fetchLatestEurostatCloud({ fetchFn = fetch } = {}) {
  const response = await fetchFn(EUROSTAT_CLOUD_API, {
    signal: AbortSignal.timeout(15000), headers: { accept: 'application/json' },
  });
  if (!response?.ok) throw new Error(`EUROSTAT_HTTP_${response?.status ?? 'UNAVAILABLE'}`);
  if (new URL(response.url ?? EUROSTAT_CLOUD_API).origin !== new URL(EUROSTAT_CLOUD_API).origin) {
    throw new Error('EUROSTAT_SOURCE_ORIGIN_DRIFT');
  }
  return parseEurostatCloud(await response.json());
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fetchLatestEurostatCloud().then((data) => {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
  }).catch((error) => {
    process.stderr.write(`EUROSTAT_CLOUD_UNAVAILABLE: ${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
