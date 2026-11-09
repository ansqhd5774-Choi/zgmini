// R27 stage: preserve installed R26 Treasury and all earlier sources, add TIC.
// Inert until guarded Windows PC installation.
export const RELEASE_CALENDAR_KEY='release-calendar';
export const RELEASE_SOURCES=Object.freeze({
 bls:{url:'https://www.bls.gov/schedule/news_release/bls.ics',page:'https://www.bls.gov/schedule/news_release/empsit.htm',format:'ics'},
 bea:{url:'https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics',page:'https://www.bea.gov/news/schedule',format:'ics'},
 fed:{url:'https://www.federalreserve.gov/releases/g17/',page:'https://www.federalreserve.gov/releases/g17/',format:'fed'},
 fed_calendar:{url:'https://www.federalreserve.gov/newsevents/{year}-{month}.htm?view=calendar',page:'https://www.federalreserve.gov/newsevents/calendar.htm',format:'fed-month'},
 fed_fomc:{url:'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',page:'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',format:'fomc-annual'},
 census:{url:'https://www.census.gov/economic-indicators/calendar-listview-{year}.html',page:'https://www.census.gov/economic-indicators/calendar-listview.html',format:'census'},
 eia:{url:'https://www.eia.gov/petroleum/supply/weekly/includes/wpsr-calendar.json',page:'https://www.eia.gov/reports/upcoming.php',format:'eia'},
 usda:{url:'https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report',page:'https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report',format:'usda'},
 cftc:{url:'https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm',page:'https://www.cftc.gov/MarketReports/CommitmentsofTraders/ReleaseSchedule/index.htm',format:'cftc'},
 treasury:{url:'https://www.treasurydirect.gov/xml/TreasuryCUSIPRelease.xml',page:'https://www.treasurydirect.gov/auctions/auction-announcements/',format:'treasury-xml'},
 tic:{url:'https://home.treasury.gov/data/treasury-international-capital-tic-system/release-dates-of-tic-data',page:'https://home.treasury.gov/data/treasury-international-capital-tic-system/release-dates-of-tic-data',format:'tic-html'},
 eia_epm:{url:'https://www.eia.gov/electricity/monthly/',page:'https://www.eia.gov/electricity/monthly/',format:'eia_epm'},
 nyfed:{url:'https://www.newyorkfed.org/research/calendars/i-{month}{year2}.html',page:'https://www.newyorkfed.org/research/calendars/',format:'nyfed'},
});
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const shortMonths=months.map(m=>m.slice(0,3).toLowerCase());
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
// Only the new providers tolerate malformed calendar day cells without
// changing the existing providers' long-standing strict parser behavior.
const officialExtraDate=s=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const date=new Date(s+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===s;
};

const eventSlug=s=>s.toLowerCase().replace(/\\[;,]/g,' ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const blsId=title=>{
 if(/^Employment Situation$/i.test(title))return 'employment';
 if(/^Consumer Price Index$/i.test(title))return 'cpi';
 if(/^Producer Price Index$/i.test(title))return 'ppi';
 if(/^Job Openings and Labor Turnover Survey$/i.test(title))return 'jolts';
 if(/^Employment Cost Index$/i.test(title))return 'eci';
 if(/^U\.S\. Import and Export Price Indexes$/i.test(title))return 'import-export-prices';
 if(/^Productivity and Costs$/i.test(title))return 'productivity';
 if(/^Real Earnings$/i.test(title))return 'real-earnings';
 if(/^Consumer Expenditures$/i.test(title))return 'consumer-expenditures';
 if(/^Employer Costs for Employee Compensation$/i.test(title))return 'employer-compensation';
 if(/^BLS\.gov Economic News Release Schedule$/i.test(title))return null;
 const slug=eventSlug(title);
 return slug?`bls-${slug}`:null;
};
const beaId=title=>{
 if(/^Personal Income and Outlays(?:,|$)/i.test(title))return 'pce';
 if(/^GDP \((?:Advance|Second|Third) Estimate\)/i.test(title)||/^Gross Domestic Product, [1-4](?:st|nd|rd|th) Quarter/i.test(title))return 'gdp';
 const slug=eventSlug(title);
 return slug?`bea-${slug}`:null;
};
// The BLS annual page publishes one complete calendar year in twelve release
// tables. Keep the installed ICS parser unchanged; this is an additive source
// of dates when the ICS feed has not yet published the following year.
export function parseBlsAnnualCalendar(html,year,{sourceUrl=`https://www.bls.gov/schedule/${year}/home.htm`}={}){
 if(!Number.isInteger(year)||year<2000||year>2100)throw Error('BLS_ANNUAL_YEAR_INVALID');
 const tables=[...html.matchAll(/<table\b[^>]*class=["'][^"']*\brelease-list\b[^"']*["'][^>]*>([\s\S]*?)<\/table>/gi)];
 if(tables.length!==12)throw Error('BLS_ANNUAL_TABLE_COUNT_INVALID');
 const events=[];
 for(const table of tables){
  for(const row of table[1].matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)){
   const cells=[...row[0].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
   if(cells.length!==3||!/\b\d{1,2}:\d{2}\s*(?:AM|PM)\b/i.test(cells[1]))continue;
   if(/\b(?:cancelled|canceled|postponed)\b/i.test(cells[2])||/<\/?(?:del|s)\b/i.test(row[0]))continue;
   const date=cells[0].match(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2})$/i);
   if(!date||Number(date[3])!==year)continue;
   const day=`${date[3]}-${String(months.findIndex(m=>m.toLowerCase()===date[1].toLowerCase())+1).padStart(2,'0')}-${date[2].padStart(2,'0')}`;
   if(!validDate(day))continue;
   const label=cells[2].replace(/\s+for\s+.+$/i,'').trim();
   const id=blsId(label.replace(/\s+\((?:P|R)\)$/i,''));
   if(id)events.push({id,date:day,title:cells[2],source:'bls',sourceUrl});
  }
 }
 if(!events.length)throw Error('BLS_ANNUAL_EVENTS_EMPTY');
 if(new Set(events.map(e=>e.date.slice(5,7))).size!==12)throw Error('BLS_ANNUAL_MONTH_COVERAGE_INCOMPLETE');
 return [...new Map(events.map(event=>[event.id+':'+event.date,event])).values()]
  .sort((a,b)=>a.date.localeCompare(b.date));
}

export function parseBlsBedNextRelease(html,{sourceUrl='https://www.bls.gov/news.release/cewbd.htm'}={}){
 const content=clean(html);
 const hit=content.match(/Business Employment Dynamics news release[^.]{0,180}?scheduled to be published on\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2}),\s*at\s*\d{1,2}:\d{2}\s*[ap]\.m\.\s*\(ET\)/i);
 if(!hit)throw Error('BLS_BED_OFFICIAL_DATE_MISSING');
 const month=months.findIndex(m=>m.toLowerCase()===hit[1].toLowerCase())+1;
 const date=`${hit[3]}-${String(month).padStart(2,'0')}-${hit[2].padStart(2,'0')}`;
 if(!validDate(date))throw Error('BLS_BED_DATE_INVALID');
 return [{id:'bls-business-employment-dynamics',date,title:'Business Employment Dynamics',source:'bls',sourceUrl}];
}
const sourceLink=(source,id)=>source==='bls'&&id!=='employment'?'https://www.bls.gov/schedule/':RELEASE_SOURCES[source].page;
const cancellation=/\b(?:cancelled|canceled|postponed)\b/i;
const crossedOutBefore=(html,index)=>{
 let depth=0;
 for(const tag of html.slice(0,index).matchAll(/<\/?(?:del|s)\b[^>]*>/gi))depth+=/^<\//.test(tag[0])?-1:1;
 return depth>0;
};

export function nyFedCalendarPages(now=Date.now()){
 const etDate=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date(now));
 const year=Number(etDate.find(p=>p.type==='year')?.value),month=Number(etDate.find(p=>p.type==='month')?.value);
 if(!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12)throw Error('CALENDAR_DATE_INVALID');
 return [0,1].map(offset=>{
  const m=month+offset,actualMonth=((m-1)%12)+1,actualYear=year+Math.floor((m-1)/12);
  const url=RELEASE_SOURCES.nyfed.url.replace('{month}',shortMonths[actualMonth-1]).replace('{year2}',String(actualYear%100).padStart(2,'0'));
  return {year:actualYear,month:actualMonth,url};
 });
}

// The three-column no-JavaScript view from actual October-December 2026 Fed
// official HTML, checked using the 2026-10-28 one-time source export. A page
// returned as HTTP 200 with the wrong month must fail before any DB write.
export function parseFedMonthlyCalendar(text,yearMonth,{sourceUrl=RELEASE_SOURCES.fed_calendar.page}={}){
 if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(yearMonth))throw Error('FED_MONTH_INVALID');
 const [year,month]=yearMonth.split('-').map(Number);
 const heading=new RegExp(`<h4\\b[^>]*>\\s*${months[month-1]}\\s+${year}\\s*<\\/h4>`,'i');
 const body=text.match(/<div\s+id=["']article["'][^>]*class=["'][^"']*cal-nojs\b[^"']*["'][^>]*>([\s\S]*)/i)?.[1];
 if(!body||!heading.test(body))throw Error('FED_MONTH_OFFICIAL_HEADING_MISSING');
 const headings=[...body.matchAll(/<div\b[^>]*class=["'][^"']*cal-nojs__rowTitle[^"']*["'][^>]*>[\s\S]*?<h4\b[^>]*>([\s\S]*?)<\/h4>/gi)];
 if(!headings.length)throw Error('FED_MONTH_SECTION_MISSING');
 const rowPattern=/<div\s+class=["'][^"']*\bcol-xs-2\b[^"']*["'][^>]*>\s*<p\b[^>]*>[\s\S]*?<\/p>\s*<\/div>\s*<div\s+class=["'][^"']*\bcol-xs-7\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div\s+class=["'][^"']*\bcol-xs-3\b[^"']*["'][^>]*>\s*<p\b[^>]*>([\s\S]*?)<\/p>/gi;
 const results=[];
 for(let i=0;i<headings.length;i++){
  const section=clean(headings[i][1]);
  if(!['FOMC Meetings','Beige Book','Statistical Releases'].includes(section))continue;
  const start=headings[i].index+headings[i][0].length;
  const end=i+1<headings.length?headings[i+1].index:body.length;
  const inner=body.slice(start,end);
  for(const row of inner.matchAll(rowPattern)){
   const title=clean(row[1].match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]??'');
   const note=clean(row[1]);
   if(!title||title.length>260)continue;
   // Existing UI already shows FOMC decisions/press conferences. G.17 is
   // likewise already sourced with a stable industrial-production ID.
   if(/^(?:FOMC Meeting|FOMC Press Conference)$/i.test(title)||/^G\.17\s*-/i.test(title))continue;
   if(section==='FOMC Meetings'&&!/^FOMC Minutes$/i.test(title))continue;
   if(section==='Beige Book'&&title!=='Beige Book')continue;
   const days=clean(row[2]).split(',').map(s=>s.trim());
   if(!days.length||days.some(s=>!/^\d{1,2}$/.test(s)))continue;
   const slug=eventSlug(title);
   if(!slug)continue;
   for(const dayText of days){
    const day=Number(dayText);
    const limit=new Date(Date.UTC(year,month,0)).getUTCDate();
    if(day<1||day>limit)continue;
    const date=`${yearMonth}-${String(day).padStart(2,'0')}`;
    if(!validDate(date))continue;
    const approximate=/publication date for this release is approximate/i.test(note);
    results.push({id:`fed-calendar-${slug}`,date,
     title:approximate?`${title} · 발표일 잠정`:title,
     source:'fed_calendar',sourceUrl});
   }
  }
 }
 if(!results.length)throw Error('FED_MONTH_EVENTS_EMPTY');
 return [...new Map(results.map(e=>[e.id+':'+e.date,e])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}

// The Federal Reserve publishes meeting ranges for each tentative calendar
// year. The final meeting day is the decision day; no release clock is given.
// A missing following-year section is not evidence of an announced schedule.
export function parseFomcAnnualCalendar(html,year,{sourceUrl=RELEASE_SOURCES.fed_fomc.page}={}){
 if(!Number.isInteger(year)||year<2000||year>2100)throw Error('FOMC_YEAR_INVALID');
 const heading=new RegExp(`<h4\\b[^>]*>\\s*<a\\b[^>]*>\\s*${year} FOMC Meetings\\s*<\\/a>\\s*<\\/h4>`,'i');
 const match=heading.exec(html);
 if(!match)throw Error('FOMC_YEAR_NOT_PUBLISHED');
 const section=html.slice(match.index+match[0].length);
 const end=section.search(/<div\b[^>]*class=["'][^"']*\bpanel-footer\b/i);
 if(end<0)throw Error('FOMC_SECTION_INCOMPLETE');
 const body=section.slice(0,end);
 const rows=body.split(/<div\b[^>]*class=["'][^"']*\brow fomc-meeting\b[^"']*["'][^>]*>/i).slice(1);
 const events=[];
 for(const row of rows){
  const monthHtml=row.match(/<div\b[^>]*class=["'][^"']*\bfomc-meeting__month\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]??'';
  const dateHtml=row.match(/<div\b[^>]*class=["'][^"']*\bfomc-meeting__date\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]??'';
  const month=months.findIndex(name=>name.toLowerCase()===clean(monthHtml).toLowerCase())+1;
  const range=clean(dateHtml).match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})\*?$/);
  if(!month||!range)throw Error('FOMC_MEETING_ROW_INVALID');
  const date=`${year}-${String(month).padStart(2,'0')}-${range[2].padStart(2,'0')}`;
  if(!validDate(date)||Number(range[1])>=Number(range[2]))throw Error('FOMC_MEETING_DATE_INVALID');
  events.push({id:'fomc',date,title:'FOMC Meeting',source:'fed_fomc',sourceUrl});
 }
 if(events.length!==8||new Set(events.map(item=>item.date)).size!==8)throw Error('FOMC_ANNUAL_COVERAGE_INVALID');
 return events.sort((a,b)=>a.date.localeCompare(b.date));
}

export function parseReleaseCalendar(text,source,options={}){
 const events=[];
 const add=(id,date,title,sourceUrl=sourceLink(source,id))=>{
  if((source==='eia_epm'||source==='nyfed'?officialExtraDate(date):validDate(date)))
   events.push({id,date,title,source,sourceUrl});
 };
 if(RELEASE_SOURCES[source]?.format==='ics'){
  if(!text.includes('BEGIN:VCALENDAR'))throw Error('CALENDAR_FORMAT_INVALID');
  const unfolded=text.replace(/\r?\n[ \t]/g,'');
  for(const block of unfolded.split('BEGIN:VEVENT').slice(1)){
   if(/^STATUS:CANCELLED$/m.test(block.replace(/\r/g,'')))continue;
   const title=block.match(/(?:^|\n)SUMMARY:(.*)/)?.[1]?.trim().replace(/\\,/g,',')??'';
   const date=block.match(/(?:^|\n)DTSTART(?:;[^:\n]*)?:(\d{4})(\d{2})(\d{2})/);
   if(!date)continue;
   const id=source==='bls'?blsId(title):beaId(title);
   if(id)add(id,`${date[1]}-${date[2]}-${date[3]}`,title);
  }
 }else if(source==='fed_calendar'){
  return parseFedMonthlyCalendar(text,options.yearMonth,{sourceUrl:options.sourceUrl});
 }else if(source==='fed_fomc'){
  return parseFomcAnnualCalendar(text,options.year,{sourceUrl:options.sourceUrl});
 }else if(source==='census'){
  // Preserve retail's legacy ID, but distinguish other Census releases by title
  // and the officially published reference period. This prevents same-day
  // releases for different survey months from overwriting each other.
  for(const row of text.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)){
   const cells=[...row[0].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
   if(cells.length<2)continue;
   const title=cells[0],period=cells[3]??'';
   // R19 retail rows also appear with only title + date. Retain that
   // supported shape, while other expanded Census rows still need period.
   if(cells.length<4&&title!=='Advance Monthly Sales for Retail and Food Services')continue;
   const date=cells[1]?.match(/^(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (20\d{2})$/);
   if(!title||!date)continue;
   const isRetail=title==='Advance Monthly Sales for Retail and Food Services';
   const slug=eventSlug(title),periodSlug=eventSlug(period);
   const id=isRetail?'retail':slug?`census-${slug}${periodSlug?`-${periodSlug}`:''}`:null;
   if(!id)continue;
   const day=`${date[3]}-${String(months.indexOf(date[1])+1).padStart(2,'0')}-${date[2].padStart(2,'0')}`;
   add(id,day,isRetail?title:period?`${title} · ${period}`:title);
  }
 }else if(source==='fed'){
  for(const m of text.matchAll(/<p[^>]*>\s*<strong>(20\d{2}):<\/strong>([\s\S]*?)<\/p>/gi)){
   const dates=clean(m[2]);
   for(const hit of dates.matchAll(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})([^,]*)/g)){
    if(/annual revision/i.test(hit[3]))continue;
    add('industrial-production',`${m[1]}-${String(months.indexOf(hit[1])+1).padStart(2,'0')}-${hit[2].padStart(2,'0')}`,'Industrial Production G.17');
   }
  }
 }else if(source==='eia_epm'){
  const page=clean(text);
  if(!/Electric Power Monthly/i.test(page))throw Error('CALENDAR_FORMAT_INVALID');
  const hit=page.match(/Next\s+Release\s+Date\s*:\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})/i);
  if(hit){
   const month=months.findIndex(m=>m.toLowerCase()===hit[1].toLowerCase())+1;
   add('eia-epm',`${hit[3]}-${String(month).padStart(2,'0')}-${hit[2].padStart(2,'0')}`,'Electric Power Monthly');
  }
 }else if(source==='nyfed'){
  const {year,month,url}=options;
  if(!Number.isInteger(year)||!Number.isInteger(month)||year<2000||month<1||month>12||!/^https:\/\/www\.newyorkfed\.org\/research\/calendars\/i-[a-z]{3}\d{2}\.html$/.test(url??''))throw Error('CALENDAR_CONTEXT_INVALID');
  const expectedUrl=RELEASE_SOURCES.nyfed.url.replace('{month}',shortMonths[month-1]).replace('{year2}',String(year%100).padStart(2,'0'));
  if(url!==expectedUrl)throw Error('CALENDAR_CONTEXT_INVALID');
  if(!new RegExp(`\\b${months[month-1]}\\s+${year}\\b`,'i').test(clean(text)))throw Error('NYFED_MONTH_MISMATCH');
  let validDays=0;
  for(const cell of text.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)){
   const words=clean(cell[1]),day=words.match(/^(0?[1-9]|[12]\d|3[01])(?=\s|$)/);
   if(!day)continue;
   const date=`${year}-${String(month).padStart(2,'0')}-${day[1].padStart(2,'0')}`;
   if(!officialExtraDate(date))continue;
   validDays++;
   const links=[...cell[1].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)];
   for(const [i,link] of links.entries()){
    const rawTitle=clean(link[1]);
    const title=rawTitle.replace(/\s*[-–—]?\s*(?:cancelled|canceled|postponed)\b.*$/i,'').trim();
    const id=/^Global Supply Chain Pressure Index\s*\(GSCPI\)$/i.test(title)?'nyfed-gscpi':
     /^Survey of Consumer Expectations$/i.test(title)?'nyfed-sce':null;
    if(!id)continue;
    const after=clean(cell[1].slice(link.index+link[0].length,links[i+1]?.index??cell[1].length));
    const isCancelled=cancellation.test(rawTitle)||crossedOutBefore(cell[1],link.index)||
     /<\/?(?:del|s)\b/i.test(link[1])||
     /^[\[(]?\s*(?:[-–—:]\s*)?(?:cancelled|canceled|postponed)\b/i.test(after);
    if(!isCancelled)add(id,date,id==='nyfed-gscpi'?'Global Supply Chain Pressure Index':'Survey of Consumer Expectations',url);
   }
  }
  if(!validDays)throw Error('CALENDAR_FORMAT_INVALID');
 }
 if(!events.length&&source!=='nyfed')throw Error('CALENDAR_EVENTS_EMPTY');
 return [...new Map(events.map(e=>[e.id+':'+e.date,e])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}
const mapping={nfp:['employment','bls','월간'],sahmGap:['employment','bls','월간'],realGdp:['gdp','bea','분기'],realPce:['pce','bea','월간'],disposableIncome:['pce','bea','월간'],industrialProduction:['industrial-production','fed','월간'],retailSales:['retail','census','월간']};
const policy={
 initialClaims:{cadence:'주간',text:'매주 목요일 · 공식 정책',sourceUrl:'https://oui.doleta.gov/press/weekly-claims-releases.html'},
 yieldCurve:{cadence:'거래일',text:'거래일 갱신 · 공식 정책',sourceUrl:'https://www.federalreserve.gov/releases/h15/'},
 hyCreditStress:{cadence:'월간',text:'매월 마지막 수 · 공식 정책',sourceUrl:'https://www.newyorkfed.org/research/policy/cmdi'},
 creditConditions:{cadence:'주간',text:'매주 수요일 · 휴일 시 조정',sourceUrl:'https://www.chicagofed.org/research/data/nfci/current-data'},
};
export function recessionReleaseInfo(id,calendar,today,now=Date.now()){
 if(policy[id])return {...policy[id],basis:'policy',next:null};
 const [eventId,source,cadence]=mapping[id]??[];
 if(!source)return {cadence:'—',next:null,basis:'unavailable',text:'발표 정보 없음',sourceUrl:null};
 const sourceState=calendar?.sources?.[source],age=now-Date.parse(sourceState?.checkedAt),fresh=sourceState?.status==='READY'&&age>=0&&age<=48*3600000;
 const event=fresh?(calendar?.events??[]).filter(e=>e.id===eventId&&e.source===source&&e.date>=today).sort((a,b)=>a.date.localeCompare(b.date))[0]:null;
 if(event)return {cadence,next:event.date,basis:'official',text:event.date.slice(5).replace('-','.')+' · 공식',sourceUrl:event.sourceUrl};
 return {cadence,next:null,basis:sourceState?.status==='SOURCE_FAILED'?'source-failed':'unverified',text:sourceState?.status==='SOURCE_FAILED'?'일정 조회 오류':'공식 일정 확인',sourceUrl:RELEASE_SOURCES[source].page};
}
