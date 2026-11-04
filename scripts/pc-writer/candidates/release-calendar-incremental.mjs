// Inert reference implementation for integrating with the EXISTING PC calendar
// writer after its installed source/path/hash is positively identified.
// This module has no scheduler, DB schema, network activity or operational hook
// of its own. Callers inject the existing store, lease, provider and parser.

export const RELEASE_CALENDAR_SUCCESS_INTERVAL_MS=6*60*60*1000;
// PROPOSED ONLY: requires approval of the failed-source retry interval.
export const RELEASE_CALENDAR_FAILED_RETRY_MS=60*60*1000;

const instant=value=>typeof value==='string'?Date.parse(value):NaN;

export function planReleaseCalendarSources(specs,previous,now,{
  successIntervalMs=RELEASE_CALENDAR_SUCCESS_INTERVAL_MS,
  failureRetryMs=RELEASE_CALENDAR_FAILED_RETRY_MS,
}={}){
  if(!Number.isFinite(now)||!Number.isFinite(successIntervalMs)||successIntervalMs<=0||
    !Number.isFinite(failureRetryMs)||failureRetryMs<=0)throw Error('CALENDAR_RETRY_POLICY_INVALID');
  const sources=previous?.sources??{};
  return Object.keys(specs).filter(source=>{
    const state=sources[source];
    if(!state||!['READY','SOURCE_FAILED'].includes(state.status))return true;
    const when=instant(state.status==='READY'?state.checkedAt:state.attemptedAt);
    const elapsed=now-when;
    // Missing/inconsistent timestamps warrant a normal bounded collection.
    if(!Number.isFinite(when)||elapsed<0)return true;
    const interval=state.status==='READY'?successIntervalMs:failureRetryMs;
    return elapsed>=interval;
  });
}

/**
 * Adapter blueprint using only the existing publicFeedStore and
 * marketOperationalStore APIs. No automatic loop or extra scheduled task.
 * Unlike the historical collector, a successful source is not fetched again
 * merely because a different source failed.
 */
export async function collectReleaseCalendarIncremental({
  store,locks,specs,parse,now=Date.now(),fetchImpl=fetch,
  key='release-calendar',job='release-calendar',
  successIntervalMs=RELEASE_CALENDAR_SUCCESS_INTERVAL_MS,
  failureRetryMs=RELEASE_CALENDAR_FAILED_RETRY_MS,
}){
  const previous=(await store.readOutput(key))?.body??null;
  const due=planReleaseCalendarSources(specs,previous,now,{successIntervalMs,failureRetryMs});
  if(!due.length)return {
    status:'CACHED',providerRequests:0,refreshedSources:[],
    sources:Object.fromEntries(Object.entries(previous?.sources??{}).map(([source,state])=>[source,state.status])),
  };

  const lease=await locks.claim(job,now);
  if(!lease)return {status:'RUNNING',providerRequests:0,refreshedSources:[]};
  let providerRequests=0;
  try{
    await store.writeAttempt(key,now);
    const sources={...(previous?.sources??{})};
    let events=[...(previous?.events??[])];
    for(const source of due){
      const spec=specs[source];
      const url=spec.url.replace('{year}',String(new Date(now).getUTCFullYear()));
      try{
        providerRequests++;
        const response=await fetchImpl(url,{
          signal:AbortSignal.timeout(15000),
          headers:{'user-agent':'ZGMINI/1.0 (+https://zgmini.kr/about/)'},
        });
        if(!response.ok)throw Error('CALENDAR_HTTP_'+response.status);
        const content=await response.text();
        if(content.length>1000000)throw Error('CALENDAR_TOO_LARGE');
        await store.writeInput(key+':'+source,{text:content,sourceUrl:url},now);
        const stored=await store.readInput(key+':'+source);
        if(!stored)throw Error('CALENDAR_INPUT_READBACK_MISSING');
        const parsed=parse(stored.body.text,source);
        sources[source]={status:'READY',checkedAt:new Date(now).toISOString(),sourceUrl:spec.page};
        events=events.filter(event=>event.source!==source).concat(parsed);
      }catch{
        // Failed source retains its own last confirmed events and checkedAt.
        sources[source]={status:'SOURCE_FAILED',
          checkedAt:sources[source]?.checkedAt??null,
          attemptedAt:new Date(now).toISOString(),sourceUrl:spec.page};
      }
    }
    const body={
      status:Object.values(sources).every(s=>s.status==='READY')?'READY':'PARTIAL',
      updatedAt:new Date(now).toISOString(),sources,
      events:events.sort((a,b)=>a.date.localeCompare(b.date)),
    };
    await store.writeOutput(key,body,now);
    return {status:body.status,providerRequests,refreshedSources:due,
      sources:Object.fromEntries(Object.entries(sources).map(([source,state])=>[source,state.status]))};
  }finally{
    await locks.finish(job,lease,now,'IDLE');
  }
}
