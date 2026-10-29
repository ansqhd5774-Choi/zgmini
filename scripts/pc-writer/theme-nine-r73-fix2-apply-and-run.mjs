// R73 FIX2: upgrade only a known, previously installed R73 retry file and
// verify/repoint the single existing 11:30 private task if still on R48.
// Requires the user's normal Windows task-edit permission; no elevation hack.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {auditR73ExistingTaskXml} from './theme-nine-r73-install-private-auto.mjs';

const SOURCE=path.dirname(fileURLToPath(import.meta.url));
const TARGET='E:/ZGmini/data/pc-writer/theme-nine-r48';
const TASK='ZGMINI-PC-Theme-Nine-R47-Private';
const FILE='theme-nine-r73-auto-http502-private-retry.mjs';
const PRIOR_SHA='52e6e5e9a866fb8ca28a4e029d0ed55d4709481cd0baf9278aa6068813047649';
const CURRENT_SHA='0940698222e0eba68940c0bb36023c71a53e29fb8c8ffdbb032b1492c4b168dc';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const stop=(code,detail={})=>{throw Object.assign(new Error(code),{code,detail});};
const section=(xml,name)=>xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${name}>`))?.[0]??null;

function taskCommand(args){
  const result=spawnSync('schtasks',args,{encoding:'utf8',timeout:30000,
    windowsHide:true,maxBuffer:1024*1024});
  if(result.error)stop('WINDOWS_SCHTASKS_PROCESS_ERROR',{code:result.error.code});
  return result;
}

function taskChangeError(result){
  const message=`${result.stdout??''} ${result.stderr??''}`.toLowerCase();
  return {code:message.includes('access is denied')||message.includes('액세스가 거부')||
    message.includes('access denied')?'WINDOWS_TASK_PERMISSION_REQUIRED':
    'WINDOWS_TASK_CHANGE_FAILED',exitCode:result.status};
}

export function applyR73Fix2({source=SOURCE,target=TARGET}={}){
  if(process.platform!=='win32')stop('WINDOWS_PC_REQUIRED');
  const root=fs.realpathSync(target);
  const original=path.join(root,'THEME_NINE_R48_PRIVATE_CYCLE.cmd');
  const scheduled=path.join(root,'THEME_NINE_R73_SCHEDULED_PRIVATE.cmd');
  const manual=path.join(root,'THEME_NINE_R73_AUTO_HTTP502_PRIVATE.cmd');
  if(![original,scheduled,manual].every(p=>fs.existsSync(p)))
    stop('EXISTING_R73_CHAIN_MISSING');
  if(fs.existsSync('E:/ZGmini/data/themes/legacy-nine-r35-delta/state/delta.lock'))
    stop('PRIVATE_COLLECTION_ACTIVE');
  const src=path.join(source,FILE),dst=path.join(root,FILE);
  if(!fs.existsSync(src)||!fs.existsSync(dst))stop('SCRIPT_MISSING');
  const incoming=digest(fs.readFileSync(src));
  if(incoming!==CURRENT_SHA)stop('INCOMING_FIX2_HASH_MISMATCH');
  const installed=digest(fs.readFileSync(dst));
  if(installed!==PRIOR_SHA&&installed!==CURRENT_SHA)
    stop('INSTALLED_FILE_UNKNOWN_HASH');

  const before=taskCommand(['/Query','/TN',TASK,'/XML']);
  if(before.status!==0)stop('EXISTING_PRIVATE_TASK_NOT_FOUND');
  const priorTask=auditR73ExistingTaskXml(before.stdout,{target:root});
  let scriptUpdated=false;
  let backup=null;
  if(installed===PRIOR_SHA){
    backup=path.join(root,`R73_FIX2_ORIGINAL_${Date.now()}.bak`);
    fs.copyFileSync(dst,backup,fs.constants.COPYFILE_EXCL);
    if(digest(fs.readFileSync(backup))!==PRIOR_SHA)stop('SCRIPT_BACKUP_READBACK');
    // The exact known prior R73 version is the only file we replace.
    fs.copyFileSync(src,dst);
    if(digest(fs.readFileSync(dst))!==CURRENT_SHA)stop('SCRIPT_UPDATE_READBACK');
    scriptUpdated=true;
  }
  let taskUpdated=false;
  if(priorTask.status==='EXACT_R48'){
    const taskBackup=path.join(root,`R73_FIX2_TASK_${Date.now()}.xml`);
    fs.writeFileSync(taskBackup,before.stdout,{flag:'wx'});
    if(digest(fs.readFileSync(taskBackup))!==digest(Buffer.from(before.stdout)))
      stop('TASK_BACKUP_READBACK');
    const changed=taskCommand(['/Change','/TN',TASK,'/TR',path.win32.join(root,
      'THEME_NINE_R73_SCHEDULED_PRIVATE.cmd')]);
    if(changed.status!==0){
      const error=taskChangeError(changed);
      stop(error.code,{exitCode:error.exitCode,scriptUpdated,
        taskActionStillOriginal:true});
    }
    taskUpdated=true;
  }
  const after=taskCommand(['/Query','/TN',TASK,'/XML']);
  if(after.status!==0)stop('TASK_READBACK_FAILED');
  if(auditR73ExistingTaskXml(after.stdout,{target:root}).status!=='ALREADY_R73')
    stop('TASK_ACTION_NOT_R73');
  for(const name of ['Triggers','Principals','Settings'])
    if(section(before.stdout,name)!==section(after.stdout,name))
      stop('TASK_NON_ACTION_DRIFT');
  return {status:'R73_FIX2_APPLIED_AND_TASK_VERIFIED',scriptUpdated,taskUpdated,
    priorR73ScriptBackedUp:!!backup,task:TASK,scheduledAt:'11:30_KST',
    d1Writes:0,publicWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3||process.argv[2]!=='--apply')stop('USAGE');
    process.stdout.write(JSON.stringify({report:'THEME_NINE_R73_FIX2',
      ...applyR73Fix2()},null,2)+'\n');
  }catch(error){
    process.stderr.write(JSON.stringify({status:'STOP_R73_FIX2',
      reason:error.code??'UNEXPECTED',...error.detail,
      d1Writes:0,publicWrites:0})+'\n');
    process.exitCode=1;
  }
}
