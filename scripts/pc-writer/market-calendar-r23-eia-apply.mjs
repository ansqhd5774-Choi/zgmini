// Explicit R23 PC-only source-locked transition from approved R22.
// Exactly three Core files, no forced collect/publish/task/database/GitHub write.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {coreRootFromTask,worktreeIdentity} from './market-calendar-r19-bea-apply.mjs';

const R22_SOURCE='a50ac307d8d0849ca2800b3c4df4cd6daaba3b1e';
const R22_PARSER_SHA='ede3d4e1a95eb0f9bde1a1ad3f42812cf090a9821a2e7af517638fb928d6704b';
const R22_COLLECTOR_SHA='2ecac6ac7c16c6a06ca81b67feb32f4342f1b2b89163b5531f0f6bb90d622388';
const R23_PARSER_SHA='cf94658ade12f83326c5f9403e4303150f7f0b3d771ab25bf7d65bf8d9313de5';
const R23_EIA_SHA='6099a1fb912077b2627369b8428a600f613004b2facdb16b262a8ea5b3f65e90';
const R23_COLLECTOR_SHA='d90cc301fdc722edcd22efbe43d0c5e4771584f13de67916b91d73d22e90a785';
const R23_COLLECTOR_CRLF_SHA='b684ab2495b5f25fa604276694111be48df6861d8aaf5b86f75ee3593973a007';
const CORE_WORKTREE_ID='d0a4b3cb8b95';
const protectedPaths=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const changedPaths=['lib/eia-calendar.mjs','lib/release-calendar.mjs','scripts/pc-writer/release-calendar.mjs'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const hex=s=>typeof s==='string'&&/^[0-9a-f]{40}$/i.test(s)?s.toLowerCase():null;
const crlf=b=>Buffer.from(b.toString('utf8').replace(/\r?\n/g,'\r\n'));
const json=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const normalized=p=>path.normalize(p).replaceAll('\\','/').toLowerCase();
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:25000,
 stdio:['ignore','pipe','pipe']}).trim();
const taskXml=()=>{
 const raw=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (raw[0]===255&&raw[1]===254||raw.includes(0)?raw.toString('utf16le'):raw.toString('utf8')).replace(/^\ufeff/,'');
};

export function runR23({
 apply=false,dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 parserCandidatePath=fileURLToPath(new URL('../../staging/market-calendar/r23-eia/lib/release-calendar.mjs',import.meta.url)),
 eiaCandidatePath=fileURLToPath(new URL('../../staging/market-calendar/r23-eia/lib/eia-calendar.mjs',import.meta.url)),
 collectorCandidatePath=fileURLToPath(new URL('../../staging/market-calendar/r23-eia/scripts/pc-writer/release-calendar.mjs',import.meta.url)),
 getTaskXml=taskXml,getCoreRoot=coreRootFromTask,gitCall=git,
 approvedSource=R22_SOURCE,expectedWorktreeId=CORE_WORKTREE_ID,
 expectedParserSha256=R22_PARSER_SHA,expectedCollectorSha256=R22_COLLECTOR_SHA,
 expectedParserCandidateSha256=R23_PARSER_SHA,expectedEiaCandidateSha256=R23_EIA_SHA,
 expectedCollectorCandidateSha256=R23_COLLECTOR_SHA,expectedCollectorInstalledSha256=R23_COLLECTOR_CRLF_SHA,
}={}){
 const result={audit:'MARKET_CALENDAR_R23_EIA_APPLY',at:new Date().toISOString(),
  mode:apply?'EXPLICIT_APPLY':'PREFLIGHT',previousSource:approvedSource,
  policy:'R22_LOCKED_THREE_FILES_ONLY_NO_FORCED_COLLECT_NO_PUBLISH_NO_TASK_NO_DB_NO_GIT_PUSH',
  changedFiles:[],backupCreated:false,gitPushed:false,publisherExecuted:false,
  forcedCollection:false,newSource:null,parserLineEnding:'LF',eiaLineEnding:'LF',collectorLineEnding:'CRLF',
  decision:'R23_PREFLIGHT_INCOMPLETE_STOP'};
 let root,configFile,configRaw,config,parser,eia,collector,parserBytes,eiaBytes,collectorBytes;
 try{
  parserBytes=fs.readFileSync(parserCandidatePath);
  eiaBytes=fs.readFileSync(eiaCandidatePath);
  collectorBytes=crlf(fs.readFileSync(collectorCandidatePath));
  result.candidateSha256={parser:sha(parserBytes),eia:sha(eiaBytes),
   collector:sha(fs.readFileSync(collectorCandidatePath)),collectorInstalled:sha(collectorBytes)};
  if(result.candidateSha256.parser!==expectedParserCandidateSha256||
   result.candidateSha256.eia!==expectedEiaCandidateSha256||
   result.candidateSha256.collector!==expectedCollectorCandidateSha256||
   result.candidateSha256.collectorInstalled!==expectedCollectorInstalledSha256){
   result.decision='R23_CANDIDATE_HASH_MISMATCH_STOP';return result;
  }
  root=getCoreRoot(getTaskXml());result.worktreeId=root?worktreeIdentity(root):null;
  if(!root||result.worktreeId!==expectedWorktreeId){result.decision='EXACT_CORE_ORIGIN_CHANGED_STOP';return result;}
  if(hex(gitCall(root,['rev-parse','HEAD']))!==approvedSource){result.decision='PC_SOURCE_CHANGED_STOP';return result;}
  configFile=path.join(dataRoot,'config.json');configRaw=fs.readFileSync(configFile);config=json(configFile);
  if(config?.source!==approvedSource||config?.enabled!==true||config?.collectionTarget!=='pc'){
   result.decision='PC_CONFIG_SOURCE_CHANGED_STOP';return result;
  }
  parser=path.join(root,'lib','release-calendar.mjs');
  eia=path.join(root,'lib','eia-calendar.mjs');
  collector=path.join(root,'scripts','pc-writer','release-calendar.mjs');
  if(fs.existsSync(eia)){result.decision='EIA_MODULE_ALREADY_EXISTS_STOP';return result;}
  result.installedSha256={parser:sha(fs.readFileSync(parser)),collector:sha(fs.readFileSync(collector))};
  if(result.installedSha256.parser!==expectedParserSha256||
   result.installedSha256.collector!==expectedCollectorSha256||
   hex(gitCall(root,['rev-parse','HEAD:lib/release-calendar.mjs']))!==hex(gitCall(root,['hash-object','lib/release-calendar.mjs']))||
   hex(gitCall(root,['rev-parse','HEAD:scripts/pc-writer/release-calendar.mjs']))!==hex(gitCall(root,['hash-object','scripts/pc-writer/release-calendar.mjs']))){
   result.decision='R22_BASELINE_FILE_CHANGED_STOP';return result;
  }
  if(gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''){
   result.decision='PROTECTED_SOURCE_ALREADY_DIRTY_STOP';return result;
  }
  gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);
  result.changedFiles=[...changedPaths];
  if(!apply){result.decision='R23_THREE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE';return result;}
 }catch{result.decision='R23_PREFLIGHT_READ_FAILED_STOP';return result;}

 const lockFile=path.join(dataRoot,'local-cycle.lock');
 let ownLock=false,backupDir=null,backupVerified=false,modified=false,eiaCreated=false,eiaStaged=false,committed=false;
 try{
  result.phase='CORE_LOCK_ACQUIRE';
  const fd=fs.openSync(lockFile,'wx');ownLock=true;
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:Date.now(),purpose:'market-calendar-r23-eia-transition'}));}
  finally{fs.closeSync(fd);}
  result.phase='LOCKED_SOURCE_RECHECK';
  const currentRoot=getCoreRoot(getTaskXml());
  if(!currentRoot||normalized(currentRoot)!==normalized(root)||worktreeIdentity(currentRoot)!==expectedWorktreeId||
   hex(gitCall(root,['rev-parse','HEAD']))!==approvedSource||
   gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''||
   fs.existsSync(eia)||sha(fs.readFileSync(parser))!==expectedParserSha256||
   sha(fs.readFileSync(collector))!==expectedCollectorSha256||
   !fs.readFileSync(configFile).equals(configRaw)||json(configFile)?.source!==approvedSource){
   result.decision='STATE_CHANGED_AFTER_CORE_LOCK_STOP';return result;
  }
  result.phase='BACKUP';
  backupDir=path.join(dataRoot,'market-calendar-r23-backups',
   'r23-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  fs.mkdirSync(backupDir,{recursive:true});
  fs.copyFileSync(parser,path.join(backupDir,'release-calendar-parser.mjs'));
  fs.copyFileSync(collector,path.join(backupDir,'release-calendar-collector.mjs'));
  fs.copyFileSync(configFile,path.join(backupDir,'config.json'));
  if(sha(fs.readFileSync(path.join(backupDir,'release-calendar-parser.mjs')))!==expectedParserSha256||
   sha(fs.readFileSync(path.join(backupDir,'release-calendar-collector.mjs')))!==expectedCollectorSha256)
   throw Error('R23_BACKUP_HASH_MISMATCH');
  backupVerified=true;result.backupCreated=true;result.backupId=path.basename(backupDir);
  result.phase='COPY_EXACT_THREE_FILES';modified=true;
  fs.writeFileSync(parser,parserBytes);fs.writeFileSync(collector,collectorBytes);
  fs.writeFileSync(eia,eiaBytes,{flag:'wx'});eiaCreated=true;
  if(sha(fs.readFileSync(parser))!==expectedParserCandidateSha256||
   sha(fs.readFileSync(collector))!==expectedCollectorInstalledSha256||
   sha(fs.readFileSync(eia))!==expectedEiaCandidateSha256)throw Error('R23_COPY_HASH_MISMATCH');
  if(gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==changedPaths.slice(1).join('\n')||
   gitCall(root,['ls-files','--others','--exclude-standard','--','lib/eia-calendar.mjs'])!=='lib/eia-calendar.mjs')
   throw Error('R23_PROTECTED_DIFF_NOT_EXACT');
  result.phase='GIT_THREE_FILE_COMMIT';
  gitCall(root,['add','--','lib/eia-calendar.mjs']);eiaStaged=true;
  gitCall(root,['commit','--only','-m','feat(market-calendar): connect official EIA release schedules','--',...changedPaths]);
  committed=true;result.newSource=hex(gitCall(root,['rev-parse','HEAD']));
  if(hex(gitCall(root,['rev-parse','HEAD^']))!==approvedSource||
   gitCall(root,['diff','--name-only',approvedSource,result.newSource,'--'])!==changedPaths.join('\n')||
   sha(fs.readFileSync(parser))!==expectedParserCandidateSha256||
   sha(fs.readFileSync(collector))!==expectedCollectorInstalledSha256||
   sha(fs.readFileSync(eia))!==expectedEiaCandidateSha256)throw Error('R23_COMMIT_PARENT_OR_CONTENT_MISMATCH');
  result.phase='CONFIG_SOURCE_UPDATE';
  if(!fs.readFileSync(configFile).equals(configRaw))throw Error('PC_CONFIG_CHANGED_DURING_INSTALL');
  const temp=path.join(backupDir,'config-new.json');
  fs.writeFileSync(temp,JSON.stringify({...config,source:result.newSource},null,2)+'\n',{flag:'wx'});
  fs.renameSync(temp,configFile);
  if(json(configFile)?.source!==result.newSource)throw Error('PC_CONFIG_SOURCE_READBACK_FAILED');
  result.phase='INSTALLED';result.decision='R23_EIA_CALENDAR_INSTALLED_NO_FORCED_COLLECTION';
 }catch(error){
  result.decision=committed?'R23_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP':'R23_INSTALL_ABORTED_OR_RESTORED_STOP';
  const codes={EEXIST:'CORE_LOCK_ALREADY_EXISTS',EACCES:'FILESYSTEM_ACCESS_DENIED',EPERM:'FILESYSTEM_PERMISSION_DENIED',
   ENOSPC:'DISK_FULL',ENOENT:'REQUIRED_FILE_DISAPPEARED',EBUSY:'FILE_IN_USE',EROFS:'READ_ONLY_FILESYSTEM'};
  result.errorCode=codes[error?.code]??
   (typeof error?.message==='string'&&/^[A-Z_]{5,80}$/.test(error.message)?error.message:'LOCAL_OPERATION_FAILED');
  if(!committed&&modified&&backupVerified){
   try{
    if(eiaStaged)gitCall(root,['rm','--cached','-f','--','lib/eia-calendar.mjs']);
    if(eiaCreated&&sha(fs.readFileSync(eia))===expectedEiaCandidateSha256)fs.unlinkSync(eia);
    fs.copyFileSync(path.join(backupDir,'release-calendar-parser.mjs'),parser);
    fs.copyFileSync(path.join(backupDir,'release-calendar-collector.mjs'),collector);
   }catch{result.decision='R23_RESTORE_FAILED_MANUAL_RECOVERY_STOP';}
  }
 }finally{if(ownLock){try{fs.unlinkSync(lockFile);}catch{result.lockReleaseFailed=true;}}}
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const reportPath=process.argv[2],apply=process.argv.includes('--apply');
 if(!reportPath){console.error('MISSING_REPORT_PATH');process.exitCode=2;}
 else try{
  fs.writeFileSync(reportPath,JSON.stringify(runR23({apply}),null,2)+'\n','utf8');
  console.log('MARKET_CALENDAR_R23_RESULT_WRITTEN');
 }catch{console.error('MARKET_CALENDAR_R23_EXECUTION_ERROR');process.exitCode=2;}
}
