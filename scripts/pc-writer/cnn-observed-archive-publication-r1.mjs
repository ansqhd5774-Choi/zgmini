import {groupVerifiedCnnObservations, CNN_OBSERVED_ARCHIVE_KEY, CNN_OBSERVED_ARCHIVE_VERSION} from '../../lib/cnn-observed-archive-r1.mjs';

// Public observed scores only. No CNN raw inputs or local source histories are
// transferred to D1. Existing public_feed_snapshots_v1 schema is reused.
export async function publishCnnObservedArchive(local,remote,db,{maxDaysPerRun=24}={}){
 const rows=(await local.prepare("SELECT snapshot_key,body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? ORDER BY snapshot_key ASC")
  .bind(CNN_OBSERVED_ARCHIVE_KEY).all()).results;
 if(!rows.length)return {status:'PENDING',storedDays:0,publishedDays:0,deferredDays:0};
 const old=(await remote.query(db,"SELECT snapshot_key,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=?",[CNN_OBSERVED_ARCHIVE_KEY])).results ?? [];
 const remoteDates=new Map(old.map(row=>[row.snapshot_key,row.stored_at]));
 const pending=rows.filter(row=>!(remoteDates.has(row.snapshot_key) && remoteDates.get(row.snapshot_key)>=row.stored_at));
 let published=0;
 for(const row of pending.slice(0,maxDaysPerRun)){
  const body=JSON.parse(row.body);
  if(body?.version!==CNN_OBSERVED_ARCHIVE_VERSION||body.date!==row.snapshot_key||!Array.isArray(body.observations))
   throw Error('CNN_ARCHIVE_LOCAL_INVALID');
  const params=[CNN_OBSERVED_ARCHIVE_KEY,row.snapshot_key,row.body,row.stored_at];
  let writeError;
  try{
   await remote.request(db,[{sql:"INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,?,?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",params}]);
  }catch(error){writeError=error;}
  // A failed/unknown write outcome must be resolved by readback, never retried blindly.
  const actual=(await remote.query(db,"SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key=?",
    [CNN_OBSERVED_ARCHIVE_KEY,row.snapshot_key])).results?.[0];
  if(actual?.body!==row.body||actual?.stored_at!==row.stored_at)
   throw writeError??Error('CNN_ARCHIVE_READBACK_MISMATCH');
  published++;
 }
 return {status:pending.length>published?'BACKLOG':'VERIFIED',storedDays:rows.length,publishedDays:published,deferredDays:pending.length-published};
}

// Shared CNN current publication: exact local public output, monotonic source
// observation and timestamp, CAS on the remote preimage, mandatory readback.
export async function publishCnnCurrent(local,remote,db){
 const key='fear-greed';
 const row=await local.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").bind(key).first();
 if(!row)return {status:'PENDING'};
 const body=JSON.parse(row.body);
 if(!Number.isSafeInteger(row.stored_at)||row.stored_at<=0||!Array.isArray(body.history)||!body.history.length)throw Error('CNN_CURRENT_LOCAL_INVALID');
 groupVerifiedCnnObservations(body,row.stored_at);
 const read=async()=>(await remote.query(db,"SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'",[key])).results?.[0];
 const previous=await read();
 const exact=actual=>actual?.stored_at===row.stored_at&&actual.body===row.body;
 const newer=actual=>actual?.stored_at>row.stored_at&&Date.parse(JSON.parse(actual.body).observedAt)>=Date.parse(body.observedAt);
 if(exact(previous))return {status:'VERIFIED',storedAt:row.stored_at,writes:0};
 if(newer(previous))return {status:'REMOTE_NEWER_PRESERVED',storedAt:previous.stored_at,writes:0};
 if(previous&&(previous.stored_at>=row.stored_at||Date.parse(JSON.parse(previous.body).observedAt)>Date.parse(body.observedAt)))throw Error('CNN_CURRENT_PREIMAGE_CONFLICT');
 const sql="INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at AND public_feed_snapshots_v1.stored_at=? AND public_feed_snapshots_v1.body=?";
 let failure;
 try{await remote.request(db,[{sql,params:[key,row.body,row.stored_at,previous?.stored_at??-1,previous?.body??'']}]);}catch(error){failure=error;}
 const actual=await read();
 if(exact(actual))return {status:'VERIFIED',storedAt:row.stored_at,writes:1};
 if(newer(actual))return {status:'REMOTE_NEWER_PRESERVED',storedAt:actual.stored_at,writes:null};
 throw failure??Error('CNN_CURRENT_REMOTE_READBACK_MISMATCH');
}

// Saved-only minute publication candidate. The same archive publisher is
// used by Core; no provider calls, private HTTP checks, or other feed writes.
export async function publishCnnMinute(local,remote,db){
 const archive=await publishCnnObservedArchive(local,remote,db);
 const current=await publishCnnCurrent(local,remote,db);
 return {status:archive.status==='VERIFIED'&&current.status==='VERIFIED'?'VERIFIED':'PARTIAL',archive,current,providerCalls:0};
}
