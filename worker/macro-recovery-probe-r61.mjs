// Temporary one-shot recovery through the actual scheduled writer, no HTTP endpoint.
export async function runOnceMacroRecovery(native,controller){
 const db=native.DB_CORE;if(!db)return false;
 const prior=await db.prepare('SELECT status,finished_at FROM market_collection_jobs_v1 WHERE job=?').bind('diagnostic:macro-recovery-r61:20261005').first();
 if(prior?.status!=='PROBE_CLAIMED')return false;
 const macro=await db.prepare('SELECT stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? ORDER BY stored_at DESC LIMIT 1').bind('macro:%').first();
 if(macro?.stored_at!==prior.finished_at)return false;
 for(const id of ['recession','liquidityCrisis','creditRisk','assetBubble','debtRisk','supplyShock']){
  const slice=await db.prepare('SELECT stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? ORDER BY stored_at DESC LIMIT 1').bind(`projection-macro:${id}:%`).first();
  if(slice?.stored_at!==macro.stored_at)return false;
 }
 const job='diagnostic:stored-score-recovery-r61:20261005:bond-reuse';
 const claim=await db.prepare('INSERT OR IGNORE INTO market_collection_jobs_v1(job,status,finished_at) VALUES(?,?,?)').bind(job,'PROBE_CLAIMED',controller.scheduledTime).run();
 if(claim.meta?.changes!==1)return false;
 console.log('R61_MACRO_RECOVERY',JSON.stringify({phase:'start'}));
 const {runCandidateWriter}=await import('./candidate-writer-r1.mjs');
 const {refreshStoredMarketScoreSnapshot}=await import('./candidate-writer-runtime-r1.mjs');
 const result=await runCandidateWriter(controller,native,{
  feeds:async()=>({status:'COMPLETE',attempted:0}),
  market:args=>refreshStoredMarketScoreSnapshot(args),
 });
 console.log('R61_MACRO_RECOVERY',JSON.stringify({phase:'result',...result}));
 await db.prepare('UPDATE market_collection_jobs_v1 SET status=?,finished_at=? WHERE job=?').bind(result.status,controller.scheduledTime,job).run();
 return true;
}
