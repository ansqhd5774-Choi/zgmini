// R35: replace only two private DISPLAY source modules after R34, leaving the
// seven-source R3 score feeds, job registration, D1 and public news untouched.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolvePcProject} from './news-display-upgrade-r32.mjs';

const MODULES=Object.freeze([
 Object.freeze({relative:'scripts/iran-progress/news-display-multisource-audit-r24.mjs',
  before:'4fa111300ecc9f031132e4da93ba56b4ad235c1c28073e01e5398672b13b923c',
  after:'6140a4031cb0235f6360f5b05cceb916611d34c4b74a5279f446588ae4c8d6fa'}),
 Object.freeze({relative:'scripts/iran-progress/news-display-source-registry-r26.mjs',
  before:'95989b3119bdf804823e77dfd0a81850c48b56b8192242879f1eec0c67230d01',
  after:'87744873c87d7aaacb7d760f8a0613c8b971d1562a03857ca6dbd82583302790'}),
]);
const R25_SHA='99858d37a345a49e6c464427beeb61c1da0a5bd671f712b8817e774234dfc985';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

function checked(file){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size===0||stat.size>1024*1024)
  throw Error('R35_MODULE_IDENTITY_UNSAFE');
 return fs.readFileSync(file);
}

// The R13 job normally starts at 00/06/12/18 KST; avoid +/-25 minutes.
export function r35SafeInstallationTime(now=Date.now()){
 if(!Number.isSafeInteger(now))throw Error('R35_TIME_INVALID');
 const d=new Date(now+9*3600000);
 const offset=(d.getUTCHours()*60+d.getUTCMinutes())%360;
 return offset>=25&&offset<335;
}

export function planIranR35Upgrade({bundleRoot,projectRoot,now=Date.now()}={}){
 if(typeof bundleRoot!=='string'||typeof projectRoot!=='string'||
  !path.isAbsolute(bundleRoot)||!path.isAbsolute(projectRoot))
  throw Error('R35_ROOT_PATH_INVALID');
 if(sha(checked(path.join(projectRoot,'scripts','iran-progress',
  'news-display-article-audit-r25.mjs')))!==R25_SHA)
  throw Error('R35_PC_R25_MODULE_DRIFT');
 const checks=MODULES.map(({relative,before,after})=>{
  const name=relative.split('/');
  const source=path.join(bundleRoot,...name),destination=path.join(projectRoot,...name);
  if(sha(checked(source))!==after)throw Error('R35_PACKAGE_CONTENT_DRIFT');
  const actual=sha(checked(destination));
  if(actual!==before&&actual!==after)throw Error('R35_PC_MODULE_DRIFT');
  const backup=destination+'.before-iran-news-r35';
  const staged=destination+'.iran-news-r35.next';
  if(fs.existsSync(staged))throw Error('R35_STAGING_REQUIRES_REVIEW');
  if(actual===before&&fs.existsSync(backup))throw Error('R35_BACKUP_ALREADY_EXISTS');
  if(actual===after&&fs.existsSync(backup)&&sha(checked(backup))!==before)
   throw Error('R35_EXISTING_BACKUP_DRIFT');
  return {relative,before,after,source,destination,backup,staged,
   state:actual===before?'BEFORE':'AFTER'};
 });
 const states=checks.map(c=>c.state);
 if(new Set(states).size!==1)throw Error('R35_PARTIAL_INSTALL_REQUIRES_REVIEW');
 return {status:states[0]==='AFTER'?'R35_ALREADY_INSTALLED':
  r35SafeInstallationTime(now)?'R35_PATCH_READY':'R35_NEAR_SCHEDULE_WINDOW_WAIT',
  checks,moduleCount:2,schedulerModified:false,pcRunnerModified:false,
  scoreLedgerModified:false,d1Written:false,publicCacheModified:false};
}

export function applyIranR35Upgrade(plan,{now=Date.now()}={}){
 if(process.env.ZGMINI_IRAN_NEWS_R35_INSTALL_APPROVED!=='YES')
  throw Error('R35_EXPLICIT_APPROVAL_REQUIRED');
 if(plan.status==='R35_ALREADY_INSTALLED')return {status:'R35_ALREADY_INSTALLED',
  moduleCount:2,collectorExecuted:false,schedulerModified:false,d1Written:false};
 if(plan.status!=='R35_PATCH_READY'||plan.moduleCount!==2||
  !r35SafeInstallationTime(now))throw Error('R35_INSTALL_WINDOW_OR_PLAN_INVALID');
 try{
  // Both backups and both staged modules must pass integrity checks BEFORE
  // either live module is replaced. A partial outcome requires manual review.
  for(const c of plan.checks){
   if(sha(checked(c.destination))!==c.before)throw Error('R35_PC_CHANGED_DURING_INSTALL');
   fs.copyFileSync(c.destination,c.backup,fs.constants.COPYFILE_EXCL);
   fs.copyFileSync(c.source,c.staged,fs.constants.COPYFILE_EXCL);
   if(sha(checked(c.backup))!==c.before||sha(checked(c.staged))!==c.after)
    throw Error('R35_STAGED_IDENTITY_DRIFT');
  }
  for(const c of plan.checks){
   if(sha(checked(c.destination))!==c.before)throw Error('R35_PC_CHANGED_DURING_INSTALL');
   fs.renameSync(c.staged,c.destination);
   if(sha(checked(c.destination))!==c.after)throw Error('R35_READBACK_DRIFT');
  }
  return {status:'PASS_R35_TWO_PRIVATE_DISPLAY_MODULES_INSTALLED',moduleCount:2,
   oldModulesBackedUp:true,collectorExecuted:false,schedulerModified:false,
   pcRunnerModified:false,scoreLedgerModified:false,d1Written:false,
   publicCacheModified:false,translationModified:false};
 }catch{throw Error('R35_INSTALL_OUTCOME_REQUIRES_REVIEW');}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2];
 if(process.argv.length!==3||!['--preflight','--install'].includes(mode)){
  console.error('STOP_R35_MODE_INVALID');process.exitCode=2;
 }else{
  try{
   const bundleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
   const projectRoot=resolvePcProject();
   const plan=planIranR35Upgrade({bundleRoot,projectRoot});
   const result=mode==='--preflight'?{status:plan.status,moduleCount:plan.moduleCount,
    readOnly:true,retiredSources:['iaea-news','iaea-statements'],
    replacementSources:['guardian-iran','dw-world'],schedulerModified:false,d1Written:false}:
    applyIranR35Upgrade(plan);
   console.log(JSON.stringify(result));
   if(plan.status==='R35_NEAR_SCHEDULE_WINDOW_WAIT')process.exitCode=1;
  }catch(error){
   console.error(JSON.stringify({status:'STOP_R35',
    reason:/^R35_[A-Z0-9_]+$/.test(error?.message)?error.message:
     'R35_UNCLASSIFIED_FAILURE',schedulerModified:false,d1Written:false}));
   process.exitCode=1;
  }
 }
}
