// R15: news-only scheduled runner. The existing R13 Windows task invokes it
// AFTER the established score/legacy work; it never changes their exit result.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {publishIncrementalIranNewsR14} from './news-display-publish-incremental-r14.mjs';
import {readNewsDisplayCache} from './news-display-io-r1.mjs';

export const R15_STATUS_FILE='news-display-auto-r15-status.json';
const KST_MS=9*3600000;
const safeCode=value=>/^[A-Z][A-Z0-9_]{0,110}$/.test(value??'')?value:'NEWS_AUTO_UNCLASSIFIED_ERROR';
const timeKst=now=>new Date(now+KST_MS).toISOString().slice(0,19).replace('T',' ');

// Resolve only a credential already configured for the existing PC writer.
// Never invoke Wrangler login/refresh, prompt for another account, or log a token.
export function readExistingD1Token({now=Date.now(),env=process.env,
 userHome=os.homedir(),readFile=fs.readFileSync}={}){
 if(typeof env.CLOUDFLARE_API_TOKEN==='string'&&env.CLOUDFLARE_API_TOKEN.trim())
  return env.CLOUDFLARE_API_TOKEN.trim();
 const file=path.join(userHome,'AppData','Roaming','xdg.config','.wrangler','config','default.toml');
 const config=readFile(file,'utf8');
 const token=config.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
 const expiry=Date.parse(config.match(/expiration_time\s*=\s*"([^"]+)"/)?.[1]??'');
 if(!token||!Number.isFinite(expiry)||expiry<=now+120000)
  throw Error('NEWS_AUTO_CONFIGURED_D1_TOKEN_EXPIRED_OR_UNAVAILABLE');
 return token;
}

export function checkLocalR15Installation(dataDirectory,{now=Date.now()}={}){
 if(typeof dataDirectory!=='string'||!path.isAbsolute(dataDirectory))
  throw Error('NEWS_AUTO_DATA_DIRECTORY_INVALID');
 const ledger=path.join(dataDirectory,'iran.sqlite');
 if(!fs.existsSync(ledger)||!fs.lstatSync(ledger).isFile())
  throw Error('NEWS_AUTO_OPERATIONAL_LEDGER_MISSING');
 const cache=readNewsDisplayCache(dataDirectory);
 if(cache.items.length<1||cache.items.length>100)
  throw Error('NEWS_AUTO_REVIEWED_CACHE_IDENTITY_UNVERIFIED');
 return {status:'PASS_R15_LOCAL_INSTALLATION_READ_ONLY',
  displayItems:cache.items.length,scoreLedgerModified:false,d1Written:false};
}

function replaceWindowsSafe(from,to){
 let attempt=0;
 for(;;){
  try{return fs.renameSync(from,to);}
  catch(error){
   if(process.platform!=='win32'||!['EACCES','EPERM','EBUSY'].includes(error?.code)||attempt>=6)throw error;
   Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,[25,50,100,200,400,800][attempt++]);
  }
 }
}
function recordNewsStatus(dataDirectory,record){
 const file=path.join(dataDirectory,R15_STATUS_FILE),staged=file+'.next';
 if(fs.existsSync(staged))throw Error('NEWS_AUTO_STATUS_STAGING_ALREADY_EXISTS');
 fs.writeFileSync(staged,JSON.stringify(record),'utf8');
 try{replaceWindowsSafe(staged,file);}
 catch{throw Error('NEWS_AUTO_STATUS_WRITE_OUTCOME_UNKNOWN');}
 if(fs.readFileSync(file,'utf8')!==JSON.stringify(record))
  throw Error('NEWS_AUTO_STATUS_READBACK_MISMATCH');
}

export async function runScheduledIranNewsR15({dataDirectory,config,token,
 d1Client,now=Date.now(),fetcher=fetch}={}){
 checkLocalR15Installation(dataDirectory,{now});
 if(!config?.core||!config?.account||typeof d1Client!=='function')
  throw Error('NEWS_AUTO_CONFIG_INVALID');
 const remote=d1Client(config,token);
 const output=await publishIncrementalIranNewsR14({dataDirectory,
  remote,db:config.core,now,fetcher});
 const status={version:'IRAN_NEWS_AUTO_R15',status:'PUBLISHED_D1_VERIFIED',
  completedAtKst:timeKst(now),publicItemCount:output.publicItemCount,
  newArticles:output.newArticles,duplicatesPreserved:output.duplicatesPreserved,
  d1Publication:output.d1Publication,scoreLedgerModified:false};
 recordNewsStatus(dataDirectory,status);
 return status;
}

async function commandLine(){
 const [flag]=process.argv.slice(2);
 if(process.argv.length!==3||!['--local-check','--scheduled'].includes(flag))
  throw Error('NEWS_AUTO_EXPLICIT_MODE_REQUIRED');
 const dataDirectory=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 if(flag==='--local-check'){
  console.log(JSON.stringify(checkLocalR15Installation(dataDirectory)));
  return;
 }
 const now=Date.now();
 try{
  const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
  const token=readExistingD1Token({now});
  // The existing PC writer D1 module is reused unchanged; no source upgrade.
  const {client}=await import('../pc-writer/d1.mjs');
  console.log(JSON.stringify(await runScheduledIranNewsR15({dataDirectory,
   config,token,d1Client:client,now})));
 }catch(error){
  const reason=safeCode(error.message);
  const failed={version:'IRAN_NEWS_AUTO_R15',status:'FAILED_SCORE_UNAFFECTED',
   completedAtKst:timeKst(now),reason,scoreLedgerModified:false};
  try{recordNewsStatus(dataDirectory,failed);}catch(statusError){
   console.error(JSON.stringify({status:'NEWS_AUTO_STATUS_WRITE_FAILED',reason:safeCode(statusError.message)}));
  }
  console.error(JSON.stringify(failed));process.exitCode=1;
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await commandLine();}
 catch(error){console.error(JSON.stringify({status:'STOP_R15_AUTO_NEWS',reason:safeCode(error.message)}));process.exitCode=1;}
}
