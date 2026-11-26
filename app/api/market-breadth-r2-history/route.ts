import {env} from 'cloudflare:workers';
import {readPaidUsR2Feed} from '../../../worker/us-breadth-paid-r2-public.mjs';

// Existing R2 URL, now restricted to the purchased, independently verified
// full-market R2 D1 key. No retired free history or current R1 fallback.
export async function GET(request:Request){
  if(new URL(request.url).searchParams.get('market')!=='usa')
    return Response.json({reason:'MARKET_NOT_AVAILABLE'},
      {status:404,headers:{'Cache-Control':'no-store'}});
  const native=env as unknown as {DB_CORE?:D1Database;DB?:D1Database};
  const result=await readPaidUsR2Feed(native.DB_CORE??native.DB,{mode:'history'});
  if(!result.ok)return Response.json({status:'UNAVAILABLE',reason:result.reason},
    {status:result.httpStatus,headers:{'Cache-Control':'no-store'}});
  return Response.json(result.body,{status:200,headers:result.headers});
}
