// R33: exact R31 PC baseline, one-file collector patch and local-cache replay.
// No provider HTTP, forced collection, direct Cloudflare sync, task or schema mutation.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {coreRootFromTask,worktreeIdentity} from './market-calendar-r19-bea-apply.mjs';

const BASE_HEAD='4466f602abfe09bb9cc7530fd109ba1d80aeacbd';
const WORKTREE_ID='d0a4b3cb8b95';
const BASE_SHA='c5d89e8571d864bdc87c5f516f52ddf6819034ed6b1b5c241fc87780a0511bff';
const NEXT_SHA='f80bced7233ba9da5511a73bf324ae73a4a7c505ecf1ce9f690cb412b98b1b62';
const REL='scripts/pc-writer/earnings-api-local.mjs';
const protectedPaths=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const sha=data=>createHash('sha256').update(data).digest('hex');
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
const candidateRel=()=>fileURLToPath(new URL('../../'+REL,import.meta.url));

async function replayFromLocalDb({root,dataRoot,now}){
 const dbFile=path.join(dataRoot,'storage','core.sqlite');
 if(!fs.existsSync(dbFile))return {status:'PC_DB_MISSING',providerRequests:0};
 const [{localDatabase},{publicFeedStore},{replayCachedEarningsDisplay}]=await Promise.all([
  import(pathToFileURL(path.join(root,'scripts/pc-writer/local-db.mjs')).href),
  import(pathToFileURL(path.join(root,'worker/public-feed-store.mjs')).href),
  import(pathToFileURL(path.join(root,REL)).href),
 ]);
 const db=localDatabase(dbFile);
 try{
  const store=publicFeedStore(db);
  const sourceState=(await store.readInput('release-calendar:earnings-api:status'))?.body;
  return await replayCachedEarningsDisplay({store,now,sourceState});
 }finally{db.close();}
}

export async function runR33({apply=false,dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 candidatePath=candidateRel(),getRoot=coreRootFromTask,getTask=getTaskXml,
 gitCall=git,expectedIdentity=WORKTREE_ID,approvedSource=BASE_HEAD,
 expectedBaselineSha=BASE_SHA,replayPC=replayFromLocalDb}={}){
 const report={audit:'MARKET_CALENDAR_R33_PC_CACHE_REPLAY_APPLY',
  at:new Date().toISOString(),mode:apply?'EXPLICIT_APPLY':'PREFLIGHT',
  policy:'EXACT_ONE_FILE_NO_PROVIDER_REQUEST_NO_FORCED_COLLECTION_NO_DIRECT_PUBLISH_NO_SCHEDULE_NO_PUSH',
  plannedFiles:[],changedFiles:[],backupCreated:false,forcedCollection:false,
  publisherExecuted:false,gitPushed:false,providerRequests:0,cacheReplay:'NOT_ATTEMPTED',
  newSource:null,phase:'PREFLIGHT',decision:'R33_PREFLIGHT_INCOMPLETE_STOP'};
 let root,configFile,configRaw,config,target,original,candidate,head;
 try{
  candidate=fs.readFileSync(candidatePath);
  if(sha(candidate)!==NEXT_SHA){report.decision='R33_CANDIDATE_HASH_MISMATCH_STOP';return report;}
  root=getRoot(getTask());report.worktreeId=root?worktreeIdentity(root):null;
  if(!root||report.worktreeId!==expectedIdentity){report.decision='R33_CORE_ORIGIN_CHANGED_STOP';return report;}
  head=gitCall(root,['rev-parse','HEAD']);
  if(head!==approvedSource){report.decision='R33_R31_SOURCE_CHANGED_STOP';return report;}
  configFile=path.join(dataRoot,'config.json');configRaw=fs.readFileSync(configFile);config=readJson(configFile);
  if(config?.source!==head||config.enabled!==true||config.collectionTarget!=='pc'){
   report.decision='R33_CONFIG_SOURCE_CHANGED_STOP';return report;
  }
  target=path.join(root,REL);original=fs.readFileSync(target);
  if(sha(original)!==expectedBaselineSha||
   gitCall(root,['rev-parse','HEAD:'+REL])!==gitCall(root,['hash-object',REL])){
   report.decision='R33_R31_COLLECTOR_CHANGED_STOP';return report;
  }
  if(gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''||
   gitCall(root,['ls-files','--others','--exclude-standard','--',REL])!==''){
   report.decision='R33_PROTECTED_SOURCE_DIRTY_STOP';return report;
  }
  gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);
  report.previousSource=head;report.plannedFiles=[REL];
  if(!apply){report.decision='R33_ONE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE';return report;}
 }catch{report.decision='R33_PREFLIGHT_READ_FAILED_STOP';return report;}

 const lock=path.join(dataRoot,'local-cycle.lock');
 report.phase='CORE_LOCK_ACQUIRE';
 if(fs.existsSync(lock)){report.decision='R33_CORE_LOCK_PRESENT_STOP';return report;}
 let ownLock=false,backupDir=null,modified=false,committed=false;
 try{
  const fd=fs.openSync(lock,'wx');ownLock=true;
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:Date.now(),purpose:'market-calendar-r33-cache-replay'}));}
  finally{fs.closeSync(fd);}
  report.phase='LOCKED_SOURCE_RECHECK';
  if(normalized(getRoot(getTask())??'')!==normalized(root)||gitCall(root,['rev-parse','HEAD'])!==head||
   !fs.readFileSync(configFile).equals(configRaw)||!fs.readFileSync(target).equals(original)||
   gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''||
   gitCall(root,['ls-files','--others','--exclude-standard','--',REL])!==''){
   report.decision='R33_STATE_CHANGED_AFTER_LOCK_STOP';return report;
  }
  backupDir=path.join(dataRoot,'market-calendar-r33-backups',
   'r33-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  report.phase='BACKUP';fs.mkdirSync(backupDir,{recursive:true});
  fs.copyFileSync(target,path.join(backupDir,'earnings-api-local.mjs'));
  fs.copyFileSync(configFile,path.join(backupDir,'config.json'));
  if(!fs.readFileSync(path.join(backupDir,'earnings-api-local.mjs')).equals(original)||
   !fs.readFileSync(path.join(backupDir,'config.json')).equals(configRaw))
   throw Error('R33_BACKUP_VERIFY_FAILED');
  report.backupCreated=true;report.backupId=path.basename(backupDir);
  report.phase='WRITE_ONE_EXACT_FILE';modified=true;
  fs.writeFileSync(target,candidate);
  report.changedFiles=[REL];
  if(sha(fs.readFileSync(target))!==NEXT_SHA)throw Error('R33_COPY_VERIFY_FAILED');
  report.phase='GIT_COMMIT_ONE_FILE';
  gitCall(root,['commit','--only','-m','fix(market-calendar): replay cached earnings display without new API calls','--',REL]);
  committed=true;report.newSource=gitCall(root,['rev-parse','HEAD']);
  if(gitCall(root,['rev-parse','HEAD^'])!==head||
   gitCall(root,['diff','--name-only',head,report.newSource,'--'])!==REL)
   throw Error('R33_COMMIT_SCOPE_MISMATCH');
  report.phase='CONFIG_SOURCE_UPDATE';
  if(!fs.readFileSync(configFile).equals(configRaw))throw Error('R33_CONFIG_CHANGED');
  const stagedConfig=path.join(backupDir,'config-new.json');
  fs.writeFileSync(stagedConfig,JSON.stringify({...config,source:report.newSource},null,2)+'\n',{flag:'wx'});
  fs.renameSync(stagedConfig,configFile);
  if(readJson(configFile)?.source!==report.newSource)throw Error('R33_CONFIG_READBACK_FAILED');
  report.phase='LOCAL_CACHE_REPLAY';
  try{
   const replay=await replayPC({root,dataRoot,now:Date.now()});
   report.cacheReplay=replay?.status??'REPLAY_RESULT_UNKNOWN';
   report.recordCount=Number.isSafeInteger(replay?.recordCount)?replay.recordCount:null;
   report.providerRequests=replay?.providerRequests??0;
   if(report.providerRequests!==0)throw Error('R33_UNEXPECTED_PROVIDER_REQUEST');
  }catch{report.cacheReplay='REPLAY_FAILED_DATA_STATE_UNKNOWN';}
  report.phase='INSTALLED';report.decision='R33_PC_CODE_INSTALLED_LOCAL_CACHE_REPLAY_ATTEMPTED';
 }catch(error){
  report.decision=committed?'R33_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP':'R33_INSTALL_ABORTED_OR_RESTORED_STOP';
  const code=typeof error?.code==='string'&&/^[A-Z0-9_]{2,30}$/.test(error.code)?error.code:null;
  report.errorCode=/^[A-Z0-9_]{5,80}$/.test(error?.message??'')?error.message:code??'R33_LOCAL_OPERATION_FAILED';
  if(report.phase==='CORE_LOCK_ACQUIRE'&&code==='EEXIST')report.decision='R33_CORE_LOCK_RACE_STOP';
  if(!committed&&modified){
   try{
    fs.copyFileSync(path.join(backupDir,'earnings-api-local.mjs'),target);
    if(fs.readFileSync(target).equals(original))report.changedFiles=[];
    else report.decision='R33_RESTORE_INCOMPLETE_MANUAL_RECOVERY_STOP';
   }catch{report.decision='R33_RESTORE_FAILED_MANUAL_RECOVERY_STOP';}
  }
 }finally{if(ownLock)try{fs.unlinkSync(lock);}catch{report.lockReleaseFailed=true;}}
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output){console.error('R33_RESULT_FILE_MISSING');process.exitCode=2;}
 else try{
  const result=await runR33({apply:process.argv.includes('--apply')});
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n','utf8');
  console.log('R33='+result.decision);
  console.log('R33_CACHE_REPLAY='+result.cacheReplay);
  if(!['R33_ONE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE',
   'R33_PC_CODE_INSTALLED_LOCAL_CACHE_REPLAY_ATTEMPTED'].includes(result.decision))process.exitCode=1;
 }catch{console.error('R33_INSTALLER_EXECUTION_FAILED');process.exitCode=2;}
}
