// Recovered pure R188 V3 scorer and historical hourly selector. No file/provider/DB writes.
// Original source SHA256: 8dca56dabe186bbc69641ce347bc5bcbc0d0a0e30e12f13dbda8ca9e2a4524f9
// Approved 12:xx selector on 1 p.m. NYSE sessions. Published through 2028:
// https://www.nyse.com/trade/hours-calendars
// This is not an evergreen calendar; revalidate future dates after 2028.
const EARLY_CLOSE=new Set(['2024-07-03','2024-11-29','2024-12-24','2025-07-03','2025-11-28','2025-12-24',
 '2026-11-27','2026-12-24','2027-11-26','2028-07-03','2028-11-24']);
const REQUIRED=628, PUBLISHED=252;
const sha=x=>createHash('sha256').update(x).digest('hex');
const validNum=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const validScore=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const fail=code=>{throw Object.assign(new Error('R188_'+code),{code:'R188_'+code});};
const isDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const parts=t=>Object.fromEntries(ny.formatToParts(new Date(t)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
const mean=a=>a.reduce((s,n)=>s+n,0)/a.length;
const std=a=>{const aMean=mean(a);return Math.sqrt(mean(a.map(x=>(x-aMean)**2)));};

// Identical R135/R158 axes, metric component weights, 252 midranks and 40:20:40.
// Computes all 252 points rather than only R158's trailing three; input >=628 prices.
export function scoreAll252(own,spy){
 if(!Array.isArray(own)||!Array.isArray(spy)||own.length!==spy.length||own.length<REQUIRED||own.some(x=>!validNum(x))||spy.some(x=>!validNum(x)))fail('INPUT_PRICES');
 const n=own.length, raw={trend:[],relativeStrength:[],volatility:[]};
 for(let i=0;i<n;i++){
  if(i>=124){const c=own[i];raw.trend[i]={m125:c/mean(own.slice(i-124,i+1))-1,r60:c/own[i-60]-1,r20:c/own[i-20]-1};}
  if(i>=125){const rel=j=>(own[i]/own[i-j]-1)-(spy[i]/spy[i-j]-1);raw.relativeStrength[i]={rs20:rel(20),rs60:rel(60),rs125:rel(125)};}
  if(i>=62){const returns=[];for(let j=i-19;j<=i;j++)returns.push(own[j]/own[j-1]-1);
   raw.volatility[i]={rv20:std(returns)*Math.sqrt(252),dsv20:Math.sqrt(252*mean(returns.map(x=>Math.min(x,0)**2))),dd63:own[i]/Math.max(...own.slice(i-62,i+1))-1};}
 }
 const specs={trend:[['m125',.5,false],['r60',.3,false],['r20',.2,false]],relativeStrength:[['rs20',.25,false],['rs60',.45,false],['rs125',.3,false]],volatility:[['rv20',.4,true],['dsv20',.35,true],['dd63',.25,false]]};
 const scores=[];
 for(let i=n-PUBLISHED;i<n;i++){
  const axes={};
  for(const [axis,spec] of Object.entries(specs)){
   const window=raw[axis].slice(i-251,i+1);
   if(window.length!==252||window.some(row=>!row||spec.some(([key])=>!Number.isFinite(row[key]))))fail('INCOMPLETE_NORMALIZATION');
   let axisScore=0;
   for(const [key,weight,invert] of spec){
    const current=raw[axis][i][key];let below=0,equal=0;
    for(const row of window){if(row[key]<current)below++;else if(row[key]===current)equal++;}
    const midrank=100*(below+.5*equal)/252;
    axisScore+=weight*(invert?100-midrank:midrank);
   }
   axes[axis]=axisScore;
  }
  const value=axes.trend*.4+axes.relativeStrength*.2+axes.volatility*.4;
  if(!validScore(value))fail('BAD_SCORE');
  scores.push(value);
 }
 return scores;
}

// NY-local 15:xx hourly proxy on normal sessions, 12:xx on NYSE 1pm closes.
// NOT the official exchange closing-auction price.
export function regularHour15Rows(rows){
 if(!Array.isArray(rows)||rows.length<REQUIRED)fail('RAW_ROWS_INCOMPLETE');
 const byDay=new Map();let previous='';
 for(const bar of rows){
  if(!Number.isFinite(Date.parse(bar?.timestamp))||!validNum(bar?.close))fail('INVALID_RAW_BAR');
  if(previous&&bar.timestamp<=previous)fail('RAW_HOUR_ORDER');
  previous=bar.timestamp;
  const p=parts(bar.timestamp),date=`${p.year}-${p.month}-${p.day}`;
  const selectedHour=EARLY_CLOSE.has(date)?'12':'15';
  if(p.hour===selectedHour){
   const old=byDay.get(date);
   if(!old||bar.timestamp>old.timestamp)byDay.set(date,{date,timestamp:bar.timestamp,close:bar.close});
  }
 }
 return [...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
