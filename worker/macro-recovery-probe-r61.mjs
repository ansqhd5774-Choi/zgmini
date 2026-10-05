// Temporary one-shot recovery through the actual scheduled writer, no HTTP endpoint.
export async function runOnceMacroRecovery(native,controller){
 const db=native.DB_CORE;if(!db)return false;
 const prior=await db.prepare('SELECT status FROM market_collection_jobs_v1 WHERE job=?').bind('diagnostic:fred-subset-r61:20261005:5').first();
 if(prior?.status!=='COMPLETE')return false;
 const job='diagnostic:macro-recovery-r61:20261005';
 const claim=await db.prepare('INSERT OR IGNORE INTO market_collection_jobs_v1(job,status,finished_at) VALUES(?,?,?)').bind(job,'PROBE_CLAIMED',controller.scheduledTime).run();
 if(claim.meta?.changes!==1)return false;
 console.log('R61_MACRO_RECOVERY',JSON.stringify({phase:'start'}));
 const {runCandidateWriter}=await import('./candidate-writer-r1.mjs');
 const {runMarketOperationalRefresh}=await import('./candidate-writer-runtime-r1.mjs');
 const result=await runCandidateWriter(controller,native,{
  feeds:async()=>({status:'COMPLETE',attempted:0}),
  market:args=>runMarketOperationalRefresh({...args,job:'macro'}),
 });
 console.log('R61_MACRO_RECOVERY',JSON.stringify({phase:'result',...result}));
 await db.prepare('UPDATE market_collection_jobs_v1 SET status=?,finished_at=? WHERE job=?').bind(result.status,controller.scheduledTime,job).run();
 return true;
}
