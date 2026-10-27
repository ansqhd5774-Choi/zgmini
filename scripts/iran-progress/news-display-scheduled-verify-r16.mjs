// R16: read-only proof of an actual R13 scheduled cycle AFTER the R15 install.
// Does not start tasks, refresh credentials, contact D1, or write any PC files.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeTaskXml,describeSchedulerXml,parseLauncherScript} from './news-display-chain-audit-r6.mjs';
import {csvFirstRow,parseTaskLocalDate} from './news-display-scheduled-verify-r8.mjs';

const TASK='ZGMINI-PC-Iran-Progress-R13';
const VBS_SHA='a26e561964a5d4b88a02f81185221c1d3d770541c2cc12d6ceca5898e2228846';
const R15_RUNNER_SHA='db0040ef8f3ce5b7e4cfe2ed8786a87b1f6f0ce6a9b8c6ea0cf379f494e77ae3';
const R7_RUNNER_SHA='438ac0ad3f5073fbecc0e785c6f8fee19042d6fc8638ece9ef1e5198dd4c1b69';
const ORIGINAL_RUNNER_SHA='cbeff8d254504780c3446bdc7f43484a87306e2163b3687784a10f5b85a4c3b6';
const KST_MS=9*3600000;
const NEWS_STATUS='news-display-auto-r15-status.json';
const SCORE_LEDGER='iran.sqlite';
const hash=body=>createHash('sha256').update(body).digest('hex');
const kst=ms=>Number.isFinite(ms)?new Date(ms+KST_MS).toISOString().slice(0,19).replace('T',' '):null;
const code=value=>typeof value==='string'&&/^[A-Z][A-Z0-9_]{0,110}$/.test(value)?value:'UNCLASSIFIED';

function safeFile(file,maxBytes){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>maxBytes)
  throw Error('R16_UNSAFE_OR_OVERSIZED_PC_FILE');
 return {body:fs.readFileSync(file),mtimeMs:stat.mtimeMs};
}
function safeOptionalJson(file,maxBytes){
 if(!fs.existsSync(file))return null;
 const fileRead=safeFile(file,maxBytes);
 try{return {body:JSON.parse(fileRead.body.toString('utf8')),mtimeMs:fileRead.mtimeMs};}
 catch{throw Error('R16_JSON_INVALID');}
}
function parseKstTime(value){
 if(typeof value!=='string'||!/^(20\d{2})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.test(value))return null;
 const parsed=Date.parse(value.replace(' ','T')+'+09:00');
 if(!Number.isFinite(parsed)||kst(parsed)!==value)return null;
 return parsed;
}
function lastResult(value){
 const v=String(value??'').trim();
 if(/^0x[\da-f]+$/i.test(v))return Number.parseInt(v,16);
 if(/^\d+$/.test(v))return Number(v);
 return null;
}

export function evaluateR16Schedule({runnerMtimeMs,lastRunMs,lastResultCode,
 statusRecord,statusMtimeMs,cache,cacheMtimeMs,now=Date.now()}={}){
 const needs=(status,reason)=>({status,reason});
 if(!Number.isFinite(runnerMtimeMs)||runnerMtimeMs<=0||runnerMtimeMs>now+60000)
  throw Error('R16_RUNNER_INSTALL_TIME_INVALID');
 if(lastRunMs===null)return needs('NEEDS_REVIEW_R16_TASK_TIME','TASK_LAST_RUN_UNPARSEABLE');
 if(!Number.isFinite(lastRunMs)||lastRunMs>now+60000)
  return needs('NEEDS_REVIEW_R16_TASK_TIME','TASK_LAST_RUN_IN_FUTURE');
 if(lastRunMs<=runnerMtimeMs)
  return needs('PENDING_R16_NEXT_NORMAL_R13_RUN','TASK_HAS_NOT_RERUN_AFTER_INSTALL');
 const inProgress=now-lastRunMs<45*60000;
 if(!statusRecord)
  return needs(inProgress?'PENDING_R16_NEWS_STATUS':'NEEDS_REVIEW_R16_NEWS_STATUS_MISSING',
   'NO_POST_INSTALL_NEWS_STATUS');
 if(!Number.isFinite(statusMtimeMs)||statusMtimeMs<runnerMtimeMs||statusMtimeMs<lastRunMs-120000){
  return needs(inProgress?'PENDING_R16_NEWS_STATUS':'NEEDS_REVIEW_R16_STALE_NEWS_STATUS',
   'STATUS_OLDER_THAN_LAST_SCHEDULE');
 }
 if(statusMtimeMs>now+60000||statusMtimeMs>lastRunMs+3*3600000)
  return needs('NEEDS_REVIEW_R16_STATUS_RUN_MISMATCH','NEWS_STATUS_NOT_TIED_TO_LAST_RUN');
 if(statusRecord.version!=='IRAN_NEWS_AUTO_R15'||statusRecord.scoreLedgerModified!==false)
  return needs('NEEDS_REVIEW_R16_STATUS_FORMAT','NEWS_STATUS_CONTRACT_INVALID');
 if(statusRecord.status==='FAILED_SCORE_UNAFFECTED')
  return needs('NEEDS_REVIEW_R16_NEWS_AUTO_FAILED',code(statusRecord.reason));
 if(statusRecord.status!=='PUBLISHED_D1_VERIFIED'||
  !['VERIFIED','UNCHANGED'].includes(statusRecord.d1Publication)||
  !Number.isSafeInteger(statusRecord.publicItemCount)||statusRecord.publicItemCount<0||
  !Number.isSafeInteger(statusRecord.newArticles)||statusRecord.newArticles<0)
  return needs('NEEDS_REVIEW_R16_NEWS_PUBLICATION','D1_PUBLICATION_NOT_VERIFIED');
 const recordedMs=parseKstTime(statusRecord.completedAtKst);
 if(recordedMs===null||recordedMs<lastRunMs-120000||recordedMs>statusMtimeMs+60000)
  return needs('NEEDS_REVIEW_R16_STATUS_RUN_MISMATCH','NEWS_TIMESTAMP_MISMATCH');
 if(!cache||cache.version!=='IRAN_NEWS_PC_DISPLAY_R1'||!Array.isArray(cache.items)||
  cache.items.length>100||!Number.isSafeInteger(cache.updatedAt)||cache.updatedAt>now+60000||
  !Number.isFinite(cacheMtimeMs)||cacheMtimeMs>now+60000)
  return needs('NEEDS_REVIEW_R16_PC_NEWS_CACHE','PC_NEWS_CACHE_INVALID');
 if(cache.items.length<statusRecord.publicItemCount||cache.updatedAt<lastRunMs-120000)
  return needs('NEEDS_REVIEW_R16_PC_NEWS_CACHE','PC_NEWS_CACHE_OUT_OF_SYNC');
 if(lastResultCode===0x41301)
  return needs('PENDING_R16_R13_TASK_FINISH','SCHEDULER_TASK_STILL_RUNNING');
 if(lastResultCode!==0)
  return needs('NEEDS_REVIEW_R16_R13_SCORE_TASK','SCHEDULER_LAST_RESULT_NOT_SUCCESS');
 return {status:'PASS_R16_NORMAL_R13_AUTO_NEWS_D1_VERIFIED',reason:'NEWS_PUBLICATION_TIED_TO_NORMAL_SCHEDULE'};
}

function taskOutput(args){
 const result=spawnSync('schtasks.exe',args,{encoding:'buffer',windowsHide:true,
  maxBuffer:1024*1024,timeout:20000});
 if(result.error||result.status!==0)throw Error('R16_SCHEDULER_QUERY_FAILED');
 return result.stdout;
}
function decodeCsv(buffer){
 if(buffer[0]===255&&buffer[1]===254)return buffer.subarray(2).toString('utf16le');
 if(buffer[1]===0&&buffer[3]===0)return buffer.toString('utf16le');
 try{return new TextDecoder('utf-8',{fatal:true}).decode(buffer);}
 catch{return new TextDecoder('euc-kr').decode(buffer);}
}

export function auditR16({xml,csv,
 newsHome=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13'),
 now=Date.now()}={}){
 const task=describeSchedulerXml(xml);
 if(task.executable.toLowerCase()!=='wscript.exe'||
  task.scheduleHours.join(',')!=='0,6,12,18'||
  path.win32.basename(task.launcherPath??'').toLowerCase()!=='run-articles.vbs')
  throw Error('R16_EXISTING_SCHEDULE_IDENTITY_DRIFT');
 if(fs.realpathSync.native(path.dirname(task.launcherPath)).toLowerCase()!==
  fs.realpathSync.native(newsHome).toLowerCase())throw Error('R16_TASK_HOME_DRIFT');
 const launcher=safeFile(task.launcherPath,20000);
 if(hash(launcher.body)!==VBS_SHA)throw Error('R16_LAUNCHER_CHANGED');
 const entry=parseLauncherScript(launcher.body.toString('utf8'));
 if(entry.scriptBase.toLowerCase()!=='run-reference-flow-r3.mjs')
  throw Error('R16_ENTRYPOINT_CHANGED');
 const runner=safeFile(entry.scriptPath,200000);
 if(hash(runner.body)!==R15_RUNNER_SHA)throw Error('R16_R15_RUNNER_IDENTITY_MISMATCH');
 if(hash(safeFile(entry.scriptPath+'.before-iran-news-r15',200000).body)!==R7_RUNNER_SHA)
  throw Error('R16_R7_RUNNER_BACKUP_DRIFT');
 if(hash(safeFile(entry.scriptPath+'.before-iran-news-r7',200000).body)!==ORIGINAL_RUNNER_SHA)
  throw Error('R16_ORIGINAL_RUNNER_BACKUP_DRIFT');
 if(!fs.existsSync(path.join(path.dirname(entry.scriptPath),'news-display-auto-run-r15.mjs')))
  throw Error('R16_R15_NEWS_MODULE_MISSING');
 // Check ledger existence without reading its contents or opening a writer.
 const ledger=fs.lstatSync(path.join(newsHome,SCORE_LEDGER));
 if(!ledger.isFile()||ledger.isSymbolicLink())throw Error('R16_SCORE_LEDGER_UNSAFE');
 const cache=safeOptionalJson(path.join(newsHome,'news-display-r1.json'),1024*1024);
 const status=safeOptionalJson(path.join(newsHome,NEWS_STATUS),64000);
 const row=csvFirstRow(csv.replace(/^\uFEFF/,''));
 if(row.length<7||!row[1].includes(TASK))throw Error('R16_TASK_CSV_INVALID');
 const runMs=parseTaskLocalDate(row[5]),resultCode=lastResult(row[6]);
 const evaluated=evaluateR16Schedule({runnerMtimeMs:runner.mtimeMs,lastRunMs:runMs,
  lastResultCode:resultCode,statusRecord:status?.body??null,statusMtimeMs:status?.mtimeMs??null,
  cache:cache?.body??null,cacheMtimeMs:cache?.mtimeMs??null,now});
 return {...evaluated,readOnly:true,task:TASK,scheduleHours:task.scheduleHours,
  r15RunnerVerified:true,r7RecoveryBackupVerified:true,originalRecoveryBackupVerified:true,
  launcherUnchanged:true,scoreLedgerPresent:true,taskRanAfterInstall:runMs!==null&&runMs>runner.mtimeMs,
  taskLastRunKst:kst(runMs),taskLastResult:resultCode,
  newsStatus:status?.body?.status??null,newsStatusRecordedKst:status?.body?.completedAtKst??null,
  newsD1Publication:status?.body?.d1Publication??null,
  newArticles:status?.body?.newArticles??null,
  publicItemCount:status?.body?.publicItemCount??null,
  pcCacheItems:cache?.body?.items?.length??null,
  pcCacheUpdatedKst:kst(cache?.body?.updatedAt??null),
  schedulerModified:false,launcherModified:false,scoreLedgerModifiedByAudit:false,d1WrittenByAudit:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only')throw Error('R16_EXPLICIT_READ_ONLY_REQUIRED');
 try{
  const xml=decodeTaskXml(taskOutput(['/Query','/TN',TASK,'/XML']));
  const csv=decodeCsv(taskOutput(['/Query','/TN',TASK,'/V','/FO','CSV','/NH']));
  console.log(JSON.stringify(auditR16({xml,csv})));
 }catch(error){
  console.error(JSON.stringify({status:'STOP_R16_READ_ONLY_AUDIT',readOnly:true,reason:code(error.message)}));
  process.exitCode=1;
 }
}
