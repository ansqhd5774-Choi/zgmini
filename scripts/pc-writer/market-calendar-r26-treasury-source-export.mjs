// R26 Treasury: inspect ONE official weekly Treasury CUSIP release XML.
// No PC Core, Git, database, scheduler, publisher, or collection changes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const R26_TREASURY_URL='https://www.treasurydirect.gov/xml/TreasuryCUSIPRelease.xml';
const MAX_BYTES=3*1024*1024;
const sha256=data=>createHash('sha256').update(data).digest('hex');

export async function runR26TreasurySourceExport({
 now=Date.now(),url=R26_TREASURY_URL,fetchImpl=fetch
}={}){
 if(!Number.isFinite(now))throw Error('INVALID_TIME');
 const result={
  audit:'MARKET_CALENDAR_R26_TREASURY_SOURCE_EXPORT',at:new Date(now).toISOString(),
  mode:'READ_ONLY_SINGLE_OFFICIAL_XML_GET',url,status:'SOURCE_READ_FAILED',
  sourceReadOnly:true,coreSourceChanged:false,configChanged:false,
  schedulerChanged:false,dbChanged:false,publisherExecuted:false,
  collectionExecuted:false,gitPushed:false,forcedCollection:false,
  decision:'TREASURY_XML_UNAVAILABLE_READONLY'
 };
 try{
  if(url!==R26_TREASURY_URL)throw Error('URL_NOT_ALLOWED');
  const response=await fetchImpl(url,{
   signal:AbortSignal.timeout(18000),
   headers:{'user-agent':'ZGMINI/1.0 (+https://zgmini.kr/about/)',accept:'application/xml,text/xml;q=0.9'}
  });
  result.httpStatus=response.status;
  if(!response.ok)throw Error('HTTP_NOT_OK');
  if(response.url&&response.url!==url)throw Error('REDIRECT_NOT_ALLOWED');
  const declared=response.headers?.get('content-length');
  if(declared!==null&&declared!==undefined&&declared!==''){
   const length=Number(declared);
   if(!Number.isSafeInteger(length)||length<0||length>MAX_BYTES)throw Error('SIZE_INVALID');
  }
  const raw=Buffer.from(await response.arrayBuffer());
  if(raw.length<32||raw.length>MAX_BYTES)throw Error('SIZE_INVALID');
  const xml=raw.toString('utf8').replace(/^\uFEFF/,'').trim();
  if(!/^(?:<\?xml\b[^>]*>\s*)?<([A-Za-z_][\w.:-]*)\b[^>]*>/s.test(xml)||
   /<!doctype\s+html|<html\b/i.test(xml)||
   !/<\/([A-Za-z_][\w.:-]*)\s*>/.test(xml)||
   !/treasury|cusip|auction|security/i.test(xml))
   throw Error('NOT_RECOGNIZED_TREASURY_XML');
  result.contentType=response.headers?.get('content-type')||null;
  result.bytes=raw.length;
  result.sha256=sha256(raw);
  result.officialXmlBase64=raw.toString('base64');
  result.status='RAW_XML_CAPTURED_NOT_APPLIED';
  result.decision='TREASURY_XML_CAPTURED_READONLY';
 }catch(error){
  const known=['URL_NOT_ALLOWED','HTTP_NOT_OK','REDIRECT_NOT_ALLOWED',
   'SIZE_INVALID','NOT_RECOGNIZED_TREASURY_XML'];
  result.errorCode=known.includes(error?.message)?error.message:'NETWORK_OR_XML_READ_FAILED';
 }
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const resultPath=process.argv[2];
 if(!resultPath){console.error('RESULT_FILE_ARGUMENT_REQUIRED');process.exitCode=2;}
 else try{
  const result=await runR26TreasurySourceExport();
  fs.writeFileSync(resultPath,JSON.stringify(result,null,2)+'\n','utf8');
  console.log(`R26_TREASURY_SOURCE=${result.decision}`);
  console.log(`RESULT_FILE=${resultPath}`);
  if(result.status!=='RAW_XML_CAPTURED_NOT_APPLIED')process.exitCode=1;
 }catch{console.error('R26_RESULT_WRITE_FAILED');process.exitCode=2;}
}
