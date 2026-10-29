// Register a NEW, independent Windows task; never alter the existing Iran
// collection, score, or review tasks. Run through the one-click CMD on the PC.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {IRAN_NEWS_ANALYSIS_TASK_R1} from './news-analysis-scheduled-r1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const script=path.join(root,'scripts','iran-progress','news-analysis-scheduled-r1.mjs');
const DEFAULT_DATA='E:\\ZGmini\\data\\iran-progress-r13';

const xmlEscape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');

export function planIranNewsAnalysisTaskR1({principal,node,workdir=root,
 sourceScript=script,startAt=Date.now()+120_000}={}){
 if(!principal||!path.win32.isAbsolute(node)||!path.win32.isAbsolute(workdir)||
    !path.win32.isAbsolute(sourceScript)||!Number.isSafeInteger(startAt))
  throw Error('ANALYSIS_R1_TASK_PLAN_INVALID');
 const boundary=new Date(startAt).toISOString();
 const xml=`<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
<RegistrationInfo><Description>Independent R41 evidence-backed Ollama Korean provisional news analysis and CORE D1 readback.</Description></RegistrationInfo>
<Triggers><TimeTrigger><Repetition><Interval>PT10M</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition><StartBoundary>${boundary}</StartBoundary><Enabled>true</Enabled></TimeTrigger></Triggers>
<Principals><Principal id="User"><UserId>${xmlEscape(principal)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
<Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable><Enabled>true</Enabled><Hidden>false</Hidden><ExecutionTimeLimit>PT1H</ExecutionTimeLimit></Settings>
<Actions Context="User"><Exec><Command>${xmlEscape(node)}</Command><Arguments>&quot;${xmlEscape(sourceScript)}&quot;</Arguments><WorkingDirectory>${xmlEscape(workdir)}</WorkingDirectory></Exec></Actions>
</Task>`;
 return {xml,node,sourceScript,workdir,task:IRAN_NEWS_ANALYSIS_TASK_R1};
}

function decodeWindowsTaskXml(data){
 if(data[0]===0xff&&data[1]===0xfe)return data.toString('utf16le').replace(/^\uFEFF/,'');
 if(data[0]===0xfe&&data[1]===0xff)
  throw Error('ANALYSIS_R1_TASK_ENCODING_UNSUPPORTED');
 if(data[1]===0)return data.toString('utf16le').replace(/^\uFEFF/,'');
 return data.toString('utf8').replace(/^\uFEFF/,'');
}

export function taskR1Matches(plan,actual){
 return typeof actual==='string'&&actual.includes('PT10M')&&
  actual.includes('IgnoreNew')&&actual.includes('InteractiveToken')&&
  actual.includes(xmlEscape(plan.node))&&
  actual.includes(xmlEscape(plan.sourceScript))&&
  actual.includes(xmlEscape(plan.workdir));
}

function schtasks(args){
 return execFileSync('schtasks.exe',args,{windowsHide:true,timeout:30000,maxBuffer:2*1024*1024});
}
function currentTaskXml(){
 try{return decodeWindowsTaskXml(schtasks(['/Query','/TN',IRAN_NEWS_ANALYSIS_TASK_R1,'/XML']));}
 catch(error){if(error?.status===1)return null;throw error;}
}

export function registerIranNewsAnalysisTaskR1({mode='inspect',
 dataDirectory=process.env.ZGMINI_IRAN_HOME??DEFAULT_DATA}={}){
 if(process.platform!=='win32')throw Error('ANALYSIS_R1_WINDOWS_ONLY');
 if(!['inspect','apply'].includes(mode))throw Error('ANALYSIS_R1_TASK_MODE_INVALID');
 if(!fs.existsSync(dataDirectory)||!fs.statSync(dataDirectory).isDirectory())
  throw Error('ANALYSIS_R1_APPROVED_E_DIRECTORY_MISSING');
 if(!fs.existsSync(script))throw Error('ANALYSIS_R1_SCHEDULED_SCRIPT_MISSING');
 if(Number(process.versions.node.split('.')[0])<24)
  throw Error('ANALYSIS_R1_NODE24_REQUIRED');
 const user=execFileSync('whoami.exe',[],{encoding:'utf8',windowsHide:true}).trim();
 const plan=planIranNewsAnalysisTaskR1({principal:user,node:process.execPath});
 const existing=currentTaskXml();
 if(existing){
  if(!taskR1Matches(plan,existing))throw Error('ANALYSIS_R1_EXISTING_TASK_DRIFT');
  return {status:'EXISTING_TASK_VERIFIED',task:plan.task,taskWrites:0,interval:'10m'};
 }
 if(mode==='inspect')return {status:'READY_TO_INSTALL',task:plan.task,taskWrites:0,interval:'10m'};
 const temp=path.join(dataDirectory,'news-analysis-r1-task-register-once.xml');
 if(fs.existsSync(temp))throw Error('ANALYSIS_R1_TASK_TEMPFILE_CONFLICT');
 try{
  fs.writeFileSync(temp,Buffer.from('\uFEFF'+plan.xml,'utf16le'),{flag:'wx'});
  schtasks(['/Create','/TN',plan.task,'/XML',temp]); // No /F, no task overwrite.
 }finally{
  if(fs.existsSync(temp))fs.unlinkSync(temp);
 }
 const installed=currentTaskXml();
 if(!taskR1Matches(plan,installed))throw Error('ANALYSIS_R1_TASK_READBACK_FAILED');
 return {status:'TASK_INSTALLED_READBACK_VERIFIED',task:plan.task,taskWrites:1,interval:'10m'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3||!['--inspect','--apply'].includes(process.argv[2]))
   throw Error('ANALYSIS_R1_TASK_CLI_INVALID');
  console.log(JSON.stringify(registerIranNewsAnalysisTaskR1({mode:process.argv[2].slice(2)})));
 }catch(error){
  console.error(JSON.stringify({status:'ANALYSIS_R1_TASK_SETUP_BLOCKED',reason:error.message}));
  process.exitCode=1;
 }
}
