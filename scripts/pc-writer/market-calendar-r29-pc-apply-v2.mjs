// R29 v2 PC-only private raw collection: replace only the verified R27 collector.
// No forced collection, DB schema, publisher, scheduler modification or GitHub push.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {coreRootFromTask,worktreeIdentity} from './market-calendar-r19-bea-apply.mjs';

const CORE_WORKTREE_ID='d0a4b3cb8b95';
const BASE_COLLECT='7ccf0183868fc2f19de5b5f07409383def161a78a1353dba6049299631f31708';
const BASE_COLLECT_CRLF='aa091265aa3a80f2199b3d58258eeabdebd241709a37e034dbd113328b844e00';
const R27_PARSER='97800cfbe226be56c3f10e9fa4a37a8967a7e84ad5ba2f098477f7fb3447aefe';
const R27_COLLECTOR='7ccf0183868fc2f19de5b5f07409383def161a78a1353dba6049299631f31708';
const NEXT_API='e5c0fdfaddd8048fcb7e79c40f9d39185c75efbe73e7f6b62752073f14b23b3f';
const NEXT_LOCAL='707e1186364a374aa1e10a9f4b1b57109221592113f3b308c5909704fa58a3a9';
const NEXT_COLLECT='55b6d9d99f7687da3e34feeca046e46477231e2ae9306758663db6f636f4b31c';
const paths=['lib/earnings-api-calendar.mjs','scripts/pc-writer/earnings-api-local.mjs','scripts/pc-writer/release-calendar.mjs'];
const candidatePathsRel=[paths[0],paths[1],
 'staging/market-calendar/r29-private/scripts/pc-writer/release-calendar.mjs'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const asCrlf=b=>Buffer.from(b.toString('utf8').replace(/\r?\n/g,'\r\n'));
const validSha=s=>typeof s==='string'&&/^[a-f\d]{40}$/.test(s);
const readJson=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const normalized=p=>path.normalize(p).replaceAll('\\','/').toLowerCase();
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,
 timeout:25000,stdio:['ignore','pipe','pipe']}).trim();
const getTaskXml=()=>{
 const bytes=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (bytes[0]===255&&bytes[1]===254||bytes.includes(0)?bytes.toString('utf16le'):bytes.toString('utf8')).replace(/^\ufeff/,'');
};
const candidateRel=rel=>fileURLToPath(new URL('../../'+rel,import.meta.url));

export function runR29({apply=false,dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 candidatePaths=candidatePathsRel.map(candidateRel),getRoot=coreRootFromTask,getTask=getTaskXml,
 gitCall=git,expectedIdentity=CORE_WORKTREE_ID}={}){
 const report={audit:'MARKET_CALENDAR_R29_PC_PRIVATE_APPLY_V2',at:new Date().toISOString(),
  mode:apply?'EXPLICIT_APPLY':'PREFLIGHT',policy:'PRIVATE_RAW_ONLY_NO_FORCED_COLLECTION_NO_PUBLISH_NO_TASK_NO_DB_SCHEMA_NO_PUSH',
  changedFiles:[],backupCreated:false,forcedCollection:false,publisherExecuted:false,gitPushed:false,
  newSource:null,decision:'R29_PREFLIGHT_INCOMPLETE_STOP'};
 let root,head,configFile,configRaw,config,targets,original,candidates,installBytes;
 try{
  candidates=candidatePaths.map(p=>fs.readFileSync(p));
  if(candidates.length!==3||[NEXT_API,NEXT_LOCAL,NEXT_COLLECT].some((hash,i)=>sha(candidates[i])!==hash)){
   report.decision='R29_CANDIDATE_HASH_MISMATCH_STOP';return report;
  }
  root=getRoot(getTask());
  report.worktreeId=root?worktreeIdentity(root):null;
  if(!root||report.worktreeId!==expectedIdentity){report.decision='EXACT_CORE_ORIGIN_CHANGED_STOP';return report;}
  head=gitCall(root,['rev-parse','HEAD']);
  if(!validSha(head)){report.decision='PC_SOURCE_INVALID_STOP';return report;}
  configFile=path.join(dataRoot,'config.json');configRaw=fs.readFileSync(configFile);config=readJson(configFile);
  if(config?.source!==head||config?.enabled!==true||config?.collectionTarget!=='pc'){
   report.decision='PC_CONFIG_SOURCE_CHANGED_STOP';return report;
  }
  targets=paths.map(p=>path.join(root,p));
  if(fs.existsSync(targets[0])||fs.existsSync(targets[1])){
   report.decision='R29_MODULE_ALREADY_EXISTS_STOP';return report;
  }
  const parser=path.join(root,'lib','release-calendar.mjs');
  const collector=path.join(root,'scripts','pc-writer','release-calendar.mjs');
  if(sha(fs.readFileSync(parser))!==R27_PARSER||sha(fs.readFileSync(collector))!==R27_COLLECTOR){
   report.decision='R27_INSTALLED_SOURCE_CHANGED_STOP';return report;
  }
  original=fs.readFileSync(targets[2]);
  if(![BASE_COLLECT,BASE_COLLECT_CRLF].includes(sha(original))){
   // Only the exactly verified R27 official collector is eligible.
   report.decision='R29_R27_COLLECTOR_BASE_CHANGED_STOP';return report;
  }
  const baseGit=gitCall(root,['rev-parse','HEAD:scripts/pc-writer/release-calendar.mjs']);
  if(baseGit!==gitCall(root,['hash-object','scripts/pc-writer/release-calendar.mjs'])||
   gitCall(root,['diff','--name-only','HEAD','--','lib','worker','scripts/pc-writer','package.json','package-lock.json'])!==''||
   gitCall(root,['ls-files','--others','--exclude-standard','--',...paths])!==''){
   report.decision='R29_PROTECTED_SOURCE_DIRTY_STOP';return report;
  }
  gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);
  // Retain the existing release-calendar collector line ending convention.
  installBytes=[candidates[0],candidates[1],original.includes(Buffer.from('\r\n'))?asCrlf(candidates[2]):candidates[2]];
  report.previousSource=head;report.changedFiles=[...paths];
  if(!apply){report.decision='R29_THREE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE';return report;}
 }catch{report.decision='R29_PREFLIGHT_READ_FAILED_STOP';return report;}

 const lock=path.join(dataRoot,'local-cycle.lock');
 let ownLock=false,backupDir=null,modified=false,committed=false,staged=false;
 try{
  const fd=fs.openSync(lock,'wx');ownLock=true;
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:Date.now(),purpose:'market-calendar-r29-private-input'}));}
  finally{fs.closeSync(fd);}
  if(normalized(getRoot(getTask())??'')!==normalized(root)||gitCall(root,['rev-parse','HEAD'])!==head||
   !fs.readFileSync(configFile).equals(configRaw)||!fs.readFileSync(targets[2]).equals(original)||
   fs.existsSync(targets[0])||fs.existsSync(targets[1])||
   gitCall(root,['diff','--name-only','HEAD','--','lib','worker','scripts/pc-writer','package.json','package-lock.json'])!==''){
   report.decision='R29_STATE_CHANGED_AFTER_LOCK_STOP';return report;
  }
  backupDir=path.join(dataRoot,'market-calendar-r29-backups',
   'r29-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  fs.mkdirSync(backupDir,{recursive:true});
  fs.copyFileSync(targets[2],path.join(backupDir,'release-calendar.mjs'));
  fs.copyFileSync(configFile,path.join(backupDir,'config.json'));
  if(!fs.readFileSync(path.join(backupDir,'release-calendar.mjs')).equals(original)||
   !fs.readFileSync(path.join(backupDir,'config.json')).equals(configRaw))throw Error('R29_BACKUP_VERIFY_FAILED');
  report.backupCreated=true;report.backupId=path.basename(backupDir);
  modified=true;
  fs.writeFileSync(targets[0],installBytes[0],{flag:'wx'});
  fs.writeFileSync(targets[1],installBytes[1],{flag:'wx'});
  fs.writeFileSync(targets[2],installBytes[2]);
  for(let i=0;i<3;i++)if(sha(fs.readFileSync(targets[i]))!==sha(installBytes[i]))throw Error('R29_COPY_VERIFY_FAILED');
  if(gitCall(root,['diff','--name-only','HEAD','--','scripts/pc-writer/release-calendar.mjs'])!=='scripts/pc-writer/release-calendar.mjs')
   throw Error('R29_COLLECTOR_DIFF_INVALID');
  gitCall(root,['add','--',paths[0],paths[1]]);staged=true;
  gitCall(root,['commit','--only','-m','feat(market-calendar): collect private earnings API raw window on PC Core','--',...paths]);
  committed=true;report.newSource=gitCall(root,['rev-parse','HEAD']);
  if(gitCall(root,['rev-parse','HEAD^'])!==head||
   gitCall(root,['diff','--name-only',head,report.newSource,'--'])!==[...paths].sort().join('\n'))
   throw Error('R29_COMMIT_SCOPE_MISMATCH');
  if(!fs.readFileSync(configFile).equals(configRaw))throw Error('R29_CONFIG_CHANGED');
  const stagedConfig=path.join(backupDir,'config-new.json');
  fs.writeFileSync(stagedConfig,JSON.stringify({...config,source:report.newSource},null,2)+'\n',{flag:'wx'});
  fs.renameSync(stagedConfig,configFile);
  if(readJson(configFile)?.source!==report.newSource)throw Error('R29_CONFIG_READBACK_FAILED');
  report.decision='R29_V2_PC_PRIVATE_INPUT_COLLECTOR_INSTALLED_NO_FORCED_COLLECTION';
 }catch(error){
  report.decision=committed?'R29_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP':'R29_INSTALL_ABORTED_OR_RESTORED_STOP';
  report.errorCode=/^[A-Z0-9_]{5,80}$/.test(error?.message??'')?error.message:'R29_LOCAL_OPERATION_FAILED';
  if(!committed&&modified){
   try{
    if(staged)gitCall(root,['rm','--cached','-f','--',paths[0],paths[1]]);
    fs.copyFileSync(path.join(backupDir,'release-calendar.mjs'),targets[2]);
    for(let i=0;i<2;i++)if(fs.existsSync(targets[i])&&sha(fs.readFileSync(targets[i]))===sha(installBytes[i]))fs.unlinkSync(targets[i]);
   }catch{report.decision='R29_RESTORE_FAILED_MANUAL_RECOVERY_STOP';}
  }
 }finally{if(ownLock)try{fs.unlinkSync(lock);}catch{report.lockReleaseFailed=true;}}
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const resultFile=process.argv[2];
 if(!resultFile){console.error('R29_RESULT_FILE_MISSING');process.exitCode=2;}
 else try{
  const result=runR29({apply:process.argv.includes('--apply')});
  fs.writeFileSync(resultFile,JSON.stringify(result,null,2)+'\n','utf8');
  console.log('R29='+result.decision);
  if(!['R29_THREE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE',
   'R29_V2_PC_PRIVATE_INPUT_COLLECTOR_INSTALLED_NO_FORCED_COLLECTION'].includes(result.decision))process.exitCode=1;
 }catch{console.error('R29_INSTALLER_EXECUTION_FAILED');process.exitCode=2;}
}

