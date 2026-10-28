// R34: one-time, targeted PC SQLite -> Cloudflare D1 HTML-only output sync.
// No collection, vendor API calls, other feed writes, scheduler or git changes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath,pathToFileURL} from 'node:url';

const KEY='market-calendar:earnings-display-html';
const EXPECTED_PC_HEAD='eb0d20f5354ff7cf52dd79960b408345bcce0010';
const EXPECTED_WORKTREE_ID='d0a4b3cb8b95';
const MAX_BYTES=1800000;
const MAX_WAIT_MS=20*60*1000;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const digest=body=>createHash('sha256').update(body).digest('hex');
const normalized=p=>path.normalize(p).replaceAll('\\','/').toLowerCase();
const windowsPath=p=>/^[a-z]:[\\/]/i.test(p);
const absolute=p=>windowsPath(p)?path.win32.resolve(p):path.resolve(p);
const rooted=p=>(windowsPath(p)?path.win32:path).resolve(p,'..','..','..');
export const worktreeIdentity=p=>digest(normalized(p)).slice(0,12);
// Read-only origin resolution from the existing Core task, not an alternate checkout.
export function coreRootFromTask(xml){
 if(typeof xml!=='string')return null;
 const fields=[...xml.matchAll(/<Arguments(?:\s+[^>]*)?>([\s\S]*?)<\/Arguments>/gi)];
 if(fields.length!==1)return null;
 const args=fields[0][1].replace(/&quot;|&#34;/gi,'"').replace(/&amp;/gi,'&');
 const matches=[...args.matchAll(/"([^"\r\n]*[\\/]run-local-core\.vbs)"/gi)];
 if(matches.length!==1)return null;
 const wrapperFile=absolute(matches[0][1]);
 if(!path.isAbsolute(wrapperFile)&&!windowsPath(wrapperFile))return null;
 let wrapper;
 try{if(fs.statSync(wrapperFile).size>65536)return null;
  wrapper=fs.readFileSync(wrapperFile,'utf8');}catch{return null;}
 if(!wrapper.includes('ZGMINI_R38_WRAPPER_V1'))return null;
 const origins=[...wrapper.matchAll(/^[ \t]*origin[ \t]*=[ \t]*"((?:[^"\r\n]|"")*)"[ \t]*(?:\x27[^\r\n]*)?$/gim)];
 if(origins.length!==1)return null;
 const originFile=absolute(origins[0][1].replaceAll('""','"'));
 let source;
 try{if(fs.statSync(originFile).size>65536)return null;
  source=fs.readFileSync(originFile,'utf8');}catch{return null;}
 const pattern=/((?:[a-z]:[\\/]|\/)[^"'\r\n<>]*?[\\/]scripts[\\/]pc-writer[\\/](?:local-cycle|quota-runner|run-local|collect-local)\.mjs)/gi;
 const entries=[...new Map([...source.matchAll(pattern)].map(match=>{
  const entry=absolute(match[1].trim());return [normalized(entry),entry];
 })).values()];
 return entries.length===1&&/[\\/]scripts[\\/]pc-writer[\\/][^\\/]+\.mjs$/i.test(entries[0])?rooted(entries[0]):null;
}
const validDate=day=>typeof day==='string'&&/^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(day)&&
 !Number.isNaN(Date.parse(day+'T00:00:00Z'))&&new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;

export function verifyEarningsOutput(row,{now=Date.now()}={}){
 if(!row||!Number.isSafeInteger(row.stored_at)||row.stored_at<1||row.stored_at>now+300000||
  typeof row.body!=='string'||Buffer.byteLength(row.body,'utf8')>MAX_BYTES)
  throw Error('R34_LOCAL_OUTPUT_INVALID');
 let display;
 try{display=JSON.parse(row.body);}catch{throw Error('R34_LOCAL_OUTPUT_JSON_INVALID');}
 if(display?.status!=='READY_DISPLAY'||display.mode!=='OWN_SITE_HTML_ONLY'||
  display.rawVendorJsonExposed!==false||display.publicJsonFeed!==false||display.redistribution!==false||
  !Array.isArray(display.coveredDays)||display.coveredDays.length!==14||
  new Set(display.coveredDays).size!==14||display.coveredDays.some(d=>!validDate(d))||
  display.coveredDays.some((d,i,a)=>i>0&&a[i-1]>=d)||
  !display.byDay||typeof display.byDay!=='object'||Array.isArray(display.byDay)||
  Object.keys(display.byDay).length!==14||
  !Number.isSafeInteger(display.recordCount)||display.recordCount<1||display.recordCount>5000||
  !Number.isSafeInteger(display.priorityCount)||display.priorityCount<0||
  display.priorityCount>display.recordCount)
  throw Error('R34_LOCAL_DISPLAY_CONTRACT_INVALID');
 const at=Date.parse(display.checkedAt);
 if(!Number.isFinite(at)||at>now+300000||now-at>48*3600000||
  !display.coveredDays.some(d=>d>=new Date(now).toISOString().slice(0,10)))
  throw Error('R34_LOCAL_DISPLAY_STALE_STOP');
 let count=0;
 for(const day of display.coveredDays){
  const rows=display.byDay[day];
  if(!Array.isArray(rows))throw Error('R34_LOCAL_DAY_INVALID');
  for(const html of rows){
   if(typeof html!=='string'||html.length>1600||
    !html.startsWith('<article class="mc-row mc-vendor-row" data-search="')||
    !html.endsWith('</article>')||!html.includes('mc-tag-status'))
    throw Error('R34_LOCAL_HTML_INVALID');
   count++;
  }
 }
 if(count!==display.recordCount)throw Error('R34_LOCAL_DISPLAY_COUNT_MISMATCH');
 return {recordCount:count,checkedAt:display.checkedAt,sourceSha256:digest(row.body),bytes:Buffer.byteLength(row.body,'utf8')};
}

export async function syncEarningsOutput({row,remote,core,now=Date.now()}={}){
 const verified=verifyEarningsOutput(row,{now});
 if(!remote||typeof remote.query!=='function'||typeof remote.request!=='function'||!core)
  throw Error('R34_REMOTE_DEPENDENCY_MISSING');
 const sql="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
 const existing=(await remote.query(core,sql,[KEY])).results?.[0]??null;
 if(existing?.body===row.body)
  return {...verified,decision:'R34_D1_ALREADY_SYNCED',remoteStoredAt:existing.stored_at,dbWrite:false};
 if(existing){
  let other;
  try{other=JSON.parse(existing.body);}catch{throw Error('R34_REMOTE_FORMAT_UNKNOWN_STOP');}
  if(existing.stored_at>=row.stored_at||
   (Number.isFinite(Date.parse(other.checkedAt))&&Date.parse(other.checkedAt)>Date.parse(verified.checkedAt)))
   throw Error('R34_REMOTE_NEWER_PRESERVED_STOP');
 }
 await remote.request(core,[{sql:
  "INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",
  params:[KEY,row.body,row.stored_at]}]);
 const check=(await remote.query(core,sql,[KEY])).results?.[0]??null;
 if(check?.body!==row.body||check?.stored_at!==row.stored_at)
  throw Error('R34_D1_READBACK_MISMATCH');
 return {...verified,decision:'R34_D1_SYNC_VERIFIED',remoteStoredAt:check.stored_at,dbWrite:true};
}

function taskXml(){
 const bytes=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:15000,stdio:['ignore','pipe','ignore']});
 return (bytes[0]===255&&bytes[1]===254||bytes.includes(0)?bytes.toString('utf16le'):
  bytes.toString('utf8')).replace(/^\ufeff/,'');
}
const gitHead=root=>execFileSync('git',['rev-parse','HEAD'],{
 cwd:root,encoding:'utf8',windowsHide:true,timeout:15000,stdio:['ignore','pipe','ignore'],
}).trim();
function readLocalOutput(dataRoot){
 const file=path.join(dataRoot,'storage','core.sqlite');
 if(!fs.existsSync(file))throw Error('R34_PC_DB_MISSING');
 const db=new DatabaseSync(file,{readOnly:true});
 try{return db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").get(KEY)??null;}
 finally{db.close();}
}
const errorLabel=error=>/^[A-Z0-9_]{3,80}$/.test(error?.message??'')?error.message:'R34_UNEXPECTED_STOP';

export async function runR34({dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 getRoot=()=>coreRootFromTask(taskXml()),getSource=gitHead,
 getLocal=readLocalOutput,getRemote,clock=()=>Date.now(),pause=sleep,
 limitMs=MAX_WAIT_MS,intervalMs=10000,
 expectedWorktreeId=EXPECTED_WORKTREE_ID,approvedHead=EXPECTED_PC_HEAD}={}){
 const started=clock();
 const report={audit:'MARKET_CALENDAR_R34_ONE_TIME_HTML_OUTPUT_SYNC',at:new Date(started).toISOString(),
  policy:'ONLY_ONE_STORED_OUTPUT_NO_PROVIDER_REQUEST_NO_OTHER_FEEDS_NO_SCHEDULER_CHANGE_NO_DIRECT_DEPLOY',
  providerRequests:0,filesModified:0,otherFeedsWritten:0,gitPushed:false,checks:0,attempts:0,
  decision:'R34_PREFLIGHT_STOP'};
 let root,config;
 try{
  root=getRoot();
  if(!root||worktreeIdentity(root)!==expectedWorktreeId)
   throw Error('R34_PC_WORKTREE_ID_CHANGED_STOP');
  const head=getSource(root);
  config=JSON.parse(fs.readFileSync(path.join(dataRoot,'config.json'),'utf8'));
  if(head!==approvedHead||config?.source!==head||config?.collectionTarget!=='pc'||
   config.enabled!==true)throw Error('R34_PC_SOURCE_CONFIG_CHANGED_STOP');
 }catch(error){report.decision=errorLabel(error);return report;}
 const lock=path.join(dataRoot,'local-cycle.lock');
 let ownLock=false;
 try{
  // Recheck only the existing core lock. Never delete or override another process's lock.
  while(true){
   report.checks++;
   try{
    const fd=fs.openSync(lock,'wx');ownLock=true;
    try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:clock(),purpose:'r34-html-only-d1-sync'}));}
    finally{fs.closeSync(fd);}
    break;
   }catch(error){
    if(error?.code!=='EEXIST')throw error;
    const elapsed=clock()-started;
    if(elapsed>=limitMs)throw Error('R34_LOCK_WAIT_TIMEOUT_STOP');
    await pause(Math.min(intervalMs,limitMs-elapsed));
   }
  }
  report.attempts=1;
  if(getRoot()!==root||getSource(root)!==config.source||
   JSON.parse(fs.readFileSync(path.join(dataRoot,'config.json'),'utf8')).source!==config.source)
   throw Error('R34_PC_SOURCE_CHANGED_AFTER_LOCK_STOP');
  const row=getLocal(dataRoot);
  const verified=verifyEarningsOutput(row,{now:clock()});
  report.recordCount=verified.recordCount;report.sourceSha256=verified.sourceSha256;
  report.bytes=verified.bytes;report.sourceCheckedAt=verified.checkedAt;
  // Load the installed PC publisher's existing credentials only after validating
  // the local HTML-only snapshot. Never copy tokens or vendor inputs to the ZIP.
  const remoteFactory=getRemote??(async()=>{
   const {client,credential}=await import(pathToFileURL(path.join(root,'scripts/pc-writer/d1.mjs')).href);
   return client(config,credential(root));
  });
  const remote=await remoteFactory({root,config});
  const result=await syncEarningsOutput({row,remote,core:config.core,now:clock()});
  report.decision=result.decision;report.remoteStoredAt=result.remoteStoredAt;
  report.dbWrite=result.dbWrite;report.remoteStats=remote.stats??null;
 }catch(error){report.decision=errorLabel(error);}
 finally{
  if(ownLock){try{fs.unlinkSync(lock);}catch{report.lockReleaseFailed=true;report.decision='R34_LOCK_RELEASE_FAILED_MANUAL_REVIEW';}}
  report.elapsedSeconds=Math.max(0,Math.floor((clock()-started)/1000));
 }
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const outputFile=process.argv[2];
 if(!outputFile){console.error('R34_RESULT_PATH_REQUIRED');process.exitCode=2;}
 else{
  const report=await runR34();
  try{fs.writeFileSync(outputFile,JSON.stringify(report,null,2)+'\n','utf8');}
  catch{console.error('R34_RESULT_WRITE_FAILED');process.exitCode=2;}
  console.log('R34='+report.decision);
  console.log('R34_RESULT_FILE='+outputFile);
  if(!['R34_D1_SYNC_VERIFIED','R34_D1_ALREADY_SYNCED'].includes(report.decision))process.exitCode=1;
 }
}
