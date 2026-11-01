// Guarded one-file PC R45 observer detachment for the exact 2026-11-01
// observed Core source. Preflight is read-only; apply is explicit and gated.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {traceLiveCore} from './market-calendar-r45-pc-live-inventory.mjs';

const APPROVED_HEAD='76373239406eef471904807840e1c77b2653b7e4';
const EXPECTED_RAW_BLOB='b7fe36348e5faab717a15d056cf72d2f5f64359c';
const EXPECTED_VBS=[
 '9d5bc3429cd74813207cfc393eb04eff11a78106096964b80bf7833440385b7c',
 'bb3e11c0b5c8da07162b1c824e7b52e7a7c2f987c079f29713211a2413932b01',
 '10e244dfa8a48a1457604341ab09440239ba4996a752e56f2f89927fd82fbe69'];
const WORKTREE_ID='d0a4b3cb8b95';
const TARGET='scripts/pc-writer/collect-local.mjs';
const PROTECTED=['lib','worker','scripts/pc-writer','package.json','package-lock.json'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
const asSha=s=>/^[a-f0-9]{40}$/i.test(String(s??''))?String(s).toLowerCase():null;
const norm=p=>path.normalize(p).replaceAll('\\','/').toLowerCase();
const fail=code=>{throw Error(code);};
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,
 timeout:25000,stdio:['ignore','pipe','pipe']}).trim();
const task=()=>{
 const b=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],
  {windowsHide:true,timeout:15000,maxBuffer:262144,stdio:['ignore','pipe','ignore']});
 return ((b[0]===255&&b[1]===254)||b.includes(0)?b.toString('utf16le'):
  b.toString('utf8')).replace(/^\ufeff/,'');
};
const IMPORT="import {captureR45MarketParquetPair} from './market-calendar-r45-marketparquet-capture.mjs';\n";
const OBSERVER=" let r45Capture={status:'NOT_OBSERVED'};\n"+
 " env.R45_MARKETPARQUET_SNAPSHOT_OBSERVER=async snapshot=>{\n"+
 "  try{r45Capture=captureR45MarketParquetPair({base,...snapshot});}\n"+
 "  catch{r45Capture={status:'R45_CAPTURE_FAILED_PRESERVE_B1'};}\n"+
 " };\n";
const REPORT='  report.marketCalendarR45={status:r45Capture.status,previous:r45Capture.previous?.status??null,\n'+
 '   current:r45Capture.current?.status??null,previousTickerCount:r45Capture.previous?.tickerCount??null,\n'+
 '   currentTickerCount:r45Capture.current?.tickerCount??null,providerCallsAdded:0,\n'+
 '   dbWrites:0,remoteWrites:0,published:false};\n';
function removeOnce(source,part){
 const i=source.indexOf(part);
 if(i<0||source.indexOf(part,i+part.length)!==-1)fail('R45_CURRENT_ANCHOR_CHANGED_STOP');
 return source.slice(0,i)+source.slice(i+part.length);
}
export function removeCurrentR45Observer(original){
 if(typeof original!=='string'||original.includes('\0'))fail('R45_CURRENT_INVALID_TEXT_STOP');
 const lf=original.replaceAll('\r\n','\n');
 if(lf.includes('\r'))fail('R45_CURRENT_LINE_ENDINGS_UNVERIFIED_STOP');
 let next=removeOnce(lf,IMPORT);
 next=removeOnce(next,OBSERVER);
 next=removeOnce(next,REPORT);
 if(/R45_MARKETPARQUET_SNAPSHOT_OBSERVER|r45Capture|marketCalendarR45|captureR45MarketParquetPair/.test(next))
  fail('R45_CURRENT_OTHER_OBSERVER_REFERENCE_STOP');
 return original.includes('\r\n')?next.replaceAll('\n','\r\n'):next;
}
function readFile(file,max=5242880){
 const s=fs.lstatSync(file);
 if(!s.isFile()||s.size<1||s.size>max)fail('R45_CURRENT_TARGET_INVALID_STOP');
 return fs.readFileSync(file);
}
function lockState(file){
 let s;
 try{s=fs.lstatSync(file);}catch(e){return e?.code==='ENOENT'?'FREE':'UNKNOWN';}
 if(!s.isFile()||s.size<1||s.size>4096)return 'UNKNOWN';
 let value;
 try{value=JSON.parse(fs.readFileSync(file,'utf8'));}catch{return 'UNKNOWN';}
 if(!Number.isSafeInteger(value?.pid)||value.pid<=0||!Number.isFinite(value?.at)||
  value.at>Date.now()+120000)return 'UNKNOWN';
 try{process.kill(value.pid,0);return 'BUSY';}
 catch(e){return e?.code==='ESRCH'?'ORPHAN':'UNKNOWN';}
}
const errorCode=e=>{
 const v=String(e?.message??'');
 if(/^R45_CURRENT_[A-Z0-9_]{3,100}$/.test(v))return v;
 return ['EACCES','EPERM','EBUSY','EROFS','ENOSPC'].includes(e?.code)?
  'R45_CURRENT_OS_'+e.code+'_STOP':'R45_CURRENT_LOCAL_OPERATION_FAILED_STOP';
};

export async function runCurrentR45Detach({
 base=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 apply=false,taskXml=task,gitCall=git,trace=traceLiveCore,
 allowNonWindows=false,testGate=null,
}={}){
 const out={audit:'MARKET_CALENDAR_R45_PC_CURRENT_DETACH_R1',at:new Date().toISOString(),
  phase:'PREFLIGHT',decision:'R45_CURRENT_PREFLIGHT_INCOMPLETE_STOP',
  changedFiles:[],backupCreated:false,sourceCommitted:false,
  schedulerChanged:false,forcedCoreRun:false,providerCalls:0,dbWrites:0,
  published:false,gitPushed:false};
 let root,configFile,configBefore,target,before,after,prevHead,lockFile,lockToken;
 let ownsLock=false,backupDir,modified=false,committed=false;
 try{
  if(process.platform!=='win32'&&!allowNonWindows)fail('R45_CURRENT_WINDOWS_ONLY_STOP');
  if(Number(process.versions.node.split('.')[0])<24)fail('R45_CURRENT_NODE24_REQUIRED_STOP');
  const gate=allowNonWindows&&process.platform!=='win32'&&testGate?testGate:
   {head:APPROVED_HEAD,rawBlob:EXPECTED_RAW_BLOB,worktreeId:WORKTREE_ID,vbs:EXPECTED_VBS};
  const chain=trace(taskXml());
  out.originStatus=chain?.status??'UNKNOWN';
  out.originWorktreeId=chain?.rootWorktreeId??null;
  out.originUsedLiteralCandidate=chain?.referencedCandidateUsed===true;
  if(chain?.status!=='CORE_CHAIN_CANDIDATE_TRACED_REVIEW_REQUIRED'||
   chain.rootWorktreeId!==gate.worktreeId||chain.entryName!=='local-cycle.mjs'||
   chain.referencedCandidateUsed!==true||chain.candidateRunOrdinal!==2||
   chain.coreChain?.length!==3||
   chain.coreChain.some((v,i)=>v.sha256!==gate.vbs[i]))
   fail('R45_CURRENT_CORE_TASK_OR_LAUNCHER_CHANGED_STOP');
  root=chain.root;
  if(norm(gitCall(root,['rev-parse','--show-toplevel']))!==norm(root))
   fail('R45_CURRENT_WORKTREE_CHANGED_STOP');
  prevHead=asSha(gitCall(root,['rev-parse','HEAD']));
  out.previousSource=prevHead;
  if(prevHead!==gate.head)fail('R45_CURRENT_PC_SOURCE_CHANGED_STOP');
  configFile=path.join(base,'config.json');configBefore=readFile(configFile,65536);
  const config=JSON.parse(configBefore.toString('utf8'));
  out.configMatchesHead=asSha(config?.source)===prevHead;
  if(!out.configMatchesHead||config?.enabled!==true||config?.collectionTarget!=='pc')
   fail('R45_CURRENT_CONFIG_CHANGED_STOP');
  if(gitCall(root,['status','--porcelain','--untracked-files=no','--',...PROTECTED]))
   fail('R45_CURRENT_PROTECTED_SOURCE_DIRTY_STOP');
  target=path.join(root,...TARGET.split('/'));before=readFile(target);
  const source=before.toString('utf8');
  if(!Buffer.from(source,'utf8').equals(before))fail('R45_CURRENT_COLLECTOR_ENCODING_STOP');
  out.existingRawBlob=blob(before);
  if(out.existingRawBlob!==gate.rawBlob)
   fail('R45_CURRENT_COLLECTOR_RAW_CHANGED_STOP');
  const tracked=asSha(gitCall(root,['rev-parse',`HEAD:${TARGET}`]));
  const canonical=asSha(gitCall(root,['hash-object',`--path=${TARGET}`,'--',TARGET]));
  out.trackedCollectorBlob=tracked;
  out.canonicalCollectorBlob=canonical;
  out.canonicalMatchesHead=Boolean(tracked&&canonical&&tracked===canonical);
  out.lineEndings=source.includes('\r\n')?'CRLF':'LF';
  if(!out.canonicalMatchesHead)fail('R45_CURRENT_HEAD_WORKTREE_CONTENT_UNVERIFIED_STOP');
  const nextSource=removeCurrentR45Observer(source);
  after=Buffer.from(nextSource,'utf8');
  out.afterRawBlob=blob(after);
  if(after.equals(before))fail('R45_CURRENT_NO_TARGET_DIFF_STOP');
  out.phase='PREFLIGHT_READY';
  if(!apply){out.decision='R45_CURRENT_PREFLIGHT_READY_NO_CHANGES';return out;}
  gitCall(root,['var','GIT_AUTHOR_IDENT']);gitCall(root,['var','GIT_COMMITTER_IDENT']);
  lockFile=path.join(base,'local-cycle.lock');
  out.lockStateBefore=lockState(lockFile);
  if(out.lockStateBefore!=='FREE')fail('R45_CURRENT_CORE_LOCK_NOT_FREE_STOP');
  if(fs.existsSync(path.join(base,'quota-runner.lock')))
   fail('R45_CURRENT_QUOTA_LOCK_PRESERVED_STOP');
  lockToken=JSON.stringify({pid:process.pid,at:Date.now(),purpose:'R45-current-detach',nonce:randomUUID()});
  try{
   const fd=fs.openSync(lockFile,'wx');ownsLock=true;
   try{fs.writeFileSync(fd,lockToken);}finally{fs.closeSync(fd);}
  }catch(e){if(e?.code==='EEXIST')fail('R45_CURRENT_CORE_LOCK_RACED_STOP');throw e;}
  out.phase='LOCKED_RECHECK';
  const updatedChain=trace(taskXml());
  if(updatedChain?.status!==chain.status||updatedChain.rootWorktreeId!==gate.worktreeId||
   updatedChain.coreChain?.some((v,i)=>v.sha256!==gate.vbs[i])||
   gitCall(root,['rev-parse','HEAD'])!==prevHead||
   gitCall(root,['status','--porcelain','--untracked-files=no','--',...PROTECTED])||
   !fs.readFileSync(configFile).equals(configBefore)||
   !fs.readFileSync(target).equals(before)||
   fs.existsSync(path.join(base,'quota-runner.lock')))
   fail('R45_CURRENT_STATE_CHANGED_AFTER_LOCK_STOP');
  backupDir=path.join(base,'market-calendar-r45-detach-backups',
   'r45-current-'+new Date().toISOString().replace(/[-:.TZ]/g,'')+'-'+randomUUID().slice(0,8));
  fs.mkdirSync(backupDir,{recursive:true,mode:0o700});
  fs.copyFileSync(target,path.join(backupDir,'collect-local.mjs'));
  fs.copyFileSync(configFile,path.join(backupDir,'config.json'));
  if(!fs.readFileSync(path.join(backupDir,'collect-local.mjs')).equals(before)||
   !fs.readFileSync(path.join(backupDir,'config.json')).equals(configBefore))
   fail('R45_CURRENT_BACKUP_READBACK_FAILED_STOP');
  out.backupCreated=true;out.backupId=path.basename(backupDir);
  out.phase='SOURCE_PATCH';modified=true;
  fs.writeFileSync(target,after);
  if(!fs.readFileSync(target).equals(after))fail('R45_CURRENT_FILE_READBACK_FAILED_STOP');
  if(asSha(gitCall(root,['hash-object',`--path=${TARGET}`,'--',TARGET]))===tracked)
   fail('R45_CURRENT_CANONICAL_BLOB_UNCHANGED_STOP');
  out.changedFiles=[TARGET];out.phase='LOCAL_COMMIT';
  gitCall(root,['add','--',TARGET]);
  gitCall(root,['commit','--only','-m','fix(market-calendar): remove R45 Core observer','--',TARGET]);
  committed=true;out.sourceCommitted=true;
  const nextHead=asSha(gitCall(root,['rev-parse','HEAD']));
  out.newSource=nextHead;
  if(!nextHead||asSha(gitCall(root,['rev-parse','HEAD^']))!==prevHead||
   asSha(gitCall(root,['rev-parse',`HEAD:${TARGET}`]))!==
    asSha(gitCall(root,['hash-object',`--path=${TARGET}`,'--',TARGET]))||
   !fs.readFileSync(target).equals(after)||
   gitCall(root,['diff','--name-only',prevHead,nextHead,'--'])!==TARGET)
   fail('R45_CURRENT_COMMIT_SCOPE_UNVERIFIED_MANUAL_RECOVERY_STOP');
  out.phase='CONFIG_SOURCE_UPDATE';
  if(!fs.readFileSync(configFile).equals(configBefore))
   fail('R45_CURRENT_CONFIG_RACED_MANUAL_RECOVERY_STOP');
  const staged=path.join(backupDir,'config-next.json');
  fs.writeFileSync(staged,JSON.stringify({...config,source:nextHead},null,2)+'\n',{flag:'wx'});
  fs.renameSync(staged,configFile);
  if(asSha(JSON.parse(fs.readFileSync(configFile,'utf8')).source)!==nextHead)
   fail('R45_CURRENT_CONFIG_READBACK_FAILED_MANUAL_RECOVERY_STOP');
  out.phase='INSTALLED';out.decision='R45_CURRENT_INSTALLED_PC_LOCAL_ONLY';
 }catch(e){
  out.errorCode=errorCode(e);
  out.decision=committed?'R45_CURRENT_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP':out.errorCode;
  if(modified&&!committed&&out.backupCreated){
   try{
    if(asSha(gitCall(root,['rev-parse','HEAD']))!==prevHead||
     !fs.readFileSync(target).equals(after))throw Error('RECOVERY_STATE_CHANGED');
    fs.copyFileSync(path.join(backupDir,'collect-local.mjs'),target);
    gitCall(root,['restore','--staged','--',TARGET]);
    if(!fs.readFileSync(target).equals(before)||
     gitCall(root,['status','--porcelain','--',TARGET]))throw Error('RECOVERY_FAILED');
    out.changedFiles=[];out.rolledBack=true;
   }catch{out.decision='R45_CURRENT_ROLLBACK_UNVERIFIED_MANUAL_RECOVERY_STOP';}
  }
 }finally{
  if(ownsLock){
   try{
    if(fs.readFileSync(lockFile,'utf8')===lockToken)fs.unlinkSync(lockFile);
    else out.decision='R45_CURRENT_CORE_LOCK_OWNERSHIP_CHANGED_STOP';
   }catch{out.decision='R45_CURRENT_CORE_LOCK_RELEASE_UNVERIFIED_STOP';}
  }
 }
 return out;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const baseArg=process.argv.find(x=>x.startsWith('--base='));
 const r=await runCurrentR45Detach({apply:process.argv.includes('--apply'),
  ...(baseArg?{base:baseArg.slice(7)}:{})});
 console.log(JSON.stringify(r));
 if(!['R45_CURRENT_PREFLIGHT_READY_NO_CHANGES','R45_CURRENT_INSTALLED_PC_LOCAL_ONLY'].includes(r.decision))
  process.exitCode=2;
}
