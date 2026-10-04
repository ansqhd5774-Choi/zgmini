const deny = () => { throw new Error('CANDIDATE_WRITE_DISABLED'); };
export function readOnlyDatabase(db) {
  return Object.freeze({prepare(sql) {
    if (typeof sql !== 'string' || !/^\s*SELECT\b/i.test(sql) || /;|--|\/\*|\b(insert|update|delete|replace|create|drop|alter|attach|detach|pragma|vacuum|load_extension)\b/i.test(sql)) deny();
    function wrap(s) { return Object.freeze({bind(...a) {return wrap(s.bind(...a));}, first:(...a)=>s.first(...a), all:(...a)=>s.all(...a), raw:(...a)=>s.raw(...a), run:deny}); }
    return wrap(db.prepare(sql));
  },batch:deny,exec:deny,dump:deny});
}
export function readOnlyEnv(native) { return Object.freeze({DB:native.DB?readOnlyDatabase(native.DB):undefined,ASSETS:native.ASSETS}); }
export function candidateRequest(request) {
  if (!['GET','HEAD'].includes(request.method)) return null;
  let p=new URL(request.url).pathname;
  try {p=decodeURIComponent(p);} catch {return null;}
  if(p.includes('\\') || /%[0-9a-f]{2}/i.test(p)) return null;
  if (/^\/(?:api\/(?:internal|admin|favorites)|signin-with-chatgpt|signout-with-chatgpt|callback)(?:\/|$)/.test(p) || /(?:refresh|backfill|collector|producer)/i.test(p)) return null;
  const headers=new Headers(request.headers);
  for(const name of [...headers.keys()]) if(/^oai-|^authorization$|^cookie$/i.test(name)) headers.delete(name);
  return new Request(request,{headers});
}
export function candidateWorker(handler) {return Object.freeze({async fetch(request,native,ctx) {
  const safe=candidateRequest(request);
  if(!safe) return new Response('CANDIDATE_WRITE_DISABLED',{status:403});
  return handler.fetch(safe,readOnlyEnv(native),ctx);
}});} // No scheduled/queue/alarm export and no runtime flag to enable writes.
