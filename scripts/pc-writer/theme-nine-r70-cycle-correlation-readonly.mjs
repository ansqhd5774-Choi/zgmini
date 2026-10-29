// R70: correlate the two existing Windows task start times with their last
// approved, local-only R47/R48/R54 logs. No provider, D1 or scheduler writes.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {collectR69ReadOnly,decodeR69Windows} from './theme-nine-r69-schedule-readonly.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const LOG_GROUPS=Object.freeze([
  {key:'R47',folder:'E:/ZGmini/data/pc-writer/theme-nine-r48',
    name:/^THEME_NINE_R47_RECURRING_PRIVATE_UPDATE_\d+_\d+\.txt$/i},
  {key:'R48',folder:'E:/ZGmini/data/pc-writer/theme-nine-r48',
    name:/^THEME_NINE_R48_PRIVATE_CYCLE_\d+_\d+\.txt$/i},
  {key:'R54',folder:'E:/ZGmini/data/pc-writer/theme-nine-r54/logs',
    name:/^THEME_NINE_R54_CYCLE_\d+_\d+\.txt$/i},
]);

export function parseR70KoreanRunTime(value){
  const match=String(value??'').match(/^(\d{4})-(\d{2})-(\d{2})-(?:\S+\s+)?(오전|오후)\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if(!match)return null;
  const [,year,month,day,ampm,hour,minute,second]=match;
  const h=Number(hour);
  if(h<1||h>12)return null;
  const h24=(h%12)+(ampm==='오후'?12:0);
  const utc=Date.UTC(Number(year),Number(month)-1,Number(day),h24-9,Number(minute),Number(second));
  return Number.isFinite(utc)?new Date(utc).toISOString():null;
}

const SAFE_CODES=/\b(?:STOP|WAIT|PUBLIC|PRIVATE|R\d+|SOURCE|D1|TASK|BUNDLE|WINDOW|AUDIT)_[A-Z0-9_]{3,100}\b/g;
export function summarizeR70Evidence(contents){
  const sample=String(contents);
  const statuses=[...new Set(sample.match(SAFE_CODES)??[])].slice(-16);
  const dates={};
  for(const key of ['benchmarkDate','confirmedObservationDate','lastVerifiedSpyNYDay',
    'lastSessionNYDay','latestSessionNYDay','observationDate','sourceDate']){
    const matches=[...sample.matchAll(new RegExp(`"${key}"\\s*:\\s*"(20\\d{2}-\\d{2}-\\d{2})"`,'g'))];
    if(matches.length)dates[key]=matches.at(-1)[1];
  }
  const numbers={};
  for(const key of ['providerCalls','rawFilesStored','rawPagesStored','d1Writes',
    'publicWrites','publicationWrites','verifiedCompletedWindows']){
    const matches=[...sample.matchAll(new RegExp(`"${key}"\\s*:\\s*(\\d+)`,'g'))];
    if(matches.length)numbers[key]=Number(matches.at(-1)[1]);
  }
  const result=sample.match(/(?:^|\r?\n)RESULT=(EXECUTED_CHECK_JSON_STATUS|STOP_OR_PENDING_REVIEW_TXT)/);
  return {statuses,dates,numbers,...(result?{cmdResult:result[1]}:{})};
}

function latestLogs(group){
  if(!fs.existsSync(group.folder))return {status:'FOLDER_ABSENT',logs:[]};
  const files=fs.readdirSync(group.folder).filter(name=>group.name.test(name))
    .map(name=>({name,file:path.join(group.folder,name)}))
    .map(entry=>({...entry,stat:fs.lstatSync(entry.file)}))
    .filter(entry=>entry.stat.isFile()&&entry.stat.size<1024*1024)
    .sort((a,b)=>b.stat.mtimeMs-a.stat.mtimeMs).slice(0,3);
  return {status:files.length?'RECENT_LOGS_FOUND':'NO_MATCHING_LOGS',logs:files.map(entry=>({
    filename:entry.name,modifiedAt:new Date(entry.stat.mtimeMs).toISOString(),
    ...summarizeR70Evidence(fs.readFileSync(entry.file,'utf8')),
  }))};
}

export function compareR70LogsToTasks(tasks,logs){
  return tasks.map(task=>{
    const group=task.task.includes('R47-Private')?'R48':'R54';
    const latest=logs[group].logs[0];
    const lastRunUtc=parseR70KoreanRunTime(task.verbose?.lastRun);
    const logUtc=latest?.modifiedAt??null;
    const lagMinutes=lastRunUtc&&logUtc?
      Math.round((Date.parse(logUtc)-Date.parse(lastRunUtc))/60000):null;
    return {task:task.task,lastRunUtc,lastResult:task.verbose?.lastResult??null,
      latestLogUtc:logUtc,minutesLogAfterRun:lagMinutes,
      lastLogConsistentWithRun:lagMinutes===null?null:(lagMinutes>=-2&&lagMinutes<=180),
      ...(group==='R48'?{latestNestedR47LogUtc:logs.R47.logs[0]?.modifiedAt??null}:{})};
  });
}

function checkExpectedActionFolders(){
  const expected=[
    ['ZGMINI-PC-Theme-Nine-R47-Private','E:\\ZGmini\\data\\pc-writer\\theme-nine-r48\\THEME_NINE_R48_PRIVATE_CYCLE.cmd'],
    ['ZGMINI-PC-Theme-Nine-R54-Public','E:\\ZGmini\\data\\pc-writer\\theme-nine-r54\\scripts\\pc-writer\\THEME_NINE_R54_PUBLIC_CYCLE.cmd'],
  ];
  return expected.map(([task,fullPath])=>{
    const q=spawnSync('schtasks',['/Query','/TN',task,'/XML'],
      {encoding:null,timeout:20000,windowsHide:true,maxBuffer:1024*1024});
    const xml=q.status===0?decodeR69Windows(q.stdout??Buffer.alloc(0)):'';
    const command=xml.match(/<Command>([^<]+)<\/Command>/i)?.[1]??'';
    const argumentsXml=xml.match(/<Arguments>([^<]+)<\/Arguments>/i)?.[1]??'';
    const value=(command+' '+argumentsXml).replaceAll('/','\\').replaceAll('&quot;','"').toLowerCase();
    return {task,xmlExit:q.status,expectedAbsoluteActionPathMatches:
      q.status===0&&value.includes(fullPath.toLowerCase())};
  });
}

export function collectR70ReadOnly(){
  if(process.platform!=='win32')throw Error('R70_WINDOWS_PC_REQUIRED');
  const r69=collectR69ReadOnly();
  const logs=Object.fromEntries(LOG_GROUPS.map(group=>[group.key,latestLogs(group)]));
  return {report:'THEME_NINE_R70_SCHEDULE_CYCLE_CORRELATION_READONLY',
    inspectedAt:new Date().toISOString(),
    timezoneIsKorea:r69.timezoneIsKorea,
    tasks:r69.tasks.map(({task,verbose,xml})=>({task,lastRun:verbose?.lastRun??null,
      lastResult:verbose?.lastResult??null,nextRun:verbose?.nextRun??null,
      riskCodes:xml?.riskCodes??[]})),
    expectedTaskActions:checkExpectedActionFolders(),
    recentLogs:logs,runToLog:compareR70LogsToTasks(r69.tasks,logs),
    providerCallsByThisDiagnostic:0,taskWrites:0,d1Writes:0,
    conclusion:'READ_ONLY_DIAGNOSIS_NOT_DATA_REFRESH'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==2)throw Error('R70_NO_ARGUMENTS');
    process.stdout.write(JSON.stringify(collectR70ReadOnly(),null,2)+'\n');
  }catch(error){
    process.stderr.write(JSON.stringify({status:'STOP_R70_READONLY',
      reason:error?.message??'UNKNOWN',taskWrites:0,d1Writes:0})+'\n');
    process.exitCode=1;
  }
}
