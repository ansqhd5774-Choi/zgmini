// R31: own-site HTML presentation of an R30 private snapshot. Never expose
// the vendor's raw JSON, earnings values or machine-readable calendar feed.
import {validateER1PublicDisplay} from './market-calendar-er1-public-display.mjs';
import {ER1_STAR3_THRESHOLD} from './market-calendar-er1-earnings-score.mjs';
import {FORECAST_METHOD,isForecastMethod} from './market-calendar-er1-forecast-score.mjs';
export const EARNINGS_API_DISPLAY_KEY='market-calendar:earnings-display-html';
// R32 presentation-only protection: issuer priority and duplicate review do not
// change the PC collector, the stored snapshot, or the provider request budget.
const CORE_TICKERS=new Set(['NVDA','AAPL','MSFT','GOOG','GOOGL','AMZN','META','TSLA','AVGO',
  // R4.1 interim issuer exceptions: validated large issuers missed by liquidity-only screening.
  'BRK.A','BRK.B','BRK-A','BRK-B','ARM','ANET','SHOP','DE']);
const issuerKey=ticker=>ticker==='GOOG'||ticker==='GOOGL'?'ALPHABET':
  ['BRK.A','BRK.B','BRK-A','BRK-B'].includes(ticker)?'BERKSHIRE':ticker;
// Do not round 96.995 up to a visually misleading 97.00 when it is <97.
const displayedScore=score=>(Math.floor(score*100)/100).toFixed(2);
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
})[char]);
const validDate=day=>typeof day==='string'&&/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(day)&&
 new Date(`${day}T00:00:00Z`).toISOString().slice(0,10)===day;
const validTicker=value=>typeof value==='string'&&/^[A-Z0-9.\-]{1,12}$/.test(value);
const sessions={before_market:'장전',after_market:'장후',unknown:'시각 미정'};

function rowHtml(event){
 if(!validDate(event.date)||!validTicker(event.ticker)||
  typeof event.company!=='string'||!event.company.trim()||event.company.length>200||
  !Object.hasOwn(sessions,event.marketSession)||event.time!==null||
  event.verification!=='VENDOR_UNVERIFIED'||event.source!=='earnings-api')
  throw Error('R31_DISPLAY_EVENT_INVALID');
 const name=escapeHtml(event.company),ticker=escapeHtml(event.ticker);
 const date=escapeHtml(event.date),session=sessions[event.marketSession];
 return `<article class="mc-row mc-vendor-row" data-search="${escapeHtml(`${event.ticker} ${event.company}`.toLowerCase())}">`+
  '<div class=mc-importance aria-label="기업 실적 점수 없음">-</div>'+
  `<div class=mc-date>${date.slice(5,7)}.${date.slice(8,10)}</div>`+
  `<time class=mc-time>${session}</time>`+
  `<span class=mc-country>미국</span>`+
  `<div class=mc-event><span>${name} (${ticker})</span><span class=mc-tag-status>예정 · 미확정</span>`+
  `<small class=mc-source>기업 실적 · EarningsAPI</small></div>`+
  `<div class=mc-number>—</div><div class="mc-number muted">—</div>`+
  `<div class="mc-number muted">—</div><div class=mc-remaining>시각 미정</div></article>`;
}

export function earningsDisplaySnapshot(projection){
 if(projection?.status!=='READY_PRIVATE'||projection.scope!=='PC_PRIVATE'||
  projection.publicDisplay!==false||projection.redistribution!==false||
  projection.publicationStatus!=='HELD_UNCONFIRMED'||
  !Array.isArray(projection.coveredDays)||projection.coveredDays.length!==14||
  !Array.isArray(projection.events)||projection.events.length!==projection.recordCount||
  typeof projection.checkedAt!=='string'||!Number.isFinite(Date.parse(projection.checkedAt)))
  throw Error('R31_DISPLAY_SOURCE_INVALID');
 const days=projection.coveredDays;
 if(new Set(days).size!==14||days.some(day=>!validDate(day)))throw Error('R31_DISPLAY_DATES_INVALID');
 const byDay=Object.fromEntries(days.map(day=>[day,[]]));
 for(const event of projection.events){
  if(!Object.hasOwn(byDay,event.date))throw Error('R31_DISPLAY_EVENT_OUT_OF_RANGE');
  byDay[event.date].push(rowHtml(event));
 }
 return {status:'READY_DISPLAY',mode:'OWN_SITE_HTML_ONLY',
  rawVendorJsonExposed:false,publicJsonFeed:false,redistribution:false,
  checkedAt:projection.checkedAt,coveredDays:[...days],
  recordCount:projection.recordCount,priorityCount:projection.priorityCount,
  byDay};
}

function parsedDisplayRow(html){
 const match=/^<article class="mc-row mc-vendor-row" data-search="([a-z0-9.\-]{1,12}) [^"]*">/.exec(html);
 const legacy=/<div class=mc-importance aria-label="중요도 [123]">★{1,3}<\/div>/.test(html);
 const missing=html.includes('<div class=mc-importance aria-label="기업 실적 점수 없음">-</div>');
 if(!match||(!legacy&&!missing)||!html.includes('<span class=mc-tag-status>예정 · 미확정</span>'))
  throw Error('R32_DISPLAY_ROW_FORMAT_INVALID');
 const ticker=match[1].toUpperCase();
 return {html,ticker,issuer:issuerKey(ticker),importance:null,score:null,
  core:CORE_TICKERS.has(ticker)};
}

const marketSession=html=>/<time class=mc-time>([^<]*)<\/time>/.exec(html)?.[1]??null;

function reviewedDisplayRows(snapshot,er1=null,dec2026Er1=null,nov2026Er1=null){
 const byDay={};const tickerDays=new Map();
 for(const day of snapshot.coveredDays){
  const rows=snapshot.byDay?.[day];
  if(!Array.isArray(rows)||rows.some(s=>typeof s!=='string'||s.length>1600))
   throw Error('R31_HTML_STORE_INVALID');
  const unique=new Map();
  for(const html of rows){
   const row=parsedDisplayRow(html),prior=unique.get(row.issuer);
   if(prior){
    // Two Alphabet share classes identify one earnings event. A different
    // ticker alone is not a conflicting session; differing times still are.
    const conflict=prior.ticker===row.ticker?prior.html!==html:
     marketSession(prior.html)!==marketSession(html);
    const preferred=prior.ticker==='GOOG'&&row.ticker==='GOOGL'?row:prior;
    unique.set(row.issuer,{...preferred,aliases:new Set([...prior.aliases,row.ticker]),
     conflictingSession:prior.conflictingSession||conflict});
   }else unique.set(row.issuer,{...row,aliases:new Set([row.ticker]),conflictingSession:false});
  }
  const active=[...unique.values()];
  // December's separately observed issuer cohort has an independent percentile
  // denominator. Do not overwrite or renormalize the existing October cohort.
  const activeER1=day>='2026-11-01'&&day<='2026-11-30'?
   // Forecasts on the as-of date may be used; actual-only rankings still need
   // a pre-event snapshot to avoid publishing post-announcement hindsight.
   nov2026Er1&&(isForecastMethod(nov2026Er1.method)?
    nov2026Er1.asOf<=day:nov2026Er1.asOf<day)?nov2026Er1:null:
   day>='2026-12-01'&&day<='2026-12-31'?
    dec2026Er1?
     (isForecastMethod(dec2026Er1.method)&&dec2026Er1.asOf>day?null:dec2026Er1):
     er1:er1;
  if(activeER1)for(const row of active){
   const grades=[...row.aliases].map(ticker=>activeER1.index.get(ticker)).filter(score=>score!==undefined);
   // A conflicting share-class score is not a valid issuer result.
   if(grades.length&&grades.every(score=>score===grades[0])){
    row.score=grades[0];row.importance=row.score>=ER1_STAR3_THRESHOLD?3:null;
    row.er1AsOf=activeER1.asOf;
    row.er1Method=activeER1.method;
   }else if(!grades.length&&isForecastMethod(activeER1.method)){
    // No saved forecast never becomes a fabricated numeric zero. Explicit
    // one-star status applies only to a verified forecast cohort.
    row.importance=1;row.er1AsOf=activeER1.asOf;
    row.er1Method=activeER1.method;
   }
  }
  byDay[day]=active.sort((a,b)=>(b.score??-1)-(a.score??-1)||Number(b.core)-Number(a.core)||a.ticker.localeCompare(b.ticker));
  for(const row of byDay[day]){
   if(!tickerDays.has(row.issuer))tickerDays.set(row.issuer,new Set());
   tickerDays.get(row.issuer).add(day);
  }
 }
 return {byDay,tickerDays};
}

function reviewedRowHtml(row,tickerDays){
 const otherDates=(tickerDays.get(row.issuer)?.size??0)>1;
 const notes=[row.core?'핵심기업':null,row.conflictingSession?'동일 날짜 정보 상충':null,
  otherDates?'여러 날짜 중복 · 확인 필요':null,'예정 · 미확정'].filter(Boolean);
 // Historical FHS/R43 stars must not leak into this column. A validated
 // forecast cohort alone may assign one star to an unscored issuer.
 const scoreMarkup=row.score===null
  ?row.importance===1&&isForecastMethod(row.er1Method)
   ?row.er1Method===FORECAST_METHOD
    ?'<div class=mc-importance aria-label="예상 EPS 점수 미산출 · 중요도 1" title="예상 EPS 자료 없음 · 별 1개">★</div>'
    :'<div class=mc-importance aria-label="예상 EPS·매출 점수 미산출 · 중요도 1" title="예상 EPS 또는 매출 자료 없음 · 별 1개">★</div>'
   :'<div class=mc-importance aria-label="기업 실적 점수 없음">-</div>'
  :`<div class=mc-importance aria-label="기업 실적 점수 ${displayedScore(row.score)}점" title="ER1 ${row.er1Method===FORECAST_METHOD?'예상 EPS':isForecastMethod(row.er1Method)?'예상 EPS·매출':'실제 EPS·매출'} · ${row.er1AsOf} 기준 · ★★★ ${ER1_STAR3_THRESHOLD}점 이상">${row.importance===3?'★★★':`${displayedScore(row.score)}점`}</div>`;
 let html=row.html.replace(/<div class=mc-importance aria-label="(?:중요도 [123]|기업 실적 점수 없음)">(?:★{1,3}|-)<\/div>/,
  scoreMarkup);
 if(row.issuer==='ALPHABET'&&row.aliases.has('GOOG')&&row.aliases.has('GOOGL'))
  html=html.replace(/ \((?:GOOG|GOOGL)\)<\/span>/,' (GOOG·GOOGL)</span>');
 if(row.issuer==='BERKSHIRE'&&row.aliases.size>1){
  const displayAliases=[...new Set([...row.aliases].map(ticker=>ticker.replace('BRK-','BRK.')))].sort();
  if(displayAliases.length>1)
   html=html.replace(/ \(BRK[.\-][AB]\)<\/span>/,` (${displayAliases.join('·')})</span>`);
 }
 html=html.replace('<span class=mc-tag-status>예정 · 미확정</span>',
  `<span class=mc-tag-status>${notes.join(' · ')}</span>`);
 // Render-only upgrade for already stored EarningsAPI HTML; no PC data rewrite.
 if(!html.includes('class="mc-kind mc-kind-earnings"'))
  html=html.replace('<span class=mc-country>미국</span>',
   '<span class=mc-country>미국</span><span class="mc-kind mc-kind-earnings">실적</span>');
 if(row.conflictingSession)html=html.replace(/<time class=mc-time>[^<]*<\/time>/,
  '<time class=mc-time>시각 미정</time>');
 return html;
}

export function earningsDisplayHtml(snapshot,{start,end,query='',importance=null,maxRows=5000}={},er1Snapshot=null,dec2026Er1Snapshot=null,nov2026Er1Snapshot=null){
 const importanceLevels=importance===null?null:Array.isArray(importance)?importance:[importance];
 if(snapshot?.status!=='READY_DISPLAY'||snapshot.mode!=='OWN_SITE_HTML_ONLY'||
  snapshot.rawVendorJsonExposed!==false||snapshot.publicJsonFeed!==false||
  snapshot.redistribution!==false||!Array.isArray(snapshot.coveredDays)||
  !validDate(start)||!validDate(end)||start>end||
  typeof query!=='string'||query.length>80||
  (importanceLevels!==null&&(!importanceLevels.length||importanceLevels.length>3||
   importanceLevels.some(level=>![1,2,3].includes(level))||new Set(importanceLevels).size!==importanceLevels.length)))throw Error('R31_HTML_REQUEST_INVALID');
 const needle=query.trim().toLowerCase();
 let count=0;const counts={},parts=[];
 // PIT is assessed per event date; a valid rolling cohort must not rewrite
 // already elapsed November events or suppress still-upcoming event scores.
 const parsedNovER1=validateER1PublicDisplay(nov2026Er1Snapshot);
 const reviewed=reviewedDisplayRows(snapshot,validateER1PublicDisplay(er1Snapshot),
  validateER1PublicDisplay(dec2026Er1Snapshot),parsedNovER1);
 for(const date of snapshot.coveredDays){
  if(date<start||date>end)continue;
  const rows=reviewed.byDay[date].filter(row=>importanceLevels===null||importanceLevels.includes(row.importance));
  const selected=needle?rows.filter(row=>{
   const attr=row.html.match(/\bdata-search="([^"]*)"/);
   return (!!attr&&attr[1].includes(escapeHtml(needle)))||
    [...row.aliases].some(alias=>alias.toLowerCase().includes(needle));
  }):rows;
  counts[date]=selected.length;
  count+=selected.length;
  if(count>maxRows)throw Error('R31_HTML_MAX_ROWS');
  if(selected.length){
   parts.push(`<div class="mc-week mc-vendor-week"><strong>${escapeHtml(date)} · 기업 실적</strong>`+
    `<span>${selected.length}개 · 제공원 예정일, 기업 확정 아님</span></div>`,
    ...selected.map(row=>reviewedRowHtml(row,reviewed.tickerDays)));
  }
 }
 return {count,counts,html:parts.join('')};
}

export function earningsDisplayResponse(snapshot,requestUrl,er1Snapshot=null,dec2026Er1Snapshot=null,nov2026Er1Snapshot=null){
 const headers={'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate',
  'x-data-source':'STORED','x-robots-tag':'noindex','x-content-type-options':'nosniff',
  'x-zgmini-earnings-grade-reader':'ZGMINI-ER1-97',
  'content-security-policy':"default-src 'none'; base-uri 'none'; form-action 'none'"};
 if(snapshot?.status!=='READY_DISPLAY')
  return new Response(null,{status:204,headers:{...headers,'cache-control':'no-store'}});
 try{
  const url=new URL(requestUrl);
  const start=url.searchParams.get('start'),end=url.searchParams.get('end');
  const query=url.searchParams.get('q')??'';
  const impactValue=url.searchParams.get('importance');
  const levels=impactValue===null?null:impactValue.split(',');
  if(levels!==null&&(!levels.length||levels.length>3||levels.some(level=>!['1','2','3'].includes(level))||new Set(levels).size!==levels.length))
   throw Error('R35_IMPORTANCE_FILTER_INVALID');
  const importance=levels===null?null:levels.map(Number);
  const selected=url.searchParams.get('day');
  const total=earningsDisplayHtml(snapshot,{start,end,query,importance},er1Snapshot,dec2026Er1Snapshot,nov2026Er1Snapshot);
  if(selected!==null&&(!validDate(selected)||selected<start||selected>end))
   throw Error('R31_HTML_SELECTED_DATE_INVALID');
  const result=selected===null?total:earningsDisplayHtml(snapshot,
   {start:selected,end:selected,query,importance},er1Snapshot,dec2026Er1Snapshot,nov2026Er1Snapshot);
  return new Response(result.html,{status:200,headers:{...headers,
   'x-display-count':String(result.count),
   'x-display-day-counts':Object.entries(total.counts).map(([day,num])=>`${day}:${num}`).join(',')}});
 }catch{
  return new Response('',{status:400,headers:{...headers,'cache-control':'no-store'}});
 }
}


