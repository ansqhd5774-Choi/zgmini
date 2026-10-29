// Read-only task-query diagnosis for a failed configured-theme package preflight.
// It does not import or invoke the installer, the collector or the publisher.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('../../',import.meta.url));
const task='ZGMINI-PC-Configured-Themes';
const home='E:\\ZGmini\\data\\pc-writer\\theme-config-tool';
const node='E:\\ZGmini\\runtime\\node.exe';
const filename='THEME_TASK_TIMEOUT_DIAG_RESULT.txt';
const file=path.join(root,filename);
const sha=x=>createHash('sha256').update(x).digest('hex');
const safe=x=>String(x??'UNKNOWN').replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,100);
const format=items=>Object.entries(items).map(([k,v])=>k+'='+safe(v)).join('\r\n')+'\r\n';

export function diagnosticProbe({command,args,validate,run=spawnSync}={}){
 const before=Date.now();
 let result;
 try{result=run(command,args,{encoding:'utf8',windowsHide:true,
  timeout:12000,maxBuffer:512*1024,stdio:['ignore','pipe','pipe']});}
 catch(e){return {status:'SPAWN_EXCEPTION',error:safe(e.code),ms:Date.now()-before};}
 const ms=Date.now()-before;
 if(result?.error)return {status:'PROCESS_ERROR',error:safe(result.error.code),ms};
 if(result?.signal)return {status:'PROCESS_SIGNAL',error:safe(result.signal),ms};
 if(result?.status!==0)return {status:'EXIT_NONZERO',error:safe(result.status),ms};
 try{return {status:'COMMAND_OK',ms,...validate(result.stdout??'')};}
 catch{return {status:'OUTPUT_INVALID',ms};}
}

export function diagnoseConfiguredTask({platform=process.platform,
 run=spawnSync,program=process.execPath}={}){
 const base={DIAG_SCHEMA:'THEME_TASK_TIMEOUT_DIAG_V1',
  TASK_NAME:task,NODE_VERSION:process.version,PC_FILES_CHANGED:0,
  SCHEDULE_CHANGED:0,PROVIDER_CALLS:0,D1_WRITES:0,SITE_DEPLOYS:0};
 if(platform!=='win32')return {...base,DIAG_STATUS:'WINDOWS_REQUIRED'};
 if(path.win32.normalize(program).toLowerCase()!==
  path.win32.normalize(node).toLowerCase())
  return {...base,DIAG_STATUS:'UNAPPROVED_NODE'};
 const com=diagnosticProbe({command:'cscript.exe',
  args:['//NoLogo',path.join(root,'scripts','pc-writer','theme-config-task-state.js')],
  run,validate:output=>{
   const match=output.trim().match(/^ZG_TASK_STATE=([0-4])$/);
   if(!match)throw Error('STATE_OUTPUT_INVALID');
   return {state:match[1]};
  }});
 const xml=diagnosticProbe({command:'schtasks',
  args:['/Query','/TN',task,'/XML'],run,
  validate:output=>({xmlSha256:sha(output),
   time1300:output.includes('T13:00:00')?'YES':'NO',
   vbs:output.includes(path.join(home,'THEME_SCHEDULED.vbs'))?'YES':'NO'})});
 const stateGood=com.status==='COMMAND_OK'&&com.state==='3';
 const xmlGood=xml.status==='COMMAND_OK'&&xml.time1300==='YES'&&xml.vbs==='YES';
 return {...base,DIAG_STATUS:stateGood&&xmlGood?'READONLY_QUERIES_PASS':'REVIEW_REQUIRED',
  TASK_STATE_QUERY:com.status,TASK_STATE_ERROR:com.error??'NONE',
  TASK_STATE_VALUE:com.state??'UNKNOWN',TASK_STATE_MS:com.ms,
  TASK_XML_QUERY:xml.status,TASK_XML_ERROR:xml.error??'NONE',
  TASK_XML_MS:xml.ms,TASK_XML_SHA256:xml.xmlSha256??'UNKNOWN',
  TASK_XML_TIME_1300:xml.time1300??'UNKNOWN',
  TASK_XML_EXPECTED_VBS:xml.vbs??'UNKNOWN'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--diagnose')process.exitCode=2;
 else if(fs.existsSync(file)){
  console.error('DIAG_ALREADY_ATTEMPTED');process.exitCode=2;
 }else{
  const report=diagnoseConfiguredTask();
  fs.writeFileSync(file,format(report),{flag:'wx'});
  console.log(report.DIAG_STATUS+' / '+filename);
  if(report.DIAG_STATUS!=='READONLY_QUERIES_PASS')process.exitCode=2;
 }
}
