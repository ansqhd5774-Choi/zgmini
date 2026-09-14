import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../../chatgpt-auth';
import { publicSnapshot } from '../../../../worker/korea-funds.mjs';
import { D1KoreaMarketHistoryStore } from '../../../../worker/korea-market-d1.mjs';

const OPERATOR='KFG_V2_CANARY_OPERATOR_EMAIL';
const safe=(body:any,status=200)=>Response.json({temporary:'TEMPORARY_KFG_V2_SNAPSHOT_BACKFILL_ONLY',...body},{status,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}});
const norm=(v:any)=>typeof v==='string'?v.trim().toLowerCase():null;
export async function POST(request:Request){
  if(request.method!=='POST') return safe({error:'METHOD_NOT_ALLOWED'},405);
  const user=await getChatGPTUser(request);
  if(!user?.userId||!norm(user.email)) return safe({error:'AUTH_REQUIRED'},401);
  if(!norm((env as any)[OPERATOR])||norm(user.email)!==norm((env as any)[OPERATOR])) return safe({error:'OPERATOR_REQUIRED'},403);
  let years=1; try { const p=await request.json(); if(p?.years!==undefined) years=p.years; } catch {}
  if(years!==1) return safe({error:'INVALID_RANGE'},400);
  const store=new D1KoreaMarketHistoryStore((env as any).DB);
  const runId=crypto.randomUUID();
  if(!(await store.acquireLease(runId))) return safe({error:'ALREADY_RUNNING'},409);
  try { const existing=await store.getPersistedComponentHistory(); const components=existing.length?existing:(await publicSnapshot(env as any))?.indicators??[]; const result=await store.backfillResearchSnapshots(years,components); return safe({status:'SUCCESS',componentHistoryPersisted:existing.length>0,...result},200); }
  catch { return safe({error:'SNAPSHOT_BACKFILL_FAILED'},500); }
  finally { await store.releaseLease(); }
}
export function GET(){ return safe({error:'METHOD_NOT_ALLOWED'},405); }
