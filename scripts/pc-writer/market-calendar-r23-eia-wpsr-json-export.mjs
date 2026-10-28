// R23 read-only one-time capture of the public JSON requested by EIA's WPSR page.
// No access to PC Core, configuration, SQLite, Windows tasks, Git or publisher.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const EIA_WPSR_CALENDAR_URL='https://www.eia.gov/petroleum/supply/weekly/includes/wpsr-calendar.json';
const MAX_BYTES=512*1024;
const digest=b=>createHash('sha256').update(b).digest('hex');
const isDate=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s)&&
 !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;

export async function exportEiaWpsrJson({now=Date.now(),fetchImpl=fetch,url=EIA_WPSR_CALENDAR_URL}={}){
 if(!Number.isFinite(now))throw Error('INVALID_TIME');
 const report={audit:'MARKET_CALENDAR_R23_EIA_WPSR_JSON_EXPORT',at:new Date(now).toISOString(),
  mode:'ONE_OFF_READ_ONLY_PUBLIC_JSON',url,requestCount:0,
  coreChanged:false,configChanged:false,dbChanged:false,tasksChanged:false,
  publisherExecuted:false,collectionExecuted:false,gitPushed:false,decision:'SOURCE_READ_FAILED'};
 try{
  if(url!==EIA_WPSR_CALENDAR_URL)throw Error('URL_NOT_ALLOWED');
  report.requestCount=1;
  const response=await fetchImpl(url,{signal:AbortSignal.timeout(18000),redirect:'error',
   headers:{'user-agent':'ZGMINI/1.0 (+https://zgmini.kr/about/)','accept':'application/json'}});
  report.httpStatus=response.status;
  if(!response.ok)throw Error('HTTP_NOT_OK');
  if(response.url&&response.url!==url)throw Error('REDIRECT_NOT_ALLOWED');
  const announced=Number(response.headers.get('content-length'));
  if(Number.isFinite(announced)&&announced>MAX_BYTES)throw Error('SIZE_INVALID');
  const raw=Buffer.from(await response.arrayBuffer());
  report.bytes=raw.length;
  if(!raw.length||raw.length>MAX_BYTES)throw Error('SIZE_INVALID');
  let calendar;
  try{calendar=JSON.parse(raw.toString('utf8'));}catch{throw Error('JSON_PARSE_FAILED');}
  if(!Array.isArray(calendar)||calendar.length>1000||!calendar.length||
   !calendar.some(item=>item&&typeof item==='object'&&isDate(item.release_date))){
   throw Error('CALENDAR_SHAPE_INVALID');
  }
  // Preserve bytes exactly for later independent parse and SHA256 verification.
  report.recordCount=calendar.length;
  report.validReleaseDateCount=calendar.filter(item=>item&&isDate(item.release_date)).length;
  report.sha256=digest(raw);
  report.officialJsonBase64=raw.toString('base64');
  report.decision='EIA_WPSR_JSON_CAPTURED_READONLY';
 }catch(error){
  report.errorCode=['URL_NOT_ALLOWED','HTTP_NOT_OK','REDIRECT_NOT_ALLOWED','SIZE_INVALID',
   'JSON_PARSE_FAILED','CALENDAR_SHAPE_INVALID'].includes(error?.message)?error.message:'NETWORK_OR_JSON_READ_FAILED';
 }
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const outputPath=process.argv[2];
 if(!outputPath){console.error('RESULT_FILE_REQUIRED');process.exitCode=2;}
 else try{
  const report=await exportEiaWpsrJson();
  fs.writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n','utf8');
  console.log(`R23_WPSR_JSON=${report.decision}`);
  console.log(`RESULT_FILE=${outputPath}`);
  if(report.decision!=='EIA_WPSR_JSON_CAPTURED_READONLY')process.exitCode=1;
 }catch{console.error('R23_WPSR_JSON_RESULT_WRITE_FAILED');process.exitCode=2;}
}
