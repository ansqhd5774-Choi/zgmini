// R20: read-only source-anchored TranslateGemma quality experiment.
// Existing R15 publication, local news cache, D1, score and scheduler unchanged.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compareKoreanIranNewsR18,assessTranslationTerminology}
 from './news-display-translation-compare-r18.mjs';
import {validateTranslationDraft} from './news-display-translation-preview-r17.mjs';
import {readNewsDisplayCache} from './news-display-io-r1.mjs';
import {visibleIranNewsItems} from '../../lib/iran-progress/news-display-r1.mjs';
import {R19_MODEL,ensureTranslateGemmaR19,translationPromptR19}
 from './news-display-translategemma-review-r19.mjs';
import {protectEnglishNewsTextR20,restoreProtectedTranslationR20,
 compareNumericFactsR20,semanticWarningsR20}
 from './news-display-translation-anchors-r20.mjs';

const OLLAMA='http://127.0.0.1:11434';

async function translateR20(prepared,fetcher){
 const response=await fetcher(`${OLLAMA}/api/chat`,{
  method:'POST',headers:{'Content-Type':'application/json'},
  signal:AbortSignal.timeout(180000),
  body:JSON.stringify({model:R19_MODEL,stream:false,think:false,
   options:{temperature:0,num_predict:720,num_ctx:4096},
   messages:[{role:'user',content:translationPromptR19(prepared)}]}),
 });
 if(!response.ok)throw Error('R20_TRANSLATION_HTTP_'+response.status);
 const body=await response.json();
 const draft=body.message?.content;
 if(typeof draft!=='string'||draft.length>2400||!draft.trim())
  throw Error('R20_MODEL_OUTPUT_INVALID');
 return draft.trim();
}

export function evaluateGuardedTranslationR20({sourceTitle,sourceExcerpt,titleRaw,excerptRaw}){
 const titleAnchor=protectEnglishNewsTextR20(sourceTitle);
 const excerptAnchor=protectEnglishNewsTextR20(sourceExcerpt);
 const title=restoreProtectedTranslationR20(titleRaw,titleAnchor);
 const excerpt=restoreProtectedTranslationR20(excerptRaw,excerptAnchor);
 const structural=validateTranslationDraft(JSON.stringify({titleKo:title.text,excerptKo:excerpt.text}),
  {sourceTitle,sourceExcerpt});
 const numericTitle=compareNumericFactsR20(sourceTitle,title.text);
 const numericExcerpt=compareNumericFactsR20(sourceExcerpt,excerpt.text);
 const anchors=[...title.missing.map(x=>'TITLE_ANCHOR_'+x),
  ...excerpt.missing.map(x=>'EXCERPT_ANCHOR_'+x)];
 const terminology=[...assessTranslationTerminology(sourceTitle,title.text).map(x=>'TITLE_TERM_'+x),
  ...assessTranslationTerminology(sourceExcerpt,excerpt.text).map(x=>'EXCERPT_TERM_'+x)];
 const semantics=[...semanticWarningsR20(sourceTitle,title.text).map(x=>'TITLE_'+x),
  ...semanticWarningsR20(sourceExcerpt,excerpt.text).map(x=>'EXCERPT_'+x)];
 const numeric=[...(!numericTitle.matched?['TITLE_NUMERIC_FACT_DRIFT']:[]),
  ...(!numericExcerpt.matched?['EXCERPT_NUMERIC_FACT_DRIFT']:[])];
 const warnings=[...anchors,...terminology,...semantics,...numeric];
 let status;
 if(anchors.length)status='R20_PROTECTED_ANCHOR_MISMATCH';
 else if(structural.status!=='DRAFT_REQUIRES_HUMAN_REVIEW'&&
  !(structural.status==='NUMERIC_FACT_DRIFT'&&numeric.length===0))
  status=structural.status;
 else if(warnings.length)status='R20_SEMANTIC_GUARD_HOLD';
 else status='DRAFT_REQUIRES_HUMAN_REVIEW';
 return {status,titleKo:title.text,excerptKo:excerpt.text,
  failedTopic:structural.topic??null,terminologyWarnings:warnings,
  numericFacts:{title:numericTitle,excerpt:numericExcerpt},
  rawDrafts:{title:titleRaw,excerpt:excerptRaw},anchorCounts:{title:titleAnchor.anchors.length,
   excerpt:excerptAnchor.anchors.length},
  qualityAutomaticallyVerified:false};
}

export async function translateGuardedNewsR20({sourceTitle,sourceExcerpt,fetcher=fetch}={}){
 try{
  const title=protectEnglishNewsTextR20(sourceTitle);
  const excerpt=protectEnglishNewsTextR20(sourceExcerpt);
  const titleRaw=await translateR20(title.prepared,fetcher);
  const excerptRaw=await translateR20(excerpt.prepared,fetcher);
  return evaluateGuardedTranslationR20({sourceTitle,sourceExcerpt,titleRaw,excerptRaw});
 }catch(error){
  return {status:'R20_TRANSLATION_REQUEST_FAILED',titleKo:null,excerptKo:null,
   failedTopic:null,terminologyWarnings:[String(error?.message??'UNKNOWN_ERROR').slice(0,100)]};
 }
}

export async function reviewGuardedNewsR20({dataDirectory,now=Date.now(),fetcher=fetch,
 modelCheck=ensureTranslateGemmaR19,translate=translateGuardedNewsR20}={}){
 if(typeof dataDirectory!=='string'||!path.isAbsolute(dataDirectory)||
  !fs.existsSync(path.join(dataDirectory,'iran.sqlite')))
  throw Error('R20_EXISTING_SCORE_LEDGER_MISSING');
 const current=readNewsDisplayCache(dataDirectory);
 if(!Array.isArray(current.items)||visibleIranNewsItems(current.items,{now}).length<1)
  throw Error('R20_NO_VISIBLE_NEWS');
 const model=await modelCheck({fetcher,allowInstall:false});
 if(!['ALREADY_INSTALLED','NEWLY_INSTALLED'].includes(model.status))
  throw Error('R20_MODEL_NOT_INSTALLED_INSTALL_DISABLED');
 const base=await compareKoreanIranNewsR18({dataDirectory,now,fetcher,
  modelsOverride:[R19_MODEL],translate});
 const samples=base.results.filter(item=>item.translations?.length);
 return {status:'R20_PROTECTED_TRANSLATION_READ_ONLY_REVIEW',model:R19_MODEL,
  visibleCount:base.visibleCount,preservedCount:base.preservedArticles,
  comparedCount:samples.length,heldSourceCount:base.heldArticles,
  structuralCandidateCount:samples.filter(x=>x.translations[0].status==='DRAFT_REQUIRES_HUMAN_REVIEW').length,
  flaggedCount:samples.filter(x=>x.translations[0].status!=='DRAFT_REQUIRES_HUMAN_REVIEW').length,
  results:base.results,publication:'DISABLED',pcCacheWritten:false,d1Written:false,
  scoreLedgerModified:false,schedulerModified:false,modelDownloaded:false,
  qualityAutomaticallyVerified:false};
}

export function formatGuardedReviewR20(report){
 const lines=['R20_PROTECTED_TRANSLATION_READ_ONLY_RESULT',
  'MODEL='+report.model,'MODEL_DOWNLOAD=DISABLED',
  'VISIBLE='+report.visibleCount,'PREVIOUS_KOREAN_PRESERVED='+report.preservedCount,
  'DRAFTS_GENERATED='+report.comparedCount,'STRUCTURAL_CANDIDATES='+report.structuralCandidateCount,
  'FLAGGED='+report.flaggedCount,'SOURCE_HELD='+report.heldSourceCount,
  'PUBLICATION=DISABLED','PC_CACHE_WRITTEN=NO','D1_WRITTEN=NO',
  'SCORE_LEDGER_MODIFIED=NO','SCHEDULER_MODIFIED=NO',
  'AUTOMATIC_QUALITY_VERIFIED=NO'];
 for(const [index,item] of report.results.entries()){
  lines.push('',`ARTICLE_${index+1}_STATUS=${item.status}`,
   'SOURCE_URL='+item.sourceUrl,'EN_TITLE='+item.titleOriginal);
  if(item.sourceExcerpt)lines.push('EN_SOURCE_EXCERPT='+item.sourceExcerpt);
  if(item.translations?.length){
   const t=item.translations[0];
   lines.push('KO_TITLE='+String(t.titleKo??''),
    'KO_EXCERPT='+String(t.excerptKo??''),
    'GUARD_STATUS='+t.status,
    'GUARD_WARNINGS='+t.terminologyWarnings.join(','),
    'NAMED_ACTOR_CHECK='+String(t.failedTopic??''));
  }
 }
 lines.push('','FINAL_STATUS=R20_DRAFTS_FOR_SEMANTIC_REVIEW_NO_PUBLICATION');
 return lines.join('\n');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only')
  throw Error('R20_READ_ONLY_ONLY');
 const dataDirectory=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 try{
  const report=await reviewGuardedNewsR20({dataDirectory});
  console.log(formatGuardedReviewR20(report));
  if(report.comparedCount===0)process.exitCode=2;
 }catch(error){
  console.error('STOP_R20='+String(error?.message??'UNKNOWN_ERROR').slice(0,180));
  console.error('FINAL_STATUS=STOP_R20_NO_PUBLICATION');process.exitCode=1;
 }
}
