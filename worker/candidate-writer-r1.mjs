// R2: native write bindings are confined to scheduled execution.
export const WRITER_CRONS=Object.freeze(['*/5 * * * *','37 * * * *']);
const CORE_PROJECTIONS=Object.freeze(['inflation','recession','liquidityCrisis','creditRisk','earningsRecession','assetBubble','debtRisk','supplyShock']);
let runtimePromise;
const loadRuntime=()=>runtimePromise??=import('./candidate-writer-runtime-r1.mjs');
export async function runCandidateWriter(controller,native,deps={}){
 if(!WRITER_CRONS.includes(controller.cron))return {status:'IGNORED'};
 const korea=controller.cron==='37 * * * *';
 const phase=name=>console.log('R61_WRITER_PHASE',JSON.stringify({lane:korea?'korea':'core',phase:name}));
 const db=korea?native.DB_HISTORY:native.DB_CORE;
 if(!db)return {status:'CONFIGURATION_MISSING',lane:korea?'korea':'core'};
 const env={...native,DB:db},ids=korea?['koreaFearGreed']:CORE_PROJECTIONS;
 const checkpoints=deps.checkpoints??(await import('./projection-checkpoint-r52.mjs')).readProjectionCheckpoints;
 const enqueue=deps.enqueue??(await import('./projection-queue-r52.ts')).enqueueProjectionIds;
 phase('checkpoint-before');const before=await checkpoints(native,ids);
 let result;
 if(korea){
  phase('korea-import');
  const refresh=deps.korea??(await loadRuntime()).refreshKoreaRev7;
  phase('korea-call');
  result=await refresh({env,now:new Date(controller.scheduledTime),maxDates:1});
  phase('korea-return');
 }else{
  const feeds=deps.feeds??(await loadRuntime()).runPublicFeeds;
  const feed=await feeds({env,maxFeedsPerRun:1});
  if(feed.attempted>0)return {status:feed.status,lane:'public-feed',attempted:feed.attempted};
  if(feed.status!=='COMPLETE')return {status:feed.status??'ERROR',lane:'public-feed',attempted:0};
  const market=deps.market??(await loadRuntime()).runMarketOperationalRefresh;
  result=await market({env,now:controller.scheduledTime,fetchImpl:globalThis.fetch});
 }
 if(!['COMPLETE','BACKLOG','WAITING_PUBLICATION'].includes(result?.status))return {status:result?.status??'ERROR',lane:korea?'korea':'market'};
 phase('checkpoint-after');const after=await checkpoints(native,ids);
 const changed=ids.filter(id=>after[id]?.sourceVersion!==before[id]?.sourceVersion||after[id]?.sourceStoredAt!==before[id]?.sourceStoredAt);
 const queue=changed.length?await enqueue(native,changed,{sourceSucceeded:true,skipReady:true}):{sent:0,skipped:0};
 return {status:result.status,lane:korea?'korea':'market',job:result.job??null,projectionCount:queue.sent};
}
