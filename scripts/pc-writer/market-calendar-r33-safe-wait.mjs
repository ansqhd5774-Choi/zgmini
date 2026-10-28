// Bounded one-time R33 source installer. Never removes a Core lock or edits a task.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const allowedRaces=new Set(['R33_CORE_LOCK_PRESENT_STOP','R33_CORE_LOCK_RACE_STOP']);
const expectedFiles=['scripts/pc-writer/earnings-api-local.mjs'];
const policy='MAX_20_MINUTES_RETRY_ONLY_VERIFIED_CORE_LOCK_RACE_NO_FORCE_NO_SCHEDULER_NO_PUBLISH_NO_PUSH';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const isLocked=lock=>{try{fs.statSync(lock);return true;}
 catch(error){if(error?.code==='ENOENT')return false;throw error;}};

export function getCoreTaskState(){
 const query="(Get-ScheduledTask -TaskName 'ZGMINI-PC-Local-Core' -TaskPath '\\').State.ToString()";
 const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',query],{
  encoding:'utf8',windowsHide:true,timeout:15000,stdio:['ignore','pipe','pipe'],
 });
 if(result.error||result.status!==0||result.signal)throw Error('R33_TASK_QUERY_FAILED');
 const state=(result.stdout??'').trim();
 if(!['Ready','Running','Queued','Disabled'].includes(state))throw Error('R33_TASK_STATE_UNKNOWN');
 return state;
}

export async function waitAndInstallR33({limitMs=20*60*1000,intervalMs=10000,
 clock=()=>Date.now(),pause=sleep,locked,getTaskState,attemptInstall,progress=()=>{}}={}){
 if(!locked||!getTaskState||!attemptInstall)throw Error('R33_WAIT_DEPENDENCY_MISSING');
 const started=clock();
 const report={audit:'MARKET_CALENDAR_R33_SAFE_WAIT',at:new Date(started).toISOString(),
  policy,timeoutSeconds:Math.ceil(limitMs/1000),pollSeconds:intervalMs/1000,
  checks:0,attempts:0,lockSeen:false,lastTaskState:null,lastInstallerDecision:null,
  installerResult:null,decision:'R33_WAIT_NOT_STARTED'};
 let lastProgress=-Infinity;
 while(true){
  if(report.checks>0&&clock()-started>=limitMs){report.decision='R33_WAIT_TIMEOUT_NO_INSTALL';break;}
  let present;
  try{present=locked();}catch{report.decision='R33_WAIT_LOCK_QUERY_FAILED_STOP';break;}
  report.checks++;report.lockSeen ||=present;
  let state=null;
  if(!present){
   try{state=getTaskState();}catch{report.decision='R33_WAIT_TASK_QUERY_FAILED_STOP';break;}
   report.lastTaskState=state;
   if(state==='Disabled'){report.decision='R33_WAIT_TASK_DISABLED_STOP';break;}
   if(state==='Ready'){
    let second;
    try{second=locked();}catch{report.decision='R33_WAIT_LOCK_RECHECK_FAILED_STOP';break;}
    if(!second){
     report.attempts++;
     let attempt;
     try{attempt=attemptInstall();}catch{report.decision='R33_WAIT_INSTALL_LAUNCH_FAILED_STOP';break;}
     report.lastInstallerDecision=attempt?.installerDecision??null;
     if(attempt?.status==='INSTALLED'){
      report.installerResult=attempt.details??null;
      report.decision='R33_WAIT_INSTALLED_SUCCESS';break;
     }
     if(attempt?.status!=='CLEAN_LOCK_RACE'){
      report.errorCode=attempt?.code??'R33_UNEXPECTED_INSTALL_RESULT';
      report.decision='R33_WAIT_NON_LOCK_FAILURE_STOP';break;
     }
    }
   }
  }
  const elapsed=Math.max(0,clock()-started);
  if(elapsed-lastProgress>=30000){
   progress({elapsedSeconds:Math.floor(elapsed/1000),locked:present,state:state??'UNKNOWN',attempts:report.attempts});
   lastProgress=elapsed;
  }
  if(elapsed>=limitMs){report.decision='R33_WAIT_TIMEOUT_NO_INSTALL';break;}
  await pause(Math.min(intervalMs,limitMs-elapsed));
 }
 report.finishedAt=new Date(clock()).toISOString();
 report.elapsedSeconds=Math.max(0,Math.floor((clock()-started)/1000));
 return report;
}

function attemptR33Install(script,resultFile){
 const started=Date.now();
 const execution=spawnSync(process.execPath,[script,resultFile,'--apply'],{
  windowsHide:false,stdio:'inherit',
 });
 let details=null;
 try{
  const stat=fs.statSync(resultFile);
  const parsed=JSON.parse(fs.readFileSync(resultFile,'utf8'));
  if(stat.mtimeMs>=started-1500&&Date.parse(parsed.at)>=started-1500)details=parsed;
 }catch{}
 const decision=details?.decision??null;
 const base={installerDecision:decision};
 if(execution.error||execution.signal||!Number.isInteger(execution.status))
  return {...base,status:'FAILED',code:'R33_INSTALLER_PROCESS_FAILED'};
 if(execution.status===0&&decision==='R33_PC_CODE_INSTALLED_LOCAL_CACHE_REPLAY_ATTEMPTED'&&
  details.backupCreated===true&&details.forcedCollection===false&&details.publisherExecuted===false&&
  details.gitPushed===false&&/^[a-f\d]{40}$/.test(details.newSource??'')&&
  Array.isArray(details.changedFiles)&&details.changedFiles.length===1&&
  expectedFiles.every(p=>details.changedFiles.includes(p))){
  return {...base,status:'INSTALLED',details:{newSource:details.newSource,
   backupCreated:true,backupId:details.backupId??null,changedFiles:details.changedFiles,cacheReplay:details.cacheReplay??null,recordCount:details.recordCount??null}};
 }
 if(execution.status!==0&&allowedRaces.has(decision)&&
  Array.isArray(details.changedFiles)&&details.changedFiles.length===0&&
  details.backupCreated===false&&details.newSource===null&&
  details.forcedCollection===false&&details.publisherExecuted===false&&details.gitPushed===false)
  return {...base,status:'CLEAN_LOCK_RACE'};
 return {...base,status:'FAILED',code:decision??'R33_RESULT_MISSING_OR_INVALID'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const outFile=process.argv[2];
 const installer=path.join(here,'market-calendar-r33-cache-apply.mjs');
 const installReport=path.resolve(here,'../../MARKET_CALENDAR_R33_PC_APPLY_RESULT.txt');
 const lock=path.join(process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,'local-cycle.lock');
 if(!outFile||!fs.existsSync(installer)){
  console.error('R33_WAIT_REQUIRED_FILE_MISSING');process.exitCode=2;
 }else{
  let result;
  try{
   result=await waitAndInstallR33({locked:()=>isLocked(lock),getTaskState:getCoreTaskState,
    attemptInstall:()=>attemptR33Install(installer,installReport),
    progress:p=>console.log(`WAIT elapsed=${p.elapsedSeconds}s lock=${p.locked?'PRESENT':'ABSENT'} task=${p.state} attempts=${p.attempts}`),
   });
  }catch{result={audit:'MARKET_CALENDAR_R33_SAFE_WAIT',policy,
   decision:'R33_WAIT_UNEXPECTED_FAILURE_STOP'};}
  try{fs.writeFileSync(outFile,JSON.stringify(result,null,2)+'\n','utf8');}
  catch{console.error('R33_WAIT_RESULT_WRITE_FAILED');process.exitCode=2;}
  console.log(`R33_WAIT=${result.decision}`);
  console.log(`RESULT_FILE=${outFile}`);
  if(result.decision!=='R33_WAIT_INSTALLED_SUCCESS')process.exitCode=1;
 }
}
