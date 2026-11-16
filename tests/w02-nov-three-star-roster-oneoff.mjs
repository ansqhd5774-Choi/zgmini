const base='https://zgmini.kr/api/earnings-calendar-display?start=2026-11-01&end=2026-11-30&importance=3';
const r=await fetch(base,{signal:AbortSignal.timeout(30000),headers:{accept:'text/html'}});
if(r.status!==200)throw new Error('PUBLIC_CALENDAR_HTTP_'+r.status);
if(r.headers.get('x-zgmini-earnings-grade-reader')!=='ZGMINI-R44-USD-CAP')throw Error('R44_PUBLIC_READER_MISMATCH');
const body=await r.text();
if(body.length<100||body.length>1e6)throw Error('PUBLIC_HTML_SIZE_INVALID');
const entries=[...body.matchAll(/<article class="mc-row mc-vendor-row" data-search="([a-z0-9.\-]{1,12}) ([^"]*)">/g)]
 .map(m=>({ticker:m[1].toUpperCase(),name:m[2].replace(/&amp;/g,'&').slice(0,180)}));
const distinct=[...new Map(entries.map(x=>[x.ticker,x])).values()].sort((a,b)=>a.ticker.localeCompare(b.ticker));
const expected=Number(r.headers.get('x-display-count'));
if(!Number.isInteger(expected)||expected!==entries.length)throw Error('COUNT_MISMATCH_'+expected+'_'+entries.length);
console.log('W02_NOV_THREE_STAR_PUBLIC_ROSTER '+JSON.stringify({rows:entries.length,distinct:distinct.length,asOf:'2026-11',roster:distinct}));
