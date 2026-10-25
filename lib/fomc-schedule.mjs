import {FOMC_DATES,FOMC_SOURCE,fomcInstant} from './fomc-countdown.mjs';

// UI scheduling only. These dates were checked against the publishers on 2026-10-25.
// The existing stored calendar is authoritative when a source was refreshed recently.
// Never treat an estimated market-close anchor as a confirmed earnings release.
export const SCHEDULE_CHECKED_AT='2026-10-25';
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
const EARNINGS=[
 {id:'alphabet',name:'알파벳',logo:'alphabet',day:'2026-10-28',sourceUrl:'https://abc.xyz/investor/'},
 {id:'microsoft',name:'마이크로소프트',logo:'microsoft',day:'2026-10-28',sourceUrl:'https://news.microsoft.com/source/2026/10/07/microsoft-announces-quarterly-earnings-release-date-69/'},
 {id:'amazon',name:'아마존',logo:'amazon',day:'2026-10-29',sourceUrl:'https://press.aboutamazon.com/2026/10/amazon-com-to-webcast-third-quarter-2026-financial-results-conference-call'},
];
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
  const at=easternIso(e.day,16,0);
  const expiry=easternIso(e.day,23,59);
  rows.push({key:'earnings-'+e.id,kind:'실적',name:e.name,logo:e.logo,at,expiry,estimated:true,sourceUrl:e.sourceUrl});
 }
 return rows.filter(e=>Number.isFinite(Date.parse(e.at))&&now<Date.parse(e.expiry??e.at)).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.key.localeCompare(b.key,'en'));
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
