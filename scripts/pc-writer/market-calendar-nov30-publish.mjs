// B one-shot from saved November days to two separate 15-day HTML-only D1 keys.
// NO provider calls, Core SQLite writes, existing rolling-feed writes, or schedule changes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {earningsDisplaySnapshot} from '../../lib/earnings-api-display.mjs';
import {NOV2026_EARNINGS_HTML_H1_KEY,NOV2026_EARNINGS_HTML_H2_KEY,
 validNov2026HalfDisplay} from '../../lib/market-calendar-nov2026-display.mjs';
import {coreRootFromTask} from './market-calendar-r34-earnings-sync.mjs';
import {resolveApprovedProjectSource} from './market-calendar-dec31-publish.mjs';

const PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const START='2026-11-01',END='2026-11-30';
// Mirrors worker/public-feed-store.mjs writeOutput's 1,800,000-byte guard.
const PUBLIC_FEED_STORAGE_MAX_BYTES=1_800_000;
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

export function buildNovemberHalves(events,checkedAt){
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
 const batchId=digest(JSON.stringify(DAYS.map(day=>[day,byDay[day]])));
 return [1,2].map(half=>{
  const coveredDays=DAYS.slice((half-1)*15,half*15);
  const halfByDay=Object.fromEntries(coveredDays.map(day=>[day,byDay[day]]));
  const result={status:'READY_DISPLAY',mode:'OWN_SITE_HTML_ONLY',
   rawVendorJsonExposed:false,publicJsonFeed:false,redistribution:false,
   checkedAt,batchId,coveredDays,
   recordCount:Object.values(halfByDay).reduce((n,rows)=>n+rows.length,0),
   priorityCount:0,byDay:halfByDay};
  if(!validNov2026HalfDisplay(result,half))
   stop('NOV30_PUBLISH_HTML_CONTRACT_STOP');
  return result;
 });
}

export function buildImmutableNovemberBodies(events,{existingBodies=[null,null],checkedAt}={}){
 if(!Array.isArray(existingBodies)||existingBodies.length!==2)
  stop('NOV30_PUBLISH_EXISTING_LOCAL_INVALID_STOP');
 const previous=existingBodies.map((body,i)=>{
  if(body===null)return null;
  let snapshot;try{snapshot=JSON.parse(body)}
  catch{stop('NOV30_PUBLISH_EXISTING_LOCAL_INVALID_STOP')}
  if(!validNov2026HalfDisplay(snapshot,i+1))
   stop('NOV30_PUBLISH_EXISTING_LOCAL_INVALID_STOP');
  return snapshot;
 });
 const previousTimes=previous.filter(Boolean).map(x=>x.checkedAt);
 if(new Set(previousTimes).size>1)stop('NOV30_PUBLISH_EXISTING_PAIR_DRIFT_STOP');
 const halves=buildNovemberHalves(events,previousTimes[0]??checkedAt);
 return halves.map((snapshot,i)=>{
  const body=JSON.stringify(snapshot);
  if(existingBodies[i]!==null&&existingBodies[i]!==body)
   stop('NOV30_PUBLISH_LOCAL_INPUT_DRIFT_STOP');
  if(Buffer.byteLength(body,'utf8')>PUBLIC_FEED_STORAGE_MAX_BYTES)
   stop('NOV30_PUBLISH_HTML_SIZE_OR_SHAPE_STOP');
  return body;
 });
}

export async function syncNovemberD1({remote,core,key,body,storedAt}){
 // Existing D1 stored_at contract is numeric epoch milliseconds (R34).
 if(!Number.isSafeInteger(storedAt)||storedAt<=0)
  stop('NOV30_PUBLISH_D1_TIMESTAMP_INVALID_STOP');
 if(![NOV2026_EARNINGS_HTML_H1_KEY,NOV2026_EARNINGS_HTML_H2_KEY].includes(key))
  stop('NOV30_PUBLISH_D1_KEY_INVALID_STOP');
 const sql="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
 const current=(await remote.query(core,sql,[key])).results?.[0];
 if(current?.body===body)return {decision:'NOV30_PUBLISH_D1_ALREADY_MATCHED',dbWrite:false};
 if(current&&current.stored_at>=storedAt)stop('NOV30_PUBLISH_D1_NEWER_PRESERVED_STOP');
 await remote.request(core,[{sql:
  "INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",
  params:[key,body,storedAt]}]);
 const actual=(await remote.query(core,sql,[key])).results?.[0];
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
  const local=[1,2].map(half=>path.join(folder,`current-h${half}.json`));
  const previous=local.map(file=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):null);
  const bodies=buildImmutableNovemberBodies(saved.events,
   {existingBodies:previous,checkedAt:isoNow});
  const halves=bodies.map(JSON.parse);
  if(halves.reduce((n,s)=>n+s.recordCount,0)!==saved.events.length||
   halves[0].batchId!==halves[1].batchId||
   halves[0].checkedAt!==halves[1].checkedAt)
   stop('NOV30_PUBLISH_HTML_SIZE_OR_SHAPE_STOP');
  for(let i=0;i<2;i++){
   if(previous[i]===null)fs.writeFileSync(local[i],bodies[i],{flag:'wx'});
   if(fs.readFileSync(local[i],'utf8')!==bodies[i])
    stop('NOV30_PUBLISH_LOCAL_READBACK_STOP');
  }
  report.publicationBatchId=halves[0].batchId;
  report.localHtmlSha256H1=digest(bodies[0]);
  report.localHtmlSha256H2=digest(bodies[1]);
  report.halfRecordCounts=halves.map(s=>s.recordCount);
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
  const keys=[NOV2026_EARNINGS_HTML_H1_KEY,NOV2026_EARNINGS_HTML_H2_KEY];
  for(let i=0;i<2;i++){
   const verified=await syncNovemberD1({remote,core:config.core,key:keys[i],
    body:bodies[i],storedAt:now});
   report.d1Writes+=Number(verified.dbWrite);
   report[`d1ReadbackSha256H${i+1}`]=digest(bodies[i]);
  }
  report.status='PASS';
  report.code=report.d1Writes?'NOV30_PUBLISH_D1_BOTH_VERIFIED':
   'NOV30_PUBLISH_D1_BOTH_ALREADY_MATCHED';
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
