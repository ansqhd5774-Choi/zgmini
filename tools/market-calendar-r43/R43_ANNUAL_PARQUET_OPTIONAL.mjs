// Optional adapter for already downloaded annual MarketParquet daily .parquet
// files. No network calls. hyparquet is loaded ONLY if this adapter is invoked.
// Unit tests can inject a decoder without installing anything in scratch.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareR43AnnualOfflineInput} from './R43_ANNUAL_OFFLINE_INPUT.mjs';

const DAY=/^20\d\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const NAME=/^20\d\d-\d\d-\d\d\.parquet$/;
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{throw Error(code)};
const validDay=s=>typeof s==='string'&&DAY.test(s)&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
function dateOf(value){
 if(value instanceof Date&&!Number.isNaN(value.valueOf()))return value.toISOString().slice(0,10);
 if(typeof value==='string')return value.slice(0,10);
 // Parquet DATE is a count of days since 1970-01-01. Some decoders return
 // Date objects and some preserve int32 day values.
 if(typeof value==='number'&&Number.isSafeInteger(value)){
  let millis=null;
  if(value>=10000&&value<=100000)millis=value*86400000;
  else if(value>=1e11&&value<1e14)millis=value;
  else if(value>=1e14&&value<1e17)millis=value/1000;
  return Number.isFinite(millis)?new Date(millis).toISOString().slice(0,10):null;
 }
 if(typeof value==='bigint'){
  const millis=value>100000000000000000n?Number(value/1000000n):
   value>100000000000000n?Number(value/1000n):Number(value);
  return Number.isFinite(millis)?new Date(millis).toISOString().slice(0,10):null;
 }
 return null;
}

export async function decodeDailyParquet(bytes){
 let parquetReadObjects;
 try{({parquetReadObjects}=await import('hyparquet'))}
 catch{fail('R43_ANNUAL_HYPARQUET_UNAVAILABLE')}
 const file=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 try{return await parquetReadObjects({file})}
 catch(error){
  if(/unsupported|codec|compression|zstd|brotli|lz4/i.test(String(error?.message??error)))
   fail('R43_ANNUAL_PARQUET_CODEC_NOT_SUPPORTED');
  fail('R43_ANNUAL_PARQUET_PARSE_FAILED');
 }
}

function r45FromParsed(rows,date){
 if(!Array.isArray(rows)||rows.length<1000||rows.length>100000)
  fail('R43_ANNUAL_PARQUET_ROWS_INVALID');
 const byTicker=new Map();
 for(const raw of rows){
  if(String(raw?.asset_type??'').toLowerCase()!=='stock')continue;
  if(dateOf(raw.date??raw.timestamp)!==date)fail('R43_ANNUAL_PARQUET_MIXED_DATES');
  const ticker=String(raw?.symbol??'').trim().toUpperCase();
  const close=Number(raw?.close),volume=Number(raw?.volume);
  if(!TICKER.test(ticker)||!Number.isFinite(close)||close<=0||
   !Number.isFinite(volume)||volume<0||volume>1e15)continue;
  const previous=byTicker.get(ticker);
  if(previous&&(previous.close!==close||previous.volume!==volume))
   fail('R43_ANNUAL_PARQUET_DUPLICATE_CONFLICT');
  byTicker.set(ticker,{ticker,close,volume});
 }
 if(byTicker.size<2000||byTicker.size>25000)
  fail('R43_ANNUAL_PARQUET_STOCK_COUNT_INVALID');
 const selected=[...byTicker.values()].sort((a,b)=>a.ticker.localeCompare(b.ticker));
 return {version:1,method:'MARKET_CALENDAR_R45_FULL_STOCK_REUSE_R1',
  scope:'PC_PRIVATE_ONLY',source:'MARKETPARQUET_FREE_SAMPLE',
  sourceContract:'ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5',
  observationDate:date,priceAdjustment:'SPLIT_ADJUSTED',
  publicFeed:false,redistribution:false,providerCallsAdded:0,
  tickerCount:selected.length,rowsSha256:digest(JSON.stringify(selected)),rows:selected};
}

// Expected manifest: {version:1,method:'R43_MANUAL_MARKETPARQUET_21DAY_R1',
//  source:'MARKETPARQUET_FREE_SAMPLE',licenseUrl:'https://marketparquet.com/license',
//  manualCollection:true,derivedStatisticsAllowed:true,redistribution:false,
//  rightsReviewReference:string,files:[{date,file,sha256} x 21]}.
// This manifest records human-reviewed provenance; it does not manufacture
// rights or automatically grant permission to redistribute raw OHLCV.
export async function readManualParquetToR43Annual({
  manifestFile,universeFile,parquetDir,now=Date.now(),decoder=decodeDailyParquet,
}={}){
 if(typeof manifestFile!=='string'||!path.isAbsolute(manifestFile)||
  typeof universeFile!=='string'||!path.isAbsolute(universeFile)||
  typeof parquetDir!=='string'||!path.isAbsolute(parquetDir)||
  typeof decoder!=='function')fail('R43_ANNUAL_APPROVED_PATH_REQUIRED');
 const readJson=(name,max)=>{
  const stat=fs.lstatSync(name);
  if(!stat.isFile()||stat.size<50||stat.size>max)
   fail('R43_ANNUAL_MANIFEST_OR_UNIVERSE_FILE_INVALID');
  return JSON.parse(fs.readFileSync(name,'utf8'));
 };
 const manifest=readJson(manifestFile,100_000),universe=readJson(universeFile,8_000_000);
 if(manifest?.version!==1||manifest.method!=='R43_MANUAL_MARKETPARQUET_21DAY_R1'||
  manifest.source!=='MARKETPARQUET_FREE_SAMPLE'||
  manifest.licenseUrl!=='https://marketparquet.com/license'||
  manifest.manualCollection!==true||manifest.derivedStatisticsAllowed!==true||
  manifest.redistribution!==false||
  manifest.rightsReviewReference!==universe?.rightsReviewReference||
  !Array.isArray(manifest.files)||manifest.files.length!==21)
  fail('R43_ANNUAL_PARQUET_SOURCE_RIGHTS_OR_COUNT_INVALID');
 const dates=new Set(),snapshots=[];
 for(const entry of manifest.files){
  if(!validDay(entry?.date)||typeof entry.file!=='string'||
   !NAME.test(entry.file)||entry.file!==entry.date+'.parquet'||
   typeof entry.sha256!=='string'||!/^[a-f0-9]{64}$/i.test(entry.sha256)||
   dates.has(entry.date))fail('R43_ANNUAL_PARQUET_MANIFEST_ENTRY_INVALID');
  dates.add(entry.date);
  const full=path.join(parquetDir,entry.file),stat=fs.lstatSync(full);
  if(!stat.isFile()||stat.size<8||stat.size>8_000_000)
   fail('R43_ANNUAL_PARQUET_SIZE_OR_TYPE_INVALID');
  const bytes=fs.readFileSync(full);
  if(bytes.toString('ascii',0,4)!=='PAR1'||
   bytes.toString('ascii',bytes.length-4)!=='PAR1'||
   digest(bytes)!==entry.sha256)
   fail('R43_ANNUAL_PARQUET_MAGIC_OR_HASH_INVALID');
  snapshots.push(r45FromParsed(await decoder(bytes,entry.date),entry.date));
 }
 return prepareR43AnnualOfflineInput({snapshots,universe,now});
}
