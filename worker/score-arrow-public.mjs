import {SCORE_ARROW_VERSION} from '../lib/market-score/score-arrow.mjs';
export async function storedScoreArrowResponse(request,{db}){
 const headers={'cache-control':'no-store','x-robots-tag':'noindex','x-content-type-options':'nosniff'};
 if(request.method!=='GET')return Response.json({error:'METHOD_NOT_ALLOWED'},{status:405,headers:{...headers,allow:'GET'}});
 try{
  const rows=(await db.prepare("SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key IN ('public:score-arrow:core:v1','public:score-arrow:iran:v1')").all()).results;
  const entries={};let publishedAt=0;
  for(const row of rows){const b=JSON.parse(row.body);if(b.version!==SCORE_ARROW_VERSION)continue;Object.assign(entries,b.entries);publishedAt=Math.max(publishedAt,b.publishedAt);}
  return Response.json({version:SCORE_ARROW_VERSION,publishedAt,entries},{headers});
 }catch{return Response.json({version:SCORE_ARROW_VERSION,publishedAt:0,entries:{}},{status:503,headers});}
}
