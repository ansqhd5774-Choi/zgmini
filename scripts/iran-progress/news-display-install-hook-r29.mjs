// R29: guarded, offline installation of private news collection into the
// ALREADY installed R15 after-hook of the existing six-hour R13 Windows task.
// Task/VBS/R3-R5 score/D1 publication code and data are never rewritten.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeTaskXml,describeSchedulerXml,parseLauncherScript}
 from './news-display-chain-audit-r6.mjs';
import {csvFirstRow} from './news-display-scheduled-verify-r8.mjs';
import {verifyIranOfflineBundleR28,R28_APPROVED_MODULE_SHA256}
 from './news-display-offline-bundle-r28.mjs';
import {readIranCollectionR26} from './news-display-collection-r26.mjs';

const TASK='ZGMINI-PC-Iran-Progress-R13';
const VBS_SHA='a26e561964a5d4b88a02f81185221c1d3d770541c2cc12d6ceca5898e2228846';
const R15_RUNNER_SHA='db0040ef8f3ce5b7e4cfe2ed8786a87b1f6f0ce6a9b8c6ea0cf379f494e77ae3';
const R7_RUNNER_SHA='438ac0ad3f5073fbecc0e785c6f8fee19042d6fc8638ece9ef1e5198dd4c1b69';
const ORIGINAL_RUNNER_SHA='cbeff8d254504780c3446bdc7f43484a87306e2163b3687784a10f5b85a4c3b6';
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const safeCode=value=>/^R29_[A-Z0-9_]{1,105}$/.test(value??'')?value:'R29_UNCLASSIFIED_FAILURE';
const oldTail='if(r3!==0||r5!==0||original!==0)process.exitCode=1;';
export const R29_HOOK=`// Independent private-only news metadata collection; never adds articles to
// the public news key. Run after R15 whether its D1 publication succeeded or not.
const privateNews=path.join(path.dirname(fileURLToPath(import.meta.url)),'news-display-auto-candidates-r29.mjs');
if(fs.existsSync(privateNews)){
 const priorR29Flag=process.env.ZGMINI_IRAN_NEWS_R29_SCHEDULED;
 process.env.ZGMINI_IRAN_NEWS_R29_SCHEDULED='YES';
 try{
  const privateExit=await run([privateNews,'--scheduled']);
  if(privateExit!==0)console.error('IRAN_PRIVATE_NEWS_COLLECTION_FAILED_SCORE_UNAFFECTED');
 }finally{
  if(priorR29Flag===undefined)delete process.env.ZGMINI_IRAN_NEWS_R29_SCHEDULED;
  else process.env.ZGMINI_IRAN_NEWS_R29_SCHEDULED=priorR29Flag;
 }
}else console.error('IRAN_PRIVATE_NEWS_MODULE_MISSING_SCORE_UNAFFECTED');
`;
const NEW_MODULES=Object.freeze([
 'scripts/iran-progress/news-display-source-registry-r26.mjs',
 'scripts/iran-progress/news-display-multisource-audit-r24.mjs',
 'scripts/iran-progress/news-display-article-audit-r25.mjs',
 'scripts/iran-progress/news-display-collection-r26.mjs',
 'scripts/iran-progress/news-display-auto-candidates-r29.mjs',
]);
const EXISTING_MODULES=Object.freeze([
 'scripts/iran-progress/sources.mjs',
 'scripts/iran-progress/news-display-discover-r1.mjs',
 'lib/iran-progress/news-display-r1.mjs',
]);
const R15_AUTO_SHA='af4d55af8e312c2d68220d29f806df1f452f5cdc8bbcecf1f8dec2bdd45e2617';
const R29_AUTO_SHA='faf411f9b77ed3402a4a6e7e675e150a4bae86de10969ce92b4dcdae6030dd92';
// R15 placed the pre-translation public display library on the PC. Later
// translation-only validation must not force a rewrite during private R26
// metadata collection installation. Accept only its verified historical SHA.
export const R29_PRESERVED_PC_NEWS_LIB_SHA='d960d1d1a5cd4a8642ff1a196a991f4e2a9efa244475df752367a629765f88ce';
export function matchesPreservedR29Dependency(relative,local,staged){
 const current=hash(local),approved=hash(staged);
 if(current===approved)return true;
 if(relative==='lib/iran-progress/news-display-r1.mjs')
  return current===R29_PRESERVED_PC_NEWS_LIB_SHA;
 if(relative==='scripts/iran-progress/sources.mjs')
  return hash(Buffer.from(local.toString('utf8').replace(/\r\n/g,'\n')))===approved;
 return false;
}

export function addR29ToVerifiedR15Runner(body){
 if(typeof body!=='string'||hash(Buffer.from(body,'utf8'))!==R15_RUNNER_SHA||
  body.includes('news-display-auto-candidates-r29.mjs')||
  !body.trimEnd().endsWith(oldTail))throw Error('R29_ACTIVE_R15_RUNNER_CHANGED');
 const at=body.lastIndexOf(oldTail);
 return body.slice(0,at)+R29_HOOK+body.slice(at);
}

function safeRead(file,max=2*1024*1024){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>max)
  throw Error('R29_UNSAFE_OR_OVERSIZED_FILE');
 return fs.readFileSync(file);
}
function pinnedFile(stage,relative){
 const full=path.join(stage,...relative.split('/'));
 return {full,bytes:safeRead(full,1024*1024)};
}
function taskReport(){
 const run=spawnSync('schtasks.exe',['/Query','/TN',TASK,'/XML'],
  {encoding:'buffer',windowsHide:true,maxBuffer:1024*1024,timeout:20000});
 if(run.error||run.status!==0)throw Error('R29_SCHEDULER_QUERY_FAILED');
 return describeSchedulerXml(decodeTaskXml(run.stdout));
}
function verifyTaskNotRunning(){
 const run=spawnSync('schtasks.exe',['/Query','/TN',TASK,'/V','/FO','CSV','/NH'],
  {encoding:'buffer',windowsHide:true,maxBuffer:1024*1024,timeout:20000});
 if(run.error||run.status!==0)throw Error('R29_TASK_STATE_UNVERIFIED');
 const row=csvFirstRow(decodeTaskXml(run.stdout));
 if(row.length<7||!row[1].includes(TASK))throw Error('R29_TASK_STATE_UNVERIFIED');
 const result=String(row[6]).trim();
 if(/^(?:0x41301|267009)$/i.test(result)||/^(?:running|실행\s*중)$/i.test(row[3].trim()))
  throw Error('R29_TASK_RUNNING_WAIT');
}
function safeKstInstallationWindow(now){
 const date=new Date(now+9*3600000);
 const interval=(date.getUTCHours()*60+date.getUTCMinutes())%360;
 if(interval<25||interval>=335)throw Error('R29_NEAR_SCHEDULE_WINDOW_WAIT');
}
function liveIdentity(newsHome,queryTask=taskReport){
 const task=queryTask();
 if(task.executable.toLowerCase()!=='wscript.exe'||
  task.scheduleHours.join(',')!=='0,6,12,18'||
  path.win32.basename(task.launcherPath??'').toLowerCase()!=='run-articles.vbs')
  throw Error('R29_SCHEDULER_CONTRACT_DRIFT');
 const launcher=task.launcherPath;
 if(fs.realpathSync.native(path.dirname(launcher)).toLowerCase()!==
  fs.realpathSync.native(newsHome).toLowerCase())throw Error('R29_NEWS_HOME_DRIFT');
 const vbs=safeRead(launcher,20000);
 if(hash(vbs)!==VBS_SHA)throw Error('R29_VBS_IDENTITY_DRIFT');
 const entry=parseLauncherScript(vbs.toString('utf8'));
 if(entry.scriptBase.toLowerCase()!=='run-reference-flow-r3.mjs')
  throw Error('R29_EXISTING_ENTRYPOINT_DRIFT');
 const body=safeRead(entry.scriptPath,200000);
 if(hash(body)!==R15_RUNNER_SHA)throw Error('R29_ACTIVE_R15_RUNNER_DRIFT');
 const backupR15=safeRead(entry.scriptPath+'.before-iran-news-r15',200000);
 if(hash(backupR15)!==R7_RUNNER_SHA)throw Error('R29_R7_RECOVERY_DRIFT');
 const backupR7=safeRead(entry.scriptPath+'.before-iran-news-r7',200000);
 if(hash(backupR7)!==ORIGINAL_RUNNER_SHA)throw Error('R29_ORIGINAL_RECOVERY_DRIFT');
 const projectRoot=path.resolve(path.dirname(entry.scriptPath),'../..');
 const git=spawnSync('git.exe',['-C',projectRoot,'rev-parse','HEAD'],
  {encoding:'utf8',windowsHide:true,timeout:5000,maxBuffer:8192});
 if(git.status!==0||!/^[a-f0-9]{40}$/.test(git.stdout.trim()))
  throw Error('R29_PC_PROJECT_GIT_IDENTITY_UNVERIFIED');
 const r15Module=path.join(path.dirname(entry.scriptPath),'news-display-auto-run-r15.mjs');
 if(hash(safeRead(r15Module))!==R15_AUTO_SHA)
  throw Error('R29_EXISTING_R15_MODULE_DRIFT');
 const ledger=fs.lstatSync(path.join(newsHome,'iran.sqlite'));
 if(!ledger.isFile()||ledger.isSymbolicLink())throw Error('R29_SCORE_LEDGER_IDENTITY_UNSAFE');
 return {task,projectRoot,runner:entry.scriptPath,body:body.toString('utf8'),
  projectHead:git.stdout.trim()};
}

export function preflightR29({bundleRoot,
 newsHome=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13'),
 now=Date.now(),queryTask}={}){
 if(typeof bundleRoot!=='string'||!path.isAbsolute(bundleRoot)||
  !fs.lstatSync(bundleRoot).isDirectory())throw Error('R29_BUNDLE_ROOT_INVALID');
 if(!Number.isSafeInteger(now))throw Error('R29_NOW_INVALID');
 safeKstInstallationWindow(now);
 if(!queryTask)verifyTaskNotRunning();
 const bundle=verifyIranOfflineBundleR28({directory:bundleRoot});
 const auto=pinnedFile(bundleRoot,'scripts/iran-progress/news-display-auto-candidates-r29.mjs');
 if(hash(auto.bytes)!==R29_AUTO_SHA)throw Error('R29_CANDIDATE_RUNNER_BUNDLE_DRIFT');
 const live=liveIdentity(newsHome,queryTask);
 const candidateCache=readIranCollectionR26(newsHome,{now});
 if(candidateCache.items.length<1||candidateCache.items.length>700)
  throw Error('R29_PC_PRIVATE_CANDIDATE_CACHE_EMPTY');
 const newRunner=addR29ToVerifiedR15Runner(live.body);
 const checks=[...EXISTING_MODULES,...NEW_MODULES].map(relative=>{
  const {full,bytes}=pinnedFile(bundleRoot,relative);
  if(R28_APPROVED_MODULE_SHA256[relative]&&
   hash(bytes)!==R28_APPROVED_MODULE_SHA256[relative])
   throw Error('R29_SOURCE_MODULE_BUNDLE_DRIFT');
  const destination=path.join(live.projectRoot,...relative.split('/'));
  const preexisting=EXISTING_MODULES.includes(relative);
  if(fs.existsSync(destination)!==preexisting)
   throw Error('R29_INSTALL_MODULE_STATE_DRIFT');
  if(preexisting){
   const existing=safeRead(destination);
   if(!matchesPreservedR29Dependency(relative,existing,bytes))
    throw Error('R29_EXISTING_DEPENDENCY_DRIFT');
  }
  return {relative,full,destination,sha256:hash(bytes),preexisting};
 });
 const recovery=live.runner+'.before-iran-news-r29';
 const staged=live.runner+'.iran-news-r29.next';
 if(fs.existsSync(recovery)||fs.existsSync(staged))
  throw Error('R29_RECOVERY_OR_STAGING_ALREADY_EXISTS');
 return {bundle,live,checks,newRunner,recovery,staged,report:{
  status:'PASS_R29_EXISTING_R15_PREFLIGHT_READ_ONLY',readOnly:true,
  task:TASK,scheduleHours:live.task.scheduleHours,
  pcProjectHead:live.projectHead,oldRunnerSha256:R15_RUNNER_SHA,
  newRunnerSha256:hash(Buffer.from(newRunner)),existingModulesChecked:EXISTING_MODULES.length,
  newModules:NEW_MODULES.length,verifiedCandidateItems:candidateCache.items.length,
  schedulerModified:false,vbsModified:false,existingR15Modified:false,
  scoreLedgerModified:false,publicCacheModified:false,d1Written:false}};
}

function replaceSameVolume(from,to){
 for(let attempt=0;;attempt++){
  try{fs.renameSync(from,to);return;}
  catch(error){
   if(process.platform!=='win32'||!['EACCES','EPERM','EBUSY'].includes(error?.code)||
    attempt>=6)throw Error('R29_ACTIVE_RUNNER_REPLACE_UNCERTAIN');
   Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,[25,50,100,200,400,800][attempt]);
  }
 }
}

export function installR29(options={}){
 if(process.env.ZGMINI_IRAN_NEWS_R29_INSTALL_APPROVED!=='YES')
  throw Error('R29_EXPLICIT_INSTALL_APPROVAL_REQUIRED');
 const check=preflightR29(options);
 // Running a task while modifying its entrypoint is unsafe. Even if a task
 // starts after this guard, writes happen to different new module paths only.
 const created=[];
 try{
  for(const item of check.checks){
   if(item.preexisting)continue;
   fs.copyFileSync(item.full,item.destination,fs.constants.COPYFILE_EXCL);
   created.push(item.destination);
   if(hash(safeRead(item.destination))!==item.sha256)
    throw Error('R29_NEW_MODULE_READBACK_FAILED');
  }
  fs.copyFileSync(check.live.runner,check.recovery,fs.constants.COPYFILE_EXCL);
  if(hash(safeRead(check.recovery))!==R15_RUNNER_SHA)
   throw Error('R29_RECOVERY_BACKUP_READBACK_FAILED');
  fs.writeFileSync(check.staged,check.newRunner,{flag:'wx'});
  const newHash=hash(Buffer.from(check.newRunner));
  if(hash(safeRead(check.staged))!==newHash)
   throw Error('R29_STAGED_RUNNER_READBACK_FAILED');
  if(hash(safeRead(check.live.runner))!==R15_RUNNER_SHA)
   throw Error('R29_ACTIVE_RUNNER_CHANGED_DURING_INSTALL');
  safeKstInstallationWindow(Date.now());
  if(!options.queryTask)verifyTaskNotRunning();
  replaceSameVolume(check.staged,check.live.runner);
  if(hash(safeRead(check.live.runner))!==newHash)
   throw Error('R29_NEW_RUNNER_READBACK_FAILED');
  return {...check.report,status:'PASS_R29_PRIVATE_NEWS_SCHEDULED_HOOK_INSTALLED',
   readOnly:false,runnerBackupVerified:true,installedModules:created.length,
   schedulerModified:false,vbsModified:false,scoreLedgerModified:false,
   publicCacheModified:false,d1Written:false,pcPrivateCollectionExecuted:false};
 }catch(error){
  // Do not delete backups, staging files or copied modules: installation
  // outcome may be uncertain, and automatic retry would obscure the evidence.
  throw Error('R29_INSTALL_OUTCOME_REQUIRES_REVIEW');
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [flag]=process.argv.slice(2);
 const bundleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 if(process.argv.length!==3||!['--preflight','--install'].includes(flag)){
  console.error(JSON.stringify({status:'STOP_R29_EXPLICIT_MODE_REQUIRED'}));
  process.exitCode=2;
 }else{
  try{console.log(JSON.stringify(flag==='--preflight'?preflightR29({bundleRoot}).report:
   installR29({bundleRoot})));}
  catch(error){console.error(JSON.stringify({status:'STOP_R29_HOOK_INSTALL',
   mode:flag,reason:safeCode(error.message),schedulerModified:false,
   scoreLedgerModified:false,d1Written:false}));process.exitCode=1;}
 }
}
