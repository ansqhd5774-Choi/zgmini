import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {transientD1Failure} from './d1-transient.mjs';
import {rememberCredential,credentialMetadata,safeDiagnostic,errorResponseDiagnostic,codesFromResult} from './d1-diagnostics.mjs';

export const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const WINDOWS_RENAME_RETRY_CODES=new Set(['EACCES','EPERM','EBUSY']);
const WINDOWS_RENAME_RETRY_DELAYS_MS=Object.freeze([25,50,100,200,400,800,1600,3200]);
const sleepSync=ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);
export function renameWithRetrySync(from,to,{renameSync=fs.renameSync,platform=process.platform,sleep=sleepSync}={}){
 let attempt=0;
 for(;;){
  try{return renameSync(from,to);}
  catch(error){
   if(platform!=='win32'||!WINDOWS_RENAME_RETRY_CODES.has(error?.code)||attempt>=WINDOWS_RENAME_RETRY_DELAYS_MS.length)throw error;
   sleep(WINDOWS_RENAME_RETRY_DELAYS_MS[attempt++]);
  }
 }
}
export function save(file,value){
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const temp=file+'.tmp';
 fs.writeFileSync(temp,JSON.stringify(value));
 renameWithRetrySync(temp,file);
}
export function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
export function readonly(sql){return /^\s*(SELECT|WITH)\b/i.test(sql)&&/\bSELECT\b/i.test(sql)&&!/[;]|--|\/\*|\b(insert|update|delete|replace|create|drop|alter|attach|detach|pragma|vacuum)\b/i.test(sql);}

// Reuse the user's existing official Wrangler login. Never log credentials.
export function credential(root,{apiToken=process.env.CLOUDFLARE_API_TOKEN,file=path.join(os.homedir(),'AppData/Roaming/xdg.config/.wrangler/config/default.toml'),now=Date.now,refresh=()=>spawnSync(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'whoami'],{cwd:root,encoding:'utf8',timeout:60000,windowsHide:true})}={}){
 if(apiToken)return rememberCredential(apiToken,{authType:'API_TOKEN',authExpiresAt:null,authRefresh:'NOT_NEEDED'});
 let refreshed=false;
 let cfg=fs.readFileSync(file,'utf8');
 const expiry=Date.parse(cfg.match(/expiration_time\s*=\s*"([^"]+)"/)?.[1]??'');
 const authError=()=>Object.assign(Error('WRANGLER_LOGIN_REQUIRED'),{diagnosticAuth:{authType:'OAUTH',authExpiresAt:Number.isFinite(expiry)?new Date(expiry).toISOString():null,authRefresh:'FAILED'}});
 // Wrangler whoami refreshes only after expiry; calling it five minutes early
 // does not renew the token. Request-time resolution below handles long runs.
 if(!Number.isFinite(expiry)||expiry<=now()){
  const r=refresh();
  if(r.status!==0)throw authError();
  cfg=fs.readFileSync(file,'utf8');
  const renewedExpiry=Date.parse(cfg.match(/expiration_time\s*=\s*"([^"]+)"/)?.[1]??'');
  if(!Number.isFinite(renewedExpiry)||renewedExpiry<=now())throw authError();
  refreshed=true;
 }
 const token=cfg.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
 if(!token)throw authError();return rememberCredential(token,{authType:'OAUTH',authExpiresAt:new Date(Date.parse(cfg.match(/expiration_time\s*=\s*"([^"]+)"/)?.[1])).toISOString(),authRefresh:refreshed?'SUCCEEDED':'NOT_NEEDED'});
}

export function client({account,core,history},token,{fetchImpl=globalThis.fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now,onDiagnostic}={}){
 if(!/^[a-f0-9]{32}$/.test(account)||![core,history].every(x=>/^[a-f0-9-]{36}$/.test(x)))throw Error('INVALID_DATABASE_CONFIG');
 const stats={queries:0,rowsRead:0,rowsWritten:0,readFailures:0,readRetries:0,authReadRetries:0,diagnosticWriteFailures:0,transportFailures:[]};let sequence=0;
 const resolveToken=()=>typeof token==='function'?token():token;
 const failure=(code,kind,phase,httpStatus,cause,response,context)=>{
  const raw=cause?.cause?.code??cause?.code??cause?.name;
  const at=now(),expiry=Date.parse(context?.authExpiresAt??'');
  const diagnostic=safeDiagnostic({...context,at:new Date(at).toISOString(),elapsedMs:Math.max(0,at-Date.parse(context?.requestStartedAt)),kind,phase,httpStatus:httpStatus??null,code:/^[A-Z0-9_]{1,64}$/.test(raw??'')?raw:raw==='TimeoutError'?'TIMEOUT':raw==='AbortError'?'ABORTED':null,authExpiredAtFailure:Number.isFinite(expiry)?at>=expiry:null});
  stats.transportFailures.push(diagnostic);stats.transportFailures=stats.transportFailures.slice(-20);
  if(onDiagnostic)try{onDiagnostic(diagnostic);}catch{stats.diagnosticWriteFailures++;}
  const error=Error(code),retryAfter=response?.headers?.get('retry-after');
  if(retryAfter){const seconds=Number(retryAfter);error.retryAfterMs=Number.isFinite(seconds)?Math.max(0,seconds*1000):Math.max(0,Date.parse(retryAfter)-Date.now());}
  return error;
 };
 async function request(db,batch){
  if(![core,history].includes(db)||!batch.length||batch.length>40)throw Error('INVALID_D1_BATCH');
  let response,requestToken;const kind=batch.every(x=>readonly(x.sql))?'READ':'WRITE';
  const context={requestStartedAt:new Date(now()).toISOString(),requestSequence:++sequence,databaseRole:db===core?'CORE':'HISTORY',statementId:hash(batch.map(x=>x.sql))};
  const resolveForRequest=()=>{try{return resolveToken();}catch(error){failure('D1_AUTH_RESOLUTION_FAILED',kind,'AUTH',null,error,null,{...context,...error.diagnosticAuth,authRefresh:'FAILED'});throw error;}};
  requestToken=resolveForRequest();Object.assign(context,credentialMetadata(requestToken));
  const fail=(...args)=>failure(...args,context);
  try{response=await Reflect.apply(fetchImpl,globalThis,[`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${db}/query`,{method:'POST',headers:{Authorization:`Bearer ${requestToken}`,'Content-Type':'application/json'},body:JSON.stringify({batch}),signal:AbortSignal.timeout(60000)}]);}catch(error){throw fail('D1_OUTCOME_UNKNOWN',kind,'FETCH',null,error,null);}
  if(!response.ok){
   Object.assign(context,await errorResponseDiagnostic(response));
   const error=fail(`D1_HTTP_${response.status}`,kind,'HTTP',response.status,null,response);
   // Only a read rejected with an expired/replaced credential may be repeated.
   // A static token or unchanged login must fail closed; writes never replay.
   if(kind==='READ'&&[401,403].includes(response.status)&&typeof token==='function')error.credentialChanged=resolveForRequest()!==requestToken;
   throw error;
  }
  let json;try{json=await response.json();}catch(error){throw fail('D1_OUTCOME_UNKNOWN',kind,'BODY',response.status,error,response);}
  if(json?.success===false||!Array.isArray(json?.result)||json.result.length!==batch.length||json.result.some(x=>x?.success===false)){
   Object.assign(context,{cfRay:response.headers?.get('cf-ray'),errorBody:'JSON',providerCodes:codesFromResult(json)});
   throw fail(json?.success===false?`D1_HTTP_${response.status}`:'D1_BATCH_FAILED',kind,'RESULT',response.status,null,response);
  }
  for(const item of json.result){stats.queries++;stats.rowsRead+=item.meta?.rows_read??0;stats.rowsWritten+=item.meta?.rows_written??0;}
  return json.result;
 }
 const query=async(db,sql,params=[])=>{
  try{
   if(!readonly(sql))throw Error('READ_ONLY_SQL_REQUIRED');
   for(let attempt=0;;attempt++){
    try{const result=(await request(db,[{sql,params}]))[0];if(result.meta?.rows_written)throw Error('UNEXPECTED_WRITE');return result;}
    catch(error){if(attempt!==0||(!error.credentialChanged&&!transientD1Failure(error))||error.retryAfterMs>5000)throw error;stats.readRetries++;if(error.credentialChanged)stats.authReadRetries++;await sleep(Math.max(1000,error.retryAfterMs||0));}
   }
  }catch(error){stats.readFailures++;throw error;}
 };
 function adapter(db,{directory,allowWrites=false}={}){
  const pending=new Map();
  const prepare=(sql,params=[])=>({sql,params,bind(...p){return prepare(sql,p)},async all(){
   if(!readonly(sql)){stats.readFailures++;throw Error('READ_ONLY_SQL_REQUIRED');}
   const key=hash({db,sql,params});
   if(!pending.has(key))pending.set(key,(async()=>{const result=await query(db,sql,params);if(directory){const file=path.join(directory,key+'.json');save(file,result);return read(file);}return result;})());
   return pending.get(key);
  },async first(column){const row=(await this.all()).results?.[0]??null;return column?row?.[column]??null:row;},async run(){if(!allowWrites)throw Error('REMOTE_WRITE_DISABLED');const result=(await request(db,[{sql,params}]))[0];pending.clear();return result;}});
  return {prepare,async batch(statements){if(!allowWrites)throw Error('REMOTE_WRITE_DISABLED');const result=await request(db,statements.map(({sql,params})=>({sql,params})));pending.clear();return result;},exec(){throw Error('SCHEMA_CHANGE_DISABLED');}};
 }
 return {query,request,adapter,stats};
}
