// R22: two-file, source-locked, explicitly invoked PC Core transition.
// No collection, publication, scheduler/DB mutation, lock override, or push.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {coreRootFromTask,worktreeIdentity} from './market-calendar-r19-bea-apply.mjs';

const R21_SOURCE='b5e860d09ac87087e158193613425b146fa9a1e5';
const R21_PARSER_SHA='20d6c99cc7621e08c06598e51f4c9dc8a6f945952905351287b46d2c65a1551c';
const R21_COLLECTOR_SHA='8105a2922ff0d05d29b329dc22dcf66d0d5920ea0d1661337066cef877f45bc5';
const R22_PARSER_SHA='ede3d4e1a95eb0f9bde1a1ad3f42812cf090a9821a2e7af517638fb928d6704b';
const R22_COLLECTOR_SHA='42f079648288c19f7a810cd365c0e0a5139cac4e6fa662dcdcfc21e164837aa6';
const R22_COLLECTOR_CRLF_SHA='57a5e1df39c395c32441afb43672eb059eff22f201585837e61a66a88ea34e22';
const CORE_WORKTREE_ID='d0a4b3cb8b95';
const protectedPaths=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const changedPaths=['lib/release-calendar.mjs','scripts/pc-writer/release-calendar.mjs'];
const hex=s=>typeof s==='string'&&/^[a-f0-9]{40}$/i.test(s)?s.toLowerCase():null;
const digest=b=>createHash('sha256').update(b).digest('hex');
const crlf=b=>Buffer.from(b.toString('utf8').replace(/\r?\n/g,'\r\n'));
const json=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const normalized=p=>path.normalize(p).replaceAll('\\','/').toLowerCase();
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:25000,stdio:['ignore','pipe','pipe']}).trim();
const taskXml=()=>{
 const raw=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (raw[0]===255&&raw[1]===254||raw.includes(0)?raw.toString('utf16le'):raw.toString('utf8')).replace(/^\ufeff/,'');
};

export function runR22({
 apply=false,
 dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 parserCandidatePath=fileURLToPath(new URL('../../staging/market-calendar/r22-fed-calendar/lib/release-calendar.mjs',import.meta.url)),
 collectorCandidatePath=fileURLToPath(new URL('../../staging/market-calendar/r22-fed-calendar/scripts/pc-writer/release-calendar.mjs',import.meta.url)),
 getTaskXml=taskXml,getCoreRoot=coreRootFromTask,gitCall=git,
 approvedSource=R21_SOURCE,expectedWorktreeId=CORE_WORKTREE_ID,
 expectedParserSha256=R21_PARSER_SHA,expectedCollectorSha256=R21_COLLECTOR_SHA,
 expectedParserCandidateSha256=R22_PARSER_SHA,expectedCollectorCandidateSha256=R22_COLLECTOR_SHA,
 expectedCollectorInstalledSha256=R22_COLLECTOR_CRLF_SHA,
}={}){
 const result={audit:'MARKET_CALENDAR_R22_FED_APPLY',at:new Date().toISOString(),
  mode:apply?'EXPLICIT_APPLY':'PREFLIGHT',
  policy:'R22_FED_TWO_FILES_ONLY_NO_COLLECT_NO_PUBLISH_NO_SCHEDULER_NO_DB_NO_GIT_PUSH',
  previousSource:approvedSource,changedFiles:[],backupCreated:false,gitPushed:false,
  publisherExecuted:false,forcedCollection:false,newSource:null,
  parserLineEnding:'LF',collectorLineEnding:'CRLF',decision:'R22_PREFLIGHT_INCOMPLETE_STOP'};
 let root,configFile,configRaw,config,parser,collector,parserBytes,collectorBytes;
 try{
  parserBytes=fs.readFileSync(parserCandidatePath);
  collectorBytes=crlf(fs.readFileSync(collectorCandidatePath));
  result.parserCandidateSha256=digest(parserBytes);
  result.collectorCandidateSha256=digest(fs.readFileSync(collectorCandidatePath));
  result.collectorInstalledSha256=digest(collectorBytes);
  if(result.parserCandidateSha256!==expectedParserCandidateSha256||
   result.collectorCandidateSha256!==expectedCollectorCandidateSha256||
   result.collectorInstalledSha256!==expectedCollectorInstalledSha256){
   result.decision='R22_CANDIDATE_HASH_MISMATCH_STOP';return result;
  }
  root=getCoreRoot(getTaskXml());result.worktreeId=root?worktreeIdentity(root):null;
  if(!root||result.worktreeId!==expectedWorktreeId){result.decision='EXACT_CORE_ORIGIN_CHANGED_STOP';return result;}
  if(hex(gitCall(root,['rev-parse','HEAD']))!==approvedSource){result.decision='PC_SOURCE_CHANGED_STOP';return result;}
  configFile=path.join(dataRoot,'config.json');configRaw=fs.readFileSync(configFile);config=json(configFile);
  if(config?.source!==approvedSource||config?.enabled!==true||config?.collectionTarget!=='pc'){
   result.decision='PC_CONFIG_SOURCE_CHANGED_STOP';return result;
  }
  parser=path.join(root,'lib','release-calendar.mjs');
  collector=path.join(root,'scripts','pc-writer','release-calendar.mjs');
  result.installedParserSha256=digest(fs.readFileSync(parser));
  result.installedCollectorSha256=digest(fs.readFileSync(collector));
  if(result.installedParserSha256!==expectedParserSha256||
   result.installedCollectorSha256!==expectedCollectorSha256||
   hex(gitCall(root,['rev-parse','HEAD:lib/release-calendar.mjs']))!==hex(gitCall(root,['hash-object','lib/release-calendar.mjs']))||
   hex(gitCall(root,['rev-parse','HEAD:scripts/pc-writer/release-calendar.mjs']))!==hex(gitCall(root,['hash-object','scripts/pc-writer/release-calendar.mjs']))){
   result.decision='R21_BASELINE_FILE_CHANGED_STOP';return result;
  }
  if(gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''){
   result.decision='PROTECTED_SOURCE_ALREADY_DIRTY_STOP';return result;
  }
  gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);
  result.changedFiles=[...changedPaths];
  if(!apply){result.decision='R22_TWO_FILE_PREFLIGHT_READY_NO_CHANGES_MADE';return result;}
 }catch{result.decision='R22_PREFLIGHT_READ_FAILED_STOP';return result;}

 const lockFile=path.join(dataRoot,'local-cycle.lock');
 let ownLock=false,backupDir=null,backupVerified=false,modified=false,committed=false;
 try{
  result.phase='CORE_LOCK_ACQUIRE';
  const fd=fs.openSync(lockFile,'wx');ownLock=true;
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:Date.now(),purpose:'market-calendar-r22-fed-transition'}));}
  finally{fs.closeSync(fd);}
  result.phase='LOCKED_SOURCE_RECHECK';
  const currentRoot=getCoreRoot(getTaskXml());
  if(!currentRoot||normalized(currentRoot)!==normalized(root)||worktreeIdentity(currentRoot)!==expectedWorktreeId||
   hex(gitCall(root,['rev-parse','HEAD']))!==approvedSource||
   gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''||
   digest(fs.readFileSync(parser))!==expectedParserSha256||
   digest(fs.readFileSync(collector))!==expectedCollectorSha256||
   !fs.readFileSync(configFile).equals(configRaw)||json(configFile)?.source!==approvedSource){
   result.decision='STATE_CHANGED_AFTER_CORE_LOCK_STOP';return result;
  }
  result.phase='BACKUP';
  backupDir=path.join(dataRoot,'market-calendar-r22-backups',
   'r22-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  fs.mkdirSync(backupDir,{recursive:true});
  fs.copyFileSync(parser,path.join(backupDir,'release-calendar-parser.mjs'));
  fs.copyFileSync(collector,path.join(backupDir,'release-calendar-collector.mjs'));
  fs.copyFileSync(configFile,path.join(backupDir,'config.json'));
  if(digest(fs.readFileSync(path.join(backupDir,'release-calendar-parser.mjs')))!==expectedParserSha256||
   digest(fs.readFileSync(path.join(backupDir,'release-calendar-collector.mjs')))!==expectedCollectorSha256)throw Error('R22_BACKUP_HASH_MISMATCH');
  backupVerified=true;result.backupCreated=true;result.backupId=path.basename(backupDir);
  result.phase='COPY_PARSER_AND_COLLECTOR';modified=true;
  fs.writeFileSync(parser,parserBytes);fs.writeFileSync(collector,collectorBytes);
  if(digest(fs.readFileSync(parser))!==expectedParserCandidateSha256||
   digest(fs.readFileSync(collector))!==expectedCollectorInstalledSha256)throw Error('R22_COPY_HASH_MISMATCH');
  if(gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths]).replaceAll('\\','/').trim()!==changedPaths.join('\n'))
   throw Error('R22_NOT_EXACTLY_TWO_PROTECTED_FILES');
  result.phase='GIT_TWO_FILE_COMMIT';
  gitCall(root,['commit','--only','-m','feat(market-calendar): include official Fed monthly release calendar','--',...changedPaths]);
  committed=true;
  const next=hex(gitCall(root,['rev-parse','HEAD']));result.newSource=next;
  if(hex(gitCall(root,['rev-parse','HEAD^']))!==approvedSource||
   gitCall(root,['diff','--name-only',approvedSource,next,'--']).replaceAll('\\','/').trim()!==changedPaths.join('\n')||
   digest(fs.readFileSync(parser))!==expectedParserCandidateSha256||
   digest(fs.readFileSync(collector))!==expectedCollectorInstalledSha256)
   throw Error('R22_COMMIT_PARENT_OR_CONTENT_MISMATCH');
  result.phase='CONFIG_SOURCE_UPDATE';
  if(!fs.readFileSync(configFile).equals(configRaw))throw Error('PC_CONFIG_CHANGED_DURING_INSTALL');
  const temporary=path.join(backupDir,'config-new.json');
  fs.writeFileSync(temporary,JSON.stringify({...config,source:next},null,2)+'\n',{flag:'wx'});
  fs.renameSync(temporary,configFile);
  if(json(configFile)?.source!==next)throw Error('PC_CONFIG_SOURCE_READBACK_FAILED');
  result.phase='INSTALLED';result.decision='R22_FED_CALENDAR_INSTALLED_NO_FORCED_COLLECTION';
 }catch(error){
  result.decision=committed?'R22_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP':'R22_INSTALL_ABORTED_OR_RESTORED_STOP';
  const errors={EEXIST:'CORE_LOCK_ALREADY_EXISTS',EACCES:'FILESYSTEM_ACCESS_DENIED',
   EPERM:'FILESYSTEM_PERMISSION_DENIED',ENOSPC:'DISK_FULL',ENOENT:'REQUIRED_FILE_DISAPPEARED',
   EBUSY:'FILE_IN_USE',EROFS:'READ_ONLY_FILESYSTEM'};
  result.errorCode=errors[error?.code]??
   (typeof error?.message==='string'&&/^[A-Z_]{5,80}$/.test(error.message)?error.message:'LOCAL_OPERATION_FAILED');
  if(!committed&&modified&&backupVerified){
   try{
    fs.copyFileSync(path.join(backupDir,'release-calendar-parser.mjs'),parser);
    fs.copyFileSync(path.join(backupDir,'release-calendar-collector.mjs'),collector);
   }catch{result.decision='R22_RESTORE_FAILED_MANUAL_RECOVERY_STOP';}
  }
 }finally{if(ownLock){try{fs.unlinkSync(lockFile);}catch{result.lockReleaseFailed=true;}}}
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=process.argv[2],apply=process.argv.includes('--apply');
 if(!report){console.error('MISSING_REPORT_PATH');process.exitCode=2;}
 else try{
  fs.writeFileSync(report,JSON.stringify(runR22({apply}),null,2)+'\n','utf8');
  console.log('MARKET_CALENDAR_R22_RESULT_WRITTEN');
 }catch{console.error('MARKET_CALENDAR_R22_EXECUTION_ERROR');process.exitCode=2;}
}
