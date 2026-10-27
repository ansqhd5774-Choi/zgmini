// R21: direct source translation, narrow source-conditional corrections,
// and an explicit quality HOLD. Nothing in this module publishes news.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compareKoreanIranNewsR18,assessTranslationTerminology}
 from './news-display-translation-compare-r18.mjs';
import {readNewsDisplayCache} from './news-display-io-r1.mjs';
import {visibleIranNewsItems} from '../../lib/iran-progress/news-display-r1.mjs';
import {R19_MODEL,ensureTranslateGemmaR19,translationPromptR19}
 from './news-display-translategemma-review-r19.mjs';
import {compareNumericFactsR20,semanticWarningsR20}
 from './news-display-translation-anchors-r20.mjs';
import {validateTranslationDraft} from './news-display-translation-preview-r17.mjs';

const OLLAMA='http://127.0.0.1:11434';
const SOURCE_ENTITIES=[
 [/\bHouthis?\b/i,/후티/,'HOUTHI_ACTOR_MISSING'],
 [/\bIran(?:[’']s)?\b/i,/이란/,'IRAN_ACTOR_MISSING'],
 [/\bYemen\b/i,/예멘/,'YEMEN_ACTOR_MISSING'],
 [/\bDPRK\b/i,/북한|조선민주주의인민공화국/,'DPRK_ACTOR_MISSING'],
 [/\bSaudi Arabia\b/i,/사우디아라비아|사우디 아라비아/,'SAUDI_ACTOR_MISSING'],
 [/\bPrime Minister\b/i,/총리/,'PRIME_MINISTER_ROLE_MISSING'],
 [/\bPresident Trump\b/i,/트럼프.{0,8}대통령|대통령.{0,8}트럼프/,'PRESIDENT_ROLE_MISSING'],
 [/\bEl Ni(?:n|ñ)o\b/i,/엘니뇨/,'EL_NINO_MISSING'],
];

function correctTerm(text,pattern,replacement,changes,reason){
 const next=text.replace(pattern,replacement);
 if(next!==text)changes.push(reason);
 return next;
}

// Corrections never introduce an actor absent from the English source.
// Every correction is reported, and no correction is treated as fact verification.
export function correctSourceBoundTermsR21(sourceEnglish,translation){
 if(typeof sourceEnglish!=='string'||typeof translation!=='string')
  throw Error('R21_INVALID_TEXT');
 let text=translation.trim();
 const changes=[];
 if(/\bHouthis?\b/i.test(sourceEnglish))
  text=correctTerm(text,/호세족|호세|호메인족|후티족/g,'후티',changes,'HOUTHI_NAME');
 if(/\bEd Miliband\b/i.test(sourceEnglish))
  text=correctTerm(text,/에드 밀번드|에드 밀리반드/g,'에드 밀리밴드',changes,'MILIBAND_NAME');
 if(/\bT(?:ü|u)rkiye\b/i.test(sourceEnglish))
  text=correctTerm(text,/터키 공화국|터키공화국/g,'튀르키예 공화국',changes,'TURKIYE_NAME');
 if(/\bdeterrence\b/i.test(sourceEnglish))
  text=correctTerm(text,/억지 우호|억지우호/g,'억지력',changes,'DETERRENCE');
 if(/\b20 October\b/i.test(sourceEnglish))
  text=correctTerm(text,/2020년\s*10월/g,'10월 20일',changes,'OCTOBER_20_DATE');
 return {text,changes};
}

export function evaluateDirectTranslationR21({sourceTitle,sourceExcerpt,titleRaw,excerptRaw}){
 const title=correctSourceBoundTermsR21(sourceTitle,titleRaw);
 const excerpt=correctSourceBoundTermsR21(sourceExcerpt,excerptRaw);
 const structural=validateTranslationDraft(JSON.stringify({titleKo:title.text,excerptKo:excerpt.text}),
  {sourceTitle,sourceExcerpt});
 const warnings=[];
 for(const [field,english,korean] of [
  ['TITLE',sourceTitle,title.text],['EXCERPT',sourceExcerpt,excerpt.text]]){
  const numeric=compareNumericFactsR20(english,korean);
  if(!numeric.matched)warnings.push(`${field}_NUMERIC_FACT_DRIFT`);
  for(const term of assessTranslationTerminology(english,korean))
   warnings.push(`${field}_TERM_${term.replace(/ /g,'_').toUpperCase()}`);
  for(const issue of semanticWarningsR20(english,korean))warnings.push(`${field}_${issue}`);
  for(const [sourcePattern,translationPattern,code] of SOURCE_ENTITIES)
   if(sourcePattern.test(english)&&!translationPattern.test(korean))warnings.push(`${field}_${code}`);
  if(/\bCOVID(?:-19)?\b/i.test(english)&&/코로나\s*19.{0,5}(?:침공|공격)/.test(korean))
   warnings.push(`${field}_COVID_INCORRECT_AGGRESSION`);
  if(/(?:정보 환경|정보환경)/.test(korean)&&/사이버 공격/.test(korean)&&
   !/\bcyber\b/i.test(english))warnings.push(`${field}_CYBER_ADDED`);
  if(/영국는|이란가|북한와|러시아의의|이란의가|북한의의|억지력는|법무장관의,/.test(korean))
   warnings.push(`${field}_BROKEN_KOREAN_GRAMMAR`);
 }
 if(structural.status!=='DRAFT_REQUIRES_HUMAN_REVIEW'&&
  !(structural.status==='NUMERIC_FACT_DRIFT'&&!warnings.some(x=>x.includes('NUMERIC'))))
  warnings.push('STRUCTURAL_'+structural.status);
 return {status:warnings.length?'R21_SEMANTIC_OR_FORMAT_HOLD':'R21_DRAFT_HUMAN_REVIEW',
  titleKo:title.text,excerptKo:excerpt.text,warnings,
  terminologyWarnings:[...warnings,...title.changes.map(x=>'CORRECTED_TITLE_'+x),
   ...excerpt.changes.map(x=>'CORRECTED_EXCERPT_'+x)],
  corrections:[...title.changes.map(x=>'TITLE_'+x),...excerpt.changes.map(x=>'EXCERPT_'+x)],
  qualityAutomaticallyVerified:false,publication:'DISABLED'};
}

async function translateRawR21(english,fetcher){
 const response=await fetcher(`${OLLAMA}/api/chat`,{
  method:'POST',headers:{'Content-Type':'application/json'},
  signal:AbortSignal.timeout(180000),
  body:JSON.stringify({model:R19_MODEL,stream:false,think:false,
   options:{temperature:0,num_predict:720,num_ctx:4096},
   messages:[{role:'user',content:translationPromptR19(english)}]})});
 if(!response.ok)throw Error('R21_MODEL_HTTP_'+response.status);
 const draft=(await response.json()).message?.content;
 if(typeof draft!=='string'||!draft.trim()||draft.length>2400)
  throw Error('R21_MODEL_OUTPUT_INVALID');
 return draft.trim();
}

export async function translateDirectNewsR21({sourceTitle,sourceExcerpt,fetcher=fetch}={}){
 try{
  // Serialize calls: the approved PC may run the 4B model in constrained RAM.
  const titleRaw=await translateRawR21(sourceTitle,fetcher);
  const excerptRaw=await translateRawR21(sourceExcerpt,fetcher);
  return evaluateDirectTranslationR21({sourceTitle,sourceExcerpt,titleRaw,excerptRaw});
 }catch(error){return {status:'R21_MODEL_REQUEST_FAILED',titleKo:null,excerptKo:null,
  warnings:[String(error?.message??'UNKNOWN_ERROR').slice(0,120)],
  terminologyWarnings:[String(error?.message??'UNKNOWN_ERROR').slice(0,120)],corrections:[],
  qualityAutomaticallyVerified:false,publication:'DISABLED'};}
}

export async function reviewDirectNewsR21({dataDirectory,now=Date.now(),fetcher=fetch,
 modelCheck=ensureTranslateGemmaR19,translate=translateDirectNewsR21}={}){
 if(typeof dataDirectory!=='string'||!path.isAbsolute(dataDirectory)||
  !fs.existsSync(path.join(dataDirectory,'iran.sqlite')))
  throw Error('R21_EXISTING_LEDGER_MISSING');
 const current=readNewsDisplayCache(dataDirectory);
 if(!Array.isArray(current.items)||visibleIranNewsItems(current.items,{now}).length===0)
  throw Error('R21_NO_VISIBLE_NEWS');
 const model=await modelCheck({fetcher,allowInstall:false});
 if(model.status!=='ALREADY_INSTALLED'&&model.status!=='NEWLY_INSTALLED')
  throw Error('R21_MODEL_NOT_INSTALLED_NO_DOWNLOAD');
 const base=await compareKoreanIranNewsR18({dataDirectory,now,fetcher,
  modelsOverride:[R19_MODEL],translate});
 const samples=base.results.filter(x=>x.translations?.length);
 return {status:'R21_DIRECT_SOURCE_TRANSLATION_READ_ONLY',model:R19_MODEL,
  visibleCount:base.visibleCount,preservedCount:base.preservedArticles,
  translatedCount:samples.length,heldSourceCount:base.heldArticles,
  semanticallyFlaggedCount:samples.filter(x=>x.translations[0].status!=='R21_DRAFT_HUMAN_REVIEW').length,
  samples:base.results,publication:'DISABLED',pcCacheWritten:false,d1Written:false,
  schedulerModified:false,scoreLedgerModified:false,modelDownloaded:false,
  qualityAutomaticallyVerified:false};
}

export function formatDirectReviewR21(report){
 const lines=['R21_DIRECT_TRANSLATION_QUALITY_READ_ONLY',
  'MODEL='+report.model,'MODEL_DOWNLOAD=DISABLED',
  'VISIBLE='+report.visibleCount,'PREVIOUS_KOREAN_PRESERVED='+report.preservedCount,
  'DRAFTS='+report.translatedCount,'GUARD_FLAGGED='+report.semanticallyFlaggedCount,
  'SOURCE_HELD='+report.heldSourceCount,
  'PUBLICATION=DISABLED','PC_CACHE_WRITTEN=NO','D1_WRITTEN=NO',
  'SCHEDULER_MODIFIED=NO','SCORE_LEDGER_MODIFIED=NO',
  'AUTOMATIC_QUALITY_VERIFIED=NO'];
 for(const [index,item] of report.samples.entries()){
  lines.push('',`ARTICLE_${index+1}_STATUS=${item.status}`, 'SOURCE_URL='+item.sourceUrl,
   'EN_TITLE='+item.titleOriginal);
  if(item.sourceExcerpt)lines.push('EN_SOURCE_EXCERPT='+item.sourceExcerpt);
  if(item.translations?.length){
   const translated=item.translations[0];
   lines.push('KO_TITLE='+String(translated.titleKo??''),
    'KO_EXCERPT='+String(translated.excerptKo??''),
    'GUARD_STATUS='+translated.status,
    'GUARD_WARNINGS_AND_CORRECTIONS='+translated.terminologyWarnings.join(','));
  }
 }
 lines.push('','FINAL_STATUS=R21_TRANSLATION_DRAFTS_NO_PUBLICATION');
 return lines.join('\n');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only')
  throw Error('R21_READ_ONLY_ONLY');
 const dataDirectory=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 try{
  const report=await reviewDirectNewsR21({dataDirectory});
  console.log(formatDirectReviewR21(report));
  if(report.translatedCount===0)process.exitCode=2;
 }catch(error){console.error('STOP_R21='+String(error?.message??'UNKNOWN_ERROR').slice(0,160));
  console.error('FINAL_STATUS=STOP_R21_NO_PUBLICATION');process.exitCode=1;}
}
