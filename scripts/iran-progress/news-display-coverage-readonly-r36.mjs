// R36: read-only audit of the REAL installed R35 private display cache.
// No feeds are fetched, no operational file is written, no scheduled task runs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {resolvePcProject} from './news-display-upgrade-r32.mjs';

export const R36_ACTIVE_SOURCE_IDS=Object.freeze([
 'tasnim','govuk','guardian-iran','dw-world',
 'bbc-middle-east','aljazeera','un-middle-east',
]);
export const R36_RETIRED_SOURCE_IDS=Object.freeze(['iaea-news','iaea-statements']);
const TASK='ZGMINI-PC-Iran-Progress-R13';
const CACHE='news-display-candidates-r26.json';
const STATUS='news-display-candidates-auto-r29-status.json';
const MODULE_SHA=Object.freeze({
 'news-display-multisource-audit-r24.mjs':'6140a4031cb0235f6360f5b05cceb916611d34c4b74a5279f446588ae4c8d6fa',
 'news-display-source-registry-r26.mjs':'87744873c87d7aaacb7d760f8a0613c8b971d1562a03857ca6dbd82583302790',
 'news-display-article-audit-r25.mjs':'99858d37a345a49e6c464427beeb61c1da0a5bd671f712b8817e774234dfc985',
 'news-display-collection-r26.mjs':Object.freeze([
  '3cc83460d196ab8d0c74329e5b5f1a30f4dda9723c2de1ffee0acc1dbc4487f8',
  'd23be30ee8c0bc7d8eef6865c129356fc0dcf306cd45e471d528b158ab0cf939',
 ]),
});
const isoKst=epoch=>new Date(epoch+9*3600000).toISOString().slice(0,19).replace('T',' ');
const dateKst=epoch=>isoKst(epoch).slice(0,10);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

function checkedFile(file,maxBytes){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size===0||stat.size>maxBytes)
  throw Error('R36_UNSAFE_READ_ONLY_FILE');
 return fs.readFileSync(file);
}

export function readR36ScheduledStatus(dataDirectory){
 const file=path.join(dataDirectory,STATUS);
 if(!fs.existsSync(file))return {state:'R29_STATUS_NOT_FOUND'};
 const bytes=checkedFile(file,16384);
 let record;
 try{record=JSON.parse(bytes.toString('utf8'));}
 catch{throw Error('R36_R29_STATUS_JSON_INVALID');}
 if(record?.version!=='IRAN_NEWS_PRIVATE_AUTO_R29'||
  !/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(record.completedAtKst??''))
  throw Error('R36_R29_STATUS_CONTRACT_INVALID');
 const t=Date.parse(record.completedAtKst.replace(' ','T')+'+09:00');
 if(!Number.isSafeInteger(t)||isoKst(t)!==record.completedAtKst)
  throw Error('R36_R29_TIMESTAMP_INVALID');
 return {state:'R29_STATUS_FILE_OBSERVED',completedAtKst:record.completedAtKst,
  completedEpoch:t,status:record.status??null,
  candidatesSaved:Number.isSafeInteger(record.candidatesSaved)?record.candidatesSaved:null,
  sourcesFailed:Number.isSafeInteger(record.sourcesFailed)?record.sourcesFailed:null,
  articleFailures:Number.isSafeInteger(record.articleFailures)?record.articleFailures:null,
  sha256:sha(bytes)};
}

export function inspectR36Coverage({cache,activeIds=R36_ACTIVE_SOURCE_IDS,
 scheduledStatus={state:'R29_STATUS_NOT_FOUND'},taskPresent=null,now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||!Array.isArray(activeIds)||
  JSON.stringify(activeIds)!==JSON.stringify(R36_ACTIVE_SOURCE_IDS)||
  cache?.version!=='IRAN_NEWS_COLLECTION_R26'||!Array.isArray(cache.items)||
  cache.items.length>700||!cache.items.every(x=>x&&typeof x==='object')||
  (taskPresent!==null&&typeof taskPresent!=='boolean'))
  throw Error('R36_COVERAGE_INPUT_INVALID');
 if(new Set(cache.items.map(x=>x.id)).size!==cache.items.length)
  throw Error('R36_DUPLICATE_CANDIDATE_ID');
 if(!cache.items.every(x=>x.rightsVerified===false&&x.displayEligible===false&&
  x.reviewStatus==='ARTICLE_METADATA_REVIEWED'))
  throw Error('R36_PRIVATE_METADATA_CONTRACT_DRIFT');
 const startKst=dateKst(now-29*86400000),endKst=dateKst(now);
 const dated=cache.items.map(item=>{
  const t=Date.parse(item.publisherDeclaredPublishedAt);
  if(!Number.isSafeInteger(t)||t>now||t<0||
   new Date(t).toISOString()!==item.publisherDeclaredPublishedAt)
   throw Error('R36_PUBLISHER_DATE_INVALID');
  return {item,day:dateKst(t),publishedAtKst:isoKst(t)};
 });
 const sourceCoverage=activeIds.map(sourceId=>{
  const all=dated.filter(x=>x.item.sourceId===sourceId);
  const recent=all.filter(x=>x.day>=startKst&&x.day<=endKst);
  const latest=[...recent].sort((a,b)=>
   b.item.publisherDeclaredPublishedAt.localeCompare(a.item.publisherDeclaredPublishedAt))[0]??null;
  return {sourceId,storedCandidateCount:all.length,
   retained30DayCandidates:recent.length,
   olderOrOutOfWindowCandidates:all.length-recent.length,
   hasAtLeastOne30DayArticle:recent.length>0,
   latestArticle:latest?{title:latest.item.originalTitle,
    publishedAtKst:latest.publishedAtKst,originalUrl:latest.item.sourceUrl}:null};
 });
 const retired=R36_RETIRED_SOURCE_IDS.map(sourceId=>({sourceId,
  historicalCandidatesPreserved:dated.filter(x=>x.item.sourceId===sourceId).length}));
 const known=new Set([...activeIds,...R36_RETIRED_SOURCE_IDS]);
 const unrecognized=dated.filter(x=>!known.has(x.item.sourceId)).length;
 const activeStored=sourceCoverage.reduce((count,x)=>count+x.storedCandidateCount,0);
 const retiredStored=retired.reduce((count,x)=>count+x.historicalCandidatesPreserved,0);
 if(activeStored+retiredStored+unrecognized!==cache.items.length)
  throw Error('R36_COUNT_RECONCILIATION_FAILED');
 const sourceCountWithRecent=sourceCoverage.filter(s=>s.hasAtLeastOne30DayArticle).length;
 const cacheUpdatedAt=cache.updatedAt;
 const updated=Number.isSafeInteger(cacheUpdatedAt)&&cacheUpdatedAt<=now&&
  cacheUpdatedAt>0?isoKst(cacheUpdatedAt):null;
 const cacheNewerThanLastSchedule=scheduledStatus.state==='R29_STATUS_FILE_OBSERVED'&&
  Number.isSafeInteger(cacheUpdatedAt)&&
  cacheUpdatedAt>scheduledStatus.completedEpoch+1000;
 return {version:'IRAN_NEWS_R36_SOURCE_COVERAGE_READONLY',
  status:sourceCountWithRecent===7&&unrecognized===0?
   'PASS_R36_SEVEN_SOURCE_PRIVATE_COVERAGE':'PARTIAL_R36_SEVEN_SOURCE_PRIVATE_COVERAGE',
  checkedAtKst:isoKst(now),retentionWindowKst:{start:startKst,end:endKst},
  expectedActiveSourceCount:7,sourcesWithRetained30DayCandidates:sourceCountWithRecent,
  missingActiveSources:sourceCoverage.filter(s=>!s.hasAtLeastOne30DayArticle).map(s=>s.sourceId),
  totalPrivateCandidateCount:cache.items.length,
  activeStoredCandidateCount:activeStored,
  retiredHistoricalCandidateCount:retiredStored,
  unrecognizedSourceCandidateCount:unrecognized,sourceCoverage,retiredSources:retired,
  cacheUpdatedAtKst:updated,
  scheduledRun:{task:TASK,taskPresent,recordState:scheduledStatus.state,
   recordReason:scheduledStatus.reason??null,
   completedAtKst:scheduledStatus.completedAtKst??null,
   collectorStatus:scheduledStatus.status??null,
   sourcesFailed:scheduledStatus.sourcesFailed??null,
   articleFailures:scheduledStatus.articleFailures??null,
   cacheNewerThanLastSchedule,
   currentPrivateCacheNotProofOfLatestScheduledRun:cacheNewerThanLastSchedule,
   twoNormalCyclesVerified:false},
  pcCacheWritten:false,operationalFilesWritten:false,collectionExecuted:false,
  schedulerModified:false,d1Written:false,scoreLedgerModified:false,
  publicCacheModified:false,rightsVerified:false,displayEligible:false};
}

function taskExists(){
 const r=spawnSync('schtasks.exe',['/Query','/TN',TASK,'/XML'],
  {encoding:'buffer',windowsHide:true,timeout:15000,maxBuffer:1024*1024});
 return !r.error&&r.status===0;
}

export async function inspectInstalledR36({dataDirectory,projectRoot,now=Date.now(),
 taskPresent=null}={}){
 if(typeof dataDirectory!=='string'||!path.isAbsolute(dataDirectory)||
  typeof projectRoot!=='string'||!path.isAbsolute(projectRoot))
  throw Error('R36_PC_PATH_INVALID');
 const scripts=path.join(projectRoot,'scripts','iran-progress');
 for(const [name,expected] of Object.entries(MODULE_SHA)){
  const actual=sha(checkedFile(path.join(scripts,name),1024*1024));
  if(!(Array.isArray(expected)?expected.includes(actual):actual===expected))
   throw Error('R36_INSTALLED_R35_IDENTITY_DRIFT');
 }
 const {IRAN_DISPLAY_FEEDS_R26}=await import(pathToFileURL(
  path.join(scripts,'news-display-source-registry-r26.mjs')).href);
 const actualIds=IRAN_DISPLAY_FEEDS_R26.map(x=>x.id);
 if(JSON.stringify(actualIds)!==JSON.stringify(R36_ACTIVE_SOURCE_IDS))
  throw Error('R36_ACTIVE_REGISTRY_DRIFT');
 const {readIranCollectionR26}=await import(pathToFileURL(
  path.join(scripts,'news-display-collection-r26.mjs')).href);
 const cache=readIranCollectionR26(dataDirectory,{now});
 const fileBytes=checkedFile(path.join(dataDirectory,CACHE),1024*1024);
 let scheduledStatus;
 try{scheduledStatus=readR36ScheduledStatus(dataDirectory);}
 catch(error){scheduledStatus={state:'R29_STATUS_INVALID',reason:
  /^R36_[A-Z0-9_]+$/.test(error?.message)?error.message:'R36_R29_STATUS_UNCLASSIFIED'};}
 return {...inspectR36Coverage({cache,activeIds:actualIds,scheduledStatus,taskPresent,now}),
  candidateCacheSha256:sha(fileBytes),
  lastScheduledStatusFileSha256:scheduledStatus.sha256??null};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--snapshot'){
  console.error('STOP_R36_READ_ONLY_SNAPSHOT_MODE_REQUIRED');process.exitCode=2;
 }else{
  const now=Date.now();
  let report;
  try{
   const dataDirectory=process.env.ZGMINI_IRAN_HOME??
    path.join(os.homedir(),'.zgmini','iran-progress-r13');
   report=await inspectInstalledR36({dataDirectory,
    projectRoot:resolvePcProject(),now,taskPresent:taskExists()});
  }catch(error){
   report={version:'IRAN_NEWS_R36_SOURCE_COVERAGE_READONLY',status:'STOP_R36_SNAPSHOT',
    reason:/^R36_[A-Z0-9_]+$/.test(error?.message)?error.message:
     'R36_UNCLASSIFIED_FAILURE',collectionExecuted:false,
    operationalFilesWritten:false,schedulerModified:false,d1Written:false};
  }
  const reportRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  const filename='IRAN_NEWS_R36_SOURCE_COVERAGE_'+
   new Date(now+9*3600000).toISOString().slice(0,19).replace(/[-:T]/g,'')+'_'+
   String(now%1000).padStart(3,'0')+'.txt';
  try{
   const file=path.join(reportRoot,filename);
   fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
   console.log('R36_RESULT_FILE='+file);
   console.log('R36_STATUS='+report.status);
  }catch{
   console.error('STOP_R36_RESULT_WRITE_FAILED');
   console.log('R36_FALLBACK_SUMMARY='+JSON.stringify(report));
   process.exitCode=2;
  }
  if(report.status?.startsWith('STOP_R36_'))process.exitCode=2;
 }
}
