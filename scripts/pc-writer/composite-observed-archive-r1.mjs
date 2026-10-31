import {COMPOSITE_OBSERVED_PREFIX,COMPOSITE_OBSERVED_VERSION,compositeSampleFromVerified,mergeCompositeObservedDay} from '../../lib/composite-observed-history-r1.mjs';

// PC-only: use the existing core.sqlite table and verified market score,
// never query a provider or change the collection/compute interval.
export async function appendCompositeObservedFromCurrent(db,expectedAt){
 const row=await db.prepare("SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key='current'").first();
 if(!row||row.stored_at!==expectedAt)throw Error('COMPOSITE_CURRENT_CHECKPOINT_MISMATCH');
 const sample=compositeSampleFromVerified(JSON.parse(row.body),expectedAt);
 const date=sample.calculatedAt.slice(0,10),key=COMPOSITE_OBSERVED_PREFIX+date;
 const prior=await db.prepare("SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?").bind(key).first();
 const merged=mergeCompositeObservedDay(prior?JSON.parse(prior.body):null,date,sample);
 if(!merged.changed)return {status:'UNCHANGED',date,points:prior?JSON.parse(prior.body).points.length:0};
 const encoded=JSON.stringify(merged.body);
 if(Buffer.byteLength(encoded)>1800000)throw Error('COMPOSITE_DAY_STORAGE_LIMIT');
 await db.prepare("INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>market_public_snapshots_v1.stored_at")
  .bind(key,encoded,expectedAt).run();
 const checked=await db.prepare("SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?").bind(key).first();
 if(checked?.body!==encoded||checked.stored_at!==expectedAt)throw Error('COMPOSITE_LOCAL_ARCHIVE_READBACK_FAILED');
 return {status:'LOCAL_STORED',date,points:merged.body.points.length};
}

// Public D1 receives derived score and calculation time only (not provider
// inputs, scoring formulas, original rows or credentials).
export async function publishCompositeObservedArchive(local,remote,coreDb,{maxDaysPerRun=24}={}){
 const rows=(await local.prepare("SELECT snapshot_key,body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key LIKE 'composite-observed:%' ORDER BY snapshot_key ASC").all()).results;
 if(!rows.length)return {status:'PENDING',storedDays:0,publishedDays:0,deferredDays:0};
 const remoteCurrent=(await remote.query(coreDb,"SELECT stored_at FROM market_public_snapshots_v1 WHERE snapshot_key='current'")).results?.[0];
 if(!Number.isSafeInteger(remoteCurrent?.stored_at))return {status:'PENDING_VERIFIED_MARKET',storedDays:rows.length,publishedDays:0,deferredDays:rows.length};
 const snapshots=(await remote.query(coreDb,"SELECT snapshot_key,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key LIKE 'composite-observed:%'")).results??[];
 const saved=new Map(snapshots.map(row=>[row.snapshot_key,row.stored_at]));
 const pending=rows.filter(row=>row.stored_at<=remoteCurrent.stored_at&&(!saved.has(row.snapshot_key)||saved.get(row.snapshot_key)<row.stored_at));
 let published=0;
 for(const row of pending.slice(0,maxDaysPerRun)){
  const parsed=JSON.parse(row.body);
  if(parsed?.version!==COMPOSITE_OBSERVED_VERSION||COMPOSITE_OBSERVED_PREFIX+parsed.date!==row.snapshot_key||!Array.isArray(parsed.points))
   throw Error('COMPOSITE_ARCHIVE_LOCAL_INVALID');
  let writeError;
  try{await remote.request(coreDb,[{sql:"INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>market_public_snapshots_v1.stored_at",params:[row.snapshot_key,row.body,row.stored_at]}]);}
  catch(e){writeError=e}
  const current=(await remote.query(coreDb,"SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?",[row.snapshot_key])).results?.[0];
  if(current?.body!==row.body||current.stored_at!==row.stored_at)throw writeError??Error('COMPOSITE_ARCHIVE_PUBLISH_READBACK_FAILED');
  published++;
 }
 return {status:pending.length>published?'BACKLOG':'VERIFIED',storedDays:rows.length,publishedDays:published,deferredDays:pending.length-published};
}