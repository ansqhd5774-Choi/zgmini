export const SP500_PIT_UNIVERSE_METHOD="SP500_OFFICIAL_CHANGE_HISTORY_PIT_R1";

const MONTHS=Object.freeze({
  JAN:1,JANUARY:1,FEB:2,FEBRUARY:2,MAR:3,MARCH:3,APR:4,APRIL:4,MAY:5,JUN:6,JUNE:6,
  JUL:7,JULY:7,AUG:8,AUGUST:8,SEP:9,SEPT:9,SEPTEMBER:9,OCT:10,OCTOBER:10,NOV:11,NOVEMBER:11,DEC:12,DECEMBER:12,
});
const LOCAL_TICKER_ALIASES=Object.freeze({
  SATS:"ECHO",
  MMC:"MRSH",
  FI:"FISV",
});
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);

function htmlDecode(value){
  return String(value??"")
    .replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
    .replace(/&#([0-9]+);/g,(_,dec)=>String.fromCodePoint(parseInt(dec,10)))
    .replaceAll("&nbsp;"," ").replaceAll("&#160;"," ")
    .replaceAll("&amp;","&").replaceAll("&quot;",'"').replaceAll("&#39;","'")
    .replaceAll("&lt;","<").replaceAll("&gt;",">");
}
function stripHtml(value){
  return htmlDecode(String(value??"").replace(/<br\s*\/?>/gi," ").replace(/<[^>]+>/g," "))
    .replace(/\s+/g," ").trim();
}
function isoDate(y,m,d){
  const date=`${String(y).padStart(4,"0")}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const parsed=new Date(date+"T00:00:00Z");
  return !Number.isNaN(parsed.valueOf())&&parsed.toISOString().slice(0,10)===date?date:null;
}
export function normalizeSpGlobalDate(value){
  const raw=stripHtml(value).replace(/\b(effective|date)\b/gi," ").replace(/\s+/g," ").trim();
  if(!raw)return null;
  if(validDate(raw))return raw;
  let m=raw.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{2}|\d{4})$/);
  if(m){
    const month=MONTHS[m[2].toUpperCase()],year=Number(m[3].length===2?`20${m[3]}`:m[3]);
    return month?isoDate(year,month,Number(m[1])):null;
  }
  m=raw.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if(m){
    const month=MONTHS[m[1].toUpperCase()];
    return month?isoDate(Number(m[3]),month,Number(m[2])):null;
  }
  return null;
}
export function normalizePitTicker(value){
  const ticker=String(value??"").trim().toUpperCase().replace(/^NASDAQ?:/,"").replace(/^NYSE:/,"").replace(/^NASD:/,"");
  return LOCAL_TICKER_ALIASES[ticker]??ticker;
}
export function isSp500MembershipHeadline(title){
  const text=stripHtml(title);
  if(!/S&P\s*500/i.test(text))return false;
  return /\b(join|joins|added|addition|replace|replaces|changes|constituent)\b/i.test(text);
}
export function extractSpGlobalArchiveEntries(html,{baseUrl="https://press.spglobal.com"}={}){
  const out=new Map();
  for(const match of String(html??"").matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
    const title=stripHtml(match[2]);
    if(!title)continue;
    let url;
    try{url=new URL(htmlDecode(match[1]),baseUrl)}catch{continue}
    if(url.hostname!=="press.spglobal.com")continue;
    const date=url.pathname.match(/^\/(\d{4}-\d{2}-\d{2})-/)?.[1]??null;
    if(!validDate(date))continue;
    const key=url.origin+url.pathname;
    out.set(key,{releaseDate:date,title,url:key});
  }
  return [...out.values()].sort((a,b)=>b.releaseDate.localeCompare(a.releaseDate)||a.url.localeCompare(b.url));
}
function rowCells(html){
  return [...String(html??"").matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(match=>stripHtml(match[1]));
}
function cleanIndexName(value){return stripHtml(value).replace(/\s+/g," ").trim()}
function proseEffectiveDate(text,releaseDate){
  const m=String(text??"").match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:,\s*(\d{4}))?/i);
  if(!m)return null;
  const releaseYear=validDate(releaseDate)?Number(releaseDate.slice(0,4)):null;
  const releaseMonth=validDate(releaseDate)?Number(releaseDate.slice(5,7)):null;
  const month=MONTHS[m[1].replace(".","").toUpperCase()];
  if(!month)return null;
  let year=m[3]?Number(m[3]):releaseYear;
  if(!year)return null;
  if(!m[3]&&releaseMonth&&month<releaseMonth-6)year++;
  return isoDate(year,month,Number(m[2]));
}
function parseSp500ProseChanges(html,{sourceUrl=null,releaseDate=null}={}){
  const text=stripHtml(String(html??"").replace(/<\/li>/gi,". ").replace(/<\/p>/gi,". ").replace(/<br\s*\/?>/gi,". "));
  const events=[];
  const replacePattern=/\((?:NYSE|NASD|NASDAQ)\s*:\s*([A-Z0-9.\-]+)\)\s+will\s+replace[\s\S]{0,320}?\((?:NYSE|NASD|NASDAQ)\s*:\s*([A-Z0-9.\-]+)\)[\s\S]{0,320}?S&P\s*500[\s\S]{0,220}?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:,\s*\d{4})?/gi;
  for(const match of text.matchAll(replacePattern)){
    const effectiveDate=proseEffectiveDate(match[0],releaseDate);
    if(!effectiveDate)continue;
    events.push({effectiveDate,action:"Addition",ticker:normalizePitTicker(match[1]),sourceUrl,releaseDate});
    events.push({effectiveDate,action:"Deletion",ticker:normalizePitTicker(match[2]),sourceUrl,releaseDate});
  }
  const addPattern=/\((?:NYSE|NASD|NASDAQ)\s*:\s*([A-Z0-9.\-]+)\)\s+will\s+(?:be\s+)?(?:added|join)[\s\S]{0,320}?S&P\s*500[\s\S]{0,220}?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:,\s*\d{4})?/gi;
  for(const match of text.matchAll(addPattern)){
    const effectiveDate=proseEffectiveDate(match[0],releaseDate);
    if(effectiveDate)events.push({effectiveDate,action:"Addition",ticker:normalizePitTicker(match[1]),sourceUrl,releaseDate});
  }
  return events;
}
export function parseSp500ChangeRows(html,{sourceUrl=null,releaseDate=null}={}){
  const events=[],seen=new Set();
  let lastDate=null;
  for(const tr of String(html??"").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const cells=rowCells(tr[1]);
    if(!cells.length)continue;
    const parsedFirst=normalizeSpGlobalDate(cells[0]);
    if(parsedFirst)lastDate=parsedFirst;
    const indexPos=cells.findIndex(cell=>/^S&P\s*500$/i.test(cleanIndexName(cell)));
    if(indexPos<0)continue;
    const actionPos=cells.findIndex((cell,i)=>i>indexPos&&/^(Addition|Deletion)\b/i.test(cell));
    if(actionPos<0)continue;
    const effectiveDate=parsedFirst??lastDate;
    if(!validDate(effectiveDate))continue;
    const action=/^Addition\b/i.test(cells[actionPos])?"Addition":"Deletion";
    const tickerCell=cells[actionPos+2]??cells.at(-2)??"";
    const ticker=normalizePitTicker(tickerCell.replace(/[^A-Za-z0-9.\-]/g,""));
    if(!ticker||ticker.length>12)continue;
    const key=`${effectiveDate}|${action}|${ticker}`;
    if(seen.has(key))continue;
    seen.add(key);
    events.push({effectiveDate,action,ticker,sourceUrl,releaseDate});
  }
  if(events.length===0){
    for(const event of parseSp500ProseChanges(html,{sourceUrl,releaseDate})){
      const key=`${event.effectiveDate}|${event.action}|${event.ticker}`;
      if(seen.has(key))continue;
      seen.add(key);events.push(event);
    }
  }
  return events.sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate)||a.action.localeCompare(b.action)||a.ticker.localeCompare(b.ticker));
}
export function reconstructPitUniverses({currentMembers=[],currentDate,targetDates=[],events=[]}={}){
  if(!validDate(currentDate))throw new Error("SP500_PIT_CURRENT_DATE_INVALID");
  const targets=[...new Set((targetDates??[]).filter(validDate).filter(date=>date<=currentDate))].sort((a,b)=>b.localeCompare(a));
  if(!targets.length)throw new Error("SP500_PIT_TARGET_DATES_MISSING");
  const current=[...new Set((currentMembers??[]).map(normalizePitTicker).filter(Boolean))].sort();
  if(!current.length)throw new Error("SP500_PIT_CURRENT_UNIVERSE_INVALID");
  const relevant=(events??[]).filter(event=>validDate(event?.effectiveDate)&&event.effectiveDate<=currentDate&&["Addition","Deletion"].includes(event.action)&&event.ticker)
    .map(event=>({...event,ticker:normalizePitTicker(event.ticker)}))
    .sort((a,b)=>b.effectiveDate.localeCompare(a.effectiveDate)||a.action.localeCompare(b.action)||a.ticker.localeCompare(b.ticker));
  const byDate=new Map();
  for(const event of relevant){
    const list=byDate.get(event.effectiveDate)??[];list.push(event);byDate.set(event.effectiveDate,list);
  }
  const eventDates=[...byDate.keys()].sort((a,b)=>b.localeCompare(a));
  const members=new Set(current),universes=[],anomalies=[];
  let p=0;
  for(const target of targets){
    while(p<eventDates.length&&eventDates[p]>target){
      for(const event of byDate.get(eventDates[p])??[]){
        if(event.action==="Addition"){
          if(!members.has(event.ticker))anomalies.push({type:"REVERSE_ADDITION_NOT_PRESENT",effectiveDate:event.effectiveDate,ticker:event.ticker});
          members.delete(event.ticker);
        }else{
          if(members.has(event.ticker))anomalies.push({type:"REVERSE_DELETION_ALREADY_PRESENT",effectiveDate:event.effectiveDate,ticker:event.ticker});
          members.add(event.ticker);
        }
      }
      p++;
    }
    const list=[...members].sort();
    universes.push({tradeDate:target,memberCount:list.length,members:list});
  }
  return {universes:universes.sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate)),anomalies,eventCount:relevant.length,eventDates:eventDates.length};
}
