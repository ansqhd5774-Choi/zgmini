// R24 one-shot public USDA WASDE HTML capture. Never read or modify PC Core,
// its SQLite, task scheduler, Git, publisher, config, or private files.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const R24_USDA_URL='https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report';
const bytesLimit=1024*1024;

export async function runR24UsdaSourceExport({now=Date.now(),fetchImpl=fetch,url=R24_USDA_URL}={}){
 if(!Number.isFinite(now))throw Error('INVALID_TIME');
 const result={audit:'MARKET_CALENDAR_R24_USDA_SOURCE_EXPORT',at:new Date(now).toISOString(),
  mode:'READ_ONLY_SINGLE_OFFICIAL_HTML_GET',url,phase:'READ_ONLY',status:'SOURCE_READ_FAILED',
  coreSourceChanged:false,configChanged:false,schedulerChanged:false,dbChanged:false,
  publisherExecuted:false,collectionExecuted:false,gitPushed:false,forcedCollection:false,
  decision:'USDA_HTML_UNAVAILABLE_READONLY'};
 try{
  if(url!==R24_USDA_URL)throw Error('URL_NOT_ALLOWED');
  const response=await fetchImpl(url,{signal:AbortSignal.timeout(18000),
   headers:{'user-agent':'ZGMINI/1.0 (+https://zgmini.kr/about/)'}});
  result.httpStatus=response.status;
  if(!response.ok)throw Error('HTTP_NOT_OK');
  if(response.url&&response.url!==url)throw Error('REDIRECT_NOT_ALLOWED');
  const size=Number(response.headers.get('content-length'));
  if(Number.isFinite(size)&&size>bytesLimit)throw Error('SIZE_INVALID');
  const raw=Buffer.from(await response.arrayBuffer());
  if(!raw.length||raw.length>bytesLimit)throw Error('SIZE_INVALID');
  const html=raw.toString('utf8');
  if(!/<html\b/i.test(html)||!/WASDE/i.test(html)||!/Release Dates/i.test(html)||
   !/(?:U\.S\. Department of Agriculture|USDA)/i.test(html))throw Error('NOT_RECOGNIZED_USDA_HTML');
  result.status='RAW_HTML_CAPTURED_NOT_APPLIED';
  result.bytes=raw.length;
  result.sha256=createHash('sha256').update(raw).digest('hex');
  result.yearHeadings=(html.match(/WASDE\s+Release\s+Dates/gi)||[]).length;
  result.officialHtmlBase64=raw.toString('base64');
  result.decision='USDA_HTML_CAPTURED_READONLY';
 }catch(error){
  result.errorCode=typeof error?.message==='string'&&[
   'URL_NOT_ALLOWED','HTTP_NOT_OK','REDIRECT_NOT_ALLOWED','SIZE_INVALID','NOT_RECOGNIZED_USDA_HTML'
  ].includes(error.message)?error.message:'NETWORK_OR_HTML_READ_FAILED';
 }
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const resultPath=process.argv[2];
 if(!resultPath){console.error('RESULT_FILE_ARGUMENT_REQUIRED');process.exitCode=2;}
 else try{
  const result=await runR24UsdaSourceExport();
  fs.writeFileSync(resultPath,JSON.stringify(result,null,2)+'\n','utf8');
  console.log(`R24_USDA_SOURCE=${result.decision}`);
  console.log(`RESULT_FILE=${resultPath}`);
  if(result.status!=='RAW_HTML_CAPTURED_NOT_APPLIED')process.exitCode=1;
 }catch{console.error('R24_RESULT_WRITE_FAILED');process.exitCode=2;}
}
