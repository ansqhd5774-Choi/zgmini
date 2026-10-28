// R23 inert stage. Parse dates explicitly printed on official EIA pages.
// No cadence-based future date prediction. Existing 5-field contract only.
export const EIA_SOURCE_URLS=Object.freeze({
 'wpsr-json':'https://www.eia.gov/petroleum/supply/weekly/includes/wpsr-calendar.json',
 'wpsr-schedule':'https://www.eia.gov/petroleum/supply/weekly/schedule.php',
 'wngsr-schedule':'https://ir.eia.gov/ngs/schedule.html',
 'steo-schedule':'https://www.eia.gov/outlooks/steo/release_schedule.php',
 'steo-next':'https://www.eia.gov/outlooks/steo/',
});
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const dateValid=s=>/^20\d\d-\d\d-\d\d$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const text=s=>s.replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|#160);/gi,' ').replace(/&(?:rsquo|#8217);/gi,"'")
 .replace(/\s+/g,' ').trim();
const dateWords=s=>{
 const m=text(s).match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d\d)\b/);
 if(!m)return null;
 const iso=`${m[3]}-${String(months.indexOf(m[1])+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`;
 return dateValid(iso)?iso:null;
};
const dateSlash=s=>{
 const m=text(s).match(/^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(20\d\d)\b/);
 if(!m)return null;
 const iso=`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
 return dateValid(iso)?iso:null;
};
const getTable=(html,className)=>{
 const pattern=new RegExp(`<table\\b(?=[^>]*\\bclass=["'][^"']*\\b${className}\\b)[^>]*>[\\s\\S]*?<\\/table>`,'i');
 return html.match(pattern)?.[0]??null;
};
const cells=row=>[...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>text(m[1]));
const candidateRows=table=>[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>cells(m[1]));
const event=(id,date,title,sourceUrl)=>({id,date,title,source:'eia',sourceUrl});
const dedupe=arr=>[...new Map(arr.map(e=>[e.id+':'+e.date,e])).values()].sort((a,b)=>a.date.localeCompare(b.date));

// The official WPSR page loads this JSON in its own front-end. Actual PC
// capture: 110 release rows, 2026-01 to 2028-01. Five historical ad-hoc
// repost rows use non-standard times (13:00, 13:50, 14:45, 15:10, 15:45).
// A market schedule must not mistake these reposts for regular weeklies.
export function parseEiaWpsrCalendarJson(input,{fromDate='2026-01-01'}={}){
 if(!dateValid(fromDate))throw Error('EIA_INPUT_INVALID');
 let calendar;
 try{calendar=typeof input==='string'?JSON.parse(input):input;}catch{throw Error('EIA_WPSR_JSON_INVALID');}
 if(!Array.isArray(calendar)||calendar.length<1||calendar.length>1000)throw Error('EIA_WPSR_JSON_SHAPE_INVALID');
 const results=[],seen=new Set();
 for(const row of calendar){
  if(!row||typeof row!=='object'||!dateValid(row.release_date)||!dateValid(row.data_for_date)||
   typeof row.holiday_delayed!=='boolean'||typeof row.release_time!=='string')continue;
  // Conservative canonical-report filter, not a claim that an ad-hoc posting
  // is fictitious. Other times belong to a separate publication history.
  if(row.release_time!=='10:30'&&row.release_time!=='12:00')continue;
  if(row.release_date<fromDate||seen.has(row.release_date))continue;
  if(Date.parse(row.data_for_date+'T00:00:00Z')>Date.parse(row.release_date+'T00:00:00Z'))continue;
  seen.add(row.release_date);
  const holiday=row.holiday_delayed===true?' · 휴일 조정':'';
  results.push(event('eia-wpsr',row.release_date,
   `미국 주간 석유재고(WPSR)${holiday} · ET ${row.release_time}`,EIA_SOURCE_URLS['wpsr-json']));
 }
 if(!results.length)throw Error('EIA_WPSR_CANONICAL_DATES_EMPTY');
 return dedupe(results);
}

export function parseEiaScheduleHtml(html,kind,{fromDate='2026-01-01'}={}){
 if(typeof html!=='string'||html.length<100||!dateValid(fromDate))throw Error('EIA_INPUT_INVALID');
 if(!(kind in EIA_SOURCE_URLS))throw Error('EIA_KIND_INVALID');
 const results=[],sourceUrl=EIA_SOURCE_URLS[kind];
 if(kind==='wpsr-schedule'){
  if(!/Weekly Petroleum Status Report Schedule/i.test(html))throw Error('EIA_WPSR_IDENTITY_INVALID');
  const table=getTable(html,'schedule');
  if(!table||!/Alternate release date/i.test(table))throw Error('EIA_WPSR_TABLE_MISSING');
  for(const parts of candidateRows(table)){
   if(parts.length!==5)continue;
   const date=dateWords(parts[1]);
   if(!date||date<fromDate||!/^(Monday|Tuesday|Wednesday|Thursday|Friday)$/i.test(parts[2]))continue;
   if(!/^\d{1,2}:\d{2}\s*[ap]\.m\.$/i.test(parts[3]))continue;
   results.push(event('eia-wpsr',date,`미국 주간 석유재고(WPSR) · 휴일 변경 · ET ${parts[3]}`,sourceUrl));
  }
 }else if(kind==='wngsr-schedule'){
  if(!/Holiday Release Schedule/i.test(html)||!/Natural Gas/i.test(html))throw Error('EIA_WNGSR_IDENTITY_INVALID');
  const table=getTable(html,'simpletable');
  if(!table||!/Alternate release date/i.test(table))throw Error('EIA_WNGSR_TABLE_MISSING');
  for(const parts of candidateRows(table)){
   if(parts.length!==4)continue;
   const date=dateWords(parts[0]);
   if(!date||date<fromDate||!/^(Monday|Tuesday|Wednesday|Thursday|Friday)$/i.test(parts[1]))continue;
   if(!/^\d{1,2}:\d{2}\s*[ap]\.m\.$/i.test(parts[2]))continue;
   results.push(event('eia-wngsr',date,`미국 천연가스 저장량(WNGSR) · 휴일 변경 · ET ${parts[2]}`,sourceUrl));
  }
 }else if(kind==='steo-schedule'){
  if(!/Short-Term Energy Outlook/i.test(html)||!/<h1[^>]*>\s*Schedule\s*<\/h1>/i.test(html))throw Error('EIA_STEO_IDENTITY_INVALID');
  const table=getTable(html,'zebra');
  if(!table||!/Release date/i.test(table))throw Error('EIA_STEO_TABLE_MISSING');
  for(const parts of candidateRows(table)){
   if(parts.length!==3)continue;
   const date=dateSlash(parts[1]);
   if(!date||date<fromDate||!months.some(month=>parts[0]===`${month} ${date.slice(0,4)}`))continue;
   if(Number(date.slice(5,7))!==months.indexOf(parts[0].split(' ')[0])+1)continue;
   results.push(event('eia-steo',date,`미국 단기 에너지 전망(STEO)${/Winter Fuels Outlook/i.test(parts[2])?' · 겨울 연료 전망 포함':''}`,sourceUrl));
  }
 }else{
  if(!/Short-Term Energy Outlook/i.test(html))throw Error('EIA_STEO_IDENTITY_INVALID');
  const m=html.match(/<strong>\s*Next Release Date:\s*<\/strong>\s*([A-Z][a-z]+\s+\d{1,2},\s*20\d\d)/i);
  const date=m?dateWords(m[1]):null;
  if(date&&date>=fromDate)results.push(event('eia-steo',date,'미국 단기 에너지 전망(STEO)',sourceUrl));
 }
 if(!results.length)throw Error('EIA_NO_EXPLICIT_DATES');
 return dedupe(results);
}
