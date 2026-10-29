// R73 one-time installer: verify existing private R48 task and bundle, then
// change ONLY its action to the same private cycle wrapped with capped 502 retry.
// No task deletion, R47 source replacement, provider GET or public D1 writes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const TARGET='E:/ZGmini/data/pc-writer/theme-nine-r48';
const TASK='ZGMINI-PC-Theme-Nine-R47-Private';
const ORIGINAL='THEME_NINE_R48_PRIVATE_CYCLE.cmd';
const UPDATED='THEME_NINE_R73_AUTO_HTTP502_PRIVATE.cmd';
const FILES=[
  UPDATED,
  'theme-nine-r73-auto-http502-private-retry.mjs',
  'theme-nine-r72-transient-checkpoint-recover.mjs',
  'theme-nine-r71-private-recovery-once.mjs',
  'theme-nine-r70-cycle-correlation-readonly.mjs',
  'theme-nine-r69-schedule-readonly.mjs',
];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{throw Object.assign(new Error('R73_'+code),{code:'R73_'+code});};
const decodeXml=x=>x.replace(/&quot;/g,'"').replace(/&apos;/g,"'")
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const xmlSection=(xml,name)=>{
  const match=xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${name}>`));
  if(!match)fail('WINDOWS_TASK_XML_MISSING_'+name.toUpperCase());
  return match[0];
};

export function auditR73ExistingTaskXml(xml,{target=TARGET}={}){
  if(typeof xml!=='string'||!xml.includes('schemas.microsoft.com/windows/2004/02/mit/task'))
    fail('WINDOWS_TASK_XML');
  const action=decodeXml(xmlSection(xml,'Actions'));
  const source=path.win32.join(target,ORIGINAL);
  const replacement=path.win32.join(target,UPDATED);
  const originalCount=action.split(source).length-1;
  const replacementCount=action.split(replacement).length-1;
  if((action.match(/<Exec(?:\s|>)/g)??[]).length!==1||
     !action.includes('<Command>cmd.exe</Command>')||
     !action.includes('/d /c')||
     (originalCount!==1||replacementCount!==0)&&
     (replacementCount!==1||originalCount!==0))fail('UNEXPECTED_TASK_ACTION');
  const trigger=decodeXml(xmlSection(xml,'Triggers'));
  if(!trigger.includes('T11:30:00')||!trigger.includes('<DaysInterval>1</DaysInterval>'))
    fail('UNEXPECTED_TASK_TRIGGER');
  return {status:replacementCount===1?'ALREADY_R73':'EXACT_R48',
    task:TASK,privateOnly:true,scheduledAt:'11:30_KST'};
}

function execute(program,args){
  const result=spawnSync(program,args,{encoding:'utf8',timeout:30000,
    windowsHide:true,maxBuffer:1024*1024});
  if(result.error)fail('WINDOWS_COMMAND_FAILED');
  return result;
}

export function installR73PrivateRetry({source=HERE,target=TARGET}={}){
  if(process.platform!=='win32')fail('WINDOWS_PC_REQUIRED');
  if(execute('tzutil',['/g']).stdout.trim()!=='Korea Standard Time')
    fail('EXPECTED_PC_KOREA_TIMEZONE');
  const hour=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
    timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23',
  }).formatToParts(new Date()).filter(x=>['hour','minute'].includes(x.type))
    .map(x=>[x.type,Number(x.value)]));
  const currentMinute=hour.hour*60+hour.minute;
  if((currentMinute>=670&&currentMinute<=735)||
     (currentMinute>=795&&currentMinute<=825))fail('SCHEDULE_OVERLAP_WINDOW');
  if(fs.existsSync('E:/ZGmini/data/themes/legacy-nine-r35-delta/state/delta.lock'))
    fail('PRIVATE_COLLECTION_ACTIVE_LOCK');
  const root=fs.realpathSync(target);
  if(!fs.statSync(root).isDirectory()||
     !fs.existsSync(path.join(root,ORIGINAL))||
     !fs.existsSync(path.join(root,'THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd')))
    fail('EXISTING_R48_PRIVATE_CHAIN_MISSING');
  // Verify every target before writing any of them. Never overwrite user files.
  const prepared=FILES.map(name=>{
    const src=path.join(source,name),dst=path.join(root,name);
    if(!fs.existsSync(src)||!fs.statSync(src).isFile())fail('BUNDLE_FILE_MISSING');
    const expected=sha(fs.readFileSync(src));
    if(fs.existsSync(dst)&&(!fs.statSync(dst).isFile()||
      sha(fs.readFileSync(dst))!==expected))fail('EXISTING_FILE_CONFLICT_'+name);
    return {src,dst,name,expected};
  });
  const before=execute('schtasks',['/Query','/TN',TASK,'/XML']);
  if(before.status!==0)fail('PRIVATE_TASK_NOT_FOUND');
  const old=auditR73ExistingTaskXml(before.stdout,{target:root});
  for(const item of prepared)if(!fs.existsSync(item.dst))
    fs.copyFileSync(item.src,item.dst,fs.constants.COPYFILE_EXCL);
  for(const item of prepared)if(sha(fs.readFileSync(item.dst))!==item.expected)
    fail('INSTALLED_FILE_READBACK_FAILED');
  if(old.status==='ALREADY_R73')return {status:'R73_ALREADY_INSTALLED_VERIFIED',
    filesVerified:FILES.length,task:TASK,d1Writes:0,publicWrites:0};
  const backup=path.join(root,'R73_TASK_BACKUP_'+Date.now()+'.xml');
  fs.writeFileSync(backup,before.stdout,{flag:'wx'});
  if(sha(fs.readFileSync(backup))!==sha(Buffer.from(before.stdout)))
    fail('TASK_BACKUP_READBACK');
  const action=`cmd.exe /d /c ""${path.win32.join(root,UPDATED)}""`;
  const changed=execute('schtasks',['/Change','/TN',TASK,'/TR',action]);
  if(changed.status!==0)fail('TASK_ACTION_CHANGE_DENIED');
  const after=execute('schtasks',['/Query','/TN',TASK,'/XML']);
  if(after.status!==0)fail('TASK_READBACK_FAILED');
  if(auditR73ExistingTaskXml(after.stdout,{target:root}).status!=='ALREADY_R73')
    fail('TASK_ACTION_READBACK_NOT_R73');
  for(const section of ['Triggers','Principals','Settings']){
    if(xmlSection(before.stdout,section)!==xmlSection(after.stdout,section))
      fail('TASK_NON_ACTION_DRIFT_REVIEW_REQUIRED');
  }
  return {status:'R73_TASK_ACTION_UPDATED_AND_VERIFIED',task:TASK,
    previousTaskXmlBackup:path.basename(backup),filesVerified:FILES.length,
    scheduledAt:'11:30_KST',changedExistingTaskAction:true,
    otherTasksChanged:0,d1Writes:0,publicWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3||process.argv[2]!=='--install')fail('USAGE');
    process.stdout.write(JSON.stringify({report:'THEME_NINE_R73_PRIVATE_AUTO_INSTALL',
      ...installR73PrivateRetry()},null,2)+'\n');
  }catch(error){process.stderr.write(JSON.stringify({status:'STOP_R73_INSTALL',
    reason:error.code??'UNEXPECTED',d1Writes:0,publicWrites:0})+'\n');
    process.exitCode=1;}
}
