// One-time transition of the existing configured-theme scheduled launcher to
// the immutable bundle with opt-in publication. The task and old bundle stay.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {digest,ensure,safeDirectory} from './theme-config-registry.mjs';
import {configuredScheduledCommand,installConfiguredTool} from './theme-config-install.mjs';

const fileHere=fileURLToPath(import.meta.url);
const taskName='ZGMINI-PC-Configured-Themes';
const requiredOldModule='scripts/pc-writer/theme-config-tool.mjs';
const readFile=file=>{
 ensure(fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink(),
  'CONFIG_UPGRADE_FILE_REDIRECT');
 return fs.readFileSync(file);
};
const validRel=p=>typeof p==='string'&&
 /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(p)&&
 !p.split('/').some(x=>x==='.'||x==='..');

export function upgradeConfiguredSchedule({dataRoot,sourceSha,
 platform=process.platform,getTaskXml=null,stageBundle=installConfiguredTool,
 now=new Date()}={}){
 ensure(platform==='win32','CONFIG_UPGRADE_WINDOWS_REQUIRED');
 ensure(/^[a-f0-9]{40}$/.test(sourceSha??''),'CONFIG_UPGRADE_SOURCE_SHA');
 ensure(now instanceof Date&&Number.isFinite(now.getTime()),'CONFIG_UPGRADE_CLOCK');
 const home=safeDirectory(dataRoot,'pc-writer/theme-config-tool');
 const oldResultPath=path.join(home,'INSTALL_RESULT.json');
 const oldResult=JSON.parse(readFile(oldResultPath).toString('utf8'));
 ensure(oldResult?.status==='CONFIG_TOOL_INSTALLED'&&oldResult.home===home&&
  /^[a-f0-9]{16}$/.test(oldResult.version??'')&&
  /^[a-f0-9]{40}$/.test(oldResult.sourceSha??'')&&
  oldResult.manifest&&Object.getPrototypeOf(oldResult.manifest)===Object.prototype&&
  Object.hasOwn(oldResult.manifest,requiredOldModule)&&
  oldResult.version===digest(JSON.stringify(oldResult.manifest)).slice(0,16),
  'CONFIG_UPGRADE_INSTALLED_MANIFEST_IDENTITY');
 const oldVersion=safeDirectory(home,'versions/'+oldResult.version);
 for(const [rel,sha] of Object.entries(oldResult.manifest)){
  ensure(validRel(rel)&&/^[a-f0-9]{64}$/.test(sha),
   'CONFIG_UPGRADE_INSTALLED_MANIFEST_PATH');
  const target=path.join(oldVersion,rel);
  ensure(digest(readFile(target))===sha,'CONFIG_UPGRADE_OLD_BUNDLE_DRIFT');
 }
 const scheduled=path.join(home,'THEME_SCHEDULED.cmd');
 const previous=readFile(scheduled);
 const oldExpected=Buffer.from(configuredScheduledCommand({
  dataRoot,home,version:oldResult.version}));
 ensure(digest(previous)===digest(oldExpected),'CONFIG_UPGRADE_SCHEDULED_LAUNCHER_DRIFT');
 const vbs=path.join(home,'THEME_SCHEDULED.vbs');
 const vbsText=readFile(vbs).toString('utf8');
 ensure(vbsText.includes(path.join(home,'THEME_SCHEDULED.cmd')),
  'CONFIG_UPGRADE_VBS_CHANGED');
 const state=path.join(fs.realpathSync(dataRoot),'theme-config','state','scheduled.lock');
 ensure(!fs.existsSync(state),'CONFIG_UPGRADE_SCHEDULE_LOCK_PRESENT');
 const themesDir=path.join(fs.realpathSync(dataRoot),'themes');
 if(fs.existsSync(themesDir)){
  safeDirectory(dataRoot,'themes');
  for(const name of fs.readdirSync(themesDir)){
   if(!/^registered-[a-z][a-z0-9-]*$/.test(name))continue;
   const themeHome=safeDirectory(dataRoot,'themes/'+name);
   ensure(!fs.existsSync(path.join(themeHome,'state','configured-cycle.lock')),
    'CONFIG_UPGRADE_THEME_LOCK_PRESENT');
  }
 }
 const inspect=getTaskXml??(()=>execFileSync('schtasks',
  ['/Query','/TN',taskName,'/XML'],
  {encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
 const taskBefore=inspect();
 ensure(typeof taskBefore==='string'&&
  taskBefore.includes(path.join(home,'THEME_SCHEDULED.vbs'))&&
  taskBefore.includes('T13:00:00'),
  'CONFIG_UPGRADE_TASK_NOT_APPROVED');
 const upgradeResultFile=path.join(home,'AUTO_PUBLISH_UPGRADE_RESULT.json');
 ensure(!fs.existsSync(upgradeResultFile),'CONFIG_UPGRADE_ALREADY_ATTEMPTED');

 // Staging creates a separate immutable version, never edits the installed
 // one or a launcher. No provider GET, D1 access, or task registration.
 const bundle=stageBundle({dataRoot,sourceSha,stageOnly:true,registerTask:false});
 ensure(bundle.status==='CONFIG_BUNDLE_STAGED_NO_LAUNCHER_CHANGE'&&
  bundle.home===home&&/^[a-f0-9]{16}$/.test(bundle.version??''),
  'CONFIG_UPGRADE_STAGE_RESULT');
 const expected=Buffer.from(configuredScheduledCommand({
  dataRoot,home,version:bundle.version}));
 ensure(digest(readFile(scheduled))===digest(previous),
  'CONFIG_UPGRADE_PREWRITE_DRIFT');
 ensure(inspect()===taskBefore,'CONFIG_UPGRADE_TASK_DRIFT');
 const stamp=now.toISOString().replace(/[-:.TZ]/g,'');
 const backup=safeDirectory(home,'backups/auto-publish-'+stamp,{create:true});
 const backupFile=path.join(backup,'THEME_SCHEDULED.cmd');
 const backupInstall=path.join(backup,'INSTALL_RESULT.json');
 fs.writeFileSync(backupFile,previous,{flag:'wx'});
 fs.writeFileSync(backupInstall,readFile(oldResultPath),{flag:'wx'});
 ensure(digest(readFile(backupFile))===digest(previous),
  'CONFIG_UPGRADE_BACKUP_READBACK');
 let changed=false;
 try{
  const temp=scheduled+'.'+process.pid+'.upgrade.tmp';
  fs.writeFileSync(temp,expected,{flag:'wx'});
  fs.renameSync(temp,scheduled);changed=true;
  ensure(digest(readFile(scheduled))===digest(expected),
   'CONFIG_UPGRADE_NEW_LAUNCHER_READBACK');
  const taskAfter=inspect();
  ensure(taskAfter===taskBefore,'CONFIG_UPGRADE_TASK_XML_CHANGED');
  const result={status:'CONFIGURED_AUTO_PUBLISH_UPGRADE_INSTALLED',
   sourceSha,oldVersion:oldResult.version,newVersion:bundle.version,
   scheduled,oldSha256:digest(previous),newSha256:digest(expected),
   backup,task:{name:taskName,xmlSha256:digest(taskBefore),changed:false},
   legacyLaunchersChanged:0,providerCalls:0,d1Writes:0,registeredThemesAdded:0};
  fs.writeFileSync(upgradeResultFile,JSON.stringify(result,null,2)+'\n',
   {flag:'wx'});
  return result;
 }catch(error){
  if(changed){
   const rollback=scheduled+'.'+process.pid+'.rollback.tmp';
   fs.writeFileSync(rollback,previous,{flag:'wx'});
   fs.renameSync(rollback,scheduled);
   ensure(digest(readFile(scheduled))===digest(previous),
    'CONFIG_UPGRADE_ROLLBACK_READBACK_FAILED');
  }
  throw error;
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileHere){
 try{
  ensure(process.argv.length===3&&process.argv[2]==='--upgrade-scheduled',
   'CONFIG_UPGRADE_USAGE');
  const repo=fileURLToPath(new URL('../../',import.meta.url));
  const sourceSha=execFileSync('git',['rev-parse','HEAD'],
   {cwd:repo,encoding:'utf8',windowsHide:true}).trim();
  console.log(JSON.stringify(upgradeConfiguredSchedule({
   dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',sourceSha}),null,2));
 }catch(e){
  console.error(JSON.stringify({status:'STOP_CONFIG_UPGRADE',
   reason:e.code??'CONFIG_UPGRADE_IO_ERROR'}));
  process.exitCode=2;
 }
}
