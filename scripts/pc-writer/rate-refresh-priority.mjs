// Reserve at most one normal core slot per hour for rates. No extra scheduler,
// provider, retry, formula or freshness TTL is introduced.
export const RATE_REFRESH_ATTEMPT_INTERVAL_MS=60*60*1000;
export function shouldPrioritizeRates(state,now){
 if(!Number.isFinite(now)||now<0)return false;
 if(Number(state?.lease_until)>now)return false;
 const last=Number(state?.finished_at??0);
 if(!Number.isFinite(last)||last<0||last>now)return false;
 return last===0||now-last>=RATE_REFRESH_ATTEMPT_INTERVAL_MS;
}
export async function overdueRateJob(core,now){
 const table=await core.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='market_collection_jobs_v1'").first();
 if(!table)return 'rates';
 const state=await core.prepare("SELECT finished_at,lease_until,status FROM market_collection_jobs_v1 WHERE job='rates'").first();
 return shouldPrioritizeRates(state,now)?'rates':null;
}
