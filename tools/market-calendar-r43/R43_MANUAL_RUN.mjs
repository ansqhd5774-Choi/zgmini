// Explicit, standalone R43 annual preflight / one-time publication entrypoint.
// This is NEVER imported or scheduled by the five-minute PC Core.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {prepareR43ManualSnapshot,publishR43MarketImportanceOnce} from './R43_PC_MANUAL_PUBLISH.mjs';

const stop=code=>{throw Error(code)};
const DEFAULT_INPUT='local-market-calendar-r43-input.json';
const ROSTER='local-market-calendar-r43-reviewed-issuers.json';
const SOURCE=/^[a-f0-9]{40}$/i;

export function parseR43ManualArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const values={},names=new Set(['--pc-home','--repo-root']);
 let mode='preflight',modeSeen=false,confirmed=false;
 for(let i=0;i<argv.length;i++){
  const arg=argv[i];
  if(arg==='--preflight'||arg==='--publish'){
   if(modeSeen)stop('R43_MANUAL_COMMAND_MODE_CONFLICT_STOP');
   modeSeen=true;
   mode=arg.slice(2);
  }else if(arg==='--confirm-r43-once'){
   if(confirmed)stop('R43_MANUAL_COMMAND_DUPLICATE_FLAG_STOP');
   confirmed=true;
  }else if(names.has(arg)){
   if(Object.hasOwn(values,arg)||!argv[i+1]||argv[i+1].startsWith('--'))
    stop('R43_MANUAL_COMMAND_ARGUMENT_INVALID_STOP');
   values[arg]=argv[++i];
  }else stop('R43_MANUAL_COMMAND_UNKNOWN_ARGUMENT_STOP');
 }
 if(!values['--pc-home']||!values['--repo-root']||
  !path.isAbsolute(values['--pc-home'])||
  !path.isAbsolute(values['--repo-root']))
  stop('R43_MANUAL_COMMAND_APPROVED_ABSOLUTE_PATHS_REQUIRED');
 if(mode==='publish'&&!confirmed)
  stop('R43_MANUAL_COMMAND_EXPLICIT_CONFIRMATION_REQUIRED');
 if(mode!=='publish'&&confirmed)
  stop('R43_MANUAL_COMMAND_CONFIRMATION_WITHOUT_PUBLISH_STOP');
 return {mode,pcHome:values['--pc-home'],repoRoot:values['--repo-root'],
  inputPath:path.join(values['--pc-home'],DEFAULT_INPUT)};
}

function readPrivateJson(file,maxBytes){
 let stat;
 try{stat=fs.lstatSync(file)}
 catch{stop('R43_MANUAL_COMMAND_PRIVATE_FILE_MISSING_STOP')}
 if(!stat.isFile()||stat.size<50||stat.size>maxBytes)
  stop('R43_MANUAL_COMMAND_PRIVATE_FILE_INVALID_STOP');
 try{return JSON.parse(fs.readFileSync(file,'utf8'))}
 catch{stop('R43_MANUAL_COMMAND_PRIVATE_JSON_INVALID_STOP')}
}

export function preflightR43ManualCommand(options,{now=Date.now()}={}){
 const input=readPrivateJson(options.inputPath,8_000_000);
 const rosterRequired=Object.hasOwn(input,'expectedEligibleIssuers')||
  Object.hasOwn(input,'approvedUniverseSha256');
 if(!rosterRequired)stop('R43_MANUAL_COMMAND_APPROVED_UNIVERSE_REQUIRED_STOP');
 const approvedUniverse=readPrivateJson(path.join(options.pcHome,ROSTER),8_000_000);
 const compact=prepareR43ManualSnapshot(input,{now,approvedUniverse});
 const config=readPrivateJson(path.join(options.pcHome,'config.json'),64_000);
 if(config.collectionTarget!=='pc'||config.enabled!==true||
  typeof config.core!=='string'||!config.core.trim()||
  typeof config.source!=='string'||!SOURCE.test(config.source))
  stop('R43_MANUAL_COMMAND_PC_CONFIG_STOP');
 try{
  if(!fs.statSync(path.join(options.repoRoot,'scripts','pc-writer','d1.mjs')).isFile())
   stop('R43_MANUAL_COMMAND_APPROVED_SOURCE_MISSING_STOP');
 }catch{stop('R43_MANUAL_COMMAND_APPROVED_SOURCE_MISSING_STOP')}
 let head;
 try{head=execFileSync('git',['rev-parse','HEAD'],{
  cwd:options.repoRoot,encoding:'utf8',windowsHide:true,timeout:12000,
 }).trim()}catch{stop('R43_MANUAL_COMMAND_PC_SOURCE_READ_FAILED_STOP')}
 if(head!==config.source)stop('R43_MANUAL_COMMAND_PC_SOURCE_DRIFT_STOP');
 return {status:'R43_LOCAL_PREFLIGHT_READY_NOT_PUBLISHED',asOf:compact.asOf,
  eligibleIssuers:compact.eligibleIssuers,topCount:compact.topCount,
  approvedSource:head,rightsReviewRecorded:true,providerCalls:0,dbWrites:0};
}

export async function runR43ManualCommand(argv,{now=Date.now()}={}){
 const options=parseR43ManualArgs(argv);
 if(options.help)return {usage:'node R43_MANUAL_RUN.mjs --preflight --pc-home <absolute-PC-writer-dir> --repo-root <absolute-approved-repo-dir> | --publish --confirm-r43-once --pc-home <...> --repo-root <...>',
  note:'--preflight never calls providers, queries D1 or writes files; --publish is a separate explicit one-time D1 action.'};
 const preflight=preflightR43ManualCommand(options,{now});
 if(options.mode==='preflight')return preflight;
 const result=await publishR43MarketImportanceOnce({...options,now});
 return {...result,preflight:'PASS'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{
  console.log(JSON.stringify(await runR43ManualCommand(process.argv.slice(2))));
 }catch(error){
  // Never print PC input, membership, D1 response or private file contents.
  console.error('R43_MANUAL_STOP:',String(error?.message??'UNKNOWN').split('\n')[0]);
  process.exitCode=1;
 }
}
