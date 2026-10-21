import {STAGFLATION_LATEST_KEY,validLatestStagflation} from '../lib/diagnostic-layer/stagflation-latest-record.mjs';
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';
import {STAGFLATION_PUBLIC_KEY,validateStagflationRecord} from './stagflation-public.mjs';
export async function readLatestStagflation(db,{now=Date.now()}={}){
 const headers={'cache-control':'no-store','x-robots-tag':'noindex','x-content-type-options':'nosniff'};
 const unavailable=reason=>Response.json({status:'UNAVAILABLE',score:null,reason,history:[]},{status:503,headers});
 let row,r,confirmed;
 try{
  row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(STAGFLATION_LATEST_KEY).first();
  if(!row)return unavailable('LATEST_PUBLISHED_INPUTS_PENDING');r=JSON.parse(row.body);
  const c=await db.prepare('SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(STAGFLATION_PUBLIC_KEY).first();
  if(c)confirmed=JSON.parse(c.body);
 }catch{return unavailable('STORED_READ_UNAVAILABLE');}
 if(!validLatestStagflation(r))return unavailable('STORED_DATA_NOT_APPROVED');
 const storedAt=Number(row.stored_at),sourceAt=Date.parse(r.sourceStoredAt),calculatedAt=Date.parse(r.calculatedAt);
 if(!Number.isSafeInteger(storedAt)||storedAt>now||calculatedAt>now||sourceAt>now||now-storedAt>=PUBLIC_DISPLAY_MAX_AGE_MS||now-sourceAt>=PUBLIC_DISPLAY_MAX_AGE_MS)return unavailable('LATEST_PUBLISHED_INPUTS_STALE');
 if(confirmed&&validateStagflationRecord(confirmed)&&confirmed.observationMonth>=r.newestInputMonth)return unavailable('PROVISIONAL_SUPERSEDED');
 return Response.json({status:'READY',phase:r.phase,score:r.score,methodologyVersion:r.methodologyVersion,evaluationMode:r.evaluationMode,historyPolicy:r.historyPolicy,
  confirmedObservationMonth:r.confirmedObservationMonth,oldestInputMonth:r.oldestInputMonth,newestInputMonth:r.newestInputMonth,inputMonths:r.inputMonths,inputCount:r.inputCount,axes:r.axes,
  calculatedAt:r.calculatedAt,sourceStoredAt:r.sourceStoredAt,observedAt:r.history.at(-1).observedAt,history:r.history.map(p=>({observedAt:p.observedAt,score:p.score}))},
  {headers:{...headers,'cache-control':'public, max-age=60, must-revalidate','x-data-snapshot-at':new Date(storedAt).toISOString()}});
}
