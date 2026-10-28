// Deliberate one-time Windows installation for the R47 PRIVATE-only updater.
// Never modifies the regular Core/Korea/Iran/ETF tasks or publishes to D1.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const R48_PRIVATE_TASK='ZGMINI-PC-Theme-Nine-R47-Private';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const fail=code=>{throw Object.assign(new Error('THEME_NINE_R48_'+code),
  {code:'THEME_NINE_R48_'+code});};
const xmlSafe=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const safeTaskPath=p=>path.win32.isAbsolute(p)&&/^[A-Za-z]:\\/.test(p)&&
  !/[\r\n<>]/.test(p)&&p.toLowerCase().endsWith('.cmd');

export function buildNineR48PrivateTaskXml({taskPath,username,
  startBoundary,workingDirectory}={}){
  if(!safeTaskPath(taskPath)||typeof username!=='string'||
    !/^[^\\\r\n<>]+\\[^\\\r\n<>]+$/.test(username)||
    typeof startBoundary!=='string'||
    !/^\d{4}-\d{2}-\d{2}T11:30:00$/.test(startBoundary)||
    typeof workingDirectory!=='string'||
    path.win32.normalize(path.win32.dirname(taskPath))!==
      path.win32.normalize(workingDirectory))fail('TASK_XML_INPUT');
  const command='cmd.exe',args=`/d /c ""${taskPath}""`;
  return `<?xml version="1.0" encoding="UTF-8"?>\r\n`+
    `<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">\r\n`+
    `  <RegistrationInfo><Description>ZGMINI existing nine themes R47 private only. No publication.</Description></RegistrationInfo>\r\n`+
    `  <Triggers><CalendarTrigger><StartBoundary>${startBoundary}</StartBoundary><Enabled>true</Enabled><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger></Triggers>\r\n`+
    `  <Principals><Principal id="Author"><UserId>${xmlSafe(username)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>\r\n`+
    `  <Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><StartWhenAvailable>true</StartWhenAvailable><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><ExecutionTimeLimit>PT2H</ExecutionTimeLimit><Enabled>true</Enabled></Settings>\r\n`+
    `  <Actions Context="Author"><Exec><Command>${command}</Command><Arguments>${xmlSafe(args)}</Arguments><WorkingDirectory>${xmlSafe(workingDirectory)}</WorkingDirectory></Exec></Actions>\r\n`+
    `</Task>\r\n`;
}

function execute(program,args){
  const result=spawnSync(program,args,{encoding:'utf8',timeout:20000,
    windowsHide:true,maxBuffer:1024*1024});
  if(result.error)fail('WINDOWS_TASK_COMMAND_FAILED');
  return result;
}

export function inspectOrInstallNineR48PrivateTask({install=false,
  taskPath=path.join(HERE,'THEME_NINE_R48_PRIVATE_CYCLE.cmd'),
  now=new Date()}={}){
  if(process.platform!=='win32')fail('WINDOWS_ONLY');
  if(execute('tzutil',['/g']).stdout.trim()!=='Korea Standard Time')
    fail('EXPECTED_PC_KOREA_TIMEZONE');
  const resolved=path.win32.resolve(taskPath);
  if(!safeTaskPath(resolved)||!fs.existsSync(resolved)||
    !fs.statSync(resolved).isFile())fail('R47_BUNDLE_MISSING');
  if(!['THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd',
    'theme-nine-r48-stage-current.mjs','theme-nine-r48-r47-bridge.mjs']
    .every(name=>fs.existsSync(path.join(path.dirname(resolved),name))))
    fail('R48_LOCAL_CHAIN_INCOMPLETE');
  const found=execute('schtasks',['/Query','/TN',R48_PRIVATE_TASK,'/XML']);
  if(found.status===0)return {status:'EXISTING_TASK_PRESERVED_UNVERIFIED',
    task:R48_PRIVATE_TASK,installedByThisCall:false};
  if(!install)return {status:'R48_PRIVATE_TASK_NOT_PRESENT',
    task:R48_PRIVATE_TASK,installedByThisCall:false};
  const who=execute('whoami',[]);
  if(who.status!==0)fail('PC_IDENTITY_UNAVAILABLE');
  const localDate=new Date(now.getTime()+86_400_000);
  const startBoundary=`${localDate.getFullYear()}-${String(localDate.getMonth()+1)
    .padStart(2,'0')}-${String(localDate.getDate()).padStart(2,'0')}T11:30:00`;
  const xml=buildNineR48PrivateTaskXml({taskPath:resolved,
    username:who.stdout.trim(),workingDirectory:path.win32.dirname(resolved),
    startBoundary});
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r48-task-'));
  const file=path.join(temp,'private-task.xml');
  try{
    fs.writeFileSync(file,xml,{flag:'wx'});
    const created=execute('schtasks',['/Create','/TN',R48_PRIVATE_TASK,
      '/XML',file]); // NO /F, no existing-task replacement.
    if(created.status!==0)fail('TASK_CREATE_FAILED_OR_DENIED');
    const check=execute('schtasks',['/Query','/TN',R48_PRIVATE_TASK,'/XML']);
    if(check.status!==0||!check.stdout.includes('IgnoreNew')||
      !check.stdout.includes(path.win32.basename(resolved)))
      fail('TASK_CREATED_BUT_READBACK_UNVERIFIED');
    return {status:'R48_PRIVATE_TASK_CREATED_XML_READBACK',
      task:R48_PRIVATE_TASK,frequency:'DAILY_LOCAL_11_30',
      logon:'INTERACTIVE_USER_ONLY',installedByThisCall:true,
      manualNextTriggerStillUnverified:true};
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3||!['--inspect','--install'].includes(process.argv[2]))
      fail('USAGE');
    process.stdout.write(JSON.stringify(inspectOrInstallNineR48PrivateTask({
      install:process.argv[2]==='--install'}),null,2)+'\n');
  }catch(e){process.stderr.write(JSON.stringify({status:'STOP_R48_TASK',
    error:e.code??'R48_UNEXPECTED'})+'\n');process.exitCode=1;}
}
