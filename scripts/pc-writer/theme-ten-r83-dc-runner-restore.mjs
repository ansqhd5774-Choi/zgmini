// R83: restore only the missing, already-registered R5 private collector CMD.
// No task registration/update, public publication, or source replacement.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const TASK='ZGMINI-PC-Theme-Data-Center-Power';
const RUNNER='DATA_CENTER_POWER_R5_SCHEDULED.cmd';
const TOOL='theme-data-center-power-task-r5.mjs';
const TOOL_SHA='197ef4760931d787d8857a4579e13b6f94d5d1bd2c5c20424ce685e60c8f1426';
const RUNNER_SHA='836e73a4b85bff70fad4185f7221ebc8824ca2ea8026388c7eb12e2b51bcb823';
const NODE='E:\\ZGmini\\runtime\\node.exe';
const DATA='E:\\ZGmini\\data';
const SOURCE='E:\\ZGmini\\projects\\zgmini-theme-optional\\releases\\2f0f1a2c1b31e20f9e943e90824885d586448d29\\scripts\\pc-writer\\theme-data-center-power-publish-r3.mjs';
const SOURCE_SHA='3c81e6b29003939eed6ad631cfdaf81a836abd4f7f4dfba3fee03796f7d7ac96';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const need=(condition,reason)=>{if(!condition)throw Object.assign(new Error(reason),{code:reason});};
const upper=x=>String(x).replaceAll('/','\\').toUpperCase();
const xmlValue=(source,tag)=>source.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'))?.[1]?.trim()??null;
const unescape=x=>String(x).replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&amp;','&');

export function decodeR83Windows(bytes){
 if(bytes[0]===255&&bytes[1]===254)return bytes.subarray(2).toString('utf16le');
 if(bytes[1]===0)return bytes.toString('utf16le');
 for(const encoding of ['utf-8','euc-kr']){
  try{return new TextDecoder(encoding,{fatal:true}).decode(bytes);}catch{}
 }
 return '';
}

export function parseR83TaskAction(xml){
 need(/<Task(?:\s|>)/i.test(xml),'TASK_XML_NOT_READABLE');
 const execs=[...xml.matchAll(/<Exec(?:\s[^>]*)?>([\s\S]*?)<\/Exec>/gi)];
 need(execs.length===1,'TASK_ACTION_NOT_UNIQUE');
 const command=unescape(xmlValue(execs[0][1],'Command')??'');
 const argumentsValue=unescape(xmlValue(execs[0][1],'Arguments')??'');
 need(/^(?:[A-Za-z]:\\Windows\\System32\\)?cmd\.exe$/i.test(command),
  'TASK_EXEC_COMMAND_DRIFT');
 const m=argumentsValue.match(/^\/d \/c ""([A-Za-z]:\\[^"<>\r\n]+\\DATA_CENTER_POWER_R5_SCHEDULED\.cmd)""$/i);
 need(!!m,'TASK_EXEC_ARGUMENTS_DRIFT');
 const runner=path.win32.normalize(m[1]);
 need(path.win32.isAbsolute(runner)&&path.win32.basename(runner).toUpperCase()===RUNNER.toUpperCase()&&
  !runner.split('\\').includes('..'),'RUNNER_PATH_INVALID');
 const triggers=xmlValue(xml,'Triggers')??'';
 need((triggers.match(/<CalendarTrigger(?:\s|>)/gi)??[]).length===1&&
  (triggers.match(/<\w+Trigger(?:\s|>)/g)??[]).length===1,'TASK_TRIGGER_DRIFT');
 need(!/<Enabled>\s*false\s*<\/Enabled>/i.test(xml),'TASK_EXPLICITLY_DISABLED');
 need((xmlValue(triggers,'StartBoundary')??'').slice(11,16)==='14:00',
  'TASK_TRIGGER_TIME_CHANGED');
 return {runner,taskXmlSha256:sha(Buffer.from(xml,'utf8'))};
}

export function approvedR83Parent(runner,{userProfile=process.env.USERPROFILE}={}){
 const parent=path.win32.dirname(runner);
 const roots=['E:\\ZGmini'];
 if(userProfile&&path.win32.isAbsolute(userProfile))roots.push(
  path.win32.join(userProfile,'Desktop'),path.win32.join(userProfile,'Downloads'),
  path.win32.join(userProfile,'OneDrive','Desktop'));
 return roots.some(root=>upper(parent)===upper(root)||upper(parent).startsWith(upper(root)+'\\'));
}

export function validateR83Runner(bytes){
 need(sha(bytes)===RUNNER_SHA,'APPROVED_R5_RUNNER_CONTENT_DRIFT');
 const sourceLine=bytes.toString('ascii').split(/\r?\n/).find(x=>x.startsWith('set "DC_SOURCE='));
 need(sourceLine===`set "DC_SOURCE=${SOURCE}"`,'APPROVED_R5_SOURCE_CHANGED');
 need(bytes.toString('ascii').includes('"%DC_SOURCE%" --once --collect')&&
  !bytes.toString('ascii').includes('--publish'),'APPROVED_R5_PRIVATE_FLAGS_DRIFT');
 return true;
}

function reportManifest(){
 try{
  const f=path.win32.join(DATA,'themes','data-center-power','raw-manifest.json');
  const manifest=JSON.parse(fs.readFileSync(f,'utf8'));
  const dates={};
  for(const symbol of ['DTCR','GRID','SPY'])dates[symbol]=(manifest.files??[])
   .filter(x=>typeof x.path==='string'&&x.path.startsWith('raw/'+symbol+'_')&&
    /^20\d\d-\d\d-\d\d$/.test(x.observationThrough))
   .map(x=>x.observationThrough).sort().at(-1)??null;
  return {status:'READ_ONLY_METADATA',dates};
 }catch{return {status:'MANIFEST_UNAVAILABLE'};}
}

function safeSourceRun(output){
 for(const line of String(output).split(/\r?\n/).reverse()){
  if(line.length>20000||!line.startsWith('{'))continue;
  let j;try{j=JSON.parse(line);}catch{continue;}
  if(j.report==='DATA_CENTER_POWER_R3_PC')return {
   status:/^[A-Z0-9_]{3,110}$/.test(j.status??'')?j.status:'UNKNOWN',
   reason:/^[A-Z0-9_]{3,110}$/.test(j.reason??'')?j.reason:null,
   observationDate:/^20\d\d-\d\d-\d\d$/.test(j.observationDate??'')?j.observationDate:null,
   providerCalls:Number.isInteger(j.providerCalls)&&j.providerCalls>=0&&j.providerCalls<=4?j.providerCalls:null,
   d1Writes:Number.isInteger(j.d1Writes)?j.d1Writes:null,
  };
 }
 return {status:'APPROVED_R3_REPORT_MISSING'};
}

export async function executeR83({platform=process.platform,clock=new Date(),
 run=(cmd,args,opts)=>spawnSync(cmd,args,opts),toolFile=path.join(path.dirname(fileURLToPath(import.meta.url)),TOOL),
 create=(file,bytes)=>fs.writeFileSync(file,bytes,{flag:'wx'})}={}){
 const result={report:'THEME_TEN_R83_DC_RUNNER_RESTORE',
  inspectedAt:clock.toISOString(),status:'STARTED',taskChanges:0,publicWrites:0,
  d1Writes:0,newThemes:0,formulasChanged:0,runnerCreated:0};
 try{
  need(platform==='win32','WINDOWS_PC_REQUIRED');
  const t=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(clock);
  need(t<'10:55'||t>'14:35','SCHEDULE_PROTECTION_WINDOW');
  need(fs.existsSync(NODE)&&fs.existsSync(DATA),'APPROVED_NODE_OR_DATA_MISSING');
  const tool=fs.readFileSync(toolFile);
  need(sha(tool)===TOOL_SHA,'R5_PINNED_SOURCE_SHA_MISMATCH');
  const {buildDcPowerScheduledRunner}=await import(pathToFileURL(toolFile).href);
  const runnerBytes=buildDcPowerScheduledRunner();validateR83Runner(runnerBytes);
  const schtasks=path.win32.join(process.env.SystemRoot||'C:\\Windows','System32','schtasks.exe');
  const q=run(schtasks,['/Query','/TN',TASK,'/XML'],{encoding:null,windowsHide:true,timeout:25000,maxBuffer:3000000});
  need(q.status===0,'EXISTING_TASK_NOT_QUERYABLE');
  const {runner,taskXmlSha256}=parseR83TaskAction(decodeR83Windows(q.stdout));
  result.taskXmlSha256=taskXmlSha256;
  result.actionBasename=RUNNER;
  need(approvedR83Parent(runner),'EXISTING_TASK_PATH_OUTSIDE_APPROVED_ROOTS');
  const parent=path.win32.dirname(runner);
  need(fs.existsSync(parent)&&fs.lstatSync(parent).isDirectory()&&
   !fs.lstatSync(parent).isSymbolicLink(),'EXISTING_RUNNER_PARENT_MISSING_OR_LINK');
  need(fs.existsSync(SOURCE)&&fs.lstatSync(SOURCE).isFile()&&!fs.lstatSync(SOURCE).isSymbolicLink(),
   'PINNED_R3_SOURCE_NOT_INSTALLED');
  need(sha(fs.readFileSync(SOURCE))===SOURCE_SHA,'PINNED_R3_SOURCE_SHA_DRIFT');
  for(const lock of ['dc-power-r3.lock','collection.lock'])need(!fs.existsSync(
   path.win32.join(DATA,'themes','data-center-power','state',lock)),'EXISTING_COLLECTION_LOCK_PRESENT');
  if(fs.existsSync(runner)){
   need(fs.lstatSync(runner).isFile()&&!fs.lstatSync(runner).isSymbolicLink()&&
    sha(fs.readFileSync(runner))===RUNNER_SHA,'EXISTING_RUNNER_SHA_DRIFT');
   result.runnerState='ALREADY_APPROVED';
  }else{
   create(runner,runnerBytes);
   result.runnerCreated=1;
   result.runnerState='MISSING_R5_RUNNER_RESTORED';
  }
  need(sha(fs.readFileSync(runner))===RUNNER_SHA,'RUNNER_READBACK_SHA_MISMATCH');
  result.runnerSha256=RUNNER_SHA;
  const command=run(NODE,[SOURCE,'--once','--collect'],{
   encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:1000000,
   env:{...process.env,ZGMINI_DATA_ROOT:DATA}});
  result.privateRun=safeSourceRun(command.stdout??'');
  result.privateRunExit=command.status??null;
  result.manifestAfter=reportManifest();
  result.status=command.status===0&&result.privateRun.status==='PRIVATE_CANDIDATE_VERIFIED_NOT_PUBLISHED'?
   'R83_RUNNER_VERIFIED_PRIVATE_CANDIDATE_READY':
   'R83_RUNNER_VERIFIED_PRIVATE_CYCLE_NEEDS_REVIEW';
  result.nextSchedule='EXISTING_14_00_UNMODIFIED';
  return result;
 }catch(e){
  result.status='STOP_R83';
  result.reason=/^[A-Z0-9_]{3,120}$/.test(e.code??'')?e.code:'R83_UNEXPECTED_ERROR';
  return result;
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--restore-once'){
  console.log(JSON.stringify({report:'THEME_TEN_R83_DC_RUNNER_RESTORE',status:'STOP_R83',reason:'ARGUMENTS_INVALID'}));
  process.exitCode=1;
 }else{
  const result=await executeR83();
  console.log(JSON.stringify(result,null,2));
  if(result.status!=='R83_RUNNER_VERIFIED_PRIVATE_CANDIDATE_READY')process.exitCode=1;
 }
}
