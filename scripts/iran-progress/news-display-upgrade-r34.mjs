// R34: upgrade only the installed private R24 publisher discovery module.
// Never edits the R13/R15/R29 runner, scheduled tasks, score, D1 or public news.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolvePcProject} from './news-display-upgrade-r32.mjs';

const RELATIVE='scripts/iran-progress/news-display-multisource-audit-r24.mjs';
const BEFORE='740de7c1199af6bf46a52085f096d37032937ba69da8c42a6a56d32a7ff496e7';
const AFTER='4fa111300ecc9f031132e4da93ba56b4ad235c1c28073e01e5398672b13b923c';
const R25_SHA='99858d37a345a49e6c464427beeb61c1da0a5bd671f712b8817e774234dfc985';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

function checkedBytes(filename){
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size===0||stat.size>1024*1024)
  throw Error('R34_MODULE_IDENTITY_UNSAFE');
 return fs.readFileSync(filename);
}

// R13 runs at 00/06/12/18 KST. Do not replace imports near those windows.
export function r34SafeInstallationTime(now=Date.now()){
 if(!Number.isSafeInteger(now))throw Error('R34_TIME_INVALID');
 const date=new Date(now+9*3600000);
 const minute=(date.getUTCHours()*60+date.getUTCMinutes())%360;
 return minute>=25&&minute<335;
}

export function planIranR34Upgrade({bundleRoot,projectRoot,now=Date.now()}={}){
 if(typeof bundleRoot!=='string'||typeof projectRoot!=='string'||
  !path.isAbsolute(bundleRoot)||!path.isAbsolute(projectRoot))
  throw Error('R34_ROOT_PATH_INVALID');
 const source=path.join(bundleRoot,...RELATIVE.split('/'));
 const destination=path.join(projectRoot,...RELATIVE.split('/'));
 if(hash(checkedBytes(source))!==AFTER)throw Error('R34_PACKAGE_CONTENT_DRIFT');
 if(hash(checkedBytes(path.join(projectRoot,'scripts','iran-progress',
  'news-display-article-audit-r25.mjs')))!==R25_SHA)
  throw Error('R34_R25_PARSER_IDENTITY_DRIFT');
 const actual=hash(checkedBytes(destination));
 if(actual!==BEFORE&&actual!==AFTER)throw Error('R34_PC_MODULE_DRIFT');
 const backup=destination+'.before-iran-news-r34';
 const staged=destination+'.iran-news-r34.next';
 if(fs.existsSync(staged))throw Error('R34_STAGING_REQUIRES_REVIEW');
 if(actual===BEFORE&&fs.existsSync(backup))throw Error('R34_BACKUP_ALREADY_EXISTS');
 if(actual===AFTER&&fs.existsSync(backup)&&hash(checkedBytes(backup))!==BEFORE)
  throw Error('R34_BACKUP_IDENTITY_DRIFT');
 const ready=r34SafeInstallationTime(now);
 return {status:actual===AFTER?'R34_ALREADY_INSTALLED':
  ready?'R34_PATCH_READY':'R34_NEAR_SCHEDULE_WINDOW_WAIT',
  state:actual===BEFORE?'BEFORE':'AFTER',source,destination,backup,staged,
  before:BEFORE,after:AFTER,relative:RELATIVE,
  schedulerModified:false,scoreLedgerModified:false,d1Written:false,
  publicCacheModified:false,translationModified:false};
}

export function applyIranR34Upgrade(plan,{now=Date.now()}={}){
 if(process.env.ZGMINI_IRAN_NEWS_R34_INSTALL_APPROVED!=='YES')
  throw Error('R34_EXPLICIT_APPROVAL_REQUIRED');
 if(plan.status==='R34_ALREADY_INSTALLED')return {status:'R34_ALREADY_INSTALLED',
  collectorExecuted:false,schedulerModified:false,d1Written:false};
 if(plan.status!=='R34_PATCH_READY'||plan.state!=='BEFORE'||
  !r34SafeInstallationTime(now))throw Error('R34_INSTALL_WINDOW_OR_PLAN_INVALID');
 try{
  if(hash(checkedBytes(plan.destination))!==plan.before)
   throw Error('R34_PC_CHANGED_DURING_INSTALL');
  // Exclusive backup/stage, no overwrite and no silent rollback.
  fs.copyFileSync(plan.destination,plan.backup,fs.constants.COPYFILE_EXCL);
  fs.copyFileSync(plan.source,plan.staged,fs.constants.COPYFILE_EXCL);
  if(hash(checkedBytes(plan.backup))!==plan.before||
   hash(checkedBytes(plan.staged))!==plan.after)
   throw Error('R34_STAGING_IDENTITY_DRIFT');
  if(hash(checkedBytes(plan.destination))!==plan.before)
   throw Error('R34_PC_CHANGED_DURING_INSTALL');
  fs.renameSync(plan.staged,plan.destination);
  if(hash(checkedBytes(plan.destination))!==plan.after)
   throw Error('R34_READBACK_DRIFT');
  return {status:'PASS_R34_ONE_PRIVATE_SOURCE_MODULE_INSTALLED',
   recoverableBackup:plan.backup,collectorExecuted:false,
   schedulerModified:false,scoreLedgerModified:false,d1Written:false,
   publicCacheModified:false,translationModified:false};
 }catch{
  // An uncertain outcome may contain valuable backups/staging. Stop here.
  throw Error('R34_INSTALL_OUTCOME_REQUIRES_REVIEW');
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2];
 if(process.argv.length!==3||!['--preflight','--install'].includes(mode)){
  console.error('STOP_R34_MODE_INVALID');process.exitCode=2;
 }else{
  try{
   const bundleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
   const projectRoot=resolvePcProject();
   const plan=planIranR34Upgrade({bundleRoot,projectRoot});
   const result=mode==='--preflight'?{status:plan.status,readOnly:true,
    relative:plan.relative,schedulerModified:false,d1Written:false}:
    applyIranR34Upgrade(plan);
   console.log(JSON.stringify(result));
   if(plan.status==='R34_NEAR_SCHEDULE_WINDOW_WAIT')process.exitCode=1;
  }catch(error){
   console.error(JSON.stringify({status:'STOP_R34',
    reason:/^R34_[A-Z0-9_]+$/.test(error?.message)?error.message:
     'R34_UNCLASSIFIED_FAILURE',schedulerModified:false,d1Written:false}));
   process.exitCode=1;
  }
 }
}
