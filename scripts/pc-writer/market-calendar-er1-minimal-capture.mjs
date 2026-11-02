// Single manual ER1 collection: at most five past NY business days.
// Does not touch Core SQLite, D1, schedules, other writers or API accounts.
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import {indexSavedER1CalendarDays} from '../../lib/market-calendar-er1-calendar-adapter.mjs';

const DEFAULT_PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const MAX_DATES=5;
const MAX_BOUNDED_DATES=50;
const MAX_BOUNDED_NEW_REQUESTS=45;
const MAX_RESPONSE_BYTES=2_000_000;
const stop=code=>{throw Error(code)};
const dateOnly=x=>x.toISOString().slice(0,10);

function newYorkDay(now){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
    year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export function recentNYBusinessDays(now,count=MAX_DATES){
  if(!Number.isFinite(now)||!Number.isInteger(count)||count<1||count>MAX_BOUNDED_DATES)
    stop('ER1_DATE_PLAN_INVALID');
  const today=newYorkDay(now),result=[];
  for(let t=Date.parse(today+'T00:00:00Z')-86400000;result.length<count;t-=86400000){
    const d=new Date(t),weekday=d.getUTCDay();
    if(weekday!==0&&weekday!==6)result.push(dateOnly(d));
  }
  return {asOf:today,dates:result};
}

function configuredKey(pcHome,env){
  const direct=env.EARNINGS_API_KEY||env.EARNINGSAPI_API_KEY;
  if(typeof direct==='string'&&direct.trim())return direct.trim();
  const providerFile=path.join(pcHome,'providers.env');
  if(!fs.existsSync(providerFile))return null;
  const parsed=parseEnv(fs.readFileSync(providerFile,'utf8'));
  for(const name of ['EARNINGS_API_KEY','EARNINGSAPI_API_KEY']){
    const val=parsed[name];if(typeof val==='string'&&val.trim())return val.trim();
  }
  return null;
}

function savedDayFile(dir,day){return path.join(dir,day+'.json')}

const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const validEvent=event=>event&&typeof event==='object'&&!Array.isArray(event)&&
  TICKER.test(event.symbol)&&Object.hasOwn(event,'eps')&&
  Object.hasOwn(event,'revenue')&&
  (event.eps===null||finite(event.eps))&&
  (event.revenue===null||(finite(event.revenue)&&event.revenue>=0));

// Diagnostics are metadata ONLY: never record a symbol, raw actual, or vendor body.
// An unsupported day remains privately saved and is excluded from score inputs.
function dayDiagnostics(saved,day,asOf){
  let failure=null;
  try{indexSavedER1CalendarDays([saved],{asOf});}
  catch(error){failure=/^ER1_[A-Z0-9_]+$/.test(error?.message??'')?
    error.message:'ER1_DAY_UNEXPECTED_INVALID';}
  if(!failure)return {valid:true};
  const counts={events:0,invalidSymbols:0,missingEPSFields:0,
    missingRevenueFields:0,invalidEPSValues:0,invalidRevenueValues:0,
    malformedEvents:0};
  for(const group of ['pre','after','notSupplied']){
    const rows=saved?.body?.[group];
    if(!Array.isArray(rows))continue;
    for(const event of rows){
      counts.events++;
      if(!event||typeof event!=='object'||Array.isArray(event)){
        counts.malformedEvents++;continue;
      }
      if(!TICKER.test(event.symbol))counts.invalidSymbols++;
      if(!Object.hasOwn(event,'eps'))counts.missingEPSFields++;
      if(!Object.hasOwn(event,'revenue'))counts.missingRevenueFields++;
      if(event.eps!==null&&!finite(event.eps))counts.invalidEPSValues++;
      if(event.revenue!==null&&(!finite(event.revenue)||event.revenue<0))
        counts.invalidRevenueValues++;
    }
  }
  return {valid:false,date:day,code:failure,...counts};
}

function savedData(file,day,asOf){
  const stat=fs.statSync(file);
  if(stat.size<20||stat.size>MAX_RESPONSE_BYTES)stop('ER1_SAVED_DAY_SIZE_INVALID');
  let saved;
  try{saved=JSON.parse(fs.readFileSync(file,'utf8'));}catch{stop('ER1_SAVED_DAY_JSON_INVALID')}
  if(saved?.body?.date!==day)stop('ER1_SAVED_DAY_MISMATCH');
  const diagnostics=dayDiagnostics(saved,day,asOf);
  if(diagnostics.valid)return {verifiedInput:saved,diagnostics};
  // A single malformed vendor value must not discard an otherwise valid day.
  // Keep the immutable raw file, reject bad rows entirely (no value coercion),
  // and validate the sanitized IN-MEMORY copy against the same strict adapter.
  if(diagnostics.code==='ER1_CALENDAR_EVENT_INVALID'){
    const filtered={...saved,body:{...saved.body}};
    let excludedEvents=0;
    for(const group of ['pre','after','notSupplied']){
      if(!Array.isArray(saved.body?.[group]))return {verifiedInput:null,diagnostics};
      filtered.body[group]=saved.body[group].filter(event=>{
        const valid=validEvent(event);
        if(!valid)excludedEvents++;
        return valid;
      });
    }
    if(excludedEvents){
      try{
        indexSavedER1CalendarDays([filtered],{asOf});
        return {verifiedInput:filtered,diagnostics:{...diagnostics,
          valid:true,recovered:true,excludedEvents}};
      }catch{} // Structural/conflict errors still quarantine the entire day.
    }
  }
  return {verifiedInput:null,diagnostics};
}

// Reuse the exact saved-row validation/recovery path for offline ER1 scoring.
// Reads private files only; it never fetches or changes a vendor response.
export {savedData as readER1SavedDay};

/** Manual, private, bounded run. A read-only verified universe is still mandatory
 * before ranking or publication. fetcher and clock are injected for local tests. */
export async function runER1MinimalCapture({pcHome=DEFAULT_PC_HOME,now=Date.now(),
  fetcher=globalThis.fetch,env=process.env,readOnly=false,
  dateCount=MAX_DATES,maxNewRequests=MAX_DATES}={}){
  if(!Number.isInteger(maxNewRequests)||maxNewRequests<0||
    maxNewRequests>MAX_BOUNDED_NEW_REQUESTS)stop('ER1_REQUEST_BUDGET_INVALID');
  const plan=recentNYBusinessDays(now,dateCount),dir=path.join(pcHome,'er1-input','days');
  const report={audit:readOnly?'ER1_SAVED_ROW_RECOVERY_R3_20261102':
    'ER1_MINIMAL_MANUAL_CAPTURE_20261102',status:'STARTED',
    asOf:plan.asOf,targetDates:plan.dates,providerRequests:0,providerRetries:0,
    dbWrites:0,d1Writes:0,coreChanges:0,scheduleChanges:0,
    newDayFiles:0,retainedDayFiles:0,savedDayCount:0,verifiedDayCount:0,
    targetedDayCount:plan.dates.length,missingDayCount:0,
    quarantinedDays:[],recoveredDays:[],excludedEvents:0,
    symbolsWithEPS:0,symbolsWithRevenue:0,uniqueSymbolsWithBoth:0,
    approvedUniverseVerified:false,publicReady:false};
  if(!fs.existsSync(pcHome))return {...report,status:'ER1_PC_HOME_MISSING_STOP'};
  if(readOnly&&!fs.existsSync(dir))
    return {...report,status:'ER1_SAVED_SNAPSHOT_MISSING_STOP'};
  if(!readOnly){
  let key=null;
  try{key=configuredKey(pcHome,env);}catch{return {...report,status:'ER1_PROVIDER_CONFIG_INVALID_STOP'}}
  // No new API request unless the existing PC configuration already owns a key.
  const missing=plan.dates.filter(day=>!fs.existsSync(savedDayFile(dir,day)));
  if(missing.length&&!key)return {...report,status:'ER1_PROVIDER_KEY_MISSING_STOP'};
  fs.mkdirSync(dir,{recursive:true});
  const lock=path.join(pcHome,'er1-input','er1-manual-capture.lock');
  let fd;
  try{fd=fs.openSync(lock,'wx');}catch{return {...report,status:'ER1_MANUAL_LOCK_HELD_STOP'}}
  try{
    for(const day of plan.dates){
      const file=savedDayFile(dir,day);
      if(fs.existsSync(file)){
        savedData(file,day,plan.asOf);report.retainedDayFiles++;continue;
      }
      if(report.providerRequests>=maxNewRequests)continue;
      // Exactly one request per missing date, never retry; 429 stops immediately.
      report.providerRequests++;
      let response;
      try{
        const endpoint=new URL('https://api.earningsapi.com/v1/calendar/earnings');
        endpoint.searchParams.set('date',day);
        endpoint.searchParams.set('apikey',key);
        response=await fetcher(endpoint.toString(),{
          headers:{Accept:'application/json'},redirect:'error',
          signal:AbortSignal.timeout(12000),
        });
      }catch{stop('ER1_PROVIDER_NETWORK_STOP')}
      if(response?.status===429)stop('ER1_PROVIDER_RATE_LIMIT_STOP');
      if(!response?.ok)stop('ER1_PROVIDER_HTTP_STOP');
      let raw;
      try{raw=await response.text();}catch{stop('ER1_PROVIDER_BODY_READ_STOP')}
      if(Buffer.byteLength(raw,'utf8')>MAX_RESPONSE_BYTES)stop('ER1_PROVIDER_BODY_TOO_LARGE');
      let body;
      try{body=JSON.parse(raw);}catch{stop('ER1_PROVIDER_JSON_INVALID')}
      if(body?.date!==day)stop('ER1_PROVIDER_DAY_MISMATCH');
      const storedAt=new Date(now).toISOString(),saved={storedAt,body};
      // Store vendor response once, BEFORE row validation. Malformed rows will
      // be quarantined by metadata and not silently refetched or scored.
      fs.writeFileSync(file,JSON.stringify(saved)+'\n',{encoding:'utf8',flag:'wx'});
      report.newDayFiles++;
    }
  }catch(error){
    // Error messages are deliberately reduced to known enums; never log URLs/keys.
    const label=String(error?.message??'');
    report.status=/^ER1_[A-Z0-9_]+$/.test(label)?label:'ER1_CAPTURE_UNEXPECTED_STOP';
  }finally{
    try{fs.closeSync(fd);}catch{report.status='ER1_MANUAL_LOCK_RELEASE_FAILED'}
    try{fs.unlinkSync(lock);}catch{report.status='ER1_MANUAL_LOCK_RELEASE_FAILED'}
  }
  }
  // Read existing private snapshots only. Even a partially interrupted run
  // reports saved data; no raw fields or symbol identifiers leave the PC.
  try{
    const verified=[];
    for(const day of plan.dates){
      const file=savedDayFile(dir,day);
      if(!fs.existsSync(file))continue;
      report.savedDayCount++;
      const {verifiedInput,diagnostics}=savedData(file,day,plan.asOf);
      if(verifiedInput){
        verified.push(verifiedInput);
        if(diagnostics.recovered){
          report.excludedEvents+=diagnostics.excludedEvents;
          report.recoveredDays.push({date:day,code:diagnostics.code,
            totalEvents:diagnostics.events,excludedEvents:diagnostics.excludedEvents,
            invalidRevenueValues:diagnostics.invalidRevenueValues,
            invalidEPSValues:diagnostics.invalidEPSValues,
            invalidSymbols:diagnostics.invalidSymbols,
            missingEPSFields:diagnostics.missingEPSFields,
            missingRevenueFields:diagnostics.missingRevenueFields});
        }
      }else report.quarantinedDays.push(diagnostics);
    }
    report.verifiedDayCount=verified.length;
    if(readOnly)report.retainedDayFiles=report.savedDayCount;
    report.missingDayCount=plan.dates.length-report.savedDayCount;
    const index=indexSavedER1CalendarDays(verified,{asOf:plan.asOf});
    for(const records of Object.values(index.releasesBySymbol)){
      const eps=records.some(x=>x.eps!==null),revenue=records.some(x=>x.revenue!==null);
      if(eps)report.symbolsWithEPS++;
      if(revenue)report.symbolsWithRevenue++;
      if(eps&&revenue)report.uniqueSymbolsWithBoth++;
    }
    if(report.status==='STARTED')report.status=report.quarantinedDays.length||
      report.excludedEvents||report.missingDayCount?
      'ER1_PRIVATE_SAMPLE_PARTIAL':report.uniqueSymbolsWithBoth?
        'ER1_PRIVATE_SAMPLE_SAVED':'ER1_PRIVATE_SAMPLE_NO_ACTUALS';
  }catch{if(report.status==='STARTED')report.status='ER1_SAVED_SAMPLE_VALIDATION_STOP'}
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const resultFile=process.argv[2];
  if(!resultFile){console.error('ER1_RESULT_PATH_REQUIRED');process.exitCode=2;}
  else{
    const readOnly=process.argv[3]==='--r3-readonly';
    const bounded=process.argv[3]==='--r4-bounded';
    if(process.argv[3]&&!readOnly&&!bounded){console.error('ER1_MODE_INVALID');process.exitCode=2;}
    else{
    // A read-only snapshot diagnostic is pinned to the user-provided R2 date.
    // It never asks the provider for new days if the user runs it later.
    const report=await runER1MinimalCapture(readOnly?{
      now:Date.parse('2026-11-02T16:00:00Z'),readOnly:true}:
      bounded?{dateCount:MAX_BOUNDED_DATES,
        maxNewRequests:MAX_BOUNDED_NEW_REQUESTS}:{});
    fs.writeFileSync(resultFile,Object.entries(report).map(([k,v])=>
      `${k.toUpperCase()}=${JSON.stringify(v)}`).join('\r\n')+'\r\n','utf8');
    console.log('STATUS='+report.status+'\nRESULT_FILE='+resultFile);
    if(report.status!=='ER1_PRIVATE_SAMPLE_PARTIAL'&&
      report.status!=='ER1_PRIVATE_SAMPLE_SAVED'&&
      report.status!=='ER1_PRIVATE_SAMPLE_NO_ACTUALS')process.exitCode=1;
    }
  }
}
