// Public, non-personalized feed only. Keep upstream observation dates unchanged.
export function cachePublicFeed(load, {ttlMs=60000, now=Date.now}={}) {
  let cached=null, inFlight=null;
  return async function GET() {
    const reply=entry=>{
      const headers=new Headers(entry.headers);
      headers.set('X-Robots-Tag','noindex');
      // Server cache bounds freshness; browsers must not extend its lifetime.
      headers.set('Cache-Control','no-store');
      return new Response(entry.body,{status:entry.status,headers});
    };
    if(cached && now()-cached.at<ttlMs) return reply(cached);
    if(!inFlight) inFlight=(async()=>{
      const response=await load();
      const entry={body:await response.text(),status:response.status,headers:[...response.headers],at:now()};
      if(response.ok) cached=entry;
      else cached=null;
      return entry;
    })().finally(()=>{inFlight=null;});
    return reply(await inFlight);
  };
}
