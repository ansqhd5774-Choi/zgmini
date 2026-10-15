import {marketOperationalStore,readStoredMarketInputsSelected} from './candidate-market-operational-store.mjs';
import {loadStoredInflationPitSeries} from './inflation-pit-reader.mjs';
import {INFLATION_PIT_SERIES} from './inflation-pit-backfill.mjs';
import {loadPc1Series} from './projection-inflation-inputs.mjs';
import {readEarningsE1R4StoredScore} from '../lib/market-score/sec-earnings-e1-r4-provider.mjs';
import {defaultLoadProgress,defaultLoadRows} from './korea-funds.mjs';

export const PROJECTION_INPUT_BATCHES=Object.freeze({
 recession:Object.freeze(['macro']),
 liquidityCrisis:Object.freeze(['macro','credit']),
 creditRisk:Object.freeze(['macro','credit']),
 earningsRecession:Object.freeze([]),
 assetBubble:Object.freeze(['macro']),
 debtRisk:Object.freeze(['macro','credit','bisDsr','bisTc']),
 supplyShock:Object.freeze(['macro','supply']),
});

/** @param {import('./runtime-contracts').ProjectionId} id @param {ReturnType<typeof import('./projection-checkpoint-r52.mjs').observedSourceEnv>['env']} env @param {{now?:number,onPhase?:(phase:import('./runtime-contracts').ProjectionPhase)=>void,onMetadata?:(metadata:import('./runtime-contracts').ProjectionMetadata)=>void}} [options] */
export async function loadProjectionSource(id,env,{now=Date.now(),onPhase,onMetadata}={}){
 const mark=(phase,start)=>{const elapsed=performance.now()-start;if(typeof onPhase==='function')onPhase({phase,elapsedMs:elapsed,id});};
 const nowIso=new Date(now).toISOString(),asOf=nowIso.slice(0,10);
 if(id==='koreaFearGreed'){
  const started=performance.now();
  const [progress,rawRows]=await Promise.all([defaultLoadProgress(env),defaultLoadRows(env)]);
  mark('source:korea-history',started);
  return {progress,rawRows,nowIso};
 }
 if(id==='inflation'){
  const started=performance.now();
  const [pit,pc1]=await Promise.all([loadStoredInflationPitSeries(env.DB_CORE,{asOf,seriesIds:[...INFLATION_PIT_SERIES]}),loadPc1Series(env.DB_CORE,{asOf})]);
  mark('source:inflation',started);
  return {pit,pc1,asOf,nowIso};
 }
 const store=marketOperationalStore(env.DB_CORE);
 const snapshotStarted=performance.now(),snapshot=await store.readScore();mark('source:snapshot',snapshotStarted);
 if(id==='earningsRecession'){
  const date=/^\d{4}-\d{2}-\d{2}$/.test(snapshot?.body?.asOfDate??'')?snapshot.body.asOfDate:asOf;
  const e1Started=performance.now(),e1=await readEarningsE1R4StoredScore({asOf:date,db:env.DB_CORE});mark('source:earnings',e1Started);
  return {snapshot,e1,nowIso};
 }
 const keys=PROJECTION_INPUT_BATCHES[id];
 if(!keys)throw Error('INVALID_PROJECTION_ID');
 const inputStarted=performance.now(),inputs=await readStoredMarketInputsSelected(store,keys,now,{anchorToLatestBatch:id==='liquidityCrisis'||id==='creditRisk',projectionId:id,onMetadata});mark('source:inputs',inputStarted);
 return {inputs,snapshot,publicSnapshot:snapshot,nowIso};
}
