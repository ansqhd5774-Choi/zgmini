import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync,execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const home=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const config=JSON.parse(fs.readFileSync(path.join(home,'config.json'),'utf8'));
if(!config.enabled)throw Error('PC_PUBLICATION_DISABLED');
const report=JSON.parse(fs.readFileSync(path.join(home,'last-run.json'),'utf8'));
if(report.status!=='VERIFIED'||report.source!==config.source)throw Error('VERIFIED_RUN_REQUIRED');
const name='ZGMINI-PC-Writer';
if(spawnSync('schtasks.exe',['/Query','/TN',name],{windowsHide:true,stdio:'ignore'}).status===0)throw Error('TASK_ALREADY_EXISTS');
const principal=execFileSync('whoami.exe',[],{encoding:'utf8',windowsHide:true}).trim();
const escape=x=>x.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const launcher=path.join(home,'run-hidden.vbs');
const command=`"${process.execPath}" "${path.join(root,'scripts/pc-writer/run.mjs')}" --publish`;
fs.writeFileSync(launcher,`Set shell = CreateObject("WScript.Shell")\r\nWScript.Quit shell.Run("${command.replaceAll('"','""')}", 0, True)\r\n`,'ascii');
const start=new Date(Date.now()+60000).toISOString();
const xml=`<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
<RegistrationInfo><Description>ZGMINI stored-input PC calculation and verified D1 publication. No provider requests.</Description></RegistrationInfo>
<Triggers><TimeTrigger><Repetition><Interval>PT5M</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition><StartBoundary>${start}</StartBoundary><Enabled>true</Enabled></TimeTrigger></Triggers>
<Principals><Principal id="User"><UserId>${escape(principal)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
<Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable><Enabled>true</Enabled><Hidden>true</Hidden><ExecutionTimeLimit>PT4M</ExecutionTimeLimit></Settings>
<Actions Context="User"><Exec><Command>${escape(path.join(process.env.SystemRoot,'System32','wscript.exe'))}</Command><Arguments>&quot;${escape(launcher)}&quot;</Arguments><WorkingDirectory>${escape(root)}</WorkingDirectory></Exec></Actions>
</Task>`;
const file=path.join(home,'task.xml');fs.writeFileSync(file,'\ufeff'+xml,'utf16le');
const r=spawnSync('schtasks.exe',['/Create','/TN',name,'/XML',file],{encoding:'utf8',windowsHide:true});
if(r.status!==0){console.log(r.stdout+r.stderr);process.exit(1);}
console.log('PC_TASK_INSTALLED_5_MIN_LOGGED_ON_USER');
