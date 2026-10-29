// Independent scheduled analysis lane. Never changes the R41 collector, R26
// review workflow, the R5 war-score calculation, or their Windows tasks.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {renameWithRetrySync} from '../pc-writer/d1.mjs';

export const IRAN_NEWS_ANALYSIS_TASK_R1='ZGMINI-PC-Iran-News-Analysis-R1';
const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sourceDirectory=path.join(repoRoot,'scripts','iran-progress');
const DEFAULT_DATA_DIRECTORY=process.platform==='win32'? 'E:\\ZGmini\\data\\iran-progress-r13':
 path.join(os.homedir(),'.zgmini','iran-progress-r13');
const PROCESS_LIMIT_MS=35*60*1000;

export function analysisR1Files(dataDirectory){
 if(!path.isAbsolute(dataDirectory))throw Error('ANALYSIS_R1_DATA_PATH_INVALID');
 const data=path.resolve(dataDirectory);
 return {
  cache:path.join(data,'news-analysis-r1-cache.json'),
  staged:path.join(data,'news-analysis-r1-public-staged.json'),
  lastRun:path.join(data,'news-analysis-r1-last-run.json'),
 };
}

function safeReportFile(file,report){
 const temporary=`${file}.${process.pid}.tmp`;
 try{
  fs.writeFileSync(temporary,JSON.stringify(report,null,2),{flag:'wx',mode:0o600});
  renameWithRetrySync(temporary,file);
 }finally{
  if(fs.existsSync(temporary))fs.unlinkSync(temporary);
 }
}

function parseStepResult(stdout){
 const lines=String(stdout??'').trim().split(/\r?\n/).filter(Boolean);
 for(let i=lines.length-1;i>=0;i--){
  try{return JSON.parse(lines[i]);}catch{}
 }
 return null;
}

export function runScheduledIranNewsAnalysisR1({
 dataDirectory=process.env.ZGMINI_IRAN_HOME??DEFAULT_DATA_DIRECTORY,
 run=spawnSync,now=Date.now(),node=process.execPath,
}={}){
 if(!Number.isSafeInteger(now)||now<=0)throw Error('ANALYSIS_R1_TIME_INVALID');
 if(!fs.existsSync(dataDirectory)||!fs.statSync(dataDirectory).isDirectory())
  throw Error('ANALYSIS_R1_APPROVED_DATA_DIRECTORY_UNAVAILABLE');
 const files=analysisR1Files(dataDirectory);
 const steps=[
  {name:'ANALYZE',script:'news-r41-auto-interpret-r1.mjs',args:[
   '--mode=cycle',
   '--feed-url=https://zgmini.kr/api/outbreak-news/iran/r41',
   `--cache=${files.cache}`,`--output=${files.staged}`,
   '--model=gemma3:4b','--max-new=16',
  ]},
  {name:'PREFLIGHT',script:'news-analysis-publication-r1.mjs',args:[
   `--input=${files.staged}`,'--mode=dry-run',
  ]},
  {name:'PUBLISH',script:'news-analysis-publication-r1.mjs',args:[
   `--input=${files.staged}`,'--mode=publish',
  ]},
 ];
 const report={version:'IRAN_NEWS_ANALYSIS_SCHEDULED_R1',startedAt:now,
  status:'IN_PROGRESS',task:IRAN_NEWS_ANALYSIS_TASK_R1,steps:[],
  r41CollectorChanges:0,r26ReviewChanges:0,r5ScoreChanges:0};
 for(const step of steps){
  const script=path.join(sourceDirectory,step.script);
  if(!fs.existsSync(script)){
   report.status='BLOCKED';report.reason='ANALYSIS_R1_SOURCE_MISSING';
   report.failedStep=step.name;break;
  }
  const processResult=run(node,[script,...step.args],{cwd:repoRoot,encoding:'utf8',
   windowsHide:true,timeout:PROCESS_LIMIT_MS,maxBuffer:2*1024*1024});
  const parsed=parseStepResult(processResult.stdout);
  const entry={name:step.name,exitCode:processResult.status??null,
   status:parsed?.status??(processResult.error?.code==='ETIMEDOUT'?'TIMEOUT':'FAILED'),
   itemCount:parsed?.itemCount??parsed?.ready??null,
   pendingCount:parsed?.pendingCount??parsed?.pending??null};
  report.steps.push(entry);
  if(processResult.error||processResult.status!==0||!parsed||
    (step.name==='PREFLIGHT'&&parsed.status!=='DRY_RUN_VALIDATED')||
    (step.name==='PUBLISH'&&!['VERIFIED','UNCHANGED','REMOTE_NEWER_PRESERVED'].includes(parsed.status))){
   report.status='BLOCKED';report.failedStep=step.name;
   report.reason=parsed?.reason??(processResult.error?.code==='ETIMEDOUT'?
    'ANALYSIS_R1_STEP_TIMEOUT':'ANALYSIS_R1_STEP_FAILED');
   break;
  }
 }
 if(report.status==='IN_PROGRESS'){
  const publication=report.steps.find(step=>step.name==='PUBLISH')?.status;
  // Remote-newer preserves an already published snapshot. It must never be
  // reported as this cycle having published its staged analysis.
  report.status=publication==='VERIFIED'?'PUBLISHED_READBACK_VERIFIED':
   publication==='UNCHANGED'?'ALREADY_PUBLISHED_VERIFIED':
   'REMOTE_NEWER_PRESERVED';
 }
 report.finishedAt=Date.now();
 safeReportFile(files.lastRun,report);
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==2)throw Error('ANALYSIS_R1_SCHEDULED_ARGS_INVALID');
  const result=runScheduledIranNewsAnalysisR1();
  console.log(JSON.stringify(result));
  if(!['PUBLISHED_READBACK_VERIFIED','ALREADY_PUBLISHED_VERIFIED'].includes(result.status))
   process.exitCode=1;
 }catch(error){
  console.error(JSON.stringify({status:'ANALYSIS_R1_SCHEDULED_FAILED',reason:error.message}));
  process.exitCode=1;
 }
}
