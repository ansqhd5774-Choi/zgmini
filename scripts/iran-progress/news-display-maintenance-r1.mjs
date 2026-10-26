// Separate PC display-news maintenance; no R3/R5 ledger or scheduler changes.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {maintainIranDisplayCache,readNewsDisplayCache} from './news-display-io-r1.mjs';
import {previewIranNewsPublic} from './news-display-r1.mjs';
import {publishIranNewsDisplay} from './news-display-publication-r1.mjs';

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
 const flag=process.argv[2];
 if(process.argv.length!==3||!['--dry-run','--apply','--publish'].includes(flag))throw Error('NEWS_MAINTENANCE_EXPLICIT_MODE_REQUIRED');
 const dataDirectory=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 if(!fs.existsSync(path.join(dataDirectory,'iran.sqlite')))throw Error('NEWS_OPERATIONAL_DIR_UNVERIFIED');
 try{
  let remote=null,db=null;
  if(flag==='--publish'){
   const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
   const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
   const {client,credential}=await import('../pc-writer/d1.mjs');
   remote=client(config,credential(root));db=config.core;
  }
  console.log(JSON.stringify(await runIranNewsDisplayMaintenance({dataDirectory,mode:flag.slice(2),remote,db})));
 }catch(error){
  console.error(JSON.stringify({status:'NEWS_MAINTENANCE_FAILED',reason:error.message}));process.exitCode=1;
 }
}
