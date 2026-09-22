// Cache only the anonymous public result, never provider inputs or credentials.
// Bump namespace when the public scoring contract changes.
const NAMESPACE = 'market-score-response-v1';
const TTL = 300;

export function withMarketScoreCache(handler, {
  env = {},
  getCache = () => globalThis.caches?.default,
  now = () => Date.now(),
} = {}) {
  return async request => {
    if (request.method !== 'GET') return handler(request);
    const start = now();
    const url = new URL(request.url);
    const pro = String(env.EQUIBLES_B1_PLAN ?? '').trim().toUpperCase() === 'PRO';
    const keyPresent = Boolean(String(env.EQUIBLES_API_KEY ?? '').trim());
    const fredPresent = Boolean(String(env.FRED_API_KEY ?? '').trim());
    url.pathname = `/__public-cache/${NAMESPACE}/${new Date(start).toISOString().slice(0,10)}/${Number(pro)}${Number(keyPresent)}${Number(fredPresent)}`;
    url.search = '';
    const key = new Request(url.toString());
    let cache;
    try { cache = getCache(); } catch { /* Unsupported runtime uses origin. */ }
    try {
      const hit = await cache?.match(key);
      const stored = Number(hit?.headers.get('x-market-cache-stored-at'));
      const age = Math.floor((start - stored) / 1000);
      if (hit && stored > 0 && age >= 0 && age < TTL) {
        const headers = new Headers(hit.headers);
        headers.delete('x-market-cache-stored-at');
        headers.set('cache-control', `public, max-age=${TTL - age}, must-revalidate`);
        headers.set('x-market-cache', 'HIT');
        headers.set('server-timing', `market;dur=${now()-start};desc="cache"`);
        return new Response(hit.body, {status:hit.status, headers});
      }
    } catch { /* Cache failure must not break the public API. */ }
    const response = await handler(request);
    const headers = new Headers(response.headers);
    headers.set('x-market-cache', cache ? 'MISS' : 'BYPASS');
    headers.set('server-timing', `market;dur=${now()-start};desc="collect"`);
    const output = new Response(response.body, {status:response.status, headers});
    if (cache && output.status === 200) {
      try {
        const body = await output.clone().json();
        if (body.status === 'SUCCESS' && body.domains?.length === 12) {
          const stored = output.clone();
          stored.headers.set('cache-control', `public, max-age=${TTL}`);
          stored.headers.set('x-market-cache-stored-at', String(now()));
          await cache.put(key, stored);
        }
      } catch { /* Never cache a failed or malformed result. */ }
    }
    return output;
  };
}
