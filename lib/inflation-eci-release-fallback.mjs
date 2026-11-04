// Pure, read-only resolver for the official BLS Employment Cost Index schedule.
// Callers fetch the official page only when a fresh BLS ICS has no future ECI.
// Never estimate, synthesize, or hardcode a future release date.

export const ECI_RELEASE_PAGE_URL='https://www.bls.gov/schedule/news_release/eci.htm';
const MAX_SOURCE_AGE_MS=48*60*60*1000;
const MONTHS=new Map([
  ['jan',1],['feb',2],['mar',3],['apr',4],['may',5],['jun',6],
  ['jul',7],['aug',8],['sep',9],['oct',10],['nov',11],['dec',12],
]);

const validDate=date=>typeof date==='string'&&/^20\d\d-\d\d-\d\d$/.test(date)&&
  Number.isFinite(Date.parse(date+'T00:00:00Z'))&&
  new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;

const easternDate=now=>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
    year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
  const value=type=>parts.find(part=>part.type===type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};

const ageIsFresh=(value,now)=>{
  const time=typeof value==='number'?value:typeof value==='string'?Date.parse(value):NaN;
  return Number.isFinite(time)&&time<=now&&now-time<=MAX_SOURCE_AGE_MS;
};

const untag=value=>value.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
  .replace(/\s+/g,' ').trim();
const headerKey=value=>untag(value).toLowerCase().replace(/[^a-z]+/g,' ').trim();

const candidateDate=value=>{
  const match=/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),\s+(20\d{2})$/.exec(value);
  if(!match)return null;
  const month=MONTHS.get(match[1].slice(0,3).toLowerCase());
  if(!month)return null;
  return `${match[3]}-${String(month).padStart(2,'0')}-${match[2].padStart(2,'0')}`;
};
const parseDate=value=>{
  const date=candidateDate(value);
  return validDate(date)?date:null;
};

/**
 * Parse the BLS's official ECI-specific HTML release-list table.
 * @param {string} html Full HTML fetched from ECI_RELEASE_PAGE_URL.
 * @param {{today?:string|null}} options An optional verified Eastern reference date.
 * @returns {Array<{id:'eci',source:'bls',date:string,title:string,sourceUrl:string,releaseTimeEt:string}>}
 * @throws ECI_SCHEDULE_* if the authoritative schedule cannot be safely parsed.
 */
export function parseEciReleasePage(html,{today=null}={}){
  if(typeof html!=='string'||html.length===0||html.length>2_000_000)
    throw Error('ECI_SCHEDULE_HTML_INVALID');
  if(!/Schedule of Releases for the Employment Cost Index/i.test(html))
    throw Error('ECI_SCHEDULE_IDENTITY_MISSING');

  const table=html.match(/<table\b[^>]*\bclass\s*=\s*["'][^"']*\brelease-list\b[^"']*["'][^>]*>[\s\S]*?<\/table>/i)?.[0];
  if(!table)throw Error('ECI_SCHEDULE_TABLE_MISSING');
  const header=table.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)?.[1];
  const columns=header?[...header.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>headerKey(m[1])):[];
  const referenceIndex=columns.findIndex(value=>/^reference (month|quarter|period)$/.test(value));
  const dateIndex=columns.indexOf('release date'),timeIndex=columns.indexOf('release time');
  if(referenceIndex<0||dateIndex<0||timeIndex<0||
    new Set([referenceIndex,dateIndex,timeIndex]).size!==3||
    columns.filter(v=>v==='release date'||v==='release time'||/^reference (month|quarter|period)$/.test(v)).length!==3)
    throw Error('ECI_SCHEDULE_HEADERS_CHANGED');

  const body=table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1];
  if(!body)throw Error('ECI_SCHEDULE_BODY_MISSING');

  const events=[],seen=new Set();
  for(const row of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>untag(m[1]));
    const period=cells[referenceIndex],dateText=cells[dateIndex],time=cells[timeIndex];
    const date=parseDate(dateText),releaseTimeEt=/^(0?[1-9]|1[0-2]):[0-5]\d\s+(AM|PM)$/i.test(time??'');
    // Skip only *provably historical* malformed rows. A malformed future row
    // may precede a valid later date, so dropping it would falsely pick the
    // later date as "next". Ambiguous rows still fail closed.
    if(!/^(First|Second|Third|Fourth) Quarter 20\d\d$/.test(period??'')||!date||!releaseTimeEt){
      const comparable=candidateDate(dateText);
      const periodYear=Number((period??'').match(/^(?:First|Second|Third|Fourth) Quarter (20\d\d)$/)?.[1]);
      const candidateYear=Number(comparable?.slice(0,4));
      if(!validDate(today)||!comparable||comparable>=today||
        !Number.isFinite(periodYear)||candidateYear<periodYear||candidateYear>periodYear+1)
        throw Error('ECI_SCHEDULE_ROW_INVALID');
      continue;
    }
    if(seen.has(date))throw Error('ECI_SCHEDULE_DUPLICATE_DATE');
    seen.add(date);
    events.push({id:'eci',source:'bls',date,title:`Employment Cost Index · ${period}`,
      sourceUrl:ECI_RELEASE_PAGE_URL,releaseTimeEt:time});
  }
  if(!events.length)throw Error('ECI_SCHEDULE_EVENTS_EMPTY');
  return events.sort((a,b)=>a.date.localeCompare(b.date));
}

/**
 * Decide whether an ECI-specific official-page lookup is necessary, and accept
 * a future date only from a fresh official ICS or a fresh, parseable BLS page.
 * No network calls or persistence occur in this helper.
 *
 * `today` is the current America/New_York date, YYYY-MM-DD. `pageCheckedAt`
 * is the actual time the caller fetched `pageHtml`, not the time it was cached.
 */
export function resolveEciNextRelease({calendar,today,now=Date.now(),pageHtml=null,pageCheckedAt=null}={}){
  const empty=(status,basis='unverified',detail=null,needsFallback=false)=>({
    status,date:null,sourceUrl:ECI_RELEASE_PAGE_URL,basis,detail,needsFallback,
  });
  if(!validDate(today)||!Number.isFinite(now)||today!==easternDate(now))
    return empty('INVALID_REFERENCE');

  const state=calendar?.sources?.bls;
  if(state?.status==='READY'&&ageIsFresh(state.checkedAt,now)){
    const future=(Array.isArray(calendar.events)?calendar.events:[])
      .filter(event=>event?.source==='bls'&&event.id==='eci'&&validDate(event.date)&&event.date>=today)
      .sort((a,b)=>a.date.localeCompare(b.date))[0];
    if(future)return {status:'CONFIRMED',date:future.date,
      sourceUrl:future.sourceUrl||'https://www.bls.gov/schedule/',
      basis:'official-ics',detail:null,needsFallback:false};
  }

  // The fetch adapter can use this result to request only the ECI page.
  if(pageHtml===null)return empty('FALLBACK_REQUIRED','unverified',null,true);
  if(!ageIsFresh(pageCheckedAt,now))return empty('FALLBACK_STALE','stale');
  let events;
  try{events=parseEciReleasePage(pageHtml,{today});}
  catch(error){return empty('FALLBACK_PARSE_FAILED','source-failed',error.message);}
  const future=events.find(event=>event.date>=today);
  if(!future)return empty('NO_FUTURE_RELEASE','unverified');
  return {status:'CONFIRMED',date:future.date,sourceUrl:ECI_RELEASE_PAGE_URL,
    basis:'official-eci-page',detail:null,needsFallback:false};
}
