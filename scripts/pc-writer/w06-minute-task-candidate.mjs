// W06 proposed Task definition for the existing PC Task installer/maintenance path.
// Pure source candidate: importing/calling this function makes no OS/Task/DB writes.
// A separate effect-specific approved B transaction must verify absence, pin bytes,
// backup, apply, and read back the Task before any operating use.
import path from 'node:path';

export const W06_MINUTE_TASK_NAME='ZGMINI-PC-CNN-Minute';
export const W06_MINUTE_TASK_INTERVAL='PT1M';
const HOME=String.raw`E:\ZGmini\data\pc-writer`;
const NODE=String.raw`E:\ZGmini\runtime\node.exe`;
const STOP=code=>{throw Object.assign(Error(code),{code});};
const xmlEscape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const ROOT=String.raw`E:\ZGmini\projects\zgmini-earnings-history-pc-release`;
const validRoot=value=>typeof value==='string'&&value.toLowerCase()===ROOT.toLowerCase();
const validAccount=value=>typeof value==='string'&&value.length>=1&&
 value.length<=200&&!/[\r\n\x00-\x1f]/.test(value);

export function buildW06MinuteTaskCandidate({sourceRoot,pcHome=HOME,nodeExe=NODE,
 systemRoot=String.raw`C:\Windows`,account,now}={}){
 if(!validRoot(sourceRoot)||pcHome.toLowerCase()!==HOME.toLowerCase()||
  nodeExe.toLowerCase()!==NODE.toLowerCase()||
  !/^[A-Za-z]:\\Windows$/i.test(systemRoot)||!validAccount(account)||
  !(now instanceof Date)||!Number.isFinite(now.getTime()))STOP('W06_MINUTE_TASK_INPUT_SCOPE_STOP');
 const next=new Date(Math.floor(now.getTime()/60_000)*60_000+60_000).toISOString();
 const launcher=path.win32.join(HOME,'run-local-cnn-minute.vbs');
 const source=path.win32.join(sourceRoot,'scripts','pc-writer','local-cycle.mjs');
 const command=`"${NODE}" "${source}" --cnn-minute --publish`;
 const launcherText=`Set shell = CreateObject("WScript.Shell")\r\nWScript.Quit shell.Run("${command.replaceAll('"','""')}", 0, True)\r\n`;
 const taskXml=`<?xml version="1.0" encoding="UTF-16"?><Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"><RegistrationInfo><Description>ZGMINI W06 CNN-only 60-second saved observation and publication. Existing Core unchanged.</Description></RegistrationInfo><Triggers><TimeTrigger><Repetition><Interval>PT1M</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition><StartBoundary>${next}</StartBoundary><Enabled>true</Enabled></TimeTrigger></Triggers><Principals><Principal id="User"><UserId>${xmlEscape(account)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable><Enabled>true</Enabled><Hidden>true</Hidden><ExecutionTimeLimit>PT5M</ExecutionTimeLimit></Settings><Actions Context="User"><Exec><Command>${xmlEscape(path.win32.join(systemRoot,'System32','wscript.exe'))}</Command><Arguments>&quot;${xmlEscape(launcher)}&quot;</Arguments><WorkingDirectory>${xmlEscape(sourceRoot)}</WorkingDirectory></Exec></Actions></Task>`;
 return {status:'SOURCE_CANDIDATE_NOT_APPROVED',taskName:W06_MINUTE_TASK_NAME,
  repetitionInterval:W06_MINUTE_TASK_INTERVAL,launcher,launcherText,taskXml,
  effectRequiresApproval:'CREATE_ONE_TASK_WITH_EXACT_CAS_AND_ROLLBACK',
  // This candidate itself only describes the Task; it never registers it.
  candidateWrites:0,coreTaskChanges:0,existingWriterTaskChanges:0,
  providerCalls:0,dbWrites:0,d1Writes:0};
}
