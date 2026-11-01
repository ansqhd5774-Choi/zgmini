import {verifiedEarningsRiskTrend} from '../lib/market-score/earnings-recession-history-r1.mjs';
import {marketOperationalStore,readStoredMarketInputsSelected} from './candidate-market-operational-store.mjs';
import {loadStoredInflationPitSeries} from './inflation-pit-reader.mjs';
import {INFLATION_PIT_SERIES} from './inflation-pit-backfill.mjs';
import {loadPc1Series} from './projection-inflation-inputs.mjs';
import {defaultLoadProgress,defaultLoadRows} from './korea-funds.mjs';
import {readRecessionClaimsHistory} from './projection-builders/recession-supplemental-history.mjs';

const finiteScore=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const EARNINGS_E1_R5_IDS=Object.freeze(['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12','S13']);

export const PROJECTION_INPUT_BATCHES=Object.freeze({
 recession:Object.freeze(['macro','credit','rates']),
 liquidityCrisis:Object.freeze(['macro','credit']),
 creditRisk:Object.freeze(['macro','credit']),
 earningsRecession:Object.freeze([]),
 assetBubble:Object.freeze(['macro']),
 debtRisk:Object.freeze(['macro','credit','bisDsr','bisTc']),
 supplyShock:Object.freeze(['macro','supply']),
});

export function selectStoredEarningsProjection(snapshot){
 const earnings=Array.isArray(snapshot?.body?.domains)
  ? snapshot.body.domains.find(domain=>domain?.id==='earnings')??null
  : null;
 const indicators=Array.isArray(earnings?.indicators)?earnings.indicators:[];
 const byId=new Map(indicators.map(indicator=>[indicator?.id,indicator]));
 const complete=earnings?.status==='READY'&&
  earnings?.methodologyVersion==='E1-R5'&&
  finiteScore(earnings?.score)&&
  Array.isArray(earnings?.missingFactors)&&earnings.missingFactors.length===0&&
  indicators.length===EARNINGS_E1_R5_IDS.length&&
  EARNINGS_E1_R5_IDS.every(id=>{
   const indicator=byId.get(id);
   return indicator?.status==='READY'&&finiteScore(indicator?.score);
  });
 return complete?{...earnings,missing:[...earnings.missingFactors]}:null;
}

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
  const e1Started=performance.now();
  // Visitor GET reads only a stored economic-domain projection. The four-
  // factor scorer runs on the PC writer, never inside this public GET.
  const e1=selectStoredEarningsProjection(snapshot)??null;
  mark('source:earnings',e1Started);
  // The existing dated snapshots are the only eligible risk history source.
  // No provider access, DB write or E1 economic-domain trend is permitted.
  let riskHistory={kind:'UNVERIFIED',points:[]};
  const diag=snapshot?.body?.diagnostics8?.earningsRecessionDefense;
  // PC publishes only aggregate scores and source-quarter labels; never
  // the raw issuer facts. Current-vintage reconstruction is not PIT.
  if(diag?.status==='READY'&&
    diag?.riskFactorsSource==='E1_R4_STORED_PC_REPLAY'&&
    diag?.riskHistoryKind==='E1_R4_STORED_PERIOD_CURRENT_VINTAGE_NOT_PIT'&&
    Array.isArray(diag?.riskTrend)){
    riskHistory={
      kind:diag.riskHistoryKind,points:diag.riskTrend,
      financialPeriodEnd:diag.financialPeriodEnd,
      historyMode:diag.historyMode,
    };
  }else if(diag?.status==='READY'&&typeof diag?.score==='number'&&
    diag?.methodologyVersion==='EARNINGS_RECESSION_DIAGNOSTIC_R1'){
    try{
      const from=new Date(Date.parse(date+'T00:00:00Z'));from.setUTCFullYear(from.getUTCFullYear()-1);
      const since=from.toISOString().slice(0,10);
      const query=await env.DB_CORE.prepare(
        'SELECT snapshot_key,body FROM market_public_snapshots_v1 WHERE snapshot_key>=? AND snapshot_key<=? AND length(snapshot_key)=10 ORDER BY snapshot_key ASC LIMIT 400'
      ).bind(since,date).all();
      const snapshots=(query?.results??[]).flatMap(row=>{
        try{return [{snapshotKey:row.snapshot_key,body:JSON.parse(row.body)}];}catch{return [];}
      });
      riskHistory=verifiedEarningsRiskTrend({
        snapshots,current:{asOfDate:date,score:diag.score,methodologyVersion:diag.methodologyVersion},
      });
    }catch{} // Retrieval failure is history-unavailable; never fabricate a trend.
  }
  return {snapshot,e1,nowIso,riskHistory};
 }
 const keys=PROJECTION_INPUT_BATCHES[id];
 if(!keys)throw Error('INVALID_PROJECTION_ID');
 const inputStarted=performance.now(),inputs=await readStoredMarketInputsSelected(store,keys,now,{anchorToLatestBatch:id==='liquidityCrisis'||id==='creditRisk',projectionId:id,onMetadata});mark('source:inputs',inputStarted);
 let claimsHistory=[];
 if(id==='recession'){
  try{claimsHistory=await readRecessionClaimsHistory(env.DB_CORE,asOf);}catch{}
 }
 return {inputs,snapshot,publicSnapshot:snapshot,nowIso,claimsHistory};
}
