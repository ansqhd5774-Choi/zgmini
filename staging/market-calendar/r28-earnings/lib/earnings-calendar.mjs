// R28 prospective issuer-IR adapter. No provider is authorized by default.
// An issuer must have documented permission for collection, local storage,
// commercial use and public republication before it enters EARNINGS_SOURCES.
export const EARNINGS_SOURCES=Object.freeze([]);

const validDay=value=>typeof value==='string'&&/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)&&
 new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;
const httpsUrl=value=>{
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&
  !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[|.*\.local$)/i.test(url.hostname)?url:null;}
 catch{return null;}
};
const issuerKey=spec=>spec.cik?`cik${spec.cik.padStart(10,'0')}`:spec.ticker.toLowerCase();
const quarterFor=text=>{
 const a=text.match(/\bQ([1-4])\s*(?:FY\s*)?(20\d{2})\b/i);
 const b=text.match(/\b(?:FY\s*)?(20\d{2})\s*Q([1-4])\b/i);
 if(a)return {quarter:Number(a[1]),fiscalYear:Number(a[2])};
 if(b)return {quarter:Number(b[2]),fiscalYear:Number(b[1])};
 return null;
};
const kindFor=title=>{
 if(/\b(?:earnings|results|financial)(?:\s+conference)?\s+call\b|\bconference\s+call\b|\bearnings\s+webcast\b/i.test(title))return 'call';
 if(/\bearnings\b|\bfinancial\s+results\b|\bquarterly\s+results\b/i.test(title))return 'release';
 return null;
};
const unescapeIcs=value=>value.replace(/\\[nN]/g,' ').replace(/\\([,;\\])/g,'$1').trim();

export function validateEarningsSource(spec){
 if(!spec||typeof spec!=='object'||!httpsUrl(spec.url)||!httpsUrl(spec.page)||
  !['ics','json','rss'].includes(spec.format)||!/^([A-Z][A-Z0-9.\-]{0,9})$/.test(spec.ticker??'')||
  (spec.cik!==undefined&&!/^\d{1,10}$/.test(spec.cik))||
  typeof spec.company!=='string'||!spec.company.trim()||spec.company.length>100||
  !['America/New_York','America/Los_Angeles','America/Chicago','America/Denver'].includes(spec.timeZone)||
  !spec.rights||Object.values({automatedFetch:spec.rights.automatedFetch,storage:spec.rights.storage,
   commercialUse:spec.rights.commercialUse,redistribution:spec.rights.redistribution}).some(v=>v!==true)||
  !httpsUrl(spec.rights.evidenceUrl)||!validDay(spec.rights.reviewedAt)||
  typeof spec.rights.evidenceNote!=='string'||spec.rights.evidenceNote.trim().length<16)
  throw Error('EARNINGS_SOURCE_NOT_APPROVED');
 return spec;
}

const parseIcsDay=(raw,params,spec)=>{
 if(!/^\d{8}(?:T\d{6}Z?)?$/.test(raw))throw Error('EARNINGS_ICS_DATE_INVALID');
 const day=`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
 if(!validDay(day))throw Error('EARNINGS_ICS_DATE_INVALID');
 if(!raw.includes('T'))return day;
 const tzid=params.match(/(?:^|;)TZID=([^;:]+)/i)?.[1];
 if(tzid&&tzid!==spec.timeZone)throw Error('EARNINGS_ICS_TIMEZONE_CHANGED');
 if(!tzid&&!raw.endsWith('Z'))throw Error('EARNINGS_ICS_TIMEZONE_MISSING');
 if(raw.endsWith('Z')){
  const instant=new Date(`${day}T${raw.slice(9,11)}:${raw.slice(11,13)}:${raw.slice(13,15)}Z`);
  if(Number.isNaN(instant.getTime()))throw Error('EARNINGS_ICS_DATE_INVALID');
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:spec.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(instant);
  const part=key=>parts.find(x=>x.type===key)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
 }
 return day;
};

const xmlText=value=>value?.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/,'$1')
 .replace(/&(?:amp|lt|gt|quot|apos);/g,entity=>({
  '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"})[entity]).trim()??'';
const xmlField=(block,name)=>{
 const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return xmlText(block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`,'i'))?.[1]);
};
const rssDay=(value,spec)=>{
 if(!value)return null;
 if(validDay(value))return value;
 // Offset-qualified ISO instants only. Publication dates are never used.
 if(!/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value))
  throw Error('EARNINGS_RSS_EVENT_DATE_UNQUALIFIED');
 const stamp=new Date(value);
 if(Number.isNaN(stamp.getTime()))throw Error('EARNINGS_RSS_EVENT_DATE_INVALID');
 const fields=new Intl.DateTimeFormat('en-US',{timeZone:spec.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(stamp);
 const part=type=>fields.find(x=>x.type===type)?.value;
 const date=`${part('year')}-${part('month')}-${part('day')}`;
 if(!validDay(date))throw Error('EARNINGS_RSS_EVENT_DATE_INVALID');
 return date;
};

function normalizedRecord({date,title,kind,period,status,sourceUrl},spec){
 if(!validDay(date)||!kind||!period||!Number.isInteger(period.quarter)||period.quarter<1||period.quarter>4||
  !Number.isInteger(period.fiscalYear)||period.fiscalYear<2000||period.fiscalYear>2100)
  throw Error('EARNINGS_EVENT_CONTRACT_INVALID');
 if(!['confirmed','cancelled'].includes(status))return null;
 const id=`earnings-${kind}-${issuerKey(spec)}-${period.fiscalYear}-q${period.quarter}`;
 const page=httpsUrl(sourceUrl);
 if(page&&page.hostname!==new URL(spec.page).hostname)throw Error('EARNINGS_EVENT_URL_OUTSIDE_ISSUER');
 return {id,date,title:`${spec.company} · FY${period.fiscalYear} Q${period.quarter} ${kind==='release'?'실적 발표':'실적 설명회'}`,
  source:'earnings',sourceUrl:page?.href??spec.page,status};
}

export function parseIssuerEarnings(text,sourceSpec){
 const spec=validateEarningsSource(sourceSpec);
 if(typeof text!=='string'||!text.length||text.length>1000000)throw Error('EARNINGS_INPUT_SIZE_INVALID');
 const rows=[];
 if(spec.format==='json'){
  let data;try{data=JSON.parse(text);}catch{throw Error('EARNINGS_JSON_INVALID');}
  if(!data||!Array.isArray(data.events)||data.events.length>500)throw Error('EARNINGS_JSON_CONTRACT_INVALID');
  for(const entry of data.events){
   if(!entry||typeof entry.title!=='string'||entry.title.length>300)throw Error('EARNINGS_JSON_EVENT_INVALID');
   const kind=entry.kind==='earnings_release'?'release':entry.kind==='earnings_call'?'call':null;
   if(!kind)continue;
   const period={fiscalYear:entry.fiscalYear,quarter:entry.quarter};
   rows.push(normalizedRecord({date:entry.date,title:entry.title,kind,period,
    status:entry.status==='cancelled'?'cancelled':entry.status==='confirmed'?'confirmed':'unconfirmed',sourceUrl:entry.sourceUrl},spec));
  }
 }else if(spec.format==='rss'){
  if(!/<rss(?:\s|>)/i.test(text)||!/<channel(?:\s|>)/i.test(text)||!/<\/rss>/i.test(text))
   throw Error('EARNINGS_RSS_INVALID');
  const items=[...text.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)];
  if(items.length>500)throw Error('EARNINGS_RSS_EVENTS_LIMIT');
  for(const [,item] of items){
   const title=xmlField(item,'title');
   if(title.length>300)throw Error('EARNINGS_RSS_TITLE_INVALID');
   const kind=kindFor(title),period=quarterFor(title);
   if(!kind||!period)continue;
   // RSS pubDate is when the notice was published, not the earnings event.
   // Require a separately named, machine-readable event start field.
   const rawDate=xmlField(item,'eventStartDate')||xmlField(item,'event:startDate')||
    xmlField(item,'eventDate');
   if(!rawDate)continue;
   const status=(xmlField(item,'eventStatus')||xmlField(item,'status')||'confirmed').toLowerCase();
   if(!['confirmed','cancelled'].includes(status))continue;
   const date=rssDay(rawDate,spec);
   rows.push(normalizedRecord({date,title,kind,period,status,sourceUrl:xmlField(item,'link')||undefined},spec));
  }
 }else{
  if(!text.includes('BEGIN:VCALENDAR')||!text.includes('END:VCALENDAR'))throw Error('EARNINGS_ICS_INVALID');
  const unfolded=text.replace(/\r?\n[ \t]/g,'').replace(/\r/g,'');
  const blocks=unfolded.split('BEGIN:VEVENT').slice(1);
  if(blocks.length>500)throw Error('EARNINGS_ICS_EVENTS_LIMIT');
  for(const block of blocks){
   if(!block.includes('END:VEVENT'))throw Error('EARNINGS_ICS_INVALID');
   const title=unescapeIcs(block.match(/(?:^|\n)SUMMARY:(.*)/)?.[1]??'');
   if(title.length>300)throw Error('EARNINGS_ICS_TITLE_INVALID');
   const kind=kindFor(title),period=quarterFor(title);
   if(!kind||!period)continue;
   const start=block.match(/(?:^|\n)DTSTART([^:\n]*):(\S+)/);
   if(!start)throw Error('EARNINGS_ICS_START_MISSING');
   const date=parseIcsDay(start[2],start[1],spec);
   const status=block.match(/(?:^|\n)STATUS:([^\n]+)/)?.[1]?.trim().toUpperCase();
   const link=block.match(/(?:^|\n)URL:(https:\/\/\S+)/)?.[1];
   rows.push(normalizedRecord({date,title,kind,period,status:status==='CANCELLED'?'cancelled':status==='TENTATIVE'?'unconfirmed':'confirmed',sourceUrl:link},spec));
  }
 }
 const events=[],cancelledIds=new Set(),seen=new Map();
 for(const entry of rows.filter(Boolean)){
  if(entry.status==='cancelled'){cancelledIds.add(entry.id);continue;}
  const prior=seen.get(entry.id);
  if(prior&&prior.date!==entry.date)throw Error('EARNINGS_CONFLICTING_CONFIRMED_DATES');
  seen.set(entry.id,entry);
 }
 for(const [id,row] of seen)if(!cancelledIds.has(id)){
  const {status,...publicRecord}=row;
  events.push(publicRecord);
 }
 return {events:events.sort((a,b)=>a.date.localeCompare(b.date)),cancelledIds:[...cancelledIds]};
}
