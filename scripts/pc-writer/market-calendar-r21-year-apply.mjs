// R21: install exactly one Census-year-aware collector after the user's R20 Core.
// Never collect, publish, alter tasks/DB, push or override an occupied Core lock.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {coreRootFromTask,worktreeIdentity} from './market-calendar-r19-bea-apply.mjs';

const R20_SOURCE='97a38c7cdfbb7e0d30eaeacea27b9605bbfa2b3b';
const R20_PARSER_SHA256='20d6c99cc7621e08c06598e51f4c9dc8a6f945952905351287b46d2c65a1551c';
// PC HEAD stores CRLF, while the GitHub branch reference is the same code in LF.
const R20_COLLECTOR_SHA256='1b8c2760a4f815191282dd55969ce8170072d4f747c8468ddd6601dc50ee88d6';
const R20_COLLECTOR_LF_SHA256='4af1164793d95e7b0a97643d91e6d23749974d17c7048bac677f727376fc7afc';
const R21_COLLECTOR_SHA256='2e7ac2a57a7ec2c41b2f9647d98d49c7bb22d904978a0d637e3d3619e01dedf0';
const R21_PC_CRLF_SHA256='8105a2922ff0d05d29b329dc22dcf66d0d5920ea0d1661337066cef877f45bc5';
const CORE_WORKTREE_ID='d0a4b3cb8b95';
const protectedPaths=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const hex=s=>typeof s==='string'&&/^[a-f0-9]{40}$/i.test(s)?s.toLowerCase():null;
const digest=b=>createHash('sha256').update(b).digest('hex');
const lf=b=>Buffer.from(b.toString('utf8').replace(/\r\n/g,'\n'));
const crlf=b=>Buffer.from(b.toString('utf8').replace(/\r?\n/g,'\r\n'));
const json=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const normalized=p=>path.normalize(p).replaceAll('\\','/').toLowerCase();
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:25000,stdio:['ignore','pipe','pipe']}).trim();
const taskXml=()=>{
 const raw=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (raw[0]===255&&raw[1]===254||raw.includes(0)?raw.toString('utf16le'):raw.toString('utf8')).replace(/^\ufeff/,'');
};

export function runR21({
 apply=false,
 dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 candidatePath=fileURLToPath(new URL('../../staging/market-calendar/r21-census-year/scripts/pc-writer/release-calendar.mjs',import.meta.url)),
 getTaskXml=taskXml,getCoreRoot=coreRootFromTask,gitCall=git,
 approvedSource=R20_SOURCE,expectedWorktreeId=CORE_WORKTREE_ID,
 expectedParserSha256=R20_PARSER_SHA256,expectedBaselineSha256=R20_COLLECTOR_SHA256,
 expectedCandidateSha256=R21_COLLECTOR_SHA256,expectedInstalledSha256=R21_PC_CRLF_SHA256,
}={}){
 const result={audit:'MARKET_CALENDAR_R21_CENSUS_YEAR_APPLY',at:new Date().toISOString(),
  mode:apply?'EXPLICIT_APPLY':'PREFLIGHT',
  policy:'CENSUS_YEAR_COLLECTOR_ONLY_NO_COLLECT_NO_PUBLISH_NO_SCHEDULER_NO_DB_NO_GIT_PUSH',
  previousSource:approvedSource,expectedCandidateSha256,expectedInstalledSha256,lineEnding:'CRLF',
  changedFiles:[],backupCreated:false,
  gitPushed:false,publisherExecuted:false,forcedCollection:false,newSource:null,
  decision:'R21_PREFLIGHT_INCOMPLETE_STOP'};
 let root,configFile,configRaw,config,collector,parser,installedCandidate;
 try{
  const candidate=fs.readFileSync(candidatePath);
  result.candidateSha256=digest(candidate);
  if(result.candidateSha256!==expectedCandidateSha256){result.decision='R21_CANDIDATE_HASH_MISMATCH_STOP';return result;}
  installedCandidate=crlf(candidate);
  result.installedCandidateSha256=digest(installedCandidate);
  if(result.installedCandidateSha256!==expectedInstalledSha256){result.decision='R21_CRLF_TARGET_HASH_MISMATCH_STOP';return result;}
  root=getCoreRoot(getTaskXml());
  result.worktreeId=root?worktreeIdentity(root):null;
  if(!root||result.worktreeId!==expectedWorktreeId){result.decision='EXACT_CORE_ORIGIN_CHANGED_STOP';return result;}
  if(hex(gitCall(root,['rev-parse','HEAD']))!==approvedSource){result.decision='PC_SOURCE_CHANGED_STOP';return result;}
  configFile=path.join(dataRoot,'config.json');configRaw=fs.readFileSync(configFile);config=json(configFile);
  if(config?.source!==approvedSource||config?.enabled!==true||config?.collectionTarget!=='pc'){
   result.decision='PC_CONFIG_SOURCE_CHANGED_STOP';return result;
  }
  parser=path.join(root,'lib','release-calendar.mjs');
  result.installedParserSha256=digest(fs.readFileSync(parser));
  if(result.installedParserSha256!==expectedParserSha256||
   hex(gitCall(root,['rev-parse','HEAD:lib/release-calendar.mjs']))!==hex(gitCall(root,['hash-object','lib/release-calendar.mjs']))){
   result.decision='R20_INSTALLED_PARSER_CHANGED_STOP';return result;
  }
  collector=path.join(root,'scripts','pc-writer','release-calendar.mjs');
  const baseline=fs.readFileSync(collector);
  result.baselineSha256=digest(baseline);
  result.baselineNormalizedLfSha256=digest(lf(baseline));
  if(result.baselineSha256!==expectedBaselineSha256||
   result.baselineNormalizedLfSha256!==R20_COLLECTOR_LF_SHA256||
   hex(gitCall(root,['rev-parse','HEAD:scripts/pc-writer/release-calendar.mjs']))!==hex(gitCall(root,['hash-object','scripts/pc-writer/release-calendar.mjs']))){
   result.decision='R20_COLLECTOR_CHANGED_STOP';return result;
  }
  if(gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''){
   result.decision='PROTECTED_SOURCE_ALREADY_DIRTY_STOP';return result;
  }
  gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);
  result.changedFiles=['scripts/pc-writer/release-calendar.mjs'];
  if(!apply){result.decision='R21_SINGLE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE';return result;}
 }catch{result.decision='R21_PREFLIGHT_READ_FAILED_STOP';return result;}

 const lockFile=path.join(dataRoot,'local-cycle.lock');
 let ownLock=false,backup=null,backupVerified=false,modified=false,committed=false;
 try{
  result.phase='CORE_LOCK_ACQUIRE';
  const fd=fs.openSync(lockFile,'wx');ownLock=true;
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:Date.now(),purpose:'market-calendar-r21-census-year-transition'}));}
  finally{fs.closeSync(fd);}
  result.phase='LOCKED_SOURCE_RECHECK';
  const currentRoot=getCoreRoot(getTaskXml());
  if(!currentRoot||normalized(currentRoot)!==normalized(root)||worktreeIdentity(currentRoot)!==expectedWorktreeId||
   hex(gitCall(root,['rev-parse','HEAD']))!==approvedSource||
   gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''||
   digest(fs.readFileSync(collector))!==expectedBaselineSha256||
   digest(fs.readFileSync(parser))!==expectedParserSha256||
   !fs.readFileSync(configFile).equals(configRaw)||json(configFile)?.source!==approvedSource){
   result.decision='STATE_CHANGED_AFTER_CORE_LOCK_STOP';return result;
  }
  result.phase='BACKUP';
  const backupDir=path.join(dataRoot,'market-calendar-r21-backups',
   'r21-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  fs.mkdirSync(backupDir,{recursive:true});
  backup=path.join(backupDir,'release-calendar.mjs');
  fs.copyFileSync(collector,backup);
  if(digest(fs.readFileSync(backup))!==expectedBaselineSha256)throw Error('R21_BACKUP_HASH_MISMATCH');
  backupVerified=true;fs.copyFileSync(configFile,path.join(backupDir,'config.json'));
  result.backupCreated=true;result.backupId=path.basename(backupDir);
  result.phase='COPY_COLLECTOR';modified=true;
  fs.writeFileSync(collector,installedCandidate);
  if(digest(fs.readFileSync(collector))!==expectedInstalledSha256)throw Error('R21_CANDIDATE_COPY_HASH_MISMATCH');
  if(gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths]).replaceAll('\\','/').trim()!==
   'scripts/pc-writer/release-calendar.mjs')throw Error('R21_NOT_EXACTLY_ONE_PROTECTED_FILE');
  result.phase='GIT_SINGLE_FILE_COMMIT';
  gitCall(root,['commit','--only','-m','fix(market-calendar): use official Census year fallback','--','scripts/pc-writer/release-calendar.mjs']);
  committed=true;
  const next=hex(gitCall(root,['rev-parse','HEAD']));result.newSource=next;
  if(hex(gitCall(root,['rev-parse','HEAD^']))!==approvedSource||
   gitCall(root,['diff','--name-only',approvedSource,next,'--']).replaceAll('\\','/').trim()!==
    'scripts/pc-writer/release-calendar.mjs'||
   digest(fs.readFileSync(collector))!==expectedInstalledSha256||digest(fs.readFileSync(parser))!==expectedParserSha256){
   throw Error('R21_COMMIT_PARENT_OR_CONTENT_MISMATCH');
  }
  result.phase='CONFIG_SOURCE_UPDATE';
  if(!fs.readFileSync(configFile).equals(configRaw))throw Error('PC_CONFIG_CHANGED_DURING_INSTALL');
  const temp=path.join(backupDir,'config-new.json');
  fs.writeFileSync(temp,JSON.stringify({...config,source:next},null,2)+'\n',{flag:'wx'});
  fs.renameSync(temp,configFile);
  if(json(configFile)?.source!==next)throw Error('PC_CONFIG_SOURCE_READBACK_FAILED');
  result.phase='INSTALLED';
  result.decision='R21_CENSUS_YEAR_INSTALLED_NO_FORCED_COLLECTION';
 }catch(error){
  result.decision=committed?'R21_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP':'R21_INSTALL_ABORTED_OR_RESTORED_STOP';
  const errors={EEXIST:'CORE_LOCK_ALREADY_EXISTS',EACCES:'FILESYSTEM_ACCESS_DENIED',
   EPERM:'FILESYSTEM_PERMISSION_DENIED',ENOSPC:'DISK_FULL',ENOENT:'REQUIRED_FILE_DISAPPEARED',
   EBUSY:'FILE_IN_USE',EROFS:'READ_ONLY_FILESYSTEM'};
  result.errorCode=errors[error?.code]??
   (typeof error?.message==='string'&&/^[A-Z_]{5,70}$/.test(error.message)?error.message:'LOCAL_OPERATION_FAILED');
  if(!committed&&modified&&backupVerified){
   try{fs.copyFileSync(backup,collector);}catch{result.decision='R21_RESTORE_FAILED_MANUAL_RECOVERY_STOP';}
  }
 }finally{if(ownLock){try{fs.unlinkSync(lockFile);}catch{result.lockReleaseFailed=true;}}}
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=process.argv[2],apply=process.argv.includes('--apply');
 if(!report){console.error('MISSING_REPORT_PATH');process.exitCode=2;}
 else try{
  fs.writeFileSync(report,JSON.stringify(runR21({apply}),null,2)+'\n','utf8');
  console.log('MARKET_CALENDAR_R21_RESULT_WRITTEN');
 }catch{console.error('MARKET_CALENDAR_R21_EXECUTION_ERROR');process.exitCode=2;}
}
