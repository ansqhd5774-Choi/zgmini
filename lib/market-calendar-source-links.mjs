// Source-to-release associations only. No calendar event, formula or stored feed
// is created here. Raw-series identity and model-input identity are distinct.
export const ECONOMIC_SOURCE_LINKS_REVISION='ECONOMIC-SOURCE-LINKS-R1';
export const SOURCE_ELIGIBILITY=Object.freeze([
 'OFFICIAL_RELEASE','CADENCE_POLICY','MARKET_DAILY','UNSCHEDULED','VARIABLE',
]);
export const INPUT_ORIGIN=Object.freeze(['RAW_SERIES','API_FIELD','DERIVED_SIGNAL']);

const allowedKinds=new Set(SOURCE_ELIGIBILITY);
const allowedOrigins=new Set(INPUT_ORIGIN);
const token=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:/\- ]{0,120}$/.test(x);
export const normalizeSourceKey=({provider,sourceId,geography='US'})=>{
 if(!token(provider)||!token(sourceId)||!token(geography))throw Error('SOURCE_KEY_INVALID');
 return JSON.stringify([provider.trim().toUpperCase(),sourceId.trim().toUpperCase(),geography.trim().toUpperCase()]);
};
const eventKey=({source,id,idPrefix})=>`${source}:${id??idPrefix+'*'}`;
const validAssociation=x=>x&&typeof x==='object'&&!Array.isArray(x)
 &&token(x.source)&&Boolean(token(x.id))!==Boolean(token(x.idPrefix))
 &&Object.keys(x).every(k=>['source','id','idPrefix'].includes(k));
const matches=(link,event)=>link.source===event.source&&
 (link.id?link.id===event.id:typeof event.id==='string'&&event.id.startsWith(link.idPrefix));

/** One row per area/indicator appearance. Duplicate source keys may belong to
 * multiple areas, but their publication semantics must not conflict. */
export function buildSourceLinkRegistry(rows,{releaseSources=null}={}){
 if(!Array.isArray(rows))throw Error('SOURCE_ROWS_REQUIRED');
 const map=new Map();
 for(const item of rows){
  if(!item||!token(item.area)||!allowedKinds.has(item.eligibility)||
   !allowedOrigins.has(item.origin))throw Error('SOURCE_ROW_CONTRACT_INVALID');
  const key=normalizeSourceKey(item);
  const links=item.officialLinks??[];
  if(!Array.isArray(links)||links.some(x=>!validAssociation(x)))throw Error('SOURCE_LINK_INVALID');
  if((item.eligibility==='OFFICIAL_RELEASE')!==Boolean(links.length))throw Error('SOURCE_LINK_ELIGIBILITY_MISMATCH');
  const uniqueLinks=[...new Map(links.map(x=>[eventKey(x),{source:x.source,...(x.id?{id:x.id}:{idPrefix:x.idPrefix})}])).values()]
   .sort((a,b)=>eventKey(a).localeCompare(eventKey(b)));
  if(releaseSources&&uniqueLinks.some(x=>!Object.hasOwn(releaseSources,x.source)))
   throw Error('SOURCE_RELEASE_PROVIDER_UNKNOWN');
  const previous=map.get(key);
  if(previous){
   if(previous.eligibility!==item.eligibility||previous.origin!==item.origin||
    JSON.stringify(previous.officialLinks)!==JSON.stringify(uniqueLinks))
    throw Error('SOURCE_DUPLICATE_SEMANTIC_CONFLICT');
   if(!previous.areas.includes(item.area))previous.areas.push(item.area);
  }else{
   map.set(key,{key,provider:item.provider.toUpperCase(),sourceId:item.sourceId.toUpperCase(),
    geography:(item.geography??'US').toUpperCase(),origin:item.origin,
    eligibility:item.eligibility,officialLinks:uniqueLinks,areas:[item.area]});
  }
 }
 const entries=[...map.values()].sort((a,b)=>a.key.localeCompare(b.key))
  .map(x=>Object.freeze({...x,areas:Object.freeze(x.areas.sort()),
   officialLinks:Object.freeze(x.officialLinks)}));
 const byEligibility=Object.fromEntries(SOURCE_ELIGIBILITY.map(k=>[k,entries.filter(x=>x.eligibility===k).length]));
 const byOrigin=Object.fromEntries(INPUT_ORIGIN.map(k=>[k,entries.filter(x=>x.origin===k).length]));
 return Object.freeze({revision:ECONOMIC_SOURCE_LINKS_REVISION,
  occurrenceCount:rows.length,uniqueInputCount:entries.length,
  duplicateOccurrences:rows.length-entries.length,byEligibility,byOrigin,
  entries:Object.freeze(entries)});
}

/** Returns counts only, without exposing the 283 individual input IDs.
 * A missing future event never becomes a synthetic official release date. */
export function describeOfficialCalendarCoverage(registry,calendar,{today=null}={}){
 if(!registry?.entries||!Array.isArray(calendar?.events))throw Error('SOURCE_CALENDAR_REQUIRED');
 const observed=calendar.events.filter(e=>e&&token(e.id)&&token(e.source)&&
  (!today||typeof e.date==='string'&&e.date>=today));
 const official=registry.entries.filter(x=>x.eligibility==='OFFICIAL_RELEASE');
 const mapped=official.filter(x=>x.officialLinks.some(link=>observed.some(event=>matches(link,event))));
 return Object.freeze({totalInputs:registry.uniqueInputCount,officialEligible:official.length,
  officialWithPublishedEvent:mapped.length,
  officialAwaitingPublishedEvent:official.length-mapped.length,
  nonOfficial:registry.uniqueInputCount-official.length,
  syntheticEventsCreated:0});
}
