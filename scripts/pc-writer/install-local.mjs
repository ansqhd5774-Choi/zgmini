import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {read} from './d1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const cfg=read(path.join(base,'config.json')),report=read(path.join(base,'local-writer-last-run.json'));
if(report.status!=='VERIFIED'||report.source!==cfg.source||cfg.collectionTarget!=='pc')throw Error('LOCAL_VERIFIED_RUN_REQUIRED');
const principal=execFileSync('whoami.exe',[],{encoding:'utf8',windowsHide:true}).trim();
const esc=x=>x.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
for(const lane of ['core','korea']){
 const name=lane==='core'?'ZGMINI-PC-Local-Core':'ZGMINI-PC-Local-Korea';
 const launcher=path.join(base,`run-local-${lane}.vbs`);
 const command=`"${process.execPath}" "${path.join(root,'scripts/pc-writer/local-cycle.mjs')}" --publish${lane==='korea'?' --korea':''}`;
 fs.writeFileSync(launcher,`Set shell = CreateObject("WScript.Shell")\r\nWScript.Quit shell.Run("${command.replaceAll('"','""')}", 0, True)\r\n`,'ascii');
 const next=new Date();next.setUTCSeconds(0,0);
 if(lane==='core')next.setUTCMinutes(Math.floor(next.getUTCMinutes()/5)*5+5);
 else{const minute=next.getUTCMinutes();next.setUTCMinutes(37);if(minute>=37)next.setUTCHours(next.getUTCHours()+1);}
 const xml=`<?xml version="1.0" encoding="UTF-16"?><Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"><RegistrationInfo><Description>ZGMINI PC local API collection, durable storage, calculation and verified public-result publication.</Description></RegistrationInfo><Triggers><TimeTrigger><Repetition><Interval>${lane==='core'?'PT5M':'PT1H'}</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition><StartBoundary>${next.toISOString()}</StartBoundary><Enabled>true</Enabled></TimeTrigger></Triggers><Principals><Principal id="User"><UserId>${esc(principal)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable><Enabled>true</Enabled><Hidden>true</Hidden><ExecutionTimeLimit>PT1H</ExecutionTimeLimit></Settings><Actions Context="User"><Exec><Command>${esc(path.join(process.env.SystemRoot,'System32','wscript.exe'))}</Command><Arguments>&quot;${esc(launcher)}&quot;</Arguments><WorkingDirectory>${esc(root)}</WorkingDirectory></Exec></Actions></Task>`;
 const file=path.join(base,`local-task-${lane}.xml`);fs.writeFileSync(file,'\ufeff'+xml,'utf16le');
 execFileSync('schtasks.exe',['/Create','/TN',name,'/XML',file],{windowsHide:true,stdio:'pipe'});
 const installed=execFileSync('schtasks.exe',['/Query','/TN',name,'/XML'],{windowsHide:true,encoding:'utf8'});
 if(!installed.includes(lane==='core'?'PT5M':'PT1H')||!installed.includes(launcher))throw Error('LOCAL_TASK_READBACK_FAILED');
 console.log(JSON.stringify({task:name,status:'INSTALLED_VERIFIED'}));
}
// Keep the old task and launcher as rollback material, but prevent duplicate writers.
execFileSync('schtasks.exe',['/Change','/TN','ZGMINI-PC-Writer','/Disable'],{windowsHide:true,stdio:'pipe'});
