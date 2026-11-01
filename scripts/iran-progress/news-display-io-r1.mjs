import fs from 'node:fs';
import path from 'node:path';
import {EMPTY_IRAN_NEWS_CACHE,previewIranNewsRetention} from './news-display-r1.mjs';

export const DISPLAY_CACHE_BASENAME='news-display-r1.json';
const RETRY_MS=[25,50,100,200,400,800];
function replaceAtomically(from,to){
 let attempt=0;
 for(;;){
  try{return fs.renameSync(from,to);}
  catch(error){
   if(process.platform!=='win32'||!['EACCES','EPERM','EBUSY'].includes(error?.code)||attempt>=RETRY_MS.length)throw error;
   Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,RETRY_MS[attempt++]);
  }
 }
}
function target(dataDirectory){
 if(typeof dataDirectory!=='string'||!path.isAbsolute(dataDirectory))throw Error('NEWS_DATA_DIRECTORY_INVALID');
 if(!fs.existsSync(dataDirectory)||!fs.statSync(dataDirectory).isDirectory())throw Error('NEWS_DATA_DIRECTORY_MISSING');
 const file=path.join(dataDirectory,DISPLAY_CACHE_BASENAME);
 if(fs.existsSync(file)&&(!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink()))throw Error('NEWS_CACHE_TARGET_UNSAFE');
 return file;
}
export function readNewsDisplayCache(dataDirectory){
 const file=target(dataDirectory);
 return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{...EMPTY_IRAN_NEWS_CACHE,items:[]};
}
// This function never touches the Iran SQLite ledger. Dry-run is the default.
export function maintainIranDisplayCache(dataDirectory,incoming,{now=Date.now(),dryRun=true}={}){
 const file=target(dataDirectory),current=readNewsDisplayCache(dataDirectory);
 const preview=previewIranNewsRetention(current,incoming,{now});
 if(dryRun)return {...preview.report,dryRun:true,written:false};
 const staging=file+'.next';
 if(fs.existsSync(staging))throw Error('NEWS_STAGING_FILE_ALREADY_EXISTS');
 fs.writeFileSync(staging,JSON.stringify(preview.cache),'utf8');
 try{replaceAtomically(staging,file);}
 catch(error){
  // A failed replacement may have an uncertain state on Windows.
  // Keep the staging file for inspection; never retry a possible write blindly.
  throw Object.assign(Error('NEWS_CACHE_REPLACE_OUTCOME_UNKNOWN'),{cause:error});
 }
 const readback=readNewsDisplayCache(dataDirectory);
 if(JSON.stringify(readback)!==JSON.stringify(preview.cache))throw Error('NEWS_CACHE_READBACK_MISMATCH');
 return {...preview.report,dryRun:false,written:true};
}
