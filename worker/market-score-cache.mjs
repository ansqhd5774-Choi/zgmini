import {marketScoreResponseStore} from './market-score-response-store.mjs';
// Cache only the anonymous public result, never provider inputs or credentials.
// Bump namespace when the public scoring contract changes.
const NAMESPACE = 'market-score-response-v2';
const TTL = 300;

export function withMarketScoreCache(handler, {
  env = {},
  getCache = () => marketScoreResponseStore(env.DB),
  now = () => Date.now(),
  waitUntil,
} = {}) {
  const pending=new Map();
  const refreshAttempts=new Map();
  let store;
  function collect(request,key,cache,start){
    if(pending.has(key.url))return pending.get(key.url);
    const job=(async()=>{
      const response=await handler(request);
      const headers=new Headers(response.headers);
      headers.set('x-market-cache',cache?'MISS':'BYPASS');
      headers.set('server-timing',`market;dur=${now()-start};desc="collect"`);
      const output=new Response(response.body,{status:response.status,headers});
      if(cache&&output.status===200){
        try{
          const body=await output.clone().json();
          if(body.status==='SUCCESS'&&body.domains?.length===12){
            const stored=output.clone();
            stored.headers.set('cache-control',`public, max-age=${TTL}`);
            stored.headers.set('x-market-cache-stored-at',String(now()));
            await cache.put(key,stored);
            output.headers.set('x-market-cache-write','STORED');
          }
        }catch(error){output.headers.set('x-market-cache-write',error instanceof TypeError?'TYPE_ERROR':'FAILED');}
      }
      return output;
    })().finally(()=>pending.delete(key.url));
    pending.set(key.url,job);
    return job;
  }
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
    try { cache = store ??= getCache(); } catch { /* Unsupported runtime uses origin. */ }
    try {
      const hit = await cache?.match(key);
      const stored = Number(hit?.headers.get('x-market-cache-stored-at'));
      const age = Math.floor((start - stored) / 1000);
      if (hit && stored > 0 && age >= 0 && age < TTL) {
        // Refresh ahead, not stale serving: preserve the existing five-minute limit.
        if(age>=240&&typeof waitUntil==='function'&&!pending.has(key.url)&&start-(refreshAttempts.get(key.url)??0)>=30000){
          if(refreshAttempts.size>4)refreshAttempts.clear();
          refreshAttempts.set(key.url,start);
          waitUntil(collect(request,key,cache,start).then(()=>undefined).catch(()=>{}));
        }
        const headers = new Headers(hit.headers);
        headers.delete('x-market-cache-stored-at');
        headers.set('cache-control', `public, max-age=${TTL - age}, must-revalidate`);
        headers.set('x-market-cache', 'HIT');
        headers.set('server-timing', `market;dur=${now()-start};desc="cache"`);
        return new Response(hit.body, {status:hit.status, headers});
      }
    } catch { /* Cache failure must not break the public API. */ }
    return (await collect(request,key,cache,start)).clone();
  };
}
