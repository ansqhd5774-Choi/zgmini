// One-shot read-only probe using a locally registered EarningsAPI.com key.
// No public DB mutation, no job registration, no secret in console or result.
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';

const ENDPOINT='https://api.earningsapi.com/v1/calendar/earnings';
const RESULT_NAME='MARKET_CALENDAR_R29_EARNINGSAPI_SOURCE_TEST_RESULT.txt';
const PRIORITY=new Set(['NVDA','AAPL','MSFT','GOOGL','GOOG','AMZN','META','TSLA','AVGO']);
const ERROR_CODES=new Set(['KEY_FILE_MISSING','API_KEY_MISSING','API_HTTP_401','API_HTTP_403',
 'API_HTTP_404','API_HTTP_429','API_HTTP_500','API_HTTP_502','API_HTTP_503',
 'API_UNEXPECTED_HTTP','API_RESPONSE_INVALID','API_CONTENT_TYPE_INVALID',
 'API_REDIRECT','API_EMPTY','API_DATE_MISMATCH','API_SCHEMA_INVALID','API_ROW_INVALID',
 'API_DUPLICATE_SYMBOL','API_TIMEOUT_OR_NETWORK']);

export function nyDate(timestamp){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(timestamp);
 const get=type=>parts.find(x=>x.type===type)?.value;
 return `${get('year')}-${get('month')}-${get('day')}`;
}

export function daysFromNy(timestamp,numberOfDays=14){
 const initial=Date.parse(nyDate(timestamp)+'T00:00:00Z');
 return Array.from({length:numberOfDays},(_,i)=>new Date(initial+i*86400000).toISOString().slice(0,10));
}

export function inspectDay(text,day){
 if(typeof text!=='string'||!text||text.length>1000000)throw Error('API_RESPONSE_INVALID');
 let data;try{data=JSON.parse(text);}catch{throw Error('API_RESPONSE_INVALID');}
 if(data?.date!==day)throw Error('API_DATE_MISMATCH');
 const perSession={pre:0,after:0,notSupplied:0};
 const tickers=new Set();const sampleFields=new Set();let explicitConfirmations=0;
 for(const group of Object.keys(perSession)){
  const values=data[group];
  if(!Array.isArray(values)||values.length>5000)throw Error('API_SCHEMA_INVALID');
  perSession[group]=values.length;
  for(const item of values){
   if(!item||typeof item.symbol!=='string'||!/^[-.A-Z0-9]{1,12}$/.test(item.symbol)||
    typeof item.name!=='string'||!item.name.trim())throw Error('API_ROW_INVALID');
   if(tickers.has(item.symbol))throw Error('API_DUPLICATE_SYMBOL');
   tickers.add(item.symbol);
   if(sampleFields.size<50)for(const field of Object.keys(item))sampleFields.add(field);
   if(item.confirmed===true||item.isConfirmed===true||item.status==='confirmed'||
    item.reportDateStatus==='confirmed'||item.dateStatus==='confirmed')explicitConfirmations++;
  }
 }
 return {date:day,...perSession,count:tickers.size,
  priority:[...tickers].filter(symbol=>PRIORITY.has(symbol)).sort(),
  sampleFields:[...sampleFields].sort(),explicitConfirmations};
}

export function readKey(pcHome,fsImpl=fs){
 const file=path.join(pcHome,'providers.env');
 if(!fsImpl.existsSync(file))throw Error('KEY_FILE_MISSING');
 const env=parseEnv(fsImpl.readFileSync(file,'utf8'));
 const key=env.EARNINGS_API_KEY;
 if(typeof key!=='string'||key.length<8||key.length>256||/\s/.test(key))throw Error('API_KEY_MISSING');
 return key;
}

export async function probeSource({pcHome,now=Date.now(),fetchImpl=fetch,fsImpl=fs}={}){
 let requests=0;
 const report={audit:'MARKET_CALENDAR_R29_EARNINGSAPI_SOURCE_TEST',
  atUtc:new Date(now).toISOString(),mode:'READ_ONLY',keyValueIncluded:false,
  apiEndpoint:ENDPOINT,daysPlanned:14,daysReceived:0,requests:0,
  rowsTotal:0,priorityTickers:[],confirmationFieldsObserved:0,days:[],
  result:'SOURCE_FAILED',reason:null};
 try{
  const key=readKey(pcHome,fsImpl);
  const priority=new Set();
  for(const date of daysFromNy(now,14)){
   const url=new URL(ENDPOINT);
   url.searchParams.set('date',date);url.searchParams.set('apikey',key);
   requests++;
   let response;
   try{response=await fetchImpl(url.href,{redirect:'error',signal:AbortSignal.timeout(15000),
    headers:{accept:'application/json'}});}catch{throw Error('API_TIMEOUT_OR_NETWORK');}
   if(!response.ok)throw Error(ERROR_CODES.has('API_HTTP_'+response.status)?'API_HTTP_'+response.status:'API_UNEXPECTED_HTTP');
   if(response.url&&response.url!==url.href)throw Error('API_REDIRECT');
   const type=response.headers?.get('content-type')??'';
   if(type&&!/^application\/(?:json|[^;]+\+json)\b/i.test(type))throw Error('API_CONTENT_TYPE_INVALID');
   const inspected=inspectDay(await response.text(),date);
   report.days.push({date,count:inspected.count,pre:inspected.pre,
    after:inspected.after,notSupplied:inspected.notSupplied,priority:inspected.priority});
   report.rowsTotal+=inspected.count;
   report.confirmationFieldsObserved+=inspected.explicitConfirmations;
   for(const symbol of inspected.priority)priority.add(symbol);
  }
  report.daysReceived=report.days.length;
  report.priorityTickers=[...priority].sort();
  report.result='READ_ONLY_RECEIVED';
  report.reason='VENDOR_DATES_NOT_ISSUER_CONFIRMED';
 }catch(error){
  report.result='SOURCE_FAILED';
  report.reason=ERROR_CODES.has(error.message)?error.message:'STOP_UNEXPECTED_ERROR';
  report.daysReceived=report.days.length;
 }
 report.requests=requests;
 return report;
}

export function reportText(report){
 const lines=[`AUDIT=${report.audit}`,`AT_UTC=${report.atUtc}`,
  `MODE=${report.mode}`,`KEY_VALUE_INCLUDED=NO`,`API_ENDPOINT=${report.apiEndpoint}`,
  `DAYS_PLANNED=${report.daysPlanned}`,`DAYS_RECEIVED=${report.daysReceived}`,
  `PROVIDER_REQUESTS=${report.requests}`,`ROWS_TOTAL=${report.rowsTotal}`,
  `PRIORITY_TICKERS=${report.priorityTickers.join(',')||'NONE'}`,
  `CONFIRMATION_FIELDS_OBSERVED=${report.confirmationFieldsObserved}`,
  `RESULT=${report.result}`,`REASON=${report.reason}`];
 for(const day of report.days)lines.push(`DAY=${day.date},ROWS=${day.count},PRE=${day.pre},AFTER=${day.after},UNKNOWN=${day.notSupplied},PRIORITY=${day.priority.join('|')||'NONE'}`);
 return lines.join('\r\n')+'\r\n';
}

async function main(){
 if(process.platform!=='win32')throw Error('WINDOWS_ONLY');
 const pcHome=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`;
 const report=await probeSource({pcHome});
 const output=path.join(path.dirname(fileURLToPath(import.meta.url)),RESULT_NAME);
 fs.writeFileSync(output,reportText(report),{encoding:'utf8'});
 process.stdout.write(`R29_SOURCE_TEST=${report.result}\r\n`);
 process.stdout.write('Upload the generated result TXT only. Do not upload providers.env.\r\n');
 if(report.result!=='READ_ONLY_RECEIVED')process.exitCode=2;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(()=>{process.stderr.write('R29_SOURCE_TEST=STOP_LOCAL_ERROR\r\n');process.exitCode=2;});
}
