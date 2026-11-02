import {env} from 'cloudflare:workers';
import {readFullMarketPercentHistory}
  from '../../../lib/market-breadth/us-marketparquet-confirmed-history-percent-r32.mjs';

// Separate read-only R2 year-series endpoint. The legacy confirmed R1 history
// and 15-minute IEX provisional endpoint remain unchanged.
export async function GET(request:Request){
  if(new URL(request.url).searchParams.get('market')!=='usa')
    return Response.json({reason:'MARKET_NOT_AVAILABLE'},{status:404});
  const result=await readFullMarketPercentHistory(async (key:string)=>
    env.DB.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
      .bind(key).first() as Promise<{body:string;stored_at:number}|null>);
  if('reason' in result)return Response.json({reason:result.reason},
    {status:result.httpStatus,headers:{'Cache-Control':'no-store'}});
  return Response.json(result.body,{headers:result.headers});
}
