// R5 read-only shadow: test one proposed R3 event rule rather than allow a
// second unrelated event classification from the same article body.
// Public R5 scoring, source rights, scheduler and databases remain untouched.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {previewEnglishScoreEvidenceR2} from './english-score-preview-r2.mjs';
import {matchingEnglishEventQuotes,generateBoundEnglishScoreEvidence}
 from './english-score-bound-quote-r3.mjs';

const targetedEventGenerator=article=>generateBoundEnglishScoreEvidence(article,{
 reportedEventSemantics:true,targetedEventReview:true,
});

export const previewEnglishScoreEvidenceR5=options=>previewEnglishScoreEvidenceR2({
 ...options,eventPreflight:true,
 quotePreflight:article=>matchingEnglishEventQuotes(article).length>0,
 includeDiagnosticDetails:true,includeRuleDiagnostics:true,
 defaultGenerator:targetedEventGenerator,
});

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--preview')
   throw Error('IRAN_ENGLISH_SCORE_R5_PREVIEW_ONLY');
  console.log(JSON.stringify(await previewEnglishScoreEvidenceR5(),null,2));
 }catch(error){
  const reason=/^(?:IRAN_ENGLISH_SCORE|IRAN_TASNIM)_[A-Z0-9_]+$/.test(error?.message)?
   error.message:'IRAN_ENGLISH_SCORE_R5_PREVIEW_FAILED';
  console.error(JSON.stringify({status:'BLOCKED',reason,
   publicWrite:false,r5ScoreChanges:0}));
  process.exitCode=1;
 }
}
