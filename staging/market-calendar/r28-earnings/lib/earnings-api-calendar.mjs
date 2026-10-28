// R29 candidate: date-bucket earnings API. Inert until a rights-approved key is
// supplied by the PC. Never treat vendor schedules as issuer-confirmed events.
export const EARNINGS_API_ENDPOINT='https://api.earningsapi.com/v1/calendar/earnings';
export const EARNINGS_API_TERMS='https://www.earningsapi.com/terms';
export const EARNINGS_API_HORIZON_DAYS=14;

const validDay=day=>/^20\d\d-\d\d-\d\d$/.test(day)&&
 !Number.isNaN(Date.parse(day+'T00:00:00Z'))&&new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;

export function earningsApiNewYorkDay(now){
 const fields=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=type=>fields.find(p=>p.type===type)?.value;
 return `${part('year')}-${part('month')}-${part('day')}`;
}

export function earningsApiWindow(now,horizonDays=EARNINGS_API_HORIZON_DAYS){
 if(!Number.isInteger(horizonDays)||horizonDays<1||horizonDays>21)throw Error('EARNINGS_API_HORIZON_INVALID');
 const first=earningsApiNewYorkDay(now);
 const midnight=Date.parse(first+'T00:00:00Z');
 return Array.from({length:horizonDays},(_,i)=>new Date(midnight+i*86400000).toISOString().slice(0,10));
}

export function validateEarningsApiRights(rights){
 // The provider allows website display, but the public D1 JSON read model can
 // constitute redistribution. Do not silently equate display with feed rights.
 if(!rights||['automatedFetch','pcStorage','commercialUse','publicDisplay','redistribution'].some(k=>rights[k]!==true)||
  !validDay(rights.reviewedAt)||typeof rights.evidenceUrl!=='string'||
  !/^https:\/\//.test(rights.evidenceUrl)||typeof rights.evidenceNote!=='string'||rights.evidenceNote.trim().length<16)
  throw Error('EARNINGS_API_RIGHTS_NOT_VERIFIED');
 return rights;
}

export function parseEarningsApiDay(text,requestedDate){
 if(!validDay(requestedDate)||typeof text!=='string'||!text.length||text.length>1000000)
  throw Error('EARNINGS_API_RESPONSE_INVALID');
 let payload;
 try{payload=JSON.parse(text);}catch{throw Error('EARNINGS_API_JSON_INVALID');}
 if(!payload||payload.date!==requestedDate)throw Error('EARNINGS_API_DATE_MISMATCH');
 const output=[];
 for(const [bucket,marketSession] of [['pre','before_market'],['after','after_market'],['notSupplied','unknown']]){
  const records=payload[bucket];
  if(!Array.isArray(records)||records.length>5000)throw Error('EARNINGS_API_BUCKET_INVALID');
  for(const row of records){
   if(!row||typeof row.symbol!=='string'||!/^[A-Z0-9.\-]{1,12}$/.test(row.symbol)||
    typeof row.name!=='string'||!row.name.trim()||row.name.length>200)
    throw Error('EARNINGS_API_ROW_INVALID');
   output.push({date:requestedDate,ticker:row.symbol,company:row.name.trim(),marketSession,
    verification:'VENDOR_UNVERIFIED',sourceUrl:'https://www.earningsapi.com/'});
  }
 }
 // A ticker cannot simultaneously be before-market and after-market.
 if(new Set(output.map(row=>row.ticker)).size!==output.length)throw Error('EARNINGS_API_DUPLICATE_TICKER');
 return output;
}

export async function collectEarningsApiWindow({store,key,now,fetchImpl,apiKey,rights,
 previous,countRequest=()=>{},horizonDays=EARNINGS_API_HORIZON_DAYS}){
 validateEarningsApiRights(rights);
 if(typeof apiKey!=='string'||apiKey.length<8||apiKey.length>256||/[\s]/.test(apiKey))
  throw Error('EARNINGS_API_KEY_MISSING');
 const dates=earningsApiWindow(now,horizonDays),today=dates[0];
 const prior=previous?.body?.sources?.earningsApi;
 const attemptKey=`${key}:earnings-api:attempt:${today}`;
 // The host Core job can run every 6 hours; API consumption remains daily.
 const persistedAttempt=await store.readInput(attemptKey);
 if(prior?.attemptedNyDay===today||persistedAttempt?.body?.attemptedNyDay===today)
  return {state:prior??{status:'SOURCE_FAILED',checkedAt:null,attemptedNyDay:today,
   publicationStatus:'HELD_UNCONFIRMED',reason:'PREVIOUS_ATTEMPT_OUTCOME_UNKNOWN'},
   providerRequests:0,skipped:true};
 // Persist the quota guard before any billable request, even if the final
 // output snapshot later fails to write. Never retry blindly within a day.
 await store.writeInput(attemptKey,{attemptedNyDay:today,sourceUrl:EARNINGS_API_ENDPOINT},now);
 const records=[];
 let providerRequests=0;
 try{
  for(const date of dates){
   const url=new URL(EARNINGS_API_ENDPOINT);
   url.searchParams.set('date',date);
   url.searchParams.set('apikey',apiKey);
   countRequest();providerRequests++;
   // Avoid accidentally revealing the key in any stored URL or thrown errors.
   const response=await fetchImpl(url.href,{signal:AbortSignal.timeout(15000),
    redirect:'error',headers:{accept:'application/json'}});
   if(!response.ok)throw Error('EARNINGS_API_HTTP_'+response.status);
   if(response.url&&response.url!==url.href)throw Error('EARNINGS_API_REDIRECT');
   const type=response.headers?.get('content-type')??'';
   if(type&&!/^application\/(?:json|[^;]+\+json)\b/i.test(type))throw Error('EARNINGS_API_CONTENT_TYPE');
   const text=await response.text();
   const rows=parseEarningsApiDay(text,date);
   // Storage is keyed by day and never contains the API credential.
   const inputKey=`${key}:earnings-api:${date}`;
   await store.writeInput(inputKey,{text,sourceUrl:EARNINGS_API_ENDPOINT,requestedDate:date},now);
   const saved=await store.readInput(inputKey);
   parseEarningsApiDay(saved?.body?.text,date);
   records.push(...rows);
  }
  return {providerRequests,skipped:false,state:{status:'READY',checkedAt:new Date(now).toISOString(),
   attemptedNyDay:today,coveredDays:dates,recordCount:records.length,
   sourceUrl:EARNINGS_API_ENDPOINT,publicationStatus:'HELD_UNCONFIRMED'}};
 }catch{
  return {providerRequests,skipped:false,state:{status:'SOURCE_FAILED',
   checkedAt:prior?.checkedAt??null,attemptedNyDay:today,
   attemptedAt:new Date(now).toISOString(),coveredDays:[],recordCount:prior?.recordCount??0,
   sourceUrl:EARNINGS_API_ENDPOINT,publicationStatus:'HELD_UNCONFIRMED'}};
 }
}
