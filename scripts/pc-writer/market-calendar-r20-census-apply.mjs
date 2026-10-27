// R20: Census-only parser installation into the previously approved R19 PC Core.
// Strictly one local source file; no collection, publication, scheduler edit or push.
import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {coreRootFromTask,worktreeIdentity} from './market-calendar-r19-bea-apply.mjs';

const R19_SOURCE='e4b0624683f29c551df381777dea871d7e3dd266';
const R19_PARSER_SHA256='9204ab733b45ad3f01a1b8a0754ce8a3f3e3d5feb4245cd01a081a5da838511f';
const R20_PARSER_SHA256='20d6c99cc7621e08c06598e51f4c9dc8a6f945952905351287b46d2c65a1551c';
const CORE_WORKTREE_ID='d0a4b3cb8b95';
const protectedPaths=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const hex=v=>typeof v==='string'&&/^[a-f0-9]{40}$/i.test(v)?v.toLowerCase():null;
const digest=v=>createHash('sha256').update(v).digest('hex');
const json=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};
const normalized=p=>path.normalize(p).replaceAll('\\','/').toLowerCase();
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:25000,stdio:['ignore','pipe','pipe']}).trim();
const taskXml=()=>{
 const raw=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (raw[0]===255&&raw[1]===254||raw.includes(0)?raw.toString('utf16le'):raw.toString('utf8')).replace(/^\ufeff/,'');
};

export function runR20({
 apply=false,
 dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 candidatePath=fileURLToPath(new URL('../../staging/market-calendar/r20-census/lib/release-calendar.mjs',import.meta.url)),
 getTaskXml=taskXml,getCoreRoot=coreRootFromTask,gitCall=git,
 approvedSource=R19_SOURCE,expectedWorktreeId=CORE_WORKTREE_ID,
 expectedBaselineSha256=R19_PARSER_SHA256,expectedCandidateSha256=R20_PARSER_SHA256,
}={}){
 const output={audit:'MARKET_CALENDAR_R20_CENSUS_APPLY',at:new Date().toISOString(),
  mode:apply?'EXPLICIT_APPLY':'PREFLIGHT',
  policy:'CENSUS_ONLY_NO_COLLECT_NO_PUBLISH_NO_TASK_CHANGE_NO_DB_CHANGE_NO_GIT_PUSH',
  previousSource:approvedSource,expectedCandidateSha256,changedFiles:[],backupCreated:false,
  gitPushed:false,publisherExecuted:false,liveMonitored:false,newSource:null,
  decision:'CENSUS_PREFLIGHT_INCOMPLETE_STOP'};
 let root,configFile,configRaw,config,parser;
 try{
  const candidate=fs.readFileSync(candidatePath);
  output.candidateSha256=digest(candidate);
  if(output.candidateSha256!==expectedCandidateSha256){output.decision='CENSUS_CANDIDATE_HASH_MISMATCH_STOP';return output;}
  root=getCoreRoot(getTaskXml());
  output.worktreeId=root?worktreeIdentity(root):null;
  if(!root||output.worktreeId!==expectedWorktreeId){output.decision='EXACT_CORE_ORIGIN_CHANGED_STOP';return output;}
  if(hex(gitCall(root,['rev-parse','HEAD']))!==approvedSource){output.decision='PC_SOURCE_CHANGED_STOP';return output;}
  configFile=path.join(dataRoot,'config.json');
  configRaw=fs.readFileSync(configFile);
  config=json(configFile);
  if(config?.source!==approvedSource||config?.enabled!==true||config?.collectionTarget!=='pc'){
   output.decision='PC_CONFIG_SOURCE_CHANGED_STOP';return output;
  }
  parser=path.join(root,'lib','release-calendar.mjs');
  output.baselineSha256=digest(fs.readFileSync(parser));
  if(output.baselineSha256!==expectedBaselineSha256||
    hex(gitCall(root,['rev-parse','HEAD:lib/release-calendar.mjs']))!==hex(gitCall(root,['hash-object','lib/release-calendar.mjs']))){
   output.decision='INSTALLED_BEA_PARSER_CHANGED_STOP';return output;
  }
  if(gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''){
   output.decision='PROTECTED_SOURCE_ALREADY_DIRTY_STOP';return output;
  }
  gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);
  output.changedFiles=['lib/release-calendar.mjs'];
  if(!apply){output.decision='CENSUS_SINGLE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE';return output;}
 }catch{output.decision='CENSUS_PREFLIGHT_READ_FAILED_STOP';return output;}

 const lockFile=path.join(dataRoot,'local-cycle.lock');
 let ownLock=false,backupParser=null,backupVerified=false,parserModified=false,committed=false;
 try{
  output.phase='CORE_LOCK_ACQUIRE';
  const fd=fs.openSync(lockFile,'wx');ownLock=true;
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:Date.now(),purpose:'market-calendar-r20-census-source-transition'}));}finally{fs.closeSync(fd);}
  output.phase='LOCKED_SOURCE_RECHECK';
  const currentRoot=getCoreRoot(getTaskXml());
  if(!currentRoot||normalized(currentRoot)!==normalized(root)||worktreeIdentity(currentRoot)!==expectedWorktreeId||
    hex(gitCall(root,['rev-parse','HEAD']))!==approvedSource||
    gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''||
    digest(fs.readFileSync(parser))!==expectedBaselineSha256||
    !fs.readFileSync(configFile).equals(configRaw)||json(configFile)?.source!==approvedSource){
   output.decision='STATE_CHANGED_AFTER_CORE_LOCK_STOP';return output;
  }
  output.phase='BACKUP_DIRECTORY_CREATE';
  const backupDir=path.join(dataRoot,'market-calendar-r20-backups','r20-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  fs.mkdirSync(backupDir,{recursive:true});
  backupParser=path.join(backupDir,'release-calendar.mjs');
  output.phase='BACKUP_PARSER';
  fs.copyFileSync(parser,backupParser);
  if(digest(fs.readFileSync(backupParser))!==expectedBaselineSha256)throw Error('BASELINE_BACKUP_HASH_MISMATCH');
  backupVerified=true;
  output.phase='BACKUP_CONFIG';
  fs.copyFileSync(configFile,path.join(backupDir,'config.json'));
  output.backupCreated=true;output.backupId=path.basename(backupDir);
  output.phase='COPY_CENSUS_PARSER';
  parserModified=true;
  fs.copyFileSync(candidatePath,parser);
  if(digest(fs.readFileSync(parser))!==expectedCandidateSha256)throw Error('CENSUS_CANDIDATE_COPY_HASH_MISMATCH');
  if(gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths]).replaceAll('\\','/').trim()!=='lib/release-calendar.mjs'){
   throw Error('CENSUS_NOT_EXACTLY_ONE_CHANGED_PROTECTED_FILE');
  }
  output.phase='GIT_SINGLE_FILE_COMMIT';
  gitCall(root,['commit','--only','-m','feat(market-calendar): expand Census official releases only','--','lib/release-calendar.mjs']);
  committed=true;
  const next=hex(gitCall(root,['rev-parse','HEAD']));
  output.newSource=next;
  if(hex(gitCall(root,['rev-parse','HEAD^']))!==approvedSource||
    gitCall(root,['diff','--name-only',approvedSource,next,'--']).replaceAll('\\','/').trim()!=='lib/release-calendar.mjs'||
    digest(fs.readFileSync(parser))!==expectedCandidateSha256){
   throw Error('CENSUS_COMMIT_PARENT_OR_CONTENT_MISMATCH');
  }
  output.phase='CONFIG_SOURCE_UPDATE';
  if(!fs.readFileSync(configFile).equals(configRaw))throw Error('PC_CONFIG_CHANGED_DURING_INSTALL');
  const nextConfig={...config,source:next};
  const temp=path.join(backupDir,'config-new.json');
  fs.writeFileSync(temp,JSON.stringify(nextConfig,null,2)+'\n',{flag:'wx'});
  fs.renameSync(temp,configFile);
  if(json(configFile)?.source!==next)throw Error('PC_CONFIG_SOURCE_READBACK_FAILED');
  output.phase='INSTALLED';
  output.decision='CENSUS_INSTALLED_IN_EXISTING_PC_SOURCE_NO_FORCED_COLLECTION';
 }catch(error){
  output.decision=committed?'PARTIAL_CENSUS_COMMIT_MANUAL_RECOVERY_REQUIRED_STOP':'CENSUS_INSTALL_ABORTED_OR_RESTORED_STOP';
  const fsError={EEXIST:'CORE_LOCK_ALREADY_EXISTS',EACCES:'FILESYSTEM_ACCESS_DENIED',EPERM:'FILESYSTEM_PERMISSION_DENIED',ENOSPC:'DISK_FULL',ENOENT:'REQUIRED_FILE_DISAPPEARED',EBUSY:'FILE_IN_USE',EROFS:'READ_ONLY_FILESYSTEM'};
  output.errorCode=fsError[error?.code]??(typeof error?.message==='string'&&/^[A-Z_]{5,70}$/.test(error.message)?error.message:'LOCAL_OPERATION_FAILED');
  if(!committed&&parserModified&&backupVerified){
   try{fs.copyFileSync(backupParser,parser);}catch{output.decision='CENSUS_PARSER_RESTORE_FAILED_MANUAL_RECOVERY_STOP';}
  }
 }finally{
  if(ownLock){try{fs.unlinkSync(lockFile);}catch{output.lockReleaseFailed=true;}}
 }
 return output;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=process.argv[2],apply=process.argv.includes('--apply');
 if(!report){console.error('MISSING_REPORT_PATH');process.exitCode=2;}
 else try{
  fs.writeFileSync(report,JSON.stringify(runR20({apply}),null,2)+'\n','utf8');
  console.log('MARKET_CALENDAR_R20_RESULT_WRITTEN');
 }catch{console.error('MARKET_CALENDAR_R20_EXECUTION_ERROR');process.exitCode=2;}
}
