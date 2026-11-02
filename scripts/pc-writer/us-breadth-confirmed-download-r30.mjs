/**
 * R31: opt-in, isolated stock_daily raw-byte staging for confirmed breadth R2.
 * The oldest missing comparison-baseline day does NOT block staging 250 real
 * consecutive files. It only reduces the preview to 249 actual comparisons.
 * No Core scheduler, D1, legacy R1, provisional or publication side effects.
 * A local SHA256 audit is NOT proof of provider authenticity: run independent R24.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {fullMarketYearSessions} from './us-breadth-confirmed-year-inventory-r22.mjs';
import {validateMarketParquetManifest} from './us-breadth-confirmed-provider-manifest-r24.mjs';
import {summarizeAvailableStockDailyManifest} from './us-breadth-confirmed-availability-r29.mjs';
import {loadLocalProviders} from './local-env.mjs';
import {US_FULL_MARKET_PRICE_MODE} from '../../lib/market-breadth/us-marketparquet-confirmed-public-r2.mjs';

const MANIFEST='https://marketparquet.com/api/v1/manifest/stock_daily';
const MAX_MANIFEST_BYTES=2_000_000;
const MAX_PARQUET_BYTES=30_000_000;
const MAX_YEAR_BYTES=251*MAX_PARQUET_BYTES;
const NAMESPACE='us-breadth-confirmed-r2';
const RAW_DIR='marketparquet-stock-daily';
const SOURCE='MARKETPARQUET_STOCK_DAILY_OFFICIAL_PRESIGNED';
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');

const summary=(mode,status,extra={})=>({
 revision:'US_BREADTH_CONFIRMED_DOWNLOAD_R31',mode,status,
 publicationAllowed:false,providerAuthenticityVerified:false,providerShaProvided:false,
 remoteWrites:0,schedulerChanges:0,manifestCalls:0,downloadCalls:0,
 stagedDates:0,resumedDates:0,localFileWrites:0,...extra,
});

// Consume the real fetch stream with an enforced cap; never trust Content-Length.
async function boundedBytes(response,limit){
 const rawLength=response?.headers?.get?.('content-length');
 if(rawLength!=null&&rawLength!==''&&(!/^\d+$/.test(String(rawLength))
   ||Number(rawLength)>limit))throw Error('RESPONSE_SIZE_INVALID');
 if(response?.body?.getReader){
  const reader=response.body.getReader();
  const chunks=[];let total=0;
  try{
   for(;;){
    const {done,value}=await reader.read();
    if(done)break;
    total+=value.byteLength;
    if(total>limit)throw Error('RESPONSE_TOO_LARGE');
    chunks.push(Buffer.from(value));
   }
  }catch(error){try{await reader.cancel();}catch{}throw error;}
  return Buffer.concat(chunks,total);
 }
 // The fallbacks support small, locally mocked responses in tests.
 if(typeof response?.arrayBuffer==='function'){
  const value=Buffer.from(await response.arrayBuffer());
  if(value.length>limit)throw Error('RESPONSE_TOO_LARGE');
  return value;
 }
 if(typeof response?.text==='function'){
  const value=Buffer.from(await response.text());
  if(value.length>limit)throw Error('RESPONSE_TOO_LARGE');
  return value;
 }
 throw Error('RESPONSE_BODY_UNAVAILABLE');
}

function validParquet(buffer,expected){
 return buffer.length===expected&&buffer.length>=12&&buffer.length<=MAX_PARQUET_BYTES
  &&buffer.toString('ascii',0,4)==='PAR1'
  &&buffer.toString('ascii',buffer.length-4)==='PAR1';
}

function safeExistingDirectory(location){
 try{return fs.lstatSync(location).isDirectory()&&!fs.lstatSync(location).isSymbolicLink();}
 catch{return false;}
}

function knownStagingRoot(dataRoot){
 if(typeof dataRoot!=='string'||!dataRoot.trim())return null;
 const root=path.resolve(dataRoot);
 if(root===path.parse(root).root||!safeExistingDirectory(root))return null;
 const canonicalRoot=fs.realpathSync(root);
 const parent=path.join(root,NAMESPACE);
 const folder=path.join(parent,RAW_DIR);
 // Refuse junctions/symlinks or paths that escape the pre-existing data root.
 for(const segment of [parent,folder]){
  if(fs.existsSync(segment)&&!safeExistingDirectory(segment))return null;
  if(fs.existsSync(segment)){
   const real=fs.realpathSync(segment);
   if(!real.startsWith(canonicalRoot+path.sep))return null;
  }
 }
 return {root,parent,folder};
}

function stagedPair(file,date,expected){
 const auditPath=file.replace(/\.parquet$/,'.audit.json');
 const fileExists=fs.existsSync(file),auditExists=fs.existsSync(auditPath);
 if(!fileExists&&!auditExists)return 'ABSENT';
 if(!fileExists||!auditExists)return 'CONFLICT';
 try{
  if(!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink()
    ||!fs.lstatSync(auditPath).isFile()||fs.lstatSync(auditPath).isSymbolicLink())
   return 'CONFLICT';
  const bytes=fs.readFileSync(file);
  const audit=JSON.parse(fs.readFileSync(auditPath,'utf8'));
  if(validParquet(bytes,expected)&&audit.source===SOURCE&&audit.date===date
    &&audit.sha256===hash(bytes)&&audit.bytes===bytes.length&&audit.complete===true)
   return 'VERIFIED_LOCAL';
 }catch{}
 return 'CONFLICT';
}

// Hard-linking a unique complete temporary file gives an atomic, exclusive
// (no replacement) destination on supported PC filesystems. Do not downgrade
// silently to rename/copy, which could overwrite a racing destination.
function storeExclusive(destination,bytes){
 const temporary=destination+'.r30-part-'+randomBytes(10).toString('hex');
 let created=false;
 try{
  fs.writeFileSync(temporary,bytes,{flag:'wx'});
  created=true;
  fs.linkSync(temporary,destination);
 }finally{
  if(created)fs.unlinkSync(temporary);
 }
}

/**
 * YEAR preserves the approved R31 rolling-history collector unchanged.
 * DAILY_PAIR requests only the two most recent completed NYSE sessions and is
 * separately gated for source-only acquisition. Neither mode publishes D1 or
 * changes Core; the sessionCount override is only for YEAR test fixtures.
 */
export async function stageConfirmedStockDailyR30({
 mode='PLAN_ONLY',dataRoot,pcHome,apiKey=process.env.MARKETPARQUET_API_KEY,
 now=new Date(),sessionCount=250,fetchImpl=fetch,
 collectionWindow='YEAR',allowDailyPairSourceWrite=false,
}={}){
 if(mode!=='PLAN_ONLY'&&mode!=='DOWNLOAD_STAGING')return summary(mode,'EXPLICIT_MODE_REQUIRED');
 if(!['YEAR','DAILY_PAIR'].includes(collectionWindow))
  return summary(mode,'COLLECTION_WINDOW_INVALID');
 if(collectionWindow==='DAILY_PAIR'&&mode==='DOWNLOAD_STAGING'
  &&allowDailyPairSourceWrite!==true)
  return summary(mode,'DAILY_PAIR_SOURCE_WRITE_APPROVAL_REQUIRED',{
   collectionWindow,manifestCalls:0,downloadCalls:0,localFileWrites:0});
 const windowSessionCount=collectionWindow==='DAILY_PAIR'?1:sessionCount;
 let dates;
 try{dates=fullMarketYearSessions({now,sessionCount:windowSessionCount});}
 catch{return summary(mode,'TRADING_SESSIONS_UNAVAILABLE');}
 const scope={collectionWindow,requestedDates:dates.length,
  firstDate:dates[0],lastDate:dates.at(-1)};
 if(!apiKey){try{apiKey=loadLocalProviders(pcHome).MARKETPARQUET_API_KEY;}catch{}}
 if(typeof apiKey!=='string'||!apiKey.trim())
  return summary(mode,'PROVIDER_API_KEY_NOT_CONFIGURED',scope);
 const endpoint=new URL(MANIFEST);
 endpoint.searchParams.set('start',dates[0]);
 endpoint.searchParams.set('end',dates.at(-1));
 const attempted={...scope,manifestCalls:1};
 let manifest;
 try{
  const response=await fetchImpl(endpoint,{headers:{Authorization:`Bearer ${apiKey}`},
   redirect:'manual',signal:AbortSignal.timeout(30000)});
  if(response?.status===401||response?.status===403)
   return summary(mode,'PROVIDER_AUTH_OR_WINDOW_UNAVAILABLE',attempted);
  if(response?.status===429)return summary(mode,'PROVIDER_RATE_LIMITED',attempted);
  if(response?.status!==200)return summary(mode,'PROVIDER_MANIFEST_HTTP_UNAVAILABLE',attempted);
  manifest=JSON.parse((await boundedBytes(response,MAX_MANIFEST_BYTES)).toString('utf8'));
 }catch{return summary(mode,'PROVIDER_MANIFEST_UNAVAILABLE',attempted);}
 const availability=summarizeAvailableStockDailyManifest(manifest,dates);
 if(!availability.ok)return summary(mode,availability.status,attempted);
 const available={...attempted,availableDates:availability.availableDates,
  missingDatesCount:availability.missingDatesCount,
  firstAvailableDate:availability.firstAvailableDate,
  lastAvailableDate:availability.lastAvailableDate,
  firstMissingDate:availability.firstMissingDate};
 // Daily acquisition cannot treat either half of the latest comparison pair
 // as an optional history baseline. Unlike YEAR, require both provider files.
 if(collectionWindow==='DAILY_PAIR'&&availability.missingDatesCount!==0)
  return summary(mode,'PROVIDER_LATEST_PAIR_INCOMPLETE',available);
 // YEAR: missing a single oldest baseline file changes the available number
 // of comparisons, not whether authentic 250 daily files can be collected.
 const oldestOnlyMissing=availability.missingDatesCount===1
  &&availability.firstMissingDate===dates[0]
  &&availability.availableDates===dates.length-1;
 if(availability.missingDatesCount!==0&&!oldestOnlyMissing)
  return summary(mode,'PROVIDER_YEAR_GAPPED',available);
 const selectedDates=oldestOnlyMissing?dates.slice(1):dates;
 if(selectedDates.length<windowSessionCount)
  return summary(mode,'PROVIDER_SOURCE_TOO_SHORT',available);
 // This only narrows the validation view; the actual provider response and
 // its authenticated requested range are never rewritten or represented as
 // though the provider had returned a different answer.
 const checked=validateMarketParquetManifest({...manifest,
  start:selectedDates[0],end:selectedDates.at(-1)},selectedDates);
 if(!checked.ok)return summary(mode,checked.reason,available);
 const total=checked.files.reduce((sum,item)=>sum+item.file_size_bytes,0);
 if(total>MAX_YEAR_BYTES)return summary(mode,'PROVIDER_YEAR_TOO_LARGE',available);
 available.sourceDatesToStage=selectedDates.length;
 available.comparisonPointsPossible=selectedDates.length-1;
 if(mode==='PLAN_ONLY')return summary(mode,'READY_TO_STAGE',available);

 const paths=knownStagingRoot(dataRoot);
 if(!paths)return summary(mode,'ISOLATED_DATA_ROOT_UNAVAILABLE',available);
 // Inspect every existing destination before any mutations/downloads.
 const pending=[];let resumed=0;
 for(const entry of checked.files){
  const destination=path.join(paths.folder,entry.filename);
  const state=stagedPair(destination,entry.date,entry.file_size_bytes);
  if(state==='CONFLICT')return summary(mode,'STAGING_FILE_CONFLICT',{
   ...available,firstFailDate:entry.date});
  if(state==='VERIFIED_LOCAL')resumed++;
  else pending.push({entry,destination});
 }
 const counters={...available,resumedDates:resumed,downloadCalls:0,
  localFileWrites:0,stagedDates:0};
 if(pending.length===0)return summary(mode,'STAGING_COMPLETE_LOCAL_ONLY',counters);
 try{
  // Only these two new namespace directories may be created.
  for(const dir of [paths.parent,paths.folder]){
   if(!fs.existsSync(dir))fs.mkdirSync(dir);
   if(!safeExistingDirectory(dir))throw Error('UNSAFE_STAGING_DIRECTORY');
  }
 }catch{return summary(mode,'STAGING_DIRECTORY_UNAVAILABLE',counters);}

 for(const {entry,destination} of pending){
  let raw;
  try{
   counters.downloadCalls++;
   const response=await fetchImpl(entry.download_url,{redirect:'manual',
    signal:AbortSignal.timeout(30000)});
   if(response?.status!==200)return summary(mode,'PROVIDER_SIGNED_DOWNLOAD_FAILED',{
    ...counters,firstFailDate:entry.date});
   raw=await boundedBytes(response,MAX_PARQUET_BYTES);
   if(!validParquet(raw,entry.file_size_bytes))
    return summary(mode,'PROVIDER_SIGNED_BYTES_INVALID',{
     ...counters,firstFailDate:entry.date});
  }catch{return summary(mode,'PROVIDER_SIGNED_DOWNLOAD_UNAVAILABLE',{
   ...counters,firstFailDate:entry.date});}
  try{
   const digest=hash(raw);
   storeExclusive(destination,raw);
   counters.localFileWrites++;
   const reread=fs.readFileSync(destination);
   if(hash(reread)!==digest||!validParquet(reread,entry.file_size_bytes))
    return summary(mode,'STAGING_READBACK_MISMATCH',{
     ...counters,firstFailDate:entry.date});
   const audit={revision:'US_BREADTH_CONFIRMED_DOWNLOAD_R31',source:SOURCE,
    provider:'MarketParquet',feed:'stock_daily',priceMode:US_FULL_MARKET_PRICE_MODE,
    relativePath:`${NAMESPACE}/${RAW_DIR}/${entry.filename}`,
    date:entry.date,sha256:digest,bytes:raw.length,complete:true,
    collectedAt:new Date().toISOString(),
    providerShaProvided:false,providerAuthenticityVerified:false};
   storeExclusive(destination.replace(/\.parquet$/,'.audit.json'),
    Buffer.from(JSON.stringify(audit)+'\n'));
   counters.localFileWrites++;
   counters.stagedDates++;
  }catch{return summary(mode,'STAGING_EXCLUSIVE_WRITE_FAILED',{
   ...counters,firstFailDate:entry.date});}
 }
 return summary(mode,'STAGING_COMPLETE_LOCAL_ONLY',counters);
}

/** The new daily CLI cannot enable an E: source write without separate Y. */
export function r45DailyPairCliArgs(argv,{operatorConfirmation}={}){
 if(!Array.isArray(argv)||argv.length!==1)return null;
 if(argv[0]==='--plan-only')return {mode:'PLAN_ONLY',collectionWindow:'YEAR'};
 if(argv[0]==='--download-staging')
  return {mode:'DOWNLOAD_STAGING',collectionWindow:'YEAR'};
 if(argv[0]==='--plan-latest-pair')
  return {mode:'PLAN_ONLY',collectionWindow:'DAILY_PAIR'};
 if(argv[0]==='--download-latest-pair-approved'
  &&operatorConfirmation==='Y')
  return {mode:'DOWNLOAD_STAGING',collectionWindow:'DAILY_PAIR',
   allowDailyPairSourceWrite:true};
 return null;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const cli=r45DailyPairCliArgs(process.argv.slice(2),{
  operatorConfirmation:process.env.US_BREADTH_R45_OPERATOR_CONFIRMATION});
 if(!cli)throw Error('EXPLICIT_R31_OR_APPROVED_R45_SOURCE_COLLECTION_REQUIRED');
 const report=await stageConfirmedStockDailyR30({
  ...cli,
  dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
  pcHome:process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),
 });
 process.stdout.write(JSON.stringify(report)+'\n');
}
