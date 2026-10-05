import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

export const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function save(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(value));fs.renameSync(file+'.tmp',file);}
export function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
export function readonly(sql){return /^\s*SELECT\b/i.test(sql)&&!/[;]|--|\/\*|\b(insert|update|delete|replace|create|drop|alter|attach|detach|pragma|vacuum)\b/i.test(sql);}

// Reuse the user's existing official Wrangler login. Never log credentials.
export function credential(root){
 if(process.env.CLOUDFLARE_API_TOKEN)return process.env.CLOUDFLARE_API_TOKEN;
 const file=path.join(os.homedir(),'AppData/Roaming/xdg.config/.wrangler/config/default.toml');
 let cfg=fs.readFileSync(file,'utf8');
 const expiry=Date.parse(cfg.match(/expiration_time\s*=\s*"([^"]+)"/)?.[1]??'');
 if(!Number.isFinite(expiry)||expiry<Date.now()+300000){
  const r=spawnSync(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'whoami'],{cwd:root,encoding:'utf8',timeout:60000,windowsHide:true});
  if(r.status!==0)throw Error('WRANGLER_LOGIN_REQUIRED');
  cfg=fs.readFileSync(file,'utf8');
 }
 const token=cfg.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
 if(!token)throw Error('WRANGLER_LOGIN_REQUIRED');return token;
}

export function client({account,core,history},token){
 if(!/^[a-f0-9]{32}$/.test(account)||![core,history].every(x=>/^[a-f0-9-]{36}$/.test(x)))throw Error('INVALID_DATABASE_CONFIG');
 const stats={queries:0,rowsRead:0,rowsWritten:0,readFailures:0};
 async function request(db,batch){
  if(![core,history].includes(db)||!batch.length||batch.length>40)throw Error('INVALID_D1_BATCH');
  let response;
  try{response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${db}/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({batch}),signal:AbortSignal.timeout(60000)});}catch{throw Error('D1_OUTCOME_UNKNOWN');}
  let json;try{json=await response.json();}catch{throw Error('D1_OUTCOME_UNKNOWN');}
  if(!response.ok||json.success===false)throw Error(`D1_HTTP_${response.status}`);
  if(json.result?.length!==batch.length||json.result.some(x=>x.success===false))throw Error('D1_BATCH_FAILED');
  for(const item of json.result){stats.queries++;stats.rowsRead+=item.meta?.rows_read??0;stats.rowsWritten+=item.meta?.rows_written??0;}
  return json.result;
 }
 const query=async(db,sql,params=[])=>{try{if(!readonly(sql))throw Error('READ_ONLY_SQL_REQUIRED');const result=(await request(db,[{sql,params}]))[0];if(result.meta?.rows_written)throw Error('UNEXPECTED_WRITE');return result;}catch(error){stats.readFailures++;throw error;}};
 function adapter(db,{directory,allowWrites=false}={}){
  const pending=new Map();
  const prepare=(sql,params=[])=>({sql,params,bind(...p){return prepare(sql,p)},async all(){
   if(!readonly(sql))throw Error('READ_ONLY_SQL_REQUIRED');
   const key=hash({db,sql,params});
   if(!pending.has(key))pending.set(key,(async()=>{const result=await query(db,sql,params);if(directory){const file=path.join(directory,key+'.json');save(file,result);return read(file);}return result;})());
   return pending.get(key);
  },async first(column){const row=(await this.all()).results?.[0]??null;return column?row?.[column]??null:row;},async run(){if(!allowWrites)throw Error('REMOTE_WRITE_DISABLED');const result=(await request(db,[{sql,params}]))[0];pending.clear();return result;}});
  return {prepare,async batch(statements){if(!allowWrites)throw Error('REMOTE_WRITE_DISABLED');const result=await request(db,statements.map(({sql,params})=>({sql,params})));pending.clear();return result;},exec(){throw Error('SCHEMA_CHANGE_DISABLED');}};
 }
 return {query,request,adapter,stats};
}
