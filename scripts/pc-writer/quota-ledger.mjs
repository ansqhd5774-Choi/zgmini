import fs from 'node:fs';
import path from 'node:path';
import {policyForProvider,quotaWindowMs} from './quota-policy.mjs';

const VERSION=1;
const DAY=24*60*60*1000;
const MONTH=31*DAY;

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
  const item=this.item(provider,now);const at=nextAllowed(item,policy,now);
  const blocked=at!=null&&at>now;
  const event={provider,at:new Date(now).toISOString(),allowed:!blocked,mode:this.mode};
  if(blocked){event.reason='QUOTA_COOLDOWN';event.retryAt=new Date(at).toISOString();item.quotaState=this.mode==='enforce'?'COOLDOWN':'QUOTA_WARNING';}
  if(blocked&&this.mode==='enforce'&&policy.hard!==false){this.events.push(event);this.persist();const error=Error('PROVIDER_QUOTA_GUARD');error.code='PROVIDER_QUOTA_GUARD';error.provider=provider;error.retryAt=at;throw error;}
  item.requestTimes.push(now);item.lastRequestAt=now;
  if(!blocked)item.quotaState='AVAILABLE';
  this.events.push(event);this.persist();
  return {allowed:true,provider,guarded:false,warning:blocked?event:null};
 }
 afterResponse(provider,{status=null,ok=false,error=null,at=Date.now()}={}){
  const policy=policyForProvider(provider);if(!policy)return;
  const item=this.item(provider,at);item.lastStatus=status;
  if(ok){item.lastSuccessAt=at;item.lastError=null;item.quotaState='AVAILABLE';}
  else{item.lastError=error?.code??error?.message??'PROVIDER_ERROR';item.errorTimes.push(at);item.quotaState=status===429?'QUOTA_WARNING':'FAILED';}
  this.persist();
 }
 summary(){
  const providers={};
  for(const [provider,item] of Object.entries(this.value.providers))providers[provider]={requests:item.requestTimes.length,lastRequestAt:item.lastRequestAt,lastSuccessAt:item.lastSuccessAt,lastStatus:item.lastStatus,quotaState:item.quotaState};
  return {version:VERSION,mode:this.mode,guarded:this.events.filter(x=>x.allowed===false).length,events:this.events.map(x=>({...x})),providers};
 }
}
