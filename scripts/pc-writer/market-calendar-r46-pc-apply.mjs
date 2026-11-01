// R46: guarded, non-network PC-local install of the four approved R45 files.
// No collection, publication, scheduling, DB change, GitHub push, or broad merge.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {R46_PATCH_PATHS,R46_ALL_PATHS,R46_SIDECAR,patchR46Source} from './market-calendar-r46-pc-patch.mjs';

export const R46_APPROVED_R45_SIDECAR_SHA256='7fd755dc2b665b1a1abb66484ff827a94150a3eca7279b86a3f97fda2964e7aa';
const CORE_WORKTREE_ID='d0a4b3cb8b95';
const PROTECTED=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalize=p=>path.normalize(p).replaceAll('\\','/').toLowerCase();
const hex=v=>/^[0-9a-f]{40}$/i.test(String(v??''))?String(v).toLowerCase():null;
const posix=p=>p.split('/').join(path.sep);
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:25000,stdio:['ignore','pipe','pipe']}).trim();
const taskXml=()=>{
 const raw=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:12000,stdio:['ignore','pipe','ignore']});
 return ((raw[0]===255&&raw[1]===254||raw.includes(0))?raw.toString('utf16le'):
  raw.toString('utf8')).replace(/^\ufeff/,'');
};
const winPath=p=>/^[a-z]:[\\/]/i.test(p);
const absolute=p=>winPath(p)?path.win32.resolve(p):path.resolve(p);
const rooted=p=>(winPath(p)?path.win32:path).resolve(p,'..','..','..');

// Same Core scheduler/wrapper origin resolution as existing R19-R27 installers.
export function r46CoreRootFromTask(xml){
 if(typeof xml!=='string')return null;
 const fields=[...xml.matchAll(/<Arguments(?:\s+[^>]*)?>([\s\S]*?)<\/Arguments>/gi)];
 if(fields.length!==1)return null;
 const args=fields[0][1].replace(/&quot;|&#34;/gi,'"').replace(/&amp;/gi,'&');
 const matches=[...args.matchAll(/"([^"\r\n]*[\\/]run-local-core\.vbs)"/gi)];
 if(matches.length!==1)return null;
 const wrapperFile=absolute(matches[0][1]);
 let wrapper;
 try{if(fs.statSync(wrapperFile).size>65536)return null;wrapper=fs.readFileSync(wrapperFile,'utf8');}
 catch{return null;}
 if(!wrapper.includes('ZGMINI_R38_WRAPPER_V1'))return null;
 const origins=[...wrapper.matchAll(/^[ \t]*origin[ \t]*=[ \t]*"((?:[^"\r\n]|"")*)"[ \t]*(?:\x27[^\r\n]*)?$/gim)];
 if(origins.length!==1)return null;
 const originFile=absolute(origins[0][1].replaceAll('""','"'));
 let source;
 try{if(fs.statSync(originFile).size>65536)return null;source=fs.readFileSync(originFile,'utf8');}
 catch{return null;}
 const re=/((?:[a-z]:[\\/]|\/)[^"'\r\n<>]*?[\\/]scripts[\\/]pc-writer[\\/](?:local-cycle|quota-runner|run-local|collect-local)\.mjs)/gi;
 const entries=[...new Map([...source.matchAll(re)].map(m=>{
  const entry=absolute(m[1].trim());return [normalize(entry),entry];
 })).values()];
 if(entries.length!==1||!/[\\/]scripts[\\/]pc-writer[\\/][^\\/]+\.mjs$/i.test(entries[0]))return null;
 return rooted(entries[0]);
}

function decisionFor(error){
 const code=String(error?.message??'');
 if(/^R46_[A-Z0-9_]{3,100}$/.test(code))return code;
 const simple={EEXIST:'R46_CORE_LOCK_BUSY_STOP',ENOENT:'R46_REQUIRED_FILE_MISSING_STOP',
  EACCES:'R46_PERMISSION_STOP',EPERM:'R46_PERMISSION_STOP',ENOSPC:'R46_DISK_FULL_STOP',
  EBUSY:'R46_FILE_BUSY_STOP',EROFS:'R46_READ_ONLY_STOP'};
 return simple[error?.code]??'R46_LOCAL_OPERATION_FAILED_STOP';
}
const stop=code=>{throw Error(code)};

export function runR46PcApply({
 apply=false,
 base=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 candidatePath=fileURLToPath(new URL('./market-calendar-r45-marketparquet-capture.mjs',import.meta.url)),
 getTaskXml=taskXml,getRoot=r46CoreRootFromTask,gitCall=git,
 expectedWorktreeId=CORE_WORKTREE_ID,allowNonWindows=false,
}={}){
 const result={audit:'MARKET_CALENDAR_R46_PC_R45_INSTALL',at:new Date().toISOString(),
  mode:apply?'APPLY':'PREFLIGHT',phase:'PREFLIGHT',
  decision:'R46_PREFLIGHT_INCOMPLETE_STOP',changedFiles:[],backupCreated:false,
  providerCallsAdded:0,forcedCollection:false,published:false,dbWrites:0,
  schedulerChanged:false,gitPushed:false,newSource:null};
 let root=null,head=null,configFile=null,configRaw=null,config=null,content=null;
 let plan=[],originalFiles=[],sidecar=null,lockFile=null,lockToken=null,ownLock=false;
 let backupDir=null,backupVerified=false,modified=false,committed=false;
 try{
  if(process.platform!=='win32'&&!allowNonWindows)stop('R46_WINDOWS_ONLY_STOP');
  if(Number(process.versions.node.split('.')[0])<24)stop('R46_NODE_24_REQUIRED_STOP');
  sidecar=fs.readFileSync(candidatePath);
  if(sha(sidecar)!==R46_APPROVED_R45_SIDECAR_SHA256)stop('R46_SIDECAR_HASH_MISMATCH_STOP');
  root=getRoot(getTaskXml());
  result.worktreeId=root?sha(normalize(root)).slice(0,12):null;
  if(!root||result.worktreeId!==expectedWorktreeId)stop('R46_CORE_ORIGIN_CHANGED_STOP');
  if(normalize(gitCall(root,['rev-parse','--show-toplevel']))!==normalize(root))
   stop('R46_NOT_EXACT_CORE_WORKTREE_STOP');
  head=hex(gitCall(root,['rev-parse','HEAD']));
  if(!head)stop('R46_PC_HEAD_INVALID_STOP');
  result.previousSource=head;
  if(!fs.statSync(base).isDirectory())stop('R46_PC_HOME_INVALID_STOP');
  configFile=path.join(base,'config.json');configRaw=fs.readFileSync(configFile);
  config=JSON.parse(configRaw.toString('utf8'));
  if(config?.source!==head||config?.enabled!==true||config?.collectionTarget!=='pc')
   stop('R46_PC_CONFIG_SOURCE_CHANGED_STOP');
  if(gitCall(root,['status','--porcelain','--untracked-files=no','--',...PROTECTED])!=='')
   stop('R46_PROTECTED_WORKTREE_DIRTY_STOP');
  if(fs.existsSync(path.join(root,posix(R46_SIDECAR))))
   stop('R46_SIDECAR_ALREADY_EXISTS_STOP');
  for(const relative of R46_PATCH_PATHS){
   const target=path.join(root,posix(relative));
   const before=fs.readFileSync(target);
   const proposed=Buffer.from(patchR46Source(relative,before.toString('utf8')),'utf8');
   if(before.equals(proposed))stop('R46_EMPTY_PATCH_STOP');
   plan.push({relative,target,hashBefore:sha(before),hashAfter:sha(proposed),proposed});
   originalFiles.push({target,before});
  }
  // A PC git source can legitimately have unrelated newer commits. The exact
  // R45 insertion points must match; no other code is replaced.
  gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);
  result.targetCount=R46_ALL_PATHS.length;
  result.plannedFiles=[...R46_ALL_PATHS];
  result.phase='PREFLIGHT_READY';
  if(!apply){result.decision='R46_PREFLIGHT_READY_NO_CHANGES';return result;}

  lockFile=path.join(base,'local-cycle.lock');
  lockToken=JSON.stringify({pid:process.pid,at:Date.now(),purpose:'market-calendar-r46-r45-install',nonce:randomUUID()});
  result.phase='CORE_LOCK_ACQUIRE';
  const fd=fs.openSync(lockFile,'wx');ownLock=true;
  try{fs.writeFileSync(fd,lockToken);}finally{fs.closeSync(fd);}
  result.phase='LOCKED_RECHECK';
  if(normalize(getRoot(getTaskXml()))!==normalize(root)||
   hex(gitCall(root,['rev-parse','HEAD']))!==head||
   gitCall(root,['status','--porcelain','--untracked-files=no','--',...PROTECTED])!==''||
   !fs.readFileSync(configFile).equals(configRaw)||!fs.readFileSync(candidatePath).equals(sidecar)||
   fs.existsSync(path.join(root,posix(R46_SIDECAR)))||
   plan.some(p=>sha(fs.readFileSync(p.target))!==p.hashBefore))
   stop('R46_STATE_CHANGED_AFTER_LOCK_STOP');

  result.phase='BACKUP';
  backupDir=path.join(base,'market-calendar-r46-backups',
   'r46-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
  for(const p of plan){
   const backup=path.join(backupDir,posix(p.relative));
   fs.mkdirSync(path.dirname(backup),{recursive:true});
   fs.copyFileSync(p.target,backup);
   if(sha(fs.readFileSync(backup))!==p.hashBefore)stop('R46_BACKUP_HASH_MISMATCH_STOP');
  }
  fs.copyFileSync(configFile,path.join(backupDir,'config.json'));
  if(!fs.readFileSync(path.join(backupDir,'config.json')).equals(configRaw))
   stop('R46_BACKUP_CONFIG_MISMATCH_STOP');
  backupVerified=true;result.backupCreated=true;result.backupId=path.basename(backupDir);

  result.phase='PATCH_EXACT_R45_TARGETS';
  modified=true;
  for(const p of plan){
   fs.writeFileSync(p.target,p.proposed);
   if(sha(fs.readFileSync(p.target))!==p.hashAfter)stop('R46_PATCH_READBACK_MISMATCH_STOP');
  }
  const sidecarTarget=path.join(root,posix(R46_SIDECAR));
  fs.copyFileSync(candidatePath,sidecarTarget,fs.constants.COPYFILE_EXCL);
  if(sha(fs.readFileSync(sidecarTarget))!==R46_APPROVED_R45_SIDECAR_SHA256)
   stop('R46_SIDECAR_READBACK_MISMATCH_STOP');
  result.changedFiles=[...R46_ALL_PATHS];
  const changed=gitCall(root,['status','--porcelain','--untracked-files=all','--',...R46_ALL_PATHS]);
  if(changed.split('\n').filter(Boolean).length!==4)stop('R46_UNEXPECTED_MODIFIED_FILES_STOP');

  result.phase='LOCAL_GIT_COMMIT';
  gitCall(root,['add','--',...R46_ALL_PATHS]);
  gitCall(root,['commit','--only','-m','feat(market-calendar): install R45 private daily stock capture','--',...R46_ALL_PATHS]);
  committed=true;
  const next=hex(gitCall(root,['rev-parse','HEAD']));
  result.newSource=next;
  const diff=gitCall(root,['diff','--name-only',head,next,'--']).replaceAll('\\','/').split('\n').filter(Boolean).sort();
  if(!next||hex(gitCall(root,['rev-parse','HEAD^']))!==head||
   JSON.stringify(diff)!==JSON.stringify([...R46_ALL_PATHS].sort()))
   stop('R46_COMMIT_SCOPE_MISMATCH_MANUAL_RECOVERY_STOP');

  result.phase='CONFIG_SOURCE_UPDATE';
  if(!fs.readFileSync(configFile).equals(configRaw))
   stop('R46_CONFIG_CHANGED_DURING_INSTALL_MANUAL_RECOVERY_STOP');
  const configTemp=path.join(backupDir,'config-new.json');
  fs.writeFileSync(configTemp,JSON.stringify({...config,source:next},null,2)+'\n',{flag:'wx'});
  fs.renameSync(configTemp,configFile);
  if(readJson(configFile)?.source!==next)stop('R46_CONFIG_READBACK_FAILED_MANUAL_RECOVERY_STOP');
  result.phase='INSTALLED';result.decision='R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION';
  return result;
 }catch(error){
  result.errorCode=decisionFor(error);
  result.decision=committed?'R46_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP':result.errorCode;
  if(modified&&!committed&&backupVerified){
   try{
    for(const p of plan){
     const backup=path.join(backupDir,posix(p.relative));
     fs.copyFileSync(backup,p.target);
     if(sha(fs.readFileSync(p.target))!==p.hashBefore)throw Error('R46_ROLLBACK_HASH_MISMATCH');
    }
    const sidecarTarget=path.join(root,posix(R46_SIDECAR));
    if(fs.existsSync(sidecarTarget)){
     if(sha(fs.readFileSync(sidecarTarget))!==R46_APPROVED_R45_SIDECAR_SHA256)
      throw Error('R46_SIDECAR_CHANGED_DURING_ROLLBACK');
     fs.unlinkSync(sidecarTarget);
    }
    // New R45 sidecar may not be in the index yet; restore the tracked
    // targets separately so an unknown sidecar path cannot block rollback.
    gitCall(root,['restore','--staged','--',...R46_PATCH_PATHS]);
    if(gitCall(root,['ls-files','--',R46_SIDECAR])!=='')
     gitCall(root,['restore','--staged','--',R46_SIDECAR]);
    if(gitCall(root,['status','--porcelain','--untracked-files=all','--',...R46_ALL_PATHS])!=='')
     throw Error('R46_ROLLBACK_WORKTREE_NOT_CLEAN');
    result.changedFiles=[];result.rolledBack=true;
   }catch{result.decision='R46_ROLLBACK_INCOMPLETE_MANUAL_RECOVERY_STOP';}
  }
  return result;
 }finally{
  if(ownLock&&lockFile){
   try{if(fs.readFileSync(lockFile,'utf8')===lockToken)fs.unlinkSync(lockFile);}
   catch{result.decision='R46_LOCK_RELEASE_UNCONFIRMED_STOP';}
  }
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 const apply=args.includes('--apply');
 const baseArg=args.find(x=>x.startsWith('--base='));
 const options={apply};if(baseArg)options.base=baseArg.slice(7);
 const result=runR46PcApply(options);
 console.log(JSON.stringify(result));
 if(!result.decision.endsWith('INSTALLED_NO_FORCED_COLLECTION')&&
  result.decision!=='R46_PREFLIGHT_READY_NO_CHANGES')process.exitCode=2;
}
