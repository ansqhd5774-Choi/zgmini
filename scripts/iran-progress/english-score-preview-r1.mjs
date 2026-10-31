// Windows PC: one-time, read-only English Ollama -> R5 evidence pilot.
// No DB checkpoint, public API write, translation, scheduler or deployment.
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readPublishedNews} from './published-news-score-input-r1.mjs';
import {runEnglishScorePCPreview} from './news-r41-english-score-evidence-r1.mjs';

export async function previewEnglishScoreEvidence({now=Date.now(),fetchImpl=fetch,
 maxNew=16,evidenceCollector,generator}={}){
 const {r41,selected}=await readPublishedNews({now,fetchImpl});
 if(selected.endpoint!=='/api/outbreak-news/iran/r41')
  throw Error('IRAN_ENGLISH_SCORE_R41_FEED_UNAVAILABLE');
 const options={now,maxNew};
 if(evidenceCollector)options.evidenceCollector=evidenceCollector;
 if(generator)options.generator=generator;
 const report=await runEnglishScorePCPreview(r41,options);
 const count=reason=>report.pending.filter(item=>item.reason===reason).length;
 return {status:'SHADOW_PREVIEW',version:report.version,
  sourceCount:r41.sourceCount,newsCount:r41.itemCount,
  evidenceConfirmed:report.items.filter(item=>item.status==='EVIDENCE_CONFIRMED').length,
  evidenceHeld:report.items.filter(item=>item.status==='HELD').length,
  rightsRestricted:count('SOURCE_RIGHTS_RESTRICTED'),
  sourceUnavailable:count('RIGHTS_CHECKED_BODY_NOT_AVAILABLE'),
  inferenceFailures:report.pending.length-count('SOURCE_RIGHTS_RESTRICTED')-
   count('RIGHTS_CHECKED_BODY_NOT_AVAILABLE')-count('ANALYSIS_BACKLOG'),
  backlog:count('ANALYSIS_BACKLOG'),
  verifiedRules:report.items.filter(item=>item.status==='EVIDENCE_CONFIRMED')
   .map(item=>({rule:item.rule,delta:item.delta,sourceUrl:item.sourceUrl})),
  publicWrite:false,r5ScoreChanges:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--preview')
  throw Error('IRAN_ENGLISH_SCORE_PREVIEW_ONLY');
 const result=await previewEnglishScoreEvidence();
 console.log(JSON.stringify(result,null,2));
}
