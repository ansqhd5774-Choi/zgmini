// Promote ONLY the existing tenth-theme Desktop scheduled runner after its
// first verified D1/public-API publication. Scheduler XML and nine lanes stay.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildDcPowerScheduledRunner,planDcPowerTaskMirror,verifyDcPowerTask}
 from './theme-data-center-power-task-r5.mjs';

const TEMPLATE='\\ZGMINI-PC-GetMarketHistory-ETF';
const TARGET='\\ZGMINI-PC-Theme-Data-Center-Power';
const NAME='DATA_CENTER_POWER_R5_SCHEDULED.cmd';
const SHA=/^[a-f0-9]{40}$/;
const NODE='E:\\ZGmini\\runtime\\node.exe';
const ROOT='E:\\ZGmini\\data';
const fail=reason=>{throw Object.assign(new Error(reason),{reason});};
const need=(ok,reason)=>{if(!ok)fail(reason);};

export function buildDcPowerPublicRunnerR6({sha,runner}){
 need(SHA.test(sha??''),'R6_SOURCE_SHA_INVALID');
 need(path.win32.basename(runner).toLowerCase()===NAME.toLowerCase()&&
  path.win32.isAbsolute(runner),'R6_RUNNER_PATH_INVALID');
 const source=`E:\\ZGmini\\projects\\zgmini-theme-optional\\releases\\${sha}\\scripts\\pc-writer\\theme-data-center-power-publish-r3.mjs`;
 const lines=[
  '@echo off',
  'setlocal DisableDelayedExpansion',
  `set "DC_NODE=${NODE}"`,
  `set "ZGMINI_DATA_ROOT=${ROOT}"`,
  `set "DC_SOURCE=${source}"`,
  'set "DC_LOG=%~dp0DATA_CENTER_POWER_R5_SCHEDULED_RESULT.txt"',
  '>>"%DC_LOG%" echo DATA_CENTER_POWER_R6_SCHEDULED_PUBLIC_CYCLE',
  '>>"%DC_LOG%" echo STARTED=%DATE% %TIME%',
  'if not exist "%DC_NODE%" goto failed',
  'if not exist "%DC_SOURCE%" goto failed',
  '"%DC_NODE%" "%DC_SOURCE%" --once --collect --publish --accept-anonymous-license-risk >>"%DC_LOG%" 2>&1',
  'if errorlevel 1 goto failed',
  '>>"%DC_LOG%" echo RESULT=TENTH_PUBLIC_CYCLE_FINISHED_VERIFY_STATUS_ABOVE',
  'exit /b 0',
  ':failed',
  '>>"%DC_LOG%" echo RESULT=BLOCKED_REVIEW_LOG_NO_BLIND_RETRY',
  'exit /b 1',
 ];
 return Buffer.from(lines.join('\r\n')+'\r\n','ascii');
}

function decode(buf){
 if(buf[0]===0xff&&buf[1]===0xfe)return buf.subarray(2).toString('utf16le').replace(/^\uFEFF/,'');
 if(buf[1]===0)return buf.toString('utf16le').replace(/^\uFEFF/,'');
 return new TextDecoder('utf-8',{fatal:true}).decode(buf).replace(/^\uFEFF/,'');
}
function queryTask(task){
 const executable=path.win32.join(process.env.SystemRoot||'C:\\Windows','System32','schtasks.exe');
 return decode(execFileSync(executable,['/query','/tn',task,'/xml'],{
  windowsHide:true,timeout:30000,maxBuffer:3*1024*1024}));
}

// Resolve the runner from the already-registered tenth Task. The launcher can
// be copied anywhere; it must never guess or change the scheduled task path.
export function locateDcPowerRunnerR6({readTask=queryTask,fileExists=fs.existsSync}={}){
 const target=readTask(TARGET);
 const actions=[...target.matchAll(/<Actions(?:\s[^>]*)?>[\s\S]*?<\/Actions\s*>/g)];
 need(actions.length===1,'R6_REGISTERED_TASK_ACTIONS_AMBIGUOUS');
 const execs=[...actions[0][0].matchAll(/<Exec(?:\s[^>]*)?>([\s\S]*?)<\/Exec\s*>/g)];
 need(execs.length===1,'R6_REGISTERED_TASK_EXEC_AMBIGUOUS');
 const field=tag=>{
  const matches=[...execs[0][1].matchAll(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`,'g'))];
  need(matches.length===1,`R6_REGISTERED_TASK_${tag.toUpperCase()}_MISSING`);
  return matches[0][1].replace(/&(?:amp|quot|apos|lt|gt);/g,entity=>({
   '&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'
  })[entity]);
 };
 const command=field('Command');
 need(path.win32.isAbsolute(command)&&/^cmd\.exe$/i.test(path.win32.basename(command)),
  'R6_REGISTERED_TASK_COMMAND_UNEXPECTED');
 const match=field('Arguments').match(/^\/d \/c ""([^"\r\n]+)""$/i);
 need(match,'R6_REGISTERED_TASK_ARGUMENTS_UNEXPECTED');
 const runner=match[1];
 need(path.win32.isAbsolute(runner)&&
  path.win32.basename(runner).toLowerCase()===NAME.toLowerCase()&&
  !/[<>"|?*\r\n]/.test(runner),'R6_REGISTERED_TASK_RUNNER_PATH_INVALID');
 need(path.win32.normalize(field('WorkingDirectory')).toLowerCase()===
  path.win32.normalize(path.win32.dirname(runner)).toLowerCase(),
 'R6_REGISTERED_TASK_WORKDIR_UNEXPECTED');
 const expected=planDcPowerTaskMirror(readTask(TEMPLATE),runner);
 verifyDcPowerTask(expected,target,runner);
 return {runner,exists:fileExists(runner)};
}

export function preflightRunnerR6({runner,sha,readTask=queryTask}){
 need(process.platform==='win32','WINDOWS_CMD_ONLY');
 need(SHA.test(sha??''),'R6_SOURCE_SHA_INVALID');
 need(path.win32.isAbsolute(runner)&&path.win32.basename(runner).toLowerCase()===NAME.toLowerCase(),
  'R6_RUNNER_PATH_INVALID');
 need(fs.existsSync(NODE)&&fs.existsSync(ROOT),'R6_APPROVED_PC_PATH_MISSING');
 const source=path.win32.join('E:\\ZGmini\\projects\\zgmini-theme-optional\\releases',sha,
  'scripts','pc-writer','theme-data-center-power-publish-r3.mjs');
 need(fs.existsSync(source),'R6_VERIFIED_SOURCE_NOT_STAGED');
 const original=buildDcPowerScheduledRunner();
 const promoted=buildDcPowerPublicRunnerR6({sha,runner});
 const saved=fs.readFileSync(runner);
 need(saved.equals(original)||saved.equals(promoted),'R6_EXISTING_RUNNER_DRIFT');
 const expected=planDcPowerTaskMirror(readTask(TEMPLATE),runner);
 verifyDcPowerTask(expected,readTask(TARGET),runner);
 return {original,promoted,existingIsPromoted:saved.equals(promoted)};
}

export function applyRunnerR6({runner,sha,readTask=queryTask}={}){
 const checked=preflightRunnerR6({runner,sha,readTask});
 if(checked.existingIsPromoted)return {status:'TENTH_PUBLIC_RUNNER_ALREADY_VERIFIED',runnerWrites:0};
 const backup=path.win32.join(path.win32.dirname(runner),'DATA_CENTER_POWER_R5_SCHEDULED_PRIVATE_BACKUP.cmd');
 if(fs.existsSync(backup))need(fs.readFileSync(backup).equals(checked.original),
  'R6_PRIVATE_BACKUP_DRIFT');
 else fs.writeFileSync(backup,checked.original,{flag:'wx'});
 const pending=runner+'.r6.pending';
 need(!fs.existsSync(pending),'R6_PENDING_RUNNER_REVIEW_REQUIRED');
 fs.writeFileSync(pending,checked.promoted,{flag:'wx'});
 fs.renameSync(pending,runner);
 need(fs.readFileSync(runner).equals(checked.promoted),'R6_RUNNER_READBACK_FAILED');
 // Task XML was never changed; check again that it still points at this runner.
 const expected=planDcPowerTaskMirror(readTask(TEMPLATE),runner);
 verifyDcPowerTask(expected,readTask(TARGET),runner);
 return {status:'TENTH_PUBLIC_RUNNER_CUTOVER_VERIFIED',runnerWrites:1,backup};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [action,runner,sha]=process.argv.slice(2);
 try{
  need(process.platform==='win32','WINDOWS_CMD_ONLY');
  if(action==='--locate'){
   need(process.argv.length===3,'R6_ARGS_INVALID');
   const located=locateDcPowerRunnerR6();
   console.log(`runnerPath=${located.runner}`);
   need(located.exists,'R6_REGISTERED_RUNNER_FILE_MISSING');
   console.log(JSON.stringify({report:'DATA_CENTER_POWER_R6_RUNNER_LOCATION',status:'READY',
    taskWrites:0,runnerWrites:0,existingNineTaskChanges:0,d1Writes:0}));
  }else{
   need(process.argv.length===5&&['--inspect','--apply'].includes(action),'R6_ARGS_INVALID');
   const result=action==='--apply'?applyRunnerR6({runner,sha}):{
    status:preflightRunnerR6({runner,sha}).existingIsPromoted?
     'TENTH_PUBLIC_RUNNER_ALREADY_VERIFIED':'TENTH_PRIVATE_RUNNER_READY_TO_CUTOVER',runnerWrites:0};
   console.log(JSON.stringify({report:'DATA_CENTER_POWER_R6_SCHEDULE_CUTOVER',...result,
    taskWrites:0,existingNineTaskChanges:0,d1Writes:0}));
  }
 }catch(error){
  console.log(JSON.stringify({report:'DATA_CENTER_POWER_R6_SCHEDULE_CUTOVER',status:'BLOCKED',
   reason:error?.reason??'R6_PC_TASK_OR_FILESYSTEM_ERROR',existingNineTaskChanges:0,
   taskWrites:0,d1Writes:0}));
  process.exitCode=1;
 }
}
