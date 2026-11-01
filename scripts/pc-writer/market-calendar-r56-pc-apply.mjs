// R56: one-file, guarded PC source update for the already-installed R45 hook.
// The existing 5-minute Core task owns collection; this tool never starts it.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolveR51CoreOrigin} from './market-calendar-r51-core-origin.mjs';

const OLD_SOURCE='1afc5c7bb28c9d87acf03d85fe20ae3c45013fd3';
const WORKTREE_ID='d0a4b3cb8b95';
const TARGET='lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
const PROTECTED=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const sha=v=>createHash('sha256').update(v).digest('hex');
const normalize=v=>path.normalize(v).replaceAll('\\','/').toLowerCase();
const asSource=v=>/^[0-9a-f]{40}$/i.test(String(v??''))?String(v).toLowerCase():null;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const readTaskXml=()=>{
 const bytes=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:12000,maxBuffer:262144,stdio:['ignore','pipe','ignore']});
 return ((bytes[0]===255&&bytes[1]===254||bytes.includes(0))?
  bytes.toString('utf16le'):bytes.toString('utf8')).replace(/^\ufeff/,'');
};
const git=(root,args)=>execFileSync('git',args,{
 cwd:root,encoding:'utf8',windowsHide:true,timeout:25000,stdio:['ignore','pipe','pipe'],
}).trim();
function once(source,oldValue,newValue){
 const at=source.indexOf(oldValue);
 if(at<0||source.indexOf(oldValue,at+1)>=0)throw Error('R56_PATCH_ANCHOR_MISSING_OR_DUPLICATE_STOP');
 return source.slice(0,at)+newValue+source.slice(at+oldValue.length);
}
export function patchR56Provider(original){
 if(typeof original!=='string')throw Error('R56_INPUT_INVALID_STOP');
 const crlf=original.includes('\r\n');
 let next=original.replaceAll('\r\n','\n');
 next=once(next,'  B1_R3_MIN_COVERAGE,\n','');
 next=once(next,
  '  // An optional PC-private R45 observer reuses the two already downloaded files.\n'+
  '  // Its failure cannot change B1 source coverage, scoring, or fallbacks.\n'+
  '  if(typeof snapshotObserver==="function"&&built.coverage>=B1_R3_MIN_COVERAGE){',
  '  // R45 validates its own full-stock coverage independently of B1\'s S&P 500\n'+
  '  // matching threshold. A short B1 match must not discard already-fetched\n'+
  '  // full-stock rows; B1\'s coverage/fallback decision remains unchanged.\n'+
  '  // No additional request is made and any sidecar failure is non-blocking.\n'+
  '  if(typeof snapshotObserver==="function"){');
 return crlf?next.replaceAll('\n','\r\n'):next;
}
function lockState(file,now=Date.now()){
 let stat;
 try{stat=fs.lstatSync(file);}catch(error){
  return error?.code==='ENOENT'?'FREE':'UNKNOWN';
 }
 if(!stat.isFile()||stat.size<1||stat.size>4096)return 'UNKNOWN';
 let lock;
 try{lock=JSON.parse(fs.readFileSync(file,'utf8'));}catch{return 'UNKNOWN';}
 if(!Number.isSafeInteger(lock?.pid)||lock.pid<=0||
  !Number.isFinite(lock?.at)||lock.at>now+120000)return 'UNKNOWN';
 try{process.kill(lock.pid,0);return 'BUSY';}
 catch(error){return error?.code==='ESRCH'?'ORPHAN':'UNKNOWN';}
}
const codeFor=error=>{
 const message=String(error?.message??'');
 if(/^R56_[A-Z0-9_]{3,100}$/.test(message))return message;
 return ['EACCES','EPERM','ENOSPC','EROFS','EBUSY'].includes(error?.code)?
  'R56_OS_'+error.code+'_STOP':'R56_LOCAL_OPERATION_FAILED_STOP';
};
const stop=code=>{throw Error(code);};

export async function runR56PcApply({
 base=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 apply=false,waitMs=180000,wait=pause,
 taskXml=readTaskXml,resolveOrigin=resolveR51CoreOrigin,gitCall=git,
 allowNonWindows=false,
}={}){
 const output={audit:'MARKET_CALENDAR_R56_CORE_PASSIVE_R45_UPDATE',at:new Date().toISOString(),
  phase:'PREFLIGHT',decision:'R56_PREFLIGHT_INCOMPLETE_STOP',
  changedFiles:[],providerCallsAdded:0,forcedCollection:false,published:false,
  dbWrites:0,schedulerChanged:false,gitPushed:false,backupCreated:false,newSource:null};
 let root=null,head=null,configFile=null,configBytes=null,config=null,target=null;
 let before=null,after=null,beforeHash=null,afterHash=null;
 let lockFile=null,token=null,ownsLock=false,backupDir=null;
 let modified=false,committed=false;
 try{
  if(process.platform!=='win32'&&!allowNonWindows)stop('R56_WINDOWS_ONLY_STOP');
  if(Number(process.versions.node.split('.')[0])<24)stop('R56_NODE_24_REQUIRED_STOP');
  const trace=resolveOrigin(taskXml());
  if(trace?.status!=='R51_SCHEDULED_CORE_ORIGIN_RESOLVED'||!trace.root||
   trace.rootWorktreeId!==WORKTREE_ID)stop('R56_CORE_LAUNCHER_CHANGED_STOP');
  root=trace.root;output.worktreeId=trace.rootWorktreeId;
  if(normalize(gitCall(root,['rev-parse','--show-toplevel']))!==normalize(root))
   stop('R56_CORE_WORKTREE_MISMATCH_STOP');
  head=asSource(gitCall(root,['rev-parse','HEAD']));
  if(head!==OLD_SOURCE)stop('R56_APPROVED_SOURCE_CHANGED_STOP');
  output.previousSource=head;
  configFile=path.join(base,'config.json');configBytes=fs.readFileSync(configFile);
  config=JSON.parse(configBytes.toString('utf8'));
  if(config?.source!==head||config?.enabled!==true||config?.collectionTarget!=='pc')
   stop('R56_CONFIG_SOURCE_CHANGED_STOP');
  if(gitCall(root,['status','--porcelain','--untracked-files=no','--',...PROTECTED]))
   stop('R56_PROTECTED_SOURCE_DIRTY_STOP');
  target=path.join(root,...TARGET.split('/'));before=fs.readFileSync(target);
  // A clean approved PC commit may contain other valid provider changes.
  // Patch only two unique R45 anchors in the exact bytes found on that PC.
  // Full-file replacement by a packaged copy is forbidden.
  const source=before.toString('utf8');
  if(!Buffer.from(source,'utf8').equals(before))
   stop('R56_PROVIDER_ENCODING_UNVERIFIED_STOP');
  beforeHash=sha(before);
  after=Buffer.from(patchR56Provider(source),'utf8');
  afterHash=sha(after);
  if(after.equals(before))stop('R56_PATCH_EMPTY_STOP');
  gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);
  output.phase='PREFLIGHT_READY';
  if(!apply){output.decision='R56_PREFLIGHT_READY_NO_CHANGES';return output;}
  const until=Date.now()+Math.max(0,Math.min(180000,waitMs));
  lockFile=path.join(base,'local-cycle.lock');output.phase='CORE_LOCK_WAIT';
  for(;;){
   const state=lockState(lockFile);output.lastLockState=state;
   if(state==='ORPHAN')stop('R56_ORPHAN_CORE_LOCK_PRESERVED_STOP');
   if(state==='UNKNOWN')stop('R56_CORE_LOCK_UNVERIFIED_STOP');
   if(state==='FREE'){
    if(fs.existsSync(path.join(base,'quota-runner.lock')))
     stop('R56_QUOTA_LOCK_PRESERVED_STOP');
    try{
     token=JSON.stringify({pid:process.pid,at:Date.now(),purpose:'market-calendar-r56',nonce:randomUUID()});
     const fd=fs.openSync(lockFile,'wx');ownsLock=true;
     try{fs.writeFileSync(fd,token);}finally{fs.closeSync(fd);}
     break;
    }catch(error){if(error?.code!=='EEXIST')throw error;}
   }
   if(Date.now()>=until)stop('R56_NATURAL_CORE_LOCK_WINDOW_EXPIRED_STOP');
   await wait(Math.min(5000,Math.max(0,until-Date.now())));
  }
  output.phase='LOCKED_RECHECK';
  const again=resolveOrigin(taskXml());
  if(again?.status!=='R51_SCHEDULED_CORE_ORIGIN_RESOLVED'||
   normalize(again.root)!==normalize(root)||
   asSource(gitCall(root,['rev-parse','HEAD']))!==head||
   gitCall(root,['status','--porcelain','--untracked-files=no','--',...PROTECTED])||
   !fs.readFileSync(configFile).equals(configBytes)||
   !fs.readFileSync(target).equals(before)||
   fs.existsSync(path.join(base,'quota-runner.lock')))
   stop('R56_STATE_CHANGED_AFTER_LOCK_STOP');
  output.phase='BACKUP';
  backupDir=path.join(base,'market-calendar-r56-backups',
   'r56-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
  fs.copyFileSync(target,path.join(backupDir,'provider.mjs'));
  fs.copyFileSync(configFile,path.join(backupDir,'config.json'));
  if(sha(fs.readFileSync(path.join(backupDir,'provider.mjs')))!==beforeHash||
   !fs.readFileSync(path.join(backupDir,'config.json')).equals(configBytes))
   stop('R56_BACKUP_READBACK_FAILED_STOP');
  output.backupCreated=true;output.backupId=path.basename(backupDir);
  output.phase='PATCH';modified=true;
  fs.writeFileSync(target,after);
  if(sha(fs.readFileSync(target))!==afterHash)stop('R56_PROVIDER_READBACK_FAILED_STOP');
  output.changedFiles=[TARGET];
  output.phase='LOCAL_GIT_COMMIT';
  gitCall(root,['add','--',TARGET]);
  gitCall(root,['commit','--only','-m','fix(market-calendar): decouple R45 capture from B1 coverage','--',TARGET]);
  committed=true;
  const next=asSource(gitCall(root,['rev-parse','HEAD']));
  output.newSource=next;
  if(!next||asSource(gitCall(root,['rev-parse','HEAD^']))!==head||
   gitCall(root,['diff','--name-only',head,next,'--'])!==TARGET)
   stop('R56_COMMIT_SCOPE_MISMATCH_MANUAL_RECOVERY_STOP');
  output.phase='CONFIG_SOURCE_UPDATE';
  if(!fs.readFileSync(configFile).equals(configBytes))
   stop('R56_CONFIG_CHANGED_DURING_COMMIT_MANUAL_RECOVERY_STOP');
  const staged=path.join(backupDir,'config-new.json');
  fs.writeFileSync(staged,JSON.stringify({...config,source:next},null,2)+'\n',{flag:'wx'});
  fs.renameSync(staged,configFile);
  if(JSON.parse(fs.readFileSync(configFile,'utf8')).source!==next)
   stop('R56_CONFIG_READBACK_FAILED_MANUAL_RECOVERY_STOP');
  output.phase='INSTALLED';output.decision='R56_PC_R45_PASSIVE_CAPTURE_INSTALLED';
 }catch(error){
  output.errorCode=codeFor(error);
  output.decision=committed?'R56_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP':output.errorCode;
  if(modified&&!committed&&output.backupCreated){
   try{
    fs.copyFileSync(path.join(backupDir,'provider.mjs'),target);
    if(sha(fs.readFileSync(target))!==beforeHash)throw Error('ROLLBACK_HASH');
    gitCall(root,['restore','--staged','--',TARGET]);
    if(gitCall(root,['status','--porcelain','--',TARGET]))throw Error('ROLLBACK_STATUS');
    output.changedFiles=[];output.rolledBack=true;
   }catch{output.decision='R56_ROLLBACK_UNVERIFIED_MANUAL_RECOVERY_STOP';}
  }
 }finally{
  if(ownsLock){
   try{if(fs.readFileSync(lockFile,'utf8')===token)fs.unlinkSync(lockFile);
    else output.decision='R56_LOCK_OWNERSHIP_CHANGED_MANUAL_RECOVERY_STOP';}
   catch{output.decision='R56_CORE_LOCK_RELEASE_UNVERIFIED_STOP';}
  }
 }
 return output;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const baseArg=process.argv.find(x=>x.startsWith('--base='));
 const r=await runR56PcApply({apply:process.argv.includes('--apply'),
  ...(baseArg?{base:baseArg.slice(7)}:{})});
 console.log(JSON.stringify(r));
 if(!['R56_PC_R45_PASSIVE_CAPTURE_INSTALLED','R56_PREFLIGHT_READY_NO_CHANGES'].includes(r.decision))
  process.exitCode=2;
}
