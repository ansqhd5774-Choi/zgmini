// W02: USDA-NASS exact published release dates. No inferred cadence,
// new scheduler, schema change, provider call on import or D1 publication.
// Attribution: USDA National Agricultural Statistics Service (USDA-NASS).
export const NASS_REPORT_SCHEDULE_URL='https://www.nass.usda.gov/publications/reports-by-release-day';
export const NASS_OFFICIAL_SOURCE_KEY='usda_nass';
export const NASS_SOURCE_SPEC=Object.freeze({
 url:NASS_REPORT_SCHEDULE_URL,page:NASS_REPORT_SCHEDULE_URL,format:'nass-report-dates'
});
const CATALOGUE=Object.freeze({
 'Crop Production':{id:'usda-nass-crop-production',title:'미국 작물 생산(Crop Production)'},
 'Crop Progress':{id:'usda-nass-crop-progress',title:'미국 작황 진행(Crop Progress)'},
 'Prospective Plantings':{id:'usda-nass-prospective-plantings',title:'미국 파종 의향(Prospective Plantings)'}
});
const clean=value=>value.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
 .replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const dateMs=value=>{
 if(typeof value!=='string'||!/^20\d\d-\d\d-\d\d$/.test(value))return null;
 const ms=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value?ms:null;
};
const BLOCK=/<div\b[^>]*\bclass=["'][^"']*\bnass-report-catalogue__report\b[^"']*["'][^>]*>([\s\S]*?)(?=<div\b[^>]*\bclass=["'][^"']*\bnass-report-catalogue__report\b|$)/gi;
const RELEASES=/<details\b[^>]*>[\s\S]*?<summary\b[^>]*>([\s\S]*?)<\/summary>[\s\S]*?<ul\b[^>]*\bclass=["'][^"']*\bnass-report-catalogue__dates\b[^"']*["'][^>]*>([\s\S]*?)<\/ul>[\s\S]*?<\/details>/gi;

/** Only official HTML time[datetime] dates are accepted. */
export function parseNassReportSchedule(html,{fromDate='2026-01-01'}={}){
 if(typeof html!=='string'||html.length<100||html.length>2*1024*1024||dateMs(fromDate)===null)
  throw Error('NASS_INPUT_INVALID');
 if(!html.includes('nass-report-catalogue__report')||!/National Agricultural Statistics Service|NASS/i.test(html))
  throw Error('NASS_CATALOGUE_IDENTITY_INVALID');
 const events=[],seen=new Set(),found=new Set();
 for(const section of html.matchAll(BLOCK)){
  const heading=section[1].match(/<h3\b[^>]*>\s*<a\b[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i);
  const report=heading?clean(heading[1]):'';
  const spec=Object.hasOwn(CATALOGUE,report)?CATALOGUE[report]:null;
  if(!spec)continue;
  if(found.has(report))throw Error('NASS_REPORT_SECTION_DUPLICATE');
  found.add(report);
  let releaseSections=0;
  for(const release of section[1].matchAll(RELEASES)){
   const summary=clean(release[1]);
   const match=/^(20\d\d) release dates for (.+)$/.exec(summary);
   if(!match||match[2]!==report)throw Error('NASS_REPORT_YEAR_HEADER_INVALID');
   const year=match[1];
   releaseSections++;
   let count=0;
   for(const time of release[2].matchAll(/<time\b[^>]*\bdatetime=["']([^"']+)["'][^>]*>/gi)){
    const date=time[1];
    if(dateMs(date)===null||!date.startsWith(year+'-'))throw Error('NASS_RELEASE_DATE_INVALID');
    count++;
    if(date<fromDate)continue;
    const key=spec.id+':'+date;
    if(seen.has(key))throw Error('NASS_RELEASE_DATE_DUPLICATE');
    seen.add(key);
    events.push({id:spec.id,date,title:spec.title,source:NASS_OFFICIAL_SOURCE_KEY,
     sourceUrl:NASS_REPORT_SCHEDULE_URL});
   }
   if(!count)throw Error('NASS_REPORT_YEAR_DATES_EMPTY');
  }
  if(!releaseSections)throw Error('NASS_REPORT_DATES_MISSING');
 }
 if(!found.has('Crop Production')||!events.some(e=>e.id==='usda-nass-crop-production'))
  throw Error('NASS_CROP_PRODUCTION_DATES_MISSING');
 if(events.length>500)throw Error('NASS_EVENT_LIMIT_EXCEEDED');
 return events.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}

/** Import only from the approved Core collector, which owns timing, locks,
 * source allowlist and publish. Read private SQLite input back before events. */
export async function collectNassReportSchedule({
 store,key,now,fetchImpl,countRequest=()=>{},previous
}={}){
 if(!store||typeof store.writeInput!=='function'||typeof store.readInput!=='function'||
  typeof key!=='string'||!key||!Number.isFinite(now)||
  typeof fetchImpl!=='function'||typeof countRequest!=='function')
  throw Error('NASS_COLLECTOR_INPUT_INVALID');
 countRequest();
 const response=await fetchImpl(NASS_REPORT_SCHEDULE_URL,{
  signal:AbortSignal.timeout(15000),redirect:'error',
  headers:{'user-agent':'ZGMINI/1.0 (+https://zgmini.kr/about/)' }
 });
 if(!response?.ok)throw Error('NASS_HTTP_'+(response?.status??'UNKNOWN'));
 if(response.redirected||(response.url&&response.url!==NASS_REPORT_SCHEDULE_URL))
  throw Error('NASS_REDIRECT_NOT_ALLOWED');
 if(!/^text\/html\b/i.test(response.headers?.get('content-type')??''))
  throw Error('NASS_CONTENT_TYPE_INVALID');
 const html=await response.text();
 const fromDate=String(new Date(now).getUTCFullYear()-1)+'-01-01';
 const official=parseNassReportSchedule(html,{fromDate});
 const inputKey=key+':usda_nass';
 await store.writeInput(inputKey,{text:html,sourceUrl:NASS_REPORT_SCHEDULE_URL},now);
 const saved=await store.readInput(inputKey);
 const observed=parseNassReportSchedule(saved?.body?.text,{fromDate});
 if(JSON.stringify(observed)!==JSON.stringify(official))throw Error('NASS_STORED_EVENTS_MISMATCH');
 const today=new Date(now).toISOString().slice(0,10);
 const years=new Set(observed.map(e=>e.date.slice(0,4)));
 const historic=(previous?.body?.events??[]).filter(e=>e.source===NASS_OFFICIAL_SOURCE_KEY&&
  (e.date<today||!years.has(e.date.slice(0,4))));
 const unique=new Map([...historic,...observed].map(e=>[e.id+':'+e.date,e]));
 return {events:[...unique.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)),
  state:{status:'READY',checkedAt:new Date(now).toISOString(),
   sourceUrl:NASS_REPORT_SCHEDULE_URL,coveredYears:[...years].sort()}};
}
