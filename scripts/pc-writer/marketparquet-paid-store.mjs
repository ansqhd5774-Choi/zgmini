// Shared paid daily store for sector inputs and registry-driven theme provisional inputs.
// Network collection is separate from stored-only calculation. Raw bytes stay private.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {loadLocalProviders} from './local-env.mjs';
const ORIGIN='https://marketparquet.com';
const TYPES=['stock_daily','etf_daily'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=c=>{throw Object.assign(Error(c),{code:c});};
const need=(x,c)=>{if(!x)fail(c);};
export const paidRoot=base=>path.join(base,'marketparquet-paid');
export const normalizedDate=x=>x instanceof Date?x.toISOString().slice(0,10):typeof x==='string'?x.slice(0,10):Number.isInteger(x)&&x>10000&&x<100000?new Date(x*86400000).toISOString().slice(0,10):null;
const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const put=(file,bytes)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{flag:'wx'});};
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
export async function paidDecoder(){
 const resolved=createRequire(import.meta.url).resolve('hyparquet');
 const {parquetReadObjects}=await import(pathToFileURL(resolved).href);
 return bytes=>parquetReadObjects({file:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
}
export function validatePaidRows(rows,date){
 need(Array.isArray(rows)&&rows.length>0,'MP_PAID_ROWS_EMPTY');const symbols=new Set();
 for(const r of rows){need(normalizedDate(r.date??r.timestamp)===date&&typeof r.symbol==='string'&&r.symbol&&
  !symbols.has(r.symbol)&&Number.isFinite(r.close)&&r.close>0&&Number.isFinite(r.volume)&&r.volume>=0,'MP_PAID_ROWS_INVALID');symbols.add(r.symbol);}
 return rows;
}
export function readPaidDaily(base,type,date){
 need(TYPES.includes(type)&&day(date),'MP_PAID_READ_CONTRACT');
 const home=paidRoot(base),file=path.join(home,type,date+'.parquet'),receipt=json(file+'.json'),bytes=fs.readFileSync(file);
 need(receipt.schema==='ZGMINI_MP_PAID_FILE_V1'&&receipt.plan==='full'&&receipt.assetType===type&&receipt.date===date&&
  receipt.sha256===sha(bytes)&&receipt.bytes===bytes.length,'MP_PAID_STORED_SHA_MISMATCH');
 return {bytes,receipt};
}
export function readPaidProjection(base,type,date){
 const {receipt}=readPaidDaily(base,type,date),projection=json(path.join(paidRoot(base),type,date+'.parquet.rows.json'));
 need(projection.sha256===receipt.sha256&&receipt.projectionSha256===sha(fs.readFileSync(path.join(paidRoot(base),type,date+'.parquet.rows.json'))),'MP_PAID_PROJECTION_SHA_MISMATCH');return validatePaidRows(projection.rows,date);
}
export function paidDates(base,type){
 need(TYPES.includes(type),'MP_PAID_READ_CONTRACT');const dir=path.join(paidRoot(base),type);
 return fs.existsSync(dir)?fs.readdirSync(dir).flatMap(n=>/^\d{4}-\d{2}-\d{2}\.parquet\.json$/.test(n)?[n.slice(0,10)]:[]).sort():[];
}
// Existing configured/legacy theme readers use this exact archive+audit contract.
// Link only identical bytes; never overwrite a previous file or manufacture R32 raw-1h compatibility.
export function exposePaidThemeDate(base,date){
 const {bytes,receipt}=readPaidDaily(base,'etf_daily',date),dataRoot=path.dirname(base);
 const raw=path.join(dataRoot,'theme-market-history-r131','marketparquet-r165',`etf_daily_${date}.parquet`);
 const audit=path.join(dataRoot,'theme-market-history-r131','marketparquet-r167',`etf_daily_${date}.audit.json`);
 if(fs.existsSync(raw))need(sha(fs.readFileSync(raw))===receipt.sha256,'MP_PAID_LEGACY_BYTES_DIFFER');
 else put(raw,bytes);
 if(fs.existsSync(audit)){const old=json(audit);need(old.date===date&&old.sha256===receipt.sha256&&old.complete===true,'MP_PAID_LEGACY_AUDIT_DIFFER');}
 else put(audit,JSON.stringify({date,sha256:receipt.sha256,complete:true,source:'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED',paidReceipt:receipt},null,2)+'\n');
 return {date,sha256:receipt.sha256};
}
export async function readPaidEtfSeries(base,{symbols,dates,readParquet}={}){
 need(Array.isArray(symbols)&&symbols.length&&new Set(symbols).size===symbols.length,'MP_PAID_SYMBOLS_REQUIRED');
 const parse=readParquet??await paidDecoder(),series=Object.fromEntries(symbols.map(s=>[s,[]])),proofs=[];
 for(const date of dates??paidDates(base,'etf_daily')){
  const {bytes,receipt}=readPaidDaily(base,'etf_daily',date);const rows=validatePaidRows(await parse(bytes),date);
  for(const r of rows)if(Object.hasOwn(series,r.symbol))series[r.symbol].push({date,close:r.close,volume:r.volume});
  proofs.push({date,sha256:receipt.sha256});
 }
 return {series,proofs,source:'MARKETPARQUET_PAID',priceMode:'SPLIT_ADJUSTED_DAILY_CLOSE',confirmedRaw1hCompatible:false};
}
export async function collectPaidDaily(base,{start,end,maxFiles=40,assetTypes=TYPES,fetchImpl=fetch,readParquet,apiKey,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 need(day(start)&&(!end||day(end))&&(!end||start<=end)&&Number.isSafeInteger(maxFiles)&&maxFiles>0,'MP_PAID_RANGE_INVALID');
 // Preserve the existing stock+ETF default; an approved R2 archive chunk may
 // restrict collection to stock_daily without downloading unrelated ETF history.
 need(Array.isArray(assetTypes)&&assetTypes.length>0
  &&new Set(assetTypes).size===assetTypes.length
  &&assetTypes.every(type=>TYPES.includes(type)),'MP_PAID_ASSET_TYPES_INVALID');
 const selectedTypes=assetTypes.slice();
 const home=paidRoot(base);fs.mkdirSync(home,{recursive:true});const lock=path.join(home,'collection.lock');
 try{fs.writeFileSync(lock,JSON.stringify({pid:process.pid,at:new Date().toISOString()}),{flag:'wx'});}catch(e){if(e.code==='EEXIST')return {status:'RUNNING_OTHER_CONSUMER',downloaded:0};throw e;}
 const report={status:'STARTED',downloaded:0,reused:0,remaining:0,apiRequests:0,fileRequests:0,dates:{},themeDatesExposed:0,themeExposureErrors:[],d1Writes:0};
 try{
  const key=apiKey??loadLocalProviders(base).MARKETPARQUET_API_KEY;need(key,'MP_PAID_KEY_MISSING');
  const get=async route=>{await sleep(110);report.apiRequests++;const r=await fetchImpl(ORIGIN+route,{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(30000)});need(r.ok,'MP_PAID_API_HTTP_'+r.status);return r.json();};
  const assets=await get('/api/v1/assets');need(assets.plan==='full','MP_PAID_FULL_PLAN_REQUIRED');
  const parse=readParquet??await paidDecoder();
  for(const type of selectedTypes){
   const asset=assets.assets?.find(x=>x.asset_type===type);need(asset?.access==='full'&&day(asset.latest_date),'MP_PAID_ASSET_UNAVAILABLE');
   const through=end&&end<asset.latest_date?end:asset.latest_date;report.dates[type]={latestPublished:asset.latest_date,requestedThrough:through};
   // REST manifest limit is 400 files. Calendar chunks of 365 cannot exceed it.
   for(let from=start;from<=through;){
    const last=new Date(Math.min(Date.parse(through+'T00:00:00Z'),Date.parse(from+'T00:00:00Z')+364*86400000)).toISOString().slice(0,10);
    const manifest=await get(`/api/v1/manifest/${type}?start=${from}&end=${last}`);
    need(manifest.asset_type===type&&Array.isArray(manifest.files)&&manifest.files.length<=400,'MP_PAID_MANIFEST_INVALID');
    const seen=new Set();
    for(const item of manifest.files.sort((a,b)=>a.date.localeCompare(b.date))){
     const date=item.date;need(day(date)&&date>=from&&date<=last&&!seen.has(date),'MP_PAID_MANIFEST_DATE_INVALID');seen.add(date);
     const file=path.join(home,type,date+'.parquet');
     if(fs.existsSync(file+'.json')){readPaidDaily(base,type,date);report.reused++;}
     else if(report.downloaded>=maxFiles){report.remaining++;continue;}
     else{
      const url=new URL(item.download_url);need(url.protocol==='https:'&&!url.username&&!url.password&&(url.hostname==='marketparquet.com'||url.hostname.endsWith('.r2.cloudflarestorage.com')||url.hostname.endsWith('.r2.dev')),'MP_PAID_DOWNLOAD_HOST_INVALID');
      need(Number.isSafeInteger(item.file_size_bytes)&&item.file_size_bytes>=12&&item.file_size_bytes<=16000000,'MP_PAID_FILE_SIZE_INVALID');
      await sleep(110);report.fileRequests++;const r=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(30000)});need(r.ok,'MP_PAID_FILE_HTTP_'+r.status);
      const chunks=[];let total=0;for await(const part of r.body){total+=part.length;need(total<=item.file_size_bytes,'MP_PAID_SIZE_EXCEEDED');chunks.push(Buffer.from(part));}
      const bytes=Buffer.concat(chunks);need(bytes.length===item.file_size_bytes&&bytes.subarray(0,4).toString()==='PAR1'&&bytes.subarray(-4).toString()==='PAR1','MP_PAID_PARQUET_INVALID');
      const rows=validatePaidRows(await parse(bytes),date);const projectionBytes=JSON.stringify({sha256:sha(bytes),rows:rows.map(r=>({date,symbol:r.symbol,close:r.close,volume:r.volume}))})+'\n';const receipt={schema:'ZGMINI_MP_PAID_FILE_V1',plan:'full',assetType:type,date,bytes:bytes.length,rows:rows.length,sha256:sha(bytes),projectionSha256:sha(projectionBytes),collectedAt:new Date().toISOString(),priceMode:'SPLIT_ADJUSTED_DAILY_CLOSE',rawPublished:false};
      // Interrupted raw save is reusable only when the fresh authenticated download is identical.
      if(fs.existsSync(file))need(sha(fs.readFileSync(file))===receipt.sha256,'MP_PAID_ORPHAN_RAW_DIFFER');else put(file,bytes);
      if(fs.existsSync(file+'.rows.json'))need(sha(fs.readFileSync(file+'.rows.json'))===receipt.projectionSha256,'MP_PAID_ORPHAN_PROJECTION_DIFFER');else put(file+'.rows.json',projectionBytes);
      put(file+'.json',JSON.stringify(receipt,null,2)+'\n');readPaidDaily(base,type,date);report.downloaded++;
     }
     readPaidProjection(base,type,date);
     if(type==='etf_daily')try{exposePaidThemeDate(base,date);report.themeDatesExposed++;}catch(e){report.themeExposureErrors.push({date,code:/^MP_PAID_[A-Z0-9_]+$/.test(e.code??'')?e.code:'MP_PAID_THEME_EXPOSURE_FAILED'});}
    }
    from=new Date(Date.parse(last+'T00:00:00Z')+86400000).toISOString().slice(0,10);
   }
  }
  report.status=report.remaining?'RUNNING':report.themeExposureErrors.length?'PARTIAL':'STORED_READBACK_VERIFIED';
  return report;
 }finally{fs.unlinkSync(lock);}
}

export async function collectPaidCurrent(base,options={}){
 const stock=paidDates(base,'stock_daily').at(-1),etf=paidDates(base,'etf_daily').at(-1);
 // Existing paid receipts are the opt-in produced by the authorized connection.
 // An empty installation never silently revives a legacy free collector.
 if(!stock||!etf)return {status:'NOT_CONNECTED',providerRequests:0};
 return collectPaidDaily(base,{...options,start:[stock,etf].sort()[0],maxFiles:40});
}
