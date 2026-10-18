// Official source calendars, not hand-entered dates. Dates remain US publication days.
export const RELEASE_CALENDAR_KEY='release-calendar';
export const RELEASE_SOURCES=Object.freeze({
 bls:{url:'https://www.bls.gov/schedule/news_release/bls.ics',page:'https://www.bls.gov/schedule/news_release/empsit.htm',format:'ics'},
 bea:{url:'https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics',page:'https://www.bea.gov/news/schedule',format:'ics'},
 fed:{url:'https://www.federalreserve.gov/releases/g17/',page:'https://www.federalreserve.gov/releases/g17/',format:'fed'},
 census:{url:'https://www.census.gov/economic-indicators/calendar-listview-{year}.html',page:'https://www.census.gov/economic-indicators/calendar-listview.html',format:'census'},
});
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function parseReleaseCalendar(text,source){
 const events=[];
 const add=(id,date,title)=>{if(validDate(date))events.push({id,date,title,source,sourceUrl:RELEASE_SOURCES[source].page});};
 if(RELEASE_SOURCES[source]?.format==='ics'){
  if(!text.includes('BEGIN:VCALENDAR'))throw Error('CALENDAR_FORMAT_INVALID');
  const unfolded=text.replace(/\r?\n[ \t]/g,'');
  for(const block of unfolded.split('BEGIN:VEVENT').slice(1)){
   if(/^STATUS:CANCELLED$/m.test(block.replace(/\r/g,'')))continue;
   const title=block.match(/(?:^|\n)SUMMARY:(.*)/)?.[1]?.trim().replace(/\\,/g,',')??'';
   const date=block.match(/(?:^|\n)DTSTART(?:;[^:\n]*)?:(\d{4})(\d{2})(\d{2})/);
   if(!date)continue;
   const id=/Employment Situation/i.test(title)?'employment':/Personal Income and Outlays/i.test(title)?'pce':/^(?:GDP\b|Gross Domestic Product,)/i.test(title)?'gdp':null;
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
