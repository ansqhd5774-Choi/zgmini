// English R5 Tasnim story fallback pilot; no writes, scheduling or translation.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {previewEnglishScoreEvidence} from './english-score-preview-r1.mjs';
import {directEnglishR41ArticleEvidenceR2} from './tasnim-english-body-r2.mjs';

export const previewEnglishScoreEvidenceR2=options=>previewEnglishScoreEvidence({
 ...options,evidenceCollector:options?.evidenceCollector??directEnglishR41ArticleEvidenceR2,
});

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--preview')
   throw Error('IRAN_ENGLISH_SCORE_R2_PREVIEW_ONLY');
  console.log(JSON.stringify(await previewEnglishScoreEvidenceR2(),null,2));
 }catch(error){
  const reason=/^(?:IRAN_ENGLISH_SCORE|IRAN_TASNIM)_[A-Z0-9_]+$/.test(error?.message)?
   error.message:'IRAN_ENGLISH_SCORE_R2_PREVIEW_FAILED';
  console.error(JSON.stringify({status:'BLOCKED',reason,
   publicWrite:false,r5ScoreChanges:0}));
  process.exitCode=1;
 }
}
