import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {policyForProvider,quotaWindowMs} from './quota-policy.mjs';

const VERSION=1;
const DAY=24*60*60*1000;
const MONTH=31*DAY;
const ALPACA_WINDOW=60_000;
const ALPACA_LOCK_WAIT_MS=1_500;
const ALPACA_STALE_LOCK_MS=5*60_000;
const alpacaEmpty=()=>({version:1,requestTimes:[],lastRemoteLimit:null,
 lastRemoteRemaining:null,lastRemoteResetAt:null,lastStatus:null,quotaState:'AVAILABLE'});
export function alpacaQuotaLedgerPath(base){return path.join(base,'alpaca-quota-ledger.json');}

function alpacaGuard(retryAt,reason='ALPACA_QUOTA_GUARD'){
 const error=Error('PROVIDER_QUOTA_GUARD');
 error.code='PROVIDER_QUOTA_GUARD';error.provider='ALPACA';
 error.retryAt=retryAt;error.reason=reason;return error;
}

// mkdir is atomic across independent Node processes on the same local volume.
// This is an Alpaca-only reservation lock; the existing Core PID/task lock is
// never read, renamed, removed, or modified by this module.
function withAlpacaLock(base,fn){
 if(!fs.existsSync(base)||!fs.statSync(base).isDirectory())throw alpacaGuard(Date.now()+60_000,'ALPACA_BASE_UNAVAILABLE');
 const lock=path.join(base,'alpaca-quota-reservation.lock');
 const until=Date.now()+ALPACA_LOCK_WAIT_MS;
 const sleeper=new Int32Array(new SharedArrayBuffer(4));
 const ownerFile=path.join(lock,'owner.json');
 const recoverDeadOwner=()=>{
  // Never touch the Core lock. Only reclaim this exact quota directory after
  // proving that its owner PID has exited and it is older than five minutes.
  let owner,metadata;
  try{
   metadata=fs.statSync(lock);
   if(!metadata.isDirectory()||Date.now()-metadata.mtimeMs<ALPACA_STALE_LOCK_MS)return false;
   owner=JSON.parse(fs.readFileSync(ownerFile,'utf8'));
   if(!Number.isSafeInteger(owner.pid)||owner.pid<=0||!Number.isSafeInteger(owner.startedAt)||
     Date.now()-owner.startedAt<ALPACA_STALE_LOCK_MS)return false;
  }catch{return false;}
  try{process.kill(owner.pid,0);return false;}
  catch(error){if(error.code!=='ESRCH')return false;}
  const orphan=`${lock}.stale-${process.pid}-${randomUUID()}`;
  try{
   fs.renameSync(lock,orphan);
   // Quarantined directory is quota-owned and contains one bounded metadata
   // file. Unrelated files mean unexpected state: leave it for manual review.
   fs.unlinkSync(path.join(orphan,'owner.json'));
   fs.rmdirSync(orphan);
   return true;
  }catch{return false;}
 };
 for(;;){
  let created=false;
  try{
   fs.mkdirSync(lock);created=true;
   fs.writeFileSync(ownerFile,JSON.stringify({pid:process.pid,startedAt:Date.now()}),{flag:'wx'});
   break;
  }
  catch(error){
   if(created){try{fs.unlinkSync(ownerFile);}catch{}try{fs.rmdirSync(lock);}catch{}throw alpacaGuard(Date.now()+60_000,'ALPACA_LOCK_OWNER_WRITE_FAILED');}
   if(error.code!=='EEXIST')throw alpacaGuard(Date.now()+60_000,'ALPACA_LOCK_UNAVAILABLE');
   if(recoverDeadOwner())continue;
   if(Date.now()>=until)throw alpacaGuard(Date.now()+60_000,'ALPACA_LOCK_BUSY');
   Atomics.wait(sleeper,0,0,15);
  }
 }
 try{return fn();}finally{fs.unlinkSync(ownerFile);fs.rmdirSync(lock);}
}

function alpacaRead(base){
 const file=alpacaQuotaLedgerPath(base);
 if(!fs.existsSync(file))return alpacaEmpty();
 let value;try{value=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw alpacaGuard(Date.now()+60_000,'ALPACA_LEDGER_INVALID');}
 if(!value||value.version!==1||!Array.isArray(value.requestTimes)||
    !value.requestTimes.every(x=>Number.isSafeInteger(x)&&x>=0)||
    (value.lastRemoteLimit!=null&&(!Number.isSafeInteger(value.lastRemoteLimit)||value.lastRemoteLimit<=0))||
    (value.lastRemoteRemaining!=null&&(!Number.isSafeInteger(value.lastRemoteRemaining)||value.lastRemoteRemaining<0))||
    (value.lastRemoteResetAt!=null&&(!Number.isSafeInteger(value.lastRemoteResetAt)||value.lastRemoteResetAt<0)))
    throw alpacaGuard(Date.now()+60_000,'ALPACA_LEDGER_INVALID');
 return value;
}

function alpacaSave(base,value){
 const file=alpacaQuotaLedgerPath(base);
 const temp=`${file}.tmp-${process.pid}-${randomUUID()}`;
 fs.writeFileSync(temp,JSON.stringify(value),{flag:'wx'});
 try{fs.renameSync(temp,file);}catch(error){try{fs.unlinkSync(temp);}catch{}throw error;}
}

function alpacaTrim(value,now){
 if(value.requestTimes.some(t=>t>now+1000))throw alpacaGuard(now+60_000,'ALPACA_CLOCK_DRIFT');
 value.requestTimes=value.requestTimes.filter(t=>t>=now-ALPACA_WINDOW);
 if(value.lastRemoteResetAt!=null&&now>=value.lastRemoteResetAt){
  value.lastRemoteLimit=null;value.lastRemoteRemaining=null;value.lastRemoteResetAt=null;
 }
}

function alpacaReserve(base,now){
 return withAlpacaLock(base,()=>{
  const item=alpacaRead(base);alpacaTrim(item,now);
  const policy=policyForProvider('ALPACA');
  const count=item.requestTimes.length;
  const localWait=count>=policy.perMinute?Math.min(...item.requestTimes)+ALPACA_WINDOW+1:null;
  const reserve=Math.max(policy.protectedRemaining,
   item.lastRemoteLimit==null?0:Math.ceil(item.lastRemoteLimit*0.3));
  const remoteWait=item.lastRemoteRemaining!=null&&item.lastRemoteRemaining<=reserve?
   (item.lastRemoteResetAt??now+ALPACA_WINDOW):null;
  if(localWait!=null||remoteWait!=null){
   item.quotaState='COOLDOWN';alpacaSave(base,item);
   throw alpacaGuard(Math.max(now+1,localWait??0,remoteWait??0),
    remoteWait!=null?'ALPACA_REMOTE_RESERVE':'ALPACA_LOCAL_140');
  }
  item.requestTimes.push(now);
  if(item.lastRemoteRemaining!=null)item.lastRemoteRemaining=Math.max(0,item.lastRemoteRemaining-1);
  item.quotaState=item.requestTimes.length>=policy.warningPerMinute?'QUOTA_WARNING':'AVAILABLE';
  alpacaSave(base,item);
  return {count:item.requestTimes.length,warning:item.quotaState==='QUOTA_WARNING'};
 });
}

function alpacaObserve(base,{status,at,headers}){
 return withAlpacaLock(base,()=>{
  const item=alpacaRead(base);alpacaTrim(item,at);
  const h=name=>headers?.get?.(name)??headers?.[name]??null;
  const limit=Number(h('X-RateLimit-Limit'));
  const remain=Number(h('X-RateLimit-Remaining'));
  const reset=Number(h('X-RateLimit-Reset'));
  const valid=Number.isSafeInteger(limit)&&limit>0&&Number.isSafeInteger(remain)&&
   remain>=0&&remain<=limit&&Number.isSafeInteger(reset)&&
   reset*1000>at&&reset*1000<=at+DAY;
  if(valid){
   const remoteReset=reset*1000;
   if(item.lastRemoteResetAt==null||at>=item.lastRemoteResetAt){
    item.lastRemoteLimit=limit;item.lastRemoteRemaining=remain;item.lastRemoteResetAt=remoteReset;
   }else{
    // Sliding/late response headers must not replenish reserved slots before
    // the previous server window has actually expired.
    item.lastRemoteLimit=Math.min(item.lastRemoteLimit??limit,limit);
    item.lastRemoteRemaining=Math.min(item.lastRemoteRemaining??remain,remain);
    item.lastRemoteResetAt=Math.max(item.lastRemoteResetAt,remoteReset);
   }
  }
  item.lastStatus=Number.isInteger(status)?status:null;
  if(status===429){
   item.lastRemoteRemaining=0;
   item.lastRemoteLimit??=200;
   item.lastRemoteResetAt??=at+60_000;
   item.quotaState='COOLDOWN';
  }else if(item.lastRemoteRemaining!=null&&item.lastRemoteRemaining<=Math.max(60,Math.ceil((item.lastRemoteLimit??200)*0.3)))
   item.quotaState='QUOTA_WARNING';
  alpacaSave(base,item);
 });
}

const empty=()=>({version:VERSION,updatedAt:new Date().toISOString(),providers:{}});
const state=()=>({requestTimes:[],errorTimes:[],lastRequestAt:null,lastSuccessAt:null,lastStatus:null,lastError:null,quotaState:'AVAILABLE'});

export function quotaLedgerPath(base){return path.join(base,'quota-ledger.json');}

export function readQuotaLedger(base){
 const file=quotaLedgerPath(base);
 if(!fs.existsSync(file))return empty();
 let value;try{value=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw Error('QUOTA_LEDGER_INVALID');}
 if(!value||value.version!==VERSION||typeof value.providers!=='object')throw Error('QUOTA_LEDGER_INVALID');
 return value;
}

function atomicWrite(file,value){
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const temp=`${file}.tmp-${process.pid}`;
 fs.writeFileSync(temp,JSON.stringify(value,null,2));
 fs.renameSync(temp,file);
}

function trim(item,now,policy){
 const horizon=Math.max(quotaWindowMs(policy),MONTH);
 item.requestTimes=(Array.isArray(item.requestTimes)?item.requestTimes:[]).filter(x=>Number.isFinite(x)&&x>=now-horizon);
 item.errorTimes=(Array.isArray(item.errorTimes)?item.errorTimes:[]).filter(x=>Number.isFinite(x)&&x>=now-60_000);
}

function countSince(times,now,windowMs){return times.filter(x=>x>=now-windowMs).length;}

function nextAllowed(item,policy,now){
 const waits=[];
 if(policy.minIntervalMs&&item.lastRequestAt!=null)waits.push(item.lastRequestAt+policy.minIntervalMs);
 const windows=[['perSecond',1_000],['per10Sec',10_000],['perMinute',60_000],['perHour',3_600_000],['perDay',DAY]];
 for(const [name,windowMs] of windows){
  const limit=policy[name];if(!Number.isFinite(limit))continue;
  const relevant=item.requestTimes.filter(x=>x>=now-windowMs);
  if(relevant.length>=limit)waits.push(relevant[relevant.length-limit]+windowMs);
 }
 if(Number.isFinite(policy.maxErrorPerMinute)){
  const errors=item.errorTimes.filter(x=>x>=now-60_000);
  if(errors.length>=policy.maxErrorPerMinute)waits.push(errors[errors.length-policy.maxErrorPerMinute]+60_000);
 }
 return waits.length?Math.max(now,...waits):null;
}

export class QuotaLedger{
 constructor(base,{mode='observe',now=Date.now()}={}){this.base=base;this.mode=mode;this.file=quotaLedgerPath(base);this.value=readQuotaLedger(base);this.now=now;this.events=[];}
 persist(){this.value.updatedAt=new Date().toISOString();atomicWrite(this.file,this.value);}
 item(provider,now=this.now){const policy=policyForProvider(provider);if(!policy)return null;const item=this.value.providers[provider]??=state();trim(item,now,policy);return item;}
 beforeRequest(provider,now=Date.now()){
  const policy=policyForProvider(provider);if(!policy)return {allowed:true,provider,guarded:false};
  if(provider==='ALPACA'){
   try{
    const result=alpacaReserve(this.base,now);
    this.events.push({provider,at:new Date(now).toISOString(),allowed:true,
     blocked:result.warning,mode:'enforce',reason:result.warning?'ALPACA_120_WARNING':undefined});
    return {allowed:true,provider,guarded:true,warning:result.warning};
   }catch(error){
    const guard=error?.code==='PROVIDER_QUOTA_GUARD'?error:alpacaGuard(now+60_000,'ALPACA_LEDGER_UNAVAILABLE');
    this.events.push({provider,at:new Date(now).toISOString(),allowed:false,
     blocked:true,mode:'enforce',reason:guard.reason,retryAt:new Date(guard.retryAt).toISOString()});
    throw guard;
   }
  }
  const item=this.item(provider,now);const at=nextAllowed(item,policy,now);
  const blocked=at!=null&&at>now;
  const enforced=blocked&&this.mode==='enforce'&&policy.hard!==false;
  const event={provider,at:new Date(now).toISOString(),allowed:!enforced,blocked,mode:this.mode};
  if(blocked){event.reason='QUOTA_COOLDOWN';event.retryAt=new Date(at).toISOString();item.quotaState=this.mode==='enforce'?'COOLDOWN':'QUOTA_WARNING';}
  if(enforced){this.events.push(event);this.persist();const error=Error('PROVIDER_QUOTA_GUARD');error.code='PROVIDER_QUOTA_GUARD';error.provider=provider;error.retryAt=at;throw error;}
  item.requestTimes.push(now);item.lastRequestAt=now;
  if(!blocked)item.quotaState='AVAILABLE';
  this.events.push(event);this.persist();
  return {allowed:true,provider,guarded:false,warning:blocked?event:null};
 }
 afterResponse(provider,{status=null,ok=false,error=null,at=Date.now(),headers=null}={}){
  const policy=policyForProvider(provider);if(!policy)return;
  if(provider==='ALPACA'){
   try{alpacaObserve(this.base,{status,at,headers});}
   catch(error){throw error?.code==='PROVIDER_QUOTA_GUARD'?error:alpacaGuard(at+60_000,'ALPACA_LEDGER_UNAVAILABLE');}
   return;
  }
  const item=this.item(provider,at);item.lastStatus=status;
  if(ok){item.lastSuccessAt=at;item.lastError=null;item.quotaState='AVAILABLE';}
  else{item.lastError=error?.code??error?.message??'PROVIDER_ERROR';item.errorTimes.push(at);item.quotaState=status===429?'QUOTA_WARNING':'FAILED';}
  this.persist();
 }
 summary(){
  const providers={};
  for(const [provider,item] of Object.entries(this.value.providers))providers[provider]={requests:item.requestTimes.length,lastRequestAt:item.lastRequestAt,lastSuccessAt:item.lastSuccessAt,lastStatus:item.lastStatus,quotaState:item.quotaState};
  try{const a=alpacaRead(this.base);if(a.requestTimes.length)providers.ALPACA={requests:a.requestTimes.length,
   lastRequestAt:a.requestTimes.at(-1)??null,lastSuccessAt:null,lastStatus:a.lastStatus,quotaState:a.quotaState};}
  catch{providers.ALPACA={requests:null,quotaState:'UNAVAILABLE'};}
  return {version:VERSION,mode:this.mode,guarded:this.events.filter(x=>x.blocked&&x.allowed===false).length,warnings:this.events.filter(x=>x.blocked&&x.allowed===true).length,events:this.events.map(x=>({...x})),providers};
 }
}
