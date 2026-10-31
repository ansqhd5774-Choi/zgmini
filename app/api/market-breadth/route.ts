import {env} from 'cloudflare:workers';
import {latestCompletedSession} from '../../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {US_BREADTH_CURRENT_KEY,validUsBreadthRecord} from '../../../lib/market-breadth/us-public-r1.mjs';

// Visitor read-only: no calculation, provider request, remote write, or Korea integration.
export async function GET(request:Request){
  const url=new URL(request.url);
  if(url.searchParams.get('market')!=='usa')return Response.json({reason:'MARKET_NOT_AVAILABLE'},{status:404});
  let row:{body:string;stored_at:number}|null=null;
  try{row=await env.DB.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(US_BREADTH_CURRENT_KEY).first() as typeof row;}
  catch{return Response.json({reason:'STORED_OUTPUT_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}
  let record:unknown;
  try{record=row?.body?JSON.parse(row.body):null;}catch{return Response.json({reason:'INVALID_STORED_OUTPUT'},{status:503,headers:{'Cache-Control':'no-store'}});}
  if(!validUsBreadthRecord(record))return Response.json({reason:'NO_VERIFIED_COUNTS'},{status:503,headers:{'Cache-Control':'no-store'}});
  if((record as {observationDate:string}).observationDate!==latestCompletedSession(new Date()))
    return Response.json({reason:'STALE_OBSERVATION'},{status:503,headers:{'Cache-Control':'no-store'}});
  const stamp=Number(row?.stored_at);
  if(!Number.isSafeInteger(stamp)||stamp<=0||stamp>Date.now()+60_000)
    return Response.json({reason:'INVALID_PUBLICATION_TIME'},{status:503,headers:{'Cache-Control':'no-store'}});
  return Response.json(record,{headers:{'Cache-Control':'no-store','x-data-snapshot-at':new Date(stamp).toISOString()}});
}
