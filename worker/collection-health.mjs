// A stored public summary. Visitor reads perform exactly one fixed-key query.
export const COLLECTION_HEALTH_KEY='collection-health';
export const COLLECTION_WINDOW_MS=24*60*60*1000;
export function collectionHealthSummary(entries,now=Date.now()){
 const items=entries.map(({id,storedAt,complete})=>({id,storedAt:Number.isFinite(storedAt)?storedAt:null,normal:complete===true&&Number.isFinite(storedAt)&&storedAt<=now&&now-storedAt<COLLECTION_WINDOW_MS}));
 const normal=items.filter(x=>x.normal).length;
 return {version:1,scope:'collection-jobs',windowHours:24,checkedAt:new Date(now).toISOString(),normal,total:items.length,status:items.length?(normal===items.length?'healthy':'partial'):'unknown',items};
}
export async function readCollectionHealth(db,now=Date.now()){
 const headers={'cache-control':'no-store','x-data-source':'STORED','x-content-type-options':'nosniff'};
 try{
  const row=await db.prepare("SELECT body FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").bind(COLLECTION_HEALTH_KEY).first();
  const body=row?JSON.parse(row.body):null;
  if(body?.version!==1||body.scope!=='collection-jobs'||!Array.isArray(body.items)||body.items.length>100)throw Error('INVALID_SUMMARY');
  const at=Date.parse(body.checkedAt);
  if(!Number.isFinite(at)||at>now)throw Error('INVALID_TIMESTAMP');
  const summary=collectionHealthSummary(body.items.map(x=>({id:x.id,storedAt:x.storedAt,complete:x.normal===true})),now);
  return Response.json({...summary,checkedAt:body.checkedAt,status:now-at>=COLLECTION_WINDOW_MS?'stale':summary.status},{headers});
 }catch{return Response.json({status:'unknown',normal:null,total:null,checkedAt:null},{status:503,headers});}
}
