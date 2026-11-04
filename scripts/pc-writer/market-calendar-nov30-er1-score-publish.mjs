// Approved B publisher candidate: publish only the completed, already saved
// November ER1 cohort. No provider GET, raw release upload, Core or scheduler
// mutation. The future-only cohort was scored separately on the PC.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateER1PublicDisplay} from '../../lib/market-calendar-er1-public-display.mjs';
import {resolveApprovedProjectSource} from './market-calendar-dec31-publish.mjs';

const PC_HOME=String.raw`E:\ZGmini\data\pc-writer`;
const FULL_FOLDER='nov30-er1-full-derived';
// D1 strings/rows can be up to 2 MB. Use a conservative 1 MB bound for this
// derived-only JSON; the old 100 KB cap was for the three/twenty-symbol pilot.
export const NOV_ER1_FULL_MAX_PUBLIC_BYTES=1_000_000;
const sha256=value=>createHash('sha256').update(value).digest('hex');
const stop=code=>{throw Error(code)};
const codeOf=e=>/^NOV30_ER1_[A-Z0-9_]+$/.test(e?.message??'')?
 e.message:'NOV30_ER1_FULL_PUBLISH_UNEXPECTED_STOP';
const HEX64=/^[a-f0-9]{64}$/;

export function verifyNovemberER1FullPublish({manifest,body,calendarSymbols,now=Date.now()}){
 if(typeof body!=='string'||Buffer.byteLength(body,'utf8')>NOV_ER1_FULL_MAX_PUBLIC_BYTES)
  stop('NOV30_ER1_FULL_PUBLISH_SIZE_STOP');
 if(!Array.isArray(calendarSymbols)||!calendarSymbols.length||
  !calendarSymbols.every(x=>typeof x==='string'))
  stop('NOV30_ER1_FULL_PUBLISH_COHORT_STOP');
 if(!manifest||manifest.schema!=='ZGMINI_NOV30_ER1_FULL_PRIVATE_V1'||
  manifest.status!=='PASS'||manifest.pilotOnly!==true||
  !Number.isSafeInteger(manifest.selectedSymbols)||
  manifest.selectedSymbols!==calendarSymbols.length||
  manifest.missingActualSymbols!==0||manifest.isolatedSymbols!==0||
  !Number.isSafeInteger(manifest.scoreableIssuers)||
  !HEX64.test(manifest.localScoreSha256??'')||
  !HEX64.test(manifest.candidateSetSha256??'')||
  !Number.isFinite(Date.parse(manifest.sourceStoredAt??''))||
  !Number.isFinite(Date.parse(manifest.completedAt??'')))
  stop('NOV30_ER1_FULL_PUBLISH_MANIFEST_STOP');
 if(manifest.candidateSetSha256!==sha256(JSON.stringify(calendarSymbols)))
  stop('NOV30_ER1_FULL_PUBLISH_COHORT_DRIFT_STOP');
 if(manifest.localScoreSha256!==sha256(body))
  stop('NOV30_ER1_FULL_PUBLISH_DIGEST_DRIFT_STOP');
 let result;try{result=JSON.parse(body)}catch{
  stop('NOV30_ER1_FULL_PUBLISH_BODY_STOP');
 }
 if(!validateER1PublicDisplay(result,{now})||
  result.asOf!==manifest.asOf||
  result.coverage.inputSymbols!==manifest.selectedSymbols||
  result.recordCount!==manifest.scoreableIssuers)
  stop('NOV30_ER1_FULL_PUBLISH_CONTRACT_STOP');
 return {body,sha256:manifest.localScoreSha256,recordCount:result.recordCount,
  inputSymbols:result.coverage.inputSymbols,star3Count:result.star3Count,
  asOf:result.asOf,sourceStoredAt:manifest.sourceStoredAt};
}

function readPrivate(file,maxBytes){
 try{
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size<2||stat.size>maxBytes)
   stop('NOV30_ER1_FULL_PUBLISH_LOCAL_FILE_STOP');
  return fs.readFileSync(file,'utf8');
 }catch(e){stop(codeOf(e)==='NOV30_ER1_FULL_PUBLISH_LOCAL_FILE_STOP'?
  e.message:'NOV30_ER1_FULL_PUBLISH_LOCAL_FILE_STOP')}
}
const getHead=root=>execFileSync('git',['rev-parse','HEAD'],{
 cwd:root,encoding:'utf8',windowsHide:true,timeout:15000,
 stdio:['ignore','pipe','ignore']}).trim();

export async function runNovemberER1FullPublish({pcHome=PC_HOME,
 clock=Date.now,calendarLoader,remoteFactory,engine,
 resolveRoot=resolveApprovedProjectSource,head=getHead,
 requireWindows=true}={}){
 const report={schema:'ZGMINI_NOV30_ER1_FULL_D1_PUBLISH_V1',status:'BLOCKED',
  code:'NOV30_ER1_FULL_PUBLISH_NOT_STARTED',providerCalls:0,d1Writes:0,
  coreWrites:0,schedulerWrites:0,existingFeedWrites:0,rawRowsPublic:0};
 let fd=null,lock;
 try{
  if(requireWindows&&process.platform!=='win32')
   stop('NOV30_ER1_FULL_PUBLISH_WINDOWS_ONLY');
  if(!path.isAbsolute(pcHome)||!fs.existsSync(pcHome))
   stop('NOV30_ER1_FULL_PUBLISH_PC_HOME_STOP');
  const folder=path.join(pcHome,'er1-input',FULL_FOLDER);
  const manifestText=readPrivate(path.join(folder,'complete-manifest.json'),16000);
  const manifest=JSON.parse(manifestText);
  const body=readPrivate(path.join(folder,'current.json'),NOV_ER1_FULL_MAX_PUBLIC_BYTES);
  const {loadNovemberEvents,selectFutureNovemberSymbols,syncNovemberER1D1}=
   engine??await import('./market-calendar-nov30-er1-probe-publish.mjs');
  const events=await (calendarLoader??loadNovemberEvents)(pcHome);
  const calendarSymbols=selectFutureNovemberSymbols(events,manifest.asOf,null);
  const now=clock();
  const prepared=verifyNovemberER1FullPublish({manifest,body,calendarSymbols,now});
  Object.assign(report,{asOf:prepared.asOf,inputSymbols:prepared.inputSymbols,
   scoreableIssuers:prepared.recordCount,star3Count:prepared.star3Count,
   localScoreSha256:prepared.sha256,sourceStoredAt:prepared.sourceStoredAt});
  const config=JSON.parse(fs.readFileSync(path.join(pcHome,'config.json'),'utf8'));
  if(config.collectionTarget!=='pc'||config.enabled!==true||!config.core)
   stop('NOV30_ER1_FULL_PUBLISH_CONFIG_STOP');
  const root=resolveRoot({expectedSha:config.source,getHead:head});
  if(head(root)!==config.source)stop('NOV30_ER1_FULL_PUBLISH_SOURCE_STOP');
  lock=path.join(pcHome,'nov30-er1-full-d1-publish.lock');
  try{fd=fs.openSync(lock,'wx')}catch{
   stop('NOV30_ER1_FULL_PUBLISH_LOCK_BUSY');
  }
  fs.writeFileSync(fd,JSON.stringify({pid:process.pid,purpose:'nov30-er1-full-d1-only'}));
  // The collection lane may advance concurrently. Never publish a stale
  // current pointer or a manifest that changed after the initial read.
  if(readPrivate(path.join(folder,'complete-manifest.json'),16000)!==manifestText||
   readPrivate(path.join(folder,'current.json'),NOV_ER1_FULL_MAX_PUBLIC_BYTES)!==body)
   stop('NOV30_ER1_FULL_PUBLISH_LOCAL_CHANGED_STOP');
  if(head(root)!==config.source)stop('NOV30_ER1_FULL_PUBLISH_SOURCE_CHANGED_STOP');
  const remote=remoteFactory?await remoteFactory({pcHome,root,config}):await (async()=>{
   const {client,credential}=await import(pathToFileURL(path.join(root,'scripts/pc-writer/d1.mjs')).href);
   return client(config,credential(root));
  })();
  const outcome=await syncNovemberER1D1({remote,core:config.core,body,storedAt:now});
  report.status='PASS';report.code=outcome.code;report.d1Writes=Number(outcome.wrote);
  report.d1ReadbackSha256=prepared.sha256;
 }catch(e){report.code=codeOf(e)}
 finally{
  if(fd!==null){try{fs.closeSync(fd);fs.unlinkSync(lock)}catch{
   report.status='STATE_UNKNOWN';report.code='NOV30_ER1_FULL_PUBLISH_LOCK_RELEASE_STOP';}}
 }
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const resultPath=process.argv[2];
 if(!resultPath||!path.isAbsolute(resultPath)){
  process.stderr.write('NOV30_ER1_FULL_PUBLISH_RESULT_PATH_REQUIRED\n');process.exitCode=2;
 }else{
  const report=await runNovemberER1FullPublish();
  try{fs.writeFileSync(resultPath,JSON.stringify(report)+'\n',{flag:'wx'})}catch{
   process.stderr.write('NOV30_ER1_FULL_PUBLISH_RESULT_SAVE_STOP\n');process.exitCode=2;
  }
  console.log('NOV30_ER1_FULL_PUBLISH='+report.status+' CODE='+report.code+
   ' SCOREABLE='+(report.scoreableIssuers??0)+' STAR3='+(report.star3Count??0));
  if(report.status!=='PASS')process.exitCode=1;
 }
}
