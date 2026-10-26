// Separate PC display-news maintenance; no R3/R5 ledger or scheduler changes.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {maintainIranDisplayCache,readNewsDisplayCache} from './news-display-io-r1.mjs';
import {previewIranNewsPublic,toDisplayNewsItem} from './news-display-r1.mjs';
import {publishIranNewsDisplay} from './news-display-publication-r1.mjs';

export const APPROVED_INPUT_VERSION='IRAN_NEWS_REVIEWED_INPUT_R1';

// A review receipt is created separately from the feed. The feed itself cannot
// elevate rightsVerified=false, and approved items are never stored in Git.
export function parseReviewedNewsInput(raw,{now=Date.now()}={}){
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>65536)throw Error('NEWS_REVIEW_INPUT_TOO_LARGE');
 let parsed;
 try{parsed=JSON.parse(raw);}catch{throw Error('NEWS_REVIEW_INPUT_INVALID_JSON');}
 if(parsed?.version!==APPROVED_INPUT_VERSION||!Array.isArray(parsed.items)||parsed.items.length>100)
  throw Error('NEWS_REVIEW_INPUT_FORMAT_INVALID');
 if(!parsed.items.every(candidate=>Boolean(toDisplayNewsItem(candidate,{now}))))throw Error('NEWS_REVIEW_INPUT_NOT_APPROVED');
 return parsed.items;
}

export async function runIranNewsDisplayMaintenance({dataDirectory,incoming=[],now=Date.now(),mode='dry-run',remote=null,db=null}={}){
 if(!['dry-run','apply','publish'].includes(mode))throw Error('NEWS_MAINTENANCE_MODE_INVALID');
 if(mode==='publish'&&(!remote||!db))throw Error('NEWS_PUBLICATION_CONFIG_REQUIRED');
 const report=maintainIranDisplayCache(dataDirectory,incoming,{now,dryRun:mode==='dry-run'});
 if(mode==='dry-run')return {...report,publication:'SKIPPED_DRY_RUN'};
 const snapshot=previewIranNewsPublic(readNewsDisplayCache(dataDirectory),{now});
 if(mode==='apply')return {...report,visibleCount:snapshot.itemCount,publication:'SKIPPED_NOT_REQUESTED'};
 const publication=await publishIranNewsDisplay(remote,db,snapshot,{now});
 return {...report,visibleCount:snapshot.itemCount,publication:publication.status};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [flag,inputFlag]=process.argv.slice(2);
 if(!['--dry-run','--apply','--publish'].includes(flag)||process.argv.length>4||
    (inputFlag&&(!inputFlag.startsWith('--reviewed-input=')||flag==='--publish')))
  throw Error('NEWS_MAINTENANCE_EXPLICIT_MODE_REQUIRED');
 const dataDirectory=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 if(!fs.existsSync(path.join(dataDirectory,'iran.sqlite')))throw Error('NEWS_OPERATIONAL_DIR_UNVERIFIED');
 try{
  const inputFile=inputFlag?.slice('--reviewed-input='.length);
  if(inputFlag&&(!inputFile||!path.isAbsolute(inputFile)||!fs.statSync(inputFile).isFile()))throw Error('NEWS_REVIEW_INPUT_PATH_INVALID');
  const now=Date.now();
  const incoming=inputFile?parseReviewedNewsInput(fs.readFileSync(inputFile,'utf8'),{now}):[];
  let remote=null,db=null;
  if(flag==='--publish'){
   const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
   const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
   const {client,credential}=await import('../pc-writer/d1.mjs');
   remote=client(config,credential(root));db=config.core;
  }
  console.log(JSON.stringify(await runIranNewsDisplayMaintenance({dataDirectory,incoming,now,mode:flag.slice(2),remote,db})));
 }catch(error){
  console.error(JSON.stringify({status:'NEWS_MAINTENANCE_FAILED',reason:error.message}));process.exitCode=1;
 }
}
