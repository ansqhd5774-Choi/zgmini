// B one-shot from the already-saved November day records to a separate HTML-only D1 key.
// NO provider calls, Core SQLite writes, existing rolling-feed writes, or schedule changes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {earningsDisplaySnapshot} from '../../lib/earnings-api-display.mjs';
import {NOV2026_EARNINGS_HTML_KEY,validNov2026Display} from '../../lib/market-calendar-nov2026-display.mjs';
import {coreRootFromTask} from './market-calendar-r34-earnings-sync.mjs';
import {resolveApprovedProjectSource} from './market-calendar-dec31-publish.mjs';

const PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const START='2026-11-01',END='2026-11-30';
const DAYS=Array.from({length:30},(_,i)=>`2026-11-${String(i+1).padStart(2,'0')}`);
const RAW_DIR='nov30-forward-days';
const digest=value=>createHash('sha256').update(value).digest('hex');
const stop=code=>{throw Error(code)};
const reportError=e=>/^NOV30_PUBLISH_[A-Z0-9_]+$/.test(e?.message??'')?
 e.message:'NOV30_PUBLISH_UNEXPECTED_STOP';
const validDay=value=>typeof value==='string'&&/^2026-11-\d\d$/.test(value)&&DAYS.includes(value);

function parseDay(body,day){
 if(!body||body.date!==day||!['pre','after','notSupplied'].every(k=>Array.isArray(body[k])))
  stop('NOV30_PUBLISH_SAVED_DAY_SHAPE_STOP');
 const events=[];
 for(const [group,session] of [['pre','before_market'],['after','after_market'],['notSupplied','unknown']]){
  if(body[group].length>5000)stop('NOV30_PUBLISH_SAVED_DAY_TOO_MANY_STOP');
  for(const row of body[group]){
   if(!row||typeof row!=='object'||Array.isArray(row)||
    typeof row.symbol!=='string'||!/^[A-Z0-9.\-]{1,12}$/.test(row.symbol)||
    typeof row.name!=='string'||!row.name.trim()||row.name.length>200)
    stop('NOV30_PUBLISH_SAVED_ROW_INVALID_STOP');
   events.push({date:day,ticker:row.symbol,company:row.name.trim(),
    marketSession:session,time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api'});
  }
 }
 return events;
}

function coreReadOnly(pcHome){
 const dbPath=path.join(pcHome,'storage','core.sqlite');
 if(!fs.existsSync(dbPath))stop('NOV30_PUBLISH_CORE_DB_MISSING');
 const db=new DatabaseSync(dbPath,{readOnly:true});
 const stmt=db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='input' AND feed_key=? AND snapshot_key='current'");
 return {get(day){
  const row=stmt.get(`release-calendar:earnings-api:${day}`);
  if(!row)return null;
  let wrapper;try{wrapper=JSON.parse(row.body)}catch{stop('NOV30_PUBLISH_CORE_BODY_INVALID_STOP')}
  if(wrapper?.requestedDate!==day||typeof wrapper.text!=='string'||
    Buffer.byteLength(wrapper.text,'utf8')>2_000_000)
   stop('NOV30_PUBLISH_CORE_BODY_INVALID_STOP');
  let body;try{body=JSON.parse(wrapper.text)}catch{stop('NOV30_PUBLISH_CORE_TEXT_INVALID_STOP')}
  return {body,storedAt:new Date(row.stored_at).toISOString()};
 },close(){db.close()}};
}

function savedPrivateDay(pcHome,day){
 const file=path.join(pcHome,'er1-input',RAW_DIR,day+'.json');
 if(!fs.existsSync(file))return null;
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<2||stat.size>2_001_024)
  stop('NOV30_PUBLISH_PRIVATE_FILE_UNSAFE_STOP');
 let value;try{value=JSON.parse(fs.readFileSync(file,'utf8'))}
 catch{stop('NOV30_PUBLISH_PRIVATE_JSON_INVALID_STOP')}
 if(value?.body?.date!==day||!Number.isFinite(Date.parse(value.storedAt)))
  stop('NOV30_PUBLISH_PRIVATE_DAY_INVALID_STOP');
 return value;
}

// The #145 capture left 16 already-existing Core day rows in place and wrote
// 14 missing days as independent private files. Reconstruct all 30 without GET.
export function novemberEventsFromSaved({core,saved}){
 const events=[];let newest=0,coreDays=0,privateDays=0;
 for(const day of DAYS){
  const privateValue=saved(day);
  const input=privateValue??core(day);
  if(!input)stop('NOV30_PUBLISH_SAVED_DAY_MISSING_STOP');
  const at=Date.parse(input.storedAt);
  if(!Number.isFinite(at)||at<Date.parse('2026-10-30T00:00:00Z')||
   at>Date.now()+300000)stop('NOV30_PUBLISH_SAVED_TIME_INVALID_STOP');
  if(privateValue)privateDays++;else coreDays++;
  newest=Math.max(newest,at);
  events.push(...parseDay(input.body,day));
  if(events.length>5000)stop('NOV30_PUBLISH_OVER_5000_ROWS_STOP');
 }
 if(coreDays+privateDays!==30)stop('NOV30_PUBLISH_COVERAGE_STOP');
 return {events,coreDays,privateDays,latestStoredAt:new Date(newest).toISOString()};
}

export function buildNovemberDisplay(events,checkedAt){
 if(!Array.isArray(events)||events.length<1||events.length>5000||
  !Number.isFinite(Date.parse(checkedAt)))stop('NOV30_PUBLISH_BUILD_INPUT_STOP');
 const byDay={};
 for(let start=0;start<30;start+=14){
  // R31's canonical sanitized renderer requires exactly 14 covered dates.
  // Days past Nov 30 only pad the temporary final chunk; never get published.
  const coveredDays=Array.from({length:14},(_,i)=>
   new Date(Date.UTC(2026,10,start+i+1)).toISOString().slice(0,10));
  const subset=events.filter(e=>coveredDays.includes(e.date));
  const rendered=earningsDisplaySnapshot({status:'READY_PRIVATE',scope:'PC_PRIVATE',
   publicDisplay:false,redistribution:false,publicationStatus:'HELD_UNCONFIRMED',
   checkedAt,coveredDays,recordCount:subset.length,priorityCount:0,events:subset});
  for(const day of coveredDays)if(validDay(day))byDay[day]=rendered.byDay[day];
 }
 const result={status:'READY_DISPLAY',mode:'OWN_SITE_HTML_ONLY',
  rawVendorJsonExposed:false,publicJsonFeed:false,redistribution:false,
  checkedAt,coveredDays:DAYS,recordCount:events.length,priorityCount:0,byDay};
 if(!validNov2026Display(result))stop('NOV30_PUBLISH_HTML_CONTRACT_STOP');
 return result;
}

export function buildImmutableNovemberBody(events,{existingBody=null,checkedAt}={}){
 let previousSnapshot;
 if(existingBody!==null){
  try{previousSnapshot=JSON.parse(existingBody)}
  catch{stop('NOV30_PUBLISH_EXISTING_LOCAL_INVALID_STOP')}
  if(!validNov2026Display(previousSnapshot))
   stop('NOV30_PUBLISH_EXISTING_LOCAL_INVALID_STOP');
 }
 const body=JSON.stringify(buildNovemberDisplay(events,previousSnapshot?.checkedAt??checkedAt));
 if(existingBody!==null&&existingBody!==body)
  stop('NOV30_PUBLISH_LOCAL_INPUT_DRIFT_STOP');
 if(Buffer.byteLength(body,'utf8')>1_900_000)
  stop('NOV30_PUBLISH_HTML_SIZE_OR_SHAPE_STOP');
 return body;
}

export async function syncNovemberD1({remote,core,body,storedAt}){
 // Existing D1 stored_at contract is numeric epoch milliseconds (R34).
 if(!Number.isSafeInteger(storedAt)||storedAt<=0)
  stop('NOV30_PUBLISH_D1_TIMESTAMP_INVALID_STOP');
 const sql="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
 const current=(await remote.query(core,sql,[NOV2026_EARNINGS_HTML_KEY])).results?.[0];
 if(current?.body===body)return {decision:'NOV30_PUBLISH_D1_ALREADY_MATCHED',dbWrite:false};
 if(current&&current.stored_at>=storedAt)stop('NOV30_PUBLISH_D1_NEWER_PRESERVED_STOP');
 await remote.request(core,[{sql:
  "INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",
  params:[NOV2026_EARNINGS_HTML_KEY,body,storedAt]}]);
 const actual=(await remote.query(core,sql,[NOV2026_EARNINGS_HTML_KEY])).results?.[0];
 if(actual?.body!==body||actual?.stored_at!==storedAt)stop('NOV30_PUBLISH_D1_READBACK_STOP');
 return {decision:'NOV30_PUBLISH_D1_VERIFIED',dbWrite:true};
}

const head=root=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',
 windowsHide:true,timeout:15000,stdio:['ignore','pipe','ignore']}).trim();
function coreTaskXml(){
 const bytes=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:15000,stdio:['ignore','pipe','ignore']});
 return (bytes[0]===255&&bytes[1]===254||bytes.includes(0)?bytes.toString('utf16le'):
  bytes.toString('utf8')).replace(/^\ufeff/,'');
}

export async function runPublish({pcHome=PC_HOME,readCore=coreReadOnly,
 readPrivate=savedPrivateDay,getRoot=()=>coreRootFromTask(coreTaskXml()),
 getHead=head,remoteFactory,clock=()=>Date.now()}={}){
 const report={schema:'ZGMINI_NOV30_HTML_PUBLISH_V1',status:'BLOCKED',
  code:'NOV30_PUBLISH_NOT_STARTED',providerCalls:0,coreWrites:0,
  existingFeedWrites:0,schedulerWrites:0,rawRowsPublic:0,d1Writes:0};
 let fd=null,lock=null,core=null;
 try{
  if(process.platform!=='win32'||!fs.existsSync(pcHome))stop('NOV30_PUBLISH_PC_HOME_INVALID');
  core=readCore(pcHome);
  const saved=novemberEventsFromSaved({core:day=>core.get(day),
   saved:day=>readPrivate(pcHome,day)});
  report.coreReusedDayCount=saved.coreDays;
  report.privateReusedDayCount=saved.privateDays;
  report.eventCount=saved.events.length;
  report.sourceStoredAt=saved.latestStoredAt;
  const now=clock(),isoNow=new Date(now).toISOString();
  const folder=path.join(pcHome,'er1-input','nov30-html-publish');
  fs.mkdirSync(folder,{recursive:true});
  const local=path.join(folder,'current.json');
  // Reusing a previous one-shot result validates all source-derived HTML rows.
  const previous=fs.existsSync(local)?fs.readFileSync(local,'utf8'):null;
  const body=buildImmutableNovemberBody(saved.events,
   {existingBody:previous,checkedAt:isoNow});
  const snapshot=JSON.parse(body);
  if(!validNov2026Display(snapshot)||snapshot.recordCount!==saved.events.length||
   Buffer.byteLength(body,'utf8')>1_900_000)
   stop('NOV30_PUBLISH_HTML_SIZE_OR_SHAPE_STOP');
  if(!fs.existsSync(local))fs.writeFileSync(local,body,{flag:'wx'});
  if(fs.readFileSync(local,'utf8')!==body)stop('NOV30_PUBLISH_LOCAL_READBACK_STOP');
  report.localHtmlSha256=digest(body);
  core.close();core=null;
  const config=JSON.parse(fs.readFileSync(path.join(pcHome,'config.json'),'utf8'));
  const candidate=getRoot();
  const root=candidate&&fs.existsSync(candidate)?candidate:
   resolveApprovedProjectSource({expectedSha:config.source,getHead});
  if(config.source!==getHead(root)||config.collectionTarget!=='pc'||
   config.enabled!==true||!config.core)stop('NOV30_PUBLISH_CORE_SOURCE_CONFIG_STOP');
  lock=path.join(pcHome,'nov30-html-publish.lock');
  try{fd=fs.openSync(lock,'wx')}catch{stop('NOV30_PUBLISH_INDEPENDENT_LOCK_BUSY_STOP')}
  fs.writeFileSync(fd,JSON.stringify({pid:process.pid,purpose:'nov30-html-only-d1-output'}));
  if(config.source!==getHead(root))stop('NOV30_PUBLISH_SOURCE_AFTER_LOCK_STOP');
  const factory=remoteFactory??(async()=>{
   const {client,credential}=await import(pathToFileURL(path.join(root,'scripts/pc-writer/d1.mjs')).href);
   return client(config,credential(root));
  });
  const remote=await factory();
  const result=await syncNovemberD1({remote,core:config.core,body,storedAt:now});
  report.status='PASS';report.code=result.decision;
  report.d1Writes=Number(result.dbWrite);report.d1ReadbackSha256=digest(body);
 }catch(e){report.code=reportError(e)}
 finally{
  try{core?.close()}catch{}
  if(fd!==null){try{fs.closeSync(fd);fs.unlinkSync(lock)}catch{
   report.status='STATE_UNKNOWN';report.code='NOV30_PUBLISH_LOCK_RELEASE_STOP';}}
 }
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output||!path.isAbsolute(output)){
  process.stderr.write('NOV30_PUBLISH_RESULT_PATH_REQUIRED\n');process.exitCode=2;
 }else{
  const report=await runPublish();
  try{fs.writeFileSync(output,JSON.stringify(report)+'\n',{flag:'wx'})}
  catch{process.stderr.write('NOV30_PUBLISH_RESULT_SAVE_STOP\n');process.exitCode=2}
  console.log('NOV30_PUBLISH='+report.code);
  if(report.status!=='PASS')process.exitCode=1;
 }
}
