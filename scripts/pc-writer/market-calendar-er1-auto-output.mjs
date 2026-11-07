// Future earnings ER1: score only complete, already-saved monthly calendar
// cohorts. This calculation performs no provider request, remote D1 write,
// scheduler change or raw-data publication. The existing run-local publisher
// transfers verified local kind='output' rows to D1.
import {earningsApiForwardDay,earningsApiNewYorkDay,earningsApiWindow,
 parseEarningsApiDay} from '../../lib/earnings-api-calendar.mjs';
import {forecastRowsFromSaved} from '../../lib/market-calendar-er1-forecast-saved-adapter.mjs';
import {scoreER1ForecastIssuers} from '../../lib/market-calendar-er1-forecast-score.mjs';
import {makeER1PublicDisplay} from '../../lib/market-calendar-er1-public-display.mjs';
import {er1MonthlyPublicKey} from '../../lib/market-calendar-er1-month-key.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const INPUT_PREFIX='release-calendar:earnings-api:';
const MONTH=/^20\d\d-(0[1-9]|1[0-2])$/;
const NOV_PRIVATE_MONTH='2026-11';
const NOV_PRIVATE_DIR='nov30-forward-days';
const MAX_PRIVATE_BYTES=2_001_024;
const bad=code=>{throw Error(code)};

// The historical November capture retained 14 immutable day responses outside
// SQLite. The normal rolling/D+30 collector stores later months in SQLite;
// never carry this one-time archive fallback into a different month.
function archivedNovemberDay(pcHome,day){
 const file=path.join(pcHome,'er1-input',NOV_PRIVATE_DIR,day+'.json');
 let stat;
 try{stat=fs.lstatSync(file);}catch(error){
  if(error?.code==='ENOENT')return null;
  bad('ER1_AUTO_PRIVATE_DAY_READ_FAILED');
 }
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<2||
  stat.size>MAX_PRIVATE_BYTES)bad('ER1_AUTO_PRIVATE_DAY_INVALID');
 let saved;
 try{saved=JSON.parse(fs.readFileSync(file,'utf8'));}
 catch{bad('ER1_AUTO_PRIVATE_DAY_INVALID');}
 const when=Date.parse(saved?.storedAt);
 if(saved?.body?.date!==day||typeof saved.storedAt!=='string'||
  !Number.isSafeInteger(when)||when<1)
  bad('ER1_AUTO_PRIVATE_DAY_INVALID');
 return {storedAt:when,body:{requestedDate:day,
  text:JSON.stringify(saved.body)}};
}

export function savedER1MonthDays(month){
 if(typeof month!=='string'||!MONTH.test(month))bad('ER1_AUTO_MONTH_INVALID');
 const [year,number]=month.split('-').map(Number);
 const length=new Date(Date.UTC(year,number,0)).getUTCDate();
 return Array.from({length},(_,index)=>`${month}-${String(index+1).padStart(2,'0')}`);
}

export function futureER1Months(now){
 if(!Number.isFinite(now))bad('ER1_AUTO_CLOCK_INVALID');
 // Only dates reached by the existing rolling and D+30 collection are eligible.
 const months=[...new Set([...earningsApiWindow(now),earningsApiForwardDay(now)]
  .map(day=>day.slice(0,7)))].sort();
 return months.filter(month=>er1MonthlyPublicKey(month)!==null);
}

async function scoreSavedMonth(store,month,asOf,now,pcHome){
 const key=er1MonthlyPublicKey(month);
 if(!key)bad('ER1_AUTO_MONTH_NOT_APPROVED');
 const savedDays=[];let privateDays=0;
 for(const day of savedER1MonthDays(month)){
  let saved=await store.readInput(INPUT_PREFIX+day);
  if(!saved&&month===NOV_PRIVATE_MONTH){
   try{saved=archivedNovemberDay(pcHome,day);}
   catch{return {month,status:'MONTH_SOURCE_INVALID',providerRequests:0};}
   if(saved)privateDays++;
  }
  if(!saved||!Number.isSafeInteger(saved.storedAt)||saved.storedAt<1||
   saved.storedAt>now+300000||saved.body?.requestedDate!==day||
   typeof saved.body.text!=='string')
   return {month,status:'SAVED_MONTH_INCOMPLETE',providerRequests:0};
  // Revalidate exact date and ticker uniqueness before using private JSON.
  try{
   parseEarningsApiDay(saved.body.text,day);
   savedDays.push({day,body:JSON.parse(saved.body.text),
    storedAt:new Date(saved.storedAt).toISOString()});
  }catch{return {month,status:'MONTH_SOURCE_INVALID',providerRequests:0};}
 }
 let prepared;
 try{prepared=forecastRowsFromSaved({savedDays,asOf,
   asOfStoredAt:new Date(now).toISOString()});}
 catch{return {month,status:'MONTH_SOURCE_INVALID',providerRequests:0};}
 // A UTC-late snapshot is not eligible for a prior NY observation day.
 if(prepared.coverage.savedDays!==savedDays.length)
  return {month,status:'PIT_INPUT_INCOMPLETE',providerRequests:0};
 if(!prepared.issuerRows.length)
  return {month,status:'NO_UPCOMING_ISSUERS',providerRequests:0};
 let scored;
 try{scored=scoreER1ForecastIssuers(prepared.issuerRows,{asOf});}
 catch{return {month,status:'MONTH_SCORING_INVALID',providerRequests:0};}
 if(scored.status!=='READY_SHADOW')
  return {month,status:'NO_SCOREABLE_EPS',providerRequests:0};
 let body;
 try{body=makeER1PublicDisplay(scored);}
 catch{return {month,status:'MONTH_PUBLIC_CONTRACT_INVALID',providerRequests:0};}
 const previous=await store.readOutput(key);
 if((Number.isSafeInteger(previous?.storedAt)&&previous.storedAt>now)||
  previous?.body?.asOf>asOf)
  return {month,status:'NEWER_OUTPUT_PRESERVED',providerRequests:0};
 if(previous&&JSON.stringify(previous.body)===JSON.stringify(body))
  return {month,status:'UNCHANGED',scoreableIssuers:body.recordCount,
   providerRequests:0};
 await store.writeOutput(key,body,now);
 const verified=await store.readOutput(key);
 if(verified?.storedAt!==now||JSON.stringify(verified.body)!==JSON.stringify(body))
  bad('ER1_AUTO_LOCAL_OUTPUT_READBACK_FAILED');
 return {month,status:'READY_OUTPUT',scoreableIssuers:body.recordCount,
  sqliteDays:savedDays.length-privateDays,privateDays,providerRequests:0};
}

export async function refreshSavedER1MonthlyOutputs({store,now=Date.now(),
 pcHome=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer')}={}){
 if(!store||typeof store.readInput!=='function'||
  typeof store.readOutput!=='function'||typeof store.writeOutput!=='function'||
  !Number.isSafeInteger(now)||now<1||typeof pcHome!=='string'||
  !path.isAbsolute(pcHome))bad('ER1_AUTO_STORE_OR_CLOCK_INVALID');
 const asOf=earningsApiNewYorkDay(now),months=[];
 for(const month of futureER1Months(now)){
  months.push(await scoreSavedMonth(store,month,asOf,now,pcHome));
 }
 return {status:months.some(x=>x.status==='READY_OUTPUT')?'UPDATED':'NO_NEW_OUTPUT',
  months,providerRequests:0};
}
