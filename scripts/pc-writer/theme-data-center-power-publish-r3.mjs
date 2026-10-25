// Tenth-theme PC lane: R2 bounded free anonymous GET -> R188 score ->
// optional explicit risk-acknowledged D1 CAS/readback -> public API readback.
// No writes to the existing nine themes, other D1 keys, or any scheduled task.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runDcPowerCycleR2} from './theme-data-center-power-cycle-r2.mjs';
import {buildDcPowerPublicR3} from './theme-data-center-power-public-r3.mjs';
import {dcPowerVersionedD1} from './theme-data-center-power-d1-r3.mjs';
import {biotechCloudflareTokenR7} from './theme-biotech-auth-r7.mjs';
import {DC_POWER_PUBLIC_KEY} from '../../worker/theme-data-center-power-r1.mjs';

const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export async function dcPowerPublicSnapshot({fetchImpl=fetch,now=Date.now()}={}){
 const response=await fetchImpl('https://zgmini.kr/api/theme-fear-greed/?dc_power_r3='+now,{
  headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000),redirect:'error'});
 need(response.ok,'DC_POWER_R3_PUBLIC_API_UNAVAILABLE');
  // The seven immutable core themes are the only required baseline. Optional
  // AI/biotech sidecars may be absent or stale independently on a given day.
  const doc=await response.json();need(doc?.status==='READY'&&doc.themes?.length>=7,
  'DC_POWER_R3_PUBLIC_CORE_SEVEN_NOT_READY');
 return doc;
}

export async function runDcPowerPublishR3({dataRoot,allowCollect=false,allowPublish=false,
 acceptAnonymousLicenseRisk=false,db=null,runCycle=runDcPowerCycleR2,
 readPublic=dcPowerPublicSnapshot,buildRecord=buildDcPowerPublicR3,now=Date.now}={}){
 const report={report:'DATA_CENTER_POWER_R3_PC',themeId:'data-center-power',status:'STARTED',
  providerCalls:0,d1Writes:0,publicWrites:0,schedulerWrites:0};
 try{
  need(!allowPublish||acceptAnonymousLicenseRisk===true,
   'DC_POWER_R3_EXPLICIT_ANONYMOUS_RISK_ACKNOWLEDGEMENT_REQUIRED');
  const privateRun=await runCycle({dataRoot,allowCollect,now});
  report.providerCalls=privateRun.providerCalls??0;
  report.observationDate=privateRun.observationDate;
  report.score=privateRun.score;
  if(privateRun.status!=='PRIVATE_CANDIDATE_VERIFIED_NOT_PUBLISHED'){
   report.status=privateRun.status;report.reason=privateRun.reason;return report;
  }
  report.artifact=privateRun.artifact;
  if(!allowPublish){report.status='PRIVATE_CANDIDATE_VERIFIED_NOT_PUBLISHED';return report;}
  need(typeof dataRoot==='string'&&fs.existsSync(dataRoot),'DC_POWER_R3_DATA_ROOT_MISSING');
  const home=path.join(fs.realpathSync(dataRoot),'themes','data-center-power');
  const file=path.resolve(dataRoot,...privateRun.artifact.relativePath.split('/'));
  need(fs.realpathSync(file).startsWith(home+path.sep),'DC_POWER_R3_CANDIDATE_PATH_ESCAPE');
  const bytes=fs.readFileSync(file);
  need(sha(bytes)===privateRun.artifact.sha256,'DC_POWER_R3_CANDIDATE_HASH_MISMATCH');
  const candidate=JSON.parse(bytes);
  need(candidate.sourceVersion===privateRun.sourceVersion||
   !privateRun.sourceVersion,'DC_POWER_R3_SOURCE_VERSION_DRIFT');
  const manifestBytes=fs.readFileSync(path.join(home,'raw-manifest.json'));
  need(candidate.sourceVersion==='GMH_MANIFEST_SHA256_'+sha(manifestBytes),
   'DC_POWER_R3_SOURCE_MANIFEST_DRIFT');
  const manifest=JSON.parse(manifestBytes);
  const timestamps=manifest.files.map(f=>Date.parse(f.collectedAt));
  need(timestamps.length>=3&&timestamps.every(Number.isFinite),'DC_POWER_R3_MANIFEST_TIMESTAMP_INVALID');
  const sourceStoredAt=new Date(Math.max(...timestamps)).toISOString();
  const base=await readPublic({now:now()});
  const pub=buildRecord({candidate,candidateFileSha256:privateRun.artifact.sha256,
   sourceStoredAt,base,optIn:true,acceptAnonymousLicenseRisk,now:now()});
  need(db&&typeof db.read==='function'&&typeof db.writeVersioned==='function',
   'DC_POWER_R3_D1_ADAPTER_MISSING');
  const prior=await db.read(DC_POWER_PUBLIC_KEY);
  const write=await db.writeVersioned(DC_POWER_PUBLIC_KEY,pub,prior?.storedAt??null);
  if(write.status==='UNCHANGED'){report.status='UNCHANGED_NO_WRITE';return report;}
  report.d1Writes=write.changes;report.publicWrites=write.changes;
  report.status='D1_READBACK_VERIFIED_PUBLIC_READER_PENDING';
  const fresh=await readPublic({now:now()});
  const theme=fresh.themes?.find(t=>t.theme==='데이터센터·전력'&&
   (t.observationDate??fresh.observationDate)===pub.observationDate&&t.score===pub.score);
  if(theme?.history?.length===252){report.status='PUBLIC_API_VERIFIED';report.publicVerified=true;}
  return report;
 }catch(error){report.status='BLOCKED';report.reason=error?.code??'DC_POWER_R3_UNKNOWN_ERROR';return report;}
}

export async function startDcPowerR3({dataRoot,allowCollect=false,allowPublish=false,
 acceptAnonymousLicenseRisk=false,now=Date.now}={}){
 need(!allowPublish||acceptAnonymousLicenseRisk===true,
  'DC_POWER_R3_EXPLICIT_ANONYMOUS_RISK_ACKNOWLEDGEMENT_REQUIRED');
 const state=path.join(dataRoot,'themes','data-center-power','state');
 need(fs.existsSync(state),'DC_POWER_R3_INITIAL_COLLECTION_REQUIRED');
 const lock=path.join(state,'dc-power-r3.lock');
 let fd;
 try{fd=fs.openSync(lock,'wx');fs.writeSync(fd,JSON.stringify({pid:process.pid,startedAt:new Date(now()).toISOString()}));}
 catch(e){throw Object.assign(new Error(e?.code==='EEXIST'?'DC_POWER_R3_ALREADY_LOCKED':'DC_POWER_R3_LOCK_UNAVAILABLE'),
  {code:e?.code==='EEXIST'?'DC_POWER_R3_ALREADY_LOCKED':'DC_POWER_R3_LOCK_UNAVAILABLE'});}
 finally{if(fd!==undefined)fs.closeSync(fd);}
 try{
  // Existing approved PC credential chain, instantiated ONLY on opt-in publishing.
  const db=allowPublish?dcPowerVersionedD1({dataRoot,tokenFn:biotechCloudflareTokenR7}):null;
  return await runDcPowerPublishR3({dataRoot,allowCollect,allowPublish,acceptAnonymousLicenseRisk,db,now});
 }finally{fs.unlinkSync(lock);}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),flags=args.slice(1),allowed=['--collect','--publish','--accept-anonymous-license-risk'];
 const valid=args[0]==='--once'&&flags.every(a=>allowed.includes(a))&&
  flags.length===new Set(flags).size&&
  (!flags.includes('--accept-anonymous-license-risk')||flags.includes('--publish'));
 if(!valid){console.log('Usage: theme-data-center-power-publish-r3.mjs --once [--collect] [--publish --accept-anonymous-license-risk]');process.exitCode=2;}
 else{
  try{
   const publish=flags.includes('--publish');
   const report=await startDcPowerR3({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
    allowCollect:flags.includes('--collect'),allowPublish:publish,
    acceptAnonymousLicenseRisk:flags.includes('--accept-anonymous-license-risk')});
   console.log(JSON.stringify(report));
   if(report.status==='BLOCKED'||report.status==='COLLECTION_STOPPED'||report.status==='COLLECTION_RESUME_NEEDED'||
    (publish&&!['PUBLIC_API_VERIFIED','NO_NEW_CONFIRMED_SESSION','UNCHANGED_NO_WRITE'].includes(report.status)))process.exitCode=1;
  }catch(e){console.log(JSON.stringify({report:'DATA_CENTER_POWER_R3_PC',status:'BLOCKED',
   reason:e?.code??'DC_POWER_R3_UNKNOWN_ERROR'}));process.exitCode=1;}
 }
}
