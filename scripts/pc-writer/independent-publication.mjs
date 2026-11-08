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
export async function attemptOutput(report,id,run){
 try{await run();return true;}
 catch(error){
  const reason=/^[A-Z][A-Z0-9_]{1,100}$/.test(error?.message??'')?error.message:'OUTPUT_STAGE_FAILED';
  (report.failures??=[]).push({id,reason});return false;
 }
}

