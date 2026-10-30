// Repeatable upgrade around the existing protected installer. Historical
// one-time migration evidence is retained; future updates use ACTIVE_RUNTIME.
import fs from 'node:fs';
import path from 'node:path';
import {safeDirectory,digest,ensure} from './theme-config-registry.mjs';
import {configuredManualCommand} from './theme-config-install.mjs';
import {upgradeConfiguredSchedule} from './theme-config-upgrade.mjs';
export function upgradeConfiguredRuntime({dataRoot,sourceSha,currentProof=null,
 getTaskXml=null,getTaskState=null,stageBundle,now=new Date()}={}){
 const home=safeDirectory(dataRoot,'pc-writer/theme-config-tool');
 const lock=path.join(home,'runtime-upgrade.lock');let owned=false;
 const active=path.join(home,'ACTIVE_RUNTIME.json');
 try{
  const fd=fs.openSync(lock,'wx');owned=true;fs.writeSync(fd,JSON.stringify({pid:process.pid,at:now.toISOString()}));fs.closeSync(fd);
  ensure(typeof getTaskState==='function'&&typeof getTaskXml==='function','CONFIG_RUNTIME_TASK_ADAPTER_REQUIRED');
  const state=getTaskState;
  ensure(state()===3,'CONFIG_RUNTIME_TASK_NOT_READY');
  const old=fs.existsSync(active)?JSON.parse(fs.readFileSync(active,'utf8')):currentProof;
  ensure(old?.authority==='VERIFIED_INSTALLED_SOURCE_MANIFEST','CONFIG_CURRENT_RUNTIME_PROOF_REQUIRED');
  const activeBefore=fs.existsSync(active)?fs.readFileSync(active):null;
  const original=JSON.parse(fs.readFileSync(path.join(home,'INSTALL_RESULT.json'),'utf8'));
  const manualVersions=[old.version];
  if(original.version!==old.version){
   ensure(original.version===digest(JSON.stringify(original.manifest)).slice(0,16),'CONFIG_RUNTIME_ORIGINAL_MANIFEST');
   for(const [rel,sha] of Object.entries(original.manifest)){
    ensure(!path.isAbsolute(rel)&&!rel.split(/[\\/]/).includes('..'),'CONFIG_RUNTIME_ORIGINAL_PATH');
    ensure(digest(fs.readFileSync(path.join(home,'versions',original.version,rel)))===sha,'CONFIG_RUNTIME_ORIGINAL_SOURCE_DRIFT');
   }
   manualVersions.push(original.version);
  }
  const name='PLATFORM_UPGRADE_'+now.getTime()+'.json';
  const inspect=()=>{ensure(state()===3,'CONFIG_RUNTIME_TASK_NOT_READY');return getTaskXml();};
  const result=upgradeConfiguredSchedule({dataRoot,sourceSha,installedOverride:old,resultFileName:name,getTaskXml:inspect,stageBundle,now});
  const next={authority:'VERIFIED_INSTALLED_SOURCE_MANIFEST',status:'CONFIG_TOOL_INSTALLED',home,
   sourceSha,version:result.newVersion,manifest:result.installedManifest,upgradeResult:name};
  // Only the existing common registration/list/update entry points are moved.
  // The legacy 10-theme jobs and data are not changed.
  const backups=[];const replaced=[];let activeChanged=false;
  try{
   for(const [name,mode,argument] of [['THEME_REGISTER.cmd','--import',true],['THEME_LIST.cmd','--list',false],['THEME_UPDATE.cmd','--interactive-cycle',false]]){
    const file=path.join(home,name);ensure(fs.existsSync(file),'CONFIG_RUNTIME_MANUAL_ENTRY_MISSING');
    const bytes=fs.readFileSync(file),text=bytes.toString('utf8');
    ensure(!fs.lstatSync(file).isSymbolicLink()&&manualVersions.some(version=>text===configuredManualCommand({dataRoot,home,version,mode,argument})),'CONFIG_RUNTIME_MANUAL_ENTRY_DRIFT');
    const replacement=Buffer.from(configuredManualCommand({dataRoot,home,version:result.newVersion,mode,argument}));
    const backup=path.join(result.backup,name);fs.writeFileSync(backup,bytes,{flag:'wx'});backups.push({file,bytes});
    const temp=file+'.'+process.pid+'.tmp';fs.writeFileSync(temp,replacement,{flag:'wx'});fs.renameSync(temp,file);replaced.push(file);
    ensure(digest(fs.readFileSync(file))===digest(replacement),'CONFIG_RUNTIME_MANUAL_READBACK');
   }
   const temp=active+'.'+process.pid+'.tmp';fs.writeFileSync(temp,JSON.stringify(next,null,2)+'\n',{flag:'wx'});fs.renameSync(temp,active);activeChanged=true;
   ensure(digest(fs.readFileSync(active))===digest(JSON.stringify(next,null,2)+'\n'),'CONFIG_RUNTIME_ACTIVE_READBACK');
  }catch(error){
   if(activeChanged){if(activeBefore){const temp=active+'.'+process.pid+'.restore';fs.writeFileSync(temp,activeBefore,{flag:'wx'});fs.renameSync(temp,active);}else fs.unlinkSync(active);}
   for(const {file,bytes} of backups.filter(b=>replaced.includes(b.file))){const temp=file+'.'+process.pid+'.restore';fs.writeFileSync(temp,bytes,{flag:'wx'});fs.renameSync(temp,file);}
   const scheduled=path.join(home,'THEME_SCHEDULED.cmd'),oldCmd=fs.readFileSync(path.join(result.backup,'THEME_SCHEDULED.cmd'));
   ensure(digest(fs.readFileSync(scheduled))===result.newSha256,'CONFIG_RUNTIME_ROLLBACK_SOURCE_CHANGED');
   const temp=scheduled+'.'+process.pid+'.restore';fs.writeFileSync(temp,oldCmd,{flag:'wx'});fs.renameSync(temp,scheduled);
   ensure(digest(fs.readFileSync(scheduled))===result.oldSha256,'CONFIG_RUNTIME_ROLLBACK_READBACK');
   fs.writeFileSync(path.join(home,'COMMON_RUNTIME_FAILURE_'+now.getTime()+'.json'),JSON.stringify({status:'ROLLBACK_VERIFIED',reason:error.code??'CONFIG_RUNTIME_IO_ERROR',upgradeResult:name,sourceSha,providerCalls:0,d1Writes:0,schedulerWrites:0},null,2)+'\n',{flag:'wx'});
   throw error;
  }
  return {...result,runtimeStatus:'CONFIG_COMMON_RUNTIME_UPGRADED',activeVersion:next.version,manualEntriesUpdated:replaced.length,
   registrationAdded:0,providerCalls:0,d1Writes:0,schedulerWrites:0,naturalScheduleObserved:false};
 }finally{if(owned)fs.unlinkSync(lock);}
}
