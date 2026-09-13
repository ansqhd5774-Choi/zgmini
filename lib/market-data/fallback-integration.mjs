import {BLS_SERIES, fetchBls, ProviderError} from './providers.mjs';
import {normalizeShadowSeries} from './fred-bls-shadow.mjs';
import {fetchApiShadowSeries} from './fred-api-shadow.mjs';
import {evaluateFallbackEligibility, FALLBACK_MAPPINGS} from './fallback-policy.mjs';
import {consumerCompatibilityAdapter} from './consumer-compatibility.mjs';

export const FALLBACK_PRODUCTION_ENABLED = false;
const primaryIds = Object.freeze({...BLS_SERIES, payroll: BLS_SERIES.payrolls});
const transportFailures = new Set(['TIMEOUT', 'HTTP_ERROR', 'QUOTA_EXCEEDED']);

export function standardizeBlsPrimary(metricId, batch, {fetchedAt, failureEvidence = {}}) {
  const sourceSeries = primaryIds[metricId];
  const status = batch.statuses?.[sourceSeries] ?? 'UNCLASSIFIED';
  const base = {metricId, provider: 'BLS', sourceSeries, transportStatus: status, fetchedAt};
  if (status !== 'SUCCESS') {
    const evidence = failureEvidence[sourceSeries];
    const origin = evidence?.status === status ? evidence.origin : transportFailures.has(status) ? 'PROVIDER' : 'UNKNOWN';
    return {...base, status, failureOrigin: origin, failureReason: status,
      semanticStatus: 'UNVERIFIED', qualityStatus: 'FAIL'};
  }
  try {
    // Reuse existing monthly semantic adapter; no new YoY/payroll formulas.
    // These stricter candidate checks never replace the OFF-mode original result.
    const normalized = normalizeShadowSeries(metricId, batch.data.get(sourceSeries) ?? [], {fetchedAt});
    return {...normalized, ...base, transportProvider: 'BLS', semanticStatus: normalized.semantic,
      qualityStatus: 'PASS', derivedValue: normalized.currentValue, failureReason: null};
  } catch (error) {
    return {...base, status: error instanceof ProviderError ? error.status : 'UNCLASSIFIED',
      failureOrigin: error instanceof ProviderError ? 'SEMANTIC' : 'CODE',
      semantic: 'FAIL', semanticStatus: 'FAIL', qualityStatus: 'FAIL', failureReason: 'PRIMARY_NORMALIZATION_FAILED'};
  }
}

const secondaryQuality = result => ({dataOrigin: 'PROVIDER', observationPolicy: 'LATEST_AVAILABLE',
  status: result?.status === 'SUCCESS' && ['PASS','FORMULA_INPUT_MATCH'].includes(result.semantic) ? 'PASS' : 'FAIL',
  requiredHistoryVerified: result?.status === 'SUCCESS' && ['PASS','FORMULA_INPUT_MATCH'].includes(result.semantic)});

const safeDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z)?$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
const safeValue = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const statuses = new Set(['SUCCESS','TIMEOUT','HTTP_ERROR','REQUEST_FAILED','QUOTA_EXCEEDED','INVALID_RESPONSE','MISSING_SERIES','MISSING_OBSERVATION','INSUFFICIENT_HISTORY','MONTH_GAP','STALE','FUTURE_OBSERVATION','INVALID_NUMERIC','INVALID_DATE','DUPLICATE_CONFLICT','ZERO_YOY_DENOMINATOR','NONFINITE_RESULT','KEY_MISSING','INVALID_JSON','BODY_LIMIT']);
const safeStatus = status => statuses.has(status) ? status : 'UNCLASSIFIED';
function describe(result, metricId, provider) {
  if (!result) return null;
  return {metricId, provider, sourceSeries: FALLBACK_MAPPINGS[metricId].sourceSeriesId,
    transportStatus: safeStatus(result.transportStatus ?? result.status),
    semanticStatus: ['PASS','FORMULA_INPUT_MATCH'].includes(result.semanticStatus ?? result.semantic) ? 'PASS' : 'FAIL',
    qualityStatus: secondaryQuality(result).status,
    observedAt: safeDate(result.observedAt), currentValue: safeValue(result.currentValue),
    previousObservedAt: safeDate(result.previousObservedAt), previousValue: safeValue(result.previousValue),
    derivedValue: safeValue(result.currentValue), fetchedAt: safeDate(result.fetchedAt),
    failureReason: result.status === 'SUCCESS' ? null : safeStatus(result.status)};
}

/** Candidate inspection only. The original batch remains the applied result by identity. */
export function integrateProviderResults({batch, secondaryResults = {}, fetchedAt, failureEvidence = {}}) {
  const metrics = {};
  for (const metricId of Object.keys(FALLBACK_MAPPINGS)) {
    const primary = standardizeBlsPrimary(metricId, batch, {fetchedAt, failureEvidence});
    // Successful primary is never replaced by, or compared against, secondary.
    const preliminary = evaluateFallbackEligibility({metricId, primary});
    const secondary = preliminary.reason === 'SECONDARY_NOT_VALID' ? secondaryResults[metricId] : undefined;
    const decision = evaluateFallbackEligibility({metricId, primary, secondary, quality: secondaryQuality(secondary)});
    metrics[metricId] = {primary: describe(primary, metricId, 'BLS'), secondary: describe(secondary, metricId, 'FRED'), candidate: decision};
  }
  return {fallbackProductionEnabled: FALLBACK_PRODUCTION_ENABLED, appliedBlsResult: batch, metrics};
}

/**
 * Uses the real batch/official API adapters with an explicitly injected transport.
 * No implicit global fetch, route import, env flag, or production activation.
 * inspectSecondary=true is for fixture candidate/request-count validation only.
 */
export async function collectProviderCandidates({fetchImpl, now = Date.now, blsKey = '', fredKey = '', inspectSecondary = false} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('EXPLICIT_TRANSPORT_REQUIRED');
  const failureEvidence = {}, fetchedAt = new Date(now()).toISOString();
  let blsRequests = 0, fredRequests = 0;
  const batch = await fetchBls({key: blsKey, now: new Date(fetchedAt), failureEvidence,
    fetchImpl: (...args) => {blsRequests++; return Reflect.apply(fetchImpl, globalThis, args);}});
  const initial = integrateProviderResults({batch, fetchedAt, failureEvidence});
  const secondaryResults = {};
  if (inspectSecondary) {
    await Promise.all(Object.keys(FALLBACK_MAPPINGS).map(async metricId => {
      if (initial.metrics[metricId].candidate.reason !== 'SECONDARY_NOT_VALID') return;
      secondaryResults[metricId] = await fetchApiShadowSeries(metricId, fredKey, {now,
        fetchImpl: (...args) => {fredRequests++; return Reflect.apply(fetchImpl, globalThis, args);}});
    }));
  }
  const integrated = integrateProviderResults({batch, secondaryResults, fetchedAt, failureEvidence});
  // Internal handoff only, never applied to the OFF-mode batch or route.
  const consumerCandidates = new Map();
  for (const [metricId, {candidate}] of Object.entries(integrated.metrics)) {
    if (candidate.decision === 'BLOCKED') continue;
    try {
      consumerCandidates.set(metricId, consumerCompatibilityAdapter({metricId, candidate, batch, secondaryResult: secondaryResults[metricId]}));
    } catch {
      // Fail closed: a diagnostic summary without required raw history is unusable.
    }
  }
  return {...integrated, consumerCandidates, requestCounts: {bls: blsRequests, fred: fredRequests}};
}
