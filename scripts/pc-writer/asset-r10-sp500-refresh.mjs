import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {collectSp500Shadow} from './collect-sp500-shadow.mjs';
import {loadLocalProviders} from './local-env.mjs';

const DEFAULT_BASE=path.join(os.homedir(),'.zgmini','pc-writer');
const REFRESH_FILE='local-asset-r10-sp500-refresh-last-run.json';
const LEGACY_REPORT='local-sp500-shadow-collection-last-run.json';
const AUTHORIZATION_ENV='ZGMINI_R10_SP500_REFRESH_APPROVED';
const sourceRefreshApproved=base=>{
  if(process.env[AUTHORIZATION_ENV]==='1')return true;
  try{return loadLocalProviders(base)?.[AUTHORIZATION_ENV]==='1';}
  catch{return false;}
};
export const SP500_SUCCESS_CACHE_MS=24*60*60*1000;
export const SP500_FAILURE_BACKOFF_MS=2*60*60*1000;

const safeRead=file=>{
  try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}
};
const cleanCode=error=>{
  const code=String(error?.code??error?.message??'SP500_SHADOW_REFRESH_FAILED');
  return /^[A-Z0-9_:-]{1,100}$/.test(code)?code:'SP500_SHADOW_REFRESH_FAILED';
};

// The Core task starts every five minutes; that is not a license to call FRED
// every five minutes. A successful check runs at most daily, and a failed check
// backs off independently of the existing Core lock/scheduler.
export function sp500ShadowRefreshDecision(last,{now=Date.now()}={}){
  const at=Date.parse(last?.at??'');
  if(!Number.isFinite(at)||at>now||now-at<0)return {due:true,reason:'NO_VALID_CHECKPOINT'};
  const success=last?.status==='STORED'||last?.status==='UNCHANGED';
  const age=success?SP500_SUCCESS_CACHE_MS:SP500_FAILURE_BACKOFF_MS;
  return now-at>=age?{due:true,reason:'CHECK_INTERVAL_ELAPSED'}:{
    due:false,reason:success?'RECENT_SOURCE_CHECK':'RECENT_SOURCE_FAILURE',
    nextAttemptAt:new Date(at+age).toISOString(),
  };
}

export async function refreshSp500ShadowIfDue(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{
  now=Date.now(),
  collector=collectSp500Shadow,
  authorized=sourceRefreshApproved(base),
}={}){
  // The Task may run on a machine that has not approved source access.
  // Never query a provider or alter an existing checkpoint until opted in.
  if(!authorized)return {status:'SKIPPED_SOURCE_NOT_APPROVED',providerRequests:0};
  let baseReady=false;
  let storageReady=false;
  try{
    baseReady=fs.statSync(base).isDirectory();
    if(baseReady)storageReady=fs.statSync(path.join(base,'storage','core.sqlite')).isFile();
  }catch{/* Missing/inaccessible roots must not be created by a scheduled cycle. */}
  if(!baseReady)return {status:'STOP_PC_ROOT_NOT_READY',providerRequests:0};
  if(!storageReady)return {status:'STOP_CORE_DB_NOT_READY',providerRequests:0};
  const file=path.join(base,REFRESH_FILE);
  const previous=safeRead(file)??safeRead(path.join(base,LEGACY_REPORT));
  const decision=sp500ShadowRefreshDecision(previous,{now});
  if(!decision.due)return {
    status:'CACHED',reason:decision.reason,providerRequests:0,
    observationDate:previous?.last??previous?.observationDate??null,
    nextAttemptAt:decision.nextAttemptAt,
  };
  const asOf=new Date(now).toISOString().slice(0,10);
  let report;
  try{
    const result=await collector(base,{asOf});
    report={at:new Date(now).toISOString(),status:result.status,asOf,
      providerRequests:result.providerCalls??0,
      dataChanged:result.dataChanged??(result.status==='STORED'),
      observationDate:result.last??null,
      sourceStoredAt:result.sourceStoredAt??null};
  }catch(error){
    report={at:new Date(now).toISOString(),status:'FAILED_PREVIOUS_INPUTS_PRESERVED',asOf,
      providerRequests:null,errorCode:cleanCode(error),
      observationDate:previous?.observationDate??previous?.last??null,
      sourceStoredAt:previous?.sourceStoredAt??null};
  }
  const temporary=file+'.tmp';
  fs.writeFileSync(temporary,JSON.stringify(report)+'\n');
  fs.renameSync(temporary,file);
  return report;
}
