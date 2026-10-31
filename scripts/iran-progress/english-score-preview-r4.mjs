// R4 read-only shadow: preselect existing R3 stages before calling Ollama.
// No source-policy, R5 score, Windows task, database, or publication changes.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {previewEnglishScoreEvidenceR2} from './english-score-preview-r2.mjs';
import {matchingEnglishEventQuotes,generateBoundEnglishScoreEvidence}
 from './english-score-bound-quote-r3.mjs';

const reportedEventGenerator=article=>generateBoundEnglishScoreEvidence(article,{
 reportedEventSemantics:true,
});

export const previewEnglishScoreEvidenceR4=options=>previewEnglishScoreEvidenceR2({
 ...options,eventPreflight:true,
 quotePreflight:article=>matchingEnglishEventQuotes(article).length>0,
 includeDiagnosticDetails:true,
 defaultGenerator:reportedEventGenerator,
});

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--preview')
   throw Error('IRAN_ENGLISH_SCORE_R4_PREVIEW_ONLY');
  console.log(JSON.stringify(await previewEnglishScoreEvidenceR4(),null,2));
 }catch(error){
  const reason=/^(?:IRAN_ENGLISH_SCORE|IRAN_TASNIM)_[A-Z0-9_]+$/.test(error?.message)?
   error.message:'IRAN_ENGLISH_SCORE_R4_PREVIEW_FAILED';
  console.error(JSON.stringify({status:'BLOCKED',reason,
   publicWrite:false,r5ScoreChanges:0}));
  process.exitCode=1;
 }
}
