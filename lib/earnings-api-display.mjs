// R31: own-site HTML presentation of an R30 private snapshot. Never expose
// the vendor's raw JSON, earnings values or machine-readable calendar feed.
export const EARNINGS_API_DISPLAY_KEY='market-calendar:earnings-display-html';
// R32 presentation-only protection: issuer priority and duplicate review do not
// change the PC collector, the stored snapshot, or the provider request budget.
const CORE_TICKERS=new Set(['NVDA','AAPL','MSFT','GOOG','GOOGL','AMZN','META','TSLA','AVGO']);
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
 const priority=event.priority===true;
 return `<article class="mc-row mc-vendor-row" data-search="${escapeHtml(`${event.ticker} ${event.company}`.toLowerCase())}">`+
  `<div class=mc-importance aria-label="중요도 ${priority?2:1}">${priority?'★★':'★'}</div>`+
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
 if(!match||!html.includes('<span class=mc-tag-status>예정 · 미확정</span>'))
  throw Error('R32_DISPLAY_ROW_FORMAT_INVALID');
 return {html,ticker:match[1].toUpperCase(),core:CORE_TICKERS.has(match[1].toUpperCase())};
}

function reviewedDisplayRows(snapshot){
 const byDay={};const tickerDays=new Map();
 for(const day of snapshot.coveredDays){
  const rows=snapshot.byDay?.[day];
  if(!Array.isArray(rows)||rows.some(s=>typeof s!=='string'||s.length>1600))
   throw Error('R31_HTML_STORE_INVALID');
  const unique=new Map();
  for(const html of rows){
   const row=parsedDisplayRow(html),prior=unique.get(row.ticker);
   if(prior){
    // Never pick a vendor time when conflicting entries claim the same day.
    if(prior.html!==html)unique.set(row.ticker,{...prior,conflictingSession:true});
   }else unique.set(row.ticker,{...row,conflictingSession:false});
  }
  byDay[day]=[...unique.values()].sort((a,b)=>Number(b.core)-Number(a.core)||a.ticker.localeCompare(b.ticker));
  for(const row of byDay[day]){
   if(!tickerDays.has(row.ticker))tickerDays.set(row.ticker,new Set());
   tickerDays.get(row.ticker).add(day);
  }
 }
 return {byDay,tickerDays};
}

function reviewedRowHtml(row,tickerDays){
 const otherDates=(tickerDays.get(row.ticker)?.size??0)>1;
 const notes=[row.core?'핵심기업':null,row.conflictingSession?'동일 날짜 정보 상충':null,
  otherDates?'여러 날짜 중복 · 확인 필요':null,'예정 · 미확정'].filter(Boolean);
 let html=row.html.replace('<span class=mc-tag-status>예정 · 미확정</span>',
  `<span class=mc-tag-status>${notes.join(' · ')}</span>`);
 if(row.conflictingSession)html=html.replace(/<time class=mc-time>[^<]*<\/time>/,
  '<time class=mc-time>시각 미정</time>');
 return html;
}

export function earningsDisplayHtml(snapshot,{start,end,query='',maxRows=5000}={}){
 if(snapshot?.status!=='READY_DISPLAY'||snapshot.mode!=='OWN_SITE_HTML_ONLY'||
  snapshot.rawVendorJsonExposed!==false||snapshot.publicJsonFeed!==false||
  snapshot.redistribution!==false||!Array.isArray(snapshot.coveredDays)||
  !validDate(start)||!validDate(end)||start>end||
  typeof query!=='string'||query.length>80)throw Error('R31_HTML_REQUEST_INVALID');
 const needle=query.trim().toLowerCase();
 let count=0;const counts={},parts=[];
 const reviewed=reviewedDisplayRows(snapshot);
 for(const date of snapshot.coveredDays){
  if(date<start||date>end)continue;
  const rows=reviewed.byDay[date];
  const selected=needle?rows.filter(row=>{
   const attr=row.html.match(/\bdata-search="([^"]*)"/);
   return !!attr&&attr[1].includes(escapeHtml(needle));
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

export function earningsDisplayResponse(snapshot,requestUrl){
 const headers={'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60, must-revalidate',
  'x-data-source':'STORED','x-robots-tag':'noindex','x-content-type-options':'nosniff',
  'content-security-policy':"default-src 'none'; base-uri 'none'; form-action 'none'"};
 if(snapshot?.status!=='READY_DISPLAY')
  return new Response(null,{status:204,headers:{...headers,'cache-control':'no-store'}});
 try{
  const url=new URL(requestUrl);
  const start=url.searchParams.get('start'),end=url.searchParams.get('end');
  const query=url.searchParams.get('q')??'';
  const selected=url.searchParams.get('day');
  const total=earningsDisplayHtml(snapshot,{start,end,query});
  if(selected!==null&&(!validDate(selected)||selected<start||selected>end))
   throw Error('R31_HTML_SELECTED_DATE_INVALID');
  const result=selected===null?total:earningsDisplayHtml(snapshot,{start:selected,end:selected,query});
  return new Response(result.html,{status:200,headers:{...headers,
   'x-display-count':String(result.count),
   'x-display-day-counts':Object.entries(total.counts).map(([day,num])=>`${day}:${num}`).join(',')}});
 }catch{
  return new Response('',{status:400,headers:{...headers,'cache-control':'no-store'}});
 }
}
