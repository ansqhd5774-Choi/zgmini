// R26: source-locked transition from the verified R25 PC HEAD.
// Only three source files; no collection, publishing, DB schema, schedule,
// GitHub push, or main/prod deployment. EIA/USDA/CFTC are protected.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {coreRootFromTask,worktreeIdentity} from './market-calendar-r19-bea-apply.mjs';

const R25_SOURCE='724bbbf4407363f1f091567ed196cc0bf554bb5e';
const BASE_PARSER_SHA='480184533c696e42606cb8811aaedeef438119fadab03b27d0ebe1afd94fc90e';
const BASE_EIA_SHA='6099a1fb912077b2627369b8428a600f613004b2facdb16b262a8ea5b3f65e90';
const BASE_USDA_SHA='24555a8084b4cb62398b617331498ffa548018bed7e9058f59a6ecff15d3d7ba';
const BASE_CFTC_SHA='61ac33217c742672038e5209c8dccf11935db80d088c354f51785afe61cb4bd5';
const BASE_COLLECTOR_SHA='9a8de4ff89780bb0ed8dcc08365382c75ef8c1b9fdc2597585a104486073d2d8';
const NEXT_PARSER_SHA='432354b0e87ab7735330e9b29396a14fd14ee218cd0daa016ab93fb59b6d080f';
const NEXT_TREASURY_SHA='0eb744d67fc2d82cbba1bf7b578503dcdfe6a609df557c8666517fc1c91f9c36';
const NEXT_COLLECTOR_SHA='47416512698f8f4b184a6a4c32128a1256b6b6a010d1932a0e69d2612472cca6';
const NEXT_COLLECTOR_CRLF_SHA='a931267b84a6a8a7c2289e4daea5630b257bf30463e58f14b4ad2b5266828f1c';
const CORE_WORKTREE_ID='d0a4b3cb8b95';
const protectedPaths=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const changedPaths=['lib/release-calendar.mjs','lib/treasury-calendar.mjs','scripts/pc-writer/release-calendar.mjs'];
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

export function runR26({
 apply=false,dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 parserCandidatePath=fileURLToPath(new URL('../../staging/market-calendar/r26-treasury/lib/release-calendar.mjs',import.meta.url)),
 treasuryCandidatePath=fileURLToPath(new URL('../../staging/market-calendar/r26-treasury/lib/treasury-calendar.mjs',import.meta.url)),
 collectorCandidatePath=fileURLToPath(new URL('../../staging/market-calendar/r26-treasury/scripts/pc-writer/release-calendar.mjs',import.meta.url)),
 getTaskXml=taskXml,getCoreRoot=coreRootFromTask,gitCall=git,
 approvedSource=R25_SOURCE,expectedWorktreeId=CORE_WORKTREE_ID,
 expectedParserSha256=BASE_PARSER_SHA,expectedEiaSha256=BASE_EIA_SHA,expectedUsdaSha256=BASE_USDA_SHA,
 expectedCftcSha256=BASE_CFTC_SHA,
 expectedCollectorSha256=BASE_COLLECTOR_SHA,
 expectedParserCandidateSha256=NEXT_PARSER_SHA,expectedTreasuryCandidateSha256=NEXT_TREASURY_SHA,
 expectedCollectorCandidateSha256=NEXT_COLLECTOR_SHA,
 expectedCollectorInstalledSha256=NEXT_COLLECTOR_CRLF_SHA,
}={}){
 const result={audit:'MARKET_CALENDAR_R26_TREASURY_APPLY',at:new Date().toISOString(),
  mode:apply?'EXPLICIT_APPLY':'PREFLIGHT',previousSource:approvedSource,
  policy:'R25_LOCKED_THREE_FILES_NO_COLLECT_NO_PUBLISH_NO_TASK_NO_DB_NO_GIT_PUSH',
  changedFiles:[],backupCreated:false,gitPushed:false,publisherExecuted:false,
  forcedCollection:false,newSource:null,parserLineEnding:'LF',treasuryLineEnding:'LF',collectorLineEnding:'CRLF',
  decision:'R26_PREFLIGHT_INCOMPLETE_STOP'};
 let root,configFile,configRaw,config,parser,eia,usda,cftc,treasury,collector,parserBytes,treasuryBytes,collectorBytes;
 try{
  parserBytes=fs.readFileSync(parserCandidatePath);
  treasuryBytes=fs.readFileSync(treasuryCandidatePath);
  collectorBytes=crlf(fs.readFileSync(collectorCandidatePath));
  result.candidateSha256={parser:sha(parserBytes),treasury:sha(treasuryBytes),
   collector:sha(fs.readFileSync(collectorCandidatePath)),collectorInstalled:sha(collectorBytes)};
  if(result.candidateSha256.parser!==expectedParserCandidateSha256||
   result.candidateSha256.treasury!==expectedTreasuryCandidateSha256||
   result.candidateSha256.collector!==expectedCollectorCandidateSha256||
   result.candidateSha256.collectorInstalled!==expectedCollectorInstalledSha256){
   result.decision='R26_CANDIDATE_HASH_MISMATCH_STOP';return result;
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
  collector=path.join(root,'scripts','pc-writer','release-calendar.mjs');
  if(fs.existsSync(treasury)){result.decision='TREASURY_MODULE_ALREADY_EXISTS_STOP';return result;}
  result.installedSha256={parser:sha(fs.readFileSync(parser)),eia:sha(fs.readFileSync(eia)),usda:sha(fs.readFileSync(usda)),cftc:sha(fs.readFileSync(cftc)),
   collector:sha(fs.readFileSync(collector))};
  if(result.installedSha256.parser!==expectedParserSha256||
   result.installedSha256.eia!==expectedEiaSha256||
   result.installedSha256.usda!==expectedUsdaSha256||
   result.installedSha256.cftc!==expectedCftcSha256||
   result.installedSha256.collector!==expectedCollectorSha256||
   hex(gitCall(root,['rev-parse','HEAD:lib/release-calendar.mjs']))!==hex(gitCall(root,['hash-object','lib/release-calendar.mjs']))||
   hex(gitCall(root,['rev-parse','HEAD:lib/eia-calendar.mjs']))!==hex(gitCall(root,['hash-object','lib/eia-calendar.mjs']))||
   hex(gitCall(root,['rev-parse','HEAD:lib/usda-calendar.mjs']))!==hex(gitCall(root,['hash-object','lib/usda-calendar.mjs']))||
   hex(gitCall(root,['rev-parse','HEAD:lib/cftc-calendar.mjs']))!==hex(gitCall(root,['hash-object','lib/cftc-calendar.mjs']))||
   hex(gitCall(root,['rev-parse','HEAD:scripts/pc-writer/release-calendar.mjs']))!==hex(gitCall(root,['hash-object','scripts/pc-writer/release-calendar.mjs']))){
   result.decision='R25_BASELINE_FILE_CHANGED_STOP';return result;
  }
  if(gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''){
   result.decision='PROTECTED_SOURCE_ALREADY_DIRTY_STOP';return result;
  }
  gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);
  result.changedFiles=[...changedPaths];
  if(!apply){result.decision='R26_THREE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE';return result;}
 }catch{result.decision='R26_PREFLIGHT_READ_FAILED_STOP';return result;}

 const lockFile=path.join(dataRoot,'local-cycle.lock');
 let ownLock=false,backupDir=null,backupVerified=false,modified=false,treasuryCreated=false,treasuryStaged=false,committed=false;
 try{
  result.phase='CORE_LOCK_ACQUIRE';
  const fd=fs.openSync(lockFile,'wx');ownLock=true;
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:Date.now(),purpose:'market-calendar-r26-treasury-transition'}));}
  finally{fs.closeSync(fd);}
  result.phase='LOCKED_SOURCE_RECHECK';
  const currentRoot=getCoreRoot(getTaskXml());
  if(!currentRoot||normalized(currentRoot)!==normalized(root)||worktreeIdentity(currentRoot)!==expectedWorktreeId||
   hex(gitCall(root,['rev-parse','HEAD']))!==approvedSource||
   gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==''||
   fs.existsSync(treasury)||sha(fs.readFileSync(parser))!==expectedParserSha256||
   sha(fs.readFileSync(eia))!==expectedEiaSha256||sha(fs.readFileSync(usda))!==expectedUsdaSha256||
   sha(fs.readFileSync(cftc))!==expectedCftcSha256||
   sha(fs.readFileSync(collector))!==expectedCollectorSha256||
   !fs.readFileSync(configFile).equals(configRaw)||json(configFile)?.source!==approvedSource){
   result.decision='STATE_CHANGED_AFTER_CORE_LOCK_STOP';return result;
  }
  result.phase='BACKUP';
  backupDir=path.join(dataRoot,'market-calendar-r26-backups',
   'r26-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  fs.mkdirSync(backupDir,{recursive:true});
  fs.copyFileSync(parser,path.join(backupDir,'release-calendar-parser.mjs'));
  fs.copyFileSync(collector,path.join(backupDir,'release-calendar-collector.mjs'));
  fs.copyFileSync(configFile,path.join(backupDir,'config.json'));
  if(sha(fs.readFileSync(path.join(backupDir,'release-calendar-parser.mjs')))!==expectedParserSha256||
   sha(fs.readFileSync(path.join(backupDir,'release-calendar-collector.mjs')))!==expectedCollectorSha256)
   throw Error('R26_BACKUP_HASH_MISMATCH');
  backupVerified=true;result.backupCreated=true;result.backupId=path.basename(backupDir);
  result.phase='COPY_EXACT_THREE_FILES';modified=true;
  fs.writeFileSync(parser,parserBytes);fs.writeFileSync(collector,collectorBytes);
  fs.writeFileSync(treasury,treasuryBytes,{flag:'wx'});treasuryCreated=true;
  if(sha(fs.readFileSync(parser))!==expectedParserCandidateSha256||
   sha(fs.readFileSync(collector))!==expectedCollectorInstalledSha256||
   sha(fs.readFileSync(treasury))!==expectedTreasuryCandidateSha256||
   sha(fs.readFileSync(eia))!==expectedEiaSha256||
   sha(fs.readFileSync(usda))!==expectedUsdaSha256||
   sha(fs.readFileSync(cftc))!==expectedCftcSha256)throw Error('R26_COPY_HASH_MISMATCH');
  if(gitCall(root,['diff','--name-only','HEAD','--',...protectedPaths])!==[changedPaths[0],changedPaths[2]].join('\n')||
   gitCall(root,['ls-files','--others','--exclude-standard','--','lib/treasury-calendar.mjs'])!=='lib/treasury-calendar.mjs')
   throw Error('R26_PROTECTED_DIFF_NOT_EXACT');
  result.phase='GIT_THREE_FILE_COMMIT';
  gitCall(root,['add','--','lib/treasury-calendar.mjs']);treasuryStaged=true;
  gitCall(root,['commit','--only','-m','feat(market-calendar): connect official Treasury auction announcements','--',...changedPaths]);
  committed=true;result.newSource=hex(gitCall(root,['rev-parse','HEAD']));
  if(hex(gitCall(root,['rev-parse','HEAD^']))!==approvedSource||
   gitCall(root,['diff','--name-only',approvedSource,result.newSource,'--'])!==[...changedPaths].sort().join('\n')||
   sha(fs.readFileSync(parser))!==expectedParserCandidateSha256||
   sha(fs.readFileSync(collector))!==expectedCollectorInstalledSha256||
   sha(fs.readFileSync(treasury))!==expectedTreasuryCandidateSha256||
   sha(fs.readFileSync(eia))!==expectedEiaSha256||
   sha(fs.readFileSync(usda))!==expectedUsdaSha256||
   sha(fs.readFileSync(cftc))!==expectedCftcSha256)throw Error('R26_COMMIT_PARENT_OR_CONTENT_MISMATCH');
  result.phase='CONFIG_SOURCE_UPDATE';
  if(!fs.readFileSync(configFile).equals(configRaw))throw Error('PC_CONFIG_CHANGED_DURING_INSTALL');
  const temp=path.join(backupDir,'config-new.json');
  fs.writeFileSync(temp,JSON.stringify({...config,source:result.newSource},null,2)+'\n',{flag:'wx'});
  fs.renameSync(temp,configFile);
  if(json(configFile)?.source!==result.newSource)throw Error('PC_CONFIG_SOURCE_READBACK_FAILED');
  result.phase='INSTALLED';result.decision='R26_TREASURY_CALENDAR_INSTALLED_NO_FORCED_COLLECTION';
 }catch(error){
  result.decision=committed?'R26_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP':'R26_INSTALL_ABORTED_OR_RESTORED_STOP';
  const codes={EEXIST:'CORE_LOCK_ALREADY_EXISTS',EACCES:'FILESYSTEM_ACCESS_DENIED',EPERM:'FILESYSTEM_PERMISSION_DENIED',
   ENOSPC:'DISK_FULL',ENOENT:'REQUIRED_FILE_DISAPPEARED',EBUSY:'FILE_IN_USE',EROFS:'READ_ONLY_FILESYSTEM'};
  result.errorCode=codes[error?.code]??
   (typeof error?.message==='string'&&/^[A-Z_]{5,80}$/.test(error.message)?error.message:'LOCAL_OPERATION_FAILED');
  if(!committed&&modified&&backupVerified){
   try{
    if(treasuryStaged)gitCall(root,['rm','--cached','-f','--','lib/treasury-calendar.mjs']);
    if(treasuryCreated&&sha(fs.readFileSync(treasury))===expectedTreasuryCandidateSha256)fs.unlinkSync(treasury);
    fs.copyFileSync(path.join(backupDir,'release-calendar-parser.mjs'),parser);
    fs.copyFileSync(path.join(backupDir,'release-calendar-collector.mjs'),collector);
   }catch{result.decision='R26_RESTORE_FAILED_MANUAL_RECOVERY_STOP';}
  }
 }finally{if(ownLock){try{fs.unlinkSync(lockFile);}catch{result.lockReleaseFailed=true;}}}
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const reportPath=process.argv[2],apply=process.argv.includes('--apply');
 if(!reportPath){console.error('MISSING_REPORT_PATH');process.exitCode=2;}
 else try{
  const result=runR26({apply});
  fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n','utf8');
  console.log(`MARKET_CALENDAR_R26=${result.decision}`);
  console.log(`RESULT_FILE=${reportPath}`);
  if(!['R26_THREE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE','R26_TREASURY_CALENDAR_INSTALLED_NO_FORCED_COLLECTION'].includes(result.decision))process.exitCode=1;
 }catch{console.error('MARKET_CALENDAR_R26_EXECUTION_ERROR');process.exitCode=2;}
}
