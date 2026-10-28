// R23: one-time, sequential, read-only transport of EIA release-schedule HTML.
// No Core / config / scheduled tasks / SQLite / Git / publisher access.
// EIA's automated retrieval policy prohibits excessive automated requests.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const LIMIT_BYTES=1024*1024;
const sha256=b=>createHash('sha256').update(b).digest('hex');
const allowedHosts=new Set(['www.eia.gov','ir.eia.gov']);
export const R23_EIA_PAGES=Object.freeze([
 {kind:'overview',label:'eia-upcoming-releases',url:'https://www.eia.gov/reports/upcoming.php'},
 {kind:'wpsr-schedule',label:'weekly-petroleum-release-schedule',url:'https://www.eia.gov/petroleum/supply/weekly/schedule.php'},
 {kind:'wpsr-next',label:'weekly-petroleum-next-release',url:'https://www.eia.gov/petroleum/supply/weekly/'},
 {kind:'wngsr-schedule',label:'weekly-natural-gas-storage-schedule',url:'https://ir.eia.gov/ngs/schedule.html'},
 {kind:'steo-schedule',label:'short-term-energy-outlook-schedule',url:'https://www.eia.gov/outlooks/steo/release_schedule.php'},
 {kind:'steo-next',label:'short-term-energy-outlook-next-release',url:'https://www.eia.gov/outlooks/steo/'},
]);
const approvedUrls=new Set(R23_EIA_PAGES.map(page=>page.url));

export async function runR23EiaSourceExport({
 now=Date.now(),fetchImpl=fetch,probes=R23_EIA_PAGES,pauseImpl=ms=>new Promise(resolve=>setTimeout(resolve,ms))
}={}){
 if(!Number.isFinite(now))throw Error('INVALID_TIME');
 const result={audit:'MARKET_CALENDAR_R23_EIA_SOURCE_EXPORT',at:new Date(now).toISOString(),
  mode:'READ_ONLY_OFFICIAL_PUBLIC_HTML_ONE_REQUEST_PER_URL',
  policy:'SEQUENTIAL_1200MS_GAP_NO_CORE_NO_CONFIG_NO_DB_NO_SCHEDULER_NO_GIT_NO_PUBLISH_NO_FORCED_COLLECTION',
  coreSourceChanged:false,configChanged:false,schedulerChanged:false,dbChanged:false,
  publisherExecuted:false,collectionExecuted:false,gitPushed:false,
  probes:[],decision:'NO_OFFICIAL_HTML_EXPORTED'};
 for(let index=0;index<probes.length;index++){
  const probe=probes[index];
  const item={kind:probe.kind,label:probe.label,url:probe.url,status:'UNAVAILABLE'};
  try{
   const url=new URL(probe.url);
   if(url.protocol!=='https:'||!allowedHosts.has(url.hostname)||!approvedUrls.has(url.toString())||url.username||url.password||
    url.searchParams.size!==0||url.port)throw Error('URL_NOT_ALLOWED');
   if(index>0)await pauseImpl(1200);
   const response=await fetchImpl(url.toString(),{
    signal:AbortSignal.timeout(18000),
    headers:{'user-agent':'ZGMINI/1.0 (+https://zgmini.kr/about/)'}
   });
   item.httpStatus=response.status;
   if(!response.ok)throw Error('HTTP_NOT_OK');
   if(response.url){
    const finalUrl=new URL(response.url);
    if(finalUrl.protocol!=='https:'||!allowedHosts.has(finalUrl.hostname))throw Error('REDIRECT_NOT_ALLOWED');
   }
   const announced=Number(response.headers.get('content-length'));
   if(Number.isFinite(announced)&&announced>LIMIT_BYTES)throw Error('SIZE_INVALID');
   const bytes=Buffer.from(await response.arrayBuffer());
   item.bytes=bytes.length;
   if(!bytes.length||bytes.length>LIMIT_BYTES)throw Error('SIZE_INVALID');
   const html=bytes.toString('utf8');
   const pageTitle=html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]??'';
   if(!/<html\b/i.test(html)||!/(?:energy information administration|\beia\b|petroleum status|natural gas storage|energy outlook|release schedules)/i.test(pageTitle))
    throw Error('NOT_RECOGNIZED_OFFICIAL_HTML');
   item.status='RAW_HTML_CAPTURED_NOT_PARSED';
   item.sha256=sha256(bytes);
   item.anchorCounts={
    nextRelease:(html.match(/next release date/gi)||[]).length,
    releaseSchedule:(html.match(/release schedule/gi)||[]).length,
    holiday:(html.match(/holiday/gi)||[]).length,
    storage:(html.match(/storage report/gi)||[]).length,
   };
   // Evidence includes only fixed public EIA HTML. Never read PC files or keys.
   item.officialHtmlBase64=bytes.toString('base64');
  }catch(error){
   item.status='SOURCE_READ_FAILED';
   item.errorCode=typeof error?.message==='string'&&[
    'URL_NOT_ALLOWED','HTTP_NOT_OK','REDIRECT_NOT_ALLOWED','SIZE_INVALID','NOT_RECOGNIZED_OFFICIAL_HTML'
   ].includes(error.message)?error.message:'NETWORK_OR_HTML_READ_FAILED';
  }
  result.probes.push(item);
 }
 result.capturedCount=result.probes.filter(p=>p.status==='RAW_HTML_CAPTURED_NOT_PARSED').length;
 result.decision=result.capturedCount===probes.length?'EIA_HTML_CAPTURE_COMPLETE_READONLY':
  result.capturedCount?'EIA_HTML_CAPTURE_PARTIAL_READONLY':'NO_OFFICIAL_HTML_EXPORTED';
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const reportPath=process.argv[2];
 if(!reportPath){console.error('RESULT_FILE_ARGUMENT_REQUIRED');process.exitCode=2;}
 else try{
  const result=await runR23EiaSourceExport();
  fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n','utf8');
  console.log(`R23_EIA_SOURCE=${result.decision}`);
  console.log(`RESULT_FILE=${reportPath}`);
  if(!result.capturedCount)process.exitCode=1;
 }catch{console.error('R23_RESULT_WRITE_FAILED');process.exitCode=2;}
}
