import {collectProviderCandidates, FALLBACK_PRODUCTION_ENABLED} from './fallback-integration.mjs';
import {FALLBACK_MAPPINGS} from './fallback-policy.mjs';

/** One primary batch; only provider-eligible failures inspect secondary. */
export async function fetchBlsWithFallback({key = '', fredKey = '', fetchImpl = globalThis.fetch, now = Date.now} = {}) {
  const result = await collectProviderCandidates({fetchImpl, now, blsKey: key, fredKey,
    inspectSecondary: FALLBACK_PRODUCTION_ENABLED && !!fredKey});
  const batch = result.appliedBlsResult;
  const data = new Map(batch.data), statuses = {...batch.statuses};
  const metrics = [];
  let changed = false;
  for (const [metric, {candidate, primary, secondary, observability}] of Object.entries(result.metrics)) {
    const id = FALLBACK_MAPPINGS[metric].sourceSeriesId;
    const raw = result.consumerCandidates.get(metric);
    const accepted = candidate.decision === 'USE_SECONDARY' && !!raw;
    // Primary success retains the original rows, not candidate normalization.
    if (accepted) {data.set(id, raw); statuses[id] = 'SUCCESS'; changed = true;}
    if (candidate.decision === 'BLOCKED' && data.has(id)) {
      data.delete(id); statuses[id] = 'INVALID_RESPONSE'; changed = true;
    }
    metrics.push({metric, ...observability, selectedProvider: accepted ? 'FRED' : data.has(id) ? 'BLS' : null,
      primaryStatus: primary.transportStatus, fallbackAttempted: !!secondary && !!fredKey,
      fallbackResult: accepted ? 'SUCCESS' : secondary ? 'BLOCKED' : 'NOT_ATTEMPTED',
      observedAt: data.get(id)?.at(-1)?.date ?? null});
  }
  console.info('MARKET_DATA_FALLBACK', JSON.stringify({blsBatchRequests: result.requestCounts.bls,
    fallbackFredRequests: result.requestCounts.fred, metrics}));
  if (!changed) return batch;
  return {...batch, data, statuses, status: Object.values(statuses).every(s => s === 'SUCCESS') ? 'SUCCESS' : 'INVALID_RESPONSE'};
}
