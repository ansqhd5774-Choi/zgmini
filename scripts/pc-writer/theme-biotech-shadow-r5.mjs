// PC-only explicit execution: biotech private Shadow, never D1 publication.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildBiotechShadow,saveBiotechShadow} from './theme-biotech-shadow-core-r5.mjs';

const ensure=(v,code)=>{if(!v)throw Object.assign(new Error(code),{code});};
function existingToken(dataRoot){
 if(process.env.CLOUDFLARE_API_TOKEN)return process.env.CLOUDFLARE_API_TOKEN;
 const oauthFile=path.join(os.homedir(),'AppData','Roaming','xdg.config','.wrangler','config','default.toml');
 ensure(fs.existsSync(oauthFile),'PC_CLOUDFLARE_AUTH_UNAVAILABLE');
 const valid=()=>{
  const body=fs.readFileSync(oauthFile,'utf8'),expiry=Date.parse(body.match(/expiration_time\s*=\s*"([^"]+)"/)?.[1]??'');
  const token=body.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
  return token&&Number.isFinite(expiry)&&expiry>Date.now()+300000?token:null;
 };
 const current=valid();if(current)return current;
 const parent=path.dirname(path.resolve(dataRoot));
 const candidates=[path.join(parent,'projects','zgmini','node_modules','wrangler','bin','wrangler.js'),
  path.join(parent,'node_modules','wrangler','bin','wrangler.js'),
  path.join(parent,'runtime','node_modules','wrangler','bin','wrangler.js')];
 for(const script of candidates){if(!fs.existsSync(script))continue;
  spawnSync(process.execPath,[script,'whoami'],{encoding:'utf8',timeout:60000,windowsHide:true,maxBuffer:512000});
  const refreshed=valid();if(refreshed)return refreshed;
 }
 if(process.platform==='win32'){
  spawnSync('cmd.exe',['/d','/c','wrangler.cmd','whoami'],{encoding:'utf8',timeout:60000,windowsHide:true,maxBuffer:512000});
  const refreshed=valid();if(refreshed)return refreshed;
 }
 throw Object.assign(new Error('PC_WRANGLER_REAUTH_REQUIRED'),{code:'PC_WRANGLER_REAUTH_REQUIRED'});
}

export async function readBiotechPrior({dataRoot,fetchImpl=fetch,tokenFn=existingToken}={}){
 const cfg=JSON.parse(fs.readFileSync(path.join(dataRoot,'pc-writer','config.json'),'utf8'));
 ensure(/^[a-f0-9]{32}$/.test(cfg.account)&&/^[a-f0-9-]{36}$/.test(cfg.core),'PC_D1_CONFIG_INVALID');
 const token=tokenFn(dataRoot),sql="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
 const res=await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${cfg.account}/d1/database/${cfg.core}/query`,{
  method:'POST',headers:{Authorization:`Bearer ${token}`,'content-type':'application/json'},
  body:JSON.stringify({batch:[{sql,params:['theme-biotech-optional-r1']}]}),signal:AbortSignal.timeout(30000),redirect:'error'});
 ensure(res.ok,'BIOTECH_D1_READ_FAILED');const json=await res.json();
 ensure(json.success!==false&&json.result?.length===1&&json.result[0].success!==false,'BIOTECH_D1_READ_FAILED');
 const row=json.result[0].results?.[0];ensure(typeof row?.body==='string','BIOTECH_D1_PRIOR_MISSING');
 return JSON.parse(row.body);
}

const args=process.argv.slice(2);
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 if(!['--inspect','--save-shadow'].includes(args[0])||args.length!==1){
  console.log('Usage: theme-biotech-shadow-r5.mjs <--inspect|--save-shadow>');process.exitCode=2;
 }else{
  try{
   const dataRoot=process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data';
   const prior=await readBiotechPrior({dataRoot});
   const shadow=buildBiotechShadow({dataRoot,priorRecord:prior});
   const saved=args[0]==='--save-shadow'?saveBiotechShadow(dataRoot,shadow):null;
   const {history,...summary}=shadow;
   console.log(JSON.stringify({report:'BIOTECH_SHADOW_R5',...summary,historyPoints:history.length,saved}));
  }catch(e){console.log(JSON.stringify({report:'BIOTECH_SHADOW_R5',status:'BLOCKED',reason:e?.code??'BIOTECH_SHADOW_UNCLASSIFIED'}));process.exitCode=1;}
 }
}
