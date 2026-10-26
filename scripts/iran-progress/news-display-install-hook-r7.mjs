// Deliberate, bounded Windows installer for only the R13 display-news retention hook.
// Never edits the registered task, VBS launcher, R3/R5 score ledger, or D1.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeTaskXml,describeSchedulerXml,parseLauncherScript} from './news-display-chain-audit-r6.mjs';

const EXPECTED_LAUNCHER_SHA='a26e561964a5d4b88a02f81185221c1d3d770541c2cc12d6ceca5898e2228846';
const EXPECTED_RUNNER_SHA='cbeff8d254504780c3446bdc7f43484a87306e2163b3687784a10f5b85a4c3b6';
const EXPECTED_PC_HEAD='bc7bd6781d1f4083009f1709a3f2e82461c5bfb9';
const TASK='ZGMINI-PC-Iran-Progress-R13';
const files=[
 ['scripts/iran-progress/news-display-maintenance-r1.mjs','scripts/iran-progress/news-display-maintenance-r1.mjs'],
 ['scripts/iran-progress/news-display-io-r1.mjs','scripts/iran-progress/news-display-io-r1.mjs'],
 ['scripts/iran-progress/news-display-r1.mjs','scripts/iran-progress/news-display-r1.mjs'],
 ['scripts/iran-progress/news-display-publication-r1.mjs','scripts/iran-progress/news-display-publication-r1.mjs'],
 ['lib/iran-progress/news-display-r1.mjs','lib/iran-progress/news-display-r1.mjs'],
];
const hash=x=>createHash('sha256').update(x).digest('hex');
const RETRY_MS=[25,50,100,200,400,800];
const RETENTION_HOOK=`
// Isolated display-cache retention: only the local, rights-reviewed news JSON.
// Runs after all score jobs. Failures must never change their exit contract or
// delete any R3/R5 source, decision, calculation, publication, or checkpoint.
const retention=path.join(path.dirname(fileURLToPath(import.meta.url)),'news-display-maintenance-r1.mjs');
if(fs.existsSync(retention)){
 const newsExit=await run([retention,'--apply']);
 if(newsExit!==0)console.error('IRAN_DISPLAY_NEWS_RETENTION_FAILED_SCORE_UNAFFECTED');
}
`;
const safeFile=(file,max=2*1024*1024)=>{
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size>max)throw Error('R7_UNSAFE_FILE');
 return fs.readFileSync(file);
};

export function compatibleRunnerPatch(before,after){
 const tail='if(r3!==0||r5!==0||original!==0)process.exitCode=1;';
 if(!before.trimEnd().endsWith(tail)||!after.trimEnd().endsWith(tail))return false;
 // Require an EXACT one-block insertion at the very end. No other edit to
 // the approved R3/R5/legacy flow is permitted, even in the staged code.
 // The verified Windows runner is CRLF; GitHub immutable source is LF.
 // Normalize only the verified original after its raw SHA gate succeeds.
 return before.replace(/\r\n/g,'\n').replace(tail,RETENTION_HOOK+tail)===after;
}
function replaceRunnerOnWindows(staged,destination){
 let attempt=0;
 for(;;){
  try{return fs.renameSync(staged,destination);}
  catch(error){
   if(process.platform!=='win32'||!['EACCES','EPERM','EBUSY'].includes(error?.code)||attempt>=RETRY_MS.length)throw error;
   Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,RETRY_MS[attempt++]);
  }
 }
}

function readLiveChain(newsHome){
 const task=spawnSync('schtasks.exe',['/Query','/TN',TASK,'/XML'],{encoding:'buffer',windowsHide:true,maxBuffer:1024*1024,timeout:20000});
 if(task.error||task.status!==0)throw Error('R7_TASK_UNVERIFIED');
 const info=describeSchedulerXml(decodeTaskXml(task.stdout));
 if(info.executable.toLowerCase()!=='wscript.exe'||info.scheduleHours.join(',')!=='0,6,12,18')throw Error('R7_TASK_CONTRACT_CHANGED');
 const launcher=info.launcherPath;
 if(!launcher||path.win32.basename(launcher).toLowerCase()!=='run-articles.vbs')throw Error('R7_TASK_LAUNCHER_CHANGED');
 if(fs.realpathSync.native(path.dirname(launcher)).toLowerCase()!==fs.realpathSync.native(newsHome).toLowerCase())throw Error('R7_HOME_MISMATCH');
 const vbs=safeFile(launcher,20000).toString('utf8');
 if(hash(vbs)!==EXPECTED_LAUNCHER_SHA)throw Error('R7_LAUNCHER_DRIFT');
 const entry=parseLauncherScript(vbs);
 if(entry.scriptBase.toLowerCase()!=='run-reference-flow-r3.mjs')throw Error('R7_RUNNER_CHANGED');
 const current=safeFile(entry.scriptPath,200000).toString('utf8');
 if(hash(current)!==EXPECTED_RUNNER_SHA)throw Error('R7_RUNNER_DRIFT');
 const projectRoot=path.resolve(path.dirname(entry.scriptPath),'../..');
 const git=spawnSync('git.exe',['-C',projectRoot,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true,maxBuffer:8192,timeout:5000});
 if(git.status!==0||git.stdout.trim()!==EXPECTED_PC_HEAD)throw Error('R7_PC_SOURCE_IDENTITY_DRIFT');
 if(!fs.existsSync(path.join(newsHome,'iran.sqlite')))throw Error('R7_LEDGER_NOT_FOUND');
 if(!fs.existsSync(path.join(newsHome,'news-display-r1.json')))throw Error('R7_NEWS_CACHE_NOT_FOUND');
 return {runner:entry.scriptPath,projectRoot,current};
}

export function preflight({stage,newsHome=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13')}={}){
 if(!stage||!path.isAbsolute(stage)||!fs.existsSync(stage)||!fs.statSync(stage).isDirectory())throw Error('R7_STAGE_UNVERIFIED');
 const live=readLiveChain(newsHome);
 const stageRunner=path.join(stage,'scripts','iran-progress','run-reference-flow-r3.mjs');
 const replacement=safeFile(stageRunner,200000).toString('utf8');
 if(!compatibleRunnerPatch(live.current,replacement))throw Error('R7_EXISTING_SCORE_FLOW_NOT_PRESERVED');
 const staged=[];
 for(const [source,destination] of files){
  const from=path.join(stage,...source.split('/'));
  const target=path.join(live.projectRoot,...destination.split('/'));
  const payload=safeFile(from);
  const exists=fs.existsSync(target);
  if(exists&&hash(safeFile(target))!==hash(payload))throw Error('R7_EXISTING_MODULE_CONFLICT:'+path.basename(target));
  staged.push({from,target,sha256:hash(payload),exists});
 }
 const backup=live.runner+'.before-iran-news-r7';
 const next=live.runner+'.iran-news-r7.next';
 if(fs.existsSync(backup)||fs.existsSync(next))throw Error('R7_BACKUP_OR_STAGING_ALREADY_EXISTS');
 const report={status:'PASS_R7_NEWS_ONLY_PREFLIGHT',readOnly:true,task:TASK,
  scheduleHours:[0,6,12,18],launcherVerified:true,runnerOriginalSha256:EXPECTED_RUNNER_SHA,
  targetRunnerSha256:hash(replacement),newModules:staged.filter(f=>!f.exists).length,
  identicalModules:staged.filter(f=>f.exists).length,scoreFlowPreserved:true,sourceHead:EXPECTED_PC_HEAD};
 return {report,live,replacement,staged,backup,next,newsHome};
}

export function apply({stage,newsHome}={}){
 const c=preflight({stage,newsHome});
 const created=[];
 try{
  for(const file of c.staged){
   if(file.exists)continue;
   fs.mkdirSync(path.dirname(file.target),{recursive:true});
   fs.writeFileSync(file.target,safeFile(file.from),{flag:'wx'});
   created.push(file.target);
   if(hash(safeFile(file.target))!==file.sha256)throw Error('R7_MODULE_READBACK_FAILED');
  }
  // Verify news code against the actual operational cache before touching R3.
  const script=path.join(c.live.projectRoot,'scripts','iran-progress','news-display-maintenance-r1.mjs');
  const check=spawnSync(process.execPath,[script,'--dry-run'],{encoding:'utf8',windowsHide:true,timeout:20000,maxBuffer:65536});
  if(check.status!==0)throw Error('R7_NEWS_DRY_RUN_FAILED');
  const dry=JSON.parse(check.stdout.trim());
  if(dry.dryRun!==true||dry.publication!=='SKIPPED_DRY_RUN')throw Error('R7_NEWS_DRY_RUN_GATE_FAILED');
  // Only the verified existing runner changes; keep a recoverable exact backup.
  fs.copyFileSync(c.live.runner,c.backup,fs.constants.COPYFILE_EXCL);
  if(hash(safeFile(c.backup))!==EXPECTED_RUNNER_SHA)throw Error('R7_BACKUP_READBACK_FAILED');
  fs.writeFileSync(c.next,c.replacement,{flag:'wx'});
  if(hash(safeFile(c.next))!==c.report.targetRunnerSha256)throw Error('R7_STAGED_RUNNER_HASH_MISMATCH');
  replaceRunnerOnWindows(c.next,c.live.runner);
  if(hash(safeFile(c.live.runner))!==c.report.targetRunnerSha256)throw Error('R7_RUNNER_REPLACE_UNCERTAIN');
  return {...c.report,status:'PASS_R7_NEWS_ONLY_HOOK_INSTALLED',readOnly:false,
   maintenanceDryRun:'PASS',createdModules:created.length,runnerBackupVerified:true,
   schedulerModified:false,launcherModified:false,scoreLedgerModified:false,d1Written:false};
 }catch(error){
  const runnerHash=(()=>{try{return hash(safeFile(c.live.runner));}catch{return null;}})();
  // Do not remove modules if the new runner may already be active.
  if(runnerHash===EXPECTED_RUNNER_SHA){
   for(const target of created.reverse()){
    try{fs.unlinkSync(target);}catch{ /* Preserve unexpected changes. */ }
   }
   if(fs.existsSync(c.next)){try{fs.unlinkSync(c.next);}catch{ /* Preserve uncertain staging. */ }}
  }
  throw Error(error.message+(runnerHash!==EXPECTED_RUNNER_SHA?'_RUNNER_OUTCOME_REQUIRES_REVIEW':''));
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),flag=args[0],stageArg=args[1];
 if(args.length!==2||!['--preflight','--apply'].includes(flag)||!stageArg?.startsWith('--stage='))throw Error('R7_EXPLICIT_STAGE_AND_MODE_REQUIRED');
 if(flag==='--apply'&&process.env.ZGMINI_IRAN_NEWS_R7_APPROVED!=='YES')throw Error('R7_APPROVAL_GATE_REQUIRED');
 try{
  const stage=stageArg.slice('--stage='.length);
  console.log(JSON.stringify(flag==='--preflight'?preflight({stage}).report:apply({stage})));
 }catch(error){
  console.error(JSON.stringify({status:'STOP_R7_NEWS_ONLY_INSTALL',stage:flag,reason:error.message}));
  process.exitCode=1;
 }
}
