// R22 PC-only candidate: preserve R21 Census year fallback; add observed
// Federal Reserve monthly calendar rows under a separate fed_calendar key.
// No new scheduler, collection trigger, publisher, or DB schema.
import {RELEASE_CALENDAR_KEY,RELEASE_SOURCES,parseReleaseCalendar} from '../../lib/release-calendar.mjs';
import {publicFeedStore} from '../../worker/public-feed-store.mjs';
import {marketOperationalStore} from '../../worker/market-operational-store.mjs';

const requestHeaders={'user-agent':'ZGMINI/1.0 (+https://zgmini.kr/about/)'};
const isoYear=(date,year)=>date.startsWith(String(year)+'-');
const monthName=['january','february','march','april','may','june','july','august','september','october','november','december'];

async function fetchFedMonth({store,key,source,spec,month,now,fetchImpl,countRequest}){
 const [year,number]=month.split('-').map(Number);
 const url=spec.url.replace('{year}',String(year)).replace('{month}',monthName[number-1]);
 countRequest();
 const response=await fetchImpl(url,{signal:AbortSignal.timeout(15000),headers:requestHeaders});
 if(!response.ok)throw Error('CALENDAR_HTTP_'+response.status);
 const text=await response.text();
 if(!text||text.length>1000000)throw Error('CALENDAR_TOO_LARGE_OR_EMPTY');
 const options={yearMonth:month,sourceUrl:url};
 const observed=parseReleaseCalendar(text,source,options);
 if(!observed.length)throw Error('FED_MONTH_EVENTS_EMPTY');
 const inputKey=key+':'+source+':'+month;
 await store.writeInput(inputKey,{text,sourceUrl:url},now);
 const saved=await store.readInput(inputKey);
 const events=parseReleaseCalendar(saved.body.text,source,options);
 if(!events.length)throw Error('FED_MONTH_STORED_EVENTS_EMPTY');
 return events;
}

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
    if(source==='fed_calendar'){
     const available=[],missing=[],captured=[];
     // The rolling three-month request horizon must not erase previously
     // published observations when the calendar advances to a new month.
     const firstMonth=`${year}-${String(new Date(now).getUTCMonth()+1).padStart(2,'0')}`;
     captured.push(...(previous?.body?.events??[]).filter(e=>e.source===source&&e.date<firstMonth+'-01'));
     for(let offset=0;offset<3;offset++){
      const monthDate=new Date(Date.UTC(year,new Date(now).getUTCMonth()+offset,1));
      const month=`${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth()+1).padStart(2,'0')}`;
      try{
       captured.push(...await fetchFedMonth({store,key,source,spec,month,now,fetchImpl,countRequest:()=>requests++}));
       available.push(month);
      }catch{
       missing.push(month);
       // A transient failure of a single future month cannot erase earlier
       // approved observations for that same month.
       captured.push(...(previous?.body?.events??[]).filter(e=>e.source===source&&e.date.startsWith(month+'-')));
      }
     }
     if(!available.length)throw Error('FED_ALL_MONTHS_UNAVAILABLE');
     events.push(...new Map(captured.map(e=>[e.id+':'+e.date,e])).values());
     const current=`${year}-${String(new Date(now).getUTCMonth()+1).padStart(2,'0')}`;
     const ready=available.includes(current);
     sources[source]={status:ready?'READY':'PARTIAL',checkedAt:ready?new Date(now).toISOString():null,
      attemptedAt:new Date(now).toISOString(),sourceUrl:spec.page,coveredMonths:available,missingMonths:missing};
     continue;
    }
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
