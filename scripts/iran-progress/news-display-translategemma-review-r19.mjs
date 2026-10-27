// R19: install approved free local translation model and review source-anchored drafts.
// No publication, PC news cache writes, D1 writes, score writes or scheduler edits.
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compareKoreanIranNewsR18,assessTranslationTerminology}
 from './news-display-translation-compare-r18.mjs';
import {validateTranslationDraft} from './news-display-translation-preview-r17.mjs';

export const R19_MODEL='translategemma:4b';
const OLLAMA='http://127.0.0.1:11434';

export function translationPromptR19(english){
 if(typeof english!=='string'||!english.trim()||english.length>1600)
  throw Error('R19_SOURCE_TEXT_INVALID');
 return [
  'You are a professional English (en) to Korean (ko) translator. Your goal is to accurately convey the meaning and nuances of the original English text while adhering to Korean grammar, vocabulary, and cultural sensitivities.',
  'Produce only the Korean translation, without any additional explanations or commentary. Please translate the following English text into Korean:',
  '',
  '',
  english.trim(),
 ].join('\n');
}

async function listModelNames(fetcher){
 const response=await fetcher(`${OLLAMA}/api/tags`,{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('R19_OLLAMA_TAGS_HTTP_'+response.status);
 const body=await response.json();
 if(!Array.isArray(body.models))throw Error('R19_OLLAMA_TAGS_INVALID');
 return body.models.map(item=>item?.name).filter(item=>typeof item==='string');
}

export async function ensureTranslateGemmaR19({fetcher=fetch,allowInstall=false,logger=()=>{}}={}){
 let available;
 try{available=await listModelNames(fetcher);}
 catch{throw Error('R19_LOCAL_OLLAMA_UNAVAILABLE');}
 if(available.includes(R19_MODEL))return {status:'ALREADY_INSTALLED',model:R19_MODEL};
 if(!allowInstall)return {status:'MODEL_NOT_INSTALLED',model:R19_MODEL};
 logger('MODEL_PULL_START='+R19_MODEL+' (free local model, approximately 3.3 GB)');
 const response=await fetcher(`${OLLAMA}/api/pull`,{
  method:'POST',headers:{'Content-Type':'application/json'},
  signal:AbortSignal.timeout(3600000),
  body:JSON.stringify({name:R19_MODEL,stream:true}),
 });
 if(!response.ok||!response.body)throw Error('R19_MODEL_PULL_HTTP_'+response.status);
 let buffer='',complete=false,lastMilestone=-1;
 const consume=line=>{
  if(!line.trim())return;
  let event;
  try{event=JSON.parse(line);}catch{throw Error('R19_MODEL_PULL_INVALID_STREAM');}
  if(event.error)throw Error('R19_MODEL_PULL_ERROR');
  if(event.status==='success')complete=true;
  if(event.total>0&&Number.isFinite(event.completed)){
   const milestone=Math.floor(100*event.completed/event.total/25)*25;
   if(milestone>lastMilestone){lastMilestone=milestone;logger('MODEL_PULL_PROGRESS='+milestone+'%');}
  }
 };
 for await (const chunk of response.body){
  buffer+=new TextDecoder().decode(chunk);
  if(buffer.length>1048576)throw Error('R19_MODEL_PULL_STREAM_TOO_LARGE');
  let index;
  while((index=buffer.indexOf('\n'))!==-1){
   const line=buffer.slice(0,index);buffer=buffer.slice(index+1);consume(line);
  }
 }
 if(buffer.trim())consume(buffer);
 if(!complete)throw Error('R19_MODEL_PULL_NO_SUCCESS');
 const refreshed=await listModelNames(fetcher);
 if(!refreshed.includes(R19_MODEL))throw Error('R19_MODEL_PULL_NOT_INSTALLED');
 logger('MODEL_PULL_COMPLETE='+R19_MODEL);
 return {status:'NEWLY_INSTALLED',model:R19_MODEL};
}

async function translateTextR19(english,fetcher){
 const response=await fetcher(`${OLLAMA}/api/chat`,{
  method:'POST',headers:{'Content-Type':'application/json'},
  signal:AbortSignal.timeout(180000),
  body:JSON.stringify({model:R19_MODEL,stream:false,think:false,
   options:{temperature:0,num_predict:720,num_ctx:4096},
   messages:[{role:'user',content:translationPromptR19(english)}]}),
 });
 if(!response.ok)throw Error('R19_MODEL_CHAT_HTTP_'+response.status);
 const body=await response.json();
 const korean=body.message?.content;
 if(typeof korean!=='string'||korean.length>2000)throw Error('R19_MODEL_BAD_RESPONSE');
 return korean.trim();
}

export async function translateArticleR19({sourceTitle,sourceExcerpt,fetcher=fetch}={}){
 try{
  // Deliberately separate calls: the translator is not asked to produce JSON.
  const titleKo=await translateTextR19(sourceTitle,fetcher);
  const excerptKo=await translateTextR19(sourceExcerpt,fetcher);
  const structural=validateTranslationDraft(JSON.stringify({titleKo,excerptKo}),
   {sourceTitle,sourceExcerpt});
  const terminologyWarnings=[
   ...assessTranslationTerminology(sourceTitle,titleKo).map(term=>'TITLE_'+term),
   ...assessTranslationTerminology(sourceExcerpt,excerptKo).map(term=>'EXCERPT_'+term),
  ];
  const status=structural.status==='DRAFT_REQUIRES_HUMAN_REVIEW'&&terminologyWarnings.length
   ?'TERMINOLOGY_REVIEW_REQUIRED':structural.status;
  return {status,titleKo,excerptKo,failedTopic:structural.topic??null,terminologyWarnings};
 }catch(error){
  return {status:'MODEL_REQUEST_FAILED',failedTopic:null,terminologyWarnings:[],
   reason:String(error?.message??'R19_UNKNOWN_MODEL_ERROR').slice(0,120)};
 }
}

export async function inspectTranslateGemmaNewsR19({dataDirectory,now=Date.now(),
 fetcher=fetch,allowInstall=false,logger=()=>{},modelCheck=ensureTranslateGemmaR19,
 translate=translateArticleR19}={}){
 const installation=await modelCheck({fetcher,allowInstall,logger});
 const available=installation.status==='ALREADY_INSTALLED'||installation.status==='NEWLY_INSTALLED';
 const base=await compareKoreanIranNewsR18({dataDirectory,now,fetcher,
  modelsOverride:available?[R19_MODEL]:[],translate});
 const translatedCount=base.results.filter(item=>item.status==='COMPARE_DRAFTS_HUMAN_REVIEW_REQUIRED').length;
 const warningCount=base.results.filter(item=>item.translations?.some(t=>t.status!=='DRAFT_REQUIRES_HUMAN_REVIEW')).length;
 return {status:'R19_TRANSLATEGEMMA_KOREAN_DRAFTS_REVIEW_ONLY',model:R19_MODEL,
  installation:installation.status,visibleCount:base.visibleCount,translatedCount,
  preservedCount:base.preservedArticles,heldCount:base.heldArticles,warningCount,
  results:base.results,publication:'DISABLED',pcCacheWritten:false,d1Written:false,
  schedulerModified:false,scoreLedgerModified:false,
  translationAutoApproved:false,
  note:'A passing structural guard never proves translation accuracy. Human review is mandatory.'};
}

export function formatTranslateGemmaReportR19(report){
 const lines=[
  'R19_TRANSLATEGEMMA_KOREAN_REVIEW_REPORT',
  'MODEL='+report.model,
  'MODEL_INSTALLATION='+report.installation,
  'ARTICLES_VISIBLE='+report.visibleCount,
  'ARTICLES_TRANSLATED_DRAFT_ONLY='+report.translatedCount,
  'ARTICLES_PRESERVED='+report.preservedCount,
  'ARTICLES_HELD='+report.heldCount,
  'AUTOMATIC_QUALITY_APPROVAL=NO',
  'PUBLICATION=DISABLED',
  'PC_CACHE_WRITTEN=NO',
  'D1_WRITTEN=NO',
  'SCHEDULER_MODIFIED=NO',
  'SCORE_LEDGER_MODIFIED=NO',
 ];
 for(const [index,item] of report.results.entries()){
  lines.push('',`ARTICLE_${index+1}_STATUS=${item.status}`,
   'SOURCE_URL='+item.sourceUrl,'EN_TITLE='+item.titleOriginal);
  if(item.sourceExcerpt)lines.push('EN_SOURCE_EXCERPT='+item.sourceExcerpt);
  if(item.translations?.length){
   const t=item.translations[0];
   lines.push('KO_TITLE='+String(t.titleKo??''),'KO_EXCERPT='+String(t.excerptKo??''),
    'VALIDATION_STATUS='+t.status,
    'FAILED_TOPIC='+String(t.failedTopic??''),
    'TERMINOLOGY_WARNINGS='+t.terminologyWarnings.join(','));
  }
 }
 lines.push('','FINAL_STATUS=R19_TRANSLATION_DRAFTS_REQUIRE_HUMAN_REVIEW_NO_PUBLICATION');
 return lines.join('\n');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--install-and-read-only')
  throw Error('R19_ONLY_APPROVED_INSTALL_AND_READ_ONLY');
 const dataDirectory=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 try{
  const report=await inspectTranslateGemmaNewsR19({dataDirectory,allowInstall:true,
   logger:line=>console.log(line)});
  console.log(formatTranslateGemmaReportR19(report));
  if(!['ALREADY_INSTALLED','NEWLY_INSTALLED'].includes(report.installation)||
   report.translatedCount<1)process.exitCode=2;
 }catch(error){
  console.error('STOP_R19='+String(error?.message??'UNKNOWN_ERROR').slice(0,200));
  console.error('FINAL_STATUS=STOP_R19_NO_PUBLICATION');process.exitCode=1;
 }
}
