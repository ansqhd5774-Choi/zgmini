// Ollama only extracts candidate claims; never verifies combat or changes a score.
import {PROMPT_VERSION,interpretSource} from './ai.mjs';
const CURSOR='ollama-candidate-batch-cursor-v1';
const select=(store,after,limit)=>{
 const sql="SELECT body FROM discovery_candidates WHERE state='DISCOVERED' AND id > ? ORDER BY id LIMIT ?";
 const first=store.db.prepare(sql).all(after??'',limit).map(r=>JSON.parse(r.body));
 if(first.length===limit)return first;
 const before=store.db.prepare("SELECT body FROM discovery_candidates WHERE state='DISCOVERED' AND id <= ? ORDER BY id LIMIT ?")
  .all(after??'',limit-first.length).map(r=>JSON.parse(r.body));
 return [...first,...before];
};
const safeFailure=error=>{
 const code=error instanceof Error?error.message:'';
 return [
  'AI_SCHEMA_INVALID','AI_UNSUPPORTED_CANDIDATE','AI_INPUT_CONTRACT_INVALID',
  'OLLAMA_REQUEST_FAILED','AI_RESULT_INVALID','AI_DECISION_INVALID'
 ].includes(code)?code:'OLLAMA_TRANSPORT_OR_PARSE_FAILED';
};
export async function analyzeCandidateBatch(store,{modelDigest,model='gemma3:4b',now=Date.now(),limit=20,processor=interpretSource}={}){
 if(!Number.isInteger(limit)||limit<1||limit>20)throw Error('AI_BATCH_LIMIT_INVALID');
 const queued=Number(store.db.prepare("SELECT COUNT(*) AS n FROM discovery_candidates WHERE state='DISCOVERED'").get().n);
 const stats={status:'NOT_REQUESTED',queued,attempted:0,processed:0,existingDecisions:0,
  extractedCandidates:0,failed:0,failedByReason:{},remaining:queued,sourceLevel:'HEADLINE_ONLY',
  factVerification:'NOT_PERFORMED',cursorAdvanced:false};
 if(!modelDigest)return {...stats,status:'PENDING',reason:'OLLAMA_MODEL_UNAVAILABLE'};
 const old=store.getCheckpoint(CURSOR);
 const after=typeof old?.afterId==='string'?old.afterId:'';
 let advanced=after;
 const selected=select(store,after,Math.min(limit,queued));
 for(const article of selected){
  stats.attempted++;
  try{
   if(typeof article.id!=='string'||typeof article.title!=='string')throw Error('AI_INPUT_CONTRACT_INVALID');
   const key='discovery:'+article.id+':'+modelDigest+':'+PROMPT_VERSION;
   const stored=store.db.prepare('SELECT body FROM decisions WHERE id=?').get(key);
   let result;
   if(stored){result=JSON.parse(stored.body);stats.existingDecisions++;}
   else{
    const interpreted=await processor(article.title,{model,modelDigest,now});
    if(interpreted.status!=='CANDIDATE_ONLY'||!Array.isArray(interpreted.candidates))throw Error('AI_RESULT_INVALID');
    result={...interpreted,articleId:article.id,url:article.url,
     sourceLevel:'HEADLINE_ONLY',eventVerification:'PENDING'};
    store.putDecision(key,result,now);
   }
   if(result.status!=='CANDIDATE_ONLY'||!Array.isArray(result.candidates))throw Error('AI_DECISION_INVALID');
   // Reuse the persisted decision after interruption without rerunning Ollama.
   store.finishCandidate(article.id,result.candidates.length?'REVIEW_PENDING':'INTERPRETED');
   stats.processed++;
   stats.extractedCandidates+=result.candidates.length;
  }catch(error){
   stats.failed++;
   const code=safeFailure(error);
   stats.failedByReason[code]=(stats.failedByReason[code]??0)+1;
   // Do not advance this candidate to "interpreted"; it stays DISCOVERED.
   // Do not let a permanently bad headline block the other 19 articles.
  }
  // Cursor is durable even after one failed item: a wrapped next run retries it.
  advanced=article.id;
  store.checkpoint(CURSOR,{afterId:advanced,checkedAt:now,model,modelDigest,promptVersion:PROMPT_VERSION});
  stats.cursorAdvanced=true;
 }
 stats.remaining=Number(store.db.prepare("SELECT COUNT(*) AS n FROM discovery_candidates WHERE state='DISCOVERED'").get().n);
 stats.status=stats.failed?'ANALYSIS_PARTIAL_FAILED':stats.remaining?'ANALYSIS_PENDING':'CANDIDATE_ONLY';
 return stats;
}
