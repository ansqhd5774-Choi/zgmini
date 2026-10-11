// A stored public summary. Visitor reads perform exactly one fixed-key query.
export const COLLECTION_HEALTH_KEY='collection-health';
export const COLLECTION_WINDOW_MS=8*24*60*60*1000;
export function collectionHealthSummary(entries,now=Date.now()){
 const items=entries.map(({id,storedAt,complete,checkedAt=storedAt,outcome=complete?'success':'unknown',lastSuccessAt=outcome==='success'?checkedAt:null})=>{
  const recent=Number.isFinite(checkedAt)&&checkedAt<=now&&now-checkedAt<COLLECTION_WINDOW_MS;
  const successful=Number.isFinite(lastSuccessAt)&&lastSuccessAt<=now&&now-lastSuccessAt<COLLECTION_WINDOW_MS;
  const state=successful?'normal':recent&&outcome==='failure'?'failed':'unknown';
  return {id,storedAt:Number.isFinite(storedAt)?storedAt:null,checkedAt:Number.isFinite(checkedAt)?checkedAt:null,lastSuccessAt:Number.isFinite(lastSuccessAt)?lastSuccessAt:null,outcome,state,normal:state==='normal'};
 });
 const normal=items.filter(x=>x.normal).length;
 const failed=items.filter(x=>x.state==='failed').length,unknown=items.length-normal-failed;
 return {version:3,scope:'collection-jobs',windowHours:192,checkedAt:new Date(now).toISOString(),normal,failed,unknown,recentFailures:items.filter(x=>x.outcome==='failure'&&Number.isFinite(x.checkedAt)&&x.checkedAt<=now&&now-x.checkedAt<COLLECTION_WINDOW_MS).length,total:items.length,status:failed?'partial':items.length&&normal===items.length?'healthy':'unknown',items};
}
export async function readCollectionHealth(db,now=Date.now()){
 const headers={'cache-control':'no-store','x-data-source':'STORED','x-content-type-options':'nosniff'};
 try{
  const row=await db.prepare("SELECT body FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'").bind(COLLECTION_HEALTH_KEY).first();
  const body=row?JSON.parse(row.body):null;
  if(![1,2,3].includes(body?.version)||body.scope!=='collection-jobs'||!Array.isArray(body.items)||body.items.length>100)throw Error('INVALID_SUMMARY');
  const at=Date.parse(body.checkedAt);
  if(!Number.isFinite(at)||at>now)throw Error('INVALID_TIMESTAMP');
  const summary=collectionHealthSummary(body.items.map(x=>({id:x.id,storedAt:x.storedAt,checkedAt:body.version>=2?x.checkedAt:x.storedAt,outcome:body.version>=2?x.outcome:x.normal===true?'success':'unknown',...(body.version===3?{lastSuccessAt:x.lastSuccessAt}:{})})),now);
  return Response.json({...summary,checkedAt:body.checkedAt,status:now-at>=COLLECTION_WINDOW_MS?'unknown':summary.status},{headers});
 }catch{return Response.json({status:'unknown',normal:null,total:null,checkedAt:null},{status:503,headers});}
}
