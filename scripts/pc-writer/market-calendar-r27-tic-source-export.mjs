// R27: capture one official US Treasury TIC release-date HTML page only.
// This does not open the PC operational Core or modify collection/publishing.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const R27_TIC_URL='https://home.treasury.gov/data/treasury-international-capital-tic-system/release-dates-of-tic-data';
const MAX_BYTES=3*1024*1024;
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

export async function runR27TicSourceExport({now=Date.now(),url=R27_TIC_URL,fetchImpl=fetch}={}){
 if(!Number.isFinite(now))throw Error('INVALID_TIME');
 const result={audit:'MARKET_CALENDAR_R27_TIC_SOURCE_EXPORT',at:new Date(now).toISOString(),
  mode:'READ_ONLY_SINGLE_OFFICIAL_HTML_GET',url,status:'SOURCE_READ_FAILED',
  sourceReadOnly:true,coreSourceChanged:false,configChanged:false,
  schedulerChanged:false,dbChanged:false,publisherExecuted:false,
  collectionExecuted:false,gitPushed:false,forcedCollection:false,
  decision:'TIC_HTML_UNAVAILABLE_READONLY'};
 try{
  if(url!==R27_TIC_URL)throw Error('URL_NOT_ALLOWED');
  const response=await fetchImpl(url,{signal:AbortSignal.timeout(18000),
   headers:{'user-agent':'ZGMINI/1.0 (+https://zgmini.kr/about/)'} });
  result.httpStatus=response.status;
  if(!response.ok)throw Error('HTTP_NOT_OK');
  if(response.url&&response.url!==url)throw Error('REDIRECT_NOT_ALLOWED');
  const declared=response.headers?.get('content-length');
  if(declared!==null&&declared!==undefined&&declared!==''){
   const length=Number(declared);
   if(!Number.isSafeInteger(length)||length<0||length>MAX_BYTES)throw Error('SIZE_INVALID');
  }
  const raw=Buffer.from(await response.arrayBuffer());
  if(!raw.length||raw.length>MAX_BYTES)throw Error('SIZE_INVALID');
  const html=raw.toString('utf8');
  if(!/<html\b/i.test(html)||!/Release Dates of TIC Data/i.test(html)||
   !/2026/.test(html)||!/2027/.test(html)||
   !/(?:Treasury International Capital|\bTIC\b)/i.test(html)||
   !/Monthly|Quarterly/i.test(html))throw Error('NOT_RECOGNIZED_TIC_HTML');
  result.contentType=response.headers?.get('content-type')||null;
  result.bytes=raw.length;
  result.sha256=sha256(raw);
  result.officialHtmlBase64=raw.toString('base64');
  result.status='RAW_HTML_CAPTURED_NOT_APPLIED';
  result.decision='TIC_HTML_CAPTURED_READONLY';
 }catch(error){
  const known=['URL_NOT_ALLOWED','HTTP_NOT_OK','REDIRECT_NOT_ALLOWED','SIZE_INVALID','NOT_RECOGNIZED_TIC_HTML'];
  result.errorCode=known.includes(error?.message)?error.message:'NETWORK_OR_HTML_READ_FAILED';
 }
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const resultPath=process.argv[2];
 if(!resultPath){console.error('RESULT_FILE_ARGUMENT_REQUIRED');process.exitCode=2;}
 else try{
  const result=await runR27TicSourceExport();
  fs.writeFileSync(resultPath,JSON.stringify(result,null,2)+'\n','utf8');
  console.log(`R27_TIC_SOURCE=${result.decision}`);
  console.log(`RESULT_FILE=${resultPath}`);
  if(result.status!=='RAW_HTML_CAPTURED_NOT_APPLIED')process.exitCode=1;
 }catch{console.error('R27_RESULT_WRITE_FAILED');process.exitCode=2;}
}
