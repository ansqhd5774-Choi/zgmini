// R52: observe existing Core lock, optionally wait for a naturally free window,
// then reuse the unchanged R51/R46 guarded installer. Never remove/rename locks.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runR51PcApply} from './market-calendar-r51-pc-apply.mjs';

const sha=v=>createHash('sha256').update(String(v)).digest('hex').slice(0,12);
const snooze=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const outBase=()=>process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`;

export function inspectR52CoreLock({
 base=outBase(),now=Date.now(),probePid=pid=>process.kill(pid,0),
}={}){
 const file=path.join(base,'local-cycle.lock');
 try{
  const st=fs.lstatSync(file);
  if(!st.isFile()||st.size<1||st.size>4096)
   return {state:'UNVERIFIED',reason:'LOCK_TYPE_OR_SIZE_INVALID'};
  const body=JSON.parse(fs.readFileSync(file,'utf8'));
  const pid=body?.pid,at=body?.at;
  const age=Math.max(0,Math.floor((now-st.mtimeMs)/1000));
  if(!Number.isSafeInteger(pid)||pid<=0||pid>4_294_967_295||
   !Number.isFinite(at)||at<1577836800000||at>now+120000)
   return {state:'UNVERIFIED',reason:'LOCK_OWNER_METADATA_INVALID',ageSeconds:age};
  const identity=sha(pid);
  try{probePid(pid);return {state:'OWNER_ALIVE',ageSeconds:age,ownerId:identity};}
  catch(error){
   if(error?.code==='ESRCH')return {state:'OWNER_NOT_FOUND',ageSeconds:age,ownerId:identity};
   return {state:'UNVERIFIED',reason:'OWNER_PROBE_INDETERMINATE',ageSeconds:age};
  }
 }catch(error){
  if(error?.code==='ENOENT')return {state:'FREE'};
  return {state:'UNVERIFIED',reason:'LOCK_READ_FAILED'};
 }
}

export async function runR52WaitApply({
 base=outBase(),waitMs=180000,pollMs=5000,clock=Date.now,
 inspect=inspectR52CoreLock,install=runR51PcApply,wait=snooze,
}={}){
 const output={audit:'MARKET_CALENDAR_R52_LOCK_WINDOW_R45_INSTALL',at:new Date().toISOString(),
  decision:'R52_WINDOW_UNVERIFIED_STOP',mode:'CONDITIONAL_APPLY',
  sourceWrites:0,changedFiles:[],backupCreated:false,providerCallsAdded:0,
  forcedCollection:false,published:false,dbWrites:0,schedulerChanged:false,
  gitPushed:false,newSource:null,lockChecks:0,installAttempts:0};
 const limit=Number.isFinite(waitMs)?Math.max(0,Math.min(waitMs,600000)):180000;
 const interval=Number.isFinite(pollMs)?Math.max(250,Math.min(pollMs,30000)):5000;
 const deadline=clock()+limit;
 let status;
 try{
  while(true){
   status=inspect({base,now:clock()});output.lockChecks++;
   if(status.state==='OWNER_NOT_FOUND'){
    output.decision='R52_ORPHANED_CORE_LOCK_PRESERVED_STOP';break;
   }
   if(status.state==='UNVERIFIED'){
    output.decision='R52_LOCK_OWNER_UNVERIFIED_STOP';break;
   }
   if(status.state==='FREE'&&!fs.existsSync(path.join(base,'quota-runner.lock'))){
    output.installAttempts++;
    const r=install({apply:true,base});
    const success=r?.decision==='R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION';
    if(success)return {...r,audit:output.audit,lockChecks:output.lockChecks,
     installAttempts:output.installAttempts,waitedForNaturalUnlock:true};
    if(!['R46_CORE_LOCK_BUSY_STOP','R51_QUOTA_RUNNER_ACTIVE_STOP'].includes(r?.decision)){
     return {...r,audit:output.audit,lockChecks:output.lockChecks,
      installAttempts:output.installAttempts,waitedForNaturalUnlock:true};
    }
    output.lastInstallerDecision=r.decision;
   }
   if(clock()>=deadline){
    output.decision='R52_NATURAL_UNLOCK_WAIT_EXPIRED_NO_CHANGES';break;
   }
   await wait(Math.min(interval,Math.max(0,deadline-clock())));
  }
 }catch{output.decision='R52_LOCK_AUDIT_FAILED_STOP';}
 output.lockState=status?.state??null;
 output.lockAgeSeconds=status?.ageSeconds??null;
 output.lockOwnerId=status?.ownerId??null;
 output.lockReason=status?.reason??null;
 return output;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const baseArg=process.argv.find(x=>x.startsWith('--base='));
 const waitArg=process.argv.find(x=>x.startsWith('--wait-ms='));
 const params={};if(baseArg)params.base=baseArg.slice(7);
 if(waitArg)params.waitMs=Number(waitArg.slice(10));
 const r=await runR52WaitApply(params);
 console.log(JSON.stringify(r));
 if(r.decision!=='R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION')process.exitCode=2;
}
