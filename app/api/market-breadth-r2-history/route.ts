import {MARKETPARQUET_REMOVED_CODE} from '../../../lib/marketparquet-retirement.mjs';

// Retired provider: no old D1 payload read and no substitute feed.
export async function GET(request:Request){
  if(new URL(request.url).searchParams.get('market')!=='usa')
    return Response.json({reason:'MARKET_NOT_AVAILABLE'},{status:404});
  return Response.json({status:'UNAVAILABLE',reason:MARKETPARQUET_REMOVED_CODE},
    {status:503,headers:{'Cache-Control':'no-store'}});
}
