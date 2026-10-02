import {marketOperationalStore,readStoredMarketInputs} from './candidate-market-operational-store.mjs';
import {loadStoredInflationPitSeries} from './inflation-pit-reader.mjs';
import {INFLATION_PIT_SERIES} from './inflation-pit-backfill.mjs';
import {loadPc1Series} from './projection-inflation-inputs.mjs';
import {readEarningsE1R4StoredScore} from '../lib/market-score/sec-earnings-e1-r4-provider.mjs';
import {defaultLoadProgress,defaultLoadRows} from './korea-funds.mjs';
export async function loadProjectionSource(id,env,{now=Date.now()}={}){
 const nowIso=new Date(now).toISOString(),asOf=nowIso.slice(0,10);
 if(id==='koreaFearGreed'){
  const [progress,rawRows]=await Promise.all([defaultLoadProgress(env),defaultLoadRows(env)]);
  return {progress,rawRows,nowIso};
 }
 if(id==='inflation'){
  const [pit,pc1]=await Promise.all([loadStoredInflationPitSeries(env.DB_CORE,{asOf,seriesIds:[...INFLATION_PIT_SERIES]}),loadPc1Series(env.DB_CORE,{asOf})]);
  return {pit,pc1,asOf,nowIso};
 }
 const store=marketOperationalStore(env.DB_CORE),snapshot=await store.readScore();
 if(id==='earningsRecession'){
  const date=/^\d{4}-\d{2}-\d{2}$/.test(snapshot?.body?.asOfDate??'')?snapshot.body.asOfDate:asOf;
  const e1=await readEarningsE1R4StoredScore({asOf:date,db:env.DB_CORE});return {snapshot,e1,nowIso};
 }
 const inputs=await readStoredMarketInputs(store,now);return {inputs,snapshot,publicSnapshot:snapshot,nowIso};
}
