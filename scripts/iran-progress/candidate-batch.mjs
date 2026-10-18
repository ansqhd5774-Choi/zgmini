// Candidate interpretation only. This worker never verifies events or changes scores.
import {PROMPT_VERSION,interpretSource} from './ai.mjs';

export async function analyzeCandidateBatch(store,{modelDigest,model='gemma3:4b',now=Date.now(),limit=20,processor=interpretSource}={}){
 if(!Number.isInteger(limit)||limit<1||limit>20)throw Error('AI_BATCH_LIMIT_INVALID');
 const queued=store.db.prepare("SELECT COUNT(*) AS n FROM discovery_candidates WHERE state='DISCOVERED'").get().n;
 const stats={status:'NOT_REQUESTED',queued,attempted:0,processed:0,existingDecisions:0,extractedCandidates:0,failed:0,remaining:queued,sourceLevel:'HEADLINE_ONLY',factVerification:'NOT_PERFORMED'};
 if(!modelDigest)return {...stats,status:'PENDING',reason:'OLLAMA_MODEL_UNAVAILABLE'};
 for(const article of store.candidates(limit)){
  stats.attempted++;
  try{
   const key='discovery:'+article.id+':'+modelDigest+':'+PROMPT_VERSION;
   const stored=store.db.prepare('SELECT body FROM decisions WHERE id=?').get(key);
   let result;
   if(stored){result=JSON.parse(stored.body);stats.existingDecisions++;}
   else{
    const interpreted=await processor(article.title,{model,modelDigest,now});
    if(interpreted.status!=='CANDIDATE_ONLY'||!Array.isArray(interpreted.candidates))throw Error('AI_RESULT_INVALID');
    result={...interpreted,articleId:article.id,url:article.url,sourceLevel:'HEADLINE_ONLY',eventVerification:'PENDING'};
    store.putDecision(key,result,now);
   }
   // A persisted decision can be safely completed after interruption without a second model call.
   store.finishCandidate(article.id,result.candidates.length?'REVIEW_PENDING':'INTERPRETED');
   stats.processed++;
   stats.extractedCandidates+=result.candidates.length;
  }catch{
   stats.failed++;
   // Keep this and the remaining candidates queued for the next scheduled run.
   break;
  }
 }
 stats.remaining=store.db.prepare("SELECT COUNT(*) AS n FROM discovery_candidates WHERE state='DISCOVERED'").get().n;
 stats.status=stats.failed?'ANALYSIS_FAILED':stats.remaining?'ANALYSIS_PENDING':'CANDIDATE_ONLY';
 return stats;
}
