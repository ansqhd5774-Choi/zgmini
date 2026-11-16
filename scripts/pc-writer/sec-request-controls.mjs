// SEC request hardening candidate (SOURCE-ONLY). Does not mutate any live PC
// installation, scheduler or production state. Do not confuse with a deploy.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

const LOCK_TIMEOUT_MS=1500;
const STALE_LOCK_MS=5*60_000;
const MAX_LEDGER_BYTES=4096;
const MAX_FUTURE_MS=60_000;
const MIN_INTERVAL_MS=110; // safer than 100ms due clock granularity
const MAX_WAIT_MS=30_000;
const TERMINAL=new Set([400,401,403,404,405,410,422]);
const RETRYABLE=new Set([429,500,502,503,504]);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function stop(code,details={}){
 const e=new Error(code); e.code=code;Object.assign(e,details);throw e;
}
function lockPath(base){return path.join(base,'sec-shared-reservation.lock');}
function ledgerPath(base){return path.join(base,'sec-shared-reservations.json');}
function readLedger(file,now){
 if(!fs.existsSync(file))return {version:1,lastReservedAt:null,cooldownUntil:0};
 let raw;
 try {const size=fs.statSync(file).size;if(size<2||size>MAX_LEDGER_BYTES)stop('SEC_LEDGER_INVALID');raw=JSON.parse(fs.readFileSync(file,'utf8'));}
 catch(e){stop('SEC_LEDGER_INVALID',{causeCode:e?.code??null});}
 if(raw?.version!==1||!Number.isSafeInteger(raw.cooldownUntil)||raw.cooldownUntil<0||
  (raw.lastReservedAt!==null&&(!Number.isSafeInteger(raw.lastReservedAt)||raw.lastReservedAt<=0))||
  Object.keys(raw).some(k=>!['version','lastReservedAt','cooldownUntil'].includes(k)))stop('SEC_LEDGER_INVALID');
 if((raw.lastReservedAt??0)>now+MAX_FUTURE_MS||raw.cooldownUntil>now+120_000)stop('SEC_CLOCK_OR_COOLDOWN_INVALID');
 return raw;
}
function writeLedger(file,value){
 const temp=`${file}.tmp-${process.pid}-${randomUUID()}`;
 try{fs.writeFileSync(temp,JSON.stringify(value),{flag:'wx'});fs.renameSync(temp,file);}
 catch(e){try{fs.unlinkSync(temp);}catch{}stop('SEC_LEDGER_WRITE_FAILED',{causeCode:e?.code??null});}
}
// Never remove a lock owned by a running process or one without a proven PID.
function tryRecoverDeadLock(lock,now){
 const ownerPath=path.join(lock,'owner.json');
 let owner,stat;
 try{stat=fs.statSync(lock);if(!stat.isDirectory()||now-stat.mtimeMs<STALE_LOCK_MS)return false;
  owner=JSON.parse(fs.readFileSync(ownerPath,'utf8'));
  if(!Number.isSafeInteger(owner.pid)||owner.pid<=0||!Number.isSafeInteger(owner.startedAt)||now-owner.startedAt<STALE_LOCK_MS)return false;
 }catch{return false;}
 try{process.kill(owner.pid,0);return false;}
 catch(e){if(e?.code!=='ESRCH')return false;}
 let names;try{names=fs.readdirSync(lock);if(names.length!==1||names[0]!=='owner.json')return false;}catch{return false;}
 const quarantine=`${lock}.stale-${process.pid}-${randomUUID()}`;
 try{fs.renameSync(lock,quarantine);fs.unlinkSync(path.join(quarantine,'owner.json'));fs.rmdirSync(quarantine);return true;}
 catch{return false;}
}
function withLock(base,action,{now=Date.now,waitMs=LOCK_TIMEOUT_MS}={}){
 if(!fs.existsSync(base)||!fs.statSync(base).isDirectory())stop('SEC_BASE_UNAVAILABLE');
 const lock=lockPath(base),owner=path.join(lock,'owner.json');const until=now()+waitMs;
 const sleeper=new Int32Array(new SharedArrayBuffer(4));
 for(;;){
  let created=false;
  try{fs.mkdirSync(lock);created=true;fs.writeFileSync(owner,JSON.stringify({pid:process.pid,startedAt:now()}),{flag:'wx'});break;}
  catch(e){
   if(created){try{fs.unlinkSync(owner);}catch{}try{fs.rmdirSync(lock);}catch{}stop('SEC_LOCK_OWNER_WRITE_FAILED');}
   if(e?.code!=='EEXIST')stop('SEC_LOCK_UNAVAILABLE',{causeCode:e?.code});
   if(tryRecoverDeadLock(lock,now()))continue;
   if(now()>=until)stop('SEC_LOCK_BUSY');
   Atomics.wait(sleeper,0,0,12);
  }
 }
 try{return action();}
 finally{
  try{fs.unlinkSync(owner);fs.rmdirSync(lock);}
  catch {stop('SEC_LOCK_RELEASE_FAILED');}
 }
}
export function createSecSharedLimiter({base,minIntervalMs=MIN_INTERVAL_MS,maxWaitMs=MAX_WAIT_MS,
  now=Date.now,pause=sleep}={}){
 if(typeof base!=='string'||!path.isAbsolute(base)||!Number.isSafeInteger(minIntervalMs)||minIntervalMs<100||
  !Number.isSafeInteger(maxWaitMs)||maxWaitMs<0||maxWaitMs>120_000)stop('SEC_GATE_CONFIG_INVALID');
 return {
  async reserve(){
   const started=now();
   for(;;){
    const current=now();if(current-started>maxWaitMs)stop('SEC_QUEUE_DEADLINE');
    const wait=withLock(base,()=>{
     const ledger=readLedger(ledgerPath(base),current);
     const next=Math.max(ledger.cooldownUntil,(ledger.lastReservedAt??0)+minIntervalMs);
     if(next>current)return next-current;
     ledger.lastReservedAt=current;
     writeLedger(ledgerPath(base),ledger);
     return 0;
    },{now});
    if(wait===0)return {at:current};
    const remaining=maxWaitMs-(now()-started);
    if(remaining<=0)stop('SEC_QUEUE_DEADLINE');
    await pause(Math.max(1,Math.min(wait,remaining,1000)));
   }
  },
  // Global cooldown on 429 (plus Retry-After) and 503 avoids retry storms.
  noteResponse({status,retryAfter=null}={}){
   if(status!==429&&status!==503)return {cooldownUpdated:false};
   return withLock(base,()=>{
    const at=now();const state=readLedger(ledgerPath(base),at);
    let wait=status===429?2000:1000;
    if(typeof retryAfter==='string'&&/^\d{1,3}$/.test(retryAfter.trim()))wait=Math.min(60_000,Math.max(wait,Number(retryAfter.trim())*1000));
    state.cooldownUntil=Math.max(state.cooldownUntil,at+wait);
    writeLedger(ledgerPath(base),state);
    return {cooldownUpdated:true,until:state.cooldownUntil};
   },{now});
  }
 };
}

export function secRetryDecision({status,attempt,maxAttempts=3,method='GET'}={}){
 if(method!=='GET'&&method!=='HEAD')return {retry:false,reason:'NON_IDEMPOTENT_METHOD'};
 if(!Number.isSafeInteger(attempt)||attempt<1||!Number.isSafeInteger(maxAttempts)||maxAttempts>5)return {retry:false,reason:'INVALID_ATTEMPT'};
 if(TERMINAL.has(status))return {retry:false,reason:'TERMINAL_HTTP'};
 if(!RETRYABLE.has(status))return {retry:false,reason:'OTHER_STATUS'};
 if(attempt>=maxAttempts)return {retry:false,reason:'EXHAUSTED'};
 return {retry:true,reason:'TRANSIENT_HTTP'};
}

// Only verified, required-source-complete cases may be healthy; never treat
// an HTTP 404 as proof that a *required* financial frame exists or is optional.
export function classifySecEndpointSet({endpoints,sourceFresh=false,requiredContractKnown=false}={}){
 if(!sourceFresh||!requiredContractKnown||!Array.isArray(endpoints)||endpoints.length===0)
  return {state:'unknown',reason:'EVIDENCE_UNVERIFIED'};
 if(!endpoints.some(e=>e?.required===true))return {state:'unknown',reason:'REQUIRED_ENDPOINT_MISSING'};
 const ids=new Set();
 for(const e of endpoints){
  if(!e||typeof e.id!=='string'||ids.has(e.id)||typeof e.required!=='boolean')return {state:'unknown',reason:'ENDPOINT_CONTRACT_INVALID'};
  ids.add(e.id);
  if(!Number.isInteger(e.status))return {state:'unknown',reason:'HTTP_STATUS_UNVERIFIED'};
  if(e.status===404&&!e.required&&e.absenceOfficiallyVerified===true)continue;
  if(e.status<200||e.status>=300)return {state:'failed',reason:`HTTP_${e.status}`};
  if(e.parsed!==true)return {state:'failed',reason:'PARSE_UNVERIFIED'};
  if(e.required&&e.storedAndReadback!==true)return {state:'failed',reason:'STORAGE_UNVERIFIED'};
 }
 return {state:'normal',reason:null};
}

// Opt-in helper for SEC GET/HEAD only. An existing caller must explicitly
// replace its SEC fetch path: adding this module alone changes no runtime path.
// Every retry consumes a fresh globally reserved slot. No 404 or 403 retry.
export async function fetchSecControlled({gate,fetchImpl,url,init={},maxAttempts=3,pause=sleep}={}){
 if(!gate?.reserve||!gate?.noteResponse||typeof fetchImpl!=='function')stop('SEC_FETCH_CONFIG_INVALID');
 const target=new URL(url);
 if(target.protocol!=='https:'||!['data.sec.gov','www.sec.gov','sec.gov'].includes(target.hostname))stop('SEC_HOST_NOT_ALLOWED');
 const method=String(init?.method??'GET').toUpperCase();
 if(!['GET','HEAD'].includes(method))stop('SEC_FETCH_METHOD_NOT_ALLOWED');
 if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>5)stop('SEC_RETRY_CONFIG_INVALID');
 const statuses=[];
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  await gate.reserve();
  const response=await fetchImpl(url,init); // Network errors propagate, never treated as success.
  const status=response?.status;
  if(!Number.isSafeInteger(status))stop('SEC_HTTP_STATUS_INVALID');
  statuses.push(status);
  if(status===429||status===503){
   gate.noteResponse({status,retryAfter:response.headers?.get?.('retry-after')??null});
  }
  const decision=secRetryDecision({status,attempt,maxAttempts,method});
  if(!decision.retry)return {response,attempts:attempt,statuses};
  await pause(Math.min(4000,200*Math.pow(2,attempt-1)));
 }
 stop('SEC_RETRY_LOOP_INVALID');
}