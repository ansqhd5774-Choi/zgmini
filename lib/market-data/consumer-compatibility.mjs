import {FALLBACK_MAPPINGS} from './fallback-policy.mjs';
import {getApiRawHistory} from './fred-api-shadow.mjs';

const fail = reason => {throw new TypeError(reason);};
const monthBefore = (date, count) => new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1 - count, 1)).toISOString().slice(0, 10);

/** Internal raw rows only. Selected derived values are deliberately never read. */
export function consumerCompatibilityAdapter({metricId, candidate, batch, secondaryResult}) {
  const mapping = FALLBACK_MAPPINGS[metricId];
  const selected = candidate?.selected;
  if (!mapping || !selected || !['USE_PRIMARY', 'USE_SECONDARY'].includes(candidate.decision)) fail('NO_SELECTED_PROVIDER');
  const secondary = candidate.decision === 'USE_SECONDARY';
  if (selected.provider !== (secondary ? 'FRED' : 'BLS') || selected.sourceSeries !== mapping.sourceSeriesId
      || selected.transportSeries !== (secondary ? mapping.transportSeriesId : mapping.sourceSeriesId)) fail('RAW_IDENTITY_MISMATCH');
  // The official adapter retains its validated raw rows out of band. A serialized
  // diagnostic, derived result, or recent-four preview cannot impersonate history.
  const input = secondary ? getApiRawHistory(secondaryResult) : batch?.data?.get(mapping.sourceSeriesId);
  if (secondary && (secondaryResult?.metricId !== metricId || secondaryResult.observedAt !== selected.observedAt
      || secondaryResult.previousObservedAt !== selected.previousObservedAt)) fail('RAW_IDENTITY_MISMATCH');
  if (!Array.isArray(input)) fail('RAW_HISTORY_UNAVAILABLE');
  const dates = new Map();
  for (const row of input) {
    if (typeof row.date !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(row.date)
        || !Number.isFinite(Date.parse(row.date))) fail('INVALID_DATE');
    if (typeof row.value !== 'number' || !Number.isFinite(row.value)) fail('INVALID_NUMERIC');
    if (dates.has(row.date) && dates.get(row.date) !== row.value) fail('DUPLICATE_CONFLICT');
    dates.set(row.date, row.value);
  }
  const rows = [...dates].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({date, value}));
  const current = rows.at(-1)?.date;
  if (!current || current !== selected.observedAt || monthBefore(current, 1) !== selected.previousObservedAt) fail('REQUIRED_OBSERVATION_MISMATCH');
  const offsets = metricId === 'cpi' || metricId === 'ppi' ? [0, 1, 12, 13] : metricId === 'payroll' ? [0, 1, 2] : [0, 1];
  for (const offset of offsets) if (!dates.has(monthBefore(current, offset))) fail('MISSING_OBSERVATION');
  if ((metricId === 'cpi' || metricId === 'ppi') && [12, 13].some(offset => dates.get(monthBefore(current, offset)) === 0)) fail('ZERO_YOY_DENOMINATOR');
  return rows;
}

/** Default OFF preserves the exact original Map, including failures. No route uses
 * this simulation switch; production activation remains a separate task. */
export function consumerInputMap({integration, secondaryResults = {}, simulateSelection = false}) {
  const batch = integration.appliedBlsResult;
  if (!simulateSelection) return batch.data;
  const data = new Map();
  for (const [metricId, {candidate}] of Object.entries(integration.metrics)) {
    if (candidate.decision === 'BLOCKED') continue;
    data.set(FALLBACK_MAPPINGS[metricId].sourceSeriesId, consumerCompatibilityAdapter({
      metricId, candidate, batch, secondaryResult: secondaryResults[metricId],
    }));
  }
  return data;
}
