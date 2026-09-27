const pad=n=>String(n).padStart(2,"0");
const ymd=(y,m,d)=>`${y}-${pad(m)}-${pad(d)}`;
const utcDate=(y,m,d)=>new Date(Date.UTC(y,m-1,d));
const addDays=(date,n)=>new Date(date.getTime()+n*86400000);
const weekday=(y,m,d)=>utcDate(y,m,d).getUTCDay();
function nthWeekday(year,month,target,n){
  let d=1,count=0;
  while(d<=31){
    const x=utcDate(year,month,d);
    if(x.getUTCMonth()!==month-1)break;
    if(x.getUTCDay()===target&&++count===n)return ymd(year,month,d);
    d++;
  }
  return null;
}
function lastWeekday(year,month,target){
  const next=month===12?utcDate(year+1,1,1):utcDate(year,month+1,1);
  let d=addDays(next,-1);
  while(d.getUTCDay()!==target)d=addDays(d,-1);
  return ymd(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate());
}
function observed(year,month,day){
  const d=weekday(year,month,day);
  if(d===6){const x=addDays(utcDate(year,month,day),-1);return ymd(x.getUTCFullYear(),x.getUTCMonth()+1,x.getUTCDate());}
  if(d===0){const x=addDays(utcDate(year,month,day),1);return ymd(x.getUTCFullYear(),x.getUTCMonth()+1,x.getUTCDate());}
  return ymd(year,month,day);
}
function easter(year){
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25);
  const g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return utcDate(year,month,day);
}
export function marketHolidays(year){
  const out=new Set([
    observed(year,1,1),
    nthWeekday(year,1,1,3),
    nthWeekday(year,2,1,3),
    lastWeekday(year,5,1),
    observed(year,6,19),
    observed(year,7,4),
    nthWeekday(year,9,1,1),
    nthWeekday(year,11,4,4),
    observed(year,12,25),
  ]);
  const gf=addDays(easter(year),-2);out.add(ymd(gf.getUTCFullYear(),gf.getUTCMonth()+1,gf.getUTCDate()));
  return out;
}
export function isMarketSession(date){
  const m=String(date??"").match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return false;
  const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]),wd=weekday(y,mo,d);
  return wd!==0&&wd!==6&&!marketHolidays(y).has(date);
}
function nyParts(now){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(now);
  const o=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return {date:`${o.year}-${o.month}-${o.day}`,minutes:Number(o.hour)*60+Number(o.minute)};
}
function prevDate(date){
  const [y,m,d]=date.split("-").map(Number),x=addDays(utcDate(y,m,d),-1);return ymd(x.getUTCFullYear(),x.getUTCMonth()+1,x.getUTCDate());
}
export function latestCompletedSession(now=new Date()){
  const p=nyParts(now instanceof Date?now:new Date(now));
  let d=p.date;
  if(!isMarketSession(d)||p.minutes<16*60+15)d=prevDate(d);
  while(!isMarketSession(d))d=prevDate(d);
  return d;
}
export function countCompletedSessionsSince(observationDate,now=new Date()){
  if(!isMarketSession(observationDate))return Number.POSITIVE_INFINITY;
  const latest=latestCompletedSession(now);
  if(observationDate>=latest)return 0;
  let count=0,d=observationDate;
  for(let guard=0;guard<370;guard++){
    const [y,m,day]=d.split("-").map(Number),x=addDays(utcDate(y,m,day),1);
    d=ymd(x.getUTCFullYear(),x.getUTCMonth()+1,x.getUTCDate());
    if(d>latest)break;
    if(isMarketSession(d))count++;
  }
  return count;
}
