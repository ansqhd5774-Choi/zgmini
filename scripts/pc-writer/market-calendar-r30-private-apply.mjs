// R30 private projection PC installer. Exact R29 baseline only; no forced
// collection, scheduler mutation, public output, D1, or GitHub push.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {coreRootFromTask,worktreeIdentity} from './market-calendar-r19-bea-apply.mjs';

const BASE_HEAD='fc1543c500b3a79aecdb7e7066cd95979ecc92bb';
const WORKTREE_ID='d0a4b3cb8b95';
const BASE_LOCAL='707e1186364a374aa1e10a9f4b1b57109221592113f3b308c5909704fa58a3a9';
const NEXT_PROJECTION='8fe5a33c1684e9341145a1dcd5518a8c947bb71bcc5ffbfabf7042b8e01d60e4';
const NEXT_LOCAL='f40e1a8961ef44d5389484381eda2fd052d38d2313bb1dbcfe3f509233fd413a';
const paths=['lib/earnings-api-private-projection.mjs','scripts/pc-writer/earnings-api-local.mjs'];
const protectedPaths=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const readJson=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const normalized=p=>path.normalize(p).replaceAll('\\','/').toLowerCase();
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,
 timeout:25000,stdio:['ignore','pipe','pipe']}).trim();
const getTaskXml=()=>{
 const bytes=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (bytes[0]===255&&bytes[1]===254||bytes.includes(0)?bytes.toString('utf16le'):
  bytes.toString('utf8')).replace(/^\ufeff/,'');
};
const candidateRel=rel=>fileURLToPath(new URL('../../'+rel,import.meta.url));

export function runR30({apply=false,dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 candidatePaths=paths.map(candidateRel),getRoot=coreRootFromTask,getTask=getTaskXml,
 gitCall=git,expectedIdentity=WORKTREE_ID,approvedSource=BASE_HEAD,
 expectedBaselineSha=BASE_LOCAL}={}){
 const report={audit:'MARKET_CALENDAR_R30_PRIVATE_PROJECTION_APPLY',at:new Date().toISOString(),
  mode:apply?'EXPLICIT_APPLY':'PREFLIGHT',
  policy:'EXACT_TWO_FILES_PC_INPUT_ONLY_NO_FORCED_COLLECTION_NO_PUBLISH_NO_TASK_NO_SCHEMA_NO_PUSH',
  changedFiles:[],plannedFiles:[],backupCreated:false,forcedCollection:false,
  publisherExecuted:false,gitPushed:false,newSource:null,phase:'PREFLIGHT',
  decision:'R30_PREFLIGHT_INCOMPLETE_STOP'};
 let root,configFile,configRaw,config,targets,original,candidates,head;
 try{
  candidates=candidatePaths.map(p=>fs.readFileSync(p));
  if(candidates.length!==2||sha(candidates[0])!==NEXT_PROJECTION||sha(candidates[1])!==NEXT_LOCAL){
   report.decision='R30_CANDIDATE_HASH_MISMATCH_STOP';return report;
  }
  root=getRoot(getTask());
  report.worktreeId=root?worktreeIdentity(root):null;
  if(!root||report.worktreeId!==expectedIdentity){report.decision='R30_CORE_ORIGIN_CHANGED_STOP';return report;}
  head=gitCall(root,['rev-parse','HEAD']);
  if(head!==approvedSource){report.decision='R30_R29_SOURCE_CHANGED_STOP';return report;}
  configFile=path.join(dataRoot,'config.json');configRaw=fs.readFileSync(configFile);
  config=readJson(configFile);
  if(config?.source!==head||config.enabled!==true||config.collectionTarget!=='pc'){
   report.decision='R30_CONFIG_SOURCE_CHANGED_STOP';return report;
  }
  targets=paths.map(p=>path.join(root,p));
  if(fs.existsSync(targets[0])){report.decision='R30_PROJECTION_ALREADY_EXISTS_STOP';return report;}
  original=fs.readFileSync(targets[1]);
  if(sha(original)!==expectedBaselineSha||
   gitCall(root,['rev-parse','HEAD:scripts/pc-writer/earnings-api-local.mjs'])!==
    gitCall(root,['hash-object','scripts/pc-writer/earnings-api-local.mjs'])){
   report.decision='R30_R29_LOCAL_BASE_CHANGED_STOP';return report;
  }
  if(gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''||
   gitCall(root,['ls-files','--others','--exclude-standard','--',...paths])!==''){
   report.decision='R30_PROTECTED_SOURCE_DIRTY_STOP';return report;
  }
  gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);
  report.previousSource=head;report.plannedFiles=[...paths];
  if(!apply){report.decision='R30_TWO_FILE_PREFLIGHT_READY_NO_CHANGES_MADE';return report;}
 }catch{report.decision='R30_PREFLIGHT_READ_FAILED_STOP';return report;}

 const lock=path.join(dataRoot,'local-cycle.lock');
 report.phase='CORE_LOCK_ACQUIRE';
 if(fs.existsSync(lock)){
  report.decision='R30_CORE_LOCK_PRESENT_STOP';return report;
 }
 let ownLock=false,backupDir=null,modified=false,committed=false,staged=false;
 try{
  const fd=fs.openSync(lock,'wx');ownLock=true;
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:Date.now(),purpose:'market-calendar-r30-private-projection'}));}
  finally{fs.closeSync(fd);}
  report.phase='LOCKED_SOURCE_RECHECK';
  if(normalized(getRoot(getTask())??'')!==normalized(root)||gitCall(root,['rev-parse','HEAD'])!==head||
   !fs.readFileSync(configFile).equals(configRaw)||!fs.readFileSync(targets[1]).equals(original)||
   fs.existsSync(targets[0])||
   gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''||
   gitCall(root,['ls-files','--others','--exclude-standard','--',...paths])!==''){
   report.decision='R30_STATE_CHANGED_AFTER_LOCK_STOP';return report;
  }
  backupDir=path.join(dataRoot,'market-calendar-r30-backups',
   'r30-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  report.phase='BACKUP';
  fs.mkdirSync(backupDir,{recursive:true});
  fs.copyFileSync(targets[1],path.join(backupDir,'earnings-api-local.mjs'));
  fs.copyFileSync(configFile,path.join(backupDir,'config.json'));
  if(!fs.readFileSync(path.join(backupDir,'earnings-api-local.mjs')).equals(original)||
   !fs.readFileSync(path.join(backupDir,'config.json')).equals(configRaw))throw Error('R30_BACKUP_VERIFY_FAILED');
  report.backupCreated=true;report.backupId=path.basename(backupDir);
  report.phase='WRITE_TWO_EXACT_FILES';modified=true;
  fs.writeFileSync(targets[0],candidates[0],{flag:'wx'});
  fs.writeFileSync(targets[1],candidates[1]);
  report.changedFiles=[...paths];
  for(let i=0;i<2;i++)if(sha(fs.readFileSync(targets[i]))!==sha(candidates[i]))throw Error('R30_COPY_VERIFY_FAILED');
  report.phase='GIT_COMMIT_TWO_FILES';
  gitCall(root,['add','--',paths[0]]);staged=true;
  gitCall(root,['commit','--only','-m','feat(market-calendar): project private earnings events from stored R29 inputs','--',...paths]);
  committed=true;report.newSource=gitCall(root,['rev-parse','HEAD']);
  if(gitCall(root,['rev-parse','HEAD^'])!==head||
   gitCall(root,['diff','--name-only',head,report.newSource,'--'])!==[...paths].sort().join('\n'))
   throw Error('R30_COMMIT_SCOPE_MISMATCH');
  report.phase='CONFIG_SOURCE_UPDATE';
  if(!fs.readFileSync(configFile).equals(configRaw))throw Error('R30_CONFIG_CHANGED');
  const stagedConfig=path.join(backupDir,'config-new.json');
  fs.writeFileSync(stagedConfig,JSON.stringify({...config,source:report.newSource},null,2)+'\n',{flag:'wx'});
  fs.renameSync(stagedConfig,configFile);
  if(readJson(configFile)?.source!==report.newSource)throw Error('R30_CONFIG_READBACK_FAILED');
  report.phase='INSTALLED';
  report.decision='R30_PC_PRIVATE_PROJECTION_INSTALLED_NO_FORCED_COLLECTION';
 }catch(error){
  report.decision=committed?'R30_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP':'R30_INSTALL_ABORTED_OR_RESTORED_STOP';
  const systemCode=typeof error?.code==='string'&&/^[A-Z0-9_]{2,30}$/.test(error.code)?error.code:null;
  report.errorCode=/^[A-Z0-9_]{5,80}$/.test(error?.message??'')?error.message:
   systemCode??'R30_LOCAL_OPERATION_FAILED';
  if(report.phase==='CORE_LOCK_ACQUIRE'&&systemCode==='EEXIST')report.decision='R30_CORE_LOCK_RACE_STOP';
  if(!committed&&modified){
   try{
    if(staged)gitCall(root,['rm','--cached','-f','--',paths[0]]);
    fs.copyFileSync(path.join(backupDir,'earnings-api-local.mjs'),targets[1]);
    if(fs.existsSync(targets[0])&&sha(fs.readFileSync(targets[0]))===NEXT_PROJECTION)fs.unlinkSync(targets[0]);
    if(!fs.existsSync(targets[0])&&fs.readFileSync(targets[1]).equals(original))report.changedFiles=[];
    else report.decision='R30_RESTORE_INCOMPLETE_MANUAL_RECOVERY_STOP';
   }catch{report.decision='R30_RESTORE_FAILED_MANUAL_RECOVERY_STOP';}
  }
 }finally{if(ownLock)try{fs.unlinkSync(lock);}catch{report.lockReleaseFailed=true;}}
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output){console.error('R30_RESULT_FILE_MISSING');process.exitCode=2;}
 else try{
  const result=runR30({apply:process.argv.includes('--apply')});
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n','utf8');
  console.log('R30='+result.decision);
  if(!['R30_TWO_FILE_PREFLIGHT_READY_NO_CHANGES_MADE',
   'R30_PC_PRIVATE_PROJECTION_INSTALLED_NO_FORCED_COLLECTION'].includes(result.decision))process.exitCode=1;
 }catch{console.error('R30_INSTALLER_EXECUTION_FAILED');process.exitCode=2;}
}
