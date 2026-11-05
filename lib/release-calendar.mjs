// R19 stage 2: extend BEA only, based exactly on the BLS-installed R11 parser.
// Candidate to install as one file in the existing approved PC writer checkout.
// Staging path is inert; the PC writer continues to import lib/release-calendar.mjs.
export const RELEASE_CALENDAR_KEY='release-calendar';
export const RELEASE_SOURCES=Object.freeze({
 bls:{url:'https://www.bls.gov/schedule/news_release/bls.ics',page:'https://www.bls.gov/schedule/news_release/empsit.htm',format:'ics'},
 bea:{url:'https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics',page:'https://www.bea.gov/news/schedule',format:'ics'},
 fed:{url:'https://www.federalreserve.gov/releases/g17/',page:'https://www.federalreserve.gov/releases/g17/',format:'fed'},
 census:{url:'https://www.census.gov/economic-indicators/calendar-listview-{year}.html',page:'https://www.census.gov/economic-indicators/calendar-listview.html',format:'census'},
 eia_epm:{url:'https://www.eia.gov/electricity/monthly/',page:'https://www.eia.gov/electricity/monthly/',format:'eia_epm'},
 nyfed:{url:'https://www.newyorkfed.org/research/calendars/i-{month}{year2}.html',page:'https://www.newyorkfed.org/research/calendars/',format:'nyfed'},
});
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const shortMonths=months.map(m=>m.slice(0,3).toLowerCase());
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const validDate=s=>{
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
const sourceLink=(source,id)=>source==='bls'&&id!=='employment'?'https://www.bls.gov/schedule/':RELEASE_SOURCES[source].page;

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

export function parseReleaseCalendar(text,source,context={}){
 const events=[];
 const add=(id,date,title,sourceUrl=sourceLink(source,id))=>{if(validDate(date))events.push({id,date,title,source,sourceUrl});};
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
 }else if(source==='census'){
  for(const row of text.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)){
   if(!row[0].includes('Advance Monthly Sales for Retail and Food Services'))continue;
   const cells=[...row[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>clean(m[1]));
   const date=cells[1]?.match(/^(\w+) (\d{1,2}), (20\d{2})$/);
   if(date&&months.includes(date[1]))add('retail',`${date[3]}-${String(months.indexOf(date[1])+1).padStart(2,'0')}-${date[2].padStart(2,'0')}`,cells[0]);
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
  const {year,month,url}=context;
  if(!Number.isInteger(year)||!Number.isInteger(month)||year<2000||month<1||month>12||!/^https:\/\/www\.newyorkfed\.org\/research\/calendars\/i-[a-z]{3}\d{2}\.html$/.test(url??''))throw Error('CALENDAR_CONTEXT_INVALID');
  for(const cell of text.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)){
   const words=clean(cell[1]),day=words.match(/^(\d{1,2})(?=\s|$)/);
   if(!day)continue;
   const date=`${year}-${String(month).padStart(2,'0')}-${day[1].padStart(2,'0')}`;
   if(/Global Supply Chain Pressure Index(?:\s*\(GSCPI\))?/i.test(words))add('nyfed-gscpi',date,'Global Supply Chain Pressure Index',url);
   if(/Survey of Consumer Expectations/i.test(words))add('nyfed-sce',date,'Survey of Consumer Expectations',url);
  }
 }
 if(!events.length)throw Error('CALENDAR_EVENTS_EMPTY');
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
