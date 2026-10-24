// Biotech-only Windows Task Scheduler clone without cscript/PowerShell.
// The existing seven-theme task is read via schtasks /query /xml and NEVER edited.
// XML registration uses /create without /f, so an existing task cannot be overwritten.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const TEMPLATE='\\ZGMINI-PC-GetMarketHistory-ETF';
const TARGET='\\ZGMINI-PC-Theme-Biotech';
const RUNNER='E:\\ZGmini\\data\\themes\\biotech\\source-r7\\BIOTECH_R7_SCHEDULED.cmd';
const WORKDIR='E:\\ZGmini\\data\\themes\\biotech\\source-r7';
const NODE='E:\\ZGmini\\runtime\\node.exe';
const SCHTASKS=path.win32.join(process.env.SystemRoot||'C:\\Windows','System32','schtasks.exe');
const BLOCK=(code)=>{throw Object.assign(new Error(code),{reason:code});};
const CHECK=(value,code)=>{if(!value)BLOCK(code);};
const normalized=(value)=>value.replace(/>\s+</g,'><').trim();

function section(xml,tag){
 const reg=new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}\\s*>`,'g');
 const matches=[...xml.matchAll(reg)];
 CHECK(matches.length===1,`TASK_XML_${tag.toUpperCase()}_AMBIGUOUS`);
 return matches[0][0];
}

function taskDefinition(xml){
 CHECK(/<Task\s+[^>]*xmlns="http:\/\/schemas\.microsoft\.com\/windows\/2004\/02\/mit\/task"/.test(xml),
  'TASK_XML_NAMESPACE_UNEXPECTED');
 const triggers=section(xml,'Triggers');
 const actions=section(xml,'Actions');
 const principals=section(xml,'Principals');
 const settings=section(xml,'Settings');
 const triggerCount=[...triggers.matchAll(/<\w+Trigger(?:\s|>)/g)].length;
 CHECK(triggerCount>0,'TASK_XML_TRIGGERS_EMPTY');
 const login=principals.match(/<LogonType>([^<]+)<\/LogonType>/);
 CHECK(login&&['S4U','InteractiveToken','ServiceAccount'].includes(login[1]),
  'SEVEN_THEME_TEMPLATE_LOGON_REQUIRES_MANUAL_REVIEW');
 CHECK(!/<Enabled>\s*false\s*<\/Enabled>/i.test(settings),'SEVEN_THEME_TEMPLATE_TASK_DISABLED');
 return {triggers,actions,principals,settings,triggerCount,login:login[1]};
}

export function planBiotechTaskMirror(xml){
 const task=taskDefinition(xml);
 const open=task.actions.match(/^<Actions(?:\s[^>]*)?>/);
 CHECK(open,'TASK_XML_ACTIONS_OPEN_MISSING');
 const replacement=`${open[0]}\n<Exec><Command>C:\\Windows\\System32\\cmd.exe</Command>`+
  `<Arguments>/d /c ""${RUNNER}""</Arguments>`+
  `<WorkingDirectory>${WORKDIR}</WorkingDirectory></Exec>\n</Actions>`;
 const modified=xml.replace(task.actions,replacement);
 CHECK(modified!==xml,'TASK_XML_ACTION_REWRITE_FAILED');
 const after=taskDefinition(modified);
 CHECK(normalized(after.triggers)===normalized(task.triggers), 'SEVEN_THEME_TRIGGERS_CHANGED');
 CHECK(normalized(after.principals)===normalized(task.principals), 'SEVEN_THEME_PRINCIPAL_CHANGED');
 CHECK(normalized(after.settings)===normalized(task.settings), 'SEVEN_THEME_SETTINGS_CHANGED');
 CHECK(after.triggerCount===task.triggerCount, 'SEVEN_THEME_TRIGGER_COUNT_CHANGED');
 return {xml:modified,triggers:task.triggers,triggerCount:task.triggerCount,logon:task.login};
}

function decodeXml(buffer){
 if(buffer[0]===0xff&&buffer[1]===0xfe)return buffer.subarray(2).toString('utf16le').replace(/^\uFEFF/,'');
 if(buffer[0]===0xfe&&buffer[1]===0xff){
  const b=Buffer.from(buffer.subarray(2));
  for(let i=0;i<b.length;i+=2){const a=b[i];b[i]=b[i+1];b[i+1]=a;}
  return b.toString('utf16le').replace(/^\uFEFF/,'');
 }
 if(buffer[1]===0)return buffer.toString('utf16le').replace(/^\uFEFF/,'');
 for(const encoding of ['utf-8','euc-kr']){
  try{return new TextDecoder(encoding,{fatal:true}).decode(buffer).replace(/^\uFEFF/,'');}catch{}
 }
 BLOCK('TASK_XML_OUTPUT_ENCODING_UNKNOWN');
}

function schtasks(args){
 return execFileSync(SCHTASKS,args,{windowsHide:true,timeout:25000,maxBuffer:3*1024*1024});
}

function query(task){return decodeXml(schtasks(['/query','/tn',task,'/xml']));}
function existingBiotechTask(){
 try{return query(TARGET);}catch(error){
  if(error?.status===1)return null; // Missing/denied: /create without /f cannot replace any task.
  throw error;
 }
}

export function verifyExistingBiotech(template,existing){
 const b=taskDefinition(existing);
 CHECK(b.actions.includes(RUNNER),'EXISTING_BIOTECH_TASK_NOT_OURS');
 CHECK(/<Exec>/.test(b.actions)&&/<Command>[^<]*cmd\.exe<\/Command>/i.test(b.actions),
  'EXISTING_BIOTECH_ACTION_UNEXPECTED');
 CHECK(normalized(b.triggers)===normalized(template.triggers),
  'EXISTING_BIOTECH_TASK_TRIGGER_DRIFT');
 CHECK(b.login===template.logon,'EXISTING_BIOTECH_TASK_IDENTITY_DRIFT');
 return true;
}

function run(command){
 CHECK(fs.existsSync(RUNNER),'BIOTECH_R7_RUNNER_NOT_INSTALLED');
 CHECK(fs.existsSync(NODE),'APPROVED_NODE_RUNTIME_MISSING');
 const template=planBiotechTaskMirror(query(TEMPLATE));
 const found=existingBiotechTask();
 if(found){
  verifyExistingBiotech(template,found);
  return {status:'EXISTING_TASK_VERIFIED',triggerCount:template.triggerCount,targetExists:true};
 }
 if(command==='--inspect'){
  return {status:'READY_TO_MIRROR_SEVEN_THEME_TASK',triggerCount:template.triggerCount,targetExists:false};
 }
 const filename=path.join(path.dirname(fileURLToPath(import.meta.url)),
  'BIOTECH_R7_TASK_MIRROR_CREATE_ONCE.xml');
 CHECK(!fs.existsSync(filename),'BIOTECH_R7_TASK_XML_ALREADY_EXISTS');
 const xml=template.xml.replace(/<\?xml\s+[^>]*\?>/,
  '<?xml version="1.0" encoding="UTF-16"?>');
 let created=false;
 try{
  fs.writeFileSync(filename,Buffer.from('\uFEFF'+xml,'utf16le'),{flag:'wx'});created=true;
  schtasks(['/create','/tn',TARGET,'/xml',filename]); // NEVER /f; no modifications to the template.
 }finally{
  if(created)fs.unlinkSync(filename); // Only the XML file we created is removed.
 }
 const registered=query(TARGET);
 verifyExistingBiotech(template,registered);
 return {status:'REGISTERED_TRIGGER_MIRRORED',triggerCount:template.triggerCount,targetExists:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 try{
  CHECK(args.length===1&&['--inspect','--apply'].includes(args[0]),'ARGS_INVALID');
  const result=run(args[0]);
  console.log(JSON.stringify({report:'BIOTECH_R7_TASK_MIRROR_NODE',...result,
   sourceTask:TEMPLATE,targetTask:TARGET,existingSevenTaskChanges:0}));
 }catch(error){
  console.log(JSON.stringify({report:'BIOTECH_R7_TASK_MIRROR_NODE',status:'BLOCKED',
   reason:error?.reason||`SCHTASKS_FAILED_${error?.status??'UNKNOWN'}`,existingSevenTaskChanges:0}));
  process.exitCode=1;
 }
}
