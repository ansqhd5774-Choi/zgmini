// Installs an immutable, dependency-free local tool bundle. No existing task,
// provider, score, source checkpoint or public data is changed.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {digest,ensure,safeDirectory} from './theme-config-registry.mjs';
const repo=fileURLToPath(new URL('../../',import.meta.url));
export function configuredScheduledCommand({dataRoot,home,version}){
 const runner=path.join(home,'versions',version,'scripts','pc-writer','theme-config-tool.mjs');
 return ['@echo off','setlocal EnableExtensions DisableDelayedExpansion',
  `set "ZGMINI_DATA_ROOT=${fs.realpathSync(dataRoot)}"`,
  `"E:\\ZGmini\\runtime\\node.exe" "${runner}" --scheduled >>"${path.join(home,'SCHEDULE_HISTORY.log')}" 2>&1`,
  'set "RESULT=%ERRORLEVEL%"','exit /b %RESULT%',''].join('\r\n');
}
export function installConfiguredTool({dataRoot,sourceSha,registerTask=false,stageOnly=false}={}){
 ensure(!stageOnly||!registerTask,'CONFIG_STAGE_CANNOT_REGISTER_TASK');
 ensure(/^[a-f0-9]{40}$/.test(sourceSha??''),'CONFIG_INSTALL_SOURCE_SHA');
 const files=['theme-config-registry.mjs','theme-config-score.mjs','theme-config-tool.mjs',
  'theme-optional-collect.mjs','theme-optional-adaptive-r2.mjs',
  'theme-optional-pair-weight-r3.mjs','theme-space-satellite-adaptive-r2.mjs',
  'theme-shared-spy-readonly-r1.mjs','theme-optional-score-r188.mjs',
  'theme-config-publication-preflight.mjs','theme-config-publication-d1.mjs',
  'theme-config-auto-publish.mjs','theme-nine-r54-d1-client.mjs',
  'theme-biotech-auth-r7.mjs'].map(n=>'scripts/pc-writer/'+n);
 files.push('worker/public-display-freshness.mjs');
 files.push('config/theme-data-registry.json','examples/theme-registration.template.json','docs/THEME_CONFIG_TOOL.md');
 const manifest=Object.fromEntries(files.map(f=>[f,digest(fs.readFileSync(path.join(repo,f)))]));
 const version=digest(JSON.stringify(manifest)).slice(0,16),home=safeDirectory(dataRoot,'pc-writer/theme-config-tool',{create:true});
 const relative='versions/'+version,versionDir=safeDirectory(home,relative,{create:true});
 for(const f of files){
  const destDir=safeDirectory(versionDir,path.dirname(f),{create:true}),dest=path.join(destDir,path.basename(f)),bytes=fs.readFileSync(path.join(repo,f));
  if(fs.existsSync(dest))ensure(!fs.lstatSync(dest).isSymbolicLink()&&digest(fs.readFileSync(dest))===manifest[f],'CONFIG_INSTALL_EXISTING_FILE_DRIFT');
  else fs.writeFileSync(dest,bytes,{flag:'wx'});
  ensure(digest(fs.readFileSync(dest))===manifest[f],'CONFIG_INSTALL_READBACK');
 }
 if(stageOnly)return {status:'CONFIG_BUNDLE_STAGED_NO_LAUNCHER_CHANGE',
  sourceSha,version,home,manifest,launcherWrites:0,taskWrites:0,d1Writes:0};
 const runner=path.join(versionDir,'scripts','pc-writer','theme-config-tool.mjs');
 const command=(mode,argument)=>['@echo off','setlocal EnableExtensions DisableDelayedExpansion',`set "ZGMINI_DATA_ROOT=${fs.realpathSync(dataRoot)}"`,`"E:\\ZGmini\\runtime\\node.exe" "${runner}" ${mode}${argument?' "%~1"':''}${mode==='--scheduled'?' >>"'+path.join(home,'SCHEDULE_HISTORY.log')+'" 2>&1':''}`,'set "RESULT=%ERRORLEVEL%"',...(mode==='--scheduled'?[]:['pause']),'exit /b %RESULT%',''].join('\r\n');
 const vbs=['Option Explicit','Dim shell','Set shell = CreateObject("WScript.Shell")','WScript.Quit shell.Run("""'+path.join(home,'THEME_SCHEDULED.cmd').replaceAll('"','""')+'""", 0, True)',''].join('\r\n');
 const launchers={'THEME_REGISTER.cmd':command('--import',true),'THEME_UPDATE.cmd':command('--interactive-cycle',false),'THEME_LIST.cmd':command('--list',false),'THEME_SCHEDULED.cmd':configuredScheduledCommand({dataRoot,home,version}),'THEME_SCHEDULED.vbs':vbs};
 for(const [name,body] of Object.entries(launchers)){
  const dest=path.join(home,name);
  if(fs.existsSync(dest))ensure(fs.readFileSync(dest,'utf8')===body,'CONFIG_LAUNCHER_EXISTS_DIFFERENT');
  else fs.writeFileSync(dest,body,{flag:'wx'});
 }
 fs.copyFileSync(path.join(versionDir,'examples','theme-registration.template.json'),path.join(home,'theme-registration.template.json'));
 fs.copyFileSync(path.join(versionDir,'docs','THEME_CONFIG_TOOL.md'),path.join(home,'사용방법.md'));
 const task='ZGMINI-PC-Configured-Themes';let taskStatus='NOT_INSTALLED';
 if(registerTask){
  ensure(process.platform==='win32','CONFIG_TASK_WINDOWS_REQUIRED');
  const query=()=>{try{return execFileSync('schtasks',['/Query','/TN',task,'/XML'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']});}catch(e){ensure(e.status===1,'CONFIG_TASK_QUERY_FAILED');return null;}};
  const old=query();
  if(old){ensure(old.includes(path.join(home,'THEME_SCHEDULED.vbs')),'CONFIG_EXISTING_TASK_DIFFERENT');taskStatus='EXISTING_TASK_PRESERVED';}
  else{
   execFileSync('schtasks',['/Create','/TN',task,'/SC','DAILY','/ST','13:00','/TR','wscript.exe "'+path.join(home,'THEME_SCHEDULED.vbs')+'"','/RL','LIMITED','/IT'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']});
   const xml=query();ensure(xml?.includes('THEME_SCHEDULED.vbs')&&xml.includes('T13:00:00'),'CONFIG_TASK_READBACK');taskStatus='NEW_TASK_VERIFIED';
  }
 }
 const result={status:'CONFIG_TOOL_INSTALLED',sourceSha,version,home,manifest,task:{name:task,status:taskStatus,time:'13:00 PC local time'},existingTasksChanged:0,registeredThemesAdded:0,providerCalls:0,d1Writes:0,publicWrites:0};
 fs.writeFileSync(path.join(home,'INSTALL_RESULT.json'),JSON.stringify(result,null,2)+'\n');return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{ensure(['--install','--install-with-daily-task'].includes(process.argv[2])&&process.argv.length===3,'CONFIG_INSTALL_USAGE');
  const sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8',windowsHide:true}).trim();
  console.log(JSON.stringify(installConfiguredTool({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',sourceSha,registerTask:process.argv[2]==='--install-with-daily-task'}),null,2));
 }catch(e){console.error(JSON.stringify({status:'STOP_CONFIG_INSTALL',reason:e.code??'CONFIG_INSTALL_IO_ERROR'}));process.exitCode=2;}
}
