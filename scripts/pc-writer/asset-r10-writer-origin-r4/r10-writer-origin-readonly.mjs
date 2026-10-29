// R10 R4: inspect only pinned scheduler dispatch, Writer origin and cycle lock owner.
// Never invoke a collector, Writer, D1, scheduler mutation or a target file.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const DIR=path.dirname(fileURLToPath(import.meta.url));
const OUT=path.join(DIR,'ASSET_R10_WRITER_ORIGIN_RESULT.txt');
const HOME='E:\\ZGmini\\data\\pc-writer';
const ROOT='E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release';
const APPROVED='a477ef304425145f559352af4291e437e3b08a2d';
const BASE=path.win32.join(HOME,'earnings-risk-provisional-r23');
const TARGETS=[
 ['CORE_VBS','E:\\ZGmini\\data\\pc-writer\\cutover-evidence\\inflation-r37-2026-10-20T19-39-19-549Z\\run-local-core.vbs','bb3e11c0b5c8da07162b1c824e7b52e7a7c2f987c079f29713211a2413932b01'],
 ['DISPATCH_R38',path.win32.join(BASE,'ZGMINI_EARNINGS_R38_AUTO_DISPATCH.mjs'),'4346e5e4406f893ede75e994e3a1e7253bde2bb8eacd7656b365e3a82e3704f1'],
 ['PUBLICATION_R31',path.win32.join(BASE,'ZGMINI_EARNINGS_R31_SCOPED_PUBLICATION.mjs'),'ffa71643748e79eedacf26b72880804cbab0edfb2eb32435da2346ec4bd0ad19'],
 ['OBSERVE_R33',path.win32.join(BASE,'ZGMINI_EARNINGS_R33_OBSERVE_PUBLISH_CYCLE.mjs'),'7bd792d1ed84067846ca3ef0748b4a5eac8e5ba78feb18c9a3fcaf46b58ee58b'],
 ['CHANGE_R22',path.win32.join(BASE,'ZGMINI_EARNINGS_R22_CHANGE_GATE.mjs'),'f400fc1c74ad518e7d6bfec5bb40e3a356de9fc810c5e2976deb0f561e7aeab9'],
 ['LEDGER_R21',path.win32.join(BASE,'ZGMINI_EARNINGS_R21_OBSERVATION_LEDGER.mjs'),'c03ba882011160746ae441c8992fcbc2f89960207b1bf8590c32fb55da84b778'],
];
const sha=x=>crypto.createHash('sha256').update(fs.readFileSync(x)).digest('hex');
const json=x=>JSON.parse(fs.readFileSync(x,'utf8'));
const clean=v=>String(v??'UNKNOWN').replace(/[\0\r\n]/g,' ').replace(/[^\p{L}\p{N} ,:._\\/\-]/gu,'').slice(0,210);
const fail=e=>/^[A-Z][A-Z0-9_]+$/.test(e?.message??'')?e.message:'STOP_READONLY_ERROR';
const exec=(file,args,options={})=>execFileSync(file,args,{windowsHide:true,encoding:'utf8',
 timeout:20000,maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe'],...options}).trim();
function hashContract(){
 const manifest=json(path.join(DIR,'package-manifest.json'));
 const wanted=new Set(['RUN_R10_WRITER_ORIGIN_READONLY.cmd','r10-writer-origin-readonly.mjs','README_KO.txt']);
 if(manifest.schema!=='zgmini-r10-writer-origin-r4'||manifest.approvedSource!==APPROVED
   ||manifest.files?.length!==wanted.size)throw Error('STOP_MANIFEST_CONTRACT');
 for(const f of manifest.files){
  if(!wanted.delete(f.path)||!/^[0-9a-f]{64}$/.test(f.sha256))throw Error('STOP_MANIFEST_CONTRACT');
  if(sha(path.join(DIR,f.path))!==f.sha256)throw Error('STOP_PACKAGE_SHA_MISMATCH');
 }
 if(wanted.size)throw Error('STOP_MANIFEST_CONTRACT');
}
function sourceText(file){
 const raw=fs.readFileSync(file);
 return raw[0]===0xff&&raw[1]===0xfe?raw.subarray(2).toString('utf16le'):raw.toString('utf8');
}
export function dispatchFlags(body){
 return {
  HAS_RUN_LOCAL:/\brun-local\.mjs\b/i.test(body)?'YES':'NO',
  HAS_LOCAL_CYCLE:/\blocal-cycle\.mjs\b/i.test(body)?'YES':'NO',
  HAS_APPROVED_ROOT:/zgmini-earnings-history-pc-release/i.test(body)?'YES':'NO',
  HAS_R38_DISPATCH:/ZGMINI_EARNINGS_R38_AUTO_DISPATCH/i.test(body)?'YES':'NO',
  HAS_R31_PUBLICATION:/ZGMINI_EARNINGS_R31_SCOPED_PUBLICATION/i.test(body)?'YES':'NO',
  HAS_R33_OBSERVE:/ZGMINI_EARNINGS_R33_OBSERVE_PUBLISH_CYCLE/i.test(body)?'YES':'NO',
  HAS_PUBLISH_FLAG:/--publish/i.test(body)?'YES':'NO',
  HAS_SPAWN:/\b(?:spawn|spawnSync|execFile|execFileSync)\s*\(/.test(body)?'YES':'NO',
  HAS_SHELL_EXEC:/\.Run\s*\(|\.Exec\s*\(|\bexecSync\s*\(/.test(body)?'YES':'NO',
  MJS_REFERENCES:[...new Set(body.match(/[\w.-]+\.mjs/gi)||[])].slice(0,18).join(',')||'NONE',
  CMD_REFERENCES:[...new Set(body.match(/[\w.-]+\.cmd/gi)||[])].slice(0,12).join(',')||'NONE',
 };
}
function checkPinnedTargets(out){
 for(const [name,p,expected] of TARGETS){
  if(!fs.existsSync(p))throw Error('STOP_DISPATCH_FILE_MISSING');
  const actual=sha(p);out[name+'_SHA']=actual;
  out[name+'_HASH_MATCH']=actual===expected?'YES':'NO';
  if(actual!==expected)throw Error('STOP_DISPATCH_SOURCE_DRIFT');
  const flags=dispatchFlags(sourceText(p));
  for(const [key,value]of Object.entries(flags))out[name+'_'+key]=value;
 }
}
function powerShell(command){
 return exec('powershell.exe',['-NoProfile','-NonInteractive','-Command',command]);
}
function taskStatus(out){
 try{
  const raw=powerShell('$t=Get-ScheduledTask -TaskName "ZGMINI-PC-Local-Core" -ErrorAction Stop; '+
   '[pscustomobject]@{State=[string]$t.State;Enabled=[bool]$t.Settings.Enabled} | ConvertTo-Json -Compress');
  const status=JSON.parse(raw);out.CORE_TASK_STATE=status.State;
  out.CORE_TASK_ENABLED=status.Enabled?'YES':'NO';
 }catch{out.CORE_TASK_STATE='UNAVAILABLE';out.CORE_TASK_ENABLED='UNVERIFIED'}
}
function processes(out,lock){
 try{
  const script='$p=Get-CimInstance Win32_Process -Filter "Name=\'node.exe\' OR Name=\'wscript.exe\' OR Name=\'cscript.exe\'" -ErrorAction Stop; '+
   '$p | Select-Object ProcessId,ParentProcessId,Name,CommandLine,CreationDate | ConvertTo-Json -Compress';
  const raw=powerShell(script);let all=raw?JSON.parse(raw):[];
  all=Array.isArray(all)?all:[all];
  out.PROCESS_IDENTITY_CHECK='CIM_AVAILABLE';out.RELATED_PROCESS_COUNT=all.length;
  out.WRITER_ROOT_PROCESS_COUNT=all.filter(x=>/zgmini-earnings-history-pc-release/i.test(x.CommandLine||'')).length;
  out.RUN_LOCAL_PROCESS_COUNT=all.filter(x=>/run-local\.mjs/i.test(x.CommandLine||'')).length;
  out.CYCLE_PROCESS_COUNT=all.filter(x=>/local-cycle\.mjs/i.test(x.CommandLine||'')).length;
  out.EARNINGS_R38_PROCESS_COUNT=all.filter(x=>/ZGMINI_EARNINGS_R38_AUTO_DISPATCH/i.test(x.CommandLine||'')).length;
  if(!lock?.pid)return;
  const owner=all.find(x=>Number(x.ProcessId)===lock.pid);
  if(!owner){out.LOCK_PID_CIM='NOT_LISTED_IN_NODE_WSCRIPT';return}
  const cmd=String(owner.CommandLine??'');
  out.LOCK_PID_CIM='FOUND';out.LOCK_PID_EXE=path.win32.basename(String(owner.Name??'UNKNOWN'));
  out.LOCK_PID_HAS_LOCAL_CYCLE=/local-cycle\.mjs/i.test(cmd)?'YES':'NO';
  out.LOCK_PID_HAS_RUN_LOCAL=/run-local\.mjs/i.test(cmd)?'YES':'NO';
  out.LOCK_PID_HAS_APPROVED_ROOT=/zgmini-earnings-history-pc-release/i.test(cmd)?'YES':'NO';
  out.LOCK_PID_HAS_EARNINGS_R38=/ZGMINI_EARNINGS_R38_AUTO_DISPATCH/i.test(cmd)?'YES':'NO';
  const creation=Date.parse(String(owner.CreationDate||''));
  out.LOCK_PID_STARTED_BEFORE_FILE=Number.isFinite(creation)&&Number.isFinite(lock.mtime)
   ?(creation<=lock.mtime+1000?'YES':'NO'):'UNVERIFIED';
 }catch{out.PROCESS_IDENTITY_CHECK='CIM_UNAVAILABLE';out.LOCK_PID_CIM='UNVERIFIED'}
}
function lockInfo(out){
 const p=path.win32.join(HOME,'local-cycle.lock');
 if(!fs.existsSync(p)){out.LOCK_STATUS='ABSENT';return null}
 const stat=fs.statSync(p);out.LOCK_STATUS='PRESENT';
 out.LOCK_AGE_SEC=Math.floor((Date.now()-stat.mtimeMs)/1000);
 if(stat.size>4096){out.LOCK_PID='INVALID_SIZE';return null}
 try{
  const pid=json(p)?.pid;if(!Number.isSafeInteger(pid)||pid<1){out.LOCK_PID='INVALID';return null}
  out.LOCK_PID=pid;return {pid,mtime:stat.mtimeMs};
 }catch{out.LOCK_PID='UNREADABLE';return null}
}
function main(){
 const out={STATUS:'READONLY_WRITER_ORIGIN_COMPLETED',INSTALL_AUTHORIZATION:'NO',
  PC_TIME:new Date().toISOString(),PC_TIMEZONE:Intl.DateTimeFormat().resolvedOptions().timeZone,
  APPROVED_SOURCE:APPROVED,WRITER_ROUTE:'UNPROVEN',R10_HOOK_STATUS:'NOT_RECHECKED'};
 try{
  hashContract();out.MANIFEST_STATUS='HASH_VERIFIED';
  if(process.platform!=='win32')throw Error('STOP_WINDOWS_ONLY');
  const config=json(path.win32.join(HOME,'config.json'));
  const last=json(path.win32.join(HOME,'local-writer-last-run.json'));
  out.CONFIG_SOURCE=config.source;out.LAST_WRITER_SOURCE=last.source;
  out.LAST_WRITER_STATUS=last.status;out.LAST_WRITER_AT=last.at;
  out.APPROVED_CHECKOUT_HEAD=exec('git',['rev-parse','HEAD'],{cwd:ROOT});
  out.APPROVED_CHECKOUT_DIRTY=exec('git',['status','--porcelain','--untracked-files=no'],{cwd:ROOT})?'YES':'NO';
  out.R10_HOOK_STATUS=/asset-r10-sidecar-auto-publication-r1\.mjs/.test(sourceText(path.win32.join(ROOT,'scripts','pc-writer','run-local.mjs')))?'PRESENT':'ABSENT';
  checkPinnedTargets(out);taskStatus(out);
  const lock=lockInfo(out);processes(out,lock);
  out.LEDGER_STATUS=json(path.win32.join(HOME,'local-publication-ledger.json')).status;
  if(out.CONFIG_SOURCE!==APPROVED||out.LAST_WRITER_SOURCE!==APPROVED
    ||out.APPROVED_CHECKOUT_HEAD!==APPROVED||out.APPROVED_CHECKOUT_DIRTY!=='NO')
   throw Error('STOP_APPROVED_SOURCE_DRIFT');
  if(out.LEDGER_STATUS==='SUBMITTING')throw Error('STOP_PUBLICATION_SUBMITTING');
  const direct=['CORE_VBS','DISPATCH_R38','PUBLICATION_R31','OBSERVE_R33','CHANGE_R22','LEDGER_R21']
   .some(key=>out[key+'_HAS_RUN_LOCAL']==='YES'||out[key+'_HAS_LOCAL_CYCLE']==='YES'
    ||out[key+'_HAS_APPROVED_ROOT']==='YES');
  out.ROUTE_ASSESSMENT=direct?'STATIC_WRITER_REFERENCE_FOUND_EXECUTION_UNPROVEN'
   :'NO_WRITER_REFERENCE_IN_PINNED_DISPATCH_CHAIN';
  out.INSTALL_STOP_REASONS=[out.LOCK_STATUS==='PRESENT'?'LOCK_PRESENT':null,
   'WRITER_EXECUTION_ROUTE_UNPROVEN',out.PROCESS_IDENTITY_CHECK!=='CIM_AVAILABLE'?'PROCESS_IDENTITY_UNAVAILABLE':null]
   .filter(Boolean).join(',');
  out.STATUS='READONLY_WRITER_ORIGIN_COMPLETED';
 }catch(e){out.STATUS='READONLY_WRITER_ORIGIN_INCOMPLETE';out.ERROR_CODE=fail(e)}
 fs.writeFileSync(OUT,Object.entries(out).map(([k,v])=>k+'='+clean(v)).join('\r\n')+'\r\n','utf8');
 process.stdout.write('RESULT='+path.basename(OUT)+'\nSTATUS='+out.STATUS+'\n');
 if(out.STATUS!=='READONLY_WRITER_ORIGIN_COMPLETED')process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
