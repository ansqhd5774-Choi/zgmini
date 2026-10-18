// Presentation-only schedule hints based on documented official publication policies.
// All computed recurring dates are labelled EXPECTED, not verified releases.
// https://www.newyorkfed.org/research/policy/cmdi (monthly, last Wednesday)
// https://www.chicagofed.org/research/data/nfci/current-data (weekly, Wednesday; Thursday on holidays)
// https://www.federalreserve.gov/releases/h15/ (daily, Monday-Friday except holidays)
const holidays=new Set([
 "2026-01-01","2026-01-19","2026-02-16","2026-05-25","2026-06-19","2026-07-03","2026-09-07","2026-10-12","2026-11-11","2026-11-26","2026-12-25",
 "2027-01-01","2027-01-18","2027-02-15","2027-05-31","2027-06-18","2027-07-05","2027-09-06","2027-10-11","2027-11-11","2027-11-25","2027-12-24"
]);
const monthly=new Set(["hyCmdi","igCmdi","totalCmdi"]);
const weekly=new Set(["nfciCredit"]);
const daily=new Set(["bondVolatility","bond2y","bond5y","bond10y","bond30y"]);
const parse=s=>new Date(s+"T00:00:00Z");
const key=d=>d.toISOString().slice(0,10);
const valid=s=>typeof s==="string"&&/^20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(s)&&key(parse(s))===s;
function nextBusinessDay(date,allowToday){
 const d=parse(date);if(!allowToday)d.setUTCDate(d.getUTCDate()+1);
 for(let i=0;i<15;i++,d.setUTCDate(d.getUTCDate()+1)){
  const k=key(d);if(d.getUTCDay()!==0&&d.getUTCDay()!==6&&!holidays.has(k))return k;
 }
 return null;
}
function nextWed(date){
 const d=parse(date);
 for(let i=0;i<40;i++,d.setUTCDate(d.getUTCDate()+1)){
  if(d.getUTCDay()!==3)continue;
  // Chicago Fed weekly NFCI may shift to Thursday if a holiday affects release week.
  const proposed=nextBusinessDay(key(d),true);
  if(proposed&&proposed>=date)return proposed;
 }
 return null;
}
function nextLastWed(date){
 const dateObj=parse(date);
 for(let i=0;i<15;i++){
  const first=new Date(Date.UTC(dateObj.getUTCFullYear(),dateObj.getUTCMonth()+i+1,0));
  while(first.getUTCDay()!==3)first.setUTCDate(first.getUTCDate()-1);
  const dateKey=nextBusinessDay(key(first),true);
  if(dateKey&&dateKey>=date)return dateKey;
 }
 return null;
}
/** @param {string} id @param {string} today @param {string|null|undefined} [fromApi] */
export function creditReleaseInfo(id,today,fromApi=null){
 const cadence=monthly.has(id)?"월간":weekly.has(id)?"주간":daily.has(id)?"거래일":"—";
 if(!valid(today)||cadence==="—")return {cadence,next:null,basis:"unknown",text:"일정 미정"};
 if(valid(fromApi)&&fromApi>=today)return {cadence,next:fromApi,basis:"official",text:fromApi.slice(5).replace("-",".")+" · 공식"};
 const next=monthly.has(id)?nextLastWed(today):weekly.has(id)?nextWed(today):nextBusinessDay(today,false);
 if(!next||!["2026","2027"].includes(next.slice(0,4)))return {cadence,next:null,basis:"unknown",text:"일정 미정"};
 return {cadence,next,basis:"expected",text:next.slice(5).replace("-",".")+" · 예상"};
}
