// Two isolated 15-day HTML-only outputs, assembled only as a consistent pair.
// The existing rolling 14-day data remains authoritative for matching tickers.
export const NOV2026_EARNINGS_HTML_H1_KEY='market-calendar:earnings-nov2026-h1-display-html';
export const NOV2026_EARNINGS_HTML_H2_KEY='market-calendar:earnings-nov2026-h2-display-html';
export const NOV2026_ER1_PUBLIC_KEY='market-calendar:earnings-nov2026-er1-score-public';
const DAYS=Array.from({length:30},(_,i)=>'2026-11-'+String(i+1).padStart(2,'0'));
const halves=[DAYS.slice(0,15),DAYS.slice(15)];
const ticker=html=>/^<article class="mc-row mc-vendor-row" data-search="([a-z0-9.\-]{1,12}) /.exec(html)?.[1]??null;

export function validNov2026HalfDisplay(value,half){
 const days=halves[half-1];
 if(!days||value?.status!=='READY_DISPLAY'||value.mode!=='OWN_SITE_HTML_ONLY'||
  value.rawVendorJsonExposed!==false||value.publicJsonFeed!==false||
  value.redistribution!==false||!Array.isArray(value.coveredDays)||
  JSON.stringify(value.coveredDays)!==JSON.stringify(days)||
  !value.byDay||typeof value.byDay!=='object'||Array.isArray(value.byDay)||
  Object.keys(value.byDay).length!==15||
  !Number.isInteger(value.recordCount)||value.recordCount<0||value.recordCount>5000||
  !Number.isFinite(Date.parse(value.checkedAt))||
  typeof value.batchId!=='string'||!/^[a-f0-9]{64}$/.test(value.batchId))return false;
 let count=0;
 for(const day of days){
  const rows=value.byDay[day];
  if(!Array.isArray(rows))return false;
  for(const html of rows){
   if(typeof html!=='string'||html.length>1600||!ticker(html)||
    !html.endsWith('</article>'))return false;
   count++;
  }
 }
 return count===value.recordCount;
}

export function withNov2026Display(rolling,h1,h2){
 // A single published half is deliberately invisible. Prevent stale+fresh
 // combinations by validating both the full-input digest and checkedAt.
 if(!validNov2026HalfDisplay(h1,1)||!validNov2026HalfDisplay(h2,2)||
  h1.batchId!==h2.batchId||h1.checkedAt!==h2.checkedAt||
  h1.recordCount+h2.recordCount<1)return rolling;
 const november={status:'READY_DISPLAY',mode:'OWN_SITE_HTML_ONLY',
  rawVendorJsonExposed:false,publicJsonFeed:false,redistribution:false,
  checkedAt:h1.checkedAt,coveredDays:DAYS,
  recordCount:h1.recordCount+h2.recordCount,byDay:{...h1.byDay,...h2.byDay}};
 if(rolling?.status!=='READY_DISPLAY'||!Array.isArray(rolling.coveredDays))return november;
 const coveredDays=[...new Set([...rolling.coveredDays,...DAYS])].sort();
 const byDay={};
 for(const day of coveredDays){
  const saved=Array.isArray(november.byDay[day])?november.byDay[day]:[];
  const current=Array.isArray(rolling.byDay?.[day])?rolling.byDay[day]:[];
  const chosen=new Map();
  for(const html of [...saved,...current]){
   const symbol=ticker(html);
   if(symbol)chosen.set(symbol,html);
  }
  byDay[day]=[...chosen.values()];
 }
 return {...rolling,coveredDays,byDay,
  recordCount:Object.values(byDay).reduce((n,rows)=>n+rows.length,0)};
}
