import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {refreshKoreaRev7} from '../../../../worker/korea-rev7-refresh.mjs';

export async function POST(request:Request){
 const user=await getChatGPTUser().catch(()=>null);
 const operator=String((env as Record<string,unknown>).KFG_V2_CANARY_OPERATOR_EMAIL??'').trim().toLowerCase();
 if(!operator||!user?.userId||user.email?.trim().toLowerCase()!==operator)
  return Response.json({status:'UNAUTHORIZED'},{status:403});
 const result=await refreshKoreaRev7({env});
 return Response.json(result,{headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
}
