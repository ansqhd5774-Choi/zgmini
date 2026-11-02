import {env} from 'cloudflare:workers';
import {readFullMarketPercentHistory}
  from '../../../lib/market-breadth/us-marketparquet-confirmed-history-percent-r32.mjs';

// Separate read-only R2 year-series endpoint. The legacy confirmed R1 history
// and 15-minute IEX provisional endpoint remain unchanged.
export async function GET(request:Request){
  if(new URL(request.url).searchParams.get('market')!=='usa')
    return Response.json({reason:'MARKET_NOT_AVAILABLE'},{status:404});
  // Candidate runtime binds the public snapshot table as DB_CORE; legacy
  // Workers still expose DB. Never use DB_HISTORY (it has no public table).
  const native=env as unknown as {DB_CORE?:D1Database;DB?:D1Database};
  const db=native.DB_CORE??native.DB;
  if(!db)return Response.json({reason:'FULL_MARKET_PERCENT_HISTORY_CORE_DATABASE_UNAVAILABLE'},
    {status:503,headers:{'Cache-Control':'no-store'}});
  const result=await readFullMarketPercentHistory(async (key:string)=>
    db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
      .bind(key).first() as Promise<{body:string;stored_at:number}|null>);
  if('reason' in result)return Response.json({reason:result.reason},
    {status:result.httpStatus,headers:{'Cache-Control':'no-store'}});
  return Response.json(result.body,{headers:result.headers});
}
