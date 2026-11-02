// Presentation only: same calendar importance and existing own-site HTML feed.
// No provider requests, raw vendor JSON, storage or public API contract changes.
import {releaseImportance} from './market-calendar-importance.mjs';
import {easternIso,SCHEDULE_MAX_ITEMS} from './fomc-schedule.mjs';
import {FOMC_DATES,FOMC_SOURCE,fomcInstant} from './fomc-countdown.mjs';
const day=x=>typeof x==='string'&&/^20\d\d-\d\d-\d\d$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const ny=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const sourceReady=(state,now)=>state?.status==='READY'&&Number.isFinite(Date.parse(state.checkedAt))&&now>=Date.parse(state.checkedAt)&&now-Date.parse(state.checkedAt)<=48*3600000;
const names={gdp:'미국 GDP',pce:'미국 PCE',employment:'미국 고용보고서',cpi:'미국 CPI'};
const timedSources={gdp:'bea',pce:'bea',employment:'bls',cpi:'bls'};
const domains={AMZN:'amazon.com',AAPL:'apple.com',MSFT:'microsoft.com',GOOG:'abc.xyz',GOOGL:'abc.xyz',NVDA:'nvidia.com',META:'meta.com',TSLA:'tesla.com',AVGO:'broadcom.com'};
// Accept only the two own-site published ★★★ HTML shapes; never infer from ticker or vendor data.
const publishedThreeStars=/<div class=(?:mc-importance|"mc-importance") aria-label="(?:중요도 3|재무건전성 별 3개)"(?: title="[^"<>]*")?>★★★<\/div>/;
const text=s=>s.replace(/&#(x[0-9a-f]+|\d+);|&(amp|quot|apos|lt|gt);/gi,(whole,named,entity)=>{
 if(named){const n=named[0].toLowerCase()==='x'?parseInt(named.slice(1),16):Number(named);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
 return {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'}[entity.toLowerCase()]??whole;
});
export function bannerCalendarRange(now){
 const start=ny.format(new Date(now)),end=new Date(Date.parse(start+'T12:00:00Z')+13*86400000).toISOString().slice(0,10);
 return {start,end};
}
export function earningsBannerRows(html,now){
 if(typeof html!=='string'||html.length>1000000||!Number.isFinite(now))return [];
 const {start,end}=bannerCalendarRange(now),rows=[];let date=null;
 // Parse only the existing renderer's date heading and reviewed article form.
 // Names remain React text, never injected HTML or a new redistributed feed.
 const tokens=/<div class="mc-week mc-vendor-week"><strong>(20\d\d-\d\d-\d\d) · 기업 실적<\/strong>|<article class="mc-row mc-vendor-row" data-search="([a-z0-9.\-]{1,12}) [^"]*">([\s\S]*?)<\/article>/g;
 for(const match of html.matchAll(tokens)){
  if(match[1]){date=day(match[1])?match[1]:null;continue;}
  const body=match[3],ticker=match[2].toUpperCase();
  if(!date||date<start||date>end||!publishedThreeStars.test(body))continue;
  const rawName=/<div class=mc-event><span>([^<]*)<\/span>/.exec(body)?.[1];
  const session=/<time class=mc-time>([^<]*)<\/time>/.exec(body)?.[1];
  if(!rawName||!['장전','장후','시각 미정'].includes(session))continue;
  const at=session==='장전'?easternIso(date,9,30):session==='장후'?easternIso(date,16):null;
  if(at&&Date.parse(at)<=now)continue;
  rows.push({key:'calendar-earnings-'+ticker+'-'+date,kind:'실적',importance:3,name:text(rawName).replace(/ \([^)]*\)$/,''),ticker,date,at,sortAt:at??easternIso(date,23,59),estimated:true,session:session==='장전'?'beforeOpen':session==='장후'?'afterClose':'unknown',logo:ticker==='AMZN'?'amazon':ticker==='MSFT'?'microsoft':['GOOG','GOOGL'].includes(ticker)?'alphabet':undefined,logoDomain:domains[ticker]??null,sourceUrl:'/market-calendar/'});
 }
 return rows;
}
export function marketCalendarBannerRows(now,calendar,earningsHtml=''){
 if(!Number.isFinite(now))return [];
 const rows=earningsBannerRows(earningsHtml,now),{start,end}=bannerCalendarRange(now);
 for(const e of calendar?.events??[]){
  if(!day(e?.date)||e.date<start||e.date>end||typeof e.title!=='string'||!e.title.trim()||!['bls','bea','fed','fed_calendar','census'].includes(e.source)||releaseImportance(e.id,e.title)!==3||!sourceReady(calendar?.sources?.[e.source],now)||typeof e.sourceUrl!=='string'||!e.sourceUrl.startsWith('https://'))continue;
  const at=timedSources[e.id]===e.source?easternIso(e.date,8,30):null;
  if(at&&Date.parse(at)<=now)continue;
  if(e.status==='released')continue;
  rows.push({key:'calendar-'+e.id+'-'+e.date,kind:'지표',importance:3,name:names[e.id]??e.title,date:e.date,at,sortAt:at??easternIso(e.date,23,59),estimated:false,sourceUrl:e.sourceUrl});
 }
 // The same official FOMC snapshot is shown by the market calendar. Only
 // future decisions enter this list; the old 24-hour reached hold is excluded.
 for(const date of FOMC_DATES){
  const at=fomcInstant(date);if(date>=start&&date<=end&&Date.parse(at)>now)rows.push({key:'calendar-fomc-'+date,kind:'연준',importance:3,name:'FOMC 금리 결정',date,at,sortAt:at,estimated:false,sourceUrl:FOMC_SOURCE});
 }
 return [...new Map(rows.map(r=>[r.key,r])).values()].sort((a,b)=>Date.parse(a.sortAt)-Date.parse(b.sortAt)||a.key.localeCompare(b.key)).slice(0,SCHEDULE_MAX_ITEMS);
}
