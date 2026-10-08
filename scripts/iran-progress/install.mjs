import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {collectionInstallReady,collectionTaskReadback} from './collection-policy.mjs';
import {articleAnalysisInstallReady} from './article-analysis-r14.mjs';
import {hasMatchingArticleEvaluation} from './evaluate-article-ai-r14.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
const collectionOnly=process.argv.includes('--collection-only');
const articleAnalysis=process.argv.includes('--article-analysis');
if(process.argv.slice(2).some(a=>!['--collection-only','--article-analysis'].includes(a))||articleAnalysis&&!collectionOnly)throw Error('IRAN_INSTALL_ARGS_INVALID');
const report=JSON.parse(fs.readFileSync(path.join(base,collectionOnly?'collection-last-run.json':'last-run.json'),'utf8'));
if(collectionOnly?!collectionInstallReady(report):(report.status!=='READY'||report.publication!=='VERIFIED'))throw Error('IRAN_VERIFIED_RUNTIME_REQUIRED');
if(articleAnalysis){
 const ai=JSON.parse(fs.readFileSync(path.join(base,'article-analysis-last-run.json'),'utf8'));
 if(!articleAnalysisInstallReady(ai))throw Error('IRAN_ARTICLE_ANALYSIS_RUNTIME_REQUIRED');
 const {openStore}=await import('./store.mjs');const store=openStore(path.join(base,'iran.sqlite'));
 try{
  if(!hasMatchingArticleEvaluation(store,ai.model,ai.modelDigest))throw Error('IRAN_ARTICLE_AI_EVALUATION_REQUIRED');
 }finally{store.close();}
}
const name='ZGMINI-PC-Iran-Progress-R13';
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const principal=execFileSync('whoami.exe',[],{encoding:'utf8',windowsHide:true}).trim();
const launcher=path.join(base,articleAnalysis?'run-articles.vbs':'run.vbs'),command=collectionOnly
 ?`"${process.execPath}" "${path.join(root,'scripts/iran-progress/collect-r14.mjs')}" --max=48 --scheduled${articleAnalysis?' --analyze-articles':''}`
 :`"${process.execPath}" "${path.join(root,'scripts/iran-progress/run.mjs')}" --publish --ai --discover --scheduled`;
fs.writeFileSync(launcher,`Set shell = CreateObject("WScript.Shell")\r\nWScript.Quit shell.Run("${command.replaceAll('"','""')}", 0, True)\r\n`,'ascii');
const xml=`<?xml version="1.0" encoding="UTF-16"?><Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"><Triggers><CalendarTrigger><StartBoundary>2026-10-08T00:00:00+09:00</StartBoundary><Enabled>true</Enabled><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger><CalendarTrigger><StartBoundary>2026-10-08T06:00:00+09:00</StartBoundary><Enabled>true</Enabled><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger><CalendarTrigger><StartBoundary>2026-10-08T12:00:00+09:00</StartBoundary><Enabled>true</Enabled><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger><CalendarTrigger><StartBoundary>2026-10-08T18:00:00+09:00</StartBoundary><Enabled>true</Enabled><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger></Triggers><Principals><Principal id="User"><UserId>${esc(principal)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><StartWhenAvailable>true</StartWhenAvailable><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><WakeToRun>false</WakeToRun><Hidden>true</Hidden><ExecutionTimeLimit>PT30M</ExecutionTimeLimit></Settings><Actions Context="User"><Exec><Command>${esc(path.join(process.env.SystemRoot,'System32','wscript.exe'))}</Command><Arguments>&quot;${esc(launcher)}&quot;</Arguments><WorkingDirectory>${esc(root)}</WorkingDirectory></Exec></Actions></Task>`;
const file=path.join(base,'task.xml');fs.writeFileSync(file,'\ufeff'+xml,'utf16le');
if(articleAnalysis){
 const previous=execFileSync('schtasks.exe',['/Query','/TN',name,'/XML'],{encoding:'utf8',windowsHide:true});
 fs.writeFileSync(path.join(base,'task-before-articles-'+Date.now()+'.xml'),previous,'utf8');
}
execFileSync('schtasks.exe',['/Create','/TN',name,'/XML',file,...(articleAnalysis?['/F']:[])],{windowsHide:true,stdio:'pipe'});
const installed=execFileSync('schtasks.exe',['/Query','/TN',name,'/XML'],{encoding:'utf8',windowsHide:true});
if(!collectionTaskReadback(installed,launcher))throw Error('IRAN_TASK_READBACK_FAILED');
if(articleAnalysis&&(!fs.readFileSync(launcher,'ascii').includes('--analyze-articles')||fs.readFileSync(launcher,'ascii').includes('--publish')))throw Error('IRAN_ARTICLE_TASK_COMMAND_INVALID');
console.log(JSON.stringify({task:name,status:'INSTALLED_VERIFIED',mode:articleAnalysis?'COLLECTION_AND_ARTICLE_ANALYSIS':collectionOnly?'COLLECTION_ONLY':'READY_PUBLICATION'}));
