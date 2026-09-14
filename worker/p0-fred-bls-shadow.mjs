import {fetchShadowSeries, SHADOW_SERIES} from '../lib/market-data/fred-bls-shadow.mjs';
import {inspectRuntime} from './p0-runtime-signals.mjs';
import {POLICY} from './p0-fred-transport.mjs';

export function createFredBlsShadow({fetchImpl = globalThis.fetch, now = Date.now, cacheStore = () => globalThis.caches?.default, timeoutMs = POLICY.timeoutMs} = {}) {
  let cached, inFlight;
  return async function(request, context = {}) {
    const runtimeClassification = inspectRuntime(request, context).runtimeClassification;
    const reply = (data, status = 200) => Response.json({diagnosticOnly: true, shadowOnly: true, publicFallbackEnabled: false, runtimeClassification, ...data}, {status, headers: {'cache-control': 'no-store', 'x-robots-tag': 'noindex'}});
    if (request.method !== 'GET') return reply({error: 'METHOD_NOT_ALLOWED', requestCount: 0}, 405);
    if (new URL(request.url).search) return reply({error: 'QUERY_NOT_ALLOWED', requestCount: 0}, 400);
    if (now() >= Date.parse(POLICY.expiresAt)) return reply({error: 'EXPIRED', requestCount: 0}, 410);
    if (runtimeClassification !== 'PRODUCTION_CONFIRMED') return reply({status: 'NOT_RUN', upstreamFetchEnabled: false, requestCount: 0});
    const fresh = entry => entry && now() >= entry.at && now() - entry.at < POLICY.cacheMs;
    if (fresh(cached)) return reply({...cached.data, cacheHit: true, requestCount: 0});
    const joined = !!inFlight;
    if (!inFlight) inFlight = (async () => {
      const store = cacheStore();
      const key = new Request('https://zgmini.kr/api/internal/p0-fred-bls-shadow-check');
      if (store) try {
        const hit = await store.match(key);
        if (hit) {
          const entry = await hit.json();
          if (fresh(entry)) { cached = entry; return {...entry.data, cacheHit: true, requestCount: 0}; }
        }
      } catch { /* Cache failure never exposes storage errors. */ }
      const entries = await Promise.all(Object.keys(SHADOW_SERIES).map(async id => [id, await fetchShadowSeries(id, {fetchImpl, now, timeoutMs})]));
      const series = Object.fromEntries(entries);
      const complete = Object.values(series).every(value => value.status === 'SUCCESS' && value.semantic === 'PASS');
      const data = {upstreamFetchEnabled: true, requestCount: 4, probeRequestCount: 4, cacheHit: false, series, classification: complete ? 'FRED_BLS_SECONDARY_SHADOW_PASS' : 'FRED_BLS_SECONDARY_SHADOW_PARTIAL'};
      cached = {at: now(), data};
      if (store) try { await store.put(key, Response.json(cached, {headers: {'cache-control': 'public, max-age=900'}})); } catch { /* Best effort, in-isolate cache retained. */ }
      return data;
    })().finally(() => { inFlight = null; });
    const data = await inFlight;
    return reply(joined ? {...data, coalesced: true, requestCount: 0} : data);
  };
}

export const fredBlsShadow = createFredBlsShadow();
