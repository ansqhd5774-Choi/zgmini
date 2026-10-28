// R38: guarded, one-time installation of the two-stage news keyword rule.
// PC private collection modules only: no D1, scheduler, score or public-cache writes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {resolvePcProject} from './news-display-upgrade-r32.mjs';

const MODULES=Object.freeze([
 Object.freeze({relative:'scripts/iran-progress/news-display-discover-r1.mjs',
  before:'b5c2c133cfe178be735a462b2b6b46da8358234828d3a7abeacf9618c12a14a8',
  after:'f17ca0a97bbad8957ac19815387b3ce3702be0f1c1cbe9ec8d54a470f61aef86'}),
 Object.freeze({relative:'scripts/iran-progress/news-display-article-audit-r25.mjs',
  before:'99858d37a345a49e6c464427beeb61c1da0a5bd671f712b8817e774234dfc985',
  after:'e04e836abc891803e21c3875eb5ab5c9ff4adfda446089d24efb0a88f019131e'}),
]);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function checked(file,kind){
 let stat;
 try{stat=fs.lstatSync(file);}catch(error){
  if(error?.code==='ENOENT'||error?.code==='ENOTDIR')
   throw Error(kind==='BUNDLE'?'R38_PACKAGE_MODULE_MISSING':'R38_PC_MODULE_MISSING');
  if(error?.code==='EACCES'||error?.code==='EPERM')throw Error('R38_MODULE_ACCESS_DENIED');
  throw error;
 }
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>1024*1024)
  throw Error('R38_MODULE_IDENTITY_UNSAFE');
 return fs.readFileSync(file);
}
export function r38PreflightFailureReason(error){
 const message=error?.message;
 if(typeof message==='string'&&/^(R32|R38)_[A-Z0-9_]+$/.test(message))return message;
 if(error?.code==='ENOENT'||error?.code==='ENOTDIR')return 'R38_EXPECTED_FILE_MISSING';
 if(error?.code==='EACCES'||error?.code==='EPERM')return 'R38_ACCESS_DENIED';
 return 'R38_UNCLASSIFIED_FAILURE';
}
export function r38SafeInstallationTime(now=Date.now()){
 if(!Number.isSafeInteger(now))throw Error('R38_TIME_INVALID');
 const kst=new Date(now+9*3600000);
 const offset=(kst.getUTCHours()*60+kst.getUTCMinutes())%360;
 return offset>=25&&offset<335;
}
export function planIranR38Upgrade({bundleRoot,projectRoot,now=Date.now()}={}){
 if(typeof bundleRoot!=='string'||typeof projectRoot!=='string'||
  !path.isAbsolute(bundleRoot)||!path.isAbsolute(projectRoot))throw Error('R38_ROOT_INVALID');
 const checks=MODULES.map(({relative,before,after})=>{
  const source=path.join(bundleRoot,...relative.split('/'));
  const destination=path.join(projectRoot,...relative.split('/'));
  if(hash(checked(source,'BUNDLE'))!==after)throw Error('R38_BUNDLE_CONTENT_DRIFT');
  const actual=hash(checked(destination,'PC'));
  if(actual!==before&&actual!==after)throw Error('R38_PC_MODULE_DRIFT');
  const backup=destination+'.before-iran-news-r38';
  const staged=destination+'.iran-news-r38.next';
  if(fs.existsSync(staged))throw Error('R38_STAGING_REQUIRES_REVIEW');
  if(actual===before&&fs.existsSync(backup))throw Error('R38_BACKUP_ALREADY_EXISTS');
  if(actual===after&&fs.existsSync(backup)&&hash(checked(backup,'PC'))!==before)
   throw Error('R38_BACKUP_IDENTITY_DRIFT');
  return {relative,before,after,source,destination,backup,staged,
   state:actual===before?'BEFORE':'AFTER'};
 });
 if(new Set(checks.map(c=>c.state)).size!==1)throw Error('R38_PARTIAL_INSTALL_REQUIRES_REVIEW');
 const installed=checks[0].state==='AFTER';
 return {status:installed?'R38_ALREADY_INSTALLED':
  r38SafeInstallationTime(now)?'R38_PATCH_READY':'R38_NEAR_SCHEDULE_WINDOW_WAIT',
  checks,moduleCount:checks.length,schedulerModified:false,scoreLedgerModified:false,
  publicCacheModified:false,d1Written:false};
}
export function applyIranR38Upgrade(plan,{now=Date.now()}={}){
 if(process.env.ZGMINI_IRAN_NEWS_R38_INSTALL_APPROVED!=='YES')
  throw Error('R38_EXPLICIT_APPROVAL_REQUIRED');
 if(plan.status==='R38_ALREADY_INSTALLED')return {status:'R38_ALREADY_INSTALLED',
  installed:true,moduleCount:2,d1Written:false,schedulerModified:false};
 if(plan.status!=='R38_PATCH_READY'||plan.moduleCount!==2||
  !r38SafeInstallationTime(now))throw Error('R38_INSTALL_WINDOW_OR_PLAN_INVALID');
 try{
  // Validate and preserve both old modules before replacing either one.
  for(const c of plan.checks){
   if(hash(checked(c.destination,'PC'))!==c.before)throw Error('R38_PC_CHANGED_DURING_INSTALL');
   fs.copyFileSync(c.destination,c.backup,fs.constants.COPYFILE_EXCL);
   fs.copyFileSync(c.source,c.staged,fs.constants.COPYFILE_EXCL);
   if(hash(checked(c.backup,'PC'))!==c.before||hash(checked(c.staged,'PC'))!==c.after)
    throw Error('R38_STAGED_IDENTITY_DRIFT');
  }
  for(const c of plan.checks){
   if(hash(checked(c.destination,'PC'))!==c.before)throw Error('R38_PC_CHANGED_DURING_INSTALL');
   fs.renameSync(c.staged,c.destination);
   if(hash(checked(c.destination,'PC'))!==c.after)throw Error('R38_READBACK_DRIFT');
  }
  return {status:'PASS_R38_TWO_STAGE_KEYWORD_MODULES_INSTALLED',installed:true,
   moduleCount:2,backupsPreserved:true,schedulerModified:false,
   scoreLedgerModified:false,publicCacheModified:false,d1Written:false};
 }catch{throw Error('R38_INSTALL_OUTCOME_REQUIRES_REVIEW');}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2];
 if(process.argv.length!==3||!['--preflight','--install','--verify'].includes(mode)){
  console.error('STOP_R38_MODE_INVALID');process.exitCode=2;
 }else{
  try{
   const bundleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
   const projectRoot=resolvePcProject();
   const plan=planIranR38Upgrade({bundleRoot,projectRoot});
   const result=mode==='--install'?applyIranR38Upgrade(plan):
    {status:plan.status,readOnly:true,moduleCount:plan.moduleCount,
     schedulerModified:false,publicCacheModified:false,d1Written:false};
   if(mode==='--verify'&&plan.status!=='R38_ALREADY_INSTALLED')
    throw Error('R38_VERIFY_NOT_INSTALLED');
   console.log(JSON.stringify(result));
   if(plan.status==='R38_NEAR_SCHEDULE_WINDOW_WAIT')process.exitCode=1;
  }catch(error){console.error(JSON.stringify({status:'STOP_R38',
   reason:r38PreflightFailureReason(error),d1Written:false}));process.exitCode=1;}
 }
}
