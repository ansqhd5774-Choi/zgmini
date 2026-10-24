// Biotech sidecar adapter for the already approved PC Cloudflare authentication
// chain: explicit API token, then existing Wrangler OAuth, then installed
// Wrangler refresh. No login, key creation, or token logging.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const fail=code=>{throw Object.assign(new Error(code),{code});};

export function biotechCloudflareTokenR7({dataRoot='E:/ZGmini/data',
 oauthFile=path.join(os.homedir(),'AppData','Roaming','xdg.config','.wrangler','config','default.toml'),
 env=process.env,execute=spawnSync,now=Date.now(),platform=process.platform,
 executable=process.execPath,wranglerCandidates=null}={}){
 if(env.CLOUDFLARE_API_TOKEN)return env.CLOUDFLARE_API_TOKEN;
 if(!fs.existsSync(oauthFile))fail('PC_CLOUDFLARE_AUTH_UNAVAILABLE');
 const valid=()=>{
  const body=fs.readFileSync(oauthFile,'utf8');
  const expiry=Date.parse(body.match(/expiration_time\s*=\s*"([^"]+)"/)?.[1]??'');
  const value=body.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
  return value&&Number.isFinite(expiry)&&expiry>now+300000?value:null;
 };
 const current=valid();if(current)return current;
 const approvedRoot=path.dirname(path.resolve(dataRoot));
 const candidates=wranglerCandidates??[
  path.join(approvedRoot,'projects','zgmini','node_modules','wrangler','bin','wrangler.js'),
  path.join(approvedRoot,'node_modules','wrangler','bin','wrangler.js'),
  path.join(approvedRoot,'runtime','node_modules','wrangler','bin','wrangler.js'),
 ];
 const options={encoding:'utf8',timeout:60000,windowsHide:true,maxBuffer:512*1024};
 for(const script of candidates){
  if(!fs.existsSync(script))continue;
  execute(executable,[script,'whoami'],options);
  const refreshed=valid();if(refreshed)return refreshed;
 }
 if(platform==='win32'){
  execute('cmd.exe',['/d','/c','wrangler.cmd','whoami'],options);
  const refreshed=valid();if(refreshed)return refreshed;
 }
 fail('PC_WRANGLER_REAUTH_REQUIRED');
}
