import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {runMarketOperationalRefresh} from '../../../../worker/market-operational-refresh.mjs';
export async function POST(request:Request){
 const user=await getChatGPTUser().catch(()=>null);
 const operator=String((env as Record<string,unknown>).KFG_V2_CANARY_OPERATOR_EMAIL??'').trim().toLowerCase();
 if(!operator||!user?.userId||user.email?.trim().toLowerCase()!==operator)return Response.json({status:'UNAUTHORIZED'},{status:403});
 let body:any={};try{body=await request.json()}catch{}
 const result=await runMarketOperationalRefresh({env,job:body.job});
 return Response.json(result,{headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
}
