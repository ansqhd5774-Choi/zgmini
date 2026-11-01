// Tenth-theme Windows-only scheduler mirror. No modifications to nine existing
// tasks, and no D1 writes. The generated CMD performs a private collect+score.
// The original seven-theme task is read-only and supplies triggers/identity.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const TEMPLATE='\\ZGMINI-PC-GetMarketHistory-ETF';
const TARGET='\\ZGMINI-PC-Theme-Data-Center-Power';
const PINNED='2f0f1a2c1b31e20f9e943e90824885d586448d29';
const NODE='E:\\ZGmini\\runtime\\node.exe';
const DATA='E:\\ZGmini\\data';
const SOURCE=`E:\\ZGmini\\projects\\zgmini-theme-optional\\releases\\${PINNED}\\scripts\\pc-writer\\theme-data-center-power-publish-r3.mjs`;
const SCHTASKS=path.win32.join(process.env.SystemRoot||'C:\\Windows','System32','schtasks.exe');
const RUNNER_NAME='DATA_CENTER_POWER_R5_SCHEDULED.cmd';
const fail=(code)=>{throw Object.assign(new Error(code),{reason:code});};
const need=(yes,code)=>{if(!yes)fail(code);};
const normalized=x=>x.replace(/>\s+</g,'><').trim();
const escaped=x=>x.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

function section(xml,tag){
 const reg=new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}\\s*>`,'g');
 const matches=[...xml.matchAll(reg)];
 need(matches.length===1,`TASK_XML_${tag.toUpperCase()}_AMBIGUOUS`);
 return matches[0][0];
}

function definition(xml){
 need(/<Task\s+[^>]*xmlns="http:\/\/schemas\.microsoft\.com\/windows\/2004\/02\/mit\/task"/.test(xml),
  'TASK_XML_NAMESPACE_UNEXPECTED');
 const triggers=section(xml,'Triggers'),principals=section(xml,'Principals');
 const settings=section(xml,'Settings'),actions=section(xml,'Actions');
 const triggerCount=[...triggers.matchAll(/<\w+Trigger(?:\s|>)/g)].length;
 need(triggerCount>0,'TEMPLATE_TRIGGERS_EMPTY');
 const login=principals.match(/<LogonType>([^<]+)<\/LogonType>/)?.[1];
 need(['S4U','InteractiveToken','ServiceAccount'].includes(login),
  'TEMPLATE_LOGON_NEEDS_MANUAL_REVIEW');
 need(!/<Enabled>\s*false\s*<\/Enabled>/i.test(settings),'TEMPLATE_TASK_DISABLED');
 return {triggers,principals,settings,actions,triggerCount,login};
}

function requireRunnerPath(runner){
 need(typeof runner==='string'&&path.win32.isAbsolute(runner)&&
  path.win32.basename(runner).toLowerCase()===RUNNER_NAME.toLowerCase()&&
  !/[<>"|?*\n\r]/.test(runner),'TENTH_RUNNER_PATH_INVALID');
 return runner;
}

export function planDcPowerTaskMirror(templateXml,runner){
 requireRunnerPath(runner);
 const before=definition(templateXml);
 const open=before.actions.match(/^<Actions(?:\s[^>]*)?>/);
 need(open,'TEMPLATE_ACTIONS_INVALID');
 const replacement=`${open[0]}\n<Exec><Command>C:\\Windows\\System32\\cmd.exe</Command>`+
  `<Arguments>/d /c ""${escaped(runner)}""</Arguments>`+
  `<WorkingDirectory>${escaped(path.win32.dirname(runner))}</WorkingDirectory></Exec>\n</Actions>`;
 let xml=templateXml.replace(before.actions,replacement);
 const registration=xml.match(/<RegistrationInfo(?:\s[^>]*)?>[\s\S]*?<\/RegistrationInfo\s*>/);
 if(registration&&/<URI>[^<]*<\/URI>/.test(registration[0])){
  xml=xml.replace(registration[0],registration[0].replace(/<URI>[^<]*<\/URI>/,
   `<URI>${TARGET}</URI>`));
 }
 need(xml!==templateXml,'TASK_MIRROR_REWRITE_FAILED');
 const after=definition(xml);
 need(normalized(before.triggers)===normalized(after.triggers),'TEMPLATE_TRIGGERS_CHANGED');
 need(normalized(before.principals)===normalized(after.principals),'TEMPLATE_PRINCIPAL_CHANGED');
 need(normalized(before.settings)===normalized(after.settings),'TEMPLATE_SETTINGS_CHANGED');
 need(before.triggerCount===after.triggerCount,'TEMPLATE_TRIGGER_COUNT_CHANGED');
 return {xml,triggers:before.triggers,principals:before.principals,settings:before.settings,
  triggerCount:before.triggerCount,login:before.login};
}

export function buildDcPowerScheduledRunner(){
 // All output, including errors, stays in the same Desktop folder as the CMD.
 // New data only: no --publish, no D1 and no modification to existing nine.
 const lines=[
  '@echo off',
  'setlocal DisableDelayedExpansion',
  'set "DC_NODE=E:\\ZGmini\\runtime\\node.exe"',
  'set "ZGMINI_DATA_ROOT=E:\\ZGmini\\data"',
  `set "DC_SOURCE=${SOURCE}"`,
  'set "DC_LOG=%~dp0DATA_CENTER_POWER_R5_SCHEDULED_RESULT.txt"',
  '>>"%DC_LOG%" echo DATA_CENTER_POWER_R5_SCHEDULED_PRIVATE_RUN',
  '>>"%DC_LOG%" echo STARTED=%DATE% %TIME%',
  'if not exist "%DC_NODE%" goto failed',
  'if not exist "%DC_SOURCE%" goto failed',
  '"%DC_NODE%" "%DC_SOURCE%" --once --collect >>"%DC_LOG%" 2>&1',
  'if errorlevel 1 goto failed',
  '>>"%DC_LOG%" echo RESULT=PRIVATE_SCORE_VERIFIED_D1_WRITES_0',
  'exit /b 0',
  ':failed',
  '>>"%DC_LOG%" echo RESULT=BLOCKED_REVIEW_LOG_NO_BLIND_RETRY',
  'exit /b 1',
 ];
 return Buffer.from(lines.join('\r\n')+'\r\n','ascii');
}

export function verifyDcPowerTask(template,existing,runner){
 const observed=definition(existing);
 need(observed.actions.includes(escaped(runner)),'EXISTING_TENTH_TASK_ACTION_MISMATCH');
 need(/<Command>[^<]*cmd\.exe<\/Command>/i.test(observed.actions),
  'EXISTING_TENTH_TASK_EXEC_MISMATCH');
 need(normalized(observed.triggers)===normalized(template.triggers),
  'EXISTING_TENTH_TASK_TRIGGER_DRIFT');
 need(normalized(observed.principals)===normalized(template.principals),
  'EXISTING_TENTH_TASK_PRINCIPAL_DRIFT');
 need(normalized(observed.settings)===normalized(template.settings),
  'EXISTING_TENTH_TASK_SETTINGS_DRIFT');
 need(observed.login===template.login,'EXISTING_TENTH_TASK_LOGON_DRIFT');
 return true;
}

function decode(buffer){
 if(buffer[0]===0xff&&buffer[1]===0xfe)
  return buffer.subarray(2).toString('utf16le').replace(/^\uFEFF/,'');
 if(buffer[0]===0xfe&&buffer[1]===0xff){
  const copy=Buffer.from(buffer.subarray(2));
  for(let i=0;i<copy.length;i+=2)[copy[i],copy[i+1]]=[copy[i+1],copy[i]];
  return copy.toString('utf16le').replace(/^\uFEFF/,'');
 }
 if(buffer[1]===0)return buffer.toString('utf16le').replace(/^\uFEFF/,'');
 for(const encoding of ['utf-8','euc-kr']){
  try{return new TextDecoder(encoding,{fatal:true}).decode(buffer).replace(/^\uFEFF/,'');}catch{}
 }
 fail('TASK_XML_ENCODING_UNKNOWN');
}

const schtasks=args=>execFileSync(SCHTASKS,args,{windowsHide:true,timeout:25000,maxBuffer:3*1024*1024});
const query=task=>decode(schtasks(['/query','/tn',task,'/xml']));
const queryExisting=()=>{
 try{return query(TARGET);}catch(error){if(error?.status===1)return null;throw error;}
};

function preflight(){
 need(process.platform==='win32','WINDOWS_CMD_ONLY');
 need(fs.existsSync(NODE),'APPROVED_NODE_NOT_FOUND');
 need(fs.existsSync(DATA),'APPROVED_E_DATA_NOT_FOUND');
 need(fs.existsSync(SOURCE),'PINNED_R3_SOURCE_NOT_INSTALLED');
 const cmd=execFileSync(NODE,[SOURCE,'--once'],{
  windowsHide:true,timeout:240000,maxBuffer:8*1024*1024,
  env:{...process.env,ZGMINI_DATA_ROOT:DATA}}).toString('utf8');
 const report=cmd.split(/\r?\n/).filter(Boolean).map(x=>{
  try{return JSON.parse(x);}catch{return null;}
 }).find(x=>x?.report==='DATA_CENTER_POWER_R3_PC');
 need(report?.status==='PRIVATE_CANDIDATE_VERIFIED_NOT_PUBLISHED'&&
  report?.providerCalls===0&&report?.d1Writes===0&&report?.schedulerWrites===0,
  'PC_R3_PRIVATE_PREFLIGHT_FAILED');
 return {observationDate:report.observationDate,score:report.score};
}

function run(action,runner){
 const privateCheck=preflight();
 const template=planDcPowerTaskMirror(query(TEMPLATE),runner);
 const existing=queryExisting();
 if(existing){
  verifyDcPowerTask(template,existing,runner);
  return {status:'EXISTING_TENTH_TASK_VERIFIED',privateCheck,
   triggerCount:template.triggerCount,taskWrites:0};
 }
 if(action==='--inspect')return {status:'READY_TO_MIRROR_EXISTING_SEVEN_TASK',privateCheck,
  triggerCount:template.triggerCount,taskWrites:0};
 const runnerBytes=buildDcPowerScheduledRunner();
 if(fs.existsSync(runner))need(fs.readFileSync(runner).equals(runnerBytes),
  'EXISTING_TENTH_RUNNER_CONTENT_DRIFT');
 else fs.writeFileSync(runner,runnerBytes,{flag:'wx'});
 const taskXml=path.join(path.win32.dirname(runner),'DATA_CENTER_POWER_R5_REGISTER_ONCE.xml');
 need(!fs.existsSync(taskXml),'TENTH_TASK_XML_ALREADY_EXISTS');
 const xml=template.xml.replace(/<\?xml\s+[^>]*\?>/,'<?xml version="1.0" encoding="UTF-16"?>');
 let created=false;
 try{
  fs.writeFileSync(taskXml,Buffer.from('\uFEFF'+xml,'utf16le'),{flag:'wx'});
  created=true;
  schtasks(['/create','/tn',TARGET,'/xml',taskXml]); // no /f: existing task NEVER overwritten
 }finally{if(created)fs.unlinkSync(taskXml);}
 verifyDcPowerTask(template,query(TARGET),runner);
 return {status:'TENTH_PRIVATE_TASK_REGISTERED',privateCheck,
  triggerCount:template.triggerCount,taskWrites:1};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 try{
  need(args.length===2&&['--inspect','--apply'].includes(args[0]),'ARGS_INVALID');
  const result=run(args[0],requireRunnerPath(args[1]));
  console.log(JSON.stringify({report:'DATA_CENTER_POWER_R5_TASK',...result,
   sourceTask:TEMPLATE,targetTask:TARGET,sourceSha:PINNED,
   existingNineTaskChanges:0,d1Writes:0,providerCalls:0}));
 }catch(error){
  console.log(JSON.stringify({report:'DATA_CENTER_POWER_R5_TASK',status:'BLOCKED',
   reason:error?.reason||`TASK_OR_PREFLIGHT_FAILED_${error?.status??'UNKNOWN'}`,
   existingNineTaskChanges:0,d1Writes:0,providerCalls:0}));
  process.exitCode=1;
 }
}
