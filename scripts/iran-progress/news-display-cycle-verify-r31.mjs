// R31: one-shot read-only evidence of an ordinary R29 private news run.
// Never starts scheduled jobs, fetches articles, or writes operational files.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const TASK='ZGMINI-PC-Iran-Progress-R13';
const STATUS='news-display-candidates-auto-r29-status.json';
const CANDIDATES='news-display-candidates-r26.json';
const validStatus=new Set(['PRIVATE_COLLECTION_READY','PRIVATE_COLLECTION_PARTIAL']);
const isoKst=epoch=>new Date(epoch+9*3600000).toISOString().replace('T',' ').slice(0,19);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const safeReason=error=>/^R31_[A-Z0-9_]{1,85}$/.test(error?.message??'')?
 error.message:'R31_UNCLASSIFIED_FAILURE';

function readPinnedJson(directory,basename,maxBytes){
 const file=path.join(directory,basename);
 if(!fs.existsSync(file))throw Error('R31_'+(basename===STATUS?'STATUS_MISSING':'CANDIDATES_MISSING'));
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>maxBytes)
  throw Error('R31_UNSAFE_OBSERVATION_FILE');
 const bytes=fs.readFileSync(file);
 let value;
 try{value=JSON.parse(bytes.toString('utf8'));}
 catch{throw Error('R31_OBSERVATION_JSON_INVALID');}
 return {value,stat,sha256:sha(bytes)};
}

function statusEpoch(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value))
  throw Error('R31_STATUS_TIMESTAMP_INVALID');
 const epoch=Date.parse(value.replace(' ','T')+'+09:00');
 if(!Number.isSafeInteger(epoch)||isoKst(epoch)!==value)
  throw Error('R31_STATUS_TIMESTAMP_INVALID');
 return epoch;
}

export function inspectR31({dataDirectory,now=Date.now(),taskObserved=true}={}){
 if(!Number.isSafeInteger(now)||typeof dataDirectory!=='string'||!path.isAbsolute(dataDirectory)||
  !fs.statSync(dataDirectory).isDirectory())throw Error('R31_DATA_DIRECTORY_INVALID');
 const status=readPinnedJson(dataDirectory,STATUS,16384);
 const cache=readPinnedJson(dataDirectory,CANDIDATES,1024*1024);
 const observation=status.value,items=cache.value?.items;
 if(observation?.version!=='IRAN_NEWS_PRIVATE_AUTO_R29'||
  cache.value?.version!=='IRAN_NEWS_COLLECTION_R26'||!Array.isArray(items)||
  items.length>700||new Set(items.map(x=>x?.id)).size!==items.length)
  throw Error('R31_DATA_CONTRACT_INVALID');
 const observedAt=statusEpoch(observation.completedAtKst);
 const cacheUpdatedAt=cache.value.updatedAt;
 const cacheTimeValid=Number.isSafeInteger(cacheUpdatedAt)&&
  Math.abs(cacheUpdatedAt-observedAt)<=1000;
 const isolation=['scoreLedgerModified','publicCacheModified','d1Written',
  'schedulerModified','translationModified'].every(key=>observation[key]===false);
 const rightsSafe=observation.rightsVerified===0&&observation.displayEligible===0&&
  items.every(item=>item?.rightsVerified===false&&item?.displayEligible===false);
 const statusOk=validStatus.has(observation.status)&&observation.sourceCount===7&&
  Number.isSafeInteger(observation.candidatesSaved)&&observation.candidatesSaved===items.length&&
  Number.isSafeInteger(observation.sourcesFailed)&&observation.sourcesFailed>=0&&
  Number.isSafeInteger(observation.articleFailures)&&observation.articleFailures>=0;
 const ageMinutes=Math.round((now-observedAt)/60000);
 const fresh=ageMinutes>=-2&&ageMinutes<=480;
 const verified=Boolean(taskObserved&&statusOk&&cacheTimeValid&&isolation&&rightsSafe&&fresh);
 return {phase:verified?'R31_SINGLE_CYCLE_OBSERVED':'R31_CYCLE_NOT_VERIFIED',
  task:TASK,taskPresent:Boolean(taskObserved),
  observationAtKst:observation.completedAtKst,observationCycleKst:
   observation.completedAtKst.slice(0,11)+
   String(Math.floor(Number(observation.completedAtKst.slice(11,13))/6)*6).padStart(2,'0'),
  ageMinutes,collectorStatus:observation.status,
  sourceCount:observation.sourceCount??null,sourcesFailed:observation.sourcesFailed??null,
  articleFailures:observation.articleFailures??null,
  candidatesSaved:observation.candidatesSaved??null,verifiedCandidateCount:items.length,
  newCandidates:observation.newCandidates??null,
  cacheUpdatedAtKst:Number.isSafeInteger(cacheUpdatedAt)?isoKst(cacheUpdatedAt):null,
  candidateCacheSha256:cache.sha256,
  cacheCoherent:cacheTimeValid,isolationMaintained:isolation,rightsUnverified:rightsSafe,
  statusFresh:fresh,automaticScheduleTwoCyclesVerified:false,
  nextGate:'COMPARE_TWO_SEPARATE_NORMAL_R13_CYCLE_SNAPSHOTS',
  operationalFilesWritten:false,collectionExecuted:false,schedulerModified:false};
}

function taskPresent(){
 const result=spawnSync('schtasks.exe',['/Query','/TN',TASK,'/XML'],
  {encoding:'buffer',windowsHide:true,timeout:15000,maxBuffer:1024*1024});
 return !result.error&&result.status===0;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [reportDirectory]=process.argv.slice(2);
 if(process.argv.length!==3||!path.isAbsolute(reportDirectory)){
  console.error('R31_EXPLICIT_REPORT_DIRECTORY_REQUIRED');process.exitCode=2;
 }else{
  const now=Date.now();
  let report;
  try{
   const dataDirectory=process.env.ZGMINI_IRAN_HOME??
    path.join(os.homedir(),'.zgmini','iran-progress-r13');
   report=inspectR31({dataDirectory,now,taskObserved:taskPresent()});
  }catch(error){
   report={phase:'R31_CYCLE_NOT_VERIFIED',reason:safeReason(error),
    operationalFilesWritten:false,collectionExecuted:false,schedulerModified:false};
  }
  const name='IRAN_NEWS_R31_CYCLE_READONLY_RESULT_'+
   new Date(now+9*3600000).toISOString().slice(0,19).replace(/[-:T]/g,'')+'_'+
   String(now%1000).padStart(3,'0')+'.txt';
  try{
   const output=path.join(reportDirectory,name);
   fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
   console.log('R31_RESULT_FILE='+output);
   console.log('R31_STATUS='+report.phase);
  }catch{console.error('R31_REPORT_WRITE_FAILED');process.exitCode=2;}
  if(report.phase!=='R31_SINGLE_CYCLE_OBSERVED')process.exitCode=1;
 }
}
