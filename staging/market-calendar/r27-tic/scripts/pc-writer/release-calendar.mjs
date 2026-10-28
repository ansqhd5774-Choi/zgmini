// R27 PC-only candidate: preserve installed R26, add independent TIC events.
// No new scheduler, collection trigger, publisher, or DB schema.
import {RELEASE_CALENDAR_KEY,RELEASE_SOURCES,parseReleaseCalendar} from '../../lib/release-calendar.mjs';
import {EIA_SOURCE_URLS,parseEiaScheduleHtml,parseEiaWpsrCalendarJson} from '../../lib/eia-calendar.mjs';
import {USDA_WASDE_URL,parseUsdaWasdeHtml} from '../../lib/usda-calendar.mjs';
import {CFTC_COT_URL,parseCftcCotHtml} from '../../lib/cftc-calendar.mjs';
import {TREASURY_CUSIP_XML_URL,parseTreasuryCusipXml} from '../../lib/treasury-calendar.mjs';
import {TIC_RELEASE_DATES_URL,parseTicReleaseDatesHtml} from '../../lib/tic-calendar.mjs';
import {publicFeedStore} from '../../worker/public-feed-store.mjs';
import {marketOperationalStore} from '../../worker/market-operational-store.mjs';

const requestHeaders={'user-agent':'ZGMINI/1.0 (+https://zgmini.kr/about/)'};
const isoYear=(date,year)=>date.startsWith(String(year)+'-');
const monthName=['january','february','march','april','may','june','july','august','september','october','november','december'];

async function fetchEiaPart({store,key,kind,now,fetchImpl,countRequest}){
 const url=EIA_SOURCE_URLS[kind];
 if(!url)throw Error('EIA_KIND_UNSUPPORTED');
 countRequest();
 const response=await fetchImpl(url,{signal:AbortSignal.timeout(15000),headers:requestHeaders});
 if(!response.ok)throw Error('EIA_HTTP_'+response.status);
 if(response.url&&response.url!==url)throw Error('EIA_REDIRECT_NOT_ALLOWED');
 const input=await response.text();
 if(!input||input.length>1000000)throw Error('EIA_SOURCE_TOO_LARGE_OR_EMPTY');
 const parse=text=>kind==='wpsr-json'?parseEiaWpsrCalendarJson(text):
  parseEiaScheduleHtml(text,kind,{fromDate:'2025-01-01'});
 if(!parse(input).length)throw Error('EIA_NO_OFFICIAL_DATES');
 const inputKey=key+':eia:'+kind;
 await store.writeInput(inputKey,{text:input,sourceUrl:url},now);
 const stored=await store.readInput(inputKey);
 const observed=parse(stored.body.text);
 if(!observed.length)throw Error('EIA_STORED_DATES_EMPTY');
 return observed;
}

async function collectEiaSource({store,key,now,fetchImpl,countRequest,previous}){
 const required=[['wpsr-json','eia-wpsr'],['wngsr-schedule','eia-wngsr'],['steo-schedule','eia-steo']];
 const fallback={'wpsr-json':'wpsr-schedule','steo-schedule':'steo-next'};
 const covered=[],missing=[],all=[];
 const today=new Date(now).toISOString().slice(0,10);
 for(const [kind,id] of required){
  let live=[],ok=false;
  try{
   live=await fetchEiaPart({store,key,kind,now,fetchImpl,countRequest});
   covered.push(kind);ok=true;
  }catch{
   missing.push(kind);
   if(fallback[kind]){
    try{live=await fetchEiaPart({store,key,kind:fallback[kind],now,fetchImpl,countRequest});}
    catch{ /* The current official fallback is optional, never synthetic. */ }
   }
  }
  const historic=(previous?.body?.events??[]).filter(e=>e.source==='eia'&&e.id===id&&(ok?e.date<today:true));
  // On failure, keep earlier future observations and merge any official
  // exception/next-release fallback; on success, latest official data wins.
  const combined=[...historic,...live];
  all.push(...new Map(combined.map(e=>[e.id+':'+e.date,e])).values());
 }
 const status=covered.length===required.length?'READY':covered.length?'PARTIAL':'SOURCE_FAILED';
 return {events:all,state:{status,checkedAt:status==='READY'?new Date(now).toISOString():
   previous?.body?.sources?.eia?.checkedAt??null,
  attemptedAt:new Date(now).toISOString(),sourceUrl:RELEASE_SOURCES.eia.page,
  coveredParts:covered,missingParts:missing}};
}

async function collectUsdaSource({store,key,now,fetchImpl,countRequest,previous}){
 const url=USDA_WASDE_URL;
 countRequest();
 const response=await fetchImpl(url,{signal:AbortSignal.timeout(15000),headers:requestHeaders});
 if(!response.ok)throw Error('USDA_HTTP_'+response.status);
 if(response.url&&response.url!==url)throw Error('USDA_REDIRECT_NOT_ALLOWED');
 const html=await response.text();
 if(!html||html.length>1000000)throw Error('USDA_SOURCE_TOO_LARGE_OR_EMPTY');
 const official=parseUsdaWasdeHtml(html,{fromDate:'2025-01-01'});
 if(!official.length)throw Error('USDA_DATES_UNAVAILABLE');
 const inputKey=key+':usda';
 await store.writeInput(inputKey,{text:html,sourceUrl:url},now);
 const stored=await store.readInput(inputKey);
 const observed=parseUsdaWasdeHtml(stored.body.text,{fromDate:'2025-01-01'});
 if(!observed.length)throw Error('USDA_STORED_DATES_UNAVAILABLE');
 const nowDay=new Date(now).toISOString().slice(0,10);
 const coveredYears=new Set(observed.map(e=>e.date.slice(0,4)));
 const preserved=(previous?.body?.events??[]).filter(e=>e.source==='usda'&&
  (e.date<nowDay||!coveredYears.has(e.date.slice(0,4))));
 const events=[...new Map([...preserved,...observed].map(e=>[e.id+':'+e.date,e])).values()];
 return {events,state:{status:'READY',checkedAt:new Date(now).toISOString(),sourceUrl:url,
  coveredYears:[...coveredYears].sort()}};
}

async function collectCftcSource({store,key,now,fetchImpl,countRequest,previous}){
 const url=CFTC_COT_URL;
 countRequest();
 const response=await fetchImpl(url,{signal:AbortSignal.timeout(15000),headers:requestHeaders});
 if(!response.ok)throw Error('CFTC_HTTP_'+response.status);
 if(response.url&&response.url!==url)throw Error('CFTC_REDIRECT_NOT_ALLOWED');
 const html=await response.text();
 if(!html||html.length>2*1024*1024)throw Error('CFTC_SOURCE_TOO_LARGE_OR_EMPTY');
 const official=parseCftcCotHtml(html,{fromDate:'2025-01-01'});
 if(!official.length)throw Error('CFTC_DATES_UNAVAILABLE');
 const inputKey=key+':cftc';
 await store.writeInput(inputKey,{text:html,sourceUrl:url},now);
 const saved=await store.readInput(inputKey);
 const observed=parseCftcCotHtml(saved.body.text,{fromDate:'2025-01-01'});
 if(!observed.length)throw Error('CFTC_STORED_DATES_UNAVAILABLE');
 const nowDay=new Date(now).toISOString().slice(0,10);
 const coveredYears=new Set(observed.map(e=>e.date.slice(0,4)));
 const preserved=(previous?.body?.events??[]).filter(e=>e.source==='cftc'&&
  (e.date<nowDay||!coveredYears.has(e.date.slice(0,4))));
 const events=[...new Map([...preserved,...observed].map(e=>[e.id+':'+e.date,e])).values()];
 return {events,state:{status:'READY',checkedAt:new Date(now).toISOString(),sourceUrl:url,
  coveredYears:[...coveredYears].sort()}};
}

async function collectTreasurySource({store,key,now,fetchImpl,countRequest,previous}){
 const url=TREASURY_CUSIP_XML_URL;
 countRequest();
 const response=await fetchImpl(url,{signal:AbortSignal.timeout(15000),headers:requestHeaders});
 if(!response.ok)throw Error('TREASURY_HTTP_'+response.status);
 if(response.url&&response.url!==url)throw Error('TREASURY_REDIRECT_NOT_ALLOWED');
 const xml=await response.text();
 if(!xml||xml.length>3*1024*1024)throw Error('TREASURY_XML_TOO_LARGE_OR_EMPTY');
 const official=parseTreasuryCusipXml(xml,{fromDate:'2025-01-01'});
 if(!official.length)throw Error('TREASURY_DATES_UNAVAILABLE');
 const inputKey=key+':treasury';
 await store.writeInput(inputKey,{text:xml,sourceUrl:url},now);
 const saved=await store.readInput(inputKey);
 const observed=parseTreasuryCusipXml(saved.body.text,{fromDate:'2025-01-01'});
 if(!observed.length)throw Error('TREASURY_STORED_DATES_UNAVAILABLE');
 const today=new Date(now).toISOString().slice(0,10);
 const observedIds=new Set(observed.map(e=>e.id));
 // This is a rotating weekly release: older still-upcoming auctions may no
 // longer appear in the current batch, and must not vanish from the calendar.
 // Same CUSIP+kind in the new batch supersedes its prior future date.
 const older=(previous?.body?.events??[]).filter(e=>e.source==='treasury'&&
  (e.date<today||!observedIds.has(e.id)));
 const events=[...new Map([...older,...observed].map(e=>[e.id+':'+e.date,e])).values()];
 return {events,state:{status:'READY',checkedAt:new Date(now).toISOString(),
  sourceUrl:RELEASE_SOURCES.treasury.page,coveredCusips:[...new Set(observed.map(e=>e.id.split('-').at(-1)))].length}};
}

async function collectTicSource({store,key,now,fetchImpl,countRequest,previous}){
 const url=TIC_RELEASE_DATES_URL;
 countRequest();
 const response=await fetchImpl(url,{signal:AbortSignal.timeout(15000),redirect:'error',headers:requestHeaders});
 if(!response.ok)throw Error('TIC_HTTP_'+response.status);
 if(response.url&&response.url!==url)throw Error('TIC_REDIRECT_NOT_ALLOWED');
 if(!/^text\/html\b/i.test(response.headers?.get('content-type')??''))throw Error('TIC_CONTENT_TYPE_INVALID');
 const html=await response.text();
 if(!html||html.length>3*1024*1024)throw Error('TIC_HTML_TOO_LARGE_OR_EMPTY');
 const official=parseTicReleaseDatesHtml(html,{fromDate:'2025-01-01'});
 if(!official.length)throw Error('TIC_DATES_UNAVAILABLE');
 const inputKey=key+':tic';
 await store.writeInput(inputKey,{text:html,sourceUrl:url},now);
 const saved=await store.readInput(inputKey);
 const observed=parseTicReleaseDatesHtml(saved.body.text,{fromDate:'2025-01-01'});
 if(!observed.length)throw Error('TIC_STORED_DATES_UNAVAILABLE');
 const today=new Date(now).toISOString().slice(0,10);
 const observedIds=new Set(observed.map(e=>e.id));
 const coveredYears=new Set(observed.map(e=>e.id.match(/-20\d\d-\d\d$/)?.[0].slice(1,5)));
 const older=(previous?.body?.events??[]).filter(e=>e.source==='tic'&&
  (e.date<today||(!observedIds.has(e.id)&&!coveredYears.has(e.date.slice(0,4)))));
 const events=[...new Map([...older,...observed].map(e=>[e.id+':'+e.date,e])).values()];
 return {events,state:{status:'READY',checkedAt:new Date(now).toISOString(),sourceUrl:url,
  coveredYears:[...coveredYears].sort(),eventCount:observed.length}};
}

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
    if(source==='eia'){
     const eia=await collectEiaSource({store,key,now,fetchImpl,countRequest:()=>requests++,previous});
     sources.eia=eia.state;
     events.push(...eia.events);
     continue;
    }
    if(source==='usda'){
     const usda=await collectUsdaSource({store,key,now,fetchImpl,countRequest:()=>requests++,previous});
     sources.usda=usda.state;
     events.push(...usda.events);
     continue;
    }
    if(source==='cftc'){
     const cftc=await collectCftcSource({store,key,now,fetchImpl,countRequest:()=>requests++,previous});
     sources.cftc=cftc.state;
     events.push(...cftc.events);
     continue;
    }
    if(source==='treasury'){
     const treasury=await collectTreasurySource({store,key,now,fetchImpl,countRequest:()=>requests++,previous});
     sources.treasury=treasury.state;
     events.push(...treasury.events);
     continue;
    }
    if(source==='tic'){
     const tic=await collectTicSource({store,key,now,fetchImpl,countRequest:()=>requests++,previous});
     sources.tic=tic.state;
     events.push(...tic.events);
     continue;
    }
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
