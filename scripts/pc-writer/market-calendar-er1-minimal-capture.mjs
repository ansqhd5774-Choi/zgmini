// Single manual ER1 collection: at most five past NY business days.
// Does not touch Core SQLite, D1, schedules, other writers or API accounts.
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import {indexSavedER1CalendarDays} from '../../lib/market-calendar-er1-calendar-adapter.mjs';

const DEFAULT_PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const MAX_DATES=5;
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
  if(!Number.isFinite(now)||!Number.isInteger(count)||count<1||count>MAX_DATES)
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

function savedData(file,day,asOf){
  const stat=fs.statSync(file);
  if(stat.size<20||stat.size>MAX_RESPONSE_BYTES)stop('ER1_SAVED_DAY_SIZE_INVALID');
  let saved;
  try{saved=JSON.parse(fs.readFileSync(file,'utf8'));}catch{stop('ER1_SAVED_DAY_JSON_INVALID')}
  if(saved?.body?.date!==day)stop('ER1_SAVED_DAY_MISMATCH');
  indexSavedER1CalendarDays([saved],{asOf});
  return saved;
}

/** Manual, private, bounded run. A read-only verified universe is still mandatory
 * before ranking or publication. fetcher and clock are injected for local tests. */
export async function runER1MinimalCapture({pcHome=DEFAULT_PC_HOME,now=Date.now(),
  fetcher=globalThis.fetch,env=process.env}={}){
  const plan=recentNYBusinessDays(now),dir=path.join(pcHome,'er1-input','days');
  const report={audit:'ER1_MINIMAL_MANUAL_CAPTURE_20261102',status:'STARTED',
    asOf:plan.asOf,targetDates:plan.dates,providerRequests:0,providerRetries:0,
    dbWrites:0,d1Writes:0,coreChanges:0,scheduleChanges:0,
    newDayFiles:0,retainedDayFiles:0,savedDayCount:0,
    symbolsWithEPS:0,symbolsWithRevenue:0,uniqueSymbolsWithBoth:0,
    approvedUniverseVerified:false,publicReady:false};
  if(!fs.existsSync(pcHome))return {...report,status:'ER1_PC_HOME_MISSING_STOP'};
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
      indexSavedER1CalendarDays([saved],{asOf:plan.asOf});
      // Exclusive create only, in an isolated private directory. No overwrite.
      fs.writeFileSync(file,JSON.stringify(saved)+'\n',{encoding:'utf8',flag:'wx'});
      report.newDayFiles++;
    }
    const all=plan.dates.map(day=>savedData(savedDayFile(dir,day),day,plan.asOf));
    const index=indexSavedER1CalendarDays(all,{asOf:plan.asOf});
    report.savedDayCount=index.storedDayCount;
    for(const records of Object.values(index.releasesBySymbol)){
      const eps=records.some(x=>x.eps!==null),revenue=records.some(x=>x.revenue!==null);
      if(eps)report.symbolsWithEPS++;
      if(revenue)report.symbolsWithRevenue++;
      if(eps&&revenue)report.uniqueSymbolsWithBoth++;
    }
    report.status=report.uniqueSymbolsWithBoth?'ER1_PRIVATE_SAMPLE_SAVED':
      'ER1_PRIVATE_SAMPLE_NO_ACTUALS';
  }catch(error){
    // Error messages are deliberately reduced to known enums; never log URLs/keys.
    const label=String(error?.message??'');
    report.status=/^ER1_[A-Z0-9_]+$/.test(label)?label:'ER1_CAPTURE_UNEXPECTED_STOP';
  }finally{
    try{fs.closeSync(fd);}catch{report.status='ER1_MANUAL_LOCK_RELEASE_FAILED'}
    try{fs.unlinkSync(lock);}catch{report.status='ER1_MANUAL_LOCK_RELEASE_FAILED'}
  }
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const resultFile=process.argv[2];
  if(!resultFile){console.error('ER1_RESULT_PATH_REQUIRED');process.exitCode=2;}
  else{
    const report=await runER1MinimalCapture();
    fs.writeFileSync(resultFile,Object.entries(report).map(([k,v])=>
      `${k.toUpperCase()}=${JSON.stringify(v)}`).join('\r\n')+'\r\n','utf8');
    console.log('STATUS='+report.status+'\nRESULT_FILE='+resultFile);
    if(report.status!=='ER1_PRIVATE_SAMPLE_SAVED'&&
      report.status!=='ER1_PRIVATE_SAMPLE_NO_ACTUALS')process.exitCode=1;
  }
}
