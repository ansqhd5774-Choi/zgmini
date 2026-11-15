// Exact, byte-for-byte excerpts from theme-space-satellite-adaptive-r2.mjs.

// The bundled source SHA and section SHA are verified at build and on CMD execution.

const EARLY_CLOSE=new Set(['2024-07-03','2024-11-29','2024-12-24','2025-07-03',
 '2025-11-28','2025-12-24','2026-11-27','2026-12-24','2027-11-26',
 '2028-07-03','2028-11-24']);

const check=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};

const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',
 day:'2-digit',hour:'2-digit',hourCycle:'h23'});

export function selectRealHourlySessions(rows){
 check(Array.isArray(rows),'SPACE_R2_BAD_HOURLY_INPUT');
 const byDay=new Map();let previous='';
 for(const bar of rows){
  check(bar&&typeof bar.timestamp==='string'&&Number.isFinite(Date.parse(bar.timestamp))&&
   typeof bar.close==='number'&&Number.isFinite(bar.close)&&bar.close>0&&
   (!previous||bar.timestamp>previous),'SPACE_R2_BAD_HOURLY_BAR');
  previous=bar.timestamp;
  const p=Object.fromEntries(ny.formatToParts(new Date(bar.timestamp))
   .filter(v=>v.type!=='literal').map(v=>[v.type,v.value]));
  const date=`${p.year}-${p.month}-${p.day}`;
  if(p.hour!==(EARLY_CLOSE.has(date)?'12':'15'))continue;
  const old=byDay.get(date);
  if(!old||bar.timestamp>old.timestamp)byDay.set(date,{date,timestamp:bar.timestamp,close:bar.close});
 }
 return [...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

