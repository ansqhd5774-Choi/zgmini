// A failed output cannot veto unrelated, independently validated outputs.
import {createHash} from 'node:crypto';

const ER1_MONTHLY_KEY=/^market-calendar:earnings-er1-score-20[0-9]{2}-(0[1-9]|1[0-2])-public$/;
const SHA_BYTES=body=>createHash('sha256').update(body,'utf8').digest('hex');

export const isER1MonthlyFeedKey=key=>typeof key==='string'&&ER1_MONTHLY_KEY.test(key);

// Public-output-only metadata; D1 credentials and complete feed bodies stay local.
// MATCHED is possible only after an authenticated D1 SELECT of the exact key.
export function er1MonthlyD1Readback(local,remote,{now=Date.now}={}){
 if(!isER1MonthlyFeedKey(local?.feed_key))return null;
 const validTime=value=>Number.isSafeInteger(value)&&value>0;
 const localValid=typeof local.body==='string'&&validTime(local.stored_at);
 const remoteValid=typeof remote?.body==='string'&&validTime(remote.stored_at);
 const localSha=localValid?SHA_BYTES(local.body):null;
 const d1Sha=remoteValid?SHA_BYTES(remote.body):null;
 let status='NOT_FOUND';
 if(!localValid)status='INVALID_LOCAL_OUTPUT';
 else if(remote&&!remoteValid)status='INVALID_REMOTE_OUTPUT';
 else if(remoteValid){
  if(remote.stored_at>local.stored_at)status='REMOTE_NEWER_PRESERVED';
  else if(remote.stored_at<local.stored_at)status='REMOTE_OLDER';
  else status=localSha===d1Sha?'MATCHED':'BODY_MISMATCH';
 }
 return {key:local.feed_key,status,localStoredAt:localValid?local.stored_at:null,
  localBodySha256:localSha,d1StoredAt:remoteValid?remote.stored_at:null,
  d1BodySha256:d1Sha,observedAt:new Date(now()).toISOString()};
}
// Bound the existing ledger to the latest monthly keys, independent of SQLite row order.
export function retainRecentER1Readback(readbacks,evidence){
 if(!Array.isArray(readbacks)||!isER1MonthlyFeedKey(evidence?.key))return null;
 const previous=readbacks.findIndex(item=>item?.key===evidence.key);
 if(previous>=0)readbacks.splice(previous,1);
 readbacks.push(evidence);
 readbacks.sort((left,right)=>right.key.localeCompare(left.key));
 if(readbacks.length>24)readbacks.length=24;
 return evidence;
}
// The remote newer policy is preserved; only identical-timestamp divergence fails.
export function assertER1ReadbackConsistent(evidence){
 if(evidence?.status==='BODY_MISMATCH')throw Error('LOCAL_FEED_PUBLICATION_MISMATCH');
}
// Reuse yesterday's verified archive only when the authenticated current D1
// body and the exact local version are unchanged; never trust a stale ledger.
export function canReuseER1VintageEvidence(current,previous){
 return current?.status==='MATCHED'&&previous?.status==='VERIFIED'&&
  current?.key===previous?.key&&current?.localStoredAt===previous?.localStoredAt&&
  current?.localBodySha256===previous?.localBodySha256;
}
// Optional private Writer checkpoint metadata; never includes provider inputs,
// raw feed keys, credentials, or public score changes. Monotonic measurements
// identify the slow output stage without another Task or external request.
const boundedStageGroup=id=>{
 if(typeof id!=='string')return 'other-stages';
 if(id.startsWith('feed:'))return 'feed-publication';
 if(id.startsWith('projection-publication:'))return 'projection-publication';
 if(id.startsWith('projection:'))return 'projection-build';
 if(id.startsWith('w05-saved-sidecar:'))return 'w05-stored-sidecar';
 return /^[a-z][a-z0-9-]{0,64}$/.test(id)?id:'other-stages';
};
export function recordOutputStageTiming(report,id,elapsedMs,success){
 if(!report||typeof report!=='object'||!Number.isFinite(elapsedMs)||elapsedMs<0)return;
 const ms=Math.min(86_400_000,Math.floor(elapsedMs));
 const t=report.writerStageTiming??={
  scope:'ATTEMPT_OUTPUT_CALLBACKS_ONLY_NOT_FULL_CORE_OR_WRITER',
  samples:0,totalMeasuredMs:0,byStage:Object.create(null),slowest:[],
 };
 t.samples++;t.totalMeasuredMs+=ms;
 const group=boundedStageGroup(id);
 const name=Object.hasOwn(t.byStage,group)||Object.keys(t.byStage).length<32?
  group:'other-stages';
 const stage=t.byStage[name]??={samples:0,totalMs:0,failed:0};
 stage.samples++;stage.totalMs+=ms;if(success!==true)stage.failed++;
 // Keep only the 12 most expensive isolated operations; unknown IDs and raw
 // feed keys never enter the published diagnostic metadata.
 t.slowest.push({stage:name,elapsedMs:ms,success:success===true});
 t.slowest.sort((a,b)=>b.elapsedMs-a.elapsedMs);
 if(t.slowest.length>12)t.slowest.length=12;
}

export async function attemptOutput(report,id,run){
 const started=process.hrtime.bigint();let success=false;
 try{await run();success=true;return true;}
 catch(error){
  const reason=/^[A-Z][A-Z0-9_]{1,100}$/.test(error?.message??'')?error.message:'OUTPUT_STAGE_FAILED';
  (report.failures??=[]).push({id,reason});return false;
 }finally{
  // Measurement must never change the existing success/failure contract.
  try{recordOutputStageTiming(report,id,Number(process.hrtime.bigint()-started)/1_000_000,success);}catch{}
 }
}

