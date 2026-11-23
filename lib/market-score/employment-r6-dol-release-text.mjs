// Source-only adapter for already-extracted text of a DOL Weekly Claims release.
// This does not fetch, extract PDF bytes, store rows, or assert PIT availability.
const months = new Map(Object.entries({January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12}));
const dateFrom = (month,day,year) => {
  const m=months.get(month),d=Number(day),y=Number(year);
  if(!m||!Number.isInteger(d)||!Number.isInteger(y)||y<2000||y>2199)return null;
  const date=new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d&&date.getUTCDay()===6?date.toISOString().slice(0,10):null;
};
const numeric=(v)=>{const n=Number(String(v).replaceAll(',',''));return Number.isFinite(n)&&n>=0?n:null;};
export function parseDolWeeklyReleaseText(text,{releaseDate,expectedInitialWeekEnd}={}){
  if(typeof text!=='string'||text.length>500000||!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate??''))return {status:'HOLD',reason:'INPUT_INVALID',rows:[]};
  const s=text.replace(/\s+/g,' ');
  if(!/UNEMPLOYMENT INSURANCE WEEKLY CLAIMS/i.test(s)||!/SEASONALLY ADJUSTED DATA/i.test(s))return {status:'HOLD',reason:'RELEASE_IDENTITY_MISSING',rows:[]};
  const start=s.match(/In the week ending (January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+the advance figure for seasonally adjusted initial claims was\s+([\d,]+)[^]*?The 4-week moving average was\s+([\d,]+)/i);
  const cont=s.match(/The advance seasonally adjusted insured unemployment rate was\s+([\d.]+)\s+percent for the week ending (January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})[^]*?The advance number for seasonally adjusted insured unemployment during the week ending [^]*? was\s+([\d,]+)/i);
  if(!start||!cont)return {status:'HOLD',reason:'SERIES_MISSING',rows:[]};
  const year=Number(releaseDate.slice(0,4));
  let initialDate=dateFrom(start[1],start[2],year),continuedDate=dateFrom(cont[2],cont[3],year);\n  const continuedCountDate=dateFrom(cont[4],cont[5],year);
  // Do not guess a year across the December/January boundary.
  if(!initialDate||!continuedDate||!continuedCountDate||continuedCountDate!==continuedDate||initialDate>releaseDate||continuedDate>initialDate||
    (Date.parse(initialDate)-Date.parse(continuedDate))!==7*86400000||
    (expectedInitialWeekEnd&&initialDate!==expectedInitialWeekEnd))return {status:'HOLD',reason:'WEEK_DATE_INCONSISTENT',rows:[]};
  const values=[numeric(start[3]),numeric(start[4]),numeric(cont[6]),numeric(cont[1])];
  if(values.some(v=>v===null))return {status:'HOLD',reason:'VALUE_INVALID',rows:[]};
  const ids=['INITIAL_CLAIMS','INITIAL_CLAIMS_4W','CONTINUED_CLAIMS','INSURED_UNEMPLOYMENT_RATE'];
  return {status:'CANDIDATE_ONLY',reason:'SOURCE_TEXT_REQUIRES_ORIGINAL_BYTES_ATTESTATION',rows:ids.map((logicalSeriesId,i)=>({logicalSeriesId,observationDate:i<2?initialDate:continuedDate,value:values[i],unit:i===3?'PERCENT':'CLAIMS_COUNT',releaseDate}))};
}
