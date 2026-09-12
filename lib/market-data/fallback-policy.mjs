import {SHADOW_SERIES} from './fred-bls-shadow.mjs';

// Preparation only. No route imports this policy and it never performs I/O.
export const FALLBACK_MAPPINGS = Object.freeze(Object.fromEntries(
  Object.entries(SHADOW_SERIES).map(([metric, metadata]) => [metric, Object.freeze({
    ...metadata, semanticEquivalent: metric === 'ppi' ? 'VERIFY_REQUIRED' : 'YES',
    semanticUnit: metric === 'cpi' || metric === 'ppi' ? 'Percent YoY'
      : metric === 'payroll' ? 'Monthly change, thousand persons' : 'Percent',
    frequency: 'Monthly', authority: 'BLS', observationPolicy: 'LATEST_AVAILABLE',
  })]),
));
export const ALLOWED_PRIMARY_FAILURES = Object.freeze([
  'TIMEOUT', 'HTTP_ERROR', 'REQUEST_FAILED', 'QUOTA_EXCEEDED', 'INVALID_RESPONSE', 'MISSING_SERIES',
]);
const semanticPass = value => value === 'PASS' || value === 'FORMULA_INPUT_MATCH';
const finite = value => typeof value === 'number' && Number.isFinite(value);
const monthDate = value => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])-01$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const month = date => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));
const blocked = reason => ({decision: 'BLOCKED', reason, fallbackUsed: false, selected: null});

/**
 * primary is ONE series' status, never the aggregate batch status.
 * failureOrigin must be established by the integration layer: PROVIDER,
 * SEMANTIC, or CODE. Unknown origin fails closed (especially INVALID_RESPONSE).
 * quality is internal collection/validation provenance, not query parameters.
 * Inputs are already standardized; no formula or unit conversion occurs here.
 */
export function evaluateFallbackEligibility(input = {}) {
  const {metricId, primary} = input;
  const mapping = FALLBACK_MAPPINGS[metricId];
  if (!mapping || !primary) return blocked('INVALID_INPUT');
  if (primary.failureOrigin === 'SEMANTIC' || primary.failureOrigin === 'CODE'
      || (primary.semantic !== undefined && !semanticPass(primary.semantic))) return blocked('PRIMARY_SEMANTIC_OR_CODE_FAILURE');
  for (const field of ['unit', 'semanticUnit', 'frequency', 'seasonalAdjustment', 'observationPolicy']) {
    if (primary[field] !== undefined && primary[field] !== mapping[field]) return blocked('PRIMARY_METADATA_MISMATCH');
  }
  if (primary.status === 'SUCCESS') {
    if (!semanticPass(primary.semantic) || !finite(primary.currentValue) || !finite(primary.previousValue)
        || !monthDate(primary.observedAt) || !monthDate(primary.previousObservedAt)) return blocked('PRIMARY_INVALID_STANDARDIZED_INPUT');
    return {decision: 'USE_PRIMARY', fallbackUsed: false, fallbackReason: null,
      selected: select(primary, mapping, 'BLS', null)};
  }
  if (!ALLOWED_PRIMARY_FAILURES.includes(primary.status) || primary.failureOrigin !== 'PROVIDER') return blocked('PRIMARY_FAILURE_NOT_ELIGIBLE');
  if (mapping.semanticEquivalent !== 'YES') return blocked('MAPPING_VERIFY_REQUIRED');
  const {secondary, quality} = input;
  if (!secondary || secondary.status !== 'SUCCESS' || !semanticPass(secondary.semantic)) return blocked('SECONDARY_NOT_VALID');
  if (secondary.authority !== mapping.authority || secondary.transportProvider !== 'FRED'
      || secondary.transportMode !== 'FRED_API_V1' || secondary.sourceSeriesId !== mapping.sourceSeriesId
      || secondary.transportSeriesId !== mapping.transportSeriesId || secondary.metricId !== metricId
      || secondary.unit !== mapping.unit || secondary.semanticUnit !== mapping.semanticUnit
      || secondary.frequency !== mapping.frequency || secondary.seasonalAdjustment !== mapping.seasonalAdjustment) return blocked('SECONDARY_METADATA_MISMATCH');
  if (quality?.dataOrigin !== 'PROVIDER' || quality.status !== 'PASS'
      || quality.observationPolicy !== mapping.observationPolicy || quality.requiredHistoryVerified !== true
      || secondary.fixture === true || secondary.example === true || secondary.synthetic === true) return blocked('SECONDARY_QUALITY_UNVERIFIED');
  if (!finite(secondary.currentValue) || !finite(secondary.previousValue)
      || !finite(secondary.rawCurrent) || !finite(secondary.rawPrevious)
      || !monthDate(secondary.observedAt) || !monthDate(secondary.previousObservedAt)
      || month(secondary.observedAt) - month(secondary.previousObservedAt) !== 1) return blocked('SECONDARY_REQUIRED_OBSERVATION_INVALID');
  if (metricId === 'cpi' && (!finite(secondary.rawYearAgo) || !finite(secondary.rawPreviousYearAgo)
      || secondary.rawYearAgo === 0 || secondary.rawPreviousYearAgo === 0
      || !monthDate(secondary.yearAgoObservedAt) || !monthDate(secondary.previousYearAgoObservedAt)
      || month(secondary.observedAt) - month(secondary.yearAgoObservedAt) !== 12
      || month(secondary.previousObservedAt) - month(secondary.previousYearAgoObservedAt) !== 12)) return blocked('SECONDARY_REQUIRED_HISTORY_INVALID');
  if (metricId === 'payroll' && (!finite(secondary.rawPrior) || !monthDate(secondary.priorObservedAt)
      || month(secondary.previousObservedAt) - month(secondary.priorObservedAt) !== 1)) return blocked('SECONDARY_REQUIRED_HISTORY_INVALID');
  const fetched = Date.parse(secondary.fetchedAt);
  if (!Number.isFinite(fetched)) return blocked('SECONDARY_FETCH_DATE_INVALID');
  const lag = month(new Date(fetched).toISOString()) - month(secondary.observedAt);
  // Retain the existing shadow gate; not proof of the latest published release.
  if (lag < 0 || lag > 2 || secondary.providerUpdatedDataIsCurrent === false) return blocked('SECONDARY_STALE_OR_FUTURE');
  return {decision: 'USE_SECONDARY', fallbackUsed: true, fallbackReason: primary.status,
    selected: select(secondary, mapping, 'FRED', primary.status)};
}

function select(result, mapping, provider, reason) {
  return {provider, authority: 'BLS', sourceSeries: mapping.sourceSeriesId,
    transportSeries: provider === 'FRED' ? mapping.transportSeriesId : mapping.sourceSeriesId,
    transportMode: provider === 'FRED' ? 'FRED_API_V1' : 'BLS_PRIMARY',
    fallbackUsed: provider === 'FRED', fallbackReason: reason,
    currentValue: result.currentValue, previousValue: result.previousValue,
    observedAt: result.observedAt, previousObservedAt: result.previousObservedAt,
    fetchedAt: Number.isFinite(Date.parse(result.fetchedAt)) ? new Date(result.fetchedAt).toISOString() : null,
    semanticStatus: result.semantic, status: 'SUCCESS',
    latestReleaseVerified: result.providerUpdatedDataIsCurrent === true};
}
