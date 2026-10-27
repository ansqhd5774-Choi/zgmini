// R22: read-only transport of public Federal Reserve calendar HTML.
// Does not access the PC Core, SQLite, scheduled tasks, publisher, or Git.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const LIMIT_BYTES=1024*1024;

export function fedR22Urls(now=Date.now()){
 if(!Number.isFinite(now))throw Error('INVALID_TIME');
 const first=new Date(now),urls=[];
 for(let offset=0;offset<3;offset++){
  const date=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+offset,1));
  const year=date.getUTCFullYear(),month=months[date.getUTCMonth()];
  urls.push({kind:'month',label:`${year}-${String(date.getUTCMonth()+1).padStart(2,'0')}`,
   url:`https://www.federalreserve.gov/newsevents/${year}-${month}.htm?view=calendar`});
 }
 urls.push({kind:'statistical',label:'statistical-release-calendar',
  url:'https://www.federalreserve.gov/data/releaseschedule.htm'});
 urls.push({kind:'fomc',label:'fomc-meetings',
  url:'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'});
 return urls;
}

export async function runR22FedSourceExport({now=Date.now(),fetchImpl=fetch,probes=fedR22Urls(now)}={}){
 const result={audit:'MARKET_CALENDAR_R22_FED_SOURCE_EXPORT',at:new Date(now).toISOString(),
  mode:'READ_ONLY_OFFICIAL_PUBLIC_HTML',policy:'NO_CORE_NO_DB_NO_SCHEDULER_NO_GIT_NO_PUBLISH_NO_FORCED_COLLECTION',
  coreSourceChanged:false,configChanged:false,schedulerChanged:false,dbChanged:false,
  publisherExecuted:false,collectionExecuted:false,gitPushed:false,
  probes:[],decision:'NO_OFFICIAL_HTML_EXPORTED'};
 const fixedHosts=new Set(['www.federalreserve.gov']);
 result.probes=await Promise.all(probes.map(async probe=>{
  const item={kind:probe.kind,label:probe.label,url:probe.url,status:'UNAVAILABLE'};
  try{
   const parsed=new URL(probe.url);
   if(parsed.protocol!=='https:'||!fixedHosts.has(parsed.hostname))throw Error('URL_NOT_ALLOWED');
   const response=await fetchImpl(parsed.toString(),{
    signal:AbortSignal.timeout(18000),headers:{'user-agent':'ZGMINI/1.0 (+https://zgmini.kr/about/)'}
   });
   item.httpStatus=response.status;
   if(!response.ok)throw Error('HTTP_NOT_OK');
   if(response.url&&new URL(response.url).hostname!=='www.federalreserve.gov')throw Error('URL_NOT_ALLOWED');
   const contentLength=Number(response.headers.get('content-length'));
   if(Number.isFinite(contentLength)&&contentLength>LIMIT_BYTES)throw Error('SIZE_INVALID');
   const bytes=Buffer.from(await response.arrayBuffer());
   item.bytes=bytes.length;
   if(!bytes.length||bytes.length>LIMIT_BYTES)throw Error('SIZE_INVALID');
   const raw=bytes.toString('utf8');
   const pageTitle=raw.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]??'';
   if(!/<html\b/i.test(raw)||!/federal reserve|the fed|federal open market committee|fomc|meeting calendars|statistical release/i.test(pageTitle)){
    throw Error('NOT_RECOGNIZED_OFFICIAL_HTML');
   }
   item.status='RAW_HTML_CAPTURED_NOT_PARSED';
   item.sha256=sha256(bytes);
   item.anchorCounts={
    fomc:(raw.match(/FOMC (?:Meeting|Minutes|Press Conference)/gi)||[]).length,
    beigeBook:(raw.match(/Beige Book/gi)||[]).length,
    g19:(raw.match(/G\.19/gi)||[]).length,
    g17:(raw.match(/G\.17/gi)||[]).length,
    z1:(raw.match(/Z\.1/gi)||[]).length,
   };
   // All transport evidence is contained in this one TXT. The contents are
   // Federal Reserve public HTML; no PC files, URLs with keys, or credentials.
   item.officialHtmlBase64=bytes.toString('base64');
  }catch(error){
   item.status='SOURCE_READ_FAILED';
   item.errorCode=typeof error?.message==='string'&&[
    'URL_NOT_ALLOWED','HTTP_NOT_OK','SIZE_INVALID','NOT_RECOGNIZED_OFFICIAL_HTML'
   ].includes(error.message)?error.message:'NETWORK_OR_HTML_READ_FAILED';
  }
  return item;
 }));
 const captured=result.probes.filter(p=>p.status==='RAW_HTML_CAPTURED_NOT_PARSED');
 result.capturedCount=captured.length;
 result.decision=captured.length===result.probes.length?'FED_HTML_CAPTURE_COMPLETE_READONLY':
  captured.length?'FED_HTML_CAPTURE_PARTIAL_READONLY':'NO_OFFICIAL_HTML_EXPORTED';
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const reportPath=process.argv[2];
 if(!reportPath){console.error('RESULT_FILE_ARGUMENT_REQUIRED');process.exitCode=2;}
 else try{
  const result=await runR22FedSourceExport();
  fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n','utf8');
  console.log(`R22_FED_SOURCE=${result.decision}`);
  console.log(`RESULT_FILE=${reportPath}`);
  if(!result.capturedCount)process.exitCode=1;
 }catch{console.error('R22_RESULT_WRITE_FAILED');process.exitCode=2;}
}
