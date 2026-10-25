import {FOMC_DATES,FOMC_SOURCE,fomcInstant} from './fomc-countdown.mjs';

// UI scheduling only. These dates were checked against the publishers on 2026-10-25.
// The existing stored calendar is authoritative when a source was refreshed recently.
// Never treat an estimated market-close anchor as a confirmed earnings release.
export const SCHEDULE_CHECKED_AT='2026-10-25';
export const SCHEDULE_MAX_ITEMS=20;
export const EARNINGS_MARKET_CAP_MIN_USD_B=300;
const OFFICIAL=[
 {id:'gdp',date:'2026-10-29',name:'미국 GDP 3분기 속보치',source:'bea',sourceUrl:'https://www.bea.gov/news/schedule'},
 {id:'pce',date:'2026-10-29',name:'미국 PCE 물가지수',source:'bea',sourceUrl:'https://www.bea.gov/news/schedule'},
 {id:'employment',date:'2026-11-06',name:'미국 비농업 고용',source:'bls',sourceUrl:'https://www.bls.gov/schedule/news_release/empsit.htm'},
 {id:'cpi',date:'2026-11-10',name:'미국 CPI',source:'bls-cpi',sourceUrl:'https://www.bls.gov/schedule/news_release/cpi.htm'},
 {id:'employment',date:'2026-12-04',name:'미국 비농업 고용',source:'bls',sourceUrl:'https://www.bls.gov/schedule/news_release/empsit.htm'},
 {id:'cpi',date:'2026-12-10',name:'미국 CPI',source:'bls-cpi',sourceUrl:'https://www.bls.gov/schedule/news_release/cpi.htm'},
 {id:'pce',date:'2026-11-25',name:'미국 PCE 물가지수',source:'bea',sourceUrl:'https://www.bea.gov/news/schedule'},
 {id:'pce',date:'2026-12-23',name:'미국 PCE 물가지수',source:'bea',sourceUrl:'https://www.bea.gov/news/schedule'},
];
// Checked 2026-10-25: market-cap snapshot in USD billions and publisher/calendar
// estimated release session. This is a bounded, manually verified snapshot;
// no unsupported assumption of automatic earnings-calendar updates.
const EARNINGS=[
 {id:'verizon',name:'버라이즌',ticker:'VZ',marketCapUsdB:185,day:'2026-10-26',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/week/2026-10-26'},
 {id:'welltower',name:'웰타워',ticker:'WELL',marketCapUsdB:170,day:'2026-10-26',session:'afterClose',sourceUrl:'https://pro.thestreet.com/earnings/week/2026-10-26'},
 {id:'cocacola',name:'코카콜라',ticker:'KO',marketCapUsdB:402,day:'2026-10-27',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-27'},
 {id:'boeing',name:'보잉',ticker:'BA',marketCapUsdB:152,day:'2026-10-27',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-27'},
 {id:'spglobal',name:'S&P 글로벌',ticker:'SPGI',marketCapUsdB:131,day:'2026-10-27',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-27'},
 {id:'hca',name:'HCA 헬스케어',ticker:'HCA',marketCapUsdB:101,day:'2026-10-27',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-27'},
 {id:'visa',name:'비자',ticker:'V',marketCapUsdB:762,day:'2026-10-27',session:'afterClose',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-27'},
 {id:'seagate',name:'씨게이트',ticker:'STX',marketCapUsdB:143,day:'2026-10-27',session:'afterClose',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-27'},
 {id:'gevernova',name:'GE 버노바',ticker:'GEV',marketCapUsdB:237,day:'2026-10-28',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-28'},
 {id:'amphenol',name:'암페놀',ticker:'APH',marketCapUsdB:196,day:'2026-10-28',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-28'},
 {id:'adp',name:'ADP',ticker:'ADP',marketCapUsdB:116,day:'2026-10-28',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-28'},
 {id:'phillips66',name:'필립스66',ticker:'PSX',marketCapUsdB:116,day:'2026-10-28',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-28'},
 {id:'alphabet',name:'알파벳',ticker:'GOOGL',logo:'alphabet',marketCapUsdB:4140,day:'2026-10-28',session:'afterClose',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-28'},
 {id:'microsoft',name:'마이크로소프트',ticker:'MSFT',logo:'microsoft',marketCapUsdB:3950,day:'2026-10-28',session:'afterClose',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-28'},
 {id:'kla',name:'KLA',ticker:'KLAC',marketCapUsdB:211,day:'2026-10-28',session:'afterClose',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-28'},
 {id:'tmobile',name:'T-모바일',ticker:'TMUS',marketCapUsdB:169,day:'2026-10-28',session:'afterClose',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-28'},
 {id:'servicenow',name:'서비스나우',ticker:'NOW',marketCapUsdB:155,day:'2026-10-28',session:'afterClose',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-28'},
 {id:'fortinet',name:'포티넷',ticker:'FTNT',marketCapUsdB:125,day:'2026-10-28',session:'afterClose',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-28'},
 {id:'lilly',name:'일라이릴리',ticker:'LLY',marketCapUsdB:1100,day:'2026-10-29',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-29'},
 {id:'mastercard',name:'마스터카드',ticker:'MA',marketCapUsdB:543,day:'2026-10-29',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-29'},
 {id:'merck',name:'머크',ticker:'MRK',marketCapUsdB:366,day:'2026-10-29',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-29'},
 {id:'caterpillar',name:'캐터필러',ticker:'CAT',marketCapUsdB:340,day:'2026-10-29',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-29'},
 {id:'linde',name:'린데',ticker:'LIN',marketCapUsdB:231,day:'2026-10-29',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-29'},
 {id:'amazon',name:'아마존',ticker:'AMZN',logo:'amazon',marketCapUsdB:2830,day:'2026-10-29',session:'afterClose',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-29'},
 {id:'intel',name:'인텔',ticker:'INTC',marketCapUsdB:485,day:'2026-10-29',session:'afterClose',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-29'},
 {id:'exxon',name:'엑슨모빌',ticker:'XOM',marketCapUsdB:753,day:'2026-10-30',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-30'},
 {id:'abbvie',name:'애브비',ticker:'ABBV',marketCapUsdB:511,day:'2026-10-30',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-30'},
 {id:'chevron',name:'셰브론',ticker:'CVX',marketCapUsdB:446,day:'2026-10-30',session:'beforeOpen',sourceUrl:'https://pro.thestreet.com/earnings/2026-10-30'},
];
// Identifiable company-site icons for the approved 300B+ earnings list.
// Original inline SVGs for Alphabet, Microsoft and Amazon take priority.
const BRAND_ICON_DOMAINS=Object.freeze({
 KO:'coca-colacompany.com',
 V:'visa.com',
 GOOGL:'abc.xyz',
 MSFT:'microsoft.com',
 LLY:'lilly.com',
 MA:'mastercard.com',
 MRK:'merck.com',
 CAT:'caterpillar.com',
 AMZN:'amazon.com',
 INTC:'intel.com',
 XOM:'corporate.exxonmobil.com',
 ABBV:'abbvie.com',
 CVX:'chevron.com',
});
export function meetsEarningsMarketCap(capUsdB){
 return typeof capUsdB==='number'&&Number.isFinite(capUsdB)&&capUsdB>=EARNINGS_MARKET_CAP_MIN_USD_B;
}
const easternHour=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'});
export function easternIso(date,hour,minute=0){
 const probe=Date.parse(date+'T'+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+':00Z');
 if(!Number.isFinite(probe))return null;
 const offset=hour-Number(easternHour.format(probe));
 return new Date(probe+offset*3600000).toISOString();
}
const labels={gdp:'미국 GDP 속보치',pce:'미국 PCE 물가지수',employment:'미국 비농업 고용'};
const sources={gdp:'bea',pce:'bea',employment:'bls'};
function fresh(state,now){
 const checked=Date.parse(state?.checkedAt??'');
 return state?.status==='READY'&&Number.isFinite(checked)&&now>=checked&&now-checked<=48*3600000;
}
export function upcomingSchedule(now,calendar){
 if(!Number.isFinite(now))return [];
 const rows=[];
 for(const day of FOMC_DATES){
  const at=fomcInstant(day);rows.push({key:'fomc-'+day,kind:'연준',name:'FOMC 금리 결정',at,estimated:false,sourceUrl:FOMC_SOURCE});
 }
 // Officially verified snapshot is bounded. Later releases come from the existing stored PC feed.
 const live=[];
 for(const e of calendar?.events??[]){
  if(!['gdp','pce','employment'].includes(e.id)||e.source!==sources[e.id]||!/^20\d\d-\d\d-\d\d$/.test(e.date))continue;
  if(!fresh(calendar?.sources?.[e.source],now))continue;
  live.push({id:e.id,date:e.date,name:labels[e.id],source:e.source,sourceUrl:e.sourceUrl});
 }
 const liveIds=new Set(live.map(e=>e.id));
 for(const e of [...OFFICIAL.filter(e=>!liveIds.has(e.id)),...live]){
  // Official US statistical releases: 08:30 Eastern; use DST-aware conversion.
  const at=easternIso(e.date,8,30);
  if(at)rows.push({key:e.id+'-'+e.date,kind:'지표',name:e.name,at,estimated:false,sourceUrl:e.sourceUrl});
 }
 for(const e of EARNINGS){
  if(!meetsEarningsMarketCap(e.marketCapUsdB))continue;
  // A release window is an approximate reference, never the call or actual
  // earnings release timestamp. Before-open uses the 09:30 ET opening bell.
  const referenceHour=e.session==='beforeOpen'?9:16;
  const referenceMinute=e.session==='beforeOpen'?30:0;
  const at=easternIso(e.day,referenceHour,referenceMinute);
  const expiry=easternIso(e.day,23,59);
  if(!at||!expiry)continue;
  rows.push({key:'earnings-'+e.id,kind:'실적',name:e.name,ticker:e.ticker,logo:e.logo,logoDomain:BRAND_ICON_DOMAINS[e.ticker]??null,marketCapUsdB:e.marketCapUsdB,at,expiry,estimated:true,session:e.session,sourceUrl:e.sourceUrl});
 }
 return rows.filter(e=>Number.isFinite(Date.parse(e.at))&&now<Date.parse(e.expiry??e.at)).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.key.localeCompare(b.key,'en')).slice(0,SCHEDULE_MAX_ITEMS);
}
export function remainingSeconds(at,now){return Math.max(0,Math.ceil((Date.parse(at)-now)/1000))}
export function remainingParts(at,now){
 const s=remainingSeconds(at,now);
 return {days:Math.floor(s/86400),hours:Math.floor(s%86400/3600),minutes:Math.floor(s%3600/60),seconds:s%60};
}
export function kstDisplay(at){
 const date=new Date(at);
 const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const p=Object.fromEntries(fmt.formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return p.month+'.'+p.day+' '+p.hour+':'+p.minute;
}
