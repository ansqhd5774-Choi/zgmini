// Opt-in, single-source-file removal of the historical R45 passive observer.
// It never starts Core, changes a scheduled task, collects data or publishes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const R45_OLD_COLLECTOR_BLOB='f940b9b3bdd32dc5cddba1ce97e5f048a52710ce';
export const R45_NEW_COLLECTOR_BLOB='40bd7edd08d2ff42bf2290e7955fc8318f1183f4';
const WORKTREE_ID='d0a4b3cb8b95';
// Exact PC-local HEAD reported by the user's successful R56 FIX1 installation.
const APPROVED_SOURCE='154c5ac25120ecf8292b630ca9b1e30edad1ed75';
const TARGET='scripts/pc-writer/collect-local.mjs';
const PROTECTED=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const sha256=x=>createHash('sha256').update(x).digest('hex');
const asSource=x=>/^[0-9a-f]{40}$/i.test(String(x??''))?String(x).toLowerCase():null;
const normalize=x=>path.normalize(x).replaceAll('\\','/').toLowerCase();
const stop=x=>{throw Error(x);};
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,
 timeout:25000,stdio:['ignore','pipe','pipe']}).trim();
const readTaskXml=()=>{
 const b=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:12000,maxBuffer:262144,stdio:['ignore','pipe','ignore']});
 return ((b[0]===255&&b[1]===254||b.includes(0))?b.toString('utf16le'):
  b.toString('utf8')).replace(/^\ufeff/,'');
};
const resolveOrigin=async xml=>{
 const {resolveR51CoreOrigin}=await import('./market-calendar-r51-core-origin.mjs');
 return resolveR51CoreOrigin(xml);
};
export function gitBlobSha(buffer){
 if(!Buffer.isBuffer(buffer))throw TypeError('R45_BLOB_BUFFER_REQUIRED');
 return createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');
}
function once(src,oldPart){
 const i=src.indexOf(oldPart);
 if(i<0||src.indexOf(oldPart,i+1)!==-1)stop('R45_DETACH_ANCHOR_UNVERIFIED_STOP');
 return src.slice(0,i)+src.slice(i+oldPart.length);
}
function normalizedSource(s){
 if(typeof s!=='string'||s.includes('\0'))stop('R45_DETACH_TEXT_INVALID_STOP');
 const lf=s.replaceAll('\r\n','\n');
 if(lf.includes('\r'))stop('R45_DETACH_MIXED_LINE_ENDINGS_STOP');
 return {lf,crlf:s.includes('\r\n')};
}
const BLOCK_A=" let r45Capture={status:'NOT_OBSERVED'};\n"+
 " env.R45_MARKETPARQUET_SNAPSHOT_OBSERVER=async snapshot=>{\n"+
 "  try{r45Capture=captureR45MarketParquetPair({base,...snapshot});}\n"+
 "  catch{r45Capture={status:'R45_CAPTURE_FAILED_PRESERVE_B1'};}\n"+
 " };\n";
const BLOCK_B='  report.marketCalendarR45={status:r45Capture.status,previous:r45Capture.previous?.status??null,\n'+
 '   current:r45Capture.current?.status??null,previousTickerCount:r45Capture.previous?.tickerCount??null,\n'+
 '   currentTickerCount:r45Capture.current?.tickerCount??null,providerCallsAdded:0,\n'+
 '   dbWrites:0,remoteWrites:0,published:false};\n';

export function patchR45Collector(source){
 const {lf,crlf}=normalizedSource(source);
 if(gitBlobSha(Buffer.from(lf))!==R45_OLD_COLLECTOR_BLOB)
  stop('R45_DETACH_OLD_FILE_BLOB_CHANGED_STOP');
 let next=lf;
 next=once(next,"import {captureR45MarketParquetPair} from './market-calendar-r45-marketparquet-capture.mjs';\n");
 next=once(next,BLOCK_A);
 next=once(next,BLOCK_B);
 if(gitBlobSha(Buffer.from(next))!==R45_NEW_COLLECTOR_BLOB)
  stop('R45_DETACH_NEW_FILE_BLOB_UNVERIFIED_STOP');
 if(/R45_MARKETPARQUET_SNAPSHOT_OBSERVER|r45Capture|marketCalendarR45|captureR45MarketParquetPair/.test(next))
  stop('R45_DETACH_OBSERVER_REMAINS_STOP');
 return crlf?next.replaceAll('\n','\r\n'):next;
}

function lockState(file){
 let stat;
 try{stat=fs.lstatSync(file);}catch(e){return e?.code==='ENOENT'?'FREE':'UNKNOWN';}
 if(!stat.isFile()||stat.size<1||stat.size>4096)return 'UNKNOWN';
 let lock;
 try{lock=JSON.parse(fs.readFileSync(file,'utf8'));}catch{return 'UNKNOWN';}
 if(!Number.isSafeInteger(lock?.pid)||lock.pid<=0||!Number.isFinite(lock?.at)||
  lock.at>Date.now()+120000)return 'UNKNOWN';
 try{process.kill(lock.pid,0);return 'BUSY';}
 catch(e){return e?.code==='ESRCH'?'ORPHAN':'UNKNOWN';}
}
const codeFor=error=>{
 const message=String(error?.message??'');
 if(/^R45_DETACH_[A-Z0-9_]{3,100}$/.test(message))return message;
 return ['EACCES','EPERM','ENOSPC','EROFS','EBUSY'].includes(error?.code)?
  'R45_DETACH_OS_'+error.code+'_STOP':'R45_DETACH_LOCAL_OPERATION_FAILED_STOP';
};

export async function runR45PcDetach({
 base=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 apply=false, taskXml=readTaskXml,resolveCore=resolveOrigin,gitCall=git,
 allowNonWindows=false,
}={}){
 const out={audit:'MARKET_CALENDAR_R45_PC_DETACH_R1',at:new Date().toISOString(),
  phase:'PREFLIGHT',decision:'R45_DETACH_PREFLIGHT_INCOMPLETE_STOP',
  changedFiles:[],backupCreated:false,providerCallsAdded:0,forcedCollection:false,
  published:false,dbWrites:0,schedulerChanged:false,gitPushed:false,newSource:null};
 let root,head,configPath,configBefore,target,before,after,beforeHash,afterHash;
 let lockFile,lockToken,ownsLock=false,backupDir,modified=false,committed=false;
 try{
  if(process.platform!=='win32'&&!allowNonWindows)stop('R45_DETACH_WINDOWS_ONLY_STOP');
  if(Number(process.versions.node.split('.')[0])<24)stop('R45_DETACH_NODE_24_REQUIRED_STOP');
  // This hint is read-only even if launcher resolution fails. Publish no
  // config body, paths, provider settings or credentials in diagnostics.
  out.configSourceMatchesApproved=null;
  try{
   const hintPath=path.join(base,'config.json'),stat=fs.statSync(hintPath);
   if(stat.isFile()&&stat.size>0&&stat.size<=65536){
    const hint=JSON.parse(fs.readFileSync(hintPath,'utf8'));
    out.configSourceMatchesApproved=asSource(hint?.source)===APPROVED_SOURCE;
   }
  }catch{/* No config evidence before trusted Task-origin resolution. */}
  const origin=await resolveCore(taskXml());
  // R51 deliberately rejects wrapper drift. Expose only bounded, non-secret
  // contract status, never the scheduled command, filesystem paths or Task XML.
  out.originStatus=typeof origin?.status==='string'&&/^R5[01]_[A-Z0-9_]{3,100}$/.test(origin.status)?origin.status:'R45_ORIGIN_STATUS_UNAVAILABLE';
  out.originWorktreeId=typeof origin?.rootWorktreeId==='string'&&/^[a-f0-9]{12}$/.test(origin.rootWorktreeId)?origin.rootWorktreeId:null;
  out.originOuterHashMatched=origin?.outerHashMatched===true;
  out.originCoreVbsCount=Number.isInteger(origin?.coreVbsCount)&&origin.coreVbsCount>=0&&origin.coreVbsCount<=3?origin.coreVbsCount:null;
  if(origin?.status!=='R51_SCHEDULED_CORE_ORIGIN_RESOLVED'||!origin.root||
   origin.rootWorktreeId!==WORKTREE_ID)stop('R45_DETACH_CORE_LAUNCHER_CHANGED_STOP');
  root=origin.root;out.worktreeId=origin.rootWorktreeId;
  if(normalize(gitCall(root,['rev-parse','--show-toplevel']))!==normalize(root))
   stop('R45_DETACH_WORKTREE_MISMATCH_STOP');
  head=asSource(gitCall(root,['rev-parse','HEAD']));out.previousSource=head;
  if(!head)stop('R45_DETACH_SOURCE_INVALID_STOP');
  configPath=path.join(base,'config.json');configBefore=fs.readFileSync(configPath);
  const config=JSON.parse(configBefore.toString('utf8'));
  if(asSource(config?.source)!==head||config?.enabled!==true||
   config?.collectionTarget!=='pc')stop('R45_DETACH_CONFIG_SOURCE_CHANGED_STOP');
  if(gitCall(root,['status','--porcelain','--untracked-files=no','--',...PROTECTED]))
   stop('R45_DETACH_PROTECTED_SOURCE_DIRTY_STOP');
  target=path.join(root,...TARGET.split('/'));
  if(!fs.lstatSync(target).isFile())stop('R45_DETACH_TARGET_NOT_REGULAR_FILE_STOP');
  before=fs.readFileSync(target);
  const source=before.toString('utf8');
  if(!Buffer.from(source,'utf8').equals(before))stop('R45_DETACH_ENCODING_UNVERIFIED_STOP');
  const {lf}=normalizedSource(source);
  const blob=gitBlobSha(Buffer.from(lf));
  if(blob===R45_NEW_COLLECTOR_BLOB){
   out.phase='ALREADY_DETACHED';out.decision='R45_DETACH_ALREADY_OFF_NO_CHANGES';return out;
  }
  if(head!==APPROVED_SOURCE)stop('R45_DETACH_APPROVED_SOURCE_CHANGED_STOP');
  if(blob!==R45_OLD_COLLECTOR_BLOB)stop('R45_DETACH_OLD_FILE_BLOB_CHANGED_STOP');
  after=Buffer.from(patchR45Collector(source),'utf8');
  beforeHash=sha256(before);afterHash=sha256(after);
  gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);
  out.phase='PREFLIGHT_READY';
  if(!apply){out.decision='R45_DETACH_PREFLIGHT_READY_NO_CHANGES';return out;}
  lockFile=path.join(base,'local-cycle.lock');out.phase='CORE_LOCK_CHECK';
  const state=lockState(lockFile);out.lastLockState=state;
  if(state!=='FREE')stop('R45_DETACH_CORE_LOCK_'+state+'_STOP');
  if(fs.existsSync(path.join(base,'quota-runner.lock')))
   stop('R45_DETACH_QUOTA_LOCK_PRESERVED_STOP');
  lockToken=JSON.stringify({pid:process.pid,at:Date.now(),purpose:'market-calendar-r45-detach',nonce:randomUUID()});
  try{const fd=fs.openSync(lockFile,'wx');ownsLock=true;
   try{fs.writeFileSync(fd,lockToken);}finally{fs.closeSync(fd);}}
  catch(e){if(e?.code==='EEXIST')stop('R45_DETACH_CORE_LOCK_RACED_STOP');throw e;}
  out.phase='LOCKED_RECHECK';
  const again=await resolveCore(taskXml());
  if(again?.status!=='R51_SCHEDULED_CORE_ORIGIN_RESOLVED'||
   normalize(again.root)!==normalize(root)||
   asSource(gitCall(root,['rev-parse','HEAD']))!==head||
   gitCall(root,['status','--porcelain','--untracked-files=no','--',...PROTECTED])||
   !fs.readFileSync(configPath).equals(configBefore)||
   !fs.readFileSync(target).equals(before)||
   fs.existsSync(path.join(base,'quota-runner.lock')))
   stop('R45_DETACH_STATE_CHANGED_AFTER_LOCK_STOP');
  out.phase='BACKUP';
  backupDir=path.join(base,'market-calendar-r45-detach-backups',
   'r45-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
  fs.copyFileSync(target,path.join(backupDir,'collect-local.mjs'));
  fs.copyFileSync(configPath,path.join(backupDir,'config.json'));
  if(sha256(fs.readFileSync(path.join(backupDir,'collect-local.mjs')))!==beforeHash||
   !fs.readFileSync(path.join(backupDir,'config.json')).equals(configBefore))
   stop('R45_DETACH_BACKUP_READBACK_FAILED_STOP');
  out.backupCreated=true;out.backupId=path.basename(backupDir);
  out.phase='PATCH';modified=true;
  fs.writeFileSync(target,after);
  if(sha256(fs.readFileSync(target))!==afterHash)
   stop('R45_DETACH_WRITE_READBACK_FAILED_STOP');
  out.changedFiles=[TARGET];out.phase='LOCAL_GIT_COMMIT';
  gitCall(root,['add','--',TARGET]);
  gitCall(root,['commit','--only','-m','fix(market-calendar): detach unneeded R45 Core observer','--',TARGET]);
  committed=true;
  const next=asSource(gitCall(root,['rev-parse','HEAD']));out.newSource=next;
  if(!next||asSource(gitCall(root,['rev-parse','HEAD^']))!==head||
   asSource(gitCall(root,['rev-parse',`HEAD:${TARGET}`]))!==R45_NEW_COLLECTOR_BLOB||
   sha256(fs.readFileSync(target))!==afterHash||
   gitCall(root,['diff','--name-only',head,next,'--'])!==TARGET)
   stop('R45_DETACH_COMMIT_SCOPE_MISMATCH_MANUAL_RECOVERY_STOP');
  out.phase='CONFIG_SOURCE_UPDATE';
  if(!fs.readFileSync(configPath).equals(configBefore))
   stop('R45_DETACH_CONFIG_CHANGED_DURING_COMMIT_MANUAL_RECOVERY_STOP');
  const nextConfig=JSON.parse(configBefore.toString('utf8'));
  const staged=path.join(backupDir,'config-new.json');
  fs.writeFileSync(staged,JSON.stringify({...nextConfig,source:next},null,2)+'\n',{flag:'wx'});
  fs.renameSync(staged,configPath);
  if(JSON.parse(fs.readFileSync(configPath,'utf8')).source!==next)
   stop('R45_DETACH_CONFIG_READBACK_FAILED_MANUAL_RECOVERY_STOP');
  out.phase='INSTALLED';out.decision='R45_DETACH_INSTALLED_LOCAL_ONLY';
 }catch(e){
  out.errorCode=codeFor(e);
  out.decision=committed?'R45_DETACH_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP':out.errorCode;
  if(modified&&!committed&&out.backupCreated){
   // git commit may have succeeded even if its caller threw/timed out: do not
   // restore against a newly advanced HEAD or another actor's changed file.
   let oldHeadUnchanged=false;
   try{oldHeadUnchanged=asSource(gitCall(root,['rev-parse','HEAD']))===head;}
   catch{oldHeadUnchanged=false;}
   if(!oldHeadUnchanged)out.decision='R45_DETACH_SOURCE_ADVANCED_MANUAL_RECOVERY_STOP';
   else{
    try{
     if(sha256(fs.readFileSync(target))!==afterHash)
      throw Error('R45_DETACH_TARGET_CHANGED_DURING_RECOVERY_STOP');
     fs.copyFileSync(path.join(backupDir,'collect-local.mjs'),target);
     if(sha256(fs.readFileSync(target))!==beforeHash)throw Error('RESTORE_HASH');
     gitCall(root,['restore','--staged','--',TARGET]);
     if(gitCall(root,['status','--porcelain','--',TARGET]))throw Error('RESTORE_STATUS');
     out.changedFiles=[];out.rolledBack=true;
    }catch{out.decision='R45_DETACH_ROLLBACK_UNVERIFIED_MANUAL_RECOVERY_STOP';}
   }
  }
 }finally{
  if(ownsLock){
   try{if(fs.readFileSync(lockFile,'utf8')===lockToken)fs.unlinkSync(lockFile);
    else out.decision='R45_DETACH_LOCK_OWNERSHIP_CHANGED_MANUAL_RECOVERY_STOP';}
   catch{out.decision='R45_DETACH_CORE_LOCK_RELEASE_UNVERIFIED_STOP';}
  }
 }
 return out;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const baseArg=process.argv.find(a=>a.startsWith('--base='));
 const result=await runR45PcDetach({apply:process.argv.includes('--apply'),
  ...(baseArg?{base:baseArg.slice(7)}:{})});
 console.log(JSON.stringify(result));
 if(!['R45_DETACH_INSTALLED_LOCAL_ONLY','R45_DETACH_PREFLIGHT_READY_NO_CHANGES',
  'R45_DETACH_ALREADY_OFF_NO_CHANGES'].includes(result.decision))process.exitCode=2;
}
