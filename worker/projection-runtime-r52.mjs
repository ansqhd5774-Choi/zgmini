import {PUBLIC_PROJECTION_KEYS,publicProjectionStore} from './market-public-projection-store.mjs';
export const PROJECTION_CADENCE_MS=Object.freeze({inflation:45*86400000,recession:45*86400000,liquidityCrisis:8*86400000,creditRisk:2*86400000,earningsRecession:100*86400000,assetBubble:100*86400000,debtRisk:100*86400000,supplyShock:8*86400000,koreaFearGreed:8*86400000});
export const PROJECTION_ROUTES=Object.freeze(Object.fromEntries(Object.keys(PUBLIC_PROJECTION_KEYS).map(id=>[id==='koreaFearGreed'?'/api/indicators/korea-funds':'/api/'+PUBLIC_PROJECTION_KEYS[id].split(':')[1]+'-detail',id])));
export async function readProjectionResponse(request,readOnlyCore,id,{now=Date.now()}={}){
 if(!['GET','HEAD'].includes(request.method))return Response.json({reason:'METHOD_NOT_ALLOWED'},{status:405});
 const key=PUBLIC_PROJECTION_KEYS[id];if(!key)return Response.json({reason:'INVALID_PROJECTION_KEY'},{status:400});
 const url=new URL(request.url);
 if(id==='koreaFearGreed'&&url.search)return Response.json({error:'QUERY_NOT_ALLOWED'},{status:400});
 const requestedAsOf=url.searchParams.get('asOf');
 let row,readMeta;try{row=await publicProjectionStore(readOnlyCore,{onRead:meta=>readMeta=meta}).read(key);}catch(error){const message=String(error?.message??'')+' '+String(error?.cause?.message??'');const category=/quota|daily.*limit|row.*limit/i.test(message)?'D1_QUOTA':'READ_UNAVAILABLE';return Response.json({reason:'PROJECTION_READ_UNAVAILABLE'},{status:503,headers:{'cache-control':'no-store','x-projection-read-error':category}});}
 const projection=row?.body?.projection,body=row?.body?.payload;
 const stale=(Number.isFinite(projection?.validUntil)&&now>=projection.validUntil)||!projection||!body||!Number.isFinite(projection.sourceStoredAt)||projection.expectedSourceStoredAt>projection.sourceStoredAt||projection.expectedSourceVersion!==projection.sourceVersion||now<projection.sourceStoredAt||now-projection.sourceStoredAt>=PROJECTION_CADENCE_MS[id]||row.storedAt<projection.sourceStoredAt||projection.status!=='READY';
 if(stale)return Response.json({status:'unavailable',reason:row?'STORED_PROJECTION_STALE':'STORED_PROJECTION_PENDING'},{status:503,headers:{'cache-control':'no-store','x-public-projection':'STORED'}});
 if(id==='inflation'&&requestedAsOf&&/^\d{4}-\d{2}-\d{2}$/.test(requestedAsOf)&&requestedAsOf!==projection.asOf)return Response.json({status:'unavailable',reason:'PROJECTION_ASOF_UNAVAILABLE'},{status:503,headers:{'cache-control':'no-store'}});
 return Response.json(body,{headers:{'cache-control':'no-store','x-public-projection':'STORED',...(Number.isFinite(readMeta?.rows_read)?{'x-projection-rows-read':String(readMeta.rows_read)}:{}),'x-projection-source-at':new Date(projection.sourceStoredAt).toISOString()}});
}
export function projectionWriter(core){
 const store=publicProjectionStore(core);
 return Object.freeze({async write(id,body,storedAt,job){
  const key=PUBLIC_PROJECTION_KEYS[id];if(!key)throw Error('INVALID_PROJECTION_KEY');
  const current=await store.read(key);const p=current?.body?.projection;
  if(p?.expectedSourceStoredAt>job.sourceStoredAt||p?.sourceStoredAt>job.sourceStoredAt)throw Error('SUPERSEDED_PROJECTION_JOB');
  if(p?.sourceStoredAt===job.sourceStoredAt&&p?.sourceVersion===job.sourceVersion&&p?.status==='READY')return {key,idempotent:true};
  const envelope={payload:body,projection:{status:'READY',builtAt:storedAt,sourceStoredAt:job.sourceStoredAt,sourceVersion:job.sourceVersion,expectedSourceStoredAt:job.sourceStoredAt,expectedSourceVersion:job.sourceVersion,asOf:new Date(storedAt).toISOString().slice(0,10),...(id==='koreaFearGreed'&&body?.composite?.status==='READY'&&/^\d{8}$/.test(body?.composite?.observationDate??'')?{validUntil:Date.parse(body.composite.observationDate.slice(0,4)+'-'+body.composite.observationDate.slice(4,6)+'-'+body.composite.observationDate.slice(6,8)+'T00:00:00Z')+7*86400000+1}:{})}};
  const result=await core.prepare("INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE COALESCE(json_extract(market_public_snapshots_v1.body,'$.projection.expectedSourceStoredAt'),-1)<=? AND COALESCE(json_extract(market_public_snapshots_v1.body,'$.projection.sourceStoredAt'),-1)<=? AND COALESCE(json_extract(market_public_snapshots_v1.body,'$.projection.expectedSourceVersion'),?)=?").bind(key,JSON.stringify(envelope),storedAt,job.sourceStoredAt,job.sourceStoredAt,job.sourceVersion,job.sourceVersion).run();
  if(result?.meta?.changes===0)throw Error('SUPERSEDED_PROJECTION_JOB');
  return {key,storedAt,bytes:new TextEncoder().encode(JSON.stringify(envelope)).length};
 },async invalidate(id,job){const key=PUBLIC_PROJECTION_KEYS[id];if(!key)throw Error('INVALID_PROJECTION_KEY');const row=await store.read(key);if(!row)return;const p=row.body?.projection;if(p?.expectedSourceStoredAt>job.sourceStoredAt)return;return store.write(key,{...row.body,projection:{...p,status:'STALE',expectedSourceStoredAt:job.sourceStoredAt,expectedSourceVersion:job.sourceVersion}},row.storedAt);}});
}
