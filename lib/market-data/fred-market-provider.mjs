import {ProviderError} from './providers.mjs';
import {withFredObservations} from './fred-api-transport.mjs';

const fail = status => {throw new ProviderError(status);};
const previousMonth = (date, offset) => new Date(Date.UTC(Number(date.slice(0,4)), Number(date.slice(5,7)) - 1 - offset, 1)).toISOString().slice(0,10);

/** Existing consumer rows only; no YoY/price transformation in this provider. */
export async function fetchMarketFred(seriesId, {key = '', fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = 8000} = {}) {
  const started = now(), timings = {httpStatus: null, headersMs: null, bodyReadCompleteMs: null};
  try {
    if (!['PCEPILFE','DCOILWTICO','DGS10'].includes(seriesId)) fail('INVALID_SERIES');
    const data = await withFredObservations(seriesId, key, ({points}) => {
      if (points.length < 2) fail('MISSING_OBSERVATION');
      // The existing YoY consumer needs current/previous and their calendar
      // year-ago levels. Do not silently fall back to an older computable YoY.
      if (seriesId === 'PCEPILFE') {
        const current = points.at(-1).date, byDate = new Map(points.map(p => [p.date,p.value]));
        for (const offset of [0,1,12,13]) if (!byDate.has(previousMonth(current, offset))) fail('MISSING_OBSERVATION');
        if ([12,13].some(offset => byDate.get(previousMonth(current,offset)) === 0)) fail('ZERO_YOY_DENOMINATOR');
      }
      return points.map(({date,value}) => ({date,value}));
    }, {fetchImpl, now, timeoutMs, timing: timings});
    return {data, status: 'SUCCESS', durationMs: now()-started, timings};
  } catch (error) {
    return {data: [], status: error instanceof ProviderError ? error.status : 'REQUEST_FAILED', durationMs: now()-started, timings};
  }
}
