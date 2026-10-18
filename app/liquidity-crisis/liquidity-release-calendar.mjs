// UI-only release calendar. These dates are US provider publication days, not
// local collector execution times or observed-data dates.
// Official policies:
// NY Fed SOFR/OBFR: https://www.newyorkfed.org/markets/reference-rates/additional-information-about-reference-rates
// OFR Repo: https://www.financialresearch.gov/short-term-funding-monitor/datasets/repo/
// NY Fed ON RRP: https://www.newyorkfed.org/markets/domestic-market-operations/monetary-policy-implementation/repo-reverse-repo-agreements
// Fed H.4.1: https://www.federalreserve.gov/releases/h41/default.htm
// Fed H.15: https://www.federalreserve.gov/releases/h15/
// Fed H.6 / 2026 dates: https://fred.stlouisfed.org/releases/calendar?rid=21&y=2026
// Federal Reserve holidays: https://www.stlouisfed.org/about-us/resources/legal-holiday-schedule
// SIFMA repo holidays: https://www.sifma.org/resources/guides-playbook/holiday-schedule
// Recurring days are EXPECTED, not independently confirmed individual releases.
const FED_HOLIDAYS=new Set([
 "2026-01-01","2026-01-19","2026-02-16","2026-05-25","2026-06-19","2026-09-07","2026-10-12","2026-11-11","2026-11-26","2026-12-25",
 "2027-01-01","2027-01-18","2027-02-15","2027-05-31","2027-07-05","2027-09-06","2027-10-11","2027-11-11","2027-11-25"
]);
const REPO_ONLY_HOLIDAYS=new Set(["2026-07-03","2027-06-18","2027-12-24"]);
const H6_CONFIRMED_2026=["2026-10-27","2026-11-24","2026-12-22"];
const MARKET_REPO=new Set(["sofrIorb","repoGap","sofrIorbRv20"]);
const DAILY=new Set(["sofrIorb","obfrIorb","repoGap","sofrIorbRv20","onRrp","bond2y","bond5y","bond10y","bond30y"]);
const WEEKLY=new Set(["bankEmergency","bankReserves","tga"]);
const cadence={sofrIorb:"거래일",obfrIorb:"거래일",repoGap:"거래일",sofrIorbRv20:"거래일",
 bankEmergency:"주간",bankReserves:"주간",tga:"주간",onRrp:"거래일",m2:"월간",
 bond2y:"거래일",bond5y:"거래일",bond10y:"거래일",bond30y:"거래일"};
const valid=d=>typeof d==="string"&&/^20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(d)&&!Number.isNaN(Date.parse(d+"T00:00:00Z"));
const parse=d=>new Date(d+"T00:00:00Z");
const key=d=>d.toISOString().slice(0,10);
function openDay(d,repo=false){
 const k=key(d),wd=d.getUTCDay();
 return wd!==0&&wd!==6&&!FED_HOLIDAYS.has(k)&&!(repo&&REPO_ONLY_HOLIDAYS.has(k));
}
function firstOpenOnOrAfter(start,repo=false){
 const date=parse(start);
 for(let i=0;i<10;i++,date.setUTCDate(date.getUTCDate()+1)){
  if(!["2026","2027"].includes(String(date.getUTCFullYear())))return null;
  if(openDay(date,repo))return key(date);
 }
 return null;
}
function fourthTuesday(year,monthZero){
 const first=new Date(Date.UTC(year,monthZero,1));
 const firstTue=1+(2-first.getUTCDay()+7)%7;
 return key(new Date(Date.UTC(year,monthZero,firstTue+21)));
}
function nextMonthly(today){
 const d=parse(today);
 for(let offset=0;offset<6;offset++){
  const year=d.getUTCFullYear(),month=d.getUTCMonth()+offset;
  const raw=fourthTuesday(year+Math.floor(month/12),month%12);
  const next=firstOpenOnOrAfter(raw);
  if(next&&next>=today)return next;
 }
 return null;
}
function nextThursday(today){
 const d=parse(today);
 for(let i=0;i<12;i++,d.setUTCDate(d.getUTCDate()+1)){
  if(d.getUTCDay()!==4)continue;
  const next=firstOpenOnOrAfter(key(d));
  if(next&&next>=today)return next;
 }
 return null;
}
/**
 * @param {string} id
 * @param {string} today KST date YYYY-MM-DD
 * @param {string|null|undefined} [fromApi] An actual, separately verified publication date.
 */
export function liquidityReleaseInfo(id,today,fromApi=null){
 const frequency=cadence[id]??"—";
 if(!valid(today))return {cadence:frequency,next:null,basis:"unknown",text:"일정 미정"};
 if(valid(fromApi)&&fromApi>=today)return {cadence:frequency,next:fromApi,basis:"official",text:fromApi.slice(5).replace("-",".")+" · 공식"};
 let next=null;
 if(DAILY.has(id)){
  const d=parse(today);d.setUTCDate(d.getUTCDate()+1);
  // Next normal publication day, NOT guaranteed source availability.
  next=firstOpenOnOrAfter(key(d),MARKET_REPO.has(id));
 } else if(WEEKLY.has(id))next=nextThursday(today);
 else if(id==="m2")next=nextMonthly(today);
 if(!next)return {cadence:frequency,next:null,basis:"unknown",text:"일정 미정"};
 const official=id==="m2"&&H6_CONFIRMED_2026.includes(next);
 return {cadence:frequency,next,basis:official?"official":"expected",text:next.slice(5).replace("-",".")+" · "+(official?"공식":"예상")};
}
