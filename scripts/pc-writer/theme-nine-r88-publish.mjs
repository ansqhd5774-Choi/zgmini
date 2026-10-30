// New-key-only provisional CAS writer; no confirmed key or scheduler mutation.
import {R88_KEY,R88_VERSION,validNineR88} from '../../worker/theme-nine-r88-provisional.mjs';
const SELECT="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
export async function publishNineR88({query,record,base,now=Date.now()}={}){
 need(base?.r32ProvisionalReaderVersion===R88_VERSION,'R88_PRODUCTION_READER_NOT_READY');
 need(validNineR88(record,base,{now,storedAt:now}),'R88_PUBLIC_RECORD_REJECTED');
 const before=(await query(SELECT,[R88_KEY])).results?.[0]??null;
 let old=null;
 if(before){
  old=JSON.parse(before.body);
  need(old.version===R88_VERSION&&old.confirmedObservationDate<=record.confirmedObservationDate&&
   old.observationDate<=record.observationDate,'R88_D1_REGRESSION_DENIED');
  if(old.sourceVersion===record.sourceVersion){
   need(JSON.stringify(old.themes)===JSON.stringify(record.themes),'R88_SAME_SOURCE_SCORE_DRIFT');
   return {status:'UNCHANGED_READBACK_VERIFIED',d1Writes:0};
  }
 }
 const previous=before?Number(before.stored_at):null;
 need(Number.isSafeInteger(now)&&(!before||(Number.isSafeInteger(previous)&&previous<now)),
  'R88_D1_CAS_TIMESTAMP_INVALID');
 const encoded=JSON.stringify(record);
 const result=before?await query(
  "UPDATE public_feed_snapshots_v1 SET body=?,stored_at=? WHERE kind='output' AND feed_key=? AND snapshot_key='current' AND stored_at=?",
  [encoded,now,R88_KEY,previous],{write:true}):await query(
  'INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES(?,?,?,?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO NOTHING',
  ['output',R88_KEY,'current',encoded,now],{write:true});
 need(result.meta?.changes===1,'R88_D1_CAS_NOT_APPLIED');
 const after=(await query(SELECT,[R88_KEY])).results?.[0];
 need(after?.body===encoded&&Number(after.stored_at)===now,'R88_D1_READBACK_MISMATCH');
 return {status:'WRITTEN_AND_READBACK_VERIFIED',d1Writes:1};
}
