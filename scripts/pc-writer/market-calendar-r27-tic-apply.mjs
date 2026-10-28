// R27: source-locked transition from the verified R26 PC HEAD.
// Only three source files; no collection, publishing, DB schema, schedule,
// GitHub push, or main/prod deployment. EIA/USDA/CFTC/Treasury are protected.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {coreRootFromTask,worktreeIdentity} from './market-calendar-r19-bea-apply.mjs';

const R26_SOURCE='c948f2485a55ed24a3b47f42e6c070af8b1f5a62';
const BASE_PARSER_SHA='432354b0e87ab7735330e9b29396a14fd14ee218cd0daa016ab93fb59b6d080f';
const BASE_EIA_SHA='6099a1fb912077b2627369b8428a600f613004b2facdb16b262a8ea5b3f65e90';
const BASE_USDA_SHA='24555a8084b4cb62398b617331498ffa548018bed7e9058f59a6ecff15d3d7ba';
const BASE_CFTC_SHA='61ac33217c742672038e5209c8dccf11935db80d088c354f51785afe61cb4bd5';
const BASE_TREASURY_SHA='0eb744d67fc2d82cbba1bf7b578503dcdfe6a609df557c8666517fc1c91f9c36';
const BASE_COLLECTOR_SHA='a931267b84a6a8a7c2289e4daea5630b257bf30463e58f14b4ad2b5266828f1c';
const NEXT_PARSER_SHA='97800cfbe226be56c3f10e9fa4a37a8967a7e84ad5ba2f098477f7fb3447aefe';
const NEXT_TIC_SHA='86a2a62d35f26627f8623ab9002ff56a9c28ed10b1357e2abd3794a1b3d26dae';
const NEXT_COLLECTOR_SHA='aa091265aa3a80f2199b3d58258eeabdebd241709a37e034dbd113328b844e00';
const NEXT_COLLECTOR_CRLF_SHA='7ccf0183868fc2f19de5b5f07409383def161a78a1353dba6049299631f31708';
const CORE_WORKTREE_ID='d0a4b3cb8b95';
const protectedPaths=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const changedPaths=['lib/release-calendar.mjs','lib/tic-calendar.mjs','scripts/pc-writer/release-calendar.mjs'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hex=value=>typeof value==='string'&&/^[0-9a-f]{40}$/i.test(value)?value.toLowerCase():null;
const crlf=bytes=>Buffer.from(bytes.toString('utf8').replace(/\r?\n/g,'\r\n'));
const json=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};
const normalized=value=>path.normalize(value).replaceAll('\\','/').toLowerCase();
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:25000,
 stdio:['ignore','pipe','pipe']}).trim();
const taskXml=()=>{
 const raw=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (raw[0]===255&&raw[1]===254||raw.includes(0)?raw.toString('utf16le'):raw.toString('utf8')).replace(/^\ufeff/,'');
};

export function runR27({
 apply=false,dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 parserCandidatePath=fileURLToPath(new URL('../../staging/market-calendar/r27-tic/lib/release-calendar.mjs',import.meta.url)),
 ticCandidatePath=fileURLToPath(new URL('../../staging/market-calendar/r27-tic/lib/tic-calendar.mjs',import.meta.url)),
 collectorCandidatePath=fileURLToPath(new URL('../../staging/market-calendar/r27-tic/scripts/pc-writer/release-calendar.mjs',import.meta.url)),
 getTaskXml=taskXml,getCoreRoot=coreRootFromTask,gitCall=git,
 approvedSource=R26_SOURCE,expectedWorktreeId=CORE_WORKTREE_ID,
 expectedParserSha256=BASE_PARSER_SHA,expectedEiaSha256=BASE_EIA_SHA,expectedUsdaSha256=BASE_USDA_SHA,
 expectedCftcSha256=BASE_CFTC_SHA,expectedTreasurySha256=BASE_TREASURY_SHA,
 expectedCollectorSha256=BASE_COLLECTOR_SHA,
 expectedParserCandidateSha256=NEXT_PARSER_SHA,expectedTicCandidateSha256=NEXT_TIC_SHA,
 expectedCollectorCandidateSha256=NEXT_COLLECTOR_SHA,
 expectedCollectorInstalledSha256=NEXT_COLLECTOR_CRLF_SHA,
}={}){
 const result={audit:'MARKET_CALENDAR_R27_TIC_APPLY',at:new Date().toISOString(),
  mode:apply?'EXPLICIT_APPLY':'PREFLIGHT',previousSource:approvedSource,
  policy:'R26_LOCKED_THREE_FILES_NO_COLLECT_NO_PUBLISH_NO_TASK_NO_DB_NO_GIT_PUSH',
  changedFiles:[],backupCreated:false,gitPushed:false,publisherExecuted:false,
  forcedCollection:false,newSource:null,parserLineEnding:'LF',ticLineEnding:'LF',collectorLineEnding:'CRLF',
  decision:'R27_PREFLIGHT_INCOMPLETE_STOP'};
 let root,configFile,configRaw,config,parser,eia,usda,cftc,treasury,tic,collector,parserBytes,ticBytes,collectorBytes;
 try{
  parserBytes=fs.readFileSync(parserCandidatePath);
  ticBytes=fs.readFileSync(ticCandidatePath);
  collectorBytes=crlf(fs.readFileSync(collectorCandidatePath));
  result.candidateSha256={parser:sha(parserBytes),tic:sha(ticBytes),
   collector:sha(fs.readFileSync(collectorCandidatePath)),collectorInstalled:sha(collectorBytes)};
  if(result.candidateSha256.parser!==expectedParserCandidateSha256||
   result.candidateSha256.tic!==expectedTicCandidateSha256||
   result.candidateSha256.collector!==expectedCollectorCandidateSha256||
   result.candidateSha256.collectorInstalled!==expectedCollectorInstalledSha256){
   result.decision='R27_CANDIDATE_HASH_MISMATCH_STOP';return result;
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
  usda=path.join(root,'lib','usda-calendar.mjs');
  cftc=path.join(root,'lib','cftc-calendar.mjs');
  treasury=path.join(root,'lib','treasury-calendar.mjs');
  tic=path.join(root,'lib','tic-calendar.mjs');
  collector=path.join(root,'scripts','pc-writer','release-calendar.mjs');
  if(fs.existsSync(tic)){result.decision='TIC_MODULE_ALREADY_EXISTS_STOP';return result;}
  result.installedSha256={parser:sha(fs.readFileSync(parser)),eia:sha(fs.readFileSync(eia)),usda:sha(fs.readFileSync(usda)),cftc:sha(fs.readFileSync(cftc)),treasury:sha(fs.readFileSync(treasury)),
   collector:sha(fs.readFileSync(collector))};
  if(result.installedSha256.parser!==expectedParserSha256||
   result.installedSha256.eia!==expectedEiaSha256||
   result.installedSha256.usda!==expectedUsdaSha256||
   result.installedSha256.cftc!==expectedCftcSha256||
   result.installedSha256.treasury!==expectedTreasurySha256||
   result.installedSha256.collector!==expectedCollectorSha256||
   hex(gitCall(root,['rev-parse','HEAD:lib/release-calendar.mjs']))!==hex(gitCall(root,['hash-object','lib/release-calendar.mjs']))||
   hex(gitCall(root,['rev-parse','HEAD:lib/eia-calendar.mjs']))!==hex(gitCall(root,['hash-object','lib/eia-calendar.mjs']))||
   hex(gitCall(root,['rev-parse','HEAD:lib/usda-calendar.mjs']))!==hex(gitCall(root,['hash-object','lib/usda-calendar.mjs']))||
   hex(gitCall(root,['rev-parse','HEAD:lib/cftc-calendar.mjs']))!==hex(gitCall(root,['hash-object','lib/cftc-calendar.mjs']))||
   hex(gitCall(root,['rev-parse','HEAD:lib/treasury-calendar.mjs']))!==hex(gitCall(root,['hash-object','lib/treasury-calendar.mjs']))||
   hex(gitCall(root,['rev-parse','HEAD:scripts/pc-writer/release-calendar.mjs']))!==hex(gitCall(root,['hash-object','scripts/pc-writer/release-calendar.mjs']))){
   result.decision='R26_BASELINE_FILE_CHANGED_STOP';return result;
  }
  if(gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''){
   result.decision='PROTECTED_SOURCE_ALREADY_DIRTY_STOP';return result;
  }
  gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);
  result.changedFiles=[...changedPaths];
  if(!apply){result.decision='R27_THREE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE';return result;}
 }catch{result.decision='R27_PREFLIGHT_READ_FAILED_STOP';return result;}

 const lockFile=path.join(dataRoot,'local-cycle.lock');
 let ownLock=false,backupDir=null,backupVerified=false,modified=false,ticCreated=false,ticStaged=false,committed=false;
 try{
  result.phase='CORE_LOCK_ACQUIRE';
  const fd=fs.openSync(lockFile,'wx');ownLock=true;
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:Date.now(),purpose:'market-calendar-r27-tic-transition'}));}
  finally{fs.closeSync(fd);}
  result.phase='LOCKED_SOURCE_RECHECK';
  const currentRoot=getCoreRoot(getTaskXml());
  if(!currentRoot||normalized(currentRoot)!==normalized(root)||worktreeIdentity(currentRoot)!==expectedWorktreeId||
   hex(gitCall(root,['rev-parse','HEAD']))!==approvedSource||
   gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''||
   fs.existsSync(tic)||sha(fs.readFileSync(parser))!==expectedParserSha256||
   sha(fs.readFileSync(eia))!==expectedEiaSha256||sha(fs.readFileSync(usda))!==expectedUsdaSha256||
   sha(fs.readFileSync(cftc))!==expectedCftcSha256||
   sha(fs.readFileSync(treasury))!==expectedTreasurySha256||
   sha(fs.readFileSync(collector))!==expectedCollectorSha256||
   !fs.readFileSync(configFile).equals(configRaw)||json(configFile)?.source!==approvedSource){
   result.decision='STATE_CHANGED_AFTER_CORE_LOCK_STOP';return result;
  }
  result.phase='BACKUP';
  backupDir=path.join(dataRoot,'market-calendar-r27-backups',
   'r27-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  fs.mkdirSync(backupDir,{recursive:true});
  fs.copyFileSync(parser,path.join(backupDir,'release-calendar-parser.mjs'));
  fs.copyFileSync(collector,path.join(backupDir,'release-calendar-collector.mjs'));
  fs.copyFileSync(configFile,path.join(backupDir,'config.json'));
  if(sha(fs.readFileSync(path.join(backupDir,'release-calendar-parser.mjs')))!==expectedParserSha256||
   sha(fs.readFileSync(path.join(backupDir,'release-calendar-collector.mjs')))!==expectedCollectorSha256)
   throw Error('R27_BACKUP_HASH_MISMATCH');
  backupVerified=true;result.backupCreated=true;result.backupId=path.basename(backupDir);
  result.phase='COPY_EXACT_THREE_FILES';modified=true;
  fs.writeFileSync(parser,parserBytes);fs.writeFileSync(collector,collectorBytes);
  fs.writeFileSync(tic,ticBytes,{flag:'wx'});ticCreated=true;
  if(sha(fs.readFileSync(parser))!==expectedParserCandidateSha256||
   sha(fs.readFileSync(collector))!==expectedCollectorInstalledSha256||
   sha(fs.readFileSync(tic))!==expectedTicCandidateSha256||
   sha(fs.readFileSync(eia))!==expectedEiaSha256||
   sha(fs.readFileSync(usda))!==expectedUsdaSha256||
   sha(fs.readFileSync(cftc))!==expectedCftcSha256||
   sha(fs.readFileSync(treasury))!==expectedTreasurySha256)throw Error('R27_COPY_HASH_MISMATCH');
  if(gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==[changedPaths[0],changedPaths[2]].join('\n')||
   gitCall(root,['ls-files','--others','--exclude-standard','--','lib/tic-calendar.mjs'])!=='lib/tic-calendar.mjs')
   throw Error('R27_PROTECTED_DIFF_NOT_EXACT');
  result.phase='GIT_THREE_FILE_COMMIT';
  gitCall(root,['add','--','lib/tic-calendar.mjs']);ticStaged=true;
  gitCall(root,['commit','--only','-m','feat(market-calendar): connect official Treasury TIC release dates','--',...changedPaths]);
  committed=true;result.newSource=hex(gitCall(root,['rev-parse','HEAD']));
  if(hex(gitCall(root,['rev-parse','HEAD^']))!==approvedSource||
   gitCall(root,['diff','--name-only',approvedSource,result.newSource,'--'])!==[...changedPaths].sort().join('\n')||
   sha(fs.readFileSync(parser))!==expectedParserCandidateSha256||
   sha(fs.readFileSync(collector))!==expectedCollectorInstalledSha256||
   sha(fs.readFileSync(tic))!==expectedTicCandidateSha256||
   sha(fs.readFileSync(eia))!==expectedEiaSha256||
   sha(fs.readFileSync(usda))!==expectedUsdaSha256||
   sha(fs.readFileSync(cftc))!==expectedCftcSha256||
   sha(fs.readFileSync(treasury))!==expectedTreasurySha256)throw Error('R27_COMMIT_PARENT_OR_CONTENT_MISMATCH');
  result.phase='CONFIG_SOURCE_UPDATE';
  if(!fs.readFileSync(configFile).equals(configRaw))throw Error('PC_CONFIG_CHANGED_DURING_INSTALL');
  const temp=path.join(backupDir,'config-new.json');
  fs.writeFileSync(temp,JSON.stringify({...config,source:result.newSource},null,2)+'\n',{flag:'wx'});
  fs.renameSync(temp,configFile);
  if(json(configFile)?.source!==result.newSource)throw Error('PC_CONFIG_SOURCE_READBACK_FAILED');
  result.phase='INSTALLED';result.decision='R27_TIC_CALENDAR_INSTALLED_NO_FORCED_COLLECTION';
 }catch(error){
  result.decision=committed?'R27_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP':'R27_INSTALL_ABORTED_OR_RESTORED_STOP';
  const codes={EEXIST:'CORE_LOCK_ALREADY_EXISTS',EACCES:'FILESYSTEM_ACCESS_DENIED',EPERM:'FILESYSTEM_PERMISSION_DENIED',
   ENOSPC:'DISK_FULL',ENOENT:'REQUIRED_FILE_DISAPPEARED',EBUSY:'FILE_IN_USE',EROFS:'READ_ONLY_FILESYSTEM'};
  result.errorCode=codes[error?.code]??
   (typeof error?.message==='string'&&/^[A-Z_]{5,80}$/.test(error.message)?error.message:'LOCAL_OPERATION_FAILED');
  if(!committed&&modified&&backupVerified){
   try{
    if(ticStaged)gitCall(root,['rm','--cached','-f','--','lib/tic-calendar.mjs']);
    if(ticCreated&&sha(fs.readFileSync(tic))===expectedTicCandidateSha256)fs.unlinkSync(tic);
    fs.copyFileSync(path.join(backupDir,'release-calendar-parser.mjs'),parser);
    fs.copyFileSync(path.join(backupDir,'release-calendar-collector.mjs'),collector);
   }catch{result.decision='R27_RESTORE_FAILED_MANUAL_RECOVERY_STOP';}
  }
 }finally{if(ownLock){try{fs.unlinkSync(lockFile);}catch{result.lockReleaseFailed=true;}}}
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const reportPath=process.argv[2],apply=process.argv.includes('--apply');
 if(!reportPath){console.error('MISSING_REPORT_PATH');process.exitCode=2;}
 else try{
  const result=runR27({apply});
  fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n','utf8');
  console.log(`MARKET_CALENDAR_R27=${result.decision}`);
  console.log(`RESULT_FILE=${reportPath}`);
  if(!['R27_THREE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE','R27_TIC_CALENDAR_INSTALLED_NO_FORCED_COLLECTION'].includes(result.decision))process.exitCode=1;
 }catch{console.error('MARKET_CALENDAR_R27_EXECUTION_ERROR');process.exitCode=2;}
}
