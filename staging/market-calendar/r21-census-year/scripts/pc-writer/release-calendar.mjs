// R21 PC-only candidate: year-aware Census calendar URLs with official fallback.
// No new scheduler, collection trigger, publisher, DB schema or provider.
import {RELEASE_CALENDAR_KEY,RELEASE_SOURCES,parseReleaseCalendar} from '../../lib/release-calendar.mjs';
import {publicFeedStore} from '../../worker/public-feed-store.mjs';
import {marketOperationalStore} from '../../worker/market-operational-store.mjs';

const requestHeaders={'user-agent':'ZGMINI/1.0 (+https://zgmini.kr/about/)'};
const isoYear=(date,year)=>date.startsWith(String(year)+'-');

// Keep the legacy current-year input key; next-year raw observations have their
// own key. An empty/incorrect-year HTML fallback must not overwrite valid input.
async function fetchCensusYear({store,key,source,spec,year,now,fetchImpl,countRequest}){
 const annual=spec.url.replace('{year}',String(year));
 const urls=[...new Set([annual,spec.page])];
 for(const url of urls){
  try{
   countRequest();
   const response=await fetchImpl(url,{signal:AbortSignal.timeout(15000),headers:requestHeaders});
   if(!response.ok)throw Error('CALENDAR_HTTP_'+response.status);
   const text=await response.text();
   if(text.length>1000000)throw Error('CALENDAR_TOO_LARGE');
   const candidates=parseReleaseCalendar(text,source).filter(event=>isoYear(event.date,year));
   if(!candidates.length)throw Error('CALENDAR_YEAR_EVENTS_EMPTY');
   const inputKey=year===new Date(now).getUTCFullYear()?key+':'+source:key+':'+source+':'+year;
   await store.writeInput(inputKey,{text,sourceUrl:url},now);
   const saved=await store.readInput(inputKey);
   const events=parseReleaseCalendar(saved.body.text,source).filter(event=>isoYear(event.date,year));
   if(!events.length)throw Error('CALENDAR_STORED_YEAR_EVENTS_EMPTY');
   return events;
  }catch{
   // Year-specific URLs may return HTTP 200 with a generic non-calendar page.
   // Only the official generic list is tried; no synthetic dates are emitted.
  }
 }
 throw Error('CENSUS_OFFICIAL_YEAR_UNAVAILABLE');
}

export async function collectReleaseCalendar(db,{now=Date.now(),fetchImpl=fetch}={}){
 const store=publicFeedStore(db),locks=marketOperationalStore(db),key=RELEASE_CALENDAR_KEY;
 const attempt=await store.readAttempt(key);
 if(attempt&&now-attempt.storedAt>=0&&now-attempt.storedAt<6*3600000)return {status:'CACHED',providerRequests:0};
 const lease=await locks.claim('release-calendar',now);
 if(!lease)return {status:'RUNNING',providerRequests:0};
 let requests=0;
 try{
  await store.writeAttempt(key,now);
  const previous=await store.readOutput(key),sources={},events=[];
  const year=new Date(now).getUTCFullYear();
  for(const [source,spec] of Object.entries(RELEASE_SOURCES)){
   try{
    if(source==='census'){
     const current=await fetchCensusYear({store,key,source,spec,year,now,fetchImpl,countRequest:()=>requests++});
     let following=[];
     try{
      following=await fetchCensusYear({store,key,source,spec,year:year+1,now,fetchImpl,countRequest:()=>requests++});
     }catch{
      // Next-year publication is optional. Current-year success stays READY.
     }
     const unique=[...new Map([...current,...following].map(e=>[e.id+':'+e.date,e])).values()];
     events.push(...unique);
     sources[source]={status:'READY',checkedAt:new Date(now).toISOString(),sourceUrl:spec.page,
      coveredYears:following.length?[year,year+1]:[year]};
     continue;
    }
    // BLS, BEA and Fed remain the installed R20 collection path unchanged.
    requests++;
    const url=spec.url.replace('{year}',String(year));
    const response=await fetchImpl(url,{signal:AbortSignal.timeout(15000),headers:requestHeaders});
    if(!response.ok)throw Error('CALENDAR_HTTP_'+response.status);
    const text=await response.text();if(text.length>1000000)throw Error('CALENDAR_TOO_LARGE');
    await store.writeInput(key+':'+source,{text,sourceUrl:url},now);
    const saved=await store.readInput(key+':'+source);
    const parsed=parseReleaseCalendar(saved.body.text,source);
    sources[source]={status:'READY',checkedAt:new Date(now).toISOString(),sourceUrl:spec.page};events.push(...parsed);
   }catch{
    sources[source]={status:'SOURCE_FAILED',checkedAt:previous?.body?.sources?.[source]?.checkedAt??null,
     attemptedAt:new Date(now).toISOString(),sourceUrl:spec.page};
    events.push(...(previous?.body?.events??[]).filter(e=>e.source===source));
   }
  }
  const body={status:Object.values(sources).every(s=>s.status==='READY')?'READY':'PARTIAL',
   updatedAt:new Date(now).toISOString(),sources,events:events.sort((a,b)=>a.date.localeCompare(b.date))};
  await store.writeOutput(key,body,now);
  return {status:body.status,providerRequests:requests,
   sources:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,v.status]))};
 }finally{await locks.finish('release-calendar',lease,now,'IDLE');}
}
