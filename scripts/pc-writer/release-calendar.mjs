import {RELEASE_CALENDAR_KEY,RELEASE_SOURCES,parseReleaseCalendar} from '../../lib/release-calendar.mjs';
import {publicFeedStore} from '../../worker/public-feed-store.mjs';
import {marketOperationalStore} from '../../worker/market-operational-store.mjs';
// Uses the existing PC cycle, SQLite table, fetch quota wrapper and lease mechanism.
// No new scheduler, paid API, source secrets or remote collection.
export async function collectReleaseCalendar(db,{now=Date.now(),fetchImpl=fetch}={}){
 const store=publicFeedStore(db),locks=marketOperationalStore(db),key=RELEASE_CALENDAR_KEY;
 const attempt=await store.readAttempt(key);
 if(attempt&&now-attempt.storedAt>=0&&now-attempt.storedAt<6*3600000)return {status:'CACHED',providerRequests:0};
 const lease=await locks.claim('release-calendar',now);if(!lease)return {status:'RUNNING',providerRequests:0};
 let requests=0;
 try{
  await store.writeAttempt(key,now);
  const previous=await store.readOutput(key),sources={},events=[];
  for(const [source,spec] of Object.entries(RELEASE_SOURCES)){
   try{
    requests++;
    const url=spec.url.replace('{year}',String(new Date(now).getUTCFullYear()));
    const response=await fetchImpl(url,{signal:AbortSignal.timeout(15000),headers:{'user-agent':'ZGMINI/1.0 (+https://zgmini.kr/about/)'}});
    if(!response.ok)throw Error('CALENDAR_HTTP_'+response.status);
    const text=await response.text();if(text.length>1000000)throw Error('CALENDAR_TOO_LARGE');
    await store.writeInput(key+':'+source,{text,sourceUrl:url},now);
    const saved=await store.readInput(key+':'+source);
    const parsed=parseReleaseCalendar(saved.body.text,source);
    sources[source]={status:'READY',checkedAt:new Date(now).toISOString(),sourceUrl:spec.page};events.push(...parsed);
   }catch{
    sources[source]={status:'SOURCE_FAILED',checkedAt:previous?.body?.sources?.[source]?.checkedAt??null,attemptedAt:new Date(now).toISOString(),sourceUrl:spec.page};
    events.push(...(previous?.body?.events??[]).filter(e=>e.source===source));
   }
  }
  const body={status:Object.values(sources).every(s=>s.status==='READY')?'READY':'PARTIAL',updatedAt:new Date(now).toISOString(),sources,events:events.sort((a,b)=>a.date.localeCompare(b.date))};
  await store.writeOutput(key,body,now);
  return {status:body.status,providerRequests:requests,sources:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,v.status]))};
 }finally{await locks.finish('release-calendar',lease,now,'IDLE');}
}
