import {DIAGNOSTIC_FRED_SERIES} from '../lib/diagnostic-layer/input-registry.mjs';
import {fetchDiagnosticFredSeries} from '../lib/diagnostic-layer/official-macro-adapters.mjs';
const all=Object.keys(DIAGNOSTIC_FRED_SERIES);
export const FRED_PROBE_GROUPS=Object.freeze([
 ['PAYEMS'],['PAYEMS','UNRATE','GDPC1','INDPRO','CPIAUCSL','PCEPILFE'],['DGS2'],
 all.filter(id=>['MONTHLY','QUARTERLY'].includes(DIAGNOSTIC_FRED_SERIES[id].frequency)),
 all.filter(id=>DIAGNOSTIC_FRED_SERIES[id].frequency==='DAILY'),all,
]);
export async function inspectFredSubset(ids,env,{fetchImpl=globalThis.fetch,now=Date.now(),log=console.log}={}){
 let total=0,cursor=0;const results=[];
 await Promise.all(Array.from({length:Math.min(6,ids.length)},async()=>{
  while(cursor<ids.length){const id=ids[cursor++];let attempted=0;const http=[];
   log('R61_FRED_SERIES_BEGIN',JSON.stringify({id}));
   const wrapped=async(input,init)=>{if(total>=48)throw Error('REQUEST_CAP_EXCEEDED');total++;attempted++;const r=await Reflect.apply(fetchImpl,globalThis,[input,init]);http.push(r.status);return r;};
   const r=await fetchDiagnosticFredSeries(id,{key:env.FRED_API_KEY,asOf:new Date(now).toISOString().slice(0,10),fetchImpl:wrapped});
   const safe={id,status:r.status,http,requestCount:attempted,sourceCount:r.sourceCount,rowCount:r.rows?.length??0,durationMs:r.durationMs};
   results.push(safe);log('R61_FRED_SERIES_RESULT',JSON.stringify(safe));
  }
 }));
 return {status:results.every(r=>r.status==='READY_CURRENT_VINTAGE'&&r.rowCount>0)?'COMPLETE':'SOURCE_FAILED',requested:ids.length,requestCount:total,ready:results.filter(r=>r.status==='READY_CURRENT_VINTAGE'&&r.rowCount>0).length};
}
export async function runNextFredSubsetProbe(native,now){
 const db=native.DB_CORE;if(!db)return false;
 const auth=await db.prepare('SELECT status FROM market_collection_jobs_v1 WHERE job=?').bind('diagnostic:fred-auth-r61:20261005').first();
 if(auth?.status!=='READY')return false;
 for(let i=0;i<FRED_PROBE_GROUPS.length;i++){
  const job=`diagnostic:fred-subset-r61:20261005:${i}`;
  const prior=await db.prepare('SELECT status FROM market_collection_jobs_v1 WHERE job=?').bind(job).first();
  if(prior?.status==='COMPLETE')continue;
  if(prior)return false;
  const claim=await db.prepare('INSERT OR IGNORE INTO market_collection_jobs_v1(job,status,finished_at) VALUES(?,?,?)').bind(job,'PROBE_CLAIMED',now).run();
  if(claim.meta?.changes!==1)return false;
  console.log('R61_FRED_SUBSET_BEGIN',JSON.stringify({stage:i,series:FRED_PROBE_GROUPS[i]}));
  const result=await inspectFredSubset(FRED_PROBE_GROUPS[i],native,{now});
  console.log('R61_FRED_SUBSET_RESULT',JSON.stringify({stage:i,...result}));
  await db.prepare('UPDATE market_collection_jobs_v1 SET status=?,finished_at=? WHERE job=?').bind(result.status,now,job).run();
  return true;
 }
 return false;
}
