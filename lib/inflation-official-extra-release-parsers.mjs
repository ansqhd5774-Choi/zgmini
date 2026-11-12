// Presentation-side event metadata is collected on the PC; this module only
// parses official, public release pages into calendar events. It never fetches.
// Keep these sources separate from the existing EIA weekly/energy calendar.
export const INFLATION_EXTRA_RELEASE_SOURCES=Object.freeze({
 eia_epm:Object.freeze({
  url:'https://www.eia.gov/electricity/monthly/index.php',
  page:'https://www.eia.gov/electricity/monthly/index.php',
  format:'html',
 }),
 nyfed:Object.freeze({
  page:'https://www.newyorkfed.org/research/calendars/nationalecon_cal',
  format:'monthly-html',
 }),
});

const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
const shortMonths=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const dateString=(year,month,day)=>{
 const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 const parsed=new Date(`${date}T00:00:00Z`);
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date?date:null;
};
const flattenHtml=html=>String(html)
 .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
 .replace(/<[^>]+>/g,' ')
 .replace(/&(?:nbsp|#160|#xA0);/gi,' ')
 .replace(/&amp;/gi,'&')
 .replace(/\s+/g,' ').trim();
const event=(id,date,title,source,sourceUrl)=>({id,date,title,source,sourceUrl});
const cancelledWords=/\b(?:cancelled|canceled|postponed)\b/i;
const struckAt=(html,index)=>{
 let depth=0;
 for(const tag of html.slice(0,index).matchAll(/<\/?(?:del|s)\b[^>]*>/gi))
  depth+=/^<\//.test(tag[0])?-1:1;
 return depth>0;
};

// Official EIA Electric Power Monthly page explicitly supplies its next date.
// The related STEO/weekly EIA release pages must NOT be used for electric rates.
export function parseEiaEpmNextRelease(html){
 const body=flattenHtml(html);
 if(!/\bElectric Power Monthly\b/i.test(body))throw Error('EIA_EPM_PAGE_INVALID');
 const match=body.match(/\bNext Release Date\s*:\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2})\b/i);
 if(!match)throw Error('EIA_EPM_NEXT_RELEASE_MISSING');
 const month=monthNames.findIndex(name=>name.toLowerCase()===match[1].toLowerCase())+1;
 const date=dateString(Number(match[3]),month,Number(match[2]));
 if(!date)throw Error('EIA_EPM_DATE_INVALID');
 return [event('eia-epm',date,'Electric Power Monthly','eia_epm',INFLATION_EXTRA_RELEASE_SOURCES.eia_epm.page)];
}

// The New York Fed's economic calendar has one day per table cell. Only exact
// linked event titles are accepted; other SCE surveys are NOT interchangeable.
export function parseNyfedInflationReleaseMonth(html,{year,month,sourceUrl}={}){
 if(!Number.isInteger(year)||year<2020||year>2099||!Number.isInteger(month)||month<1||month>12)throw Error('NYFED_MONTH_INVALID');
 const body=flattenHtml(html);
 const heading=`${monthNames[month-1]} ${year}`;
 // Require the actual month/year; visual previous/next controls may be reordered.
 const escaped=heading.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 if(!new RegExp(`\\b${escaped}\\b`,'i').test(body))throw Error('NYFED_MONTH_MISMATCH');
 const url=typeof sourceUrl==='string'&&/^https:\/\/www\.newyorkfed\.org\/research\/calendars\/i-[a-z]{3}\d{2}\.html$/.test(sourceUrl)?sourceUrl:INFLATION_EXTRA_RELEASE_SOURCES.nyfed.page;
 const events=[];
 let dayCells=0;
 for(const cell of String(html).matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)){
  const cellText=flattenHtml(cell[1]);
  const first=cellText.match(/^(0?[1-9]|[12]\d|3[01])\b/);
  if(!first)continue;
  const date=dateString(year,month,Number(first[1]));
  if(!date)continue;
  dayCells++;
  const links=[...cell[1].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)];
  for(const [i,link] of links.entries()){
   const rawTitle=flattenHtml(link[1]);
   const title=rawTitle.replace(/\s*[-–—]?\s*(?:cancelled|canceled|postponed)\b.*$/i,'').trim();
   const id=/^Global Supply Chain Pressure Index\s*\(GSCPI\)$/i.test(title)?'nyfed-gscpi':
    /^Survey of Consumer Expectations$/i.test(title)?'nyfed-sce':null;
   if(!id)continue;
   const trailing=cell[1].slice(link.index+link[0].length,links[i+1]?.index??cell[1].length);
   // Cancellation belongs to the individual event link, never every event in
   // the same day's cell (which may also have unrelated crossed-out reports).
   const cancelled=cancelledWords.test(rawTitle)||struckAt(cell[1],link.index)||
    /<\/?(?:del|s)\b/i.test(link[1])||
    /^\s*(?:[-–—:]\s*)?[\[(]?\s*(?:cancelled|canceled|postponed)\b/i.test(flattenHtml(trailing));
   if(!cancelled)events.push(event(id,date,title,'nyfed',url));
  }
 }
 if(!dayCells)throw Error('NYFED_CALENDAR_DAYS_MISSING');
 // A valid official calendar can have zero inflation events in a month.
 // This must not be confused with an unparseable source page.
 return [...new Map(events.map(e=>[e.id+':'+e.date,e])).values()].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}

// Read the current and next month, so a month's last release has a next date.
// Dates are derived from the official feed, never from this URL function.
export function nyfedInflationReleaseMonthUrls(now=Date.now()){
 const ts=now instanceof Date?now:new Date(now);
 if(!Number.isFinite(ts.getTime()))throw Error('NYFED_NOW_INVALID');
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
  timeZone:'America/New_York',year:'numeric',month:'2-digit',
 }).formatToParts(ts).filter(p=>p.type==='year'||p.type==='month').map(p=>[p.type,Number(p.value)]));
 return [0,1].map(offset=>{
  const m=new Date(Date.UTC(parts.year,parts.month-1+offset,1));
  const year=m.getUTCFullYear(),month=m.getUTCMonth()+1;
  return {year,month,url:`https://www.newyorkfed.org/research/calendars/i-${shortMonths[month-1]}${String(year).slice(-2)}.html`};
 });
}
