// ASSET R10 R5: read only the currently scheduled launch chain and cycle publication gate.
// Does not run, install, stop, unlock, reschedule, collect, publish or change source.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const OUT=path.join(HERE,'ASSET_R10_LINEAGE_RESULT.txt');
const PC_HOME='E:\\ZGmini\\data\\pc-writer';
const WRITER_ROOT='E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release';
const APPROVED='a477ef304425145f559352af4291e437e3b08a2d';
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const clean=value=>String(value??'UNAVAILABLE').replace(/[\r\n\0]/g,' ').replace(/[^\p{L}\p{N} .,:_\\/\-]/gu,'').slice(0,180);
const safeCode=e=>/^[A-Z][A-Z0-9_]+$/.test(e?.message??'')?e.message:'STOP_READONLY_ERROR';

function verifyPackage(){
 const manifest=read(path.join(HERE,'package-manifest.json'));
 const expected=new Set(['r10-live-lineage-readonly.mjs','RUN_R10_LINEAGE_READONLY.cmd','README_KO.txt','tests/r10-live-lineage-readonly.test.mjs']);
 if(manifest.schema!=='zgmini-asset-r10-lineage-r5'||manifest.approvedSource!==APPROVED
    ||manifest.files?.length!==expected.size)throw Error('STOP_MANIFEST_CONTRACT');
 for(const f of manifest.files){
  if(!expected.delete(f.path)||!new RegExp('^[a-f0-9]{64}$').test(f.sha256))throw Error('STOP_MANIFEST_CONTRACT');
  if(sha(path.join(HERE,f.path))!==f.sha256)throw Error('STOP_PACKAGE_SHA_MISMATCH');
 }
 if(expected.size)throw Error('STOP_MANIFEST_CONTRACT');
}

function powershell(command){
 return execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{
  windowsHide:true,encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024,
  stdio:['ignore','pipe','pipe'],
 }).trim();
}
function git(...args){
 return execFileSync('git',args,{cwd:WRITER_ROOT,windowsHide:true,encoding:'utf8',
  timeout:15000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']}).trim();
}
export function scriptRole(command){
 const s=String(command||'');
 if(/run-local-core\.vbs/i.test(s))return 'CORE_VBS';
 if(/run-local-korea\.vbs/i.test(s))return 'KOREA_VBS';
 if(/ZGMINI_EARNINGS_R38_AUTO_DISPATCH/i.test(s))return 'EARNINGS_R38';
 if(/ZGMINI_EARNINGS_R31_SCOPED_PUBLICATION/i.test(s))return 'EARNINGS_R31';
 if(/run-local\.mjs/i.test(s))return 'WRITER_RUN_LOCAL';
 if(/local-cycle\.mjs/i.test(s))return 'LOCAL_CYCLE';
 return 'OTHER';
}
export function processLineage(all,pid,maxDepth=9){
 const byPid=new Map(all.map(p=>[Number(p.ProcessId),p]));
 const chain=[],seen=new Set();let id=pid;
 const started=value=>{
  const s=String(value??'');const wrapped=/^\/Date\((\d+)(?:[-+]\d+)?\)\/$/.exec(s);
  return wrapped?Number(wrapped[1]):Date.parse(s);
 };
 while(Number.isSafeInteger(id)&&id>0&&chain.length<maxDepth&&!seen.has(id)){
  seen.add(id);const p=byPid.get(id);if(!p)break;
  if(chain.length){
   const child=byPid.get(chain[chain.length-1].pid);
   const childStart=started(child?.CreationDate),parentStart=started(p.CreationDate);
   // Windows may reuse a PID. A newer process cannot be the child's parent.
   if(Number.isFinite(childStart)&&Number.isFinite(parentStart)&&parentStart>childStart+1000)break;
  }
  chain.push({pid:id,parent:Number(p.ParentProcessId),name:String(p.Name||'UNKNOWN'),
   role:scriptRole(p.CommandLine),korea:/--korea(?:\s|"|$)/i.test(p.CommandLine||''),
   publish:/--publish(?:\s|"|$)/i.test(p.CommandLine||''),
   approvedRoot:/zgmini-earnings-history-pc-release/i.test(p.CommandLine||'')});
  id=Number(p.ParentProcessId);
 }
 return chain;
}
export function routeAssessment(chain){
 if(!chain.length)return 'NO_LIVE_PROCESS_EVIDENCE';
 const cycle=chain.find(x=>x.role==='LOCAL_CYCLE');
 if(!cycle)return 'NO_CYCLE_IN_LINEAGE';
 if(cycle.korea)return 'KOREA_LANE_NO_CORE_PUBLICATION';
 if(!cycle.publish)return 'CORE_LANE_WITHOUT_PUBLISH_FLAG';
 if(chain.some(x=>x.role==='CORE_VBS'))return 'CORE_VBS_TO_PUBLISH_CYCLE_OBSERVED';
 return 'CORE_PUBLISH_CYCLE_PARENT_UNCONFIRMED';
}
function writeChain(out,prefix,chain){
 out[prefix+'_DEPTH']=chain.length;
 out[prefix+'_ROUTE_ASSESSMENT']=routeAssessment(chain);
 for(let i=0;i<chain.length;i++){
  const v=chain[i],key=prefix+'_ANCESTOR_'+i;
  out[key+'_PID']=v.pid;
  out[key+'_NAME']=v.name;
  out[key+'_ROLE']=v.role;
  out[key+'_PUBLISH_FLAG']=v.publish?'YES':'NO';
  out[key+'_KOREA_FLAG']=v.korea?'YES':'NO';
  out[key+'_APPROVED_ROOT']=v.approvedRoot?'YES':'NO';
 }
}
function readLocalCycle(out){
 const f=path.win32.join(PC_HOME,'local-cycle-last-run.json');
 if(!fs.existsSync(f)){out.CYCLE_REPORT='MISSING';return}
 const data=read(f);out.CYCLE_REPORT='PRESENT';
 out.CYCLE_REPORT_AT=data.at??'UNAVAILABLE';
 out.CYCLE_REPORT_LANE=data.lane??'UNAVAILABLE';
 out.CYCLE_REPORT_PUBLISH_REQUESTED=data.publishRequested===true?'YES':data.publishRequested===false?'NO':'UNVERIFIED';
 out.CYCLE_REPORT_PUBLISH_ALLOWED=data.publicationPolicy?.publishAllowed===true?'YES':data.publicationPolicy?.publishAllowed===false?'NO':'UNVERIFIED';
 out.CYCLE_REPORT_STATUS=data.status??'UNAVAILABLE';
 out.CYCLE_REPORT_PUBLICATION_EXIT=Number.isSafeInteger(data.publicationExit)?data.publicationExit:'UNAVAILABLE';
}
function readTasks(out){
 const script='$names=@("ZGMINI-PC-Local-Core","ZGMINI-PC-Local-Korea","ZGMINI-PC-Writer");'+
  '$rows=@(foreach($name in $names){'+
  'try{$t=Get-ScheduledTask -TaskName $name -ErrorAction Stop;'+
  '$i=Get-ScheduledTaskInfo -TaskName $name -ErrorAction Stop;'+
  '[pscustomobject]@{Name=$name;State=[string]$t.State;Enabled=[bool]$t.Settings.Enabled;'+
  'LastRun=$i.LastRunTime.ToString("o");NextRun=$i.NextRunTime.ToString("o");Result=[int]$i.LastTaskResult}}'+
  'catch{[pscustomobject]@{Name=$name;State="UNAVAILABLE";Enabled=$false;LastRun="UNAVAILABLE";NextRun="UNAVAILABLE";Result=-1}}'+
  '});$rows|ConvertTo-Json -Compress';
 const v=JSON.parse(powershell(script));
 for(const task of (Array.isArray(v)?v:[v])){
  const id=task.Name==='ZGMINI-PC-Local-Core'?'CORE':task.Name==='ZGMINI-PC-Local-Korea'?'KOREA':'WRITER';
  out[id+'_TASK_STATE']=task.State;
  out[id+'_TASK_ENABLED']=task.State==='UNAVAILABLE'?'UNVERIFIED':task.Enabled?'YES':'NO';
  out[id+'_TASK_LAST_RUN']=task.LastRun;
  out[id+'_TASK_NEXT_RUN']=task.NextRun;
  out[id+'_TASK_LAST_RESULT']=task.Result;
 }
}
function readProcessSnapshot(out){
 const script='$p=Get-CimInstance Win32_Process -ErrorAction Stop | '+
  'Select-Object ProcessId,ParentProcessId,Name,CommandLine,CreationDate;'+
  '$p|ConvertTo-Json -Compress';
 let all=JSON.parse(powershell(script));all=Array.isArray(all)?all:[all];
 out.PROCESS_QUERY='CIM_AVAILABLE';
 const current=all.filter(p=>/local-cycle\.mjs/i.test(p.CommandLine||''));
 const writers=all.filter(p=>/run-local\.mjs/i.test(p.CommandLine||''));
 out.LIVE_CYCLE_COUNT=current.length;out.LIVE_WRITER_COUNT=writers.length;
 const lockPath=path.win32.join(PC_HOME,'local-cycle.lock');
 let lockPid=null;
 if(fs.existsSync(lockPath)){
  out.LOCK_STATUS='PRESENT';const stat=fs.statSync(lockPath);
  out.LOCK_AGE_SEC=Math.floor((Date.now()-stat.mtimeMs)/1000);
  if(stat.size<4096){try{const p=read(lockPath)?.pid;if(Number.isSafeInteger(p)&&p>0)lockPid=p}catch{}}
 }else out.LOCK_STATUS='ABSENT';
 out.LOCK_PID=lockPid??'UNVERIFIED';
 const owner=lockPid?all.find(p=>Number(p.ProcessId)===lockPid):null;
 out.LOCK_PID_PROCESS=owner?scriptRole(owner.CommandLine):'NOT_FOUND_OR_NO_LOCK';
 const ordered=current.slice().sort((a,b)=>Number(a.ProcessId)===lockPid?-1:Number(b.ProcessId)===lockPid?1:0);
 for(const [i,p] of ordered.slice(0,3).entries())writeChain(out,'CYCLE_'+i,processLineage(all,Number(p.ProcessId)));
 for(const [i,p] of writers.slice(0,2).entries())writeChain(out,'WRITER_'+i,processLineage(all,Number(p.ProcessId)));
 out.LOCK_OWNER_CHAIN_CAPTURED=ordered.some(p=>Number(p.ProcessId)===lockPid)?'YES':'NO';
}
function main(){
 const out={STATUS:'READONLY_LINEAGE_INCOMPLETE',INSTALL_AUTHORIZATION:'NO',
  PC_TIME:new Date().toISOString(),APPROVED_SOURCE:APPROVED};
 try{
  verifyPackage();out.MANIFEST_STATUS='HASH_VERIFIED';
  if(process.platform!=='win32')throw Error('STOP_WINDOWS_ONLY');
  const config=read(path.win32.join(PC_HOME,'config.json'));
  const last=read(path.win32.join(PC_HOME,'local-writer-last-run.json'));
  out.CONFIG_SOURCE=config.source;out.LAST_WRITER_SOURCE=last.source;
  out.LAST_WRITER_AT=last.at;out.LAST_WRITER_STATUS=last.status;
  out.APPROVED_HEAD=git('rev-parse','HEAD');
  out.APPROVED_DIRTY=git('status','--porcelain','--untracked-files=no')?'YES':'NO';
  const writerText=fs.readFileSync(path.win32.join(WRITER_ROOT,'scripts','pc-writer','run-local.mjs'),'utf8');
  out.R10_HOOK_STATUS=/asset-r10-sidecar-auto-publication-r1\.mjs/.test(writerText)?'PRESENT':'ABSENT';
  const ledger=read(path.win32.join(PC_HOME,'local-publication-ledger.json'));
  out.LEDGER_STATUS=ledger.status??'UNAVAILABLE';
  readLocalCycle(out);readTasks(out);readProcessSnapshot(out);
  if(out.CONFIG_SOURCE!==APPROVED||out.LAST_WRITER_SOURCE!==APPROVED||out.APPROVED_HEAD!==APPROVED||out.APPROVED_DIRTY!=='NO')
   throw Error('STOP_APPROVED_SOURCE_DRIFT');
  if(out.LEDGER_STATUS==='SUBMITTING')throw Error('STOP_PUBLICATION_SUBMITTING');
  out.ROUTE_CONCLUSION=Array.from({length:3},(_,i)=>out['CYCLE_'+i+'_ROUTE_ASSESSMENT'])
   .includes('CORE_VBS_TO_PUBLISH_CYCLE_OBSERVED')?'CORE_ORIGIN_SNAPSHOT_OBSERVED_NOT_INSTALL_AUTHORIZED'
   :'NORMAL_WRITER_ORIGIN_NOT_PROVEN';
  out.INSTALL_STOP_REASONS=[out.LOCK_STATUS==='PRESENT'?'LOCK_PRESENT':null,'NO_AUTHORIZED_INSTALL_ROUTE'].filter(Boolean).join(',');
  out.STATUS='READONLY_LINEAGE_COMPLETED';
 }catch(e){out.ERROR_CODE=safeCode(e)}
 fs.writeFileSync(OUT,Object.entries(out).map(([k,v])=>k+'='+clean(v)).join('\r\n')+'\r\n','utf8');
 process.stdout.write('RESULT='+path.basename(OUT)+'\nSTATUS='+out.STATUS+'\n');
 if(out.STATUS!=='READONLY_LINEAGE_COMPLETED')process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
