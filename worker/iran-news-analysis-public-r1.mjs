import {IRAN_NEWS_ANALYSIS_PUBLIC_KEY_R1,validIranNewsAnalysisSnapshotR1,
 projectedIranNewsAnalysisStatusR1} from '../lib/iran-progress/news-analysis-public-r1.mjs';

const headers={'cache-control':'no-store','content-type':'application/json; charset=utf-8'};
const empty=(status,reason)=>({version:'IRAN_NEWS_ANALYSIS_R1',status,
 itemCount:0,pendingCount:0,items:[],pending:[],...(reason?{reason}:{})});

/** Only reads the independent public snapshot; no R41 writes or score access. */
/** @param {Request} request @param {{db?: any,now?: number}} options */
export async function storedIranNewsAnalysisR1Response(request,{db,now=Date.now()}={}){
 if(request.method!=='GET')return Response.json(empty('UNAVAILABLE','METHOD_NOT_ALLOWED'),
  {status:405,headers});
 if(!db)return Response.json(empty('UNAVAILABLE','ANALYSIS_DATABASE_UNAVAILABLE'),
  {status:503,headers});
 let row;
 try{row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
  .bind(IRAN_NEWS_ANALYSIS_PUBLIC_KEY_R1).first();}
 catch{return Response.json(empty('UNAVAILABLE','ANALYSIS_SNAPSHOT_READ_FAILED'),
  {status:503,headers});}
 if(!row)return Response.json(empty('PENDING','ANALYSIS_NOT_YET_PUBLISHED'),{headers});
 let snapshot;
 try{
  snapshot=JSON.parse(row.body);
  if(Number(row.stored_at)!==snapshot.publishedAt||
   !await validIranNewsAnalysisSnapshotR1(snapshot,{now}))throw Error('INVALID');
 }catch{return Response.json(empty('UNAVAILABLE','ANALYSIS_SNAPSHOT_INVALID'),
  {status:503,headers});}
 const status=projectedIranNewsAnalysisStatusR1(snapshot,{now});
 return Response.json({version:snapshot.version,status,publishedAt:snapshot.publishedAt,
  itemCount:snapshot.items.length,pendingCount:snapshot.pending.length,
  items:snapshot.items,pending:snapshot.pending},
 {headers:{...headers,'x-data-snapshot-at':new Date(snapshot.publishedAt).toISOString()}});
}
