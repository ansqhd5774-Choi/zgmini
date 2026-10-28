// R46: optional, user-started, PRIVATE free-sample EOD backfill.
// Never changes the existing R167 task/ledger/raw source, or computes R32.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const ASSET='etf_daily',API='https://marketparquet.com/api/v1';
const MAX_DAYS=270,MAX_BYTES_PER_FILE=8*1024*1024;
const SHA=x=>createHash('sha256').update(x).digest('hex');
function fail(code){throw Object.assign(new Error('R46_'+code),{code:'R46_'+code});}
const dateOk=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
 !Number.isNaN(Date.parse(d+'T00:00:00Z'))&&
 new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
function urlAllowed(value){
 try{
  const u=new URL(value),h=u.hostname.toLowerCase();
  return u.protocol==='https:'&&!u.username&&!u.password&&(
   h==='marketparquet.com'||h.endsWith('.marketparquet.com')||
   h.endsWith('.r2.cloudflarestorage.com')||h.endsWith('.r2.dev'));
 }catch{return false;}
}
export function verifyNineR46Manifest(manifest,{start,end}={}){
 if(!dateOk(start)||!dateOk(end)||start>end||
  manifest?.asset_type!==ASSET||!Array.isArray(manifest.files)||
  manifest.files.length<1||manifest.files.length>MAX_DAYS)fail('FREE_MANIFEST_CONTRACT');
 const seen=new Set(),files=[];
 for(const file of manifest.files){
  const d=file?.date;
  if(!dateOk(d)||d<start||d>end||seen.has(d)||
    file.filename!==`etf_daily_${d}.parquet`||
    !Number.isInteger(file.file_size_bytes)||file.file_size_bytes<12||
    file.file_size_bytes>MAX_BYTES_PER_FILE||
    !urlAllowed(file.download_url))fail('FREE_MANIFEST_FILE');
  seen.add(d);
  files.push({date:d,size:file.file_size_bytes,url:file.download_url});
 }
 return files.sort((a,b)=>a.date.localeCompare(b.date));
}

function parquetMagic(bytes){
 return bytes.length>=12&&bytes.toString('ascii',0,4)==='PAR1'&&
  bytes.toString('ascii',bytes.length-4)==='PAR1'&&
  bytes.readUInt32LE(bytes.length-8)>0&&
  bytes.readUInt32LE(bytes.length-8)<=bytes.length-12;
}
function jsonFile(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function verifyExisting({file,auditFile,date,expectedSource,transportOnly=false}){
 const rawExists=fs.existsSync(file),auditExists=fs.existsSync(auditFile);
 if(!rawExists&&!auditExists)return false;
 if(!rawExists||!auditExists)fail('SAVED_PAIR_INCOMPLETE_'+date);
 const bytes=fs.readFileSync(file),audit=jsonFile(auditFile);
 if(!parquetMagic(bytes)||audit?.date!==date||
  audit.sha256!==SHA(bytes)||
  (transportOnly?audit.transportComplete!==true||audit.schemaValidated!==false:
   audit.complete!==true)||
  audit.source!==expectedSource)fail('SAVED_AUDIT_INVALID_'+date);
 return true;
}
function validateDataRoot(dataRoot){
 if(!fs.existsSync(dataRoot))fail('DATA_ROOT_MISSING');
 const market=path.join(dataRoot,'theme-market-history-r131');
 if(!fs.existsSync(path.join(market,'marketparquet-r165'))||
  !fs.existsSync(path.join(market,'marketparquet-r167')))fail('R45_SOURCE_ROOT_MISSING');
 return market;
}
function privatePaths(dataRoot,date){
 const root=path.join(dataRoot,'themes','legacy-nine-r46-eod-history');
 return {root,raw:path.join(root,'raw',`etf_daily_${date}.parquet`),
  audit:path.join(root,'audit',`etf_daily_${date}.audit.json`)};
}
function isAlreadySaved(dataRoot,market,date){
 const legacyRaw=path.join(market,'marketparquet-r165',`etf_daily_${date}.parquet`);
 const legacyAudit=path.join(market,'marketparquet-r167',`etf_daily_${date}.audit.json`);
 const legacy=verifyExisting({file:legacyRaw,auditFile:legacyAudit,date,
  expectedSource:SOURCE});
 const p=privatePaths(dataRoot,date);
 const own=verifyExisting({file:p.raw,auditFile:p.audit,date,
  expectedSource:SOURCE,transportOnly:true});
 return legacy||own;
}
async function getJson(url,key){
 let response;
 try{response=await fetch(url,{redirect:'error',headers:{
  Accept:'application/json',...(key?{Authorization:'Bearer '+key}:{})},
  signal:AbortSignal.timeout(15000)});
 }catch{fail('MANIFEST_NETWORK_FAILED');}
 if(response.status===401||response.status===403)fail('FREE_SAMPLE_ACCOUNT_ACCESS_REQUIRED');
 if(response.status===429)fail('FREE_SAMPLE_RATE_LIMIT_STOP');
 if(!response.ok)fail('MANIFEST_HTTP_'+response.status);
 try{return await response.json();}catch{fail('MANIFEST_JSON_INVALID');}
}
async function downloadFile(entry){
 let response;
 try{response=await fetch(entry.url,{redirect:'error',headers:{Accept:'application/octet-stream'},
  signal:AbortSignal.timeout(30000)});
 }catch{fail('FILE_NETWORK_'+entry.date);}
 if(response.status===429)fail('FILE_RATE_LIMIT_'+entry.date);
 if(!response.ok)fail('FILE_HTTP_'+response.status+'_'+entry.date);
 const expected=Number(response.headers.get('content-length')||0);
 if(expected>MAX_BYTES_PER_FILE)fail('FILE_TOO_LARGE_'+entry.date);
 const chunks=[];let size=0;
 try{for await(const c of response.body){
  size+=c.byteLength;if(size>MAX_BYTES_PER_FILE)fail('FILE_TOO_LARGE_'+entry.date);
  chunks.push(Buffer.from(c));
 }}catch(err){if(err.code)throw err;fail('FILE_STREAM_'+entry.date);}
 const bytes=Buffer.concat(chunks);
 if(bytes.length!==entry.size||!parquetMagic(bytes))fail('FILE_FORMAT_OR_SIZE_'+entry.date);
 return bytes;
}
function savePrivateFile(dataRoot,entry,bytes){
 const p=privatePaths(dataRoot,entry.date),tmp=p.raw+'.r46-'+process.pid+'.part';
 fs.mkdirSync(path.dirname(p.raw),{recursive:true});
 fs.mkdirSync(path.dirname(p.audit),{recursive:true});
 if(fs.existsSync(p.raw)||fs.existsSync(p.audit))fail('PRIVATE_FILE_RACE_'+entry.date);
 try{
  fs.writeFileSync(tmp,bytes,{flag:'wx'});
  fs.renameSync(tmp,p.raw);
  const result={date:entry.date,sha256:SHA(bytes),bytes:bytes.length,
   asset_type:ASSET,source:SOURCE,priceMode:'DAILY_SPLIT_ADJUSTED',
   transportComplete:true,schemaValidated:false,
   scope:'PRIVATE_ARCHIVE_NO_PUBLICATION',providerCalls:0};
  fs.writeFileSync(p.audit,JSON.stringify(result)+'\n',{flag:'wx'});
 }finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
function utcDay(d){return d.toISOString().slice(0,10);}
export function freeSampleWindow(now=new Date()){
 if(!(now instanceof Date)||!Number.isFinite(now.valueOf()))fail('CLOCK_INVALID');
 const end=utcDay(now);
 const start=utcDay(new Date(now.valueOf()-360*86400000));
 return {start,end};
}

export async function runNineR46Backfill({dataRoot='E:\\ZGmini\\data',now=new Date()}={}){
 const market=validateDataRoot(dataRoot),{start,end}=freeSampleWindow(now);
 const envKey=process.env.MARKETPARQUET_API_KEY?.trim();
 if(envKey&&(/\s/.test(envKey)||envKey.length>300))fail('API_KEY_ENV_FORMAT');
 const url=`${API}/manifest/${ASSET}?start=${start}&end=${end}`;
 const manifest=await getJson(url,envKey),files=verifyNineR46Manifest(manifest,{start,end});
 const result={contract:'THEME_NINE_R46_FREE_EOD_BACKFILL_PRIVATE_V1',
  status:'PRIVATE_EOD_BACKFILL_PARTIAL',start,end,
  manifestDates:files.length,reusedExisting:0,reusedR46:0,downloaded:0,
  manifestCalls:1,downloadAttempts:0,
  lastDownloadedDate:null,firstError:null,
  source:SOURCE,priceMode:'DAILY_SPLIT_ADJUSTED_NOT_R32_RAW_1H',
  r32CalculationAuthorized:false,publicationAuthorized:false,
  originalMarketParquetWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
 for(const entry of files){
  try{
   const before=privatePaths(dataRoot,entry.date);
   const existingOwn=fs.existsSync(before.raw)||fs.existsSync(before.audit);
   if(isAlreadySaved(dataRoot,market,entry.date)){
    if(existingOwn)result.reusedR46++;else result.reusedExisting++;
    continue;
   }
   result.downloadAttempts++;
   const bytes=await downloadFile(entry);
   savePrivateFile(dataRoot,entry,bytes);
   result.downloaded++;
   result.lastDownloadedDate=entry.date;
   if(result.downloaded%25===0)process.stdout.write(
    `R46_PRIVATE_DOWNLOAD_PROGRESS=${result.downloaded}/${files.length}\n`);
   // Free sample rate limit is 60 requests/min. Apply conservative pacing.
   await new Promise(resolve=>setTimeout(resolve,1200));
  }catch(err){result.firstError=err.code||'UNEXPECTED_ERROR';break;}
 }
 result.status=result.firstError?'PRIVATE_EOD_BACKFILL_STOPPED_RETAINING_VERIFIED_PARTIAL':
  'PRIVATE_EOD_BACKFILL_STORED_R32_STILL_BLOCKED';
 return result;
}
function report(outDir,result){
 if(!fs.existsSync(outDir)||!fs.statSync(outDir).isDirectory()){
  process.stderr.write('R46_REPORT_DIR_MISSING\n');return null;
 }
 const time=new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14);
 const target=path.join(outDir,`THEME_NINE_R46_FREE_EOD_BACKFILL_${time}_${process.pid}_RESULT.txt`);
 const keys=['contract','status','error','firstError','start','end','manifestDates',
  'reusedExisting','reusedR46','downloaded','manifestCalls','downloadAttempts',
  'lastDownloadedDate','source',
  'priceMode','r32CalculationAuthorized','publicationAuthorized',
  'originalMarketParquetWrites','dbWrites','d1Writes','schedulerWrites'];
 const lines=['REPORT=THEME_NINE_R46_FREE_EOD_BACKFILL',...keys.map(k=>
  k.toUpperCase()+'='+(result[k]??'NONE'))];
 fs.writeFileSync(target,lines.join('\r\n')+'\r\n',{flag:'wx'});
 return target;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let result;
 try{
  if(process.argv[2]!=='--backfill'||process.argv.length!==4)fail('USAGE');
  result=await runNineR46Backfill({dataRoot:process.env.ZGMINI_DATA_ROOT||
   'E:\\ZGmini\\data'});
 }catch(err){result={status:'STOP_R46_FREE_EOD_BACKFILL',error:err.code||'UNEXPECTED_ERROR',
  r32CalculationAuthorized:false,publicationAuthorized:false,
  originalMarketParquetWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
  process.exitCode=1;}
 const target=report(path.resolve(process.argv[3]||HERE),result);
 if(!target)process.exitCode=1;
 process.stdout.write(JSON.stringify({status:result.status,error:result.error||
  result.firstError||null,downloaded:result.downloaded??0,
  reportFile:target})+'\n');
 if(result.firstError)process.exitCode=1;
}
