// R29: independently collect private, rights-unapproved news metadata AFTER
// the existing R15 news operation. This module never publishes to D1 or scores.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectIranNewsR26} from './news-display-collection-r26.mjs';
import {IRAN_DISPLAY_FEEDS_R26} from './news-display-source-registry-r26.mjs';

export const R29_STATUS_FILE='news-display-candidates-auto-r29-status.json';
const kst=now=>new Date(now+9*3600000).toISOString().slice(0,19).replace('T',' ');
const safeCode=value=>/^(?:R26|R29)_[A-Z0-9_]{1,105}$/.test(value??'')?
 value:'R29_UNCLASSIFIED_FAILURE';
function replaceStatus(staged,target){
 for(let attempt=0;;attempt++){
  try{fs.renameSync(staged,target);return;}
  catch(error){
   if(process.platform!=='win32'||!['EACCES','EPERM','EBUSY'].includes(error?.code)||
    attempt>=6)throw Error('R29_STATUS_WRITE_OUTCOME_UNCERTAIN');
   Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,
    [25,50,100,200,400,800][attempt]);
  }
 }
}

function storeStatus(dataDirectory,record){
 if(typeof dataDirectory!=='string'||!path.isAbsolute(dataDirectory)||
  !fs.lstatSync(dataDirectory).isDirectory())throw Error('R29_DATA_DIRECTORY_INVALID');
 const target=path.join(dataDirectory,R29_STATUS_FILE),next=target+'.next';
 if(fs.existsSync(target)){
  const stat=fs.lstatSync(target);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16384)
   throw Error('R29_STATUS_FILE_UNSAFE');
 }
 if(fs.existsSync(next))throw Error('R29_STATUS_STAGING_ALREADY_EXISTS');
 const json=JSON.stringify(record);
 fs.writeFileSync(next,json,{flag:'wx'});
 replaceStatus(next,target);
 if(fs.readFileSync(target,'utf8')!==json)throw Error('R29_STATUS_READBACK_FAILED');
}

export async function runR29PrivateNews({dataDirectory,
 now=Date.now(),collector=collectIranNewsR26}={}){
 if(!Number.isSafeInteger(now)||typeof collector!=='function')
  throw Error('R29_OPTIONS_INVALID');
 // A publisher's error is separately represented. No score/D1 work waits for
 // this collector to succeed, and old candidates survive all-source failure.
 let result,record;
 try{
  result=await collector({dataDirectory,now,dryRun:false});
  const coverage=result.articleCoverage;
  const sourceIds=IRAN_DISPLAY_FEEDS_R26.map(s=>s.id);
  const bySource=coverage?.bySource;
  const validBySource=Array.isArray(bySource)&&bySource.length===sourceIds.length&&
   bySource.every((s,i)=>s?.sourceId===sourceIds[i]&&
    Number.isSafeInteger(s.verifiedThisRun)&&s.verifiedThisRun>=0&&
    Number.isSafeInteger(s.retained30DayCandidates)&&s.retained30DayCandidates>=0);
  const verifiedCount=validBySource?bySource.filter(s=>s.verifiedThisRun>0).length:0;
  const retainedCount=validBySource?bySource.filter(s=>s.retained30DayCandidates>0).length:0;
  const missing=validBySource?bySource.filter(s=>s.retained30DayCandidates===0)
   .map(s=>s.sourceId):[];
  if(result.written!==true||result.dryRun!==false||result.sourceCount!==7||
   result.scoreLedgerModified!==false||result.publicCacheModified!==false||
   result.d1Written!==false||result.schedulerModified!==false||
   result.rightsVerified!==0||result.displayEligible!==0||
   !Number.isSafeInteger(result.candidatesSaved)||result.candidatesSaved<0||
   coverage?.scope!=='PRIVATE_30_DAY_CANDIDATES'||
   coverage.requiredSources!==sourceIds.length||!validBySource||
   coverage.sourcesVerifiedThisRun!==verifiedCount||
   coverage.sourcesWithRetainedCandidates!==retainedCount||
   !Array.isArray(coverage.sourcesWithoutRetainedCandidates)||
   JSON.stringify(coverage.sourcesWithoutRetainedCandidates)!==JSON.stringify(missing)||
   coverage.allSourcesVerifiedThisRun!==(verifiedCount===sourceIds.length)||
   coverage.allSourcesHaveRetainedCandidates!==(retainedCount===sourceIds.length))
   throw Error('R29_COLLECTION_RESULT_INVALID');
  record={version:'IRAN_NEWS_PRIVATE_AUTO_R29',
   status:result.status==='COLLECTION_REVIEW_READY'?'PRIVATE_COLLECTION_READY':
    'PRIVATE_COLLECTION_PARTIAL',
   completedAtKst:kst(now),sourceCount:result.sourceCount,
   sourcesFailed:result.sourcesFailed,articleFailures:result.articleFailures,
   candidatesSaved:result.candidatesSaved,newCandidates:result.newCandidates,
   expiredCandidates:result.expiredCandidates,rightsVerified:0,displayEligible:0,
   articleCoverage:{scope:coverage.scope,requiredSources:7,
    sourcesVerifiedThisRun:coverage.sourcesVerifiedThisRun,
    sourcesWithRetainedCandidates:coverage.sourcesWithRetainedCandidates,
    sourcesWithoutRetainedCandidates:coverage.sourcesWithoutRetainedCandidates,
    allSourcesVerifiedThisRun:coverage.allSourcesVerifiedThisRun,
    allSourcesHaveRetainedCandidates:coverage.allSourcesHaveRetainedCandidates},
   scoreLedgerModified:false,publicCacheModified:false,d1Written:false,
   schedulerModified:false,translationModified:false};
 }catch(error){
  record={version:'IRAN_NEWS_PRIVATE_AUTO_R29',
   status:'PRIVATE_COLLECTION_FAILED_CANDIDATES_PRESERVED',
   completedAtKst:kst(now),reason:safeCode(error?.message),
   scoreLedgerModified:false,publicCacheModified:false,d1Written:false,
   schedulerModified:false,translationModified:false};
 }
 storeStatus(dataDirectory,record);
 return record;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--scheduled'){
  console.error(JSON.stringify({status:'STOP_R29_EXPLICIT_SCHEDULED_MODE_REQUIRED'}));
  process.exitCode=2;
 }else{
  // R29 must run only from the guarded R13 extension. A manual --scheduled
  // invocation requires the same short-lived flag, never a permanent token.
  if(process.env.ZGMINI_IRAN_NEWS_R29_SCHEDULED!=='YES'){
   console.error(JSON.stringify({status:'STOP_R29_NOT_APPROVED_SCHEDULED_HOOK'}));
   process.exitCode=2;
  }else{
   const dataDirectory=process.env.ZGMINI_IRAN_HOME??
    path.join(os.homedir(),'.zgmini','iran-progress-r13');
   try{
    const record=await runR29PrivateNews({dataDirectory});
    console.log(JSON.stringify(record));
    if(record.status==='PRIVATE_COLLECTION_FAILED_CANDIDATES_PRESERVED')
     process.exitCode=1;
   }catch(error){
    console.error(JSON.stringify({status:'STOP_R29_STATUS_UNCERTAIN',
     reason:safeCode(error?.message),scoreLedgerModified:false,d1Written:false}));
    process.exitCode=2;
   }
  }
 }
}
