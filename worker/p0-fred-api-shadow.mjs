import {fetchApiShadowSeries} from '../lib/market-data/fred-api-shadow.mjs';
import {SHADOW_SERIES} from '../lib/market-data/fred-bls-shadow.mjs';
import {inspectRuntime} from './p0-runtime-signals.mjs';
import {POLICY} from './p0-fred-transport.mjs';

export function createFredApiShadow({fetchImpl = globalThis.fetch, now = Date.now, timeoutMs = 8000, cacheStore = () => globalThis.caches?.default} = {}) {
  let cached, inFlight;
  return async (request, env = {}, context = {}) => {
    const runtimeClassification = inspectRuntime(request, context).runtimeClassification;
    const reply = (data, status = 200) => Response.json({diagnosticOnly: true, publicFallbackEnabled: false, runtimeClassification, ...data}, {status, headers: {'cache-control': 'no-store', 'x-robots-tag': 'noindex'}});
    if (request.method !== 'GET') return reply({error: 'METHOD_NOT_ALLOWED', requestCount: 0}, 405);
    if (new URL(request.url).search) return reply({error: 'QUERY_NOT_ALLOWED', requestCount: 0}, 400);
    if (now() >= Date.parse(POLICY.expiresAt)) return reply({error: 'EXPIRED', requestCount: 0}, 410);
    if (runtimeClassification !== 'PRODUCTION_CONFIRMED') return reply({status: 'NOT_RUN', requestCount: 0});
    const key = typeof env.FRED_API_KEY === 'string' ? env.FRED_API_KEY.trim() : '';
    if (!key) return reply({keyPresent: false, status: 'BLOCKED_BY_FRED_API_KEY', requestCount: 0});
    const fresh = value => value && now() >= value.at && now() - value.at < POLICY.cacheMs;
    if (fresh(cached)) return reply({...cached.data, cacheHit: true, requestCount: 0});
    const joined = !!inFlight;
    if (!inFlight) inFlight = (async () => {
      const store = cacheStore(), cacheKey = new Request('https://zgmini.kr/api/internal/p0-fred-api-shadow-check');
      if (store) try {const hit = await store.match(cacheKey); if (hit) {const saved = await hit.json(); if (fresh(saved)) {cached = saved; return {...saved.data, cacheHit: true, requestCount: 0};}}} catch {}
      const entries = await Promise.all(Object.keys(SHADOW_SERIES).map(async id => [id, await fetchApiShadowSeries(id, key, {fetchImpl, now, timeoutMs})]));
      const series = Object.fromEntries(entries);
      const complete = Object.values(series).every(s => s.status === 'SUCCESS' && s.semantic === 'PASS');
      const data = {keyPresent: true, transportMode: 'FRED_API_V1', requestCount: 4, probeRequestCount: 4, cacheHit: false, series,
        classification: complete ? 'FRED_API_SEMANTICS_PASS_FRESHNESS_UNVERIFIED' : 'FRED_API_SECONDARY_PARTIAL', secondaryReady: false};
      cached = {at: now(), data};
      if (store) try {await store.put(cacheKey, Response.json(cached, {headers: {'cache-control': 'public, max-age=900'}}));} catch {}
      return data;
    })().finally(() => {inFlight = null;});
    const data = await inFlight;
    return reply(joined ? {...data, coalesced: true, requestCount: 0} : data);
  };
}
export const fredApiShadow = createFredApiShadow();
