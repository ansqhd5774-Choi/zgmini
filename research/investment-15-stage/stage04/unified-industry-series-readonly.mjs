/**
 * Proposed unified ZGMINI input contract for stage04 (R19 / RESEARCH_ONLY).
 * No live endpoint is assumed and no PC writer, D1 or public API is changed.
 * Each theme may have its own well-defined unit, but all theme data arrives
 * through ONE ZGMINI endpoint and each theme's history must be internally
 * same-definition, same-vintage and observable as of the run date.
 */

export const PROPOSED_INDUSTRY_API = 'https://zgmini.kr/api/investment/stage04/industry-demand';
export const INDUSTRY_SERIES_SCHEMA = 'ZGMINI_STAGE04_INDUSTRY_DEMAND_V1';
const APPROVED_REUSE = 'VERIFIED_FOR_ZGMINI_DERIVED_PUBLIC_USE';
const allowedFrequency = new Set(['ANNUAL', 'QUARTERLY']);
const allowedMetricKind = new Set(['LEVEL', 'ADOPTION_SHARE_PCT']);
const allowedPhase = new Set(['FINAL', 'PROVISIONAL', 'ESTIMATE']);

function validDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const x = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(x.getTime()) && x.toISOString().slice(0, 10) === date;
}

function validTimestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
    && Number.isFinite(Date.parse(value)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}

function periodOrdinal(period, frequency) {
  if (frequency === 'ANNUAL') {
    return typeof period === 'string' && /^(19|20|21)\d{2}$/.test(period) ? Number(period) : null;
  }
  const match = typeof period === 'string' ? period.match(/^((?:19|20|21)\d{2})-Q([1-4])$/) : null;
  return match ? Number(match[1]) * 4 + Number(match[2]) - 1 : null;
}

function finiteNonnegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function emptyRow(theme, reason) {
  return {
    theme, state: reason,
    metricId: null, sourceInstitution: null, sourceUrl: null, sourcePeriod: null,
    rawValue: null, priorYearValue: null, twoYearsPriorValue: null,
    changeUnit: null, changeYoY: null, accelerationYoYPp: null,
    G1: null, G2: null, G: null, D: null, M: null, officialRank: null,
  };
}

function parseThemeSeries(item, { asOfMs }) {
  if (!item || typeof item.theme !== 'string' || !item.theme.trim()) {
    throw new Error('INVALID_INDUSTRY_THEME');
  }
  if (!item.metricId || !item.definitionId || !item.vintageId || !item.unit || !item.region) {
    return emptyRow(item.theme, 'MISSING_METRIC_PROVENANCE');
  }
  if (!allowedFrequency.has(item.frequency) || !allowedMetricKind.has(item.metricKind)) {
    return emptyRow(item.theme, 'INVALID_METRIC_FREQUENCY_OR_KIND');
  }
  if (!['DIRECT', 'PROXY_SCOPE_LIMITED'].includes(item.scope)) {
    return emptyRow(item.theme, 'UNVERIFIED_INDUSTRY_SCOPE');
  }
  if (!item.source || !/^https:\/\//.test(item.source.url ?? '') || !item.source.institution) {
    return emptyRow(item.theme, 'MISSING_PRIMARY_SOURCE');
  }
  if (item.source.reuseRights !== APPROVED_REUSE) {
    return emptyRow(item.theme, 'SOURCE_RIGHTS_NOT_VERIFIED');
  }
  if (!Array.isArray(item.observations) || item.observations.length > 1000) {
    return emptyRow(item.theme, 'INVALID_OR_OVERSIZED_HISTORY');
  }

  const seen = new Set();
  const observed = [];
  for (const point of item.observations) {
    const ordinal = periodOrdinal(point?.period, item.frequency);
    if (ordinal === null || seen.has(ordinal)) {
      return emptyRow(item.theme, 'INVALID_OR_DUPLICATED_PERIOD');
    }
    seen.add(ordinal);
    if (!finiteNonnegative(point?.value) || (item.metricKind === 'ADOPTION_SHARE_PCT' && point.value > 100)) {
      return emptyRow(item.theme, 'INVALID_SOURCE_VALUE');
    }
    if (point.definitionId !== item.definitionId || point.vintageId !== item.vintageId
      || !validTimestamp(point.publishedAt) || !allowedPhase.has(point.phase)) {
      return emptyRow(item.theme, 'SERIES_DEFINITION_OR_VINTAGE_DRIFT');
    }
    if (Date.parse(point.publishedAt) <= asOfMs) observed.push({ ...point, ordinal });
  }

  const sorted = observed.sort((a, b) => b.ordinal - a.ordinal);
  if (sorted.length === 0) return emptyRow(item.theme, 'NO_ASOF_OBSERVATION');
  const latest = sorted[0];
  const yearSpan = item.frequency === 'ANNUAL' ? 1 : 4;
  const older = new Map(sorted.map((point) => [point.ordinal, point]));
  const prior = older.get(latest.ordinal - yearSpan) ?? null;
  const priorPrior = older.get(latest.ordinal - 2 * yearSpan) ?? null;
  const isPct = item.metricKind === 'ADOPTION_SHARE_PCT';
  const growth = (current, previous) => {
    if (!current || !previous || (!isPct && previous.value <= 0)) return null;
    return isPct ? current.value - previous.value : 100 * (current.value / previous.value - 1);
  };
  const g = growth(latest, prior);
  const previousG = growth(prior, priorPrior);
  return {
    theme: item.theme,
    state: item.scope === 'DIRECT' ? 'COMMON_INTERFACE_RAW_GROWTH_RESEARCH_ONLY'
      : 'PROXY_SCOPE_LIMITED_RESEARCH_ONLY',
    metricId: item.metricId,
    sourceInstitution: item.source.institution,
    sourceUrl: item.source.url,
    sourcePeriod: latest.period,
    sourcePhase: latest.phase,
    metricKind: item.metricKind,
    unit: item.unit,
    region: item.region,
    rawValue: latest.value,
    priorYearValue: prior?.value ?? null,
    twoYearsPriorValue: priorPrior?.value ?? null,
    changeUnit: isPct ? 'PERCENTAGE_POINTS_PER_YEAR' : 'PERCENT_YOY',
    changeYoY: g,
    accelerationYoYPp: g === null || previousG === null ? null : g - previousG,
    // Original G1/G2 normalization and G/D/M weights remain UNAPPROVED.
    G1: null, G2: null, G: null, D: null, M: null, officialRank: null,
  };
}

export function parseUnifiedIndustrySeries(payload, { expectedThemes, asOfDate }) {
  if (!validDate(asOfDate)) throw new Error('INVALID_AS_OF_DATE');
  if (!Array.isArray(expectedThemes) || new Set(expectedThemes).size !== expectedThemes.length
    || !expectedThemes.every((s) => typeof s === 'string' && s.trim())) {
    throw new Error('INVALID_EXPECTED_THEMES');
  }
  if (payload?.status !== 'READY' || payload.schemaVersion !== INDUSTRY_SERIES_SCHEMA
    || !validTimestamp(payload.sourceStoredAt) || !Array.isArray(payload.themes)) {
    throw new Error('INDUSTRY_API_CONTRACT_UNVERIFIED');
  }
  const asOfMs = Date.parse(`${asOfDate}T23:59:59+09:00`);
  if (Date.parse(payload.sourceStoredAt) > asOfMs) throw new Error('FUTURE_SOURCE_SNAPSHOT');
  const expected = new Set(expectedThemes);
  const byName = new Map();
  for (const item of payload.themes) {
    if (!expected.has(item?.theme) || byName.has(item.theme)) throw new Error('UNEXPECTED_OR_DUPLICATE_THEME');
    byName.set(item.theme, item);
  }
  const rows = expectedThemes.map((theme) => byName.has(theme)
    ? parseThemeSeries(byName.get(theme), { asOfMs })
    : emptyRow(theme, 'THEME_MISSING_IN_UNIFIED_FEED'));
  return {
    state: 'UNIFIED_SOURCE_OBSERVED_RESEARCH_ONLY',
    schemaVersion: payload.schemaVersion,
    sourceVersion: payload.sourceVersion ?? null,
    sourceStoredAt: payload.sourceStoredAt,
    rowCount: rows.length,
    rawGrowthObservedCount: rows.filter((row) => row.changeYoY !== null).length,
    accelerationObservedCount: rows.filter((row) => row.accelerationYoYPp !== null).length,
    rows,
  };
}
