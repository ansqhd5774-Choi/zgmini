// Paid-account connection check. No operational source, DB, Task or public feed writes.
import {createHash} from 'node:crypto';
export const PAID_CONNECTION_SCHEMA='ZGMINI_MARKETPARQUET_PAID_CONNECTION_V1';
const ORIGIN='https://marketparquet.com';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const types=['stock_daily','etf_daily'];
const stop=code=>{throw Object.assign(new Error(code),{code});};
function validDate(x){return typeof x==='string'&&DATE.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;}
function downloadUrl(value){
 let u;try{u=new URL(value);}catch{stop('MP_PAID_DOWNLOAD_URL_INVALID');}
 if(u.protocol!=='https:'||u.username||u.password||
  !(u.hostname=== 'marketparquet.com'||u.hostname.endsWith('.r2.cloudflarestorage.com')||u.hostname.endsWith('.r2.dev')))
  stop('MP_PAID_DOWNLOAD_HOST_INVALID');
 return u.href;
}
export async function verifyPaidMarketParquetConnection({apiKey,fetchImpl=fetch,readParquet,now=()=>new Date()}={}){
 const report={schema:PAID_CONNECTION_SCHEMA,checkedAt:now().toISOString(),
  status:'FAILED',code:'NOT_RUN',plan:null,apiRequests:0,fileRequests:0,files:[],
  operationalWrites:0,d1Writes:0,providerKeyIncluded:false};
 try{
  if(typeof apiKey!=='string'||!apiKey.trim())stop('MP_PAID_KEY_MISSING');
  if(typeof readParquet!=='function')stop('MP_PAID_PARSER_MISSING');
  const get=async(route)=>{
   report.apiRequests++;
   const r=await fetchImpl(ORIGIN+route,{headers:{Authorization:'Bearer '+apiKey},redirect:'error',signal:AbortSignal.timeout(30000)});
   if(!r.ok)stop('MP_PAID_HTTP_'+r.status);
   return r.json();
  };
  const catalogue=await get('/api/v1/assets');
  if(catalogue?.plan!=='full')stop('MP_PAID_FULL_PLAN_NOT_CONFIRMED');
  report.plan='full';
  for(const type of types){
   const asset=catalogue.assets?.find(x=>x.asset_type===type);
   if(asset?.access!=='full'||!validDate(asset.latest_date))stop('MP_PAID_ASSET_NOT_AVAILABLE');
   const day=asset.latest_date;
   const manifest=await get('/api/v1/manifest/'+type+'?start='+day+'&end='+day);
   if(manifest?.asset_type!==type||manifest.files?.length!==1||manifest.files[0].date!==day)
    stop('MP_PAID_MANIFEST_INVALID');
   const item=manifest.files[0];
   if(!Number.isSafeInteger(item.file_size_bytes)||item.file_size_bytes<8||item.file_size_bytes>16000000)
    stop('MP_PAID_FILE_SIZE_INVALID');
   const url=downloadUrl(item.download_url);
   report.fileRequests++;
   // Signed data URLs must never receive the API credential or enter the result.
   const r=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(30000)});
   if(!r.ok)stop('MP_PAID_FILE_HTTP_'+r.status);
   const length=Number(r.headers?.get('content-length'));
   if(Number.isFinite(length)&&length>16000000)stop('MP_PAID_DOWNLOAD_TOO_LARGE');
   const reader=r.body?.getReader();if(!reader)stop('MP_PAID_DOWNLOAD_BODY_MISSING');
   const chunks=[];let bytes=0;
   try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;
    if(bytes>16000000||bytes>item.file_size_bytes){await reader.cancel();stop('MP_PAID_DOWNLOAD_TOO_LARGE');}chunks.push(Buffer.from(part.value));}}
   finally{reader.releaseLock();}
   const data=Buffer.concat(chunks);
   if(bytes!==item.file_size_bytes||data.subarray(0,4).toString()!=='PAR1'||data.subarray(-4).toString()!=='PAR1')stop('MP_PAID_PARQUET_BYTES_INVALID');
   const rows=await readParquet(data);
   if(!Array.isArray(rows)||rows.length===0)stop('MP_PAID_PARQUET_EMPTY');
   const dayOf=x=>x instanceof Date?x.toISOString().slice(0,10):String(x??'').slice(0,10);
   if(rows.some(x=>dayOf(x.date??x.timestamp)!==day||typeof x.symbol!=='string'||!x.symbol||
    !Number.isFinite(x.close)||x.close<=0||!Number.isFinite(x.volume)||x.volume<0))stop('MP_PAID_ROWS_INVALID');
   report.files.push({assetType:type,date:day,bytes,rows:rows.length,
    sha256:createHash('sha256').update(data).digest('hex')});
  }
  report.status='PASS';report.code='MP_PAID_AUTH_DOWNLOAD_PARSE_VERIFIED';
 }catch(e){
  const code=e?.code;
  report.code=typeof code==='string'&&/^MP_PAID_[A-Z0-9_]+$/.test(code)?code:'MP_PAID_TRANSPORT_OR_PARSE_FAILED';
 }
 return report;
}
