// Additive 2026-11 monthly own-site HTML snapshot. Never replaces the live 14-day feed.
export const NOV2026_EARNINGS_HTML_KEY='market-calendar:earnings-nov2026-display-html';
const DAYS=Array.from({length:30},(_,i)=>'2026-11-'+String(i+1).padStart(2,'0'));
const ticker=html=>/^<article class="mc-row mc-vendor-row" data-search="([a-z0-9.\-]{1,12}) /.exec(html)?.[1]??null;

export function validNov2026Display(value){
 if(value?.status!=='READY_DISPLAY'||value.mode!=='OWN_SITE_HTML_ONLY'||
  value.rawVendorJsonExposed!==false||value.publicJsonFeed!==false||
  value.redistribution!==false||!Array.isArray(value.coveredDays)||
  JSON.stringify(value.coveredDays)!==JSON.stringify(DAYS)||
  !value.byDay||typeof value.byDay!=='object'||Array.isArray(value.byDay)||
  Object.keys(value.byDay).length!==30||
  !Number.isInteger(value.recordCount)||value.recordCount<1||value.recordCount>5000||
  !Number.isFinite(Date.parse(value.checkedAt)))return false;
 let count=0;
 for(const day of DAYS){
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

// The current 14-day feed wins on the same date + ticker; saved November rows
// complete the rest. A stale monthly supplement cannot hide fresher live rows.
export function withNov2026Display(rolling,november){
 if(!validNov2026Display(november))return rolling;
 if(rolling?.status!=='READY_DISPLAY'||!Array.isArray(rolling.coveredDays))return november;
 const coveredDays=[...new Set([...rolling.coveredDays,...DAYS])].sort();
 const byDay={};
 for(const day of coveredDays){
  const month=Array.isArray(november.byDay[day])?november.byDay[day]:[];
  const current=Array.isArray(rolling.byDay?.[day])?rolling.byDay[day]:[];
  const chosen=new Map();
  for(const html of [...month,...current]){
   const symbol=ticker(html);
   if(symbol)chosen.set(symbol,html);
  }
  byDay[day]=[...chosen.values()];
 }
 return {...rolling,coveredDays,byDay,
  recordCount:Object.values(byDay).reduce((n,rows)=>n+rows.length,0)};
}
