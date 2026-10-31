// Windows PC: one-time, read-only English Ollama -> R5 evidence pilot.
// No DB checkpoint, public API write, translation, scheduler or deployment.
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readPublishedNews} from './published-news-score-input-r1.mjs';
import {runEnglishScorePCPreview} from './news-r41-english-score-evidence-r1.mjs';

export async function previewEnglishScoreEvidence({now=Date.now(),fetchImpl=fetch,
 maxNew=16,evidenceCollector,generator,defaultGenerator,ollamaFetch=fetch}={}){
 if(!generator){
  // A successful file/API run is not evidence that local Ollama is active.
  let modelReady=false;
  try{
   const response=await ollamaFetch('http://127.0.0.1:11434/api/tags',
    {signal:AbortSignal.timeout(5000)});
   if(response.ok){
    const tags=await response.json();
    modelReady=Array.isArray(tags.models)&&tags.models.some(
     item=>item.name==='gemma3:4b'&&typeof item.digest==='string'&&item.digest);
   }
  }catch{}
  if(!modelReady)throw Error('IRAN_ENGLISH_SCORE_OLLAMA_MODEL_UNAVAILABLE');
 }
 const {r41,selected}=await readPublishedNews({now,fetchImpl});
 if(selected.endpoint!=='/api/outbreak-news/iran/r41')
  throw Error('IRAN_ENGLISH_SCORE_R41_FEED_UNAVAILABLE');
 const options={now,maxNew};
 if(evidenceCollector)options.evidenceCollector=evidenceCollector;
 if(generator)options.generator=generator;
 else if(defaultGenerator)options.generator=defaultGenerator;
 const report=await runEnglishScorePCPreview(r41,options);
 const count=reason=>report.pending.filter(item=>item.reason===reason).length;
 const sourceFailureReasons={};
 for(const item of report.pending)if(item.sourceFailure)
  sourceFailureReasons[item.sourceFailure]=(sourceFailureReasons[item.sourceFailure]??0)+1;
 const metadataById=new Map(r41.items.map(item=>[item.id,item]));
 return {status:'SHADOW_PREVIEW',version:report.version,
  checkedAt:new Date(now).toISOString(),
  sourceCount:r41.sourceCount,newsCount:r41.itemCount,
  evidenceConfirmed:report.items.filter(item=>item.status==='EVIDENCE_CONFIRMED').length,
  evidenceHeld:report.items.filter(item=>item.status==='HELD').length,
  modelCallsAttempted:report.modelCallsAttempted,
  modelCallsSucceeded:report.modelCallsSucceeded,
  rightsRestricted:count('SOURCE_RIGHTS_RESTRICTED'),
  sourceUnavailable:count('RIGHTS_CHECKED_BODY_NOT_AVAILABLE'),
  sourceFailureReasons,
  inferenceFailures:report.pending.length-count('SOURCE_RIGHTS_RESTRICTED')-
   count('RIGHTS_CHECKED_BODY_NOT_AVAILABLE')-count('ANALYSIS_BACKLOG'),
  backlog:count('ANALYSIS_BACKLOG'),
  verifiedRules:report.items.filter(item=>item.status==='EVIDENCE_CONFIRMED')
   .map(item=>({rule:item.rule,delta:item.delta,sourceUrl:item.sourceUrl})),
  articleResults:[
   ...report.items.map(item=>({source:metadataById.get(item.id)?.source??null,
    sourceUrl:item.sourceUrl,status:item.status,reason:item.reason??null,
    rule:item.rule??null,delta:item.delta??null})),
   ...report.pending.map(item=>({source:metadataById.get(item.id)?.source??null,
    sourceUrl:metadataById.get(item.id)?.sourceUrl??null,
    status:'PENDING',reason:item.reason,
    sourceFailure:item.sourceFailure??null,rule:null,delta:null})),
  ].sort((a,b)=>a.sourceUrl.localeCompare(b.sourceUrl)),
  publicWrite:false,r5ScoreChanges:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--preview')
   throw Error('IRAN_ENGLISH_SCORE_PREVIEW_ONLY');
  const result=await previewEnglishScoreEvidence();
  console.log(JSON.stringify(result,null,2));
 }catch(error){
  const reason=typeof error?.message==='string'&&
   /^IRAN_(?:ENGLISH_SCORE|PUBLISHED_NEWS)_[A-Z0-9_]+$/.test(error.message)?
   error.message:'IRAN_ENGLISH_SCORE_PREVIEW_FAILED';
  console.error(JSON.stringify({status:'BLOCKED',reason,
   publicWrite:false,r5ScoreChanges:0}));
  process.exitCode=1;
 }
}
