/** R29: one authenticated provider-manifest request. No source download or writes. */
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fullMarketYearSessions} from './us-breadth-confirmed-year-inventory-r22.mjs';
import {validMarketParquetSignedUrl} from './us-breadth-confirmed-provider-manifest-r24.mjs';
import {loadLocalProviders} from './local-env.mjs';

const MANIFEST='https://marketparquet.com/api/v1/manifest/stock_daily';
const MAX_RESPONSE_BYTES=2_000_000;
const MAX_PARQUET_BYTES=30_000_000;
const fail=(status,scope={})=>({revision:'US_BREADTH_PROVIDER_AVAILABILITY_R29',
 mode:'MANIFEST_ONLY_READ_ONLY',status,providerCalls:0,downloadCalls:0,
 localWrites:0,remoteWrites:0,schedulerChanges:0,publicationAllowed:false,
 providerShaProvided:false,...scope});
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)
 &&!Number.isNaN(Date.parse(s+'T00:00:00Z'))
 &&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;

/** Provider URLs are validated but never returned to the caller or log. */
export function summarizeAvailableStockDailyManifest(body,dates){
 if(!Array.isArray(dates)||!dates.length||dates.some(d=>!isDate(d))
   ||body?.asset_type!=='stock_daily'||body.start!==dates[0]
   ||body.end!==dates.at(-1)||!Array.isArray(body.files)
   ||!Number.isSafeInteger(body.file_count)||body.file_count!==body.files.length)
  return {ok:false,status:'PROVIDER_MANIFEST_RANGE_INVALID'};
 const expected=new Set(dates),seen=new Set();
 for(const file of body.files){
  if(!isDate(file?.date)||!expected.has(file.date)||seen.has(file.date)
    ||file.filename!==`stock_daily_${file.date}.parquet`
    ||!Number.isSafeInteger(file.file_size_bytes)
    ||file.file_size_bytes<12||file.file_size_bytes>MAX_PARQUET_BYTES
    ||!validMarketParquetSignedUrl(file.download_url))
   return {ok:false,status:'PROVIDER_MANIFEST_ENTRY_INVALID'};
  seen.add(file.date);
 }
 const available=dates.filter(date=>seen.has(date));
 const missing=dates.filter(date=>!seen.has(date));
 return {ok:true,status:missing.length?'PROVIDER_YEAR_PARTIAL':'PROVIDER_YEAR_AVAILABLE',
  availableDates:available.length,missingDatesCount:missing.length,
  firstAvailableDate:available[0]??null,lastAvailableDate:available.at(-1)??null,
  firstMissingDate:missing[0]??null};
}

/** A successful manifest does not prove any file bytes, prices or publishability. */
export async function probeAvailableStockDailyYear({pcHome,apiKey=process.env.MARKETPARQUET_API_KEY,
 now=new Date(),sessionCount=250,fetchImpl=fetch}={}){
 let dates;
 try{dates=fullMarketYearSessions({now,sessionCount});}
 catch{return fail('TRADING_SESSIONS_UNAVAILABLE');}
 const scope={requestedDates:dates.length,firstDate:dates[0],lastDate:dates.at(-1)};
 if(!apiKey){
  try{apiKey=loadLocalProviders(pcHome).MARKETPARQUET_API_KEY;}catch{}
 }
 if(typeof apiKey!=='string'||!apiKey.trim())
  return fail('PROVIDER_API_KEY_NOT_CONFIGURED',scope);
 const url=new URL(MANIFEST);
 url.searchParams.set('start',dates[0]);url.searchParams.set('end',dates.at(-1));
 const attempted={...scope,providerCalls:1};
 let response;
 try{response=await fetchImpl(url,{headers:{Authorization:`Bearer ${apiKey}`},
  redirect:'manual',signal:AbortSignal.timeout(30000)});}
 catch{return fail('PROVIDER_MANIFEST_UNAVAILABLE',attempted);}
 if(response?.status===401||response?.status===403)
  return fail('PROVIDER_AUTH_OR_WINDOW_UNAVAILABLE',attempted);
 if(response?.status===429)return fail('PROVIDER_RATE_LIMITED',attempted);
 if(response?.status!==200)return fail('PROVIDER_MANIFEST_HTTP_UNAVAILABLE',attempted);
 let body;
 try{
  const hinted=Number(response.headers?.get?.('content-length'));
  if(Number.isFinite(hinted)&&hinted>MAX_RESPONSE_BYTES)
   return fail('PROVIDER_MANIFEST_TOO_LARGE',attempted);
  const raw=await response.text();
  if(Buffer.byteLength(raw)>MAX_RESPONSE_BYTES)
   return fail('PROVIDER_MANIFEST_TOO_LARGE',attempted);
  body=JSON.parse(raw);
 }catch{return fail('PROVIDER_MANIFEST_INVALID_JSON',attempted);}
 const result=summarizeAvailableStockDailyManifest(body,dates);
 if(!result.ok)return fail(result.status,attempted);
 return fail(result.status,{...attempted,availableDates:result.availableDates,
  missingDatesCount:result.missingDatesCount,
  firstAvailableDate:result.firstAvailableDate,
  lastAvailableDate:result.lastAvailableDate,
  firstMissingDate:result.firstMissingDate});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--probe-only')
  throw Error('EXPLICIT_MANIFEST_PROBE_ONLY_ARGUMENT_REQUIRED');
 const report=await probeAvailableStockDailyYear({
  pcHome:process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),
 });
 process.stdout.write(JSON.stringify(report)+'\n');
}
