// R73: report the native Windows error for the ONE existing private task.
// Query and verify the exact task before changing its action. No task recreate,
// no schedule/identity changes, no D1 or provider calls by this installer.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {auditR73ExistingTaskXml} from './theme-nine-r73-install-private-auto.mjs';

const TASK='ZGMINI-PC-Theme-Nine-R47-Private';
const ROOT='E:/ZGmini/data/pc-writer/theme-nine-r48';
const WRAPPER='THEME_NINE_R73_SCHEDULED_PRIVATE.cmd';
const sha=value=>createHash('sha256').update(value).digest('hex');
const fail=(code,extra={})=>{throw Object.assign(new Error(code),{code,extra});};
const xmlSection=(value,name)=>value.match(
  new RegExp(`<${name}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${name}>`))?.[0]??null;

export function safeWindowsCommandMessage(result){
  const bytes=[result.stdout,result.stderr].filter(Boolean).map(value=>
    Buffer.isBuffer(value)?value:Buffer.from(String(value)));
  if(!bytes.length)return 'NO_NATIVE_OUTPUT';
  const raw=Buffer.concat(bytes);
  let value;
  try{value=new TextDecoder('utf-8',{fatal:true}).decode(raw);}
  catch{value=new TextDecoder('euc-kr').decode(raw);}
  return value.replaceAll(ROOT,'<PRIVATE_APP_ROOT>')
    .replace(/[A-Z]:\\[^\s"']+/gi,'<WINDOWS_PATH>')
    .replace(/\b[A-Z0-9._-]+\\[A-Z0-9._-]+\b/gi,'<WINDOWS_ACCOUNT>')
    .replace(/\s+/g,' ').trim().slice(0,600)||'NO_NATIVE_OUTPUT';
}

function execute(program,args){
  const result=spawnSync(program,args,{encoding:null,timeout:30000,
    windowsHide:true,maxBuffer:1024*1024});
  if(result.error)fail('WINDOWS_PROCESS_FAILED',{processError:result.error.code});
  return result;
}

function isAdministrator(){
  try{
    const cmd='([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)';
    const result=execute('powershell.exe',['-NoProfile','-NonInteractive',
      '-Command',cmd]);
    if(result.status!==0)return 'UNKNOWN';
    return result.stdout.toString('utf8').trim().toLowerCase()==='true';
  }catch{return 'UNKNOWN';}
}

export function diagnoseAndApply({run=execute,exists=fs.existsSync,
  root=ROOT,platform=process.platform}={}){
  if(platform!=='win32')fail('WINDOWS_PC_REQUIRED');
  const existing=fs.realpathSync(root);
  const scheduled=path.join(existing,WRAPPER);
  const manual=path.join(existing,'THEME_NINE_R73_AUTO_HTTP502_PRIVATE.cmd');
  if(!exists(scheduled)||!exists(manual))fail('R73_WRAPPERS_MISSING');
  if(exists('E:/ZGmini/data/themes/legacy-nine-r35-delta/state/delta.lock'))
    fail('PRIVATE_COLLECTION_ACTIVE');
  const exe=(...args)=>run('schtasks',args);
  const readTask=()=>{
    const response=exe('/Query','/TN',TASK,'/XML');
    if(response.status!==0)fail('TASK_QUERY_FAILED',{
      nativeExitCode:response.status,nativeMessage:safeWindowsCommandMessage(response)});
    return Buffer.isBuffer(response.stdout)?response.stdout.toString('utf8'):
      String(response.stdout);
  };
  const before=readTask();
  const old=auditR73ExistingTaskXml(before,{target:existing});
  const elevated=isAdministrator();
  let result=null;
  if(old.status==='EXACT_R48'){
    const backup=path.join(existing,`R73_NATIVE_TASK_BACKUP_${Date.now()}.xml`);
    fs.writeFileSync(backup,before,{flag:'wx'});
    if(sha(fs.readFileSync(backup))!==sha(Buffer.from(before)))
      fail('TASK_BACKUP_READBACK');
    result=exe('/Change','/TN',TASK,'/TR',path.win32.join(existing,WRAPPER));
  }
  const after=readTask();
  const newTask=auditR73ExistingTaskXml(after,{target:existing});
  const otherSectionsUntouched=['Triggers','Principals','Settings'].every(
    name=>xmlSection(before,name)===xmlSection(after,name));
  if(!otherSectionsUntouched)fail('TASK_NON_ACTION_DRIFT');
  if(newTask.status==='ALREADY_R73')return {
    status:'R73_TASK_ACTION_VERIFIED',nativeChangeExitCode:result?.status??null,
    nativeMessage:result?safeWindowsCommandMessage(result):'ALREADY_R73',
    elevated,taskChangedByThisRun:old.status==='EXACT_R48',
    scheduledAt:'11:30_KST',d1Writes:0,publicWrites:0};
  return {status:'STOP_R73_TASK_NOT_UPDATED',nativeChangeExitCode:result?.status??null,
    nativeMessage:result?safeWindowsCommandMessage(result):'NO_CHANGE_ATTEMPT',
    elevated,taskChangedByThisRun:false,scheduledAt:'11:30_KST',
    d1Writes:0,publicWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3||process.argv[2]!=='--apply')fail('USAGE');
    const outcome=diagnoseAndApply();
    process.stdout.write(JSON.stringify({report:'THEME_NINE_R73_NATIVE_TASK',
      ...outcome},null,2)+'\n');
    if(outcome.status.startsWith('STOP_'))process.exitCode=2;
  }catch(error){
    process.stderr.write(JSON.stringify({status:'STOP_R73_NATIVE_TASK',
      reason:error.code??'UNEXPECTED',...error.extra,d1Writes:0,
      publicWrites:0})+'\n');
    process.exitCode=1;
  }
}
