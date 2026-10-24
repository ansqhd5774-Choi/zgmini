// Explicit PC biotech cycle runner. No invocation runs on import.
// --once: stored-only candidate; --collect: bounded GMH calls;
// --publish: versioned biotech-R2 D1 key only, never the old R1/seven keys.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectOptional} from './theme-optional-collect.mjs';
import {inspectManifest} from './theme-data-inventory.mjs';
import {biotechCloudflareTokenR7} from './theme-biotech-auth-r7.mjs';
import {runBiotechAutoR7} from './theme-biotech-auto-core-r7.mjs';
import {biotechVersionedD1} from './theme-biotech-versioned-d1-r7.mjs';

const requireValid=(check,code)=>{if(!check)throw Object.assign(new Error(code),{code});};

export async function biotechPublicSnapshot({fetchImpl=fetch}={}){
 const response=await fetchImpl('https://zgmini.kr/api/theme-fear-greed/?biotech_r7='+Date.now(),{
  headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000),redirect:'error'});
 requireValid(response.ok,'BIOTECH_R7_PUBLIC_API_UNAVAILABLE');
 const doc=await response.json();requireValid(doc?.status==='READY','BIOTECH_R7_PUBLIC_API_NOT_READY');
 return doc;
}

export async function startBiotechR7({dataRoot,allowCollect=false,allowPublish=false,
 db=biotechVersionedD1({dataRoot,tokenFn:biotechCloudflareTokenR7}),collector=collectOptional,readBase=biotechPublicSnapshot,now=Date.now}={}){
 const state=path.join(dataRoot,'themes','biotech','state');
 requireValid(fs.existsSync(state),'BIOTECH_R7_STATE_DIR_MISSING');
 const lock=path.join(state,'biotech-auto-r7.lock');
 let fd;
 try{fd=fs.openSync(lock,'wx');fs.writeSync(fd,JSON.stringify({pid:process.pid,startedAt:new Date(now()).toISOString()}));}
 catch(e){const code=e?.code==='EEXIST'?'BIOTECH_R7_LANE_ALREADY_LOCKED':'BIOTECH_R7_LOCK_UNAVAILABLE';
  throw Object.assign(new Error(code),{code});}
 finally{if(fd!==undefined)fs.closeSync(fd);}
 try{return await runBiotechAutoR7({dataRoot,db,collect:collector,readBase,allowCollect,allowPublish,inspectManifest,now});}
 finally{fs.unlinkSync(lock);}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),valid=args[0]==='--once'&&args.slice(1).every(x=>['--collect','--publish'].includes(x))&&
  new Set(args).size===args.length;
 if(!valid){console.log('Usage: theme-biotech-auto-r7.mjs --once [--collect] [--publish]');process.exitCode=2;}
 else{
  try{
   const dataRoot=process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data';
   const report=await startBiotechR7({dataRoot,allowCollect:args.includes('--collect'),allowPublish:args.includes('--publish')});
   console.log(JSON.stringify(report));
   const publish=args.includes('--publish');
   if(report.status==='BLOCKED'||report.status==='COLLECTION_STOPPED'||report.status==='COLLECTION_RESUME_NEEDED'||
    (publish&&!['PUBLIC_API_VERIFIED','NO_NEW_CONFIRMED_SESSION','UNCHANGED_NO_WRITE'].includes(report.status)))process.exitCode=1;
  }catch(e){console.log(JSON.stringify({report:'BIOTECH_AUTO_R7',status:'BLOCKED',reason:e?.code??'BIOTECH_R7_UNCLASSIFIED'}));process.exitCode=1;}
 }
}
