// R14: a single guarded, recoverable display-news-only publication attempt.
// Requires live R13 rights/cache/D1 preflight and explicit operator approval.
// Not a scheduled runner. Never mutates the R3/R5 SQLite score ledger.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {preflightIncrementalIranNewsR13} from './news-display-incremental-preflight-r13.mjs';
import {readNewsDisplayCache} from './news-display-io-r1.mjs';
import {runIranNewsDisplayMaintenance} from './news-display-maintenance-r1.mjs';
import {previewIranNewsPublic} from './news-display-r1.mjs';
import {publishIranNewsDisplay} from './news-display-publication-r1.mjs';
import {IRAN_NEWS_DISPLAY_KEY} from '../../lib/iran-progress/news-display-r1.mjs';

async function readRemoteIdentity(remote,db){
 const response=await remote.query(db,
  'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',
  [IRAN_NEWS_DISPLAY_KEY]);
 if(!Array.isArray(response?.results)||response.results.length!==1)
  throw Error('R14_D1_NEWS_IDENTITY_UNVERIFIED');
 const {body,stored_at}=response.results[0];
 if(typeof body!=='string'||!Number.isFinite(Number(stored_at)))
  throw Error('R14_D1_NEWS_IDENTITY_INVALID');
 return JSON.stringify({body,stored_at:Number(stored_at)});
}

export async function publishIncrementalIranNewsR14({dataDirectory,remote,db,
 now=Date.now(),fetcher=fetch}={}){
 // Capture the precise state before all read-only network calls.
 const cacheBefore=readNewsDisplayCache(dataDirectory);
 const remoteBefore=await readRemoteIdentity(remote,db);
 const plan=await preflightIncrementalIranNewsR13({dataDirectory,remote,db,now,fetcher});
 if(plan.report.status!=='PASS_R13_INCREMENTAL_NEWS_PREFLIGHT_READ_ONLY')
  throw Error('R14_R13_PREFLIGHT_NOT_PASSED');
 // A live R13 scheduled retention task must never be overwritten based on a
 // stale preflight. Do not attempt a remote write if the D1 row has changed.
 if(JSON.stringify(readNewsDisplayCache(dataDirectory))!==JSON.stringify(cacheBefore))
  throw Error('R14_PC_CACHE_DRIFT_BEFORE_WRITE');
 if(await readRemoteIdentity(remote,db)!==remoteBefore)
  throw Error('R14_D1_CHANGED_BEFORE_WRITE');

 const cacheWrite=await runIranNewsDisplayMaintenance({dataDirectory,
  incoming:plan.incoming,now,mode:'apply'});
 if(cacheWrite.written!==true||cacheWrite.rejected!==0)
  throw Error('R14_PC_CACHE_READBACK_FAILED');
 const saved=readNewsDisplayCache(dataDirectory);
 if(JSON.stringify(saved)!==JSON.stringify(plan.cache))
  throw Error('R14_CACHE_PUBLISHED_PLAN_DIVERGENCE');
 const actual=previewIranNewsPublic(saved,{now});
 if(JSON.stringify(actual)!==JSON.stringify(plan.publicSnapshot))
  throw Error('R14_PUBLIC_NEWS_PLAN_DIVERGENCE');
 // Recheck the isolated remote key after local cache write. If D1 changed,
 // preserve local news and stop without a conflicting remote overwrite.
 if(await readRemoteIdentity(remote,db)!==remoteBefore)
  throw Error('R14_D1_CHANGED_AFTER_CACHE_WRITE');
 const published=await publishIranNewsDisplay(remote,db,actual,{now});
 if(!['VERIFIED','UNCHANGED'].includes(published.status))
  throw Error('R14_D1_NEWS_PUBLICATION_NOT_VERIFIED');
 return {status:'PASS_R14_NEWS_ONLY_INCREMENTAL_PUBLISHED',
  newArticles:plan.report.newArticles,duplicatesPreserved:plan.report.duplicatesPreserved,
  rightsEligible:plan.report.rightsEligible,rightsHeld:plan.report.rightsHeld,
  cacheBefore:cacheBefore.items.length,cacheAfter:saved.items.length,
  publicItemCount:actual.itemCount,d1Publication:published.status,
  pcDisplayCacheWritten:true,d1NewsKeyWritten:published.status==='VERIFIED',
  schedulerModified:false,scoreLedgerModified:false};
}

async function commandLine(){
 if(process.argv.length!==3||process.argv[2]!=='--publish-once')
  throw Error('R14_EXPLICIT_PUBLISH_ONCE_MODE_REQUIRED');
 if(process.env.ZGMINI_IRAN_NEWS_R14_APPROVED!=='YES')
  throw Error('R14_PUBLICATION_APPROVAL_GATE_REQUIRED');
 const dataDirectory=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
 const {client,credential}=await import('../pc-writer/d1.mjs');
 let refreshWasRequested=false;
 const token=credential(root,{refresh:()=>{refreshWasRequested=true;return {status:1};}});
 if(refreshWasRequested)throw Error('R14_EXISTING_D1_CREDENTIAL_REFRESH_REQUIRED');
 const report=await publishIncrementalIranNewsR14({dataDirectory,
  remote:client(config,token),db:config.core});
 console.log(JSON.stringify(report));
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await commandLine();}
 catch(error){console.error(JSON.stringify({status:'STOP_R14_NEWS_PUBLICATION_REQUIRES_REVIEW',
  reason:error.message,doNotBlindlyRetry:true}));process.exitCode=1;}
}
