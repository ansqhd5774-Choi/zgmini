// R15 guarded installer: reuse the existing R13 task, only append news hook
// to the already R7-patched PC runner. Never edit tasks, VBS, score code or DB.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeTaskXml,describeSchedulerXml,parseLauncherScript} from './news-display-chain-audit-r6.mjs';

const TASK='ZGMINI-PC-Iran-Progress-R13';
const SOURCE_HEAD='bc7bd6781d1f4083009f1709a3f2e82461c5bfb9';
const LAUNCHER_SHA='a26e561964a5d4b88a02f81185221c1d3d770541c2cc12d6ceca5898e2228846';
const EXISTING_RUNNER_SHA='438ac0ad3f5073fbecc0e785c6f8fee19042d6fc8638ece9ef1e5198dd4c1b69';
const NEW_RUNNER_SHA='db0040ef8f3ce5b7e4cfe2ed8786a87b1f6f0ce6a9b8c6ea0cf379f494e77ae3';
const ORIGINAL_RUNNER_SHA='cbeff8d254504780c3446bdc7f43484a87306e2163b3687784a10f5b85a4c3b6';
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const existingFiles=[
 'scripts/iran-progress/sources.mjs',
 'scripts/iran-progress/news-display-maintenance-r1.mjs',
 'scripts/iran-progress/news-display-io-r1.mjs',
 'scripts/iran-progress/news-display-r1.mjs',
 'scripts/iran-progress/news-display-publication-r1.mjs',
 'lib/iran-progress/news-display-r1.mjs',
];
const newFiles=[
 'scripts/iran-progress/news-display-discover-r1.mjs',
 'scripts/iran-progress/news-display-model-shadow-r10.mjs',
 'scripts/iran-progress/news-display-safe-preview-r12.mjs',
 'scripts/iran-progress/news-display-incremental-preflight-r13.mjs',
 'scripts/iran-progress/news-display-publish-incremental-r14.mjs',
 'scripts/iran-progress/news-display-auto-run-r15.mjs',
];
export const R15_INSTALLED_PATHS=Object.freeze([...existingFiles,...newFiles]);
export function matchesPreservedR15Module(relative,local,staged){
 if(hash(local)===hash(staged))return true;
 // The pre-existing PC source was checked out by Windows Git. Its line endings
 // may be CRLF; no rewrite is authorized just to make its bytes resemble LF.
 return relative==='scripts/iran-progress/sources.mjs'
  &&hash(Buffer.from(local.toString('utf8').replace(/\r\n/g,'\n')))===hash(staged);
}
export const R15_HOOK=`// The existing R13 scheduler is reused. New article selection, PC display
// cache and the D1 news-only key are separate from R3/R5 score calculations.
// Do not propagate news-publication errors into the score runner exit code.
const newsAuto=path.join(path.dirname(fileURLToPath(import.meta.url)),'news-display-auto-run-r15.mjs');
if(fs.existsSync(newsAuto)){
 const newsExit=await run([newsAuto,'--scheduled']);
 if(newsExit!==0)console.error('IRAN_DISPLAY_NEWS_AUTO_FAILED_SCORE_UNAFFECTED');
}
`;
const tail='if(r3!==0||r5!==0||original!==0)process.exitCode=1;';

export function exactR15RunnerExtension(before,after){
 if(typeof before!=='string'||typeof after!=='string'||!before.trimEnd().endsWith(tail)||!after.trimEnd().endsWith(tail))return false;
 const baseline=before.replace(/\r\n/g,'\n');
 return baseline.replace(tail,R15_HOOK+tail)===after.replace(/\r\n/g,'\n')
  &&hash(Buffer.from(baseline,'utf8'))===EXISTING_RUNNER_SHA
  &&hash(Buffer.from(after.replace(/\r\n/g,'\n'),'utf8'))===NEW_RUNNER_SHA;
}

function safeFile(file,maxBytes=2*1024*1024){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>maxBytes)throw Error('R15_UNSAFE_FILE');
 return fs.readFileSync(file);
}
function queryTask(){
 const task=spawnSync('schtasks.exe',['/Query','/TN',TASK,'/XML'],
  {encoding:'buffer',windowsHide:true,maxBuffer:1024*1024,timeout:20000});
 if(task.error||task.status!==0)throw Error('R15_TASK_UNVERIFIED');
 return describeSchedulerXml(decodeTaskXml(task.stdout));
}
function readLiveChain(newsHome){
 const task=queryTask();
 if(task.executable.toLowerCase()!=='wscript.exe'||task.scheduleHours.join(',')!=='0,6,12,18')
  throw Error('R15_TASK_CONTRACT_CHANGED');
 const launcher=task.launcherPath;
 if(!launcher||path.win32.basename(launcher).toLowerCase()!=='run-articles.vbs')
  throw Error('R15_TASK_LAUNCHER_CHANGED');
 if(fs.realpathSync.native(path.dirname(launcher)).toLowerCase()!==fs.realpathSync.native(newsHome).toLowerCase())
  throw Error('R15_TASK_HOME_CHANGED');
 const vbs=safeFile(launcher,20000);
 if(hash(vbs)!==LAUNCHER_SHA)throw Error('R15_VBS_IDENTITY_DRIFT');
 const entry=parseLauncherScript(vbs.toString('utf8'));
 if(entry.scriptBase.toLowerCase()!=='run-reference-flow-r3.mjs')
  throw Error('R15_EXISTING_RUNNER_CHANGED');
 const runner=safeFile(entry.scriptPath,200000);
 if(hash(runner)!==EXISTING_RUNNER_SHA)throw Error('R15_R7_RUNNER_HASH_MISMATCH');
 const r7Backup=safeFile(entry.scriptPath+'.before-iran-news-r7',200000);
 if(hash(r7Backup)!==ORIGINAL_RUNNER_SHA)throw Error('R15_R7_RECOVERY_BACKUP_CHANGED');
 const projectRoot=path.resolve(path.dirname(entry.scriptPath),'../..');
 const git=spawnSync('git.exe',['-C',projectRoot,'rev-parse','HEAD'],
  {encoding:'utf8',windowsHide:true,maxBuffer:8192,timeout:5000});
 if(git.status!==0||git.stdout.trim()!==SOURCE_HEAD)throw Error('R15_PC_PROJECT_IDENTITY_DRIFT');
 if(!fs.existsSync(path.join(newsHome,'iran.sqlite'))||!fs.existsSync(path.join(newsHome,'news-display-r1.json')))
  throw Error('R15_OPERATIONAL_CACHE_OR_LEDGER_MISSING');
 const cache=JSON.parse(safeFile(path.join(newsHome,'news-display-r1.json'),1024*1024));
 if(cache.version!=='IRAN_NEWS_PC_DISPLAY_R1'||!Array.isArray(cache.items)||cache.items.length<1||cache.items.length>100)
  throw Error('R15_EXISTING_REVIEWED_NEWS_CACHE_INVALID');
 return {task,projectRoot,runner:entry.scriptPath,runnerBody:runner.toString('utf8'),newsCount:cache.items.length};
}
function replaceRunnerOnce(from,to){
 let attempt=0;
 for(;;){
  try{return fs.renameSync(from,to);}
  catch(error){
   if(process.platform!=='win32'||!['EACCES','EPERM','EBUSY'].includes(error?.code)||attempt>=6)throw error;
   Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,[25,50,100,200,400,800][attempt++]);
  }
 }
}

export function preflightR15({stage,newsHome=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13')}={}){
 if(typeof stage!=='string'||!path.isAbsolute(stage)||!fs.existsSync(stage)||!fs.statSync(stage).isDirectory())
  throw Error('R15_STAGE_INVALID');
 const live=readLiveChain(newsHome);
 const stageRunner=safeFile(path.join(stage,'scripts','iran-progress','run-reference-flow-r3.mjs'),200000).toString('utf8');
 if(!exactR15RunnerExtension(live.runnerBody,stageRunner))
  throw Error('R15_SCORE_RUNNER_EXTENSION_NOT_EXACT');
 const files=R15_INSTALLED_PATHS.map(relative=>{
  const from=path.join(stage,...relative.split('/'));
  const to=path.join(live.projectRoot,...relative.split('/'));
  const source=safeFile(from),exists=fs.existsSync(to);
  const shouldExist=existingFiles.includes(relative);
  if(exists!==shouldExist)throw Error('R15_MODULE_INSTALL_STATE_CHANGED:'+path.basename(relative));
  if(exists&&!matchesPreservedR15Module(relative,safeFile(to),source))
   throw Error('R15_EXISTING_MODULE_DRIFT:'+path.basename(relative));
  return {from,to,exists,sha256:hash(source)};
 });
 // The PC writer D1 client already exists. It must not be overwritten.
 const d1=path.join(live.projectRoot,'scripts','pc-writer','d1.mjs');
 if(!fs.existsSync(d1)||!safeFile(d1).toString('utf8').includes('export function client('))
  throw Error('R15_EXISTING_PC_D1_CLIENT_UNVERIFIED');
 const backup=live.runner+'.before-iran-news-r15',next=live.runner+'.iran-news-r15.next';
 if(fs.existsSync(backup)||fs.existsSync(next))throw Error('R15_RUNNER_BACKUP_OR_STAGING_ALREADY_EXISTS');
 return {live,stageRunner,files,backup,next,report:{
  status:'PASS_R15_AUTO_HOOK_PREFLIGHT_READ_ONLY',readOnly:true,
  task:TASK,scheduleHours:[0,6,12,18],sourceHead:SOURCE_HEAD,
  oldRunnerSha256:EXISTING_RUNNER_SHA,newRunnerSha256:NEW_RUNNER_SHA,
  existingModulesVerified:existingFiles.length,newModules:newFiles.length,
  verifiedDisplayCacheItems:live.newsCount,
  schedulerModified:false,launcherModified:false,scoreLedgerModified:false,d1Written:false}};
}

export function installR15({stage,newsHome}={}){
 const checked=preflightR15({stage,newsHome}),created=[];
 try{
  for(const file of checked.files){
   if(file.exists)continue;
   fs.writeFileSync(file.to,safeFile(file.from),{flag:'wx'});
   created.push(file.to);
   if(hash(safeFile(file.to))!==file.sha256)throw Error('R15_MODULE_READBACK_FAILED');
  }
  const localCheck=spawnSync(process.execPath,[path.join(checked.live.projectRoot,
   'scripts','iran-progress','news-display-auto-run-r15.mjs'),'--local-check'],
   {encoding:'utf8',windowsHide:true,maxBuffer:65536,timeout:20000});
  if(localCheck.error||localCheck.status!==0||
    JSON.parse(localCheck.stdout.trim()).status!=='PASS_R15_LOCAL_INSTALLATION_READ_ONLY')
   throw Error('R15_INSTALLED_MODULE_LOCAL_CHECK_FAILED');
  fs.copyFileSync(checked.live.runner,checked.backup,fs.constants.COPYFILE_EXCL);
  if(hash(safeFile(checked.backup))!==EXISTING_RUNNER_SHA)
   throw Error('R15_RUNNER_BACKUP_READBACK_FAILED');
  fs.writeFileSync(checked.next,checked.stageRunner,{flag:'wx'});
  if(hash(safeFile(checked.next))!==NEW_RUNNER_SHA)
   throw Error('R15_STAGED_RUNNER_READBACK_FAILED');
  replaceRunnerOnce(checked.next,checked.live.runner);
  if(hash(safeFile(checked.live.runner))!==NEW_RUNNER_SHA)
   throw Error('R15_RUNNER_REPLACEMENT_UNCERTAIN');
  return {...checked.report,status:'PASS_R15_NEWS_AUTO_HOOK_INSTALLED',readOnly:false,
   localModuleCheck:'PASS',runnerBackupVerified:true,createdModules:created.length};
 }catch(error){
  let activeSha=null;
  try{activeSha=hash(safeFile(checked.live.runner));}catch{/* preserve unknown state */}
  if(activeSha===EXISTING_RUNNER_SHA){
   for(const file of created.reverse())try{fs.unlinkSync(file);}catch{/* preserve uncertain files */}
   if(fs.existsSync(checked.next))try{fs.unlinkSync(checked.next);}catch{/* preserve unknown staging */}
  }
  throw Error(error.message+(activeSha!==EXISTING_RUNNER_SHA?'_RUNNER_OUTCOME_REQUIRES_REVIEW':''));
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [flag,stageArg]=process.argv.slice(2);
 if(process.argv.length!==4||!['--preflight','--install'].includes(flag)||!stageArg?.startsWith('--stage='))
  throw Error('R15_EXPLICIT_STAGE_AND_MODE_REQUIRED');
 if(flag==='--install'&&process.env.ZGMINI_IRAN_NEWS_R15_APPROVED!=='YES')
  throw Error('R15_INSTALL_APPROVAL_GATE_REQUIRED');
 try{const stage=stageArg.slice('--stage='.length);
  console.log(JSON.stringify(flag==='--preflight'?preflightR15({stage}).report:installR15({stage})));
 }catch(error){console.error(JSON.stringify({status:'STOP_R15_NEWS_AUTO_HOOK',
  stage:flag,reason:error.message}));process.exitCode=1;}
}
