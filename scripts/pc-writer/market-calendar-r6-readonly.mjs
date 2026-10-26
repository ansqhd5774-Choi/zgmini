// Market-calendar PC/Production parity audit. READ ONLY: no collection, writes to DB or publish.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';

const requiredSources=['bls','bea','fed','census'];
const safeStatus=value=>typeof value==='string'&&/^[A-Za-z0-9_.:-]{1,96}$/.test(value)?value:'UNKNOWN';
const safeSha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/i.test(value)?value:null;
const safeTime=value=>{
 const ms=typeof value==='number'?value:Date.parse(value);
 return Number.isFinite(ms)&&ms>0?new Date(ms).toISOString():null;
};
const validDate=value=>typeof value==='string'&&/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;

export function summarizeFeed(body,storedAt=null){
 if(!body||typeof body!=='object')return {state:'MISSING'};
 const events=Array.isArray(body.events)?body.events:[];
 const counts=Object.fromEntries(requiredSources.map(name=>[name,events.filter(event=>event?.source===name).length]));
 counts.other=events.filter(event=>!requiredSources.includes(event?.source)).length;
 const unique=new Set();let duplicates=0,invalidDates=0,invalidUrls=0;
 const canonical=[];
 for(const event of events){
  const signature=JSON.stringify([event?.source,event?.id,event?.date]);
  if(unique.has(signature))duplicates++;else unique.add(signature);
  if(!validDate(event?.date))invalidDates++;
  if(typeof event?.sourceUrl!=='string'||!event.sourceUrl.startsWith('https://'))invalidUrls++;
  canonical.push(JSON.stringify([event?.source,event?.id,event?.date,event?.title,event?.sourceUrl]));
 }
 const dates=events.map(e=>e?.date).filter(validDate).sort();
 return {state:'FOUND',status:safeStatus(body.status),updatedAt:safeTime(body.updatedAt),storedAt:safeTime(storedAt),events:events.length,bySource:counts,earliest:dates[0]??null,latest:dates.at(-1)??null,duplicates,invalidDates,invalidUrls,eventsSha256:createHash('sha256').update(canonical.sort().join('\n')).digest('hex'),sources:Object.fromEntries(requiredSources.map(name=>[name,{status:safeStatus(body.sources?.[name]?.status),checkedAt:safeTime(body.sources?.[name]?.checkedAt)}]))};
}

function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function localSummary(base){
 const config=readJson(path.join(base,'config.json'));
 const collection=readJson(path.join(base,'local-collection-last-run.json'));
 const quota=readJson(path.join(base,'quota-runner-last-run.json'));
 const publication=readJson(path.join(base,'local-publication-ledger.json'));
 return {
  config:config?{state:'FOUND',source:safeSha(config.source),enabled:config.enabled===true,collectionTarget:config.collectionTarget==='pc'?'pc':'OTHER_OR_MISSING'}:{state:'MISSING'},
  collection:collection?{state:'FOUND',at:safeTime(collection.at),lane:safeStatus(collection.lane),status:safeStatus(collection.status),calendarStatus:safeStatus(collection.releaseCalendar?.status),calendarRequests:Number.isSafeInteger(collection.releaseCalendar?.providerRequests)?collection.releaseCalendar.providerRequests:null}:{state:'MISSING'},
  quota:quota?{state:'FOUND',at:safeTime(quota.at),status:safeStatus(quota.status),publicationStatus:safeStatus(quota.publication?.status)}:{state:'MISSING'},
  publication:publication?{state:'FOUND',at:safeTime(publication.at),status:safeStatus(publication.status),source:safeSha(publication.source)}:{state:'MISSING'},
 };
}
function dbSummary(base){
 const file=path.join(base,'storage','core.sqlite');
 if(!fs.existsSync(file))return {state:'DB_MISSING'};
 let db;
 try{
  db=new DatabaseSync(file,{readOnly:true});
  const row=db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key='release-calendar' AND snapshot_key='current'").get();
  return row?summarizeFeed(JSON.parse(row.body),row.stored_at):{state:'OUTPUT_MISSING'};
 }catch(error){return {state:'READ_FAILED',code:safeStatus(error.code)};}
 finally{try{db?.close();}catch{}}
}
function parseRegisteredProject(){
 let xml;
 try{
  const raw=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{windowsHide:true,stdio:['ignore','pipe','ignore'],timeout:10000});
  xml=raw[0]===255&&raw[1]===254||raw.includes(0)?raw.toString('utf16le'):raw.toString('utf8');
 }catch{return {state:'TASK_QUERY_UNAVAILABLE'};}
 const plain=xml.replaceAll('&quot;','"').replaceAll('&amp;','&');
 const found=plain.match(/[A-Za-z]:\\[^"'<>\r\n]+?\\scripts\\pc-writer\\(?:quota-runner|local-cycle|collect-local|run-local)\.mjs/i)?.[0];
 if(!found)return {state:'REGISTERED_PROJECT_UNRESOLVED'};
 const root=path.win32.dirname(path.win32.dirname(path.win32.dirname(found)));
 let source=null,hasExpandedParser=false,hasCollectorHook=false;
 try{source=safeSha(execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore'],timeout:10000}).trim());}catch{}
 try{const parser=fs.readFileSync(path.win32.join(root,'lib','release-calendar.mjs'),'utf8');hasExpandedParser=parser.includes('const eventSlug=')&&parser.includes('jolts');}catch{}
 try{const collector=fs.readFileSync(path.win32.join(root,'scripts','pc-writer','collect-local.mjs'),'utf8');hasCollectorHook=collector.includes('collectReleaseCalendar(core');}catch{}
 return {state:'TASK_PROJECT_IDENTIFIED',headSha:source,expandedParserFile:hasExpandedParser,collectorHookFile:hasCollectorHook};
}
async function remoteSummary(){
 try{
  const response=await fetch('https://zgmini.kr/api/release-calendar',{signal:AbortSignal.timeout(15000),headers:{accept:'application/json'},cache:'no-store'});
  if(!response.ok)return {state:'HTTP_ERROR',httpStatus:response.status};
  return summarizeFeed(await response.json());
 }catch{return {state:'FETCH_FAILED'};}
}

export async function runAudit({base=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,remote=remoteSummary,task=parseRegisteredProject}={}){
 const local=localSummary(base);
 const db=dbSummary(base);
 const live=await remote();
 const taskInfo=task();
 const sameEvents=db.state==='FOUND'&&live.state==='FOUND'?db.eventsSha256===live.eventsSha256:null;
 return {audit:'MARKET_CALENDAR_R6_READONLY',ranAt:new Date().toISOString(),policy:'NO_WRITE_NO_COLLECT_NO_PUBLISH',task:taskInfo,local,sqlite:db,production:live,parity:{sameEvents,localCount:db.events??null,productionCount:live.events??null},decision:'EVIDENCE_ONLY_DO_NOT_SWITCH_RUNNING_SOURCE'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output){console.error('MISSING_OUTPUT_PATH');process.exitCode=2;}
 else{
  const report=await runAudit().catch(()=>({audit:'MARKET_CALENDAR_R6_READONLY',state:'AUDIT_FAILED'}));
  try{fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{encoding:'utf8',flag:'w'});console.log('READONLY_REPORT_WRITTEN');}
  catch{console.error('REPORT_WRITE_FAILED');process.exitCode=2;}
 }
}
