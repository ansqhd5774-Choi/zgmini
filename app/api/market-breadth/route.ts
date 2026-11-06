import {env} from 'cloudflare:workers';
import {latestCompletedSession} from '../../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {US_BREADTH_CURRENT_KEY,validUsBreadthRecord} from '../../../lib/market-breadth/us-public-r1.mjs';
import {US_BREADTH_PROVISIONAL_KEY,currentUsIexProvisional,usIexPublicPercentOnly} from '../../../lib/market-breadth/us-provisional-r1.mjs';
import {US_SIP_PREMARKET_KEY,usSipPremarketSlot,currentUsSipPremarket,
  usSipPublicPercentOnly} from '../../../lib/market-breadth/us-premarket-sip-r1.mjs';
import {readFullMarketPublicCurrent} from '../../../lib/market-breadth/us-marketparquet-confirmed-reader-r2.mjs';

// The candidate binds the public snapshot table as DB_CORE; legacy Worker
// deployments may still provide DB. Never route public snapshots to DB_HISTORY.
function coreSnapshotsDb():D1Database|undefined{
  const native=env as unknown as {DB_CORE?:D1Database;DB?:D1Database};
  return native.DB_CORE??native.DB;
}

// R2 full-market read alias is independent. The default confirmed endpoint
// retains the existing R1 503-stock history until R2 operational approval.
async function fullMarketConfirmedR2GET(){
  const db=coreSnapshotsDb();
  if(!db)return Response.json({reason:'FULL_MARKET_CORE_DATABASE_UNAVAILABLE'},
    {status:503,headers:{'Cache-Control':'no-store'}});
  const result=await readFullMarketPublicCurrent(async (key:string)=>
    db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
      .bind(key).first() as Promise<{body:string;stored_at:number}|null>);
  if('reason' in result)return Response.json({reason:result.reason},
    {status:503,headers:{'Cache-Control':'no-store'}});
  return Response.json(result.body,{headers:result.headers});
}

async function provisionalGET(){
  const db=coreSnapshotsDb();
  if(!db)return Response.json({reason:'PROVISIONAL_STORED_OUTPUT_UNAVAILABLE'},
    {status:503,headers:{'Cache-Control':'no-store'}});
  let row:{body:string;stored_at:number}|null=null;
  try{row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
    .bind(US_BREADTH_PROVISIONAL_KEY).first() as {body:string;stored_at:number}|null;}
  catch{return Response.json({reason:'PROVISIONAL_STORED_OUTPUT_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}});}
  let record:unknown;
  try{record=row?.body?JSON.parse(row.body):null;}
  catch{return Response.json({reason:'PROVISIONAL_INVALID_STORED_OUTPUT'},{status:503,headers:{'Cache-Control':'no-store'}});}
  if(currentUsIexProvisional(record)){
    const stamp=Number(row?.stored_at);
    if(!Number.isSafeInteger(stamp)||stamp<=0||stamp>Date.now()+60_000)
      return Response.json({reason:'PROVISIONAL_INVALID_PUBLICATION_TIME'},
        {status:503,headers:{'Cache-Control':'no-store'}});
    return Response.json(usIexPublicPercentOnly(record),{headers:{'Cache-Control':'no-store',
      'x-data-snapshot-at':new Date(stamp).toISOString()}});
  }
  // SIP is a separate, delayed historical feed. Never substitute it for live IEX.
  if(!usSipPremarketSlot())return Response.json({reason:'PROVISIONAL_NOT_CURRENT'},
    {status:503,headers:{'Cache-Control':'no-store'}});
  let sipRow:{body:string;stored_at:number}|null=null;
  try{sipRow=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
    .bind(US_SIP_PREMARKET_KEY).first() as {body:string;stored_at:number}|null;}
  catch{return Response.json({reason:'SIP_PREMARKET_STORED_OUTPUT_UNAVAILABLE'},
    {status:503,headers:{'Cache-Control':'no-store'}});}
  let sip:unknown;
  try{sip=sipRow?.body?JSON.parse(sipRow.body):null;}catch{sip=null;}
  if(!currentUsSipPremarket(sip))return Response.json({reason:'SIP_PREMARKET_NOT_CURRENT'},
    {status:503,headers:{'Cache-Control':'no-store'}});
  const sipStamp=Number(sipRow?.stored_at);
  if(!Number.isSafeInteger(sipStamp)||sipStamp<=0||sipStamp>Date.now()+60_000)
    return Response.json({reason:'SIP_PREMARKET_INVALID_PUBLICATION_TIME'},
      {status:503,headers:{'Cache-Control':'no-store'}});
  return Response.json(usSipPublicPercentOnly(sip),{headers:{'Cache-Control':'no-store',
    'x-data-snapshot-at':new Date(sipStamp).toISOString()}});
}

// Visitor read-only: no calculation, provider request, remote write, or Korea integration.
export async function GET(request:Request){
  const url=new URL(request.url);
  if(url.searchParams.get('market')!=='usa')return Response.json({reason:'MARKET_NOT_AVAILABLE'},{status:404});
  const phase=url.searchParams.get('phase');
  if(phase==='provisional')return provisionalGET();
  if(phase==='confirmed-r2')return fullMarketConfirmedR2GET();
  if(phase!==null&&phase!=='confirmed')return Response.json({reason:'PHASE_NOT_AVAILABLE'},{status:404});
  const db=coreSnapshotsDb();
  if(!db)return Response.json({reason:'STORED_OUTPUT_UNAVAILABLE'},
    {status:503,headers:{'Cache-Control':'no-store'}});
  let row:{body:string;stored_at:number}|null=null;
  try{row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(US_BREADTH_CURRENT_KEY).first() as {body:string;stored_at:number}|null;}
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
