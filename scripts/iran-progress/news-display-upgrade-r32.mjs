// R32: offline, guarded upgrade of exactly two already-installed private news
// discovery/audit modules. Does not run a collector, scheduler or publisher.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseLauncherScript} from './news-display-chain-audit-r6.mjs';

const MODULES=Object.freeze([
 {relative:'scripts/iran-progress/news-display-multisource-audit-r24.mjs',
  before:'fef3597320f54d61267c37ee1f665619434cd434adced38d6f254c3abf53ec11',
  after:'740de7c1199af6bf46a52085f096d37032937ba69da8c42a6a56d32a7ff496e7'},
 {relative:'scripts/iran-progress/news-display-article-audit-r25.mjs',
  before:'da9a809f07563e2766efa024341b63d629698aed53ffb92a4af6a8226c303187',
  after:'99858d37a345a49e6c464427beeb61c1da0a5bd671f712b8817e774234dfc985'},
]);
const VBS_SHA='a26e561964a5d4b88a02f81185221c1d3d770541c2cc12d6ceca5898e2228846';
const INSTALLED_R29_SHA='9cc3a7b9df6a33655321fdcf9565d1e6e5afe8ee6ac88bb6df6b795feda7b3dd';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

function checkedBytes(filename){
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1024*1024)
  throw Error('R32_UNSAFE_MODULE_OR_LAUNCHER');
 return fs.readFileSync(filename);
}

export function planIranR32Upgrade({bundleRoot,projectRoot}){
 if(!path.isAbsolute(bundleRoot)||!path.isAbsolute(projectRoot))
  throw Error('R32_ROOT_PATH_INVALID');
 const checks=MODULES.map(({relative,before,after})=>{
  const source=path.join(bundleRoot,...relative.split('/'));
  const destination=path.join(projectRoot,...relative.split('/'));
  if(hash(checkedBytes(source))!==after)throw Error('R32_PACKAGE_CONTENT_DRIFT');
  const actual=hash(checkedBytes(destination));
  if(actual!==before&&actual!==after)throw Error('R32_PC_MODULE_DRIFT');
  const backup=destination+'.before-iran-news-r32',staged=destination+'.iran-news-r32.next';
  if(fs.existsSync(staged))throw Error('R32_STAGING_REQUIRES_REVIEW');
  if(actual===before&&fs.existsSync(backup))throw Error('R32_BACKUP_ALREADY_EXISTS');
  if(actual===after&&fs.existsSync(backup)&&hash(checkedBytes(backup))!==before)
   throw Error('R32_EXISTING_BACKUP_DRIFT');
  return {relative,source,destination,backup,staged,before,after,
   state:actual===before?'BEFORE':'AFTER'};
 });
 const states=checks.map(item=>item.state);
 if(new Set(states).size>1)throw Error('R32_PARTIAL_INSTALL_REQUIRES_REVIEW');
 return {status:states[0]==='AFTER'?'R32_ALREADY_INSTALLED':'R32_PATCH_READY',
  moduleCount:checks.length,checks,pcRunnerModified:false,
  schedulerModified:false,scoreLedgerModified:false,d1Written:false,
  publicCacheModified:false,translationModified:false};
}

export function applyIranR32Upgrade(plan){
 if(process.env.ZGMINI_IRAN_NEWS_R32_INSTALL_APPROVED!=='YES')
  throw Error('R32_EXPLICIT_APPROVAL_REQUIRED');
 if(plan.status==='R32_ALREADY_INSTALLED')return {...plan,status:'R32_ALREADY_INSTALLED'};
 if(plan.status!=='R32_PATCH_READY'||plan.moduleCount!==2)
  throw Error('R32_INSTALL_PLAN_INVALID');
 try{
  // Prepare recoverable copies of both original modules before replacement.
  for(const item of plan.checks){
   if(hash(checkedBytes(item.destination))!==item.before)
    throw Error('R32_PC_CHANGED_DURING_INSTALL');
   fs.copyFileSync(item.destination,item.backup,fs.constants.COPYFILE_EXCL);
   fs.copyFileSync(item.source,item.staged,fs.constants.COPYFILE_EXCL);
   if(hash(checkedBytes(item.backup))!==item.before||
    hash(checkedBytes(item.staged))!==item.after)
    throw Error('R32_STAGED_MODULE_DRIFT');
  }
  for(const item of plan.checks){
   if(hash(checkedBytes(item.destination))!==item.before)
    throw Error('R32_PC_CHANGED_DURING_INSTALL');
   fs.renameSync(item.staged,item.destination);
   if(hash(checkedBytes(item.destination))!==item.after)
    throw Error('R32_MODULE_READBACK_FAILED');
  }
  return {status:'PASS_R32_TWO_PRIVATE_MODULES_INSTALLED',moduleCount:2,
   oldModulesBackedUp:true,schedulerModified:false,pcRunnerModified:false,
   scoreLedgerModified:false,d1Written:false,publicCacheModified:false,
   translationModified:false,collectorExecuted:false};
 }catch{
  // Keep staged files and backups: a partial replacement must be investigated.
  throw Error('R32_INSTALL_OUTCOME_REQUIRES_REVIEW');
 }
}

export function resolvePcProject(){
 const newsHome=process.env.ZGMINI_IRAN_HOME??
  path.join(os.homedir(),'.zgmini','iran-progress-r13');
 const vbs=checkedBytes(path.join(newsHome,'run-articles.vbs'));
 if(hash(vbs)!==VBS_SHA)throw Error('R32_PC_VBS_IDENTITY_DRIFT');
 const entry=parseLauncherScript(vbs.toString('utf8'));
 if(path.win32.basename(entry.scriptPath).toLowerCase()!=='run-reference-flow-r3.mjs'||
  hash(checkedBytes(entry.scriptPath))!==INSTALLED_R29_SHA)
  throw Error('R32_PC_R29_RUNNER_IDENTITY_DRIFT');
 return path.resolve(path.dirname(entry.scriptPath),'../..');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2];
 if(process.argv.length!==3||!['--preflight','--install'].includes(mode)){
  console.error(JSON.stringify({status:'STOP_R32_MODE_INVALID'}));process.exitCode=2;
 }else{
  try{
   const bundleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
   const projectRoot=resolvePcProject();
   const plan=planIranR32Upgrade({bundleRoot,projectRoot});
   const outcome=mode==='--preflight'?{status:plan.status,moduleCount:plan.moduleCount,
    readOnly:true,schedulerModified:false,scoreLedgerModified:false,d1Written:false}:
    applyIranR32Upgrade(plan);
   console.log(JSON.stringify(outcome));
  }catch(error){
   const reason=/^R32_[A-Z0-9_]+$/.test(error?.message)?error.message:
    'R32_UNCLASSIFIED_FAILURE';
   console.error(JSON.stringify({status:'STOP_R32',reason,
    schedulerModified:false,scoreLedgerModified:false,d1Written:false}));
   process.exitCode=1;
  }
 }
}
