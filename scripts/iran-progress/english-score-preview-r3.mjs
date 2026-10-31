// Windows shadow R3: R2 rights-cleared Tasnim body + constrained English quote.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {previewEnglishScoreEvidenceR2} from './english-score-preview-r2.mjs';
import {generateBoundEnglishScoreEvidence} from './english-score-bound-quote-r3.mjs';

export const previewEnglishScoreEvidenceR3=options=>previewEnglishScoreEvidenceR2({
 ...options,defaultGenerator:generateBoundEnglishScoreEvidence,
});

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--preview')
   throw Error('IRAN_ENGLISH_SCORE_R3_PREVIEW_ONLY');
  console.log(JSON.stringify(await previewEnglishScoreEvidenceR3(),null,2));
 }catch(error){
  const reason=/^(?:IRAN_ENGLISH_SCORE|IRAN_TASNIM)_[A-Z0-9_]+$/.test(error?.message)?
   error.message:'IRAN_ENGLISH_SCORE_R3_PREVIEW_FAILED';
  console.error(JSON.stringify({status:'BLOCKED',reason,
   publicWrite:false,r5ScoreChanges:0}));
  process.exitCode=1;
 }
}
