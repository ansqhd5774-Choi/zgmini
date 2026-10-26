// Read-only diagnostic of ONLY the localized R13 last-run timestamp field.
// No action paths, usernames, credentials, article contents, or ledger rows.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {csvFirstRow,parseTaskLocalDate} from './news-display-scheduled-verify-r8.mjs';
import {decodeTaskXml,describeSchedulerXml,parseLauncherScript} from './news-display-chain-audit-r6.mjs';

const TASK='ZGMINI-PC-Iran-Progress-R13';
const KST_MS=9*3600000;
const kstStamp=n=>Number.isFinite(n)?new Date(n+KST_MS).toISOString().slice(0,19).replace('T',' '):null;

function query(args){
 const r=spawnSync('schtasks.exe',args,{encoding:'buffer',windowsHide:true,maxBuffer:1024*1024,timeout:20000});
 if(r.error||r.status!==0)throw Error('R8B_TASK_QUERY_FAILED');
 return r.stdout;
}

function decodeCsv(buffer){
 if(buffer[0]===255&&buffer[1]===254)return buffer.subarray(2).toString('utf16le');
 if(buffer[1]===0&&buffer[3]===0)return buffer.toString('utf16le');
 try{return new TextDecoder('utf-8',{fatal:true}).decode(buffer);}
 catch{return new TextDecoder('euc-kr').decode(buffer);}
}

export function describeTaskTime({csv,xml,now=Date.now(),home=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13')}){
 const row=csvFirstRow(csv.replace(/^\uFEFF/,''));
 if(row.length<7||!row[1].includes(TASK))throw Error('R8B_TASK_ROW_UNRECOGNIZED');
 const raw=row[5]??'';
 if(raw.length>120)throw Error('R8B_LAST_RUN_FIELD_TOO_LONG');
 const safe=/^[\p{L}\p{N}\s:\/.,()\-]+$/u.test(raw);
 const info=describeSchedulerXml(xml);
 if(info.executable.toLowerCase()!=='wscript.exe'||!info.launcherPath||info.scheduleHours.join(',')!=='0,6,12,18')
  throw Error('R8B_TASK_ACTION_CHANGED');
 const vbs=fs.readFileSync(info.launcherPath,'utf8');
 const runner=parseLauncherScript(vbs).scriptPath;
 const runnerMtime=fs.statSync(runner).mtimeMs;
 const cache=JSON.parse(fs.readFileSync(path.join(home,'news-display-r1.json'),'utf8'));
 if(!Number.isSafeInteger(cache.updatedAt))throw Error('R8B_CACHE_UPDATE_TIME_INVALID');
 const lastRunMs=parseTaskLocalDate(raw);
 return {status:'PASS_R8B_TASK_TIME_READ_ONLY',readOnly:true,task:TASK,
  fieldCount:row.length,
  lastRunRaw:safe?raw:'REDACTED_UNEXPECTED_CHARACTERS',
  lastRunCodepoints:[...raw].slice(0,80).map(c=>c.codePointAt(0).toString(16)).join(' '),
  lastRunParsed: lastRunMs!==null,
  taskLastResult:(row[6]??'').trim().slice(0,16),
  runnerInstalledKst:kstStamp(runnerMtime),
  cacheUpdatedKst:kstStamp(cache.updatedAt),
  lastRunKst:kstStamp(lastRunMs),
  cacheUpdatedAfterInstall:cache.updatedAt>runnerMtime,
  lastRunAfterInstall:lastRunMs===null?null:lastRunMs>runnerMtime,
  clockKst:kstStamp(now),
  schedulerChanged:false,cacheModified:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only')throw Error('R8B_READ_ONLY_FLAG_REQUIRED');
 try{
  const csv=decodeCsv(query(['/Query','/TN',TASK,'/V','/FO','CSV','/NH']));
  const xml=decodeTaskXml(query(['/Query','/TN',TASK,'/XML']));
  console.log(JSON.stringify(describeTaskTime({csv,xml})));
 }catch(error){
  console.error(JSON.stringify({status:'STOP_R8B_TASK_TIME_READ_ONLY',readOnly:true,reason:error.message}));
  process.exitCode=1;
 }
}
