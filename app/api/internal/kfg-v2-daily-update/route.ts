import {env} from 'cloudflare:workers';
import {D1KoreaMarketHistoryStore} from '../../../../worker/korea-market-d1.mjs';
import {runKoreaMarketDaily} from '../../../../worker/korea-market-daily.mjs';

const SECRET='KFG_V2_DAILY_SCHEDULER_SECRET';
const json=(body:any,status=200)=>Response.json({temporary:'TEMPORARY_KFG_V2_DAILY_ONLY',...body},{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
const authorized=(request:Request,configured:any)=>{
  const provided=request.headers.get('authorization')??'';
  return typeof configured==='string'&&configured.length>0&&provided===`Bearer ${configured}`;
};

export async function POST(request:Request){
  if(request.method!=='POST') return json({status:'FAILED',reason:'METHOD_NOT_ALLOWED'},405);
  if(!authorized(request,(env as any)[SECRET])) return json({status:'FAILED',reason:'UNAUTHORIZED'},401);
  const store=new D1KoreaMarketHistoryStore((env as any).DB);
  try {
    const components=await store.getPersistedComponentHistory();
    if(!components.some((x:any)=>x.id==='LEV_BLEND20_60')||!components.some((x:any)=>x.id==='L3_PRESSURE_P252'))
      return json({status:'NO_OP',reason:'COMPONENT_HISTORY_NOT_READY',requestCount:0},200);
    const result=await runKoreaMarketDaily({store,key:(env as any).FSC_API_KEY,fetchImpl:globalThis.fetch,runId:crypto.randomUUID(),componentIndicators:components,requestCap:1});
    return json(result, result.status==='FAILED'?500:200);
  } catch { return json({status:'FAILED',reason:'DAILY_UPDATE_FAILED'},500); }
}
export function GET(){return json({status:'FAILED',reason:'METHOD_NOT_ALLOWED'},405);}
