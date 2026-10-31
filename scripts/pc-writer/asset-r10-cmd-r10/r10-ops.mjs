// ZGMINI R10 CMD R8: R7 guarded installer + Git-equivalent Windows EOL handling.
// No network access, D1 write, collector run, scheduler mutation, or shell evaluation.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const PACKAGE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_HOME='E:\\ZGmini\\data\\pc-writer';
const DEFAULT_PROJECTS='E:\\ZGmini\\projects';
const SOURCE_PATH='scripts/pc-writer/run-local.mjs';
const RECEIPT_FILE='asset-r10-cmd-r10-install-receipt.json';
const REQUIRED_TASK='ZGMINI-PC-Local-Core';
const KOREA_TASK='ZGMINI-PC-Local-Korea';
const CORE_VBS='E:\\ZGmini\\data\\pc-writer\\cutover-evidence\\inflation-r37-2026-10-20T19-39-19-549Z\\run-local-core.vbs';
const CORE_VBS_SHA='bb3e11c0b5c8da07162b1c824e7b52e7a7c2f987c079f29713211a2413932b01';
const IDLE_MARGIN_MS=120000;
const PREFLIGHT_WAIT_MS=8*60*1000;
const STATUS_KEYS=['STATUS','ERROR_CODE','PC_TIME','PC_TIMEZONE','TASK_COMMAND','TASK_SCRIPT',
 'TASK_WORKDIR','TASK_ENABLED','TASK_ROUTE','CONFIG_SOURCE','LAST_WRITER_SOURCE','LAST_WRITER_STATUS',
 'CORE_TASK_STATE','KOREA_TASK_STATE','CORE_NEXT_RUN_MARGIN_SEC','ROUTE_ATTESTATION',
 'PREFLIGHT_RECHECKS','PREFLIGHT_WAIT_SECONDS',
 'APPROVED_BRANCH',
 'APPROVED_SOURCE','SOURCE_ROOT','BEFORE_SHA','AFTER_SHA','TRACKED_DIRTY','PROCESS_STATUS',
 'LEDGER_STATUS','LOCK_STATUS','HOOK_STATUS','DEPENDENCY_STATUS','TEST_STATUS','BACKUP_STATUS',
 'BACKUP_SHA','RESTORE_STATUS','R10_SIDECAR_RAW','R10_SIDECAR_HISTORY','D1_READBACK',
 'SOURCE_VERSION','SOURCE_STORED_AT','OBSERVATION_QUARTER','HISTORY_POINTS',
 'LAST_CYCLE_AT','NEXT_CYCLE','MANIFEST_STATUS',
 'EXPECTED_OLD_RUN_LOCAL_GIT_BLOB','EXPECTED_OLD_RUN_LOCAL_SHA256',
 'WRITER_WORKTREE_EOL','WRITER_GIT_BLOB_EOL','WRITER_WORKTREE_CRLF','WRITER_WORKTREE_LF',
 'WRITER_GIT_BLOB_CRLF','WRITER_GIT_BLOB_LF','WRITER_BASELINE_EQUIVALENCE',
 'PUBLICATION_GUARD_EQUIVALENCE','PUBLICATION_GUARD_EOL','DEPENDENCY_EOL_VARIANTS'];

export const sha256=(bytes)=>crypto.createHash('sha256').update(bytes).digest('hex');
const filehash=p=>sha256(fs.readFileSync(p));
const safeJson=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const exists=(p)=>fs.existsSync(p);
const safeCode=(e)=>/^[A-Z][A-Z0-9_]{2,95}$/.test(String(e?.message??''))?e.message:'UNEXPECTED_RUNTIME_ERROR';
const winCase=s=>path.win32.normalize(String(s)).toLowerCase();
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true,timeout:15000,stdio:['ignore','pipe','pipe']}).trim();
const cmd=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,timeout:15000,stdio:['ignore','pipe','pipe']});
const relativeSafe=(rel)=>typeof rel==='string'
 &&/^(?:payload\/|tests\/|hook-spec\.json$|r10-ops\.mjs$|RUN_(?:PREFLIGHT|INSTALL|VERIFY)\.cmd$|README_KO\.txt$)/.test(rel)
 &&rel!==''&&!path.isAbsolute(rel)&&!rel.includes('\\')
 &&rel.split('/').every(s=>s!==''&&s!=='.'&&s!=='..');
const stop=(code)=>{throw Error(code);};
const select=(obj)=>Object.fromEntries(STATUS_KEYS.filter(k=>obj[k]!==undefined).map(k=>[k,obj[k]]));

function lineEndingProfile(value){
 // Strictly disallow standalone carriage returns; normalize *only* actual CRLF.
 if(/\r(?!\n)/.test(value))stop('STOP_WRITER_INVALID_LINE_ENDINGS');
 const crlf=(value.match(/\r\n/g)??[]).length;
 const totalLf=(value.match(/\n/g)??[]).length;
 const lf=totalLf-crlf;
 return {eol:crlf&&lf?'MIXED':crlf?'CRLF':'LF',crlf,lf,
  normalized:value.replace(/\r\n/g,'\n')};
}

// A clean Git checkout may have a mixed EOL representation. Require *complete*
// code/text parity after removing only CR in CRLF pairs; never ignore whitespace.
export function verifyWriterBaseline(worktreeText,gitBlobText){
 const worktree=lineEndingProfile(worktreeText);
 const blob=lineEndingProfile(gitBlobText);
 if(worktree.normalized!==blob.normalized)stop('STOP_WRITER_BASELINE_SHA_MISMATCH');
 return {worktreeEol:worktree.eol,gitBlobEol:blob.eol,
  worktreeCrLf:worktree.crlf,worktreeLf:worktree.lf,
  gitBlobCrLf:blob.crlf,gitBlobLf:blob.lf,normalized:worktree.normalized};
}

export function applyHook(baseText,spec){
 const {normalized}=lineEndingProfile(baseText);
 const {anchor,hunk,prelude,requiredTokens}=spec;
 if(normalized.includes(hunk)){
  if(normalized.indexOf(hunk)!==normalized.lastIndexOf(hunk))stop('STOP_HOOK_DUPLICATED');
  return {status:'ALREADY_PRESENT',content:baseText};
 }
 for(const token of requiredTokens)if(!normalized.includes(token))stop('STOP_WRITER_CONTRACT_MISMATCH');
 if(!normalized.includes(prelude+anchor))stop('STOP_WRITER_ANCHOR_MISMATCH');
 if(normalized.indexOf(anchor)!==normalized.lastIndexOf(anchor))stop('STOP_WRITER_ANCHOR_AMBIGUOUS');
 // Preserve every existing byte including a mixed LF/CRLF pattern. Only insert
 // the pinned PR hunk before the unique anchor, adopting its adjacent EOL.
 const index=baseText.indexOf(anchor);
 if(index<0||index!==baseText.lastIndexOf(anchor))stop('STOP_WRITER_ANCHOR_AMBIGUOUS');
 const preceding=baseText.slice(0,index).match(/(?:\r\n|\n)$/)?.[0];
 if(!preceding)stop('STOP_WRITER_INSERTION_EOL_UNCONFIRMED');
 const inserted=hunk.replace(/\n/g,preceding);
 const patched=baseText.slice(0,index)+inserted+baseText.slice(index);
 if(lineEndingProfile(patched).normalized!==normalized.replace(prelude+anchor,prelude+hunk+anchor))
  stop('STOP_WRITER_PATCH_CONTENT_MISMATCH');
 return {status:'READY_TO_PATCH',content:patched};
}

export function validateManifest(pkgRoot=PACKAGE){
 const manifest=safeJson(path.join(pkgRoot,'package-manifest.json'));
 if(manifest.schema!=='zgmini-r10-cmd-r10-v1'||!Array.isArray(manifest.files)
  ||manifest.sourceSha!=='8a7634a5358cb19280725fe29a977ba4feb44be8'
  ||manifest.approvedBaselineSha!=='a477ef304425145f559352af4291e437e3b08a2d')
  stop('STOP_PACKAGE_MANIFEST_CONTRACT');
 const visited=new Set();
 for(const entry of manifest.files){
  if(!relativeSafe(entry.path)||visited.has(entry.path)||!/^[a-f0-9]{64}$/.test(entry.sha256))
   stop('STOP_PACKAGE_MANIFEST_PATH');
  visited.add(entry.path);
  const p=path.join(pkgRoot,...entry.path.split('/'));
  if(!exists(p)||filehash(p)!==entry.sha256)stop('STOP_PACKAGE_HASH_MISMATCH');
 }
 if(!visited.has('hook-spec.json')
  ||!visited.has('payload/scripts/pc-writer/asset-r10-sidecar-auto-publication-r1.mjs')
  ||!visited.has('payload/tests/asset-r10-sidecar-auto-publication-r1.test.mjs'))
  stop('STOP_PACKAGE_INCOMPLETE');
 const spec=safeJson(path.join(pkgRoot,'hook-spec.json'));
 if(spec.sourceSha!==manifest.sourceSha||spec.approvedBaselineSha!==manifest.approvedBaselineSha)
  stop('STOP_HOOK_SOURCE_MISMATCH');
 return {manifest,spec};
}

function taskXml(name){
 try{return cmd('schtasks',['/Query','/TN',name,'/XML']);}
 catch{return null;}
}
const xml=(s,tag)=>{
 const m=new RegExp('<(?:[A-Za-z0-9_]+:)?'+tag+'>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_]+:)?'+tag+'>','i').exec(s??'');
 return m?m[1].replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'):'';
};
function resolveTaskChain(task,root,projectCandidates=[]){
 if(!task)return {route:'STOP_TASK_MISSING',command:'',script:'',working:''};
 const command=xml(task,'Command'),args=xml(task,'Arguments'),working=xml(task,'WorkingDirectory');
 const refs=[command,args,working];
 const seen=new Set();
 const target=winCase(root);
 const allowed=projectCandidates.map(winCase);
 let found=false;
 for(let depth=0;depth<3;depth++){
  const next=[];
  for(const s of refs.splice(0)){
   if(!s)continue;
   if(winCase(s).includes(target))found=true;
   // Only inspect literal E:-drive script paths, not arbitrary / network files.
   const matches=s.match(/[A-Za-z]:\\[^"\r\n]+?\.(?:vbs|mjs|cmd)/gi)??[];
   for(const candidate of matches){
    const key=winCase(candidate);
    if(seen.has(key))continue;
    seen.add(key);
    if(!key.startsWith('e:\\zgmini\\')||!exists(candidate))continue;
    if(!allowed.some(x=>key.startsWith(x))&&!key.startsWith('e:\\zgmini\\data\\'))continue;
    const st=fs.statSync(candidate);
    if(st.size>256*1024)continue;
    const text=fs.readFileSync(candidate,'utf8');
    if(winCase(text).includes(target))found=true;
    next.push(text);
   }
  }
  refs.push(...next);
  if(!refs.length)break;
 }
 return {route:found?'VERIFIED_STATIC_REFERENCE':'STOP_ROUTE_UNCONFIRMED',
  command:path.win32.basename(command||'UNKNOWN'),script:path.win32.basename((args.match(/[^"\s]+\.(?:vbs|mjs|cmd)/i)??[])[0]??command),
  working:working||'UNSPECIFIED'};
}

export function pinnedRuntimeRoute(task,vbsExists=exists,vbsHash=filehash){
 if(!task)return 'STOP_TASK_MISSING';
 const exe=xml(task,'Command'),args=xml(task,'Arguments');
 if(!/^wscript(?:\.exe)?$/i.test(path.win32.basename(exe))
   ||!winCase(args).includes(winCase(CORE_VBS)))return 'STOP_CORE_VBS_ROUTE_CHANGED';
 if(!vbsExists(CORE_VBS)||vbsHash(CORE_VBS)!==CORE_VBS_SHA)return 'STOP_CORE_VBS_HASH_DRIFT';
 // R5 live evidence: Core VBS -> local-cycle --publish -> run-local --publish.
 // This fixed fingerprint is a historical route proof, not a live-process pass.
 return 'VERIFIED_R5_PINNED_RUNTIME_ROUTE';
}

function powershellRead(query){
 return execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',query],{
  encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:8*1024*1024,
  stdio:['ignore','pipe','pipe'],
 }).trim();
}
export function assessSchedulerSafety(core,korea,now=Date.now(),minMargin=IDLE_MARGIN_MS){
 if(!core?.Enabled||!korea?.Enabled)return 'STOP_SCHEDULER_DISABLED_OR_UNVERIFIED';
 if(core.State!=='Ready'||korea.State!=='Ready')return 'STOP_SCHEDULER_BUSY';
 if(!Number.isFinite(core.NextMs)||core.NextMs-now<minMargin)return 'STOP_CORE_NEXT_RUN_TOO_NEAR';
 return 'CLEAR';
}
function schedulerSafety(out={},minMargin=IDLE_MARGIN_MS){
 const script='$names=@("ZGMINI-PC-Local-Core","ZGMINI-PC-Local-Korea");'+
  '$rows=@(foreach($n in $names){$t=Get-ScheduledTask -TaskName $n -ErrorAction Stop;'+
  '$i=Get-ScheduledTaskInfo -TaskName $n -ErrorAction Stop;'+
  '[pscustomobject]@{Name=$n;Enabled=[bool]$t.Settings.Enabled;State=[string]$t.State;'+
  'NextMs=([DateTimeOffset]$i.NextRunTime).ToUnixTimeMilliseconds()}});'+
  '$rows|ConvertTo-Json -Compress';
 let list;try{list=JSON.parse(powershellRead(script))}catch{stop('STOP_SCHEDULER_LIVE_QUERY_FAILED')}
 list=Array.isArray(list)?list:[list];
 const core=list.find(x=>x.Name===REQUIRED_TASK),korea=list.find(x=>x.Name===KOREA_TASK);
 out.CORE_TASK_STATE=core?.State??'UNKNOWN';out.KOREA_TASK_STATE=korea?.State??'UNKNOWN';
 out.TASK_ENABLED=core?.Enabled===true?'TRUE':'FALSE_OR_UNKNOWN';
 out.CORE_NEXT_RUN_MARGIN_SEC=Math.floor((core?.NextMs-Date.now())/1000)||0;
 const status=assessSchedulerSafety(core,korea,Date.now(),minMargin);
 if(status!=='CLEAR')stop(status);
}

function findSourceRoot(projects,expected){
 if(!exists(projects))stop('STOP_PROJECTS_DIR_MISSING');
 const found=[];
 for(const entry of fs.readdirSync(projects,{withFileTypes:true})){
  if(!entry.isDirectory()||entry.isSymbolicLink())continue;
  const root=path.join(projects,entry.name);
  if(!exists(path.join(root,'.git')))continue;
  let sha='';
  try{sha=git(root,'rev-parse','HEAD');}catch{continue}
  if(sha===expected)found.push(root);
 }
 if(found.length!==1)stop(found.length?'STOP_MULTIPLE_APPROVED_CHECKOUTS':'STOP_APPROVED_CHECKOUT_UNFOUND');
 return found[0];
}

function busyProcesses(root){
 try{
  const query='$p=Get-CimInstance Win32_Process -Filter "Name=\'node.exe\' OR Name=\'wscript.exe\'" -ErrorAction Stop;'+
   '$p|Select-Object ProcessId,Name,CommandLine|ConvertTo-Json -Compress';
  const raw=powershellRead(query);
  let rows=raw?JSON.parse(raw):[];rows=Array.isArray(rows)?rows:[rows];
  for(const p of rows){
   if(Number(p.ProcessId)===process.pid)continue;
   const command=String(p.CommandLine??'');
   if(!command)return 'STOP_PROCESS_COMMANDLINE_UNVERIFIED';
   if(winCase(command).includes(winCase(root))
     ||/\b(?:run-local|local-cycle|collect-local)\.mjs\b/i.test(command))
    return 'STOP_WRITER_PROCESS_ACTIVE';
  }
  return 'CLEAR';
 }catch{return 'STOP_PROCESS_INSPECTION_UNAVAILABLE'}
}
function assertIdle(home,root,out={},minMargin=IDLE_MARGIN_MS){
 schedulerSafety(out,minMargin);
 const p=busyProcesses(root);out.PROCESS_STATUS=p;
 if(p!=='CLEAR')stop(p);
 const ev=readEvidence(home);
 if(ev.locks.length)stop('STOP_LOCK_PRESENT');
 if(ev.ledger?.status==='SUBMITTING')stop('STOP_PUBLICATION_SUBMITTING');
 if(ev.ledger&&ev.ledger.status!=='VERIFIED'&&ev.ledger.status!=='READBACK_RECOVERED')
  stop('STOP_PUBLICATION_LEDGER_UNSAFE');
}
function readEvidence(home){
 const configPath=path.join(home,'config.json');
 if(!exists(configPath))stop('STOP_WRITER_CONFIG_MISSING');
 const config=safeJson(configPath);
 const lastPath=path.join(home,'local-writer-last-run.json');
 const last=exists(lastPath)?safeJson(lastPath):null;
 const ledgerPath=path.join(home,'local-publication-ledger.json');
 const ledger=exists(ledgerPath)?safeJson(ledgerPath):null;
 const locks=fs.readdirSync(home).filter(x=>/\.lock$/i.test(x));
 return {configPath,config,last,ledger,locks};
}
// Do not weaken the pinned PR #893 compatibility code or replace PC files.
// Existing tracked .mjs/test files may be CRLF or mixed CRLF/LF on Windows;
// accept only exact UTF-8 text parity after deleting CR in CRLF pairs.
export function verifyPinnedTextFile(actualBytes,pinnedBytes,{code='STOP_DEPENDENCY_CONTENT_MISMATCH'}={}){
 const decode=(bytes)=>{
  if(!Buffer.isBuffer(bytes))stop('STOP_PINNED_TEXT_INPUT_INVALID');
  let result;
  try{result=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes)}
  catch{stop('STOP_PINNED_TEXT_INVALID_UTF8')}
  if(!Buffer.from(result,'utf8').equals(bytes))stop('STOP_PINNED_TEXT_ENCODING_MISMATCH');
  return result;
 };
 const actual=actualBytes,pinned=pinnedBytes;
 if(actual.equals(pinned))return {equivalence:'BYTE_EXACT',eol:lineEndingProfile(decode(actual)).eol};
 const left=lineEndingProfile(decode(actual)),right=lineEndingProfile(decode(pinned));
 if(left.normalized!==right.normalized)stop(code);
 return {equivalence:'EXACT_CONTENT_ALLOWED_EOL',eol:left.eol};
}
function allowedDependencies(root,manifest,out={}){
 let missing=0,eolVariants=0;
 const add=[];
 const files=manifest.files.filter(x=>x.path.startsWith('payload/')
  &&x.path!=='payload/scripts/pc-writer/run-local.mjs'
  &&x.path!=='payload/scripts/pc-writer/publication-guard.mjs');
 const guard=manifest.files.find(x=>x.path==='payload/scripts/pc-writer/publication-guard.mjs');
 const guardPath=path.join(root,'scripts','pc-writer','publication-guard.mjs');
 if(!guard||!exists(guardPath))stop('STOP_PUBLICATION_COMPATIBILITY_MISSING');
 const guardPinned=path.join(PACKAGE,...guard.path.split('/'));
 // manifest integrity was already validated, and the guard is never overwritten.
 const guardCheck=verifyPinnedTextFile(fs.readFileSync(guardPath),fs.readFileSync(guardPinned),
  {code:'STOP_PUBLICATION_COMPATIBILITY_CONTENT_MISMATCH'});
 out.PUBLICATION_GUARD_EQUIVALENCE=guardCheck.equivalence;
 out.PUBLICATION_GUARD_EOL=guardCheck.eol;
 try{git(root,'ls-files','--error-unmatch','--','scripts/pc-writer/publication-guard.mjs')}
 catch{stop('STOP_PUBLICATION_COMPATIBILITY_UNTRACKED')}
 for(const item of files){
  const rel=item.path.slice('payload/'.length);
  const dest=path.join(root,...rel.split('/'));
  if(!exists(dest)){add.push({item,rel,dest});missing++;continue;}
  // Original hard SHA check remains a fast-path; no code/content variation is accepted.
  if(filehash(dest)!==item.sha256){
   const pinned=path.join(PACKAGE,...item.path.split('/'));
   const compared=verifyPinnedTextFile(fs.readFileSync(dest),fs.readFileSync(pinned));
   if(compared.equivalence!=='EXACT_CONTENT_ALLOWED_EOL')stop('STOP_DEPENDENCY_CONTENT_MISMATCH');
   eolVariants++;
  }
  try{git(root,'ls-files','--error-unmatch','--',rel)}
  catch{stop('STOP_EXISTING_DEPENDENCY_UNTRACKED')}
 }
 out.DEPENDENCY_EOL_VARIANTS=eolVariants;
 return {status:missing?'MATCHED_WITH_MISSING':'EXACT_CONTENT_MATCH',add};
}
function baseResult(){
 return {STATUS:'STOP_UNCHECKED',PC_TIME:new Date().toISOString(),
  PC_TIMEZONE:Intl.DateTimeFormat().resolvedOptions().timeZone||'UNKNOWN',
  APPROVED_SOURCE:'a477ef304425145f559352af4291e437e3b08a2d',
  BEFORE_SHA:'NOT_VERIFIED',AFTER_SHA:'NOT_APPLIED',CONFIG_SOURCE:'NOT_VERIFIED',
  HOOK_STATUS:'UNVERIFIED',TEST_STATUS:'NOT_RUN',BACKUP_STATUS:'NOT_CREATED',
  RESTORE_STATUS:'NOT_REQUIRED',D1_READBACK:'NOT_TESTED',
  R10_SIDECAR_RAW:'NOT_TESTED',R10_SIDECAR_HISTORY:'NOT_TESTED',
  NEXT_CYCLE:'NOT_OBSERVED'};
}
function preflight(home,{forInstall=false}={}){
 const out=baseResult();
 try{
 const {manifest,spec}=validateManifest();
 out.MANIFEST_STATUS='HASH_VERIFIED';
 if(process.platform!=='win32')stop('STOP_WINDOWS_ONLY');
 const [major,minor]=process.versions.node.split('.').map(Number);
 if(major<22||(major===22&&minor<13))stop('STOP_NODE_VERSION_UNSUPPORTED');
 if(!exists(home))stop('STOP_PC_HOME_MISSING');
 const {configPath,config,last,ledger,locks}=readEvidence(home);
 out.CONFIG_SOURCE=String(config.source??'MISSING');
 out.LAST_WRITER_SOURCE=String(last?.source??'MISSING');
 out.LAST_WRITER_STATUS=String(last?.status??'MISSING');
 out.LEDGER_STATUS=String(ledger?.status??'MISSING');
 out.LOCK_STATUS=locks.length?'STOP_LOCK_PRESENT':'CLEAR';
 const projects=DEFAULT_PROJECTS;
 const root=findSourceRoot(projects,manifest.approvedBaselineSha);
 out.SOURCE_ROOT=root;
 out.BEFORE_SHA=git(root,'rev-parse','HEAD');
 const task=taskXml(REQUIRED_TASK);
 const chain=resolveTaskChain(task,root,[projects]);
 out.TASK_COMMAND=chain.command;out.TASK_SCRIPT=chain.script;out.TASK_WORKDIR=chain.working;
 out.TASK_ROUTE=pinnedRuntimeRoute(task);
 out.ROUTE_ATTESTATION='R5_LIVE_CORE_VBS_TO_WRITER_20261029T155227Z';
 if(out.TASK_ROUTE!=='VERIFIED_R5_PINNED_RUNTIME_ROUTE')stop(out.TASK_ROUTE);
 if(config.source!==manifest.approvedBaselineSha||last?.source!==manifest.approvedBaselineSha)
  stop('STOP_SOURCE_CONFLICT');
 if(!['VERIFIED','VERIFIED_WITH_GAPS'].includes(last?.status))
  stop('STOP_LAST_WRITER_NOT_VERIFIED');
 assertIdle(home,root,out);
 const dirty=git(root,'status','--porcelain','--untracked-files=no');
 out.TRACKED_DIRTY=dirty?'YES':'NO';
 if(dirty)stop('STOP_TRACKED_DIRTY');
 try{out.APPROVED_BRANCH=git(root,'symbolic-ref','--quiet','--short','HEAD')}
 catch{stop('STOP_DETACHED_CHECKOUT')}
 // The unavailable historical a477... Git tree, not a guessed hash, is the baseline.
 const oldBlob=git(root,'rev-parse',manifest.approvedBaselineSha+':'+SOURCE_PATH);
 const runPath=path.join(root,...SOURCE_PATH.split('/'));
 const current=fs.readFileSync(runPath,'utf8');
 const oldContent=execFileSync('git',['show',manifest.approvedBaselineSha+':'+SOURCE_PATH],{cwd:root,encoding:'utf8',windowsHide:true});
 const verified=verifyWriterBaseline(current,oldContent);
 out.EXPECTED_OLD_RUN_LOCAL_GIT_BLOB=oldBlob;
 out.EXPECTED_OLD_RUN_LOCAL_SHA256=sha256(oldContent);
 out.WRITER_WORKTREE_EOL=verified.worktreeEol;
 out.WRITER_GIT_BLOB_EOL=verified.gitBlobEol;
 out.WRITER_WORKTREE_CRLF=verified.worktreeCrLf;
 out.WRITER_WORKTREE_LF=verified.worktreeLf;
 out.WRITER_GIT_BLOB_CRLF=verified.gitBlobCrLf;
 out.WRITER_GIT_BLOB_LF=verified.gitBlobLf;
 out.WRITER_BASELINE_EQUIVALENCE='EXACT_CONTENT_WITH_ALLOWED_EOL';
 const hook=applyHook(current,spec);
 out.HOOK_STATUS=hook.status;
 const dependencies=allowedDependencies(root,manifest,out);
 out.DEPENDENCY_STATUS=dependencies.status;
 if(hook.status==='ALREADY_PRESENT'){
  if(dependencies.add.length)stop('STOP_PARTIAL_HOOK_INSTALL');
  out.STATUS='ALREADY_INSTALLED_SOURCE_NOT_REAPPROVED';
  return {out,root,configPath,config,runPath,hook,dependencies,manifest};
 }
 out.STATUS='READY_FOR_INSTALL';
 return {out,root,configPath,config,runPath,hook,dependencies,manifest};
 }catch(e){out.STATUS='STOP';out.ERROR_CODE=safeCode(e);return {out}}
}

export function transientPreflightStop(code){
 return new Set(['STOP_SCHEDULER_BUSY','STOP_CORE_NEXT_RUN_TOO_NEAR',
  'STOP_WRITER_PROCESS_ACTIVE','STOP_LOCK_PRESENT']).has(code);
}
async function waitSafePreflight(home){
 const start=Date.now(),end=start+PREFLIGHT_WAIT_MS;let checks=0,last;
 for(;;){
  last=preflight(home).out;checks++;
  if(last.STATUS==='READY_FOR_INSTALL'||!transientPreflightStop(last.ERROR_CODE)||Date.now()+10000>end)break;
  await new Promise(resolve=>setTimeout(resolve,10000));
 }
 last.PREFLIGHT_RECHECKS=checks;
 last.PREFLIGHT_WAIT_SECONDS=Math.floor((Date.now()-start)/1000);
 return last;
}

export function updateSourceOnly(original,oldSha,newSha){
 const matcher=/"source"\s*:\s*"[a-f0-9]{40}"/g;
 const hits=original.match(matcher)??[];
 if(hits.length!==1||!hits[0].includes(oldSha))stop('STOP_CONFIG_SOURCE_FORMAT');
 const changed=original.replace(matcher,x=>x.replace(oldSha,newSha));
 const before=JSON.parse(original),after=JSON.parse(changed);
 if(before.source!==oldSha||after.source!==newSha)stop('STOP_CONFIG_SOURCE_VALIDATE');
 after.source=oldSha;
 if(JSON.stringify(before)!==JSON.stringify(after))stop('STOP_CONFIG_OTHER_FIELDS_CHANGED');
 return changed;
}
function atomicReplace(p,content){
 const tmp=p+'.r10cmdr10-'+process.pid+'.tmp';
 fs.writeFileSync(tmp,content,{flag:'wx'});
 try{fs.renameSync(tmp,p)}catch(e){fs.unlinkSync(tmp);throw e;}
}
function sanityTests(root,manifest){
 for(const x of manifest.files.filter(x=>x.path.startsWith('payload/')&&x.path.endsWith('.mjs'))){
  const rel=x.path.slice('payload/'.length),target=path.join(root,...rel.split('/'));
  cmd(process.execPath,['--check',target]);
 }
 cmd(process.execPath,['--test',path.join(root,'tests','asset-r10-sidecar-auto-publication-r1.test.mjs')]);
 const guard=fs.readFileSync(path.join(root,'scripts','pc-writer','publication-guard.mjs'),'utf8');
 if(!guard.includes('publicationCompatibility')||!guard.includes('affectsPublication'))
  stop('STOP_PUBLICATION_COMPATIBILITY_CONTRACT');
 return 'PASS';
}

function install(home){
 const ctx=preflight(home,{forInstall:true}),out=ctx.out;
 if(out.STATUS!=='READY_FOR_INSTALL')return out;
 const {root,configPath,runPath,hook,dependencies,manifest}=ctx;
 const configBefore=fs.readFileSync(configPath);
 const runBefore=fs.readFileSync(runPath);
 const backup=path.join(home,'r10-cmd-backups','r10-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid);
 fs.mkdirSync(backup,{recursive:true});
 fs.writeFileSync(path.join(backup,'run-local.before.mjs'),runBefore,{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(backup,'config.before.json'),configBefore,{flag:'wx',mode:0o600});
 if(filehash(path.join(backup,'run-local.before.mjs'))!==sha256(runBefore)
  ||filehash(path.join(backup,'config.before.json'))!==sha256(configBefore))
  stop('STOP_BACKUP_READBACK_MISMATCH');
 out.BACKUP_SHA=sha256(runBefore);out.BACKUP_STATUS='VERIFIED_LOCAL_ONLY';
 const modified=[SOURCE_PATH,...dependencies.add.map(x=>x.rel)];
 const created=[];
 let committed=false,newSha='';
 try{
  // Never overwrite an existing dependency whose byte hash differs.
  for(const {item,rel,dest} of dependencies.add){
   if(exists(dest))stop('STOP_DEPENDENCY_APPEARED_DURING_INSTALL');
   const source=path.join(PACKAGE,...item.path.split('/'));
   fs.mkdirSync(path.dirname(dest),{recursive:true});
   fs.copyFileSync(source,dest,fs.constants.COPYFILE_EXCL);
   created.push(dest);
   if(filehash(dest)!==item.sha256)stop('STOP_DEPENDENCY_COPY_MISMATCH');
  }
  if(filehash(runPath)!==sha256(runBefore))stop('STOP_WRITER_CHANGED_DURING_INSTALL');
  atomicReplace(runPath,hook.content);
  if(filehash(runPath)!==sha256(hook.content))stop('STOP_PATCH_READBACK_MISMATCH');
  assertIdle(home,root,out);
  out.TEST_STATUS=sanityTests(root,manifest);
  git(root,'add','--',...modified);
  const staged=git(root,'diff','--cached','--name-only','--');
  const changed=staged.split(/\r?\n/).filter(Boolean).sort();
  if(changed.join('|')!==[...modified].sort().join('|'))stop('STOP_UNEXPECTED_STAGED_FILES');
  git(root,'commit','-m','feat(asset-r10): selectively enable approved Writer sidecars');
  newSha=git(root,'rev-parse','HEAD');committed=true;
  if(git(root,'status','--porcelain','--untracked-files=no'))stop('STOP_POST_COMMIT_TRACKED_DIRTY');
  for(const {item,rel} of dependencies.add){
   const target=path.join(root,...rel.split('/'));
   if(filehash(target)!==item.sha256)stop('STOP_POST_COMMIT_DEPENDENCY_DRIFT');
  }
  if(filehash(runPath)!==sha256(hook.content))stop('STOP_POST_COMMIT_HOOK_DRIFT');
  assertIdle(home,root,out,30000);
  const configNew=updateSourceOnly(configBefore.toString('utf8'),manifest.approvedBaselineSha,newSha);
  atomicReplace(configPath,configNew);
  if(safeJson(configPath).source!==newSha)stop('STOP_CONFIG_SOURCE_READBACK');
  out.AFTER_SHA=newSha;out.CONFIG_SOURCE=newSha;
  out.HOOK_STATUS='INSTALLED';
  out.STATUS='PC_SOURCE_INSTALLED_AWAIT_NORMAL_CYCLE';
  const receipt={version:'r10',beforeSha:manifest.approvedBaselineSha,afterSha:newSha,
   root,backup,modified,oldSha256:sha256(runBefore),newSha256:filehash(runPath),
   installedAt:new Date().toISOString(),lastCycleAt:ctx.out.PC_TIME};
  fs.writeFileSync(path.join(home,RECEIPT_FILE),JSON.stringify(receipt,null,2),{mode:0o600});
  return out;
 }catch(e){
  if(!committed){
   // If stage occurred, unstage ONLY these paths. Never reset repository HEAD.
   try{git(root,'restore','--staged','--',...modified)}catch{}
   try{atomicReplace(runPath,runBefore)}catch{}
   for(const target of created){
    try{if(exists(target))fs.unlinkSync(target)}catch{}
   }
   const restored=filehash(runPath)===sha256(runBefore)&&created.every(x=>!exists(x));
   out.RESTORE_STATUS=restored?'PRECOMMIT_FILES_RESTORED':'STOP_RESTORE_UNVERIFIED';
  }else{
   // No unsafe git reset/revert. Preserve commit and backups for audited recovery.
   out.RESTORE_STATUS='STOP_POST_COMMIT_MANUAL_RECOVERY_REQUIRED';
   out.AFTER_SHA=newSha;
  }
  out.STATUS='STOP_INSTALL_FAILED';out.ERROR_CODE=safeCode(e);return out;
 }
}
function verify(home){
 const out=baseResult();
 validateManifest();out.MANIFEST_STATUS='HASH_VERIFIED';
 if(process.platform!=='win32')stop('STOP_WINDOWS_ONLY');
 const receiptPath=path.join(home,RECEIPT_FILE);
 const receipt=exists(receiptPath)?safeJson(receiptPath):null;
 const evidence=readEvidence(home);
 out.CONFIG_SOURCE=String(evidence.config.source??'MISSING');
 out.BEFORE_SHA=String(receipt?.beforeSha??'NOT_RECORDED');
 out.AFTER_SHA=String(receipt?.afterSha??'NOT_RECORDED');
 out.SOURCE_ROOT=String(receipt?.root??'NOT_RECORDED');
 out.BACKUP_STATUS=receipt?.backup&&exists(path.join(receipt.backup,'run-local.before.mjs'))
  ?'BACKUP_PRESENT':'BACKUP_NOT_VERIFIED';
 out.LAST_WRITER_SOURCE=String(evidence.last?.source??'MISSING');
 out.LAST_WRITER_STATUS=String(evidence.last?.status??'MISSING');
 if(!receipt)stop('STOP_INSTALL_RECEIPT_MISSING');
 if(!exists(receipt.root)||git(receipt.root,'rev-parse','HEAD')!==receipt.afterSha)
  stop('STOP_APPLIED_SOURCE_DRIFT');
 if(evidence.config.source!==receipt.afterSha)stop('STOP_CONFIG_SOURCE_DRIFT');
 const r=evidence.last??{};
 if(r.source!==receipt.afterSha){out.STATUS='WAIT_FIRST_NORMAL_CYCLE';return out}
 out.HOOK_STATUS=r.assetR10Sidecars?'OBSERVED':'NOT_RECORDED';
 const raw=r.assetR10Sidecars?.keys?.raw;
 const hist=r.assetR10Sidecars?.keys?.history;
 out.R10_SIDECAR_RAW=String(raw??'NOT_RECORDED');
 out.R10_SIDECAR_HISTORY=String(hist??'NOT_RECORDED');
 out.SOURCE_VERSION=String(r.assetR10Sidecars?.sourceVersion??'NOT_RECORDED');
 out.OBSERVATION_QUARTER=String(r.assetR10Sidecars?.scoreObservationQuarter??'NOT_RECORDED');
 out.HISTORY_POINTS=Array.isArray(r.assetR10Sidecars?.historyPoints)
  ?r.assetR10Sidecars.historyPoints.join(','):'NOT_RECORDED';
 const releasePath=path.join(home,'local-asset-bubble-r10-release-payload.json');
 let release=null;
 try{if(exists(releasePath))release=safeJson(releasePath)}catch{}
 out.SOURCE_STORED_AT=String(release?.sourceStoredAt??release?.payload?.sourceStoredAt??'LOCAL_NOT_VERIFIED');
 const good=['READBACK_VERIFIED','ALREADY_STORED','UNCHANGED_VERIFIED'];
 out.D1_READBACK=good.includes(raw)&&good.includes(hist)
  ?'BOTH_KEYS_WRITER_REPORTED':'NOT_VERIFIED';
 out.LAST_CYCLE_AT=String(r.at??'NOT_RECORDED');
 const priorPath=path.join(PACKAGE,'ASSET_R10_CMD_VERIFY_RESULT.txt');
 const previous=exists(priorPath)?fs.readFileSync(priorPath,'utf8'):'';
 const priorAt=(/^LAST_CYCLE_AT=(.+)$/m.exec(previous)??[])[1];
 if(priorAt&&Date.parse(r.at)>Date.parse(priorAt)
  &&previous.includes('D1_READBACK=BOTH_KEYS_WRITER_REPORTED')){
  out.NEXT_CYCLE='SECOND_NORMAL_CYCLE_WRITER_REPORTED';
 }else if(Date.parse(r.at)>Date.parse(receipt.installedAt)){
  out.NEXT_CYCLE='FIRST_POST_INSTALL_CYCLE_OBSERVED';
 }
 out.STATUS=out.D1_READBACK==='BOTH_KEYS_WRITER_REPORTED'
  ?(out.NEXT_CYCLE==='SECOND_NORMAL_CYCLE_WRITER_REPORTED'
    ?'TWO_CYCLES_WRITER_REPORTED_EXTERNAL_D1_NOT_REQUERIED'
    :'FIRST_CYCLE_RECORDED_NEXT_CYCLE_PENDING')
  :'WAIT_R10_SIDECAR_READBACK';
 return out;
}
function resultText(result){
 return STATUS_KEYS.filter(k=>result[k]!==undefined).map(k=>k+'='+String(result[k]).replace(/[\r\n]/g,' ')).join('\r\n')+'\r\n';
}
async function main(){
 const mode=process.argv[2],home=DEFAULT_HOME;
 const dest=path.join(PACKAGE,mode==='install'?'ASSET_R10_CMD_INSTALL_RESULT.txt':
  mode==='verify'?'ASSET_R10_CMD_VERIFY_RESULT.txt':'ASSET_R10_CMD_PREFLIGHT_RESULT.txt');
 let out=baseResult();
 try{
  if(!['preflight','install','verify'].includes(mode))stop('STOP_INVALID_MODE');
  if(mode==='preflight')out=await waitSafePreflight(home);
  else if(mode==='install')out=install(home);
  else out=verify(home);
 }catch(e){out.STATUS='STOP';out.ERROR_CODE=safeCode(e)}
 fs.writeFileSync(dest,resultText(select(out)),{encoding:'utf8'});
 process.stdout.write('RESULT='+path.basename(dest)+'\nSTATUS='+out.STATUS+'\n'+
  (out.ERROR_CODE?'ERROR_CODE='+out.ERROR_CODE+'\n':''));
 if(out.STATUS==='STOP'||out.STATUS.startsWith('STOP_'))process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(safeCode(e));process.exitCode=2});
