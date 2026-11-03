// Additive December 2026 HTML-only calendar; retains the live 14-day output.
export const DEC2026_EARNINGS_HTML_KEY='market-calendar:earnings-dec2026-display-html';
const days=Array.from({length:31},(_,i)=>'2026-12-'+String(i+1).padStart(2,'0'));
const ticker=html=>/^<article class="mc-row mc-vendor-row" data-search="([a-z0-9.\-]{1,12}) /.exec(html)?.[1]??null;
export function validDec2026Display(v){
 if(v?.status!=='READY_DISPLAY'||v.mode!=='OWN_SITE_HTML_ONLY'||
   v.rawVendorJsonExposed!==false||v.publicJsonFeed!==false||v.redistribution!==false||
   !Array.isArray(v.coveredDays)||JSON.stringify(v.coveredDays)!==JSON.stringify(days)||
   !v.byDay||typeof v.byDay!=='object'||Array.isArray(v.byDay)||
   Object.keys(v.byDay).length!==31||
   !Number.isInteger(v.recordCount)||v.recordCount<1||v.recordCount>1000||
   !Number.isFinite(Date.parse(v.checkedAt)))return false;
 let count=0;
 for(const day of days){
  const rows=v.byDay[day];
  if(!Array.isArray(rows))return false;
  for(const html of rows){
   if(typeof html!=='string'||html.length>1600||!ticker(html)||
     !html.endsWith('</article>'))return false;
   count++;
  }
 }
 return count===v.recordCount;
}
// A fresh rolling row wins for its ticker; retained December rows fill gaps.
// No calendar score is calculated here. The existing ER1 Reader grades every row.
export function withDec2026Display(rolling,december){
 if(!validDec2026Display(december))return rolling;
 if(rolling?.status!=='READY_DISPLAY'||!Array.isArray(rolling.coveredDays))return december;
 const coveredDays=[...new Set([...rolling.coveredDays,...days])].sort();
 const byDay={};
 for(const day of coveredDays){
  const month=Array.isArray(december.byDay[day])?december.byDay[day]:[];
  const current=Array.isArray(rolling.byDay?.[day])?rolling.byDay[day]:[];
  const chosen=new Map();
  for(const html of [...month,...current]){
   const symbol=ticker(html);
   if(symbol)chosen.set(symbol,html);
  }
  byDay[day]=[...chosen.values()];
 }
 return {...rolling,coveredDays,byDay,recordCount:Object.values(byDay).reduce((n,rows)=>n+rows.length,0)};
}
