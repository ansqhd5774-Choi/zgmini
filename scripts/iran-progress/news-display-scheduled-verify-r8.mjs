// R8 read-only evidence of the NEXT ordinary R13 run after the R7 PC install.
// Inspect only; never run jobs, touch the cache, or modify task, VBS, SQLite, D1.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeTaskXml,describeSchedulerXml,parseLauncherScript} from './news-display-chain-audit-r6.mjs';

const TASK='ZGMINI-PC-Iran-Progress-R13';
const VBS_SHA='a26e561964a5d4b88a02f81185221c1d3d770541c2cc12d6ceca5898e2228846';
const RUNNER_SHA='438ac0ad3f5073fbecc0e785c6f8fee19042d6fc8638ece9ef1e5198dd4c1b69';
const BACKUP_SHA='cbeff8d254504780c3446bdc7f43484a87306e2163b3687784a10f5b85a4c3b6';
const SHA=s=>createHash('sha256').update(s).digest('hex');
const KST_MS=9*3600000;

function safeRead(file,maxBytes){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>maxBytes)throw Error('R8_UNSAFE_FILE');
 return {body:fs.readFileSync(file),stat};
}

function decodeCsv(buffer){
 if(buffer[0]===255&&buffer[1]===254)return buffer.subarray(2).toString('utf16le');
 if(buffer[1]===0&&buffer[3]===0)return buffer.toString('utf16le');
 try{return new TextDecoder('utf-8',{fatal:true}).decode(buffer);}
 catch{return new TextDecoder('euc-kr').decode(buffer);}
}

export function csvFirstRow(input){
 if(typeof input!=='string')throw Error('R8_CSV_TEXT_REQUIRED');
 const fields=[];let field='',quoted=false;
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(c==='"'){
   if(quoted&&input[i+1]==='"'){field+='"';i++;}
   else quoted=!quoted;
  }else if(c===','&&!quoted){fields.push(field);field='';}
  else if((c==='\r'||c==='\n')&&!quoted){
   if(fields.length||field)return [...fields,field];
  }else field+=c;
 }
 return [...fields,field];
}

// The task is on a Korean PC. No host timezone/date locale assumptions.
export function parseTaskLocalDate(value){
 if(typeof value!=='string')return null;
 const s=value.trim();
 let m=s.match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\s*(오전|오후|AM|PM)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/i);
 let y,month,day,ap,hour,minute,second;
 if(m){[,y,month,day,ap,hour,minute,second]=m;}
 else{
  m=s.match(/(\d{1,2})\/(\d{1,2})\/(20\d{2})\s*(오전|오후|AM|PM)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/i);
  if(!m)return null;
  [,month,day,y,ap,hour,minute,second]=m;
 }
 if(!ap){
  const following=s.slice((m.index??0)+m[0].length).trimStart().match(/^(오전|오후|AM|PM)/i);
  if(following)ap=following[1];
 }
 let H=Number(hour);
 if(/^(오후|PM)$/i.test(ap??''))H=H%12+12;
 if(/^(오전|AM)$/i.test(ap??''))H=H%12;
 const numbers=[Number(y),Number(month),Number(day),H,Number(minute),Number(second??0)];
 if(numbers[1]<1||numbers[1]>12||numbers[2]<1||numbers[2]>31||H>23||numbers[4]>59||numbers[5]>59)return null;
 const utc=Date.UTC(numbers[0],numbers[1]-1,numbers[2],H,numbers[4],numbers[5])-KST_MS;
 if(!Number.isFinite(utc))return null;
 const check=new Date(utc+KST_MS);
 if(check.getUTCFullYear()!==numbers[0]||check.getUTCMonth()+1!==numbers[1]||check.getUTCDate()!==numbers[2])return null;
 return utc;
}

export function evaluateR8Timing({runnerMtimeMs,cacheUpdatedAt,lastRunMs,lastResult,now=Date.now()}){
 if(!Number.isFinite(runnerMtimeMs)||!Number.isSafeInteger(cacheUpdatedAt)||cacheUpdatedAt>now||cacheUpdatedAt<=0)
  throw Error('R8_NEWS_CACHE_TIME_INVALID');
 if(lastRunMs===null)return {status:'NEEDS_REVIEW_R8_TASK_LAST_RUN_UNPARSEABLE',reason:'TASK_LAST_RUN_TIME_NOT_PARSED'};
 if(lastRunMs>now+60000)throw Error('R8_LAST_RUN_IN_FUTURE');
 if(lastRunMs<=runnerMtimeMs||cacheUpdatedAt<=runnerMtimeMs)
  return {status:'PENDING_R8_NEXT_NORMAL_SCHEDULE',reason:'NO_POST_INSTALL_CYCLE_YET'};
 if(cacheUpdatedAt<lastRunMs-60000||cacheUpdatedAt>lastRunMs+6*3600000)
  return {status:'NEEDS_REVIEW_R8_CACHE_RUN_MISMATCH',reason:'CACHE_UPDATE_NOT_TIED_TO_LAST_RUN'};
 if(lastResult!==0)
  return {status:'NEEDS_REVIEW_R8_R13_RESULT',reason:'LAST_TASK_RESULT_NONZERO_OR_UNKNOWN'};
 return {status:'PASS_R8_NEXT_NORMAL_R13_NEWS_CACHE_REFRESH',reason:'R13_AND_CACHE_AFTER_INSTALL'};
}

function taskOutput(args){
 const result=spawnSync('schtasks.exe',args,{encoding:'buffer',maxBuffer:1024*1024,timeout:20000,windowsHide:true});
 if(result.error||result.status!==0)throw Error('R8_TASK_QUERY_FAILED');
 return result.stdout;
}

export function auditR8({xml,csv,newsHome=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13'),now=Date.now()}={}){
 const task=describeSchedulerXml(xml);
 if(task.executable.toLowerCase()!=='wscript.exe'||task.scheduleHours.join(',')!=='0,6,12,18'||
  path.win32.basename(task.launcherPath??'').toLowerCase()!=='run-articles.vbs')throw Error('R8_SCHEDULE_CHANGED');
 if(fs.realpathSync.native(path.dirname(task.launcherPath)).toLowerCase()!==fs.realpathSync.native(newsHome).toLowerCase())
  throw Error('R8_TASK_HOME_CHANGED');
 const vbs=safeRead(task.launcherPath,20000).body;
 if(SHA(vbs)!==VBS_SHA)throw Error('R8_LAUNCHER_CHANGED');
 const entry=parseLauncherScript(vbs.toString('utf8'));
 if(entry.scriptBase.toLowerCase()!=='run-reference-flow-r3.mjs')throw Error('R8_RUNNER_CHANGED');
 const runner=safeRead(entry.scriptPath,200000);
 if(SHA(runner.body)!==RUNNER_SHA)throw Error('R8_RUNNER_NOT_R7');
 const backup=safeRead(entry.scriptPath+'.before-iran-news-r7',200000);
 if(SHA(backup.body)!==BACKUP_SHA)throw Error('R8_ORIGINAL_BACKUP_CHANGED');
 if(!runner.body.toString('utf8').includes("'news-display-maintenance-r1.mjs'"))throw Error('R8_NEWS_HOOK_MISSING');
 if(!fs.existsSync(path.join(newsHome,'iran.sqlite')))throw Error('R8_SCORE_LEDGER_NOT_FOUND');
 const cache=safeRead(path.join(newsHome,'news-display-r1.json'),1024*1024);
 const parsed=JSON.parse(cache.body.toString('utf8'));
 if(parsed.version!=='IRAN_NEWS_PC_DISPLAY_R1'||!Array.isArray(parsed.items)||parsed.items.length>100)
  throw Error('R8_DISPLAY_CACHE_INVALID');

 const row=csvFirstRow(csv.replace(/^\uFEFF/,''));
 if(row.length<7||!row[1].includes(TASK))throw Error('R8_SCHEDULER_CSV_UNRECOGNIZED');
 const lastRunMs=parseTaskLocalDate(row[5]);
 const lastResultText=row[6]?.trim();
 const lastResult=/^0x[\da-f]+$/i.test(lastResultText)?Number.parseInt(lastResultText,16):
  /^\d+$/.test(lastResultText)?Number(lastResultText):null;
 const result=evaluateR8Timing({runnerMtimeMs:runner.stat.mtimeMs,cacheUpdatedAt:parsed.updatedAt,
  lastRunMs,lastResult,now});
 return {...result,readOnly:true,task:TASK,scheduleHours:task.scheduleHours,
  runnerR7Verified:true,originalRunnerBackupVerified:true,launcherUnchanged:true,
  scoreLedgerPresent:true,cacheItems:parsed.items.length,cacheUpdatedAfterRunnerInstall:parsed.updatedAt>runner.stat.mtimeMs,
  taskRanAfterRunnerInstall:lastRunMs!==null&&lastRunMs>runner.stat.mtimeMs,
  taskLastResult:lastResult,cacheUpdateKst:new Date(parsed.updatedAt+KST_MS).toISOString().slice(0,19).replace('T',' '),
  taskLastRunKst:lastRunMs===null?null:new Date(lastRunMs+KST_MS).toISOString().slice(0,19).replace('T',' ')};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only')throw Error('R8_READ_ONLY_ONLY');
 try{
  const xml=decodeTaskXml(taskOutput(['/Query','/TN',TASK,'/XML']));
  const csv=decodeCsv(taskOutput(['/Query','/TN',TASK,'/V','/FO','CSV','/NH']));
  console.log(JSON.stringify(auditR8({xml,csv})));
 }catch(error){
  console.error(JSON.stringify({status:'STOP_R8_READ_ONLY_AUDIT',readOnly:true,reason:error.message}));
  process.exitCode=1;
 }
}
