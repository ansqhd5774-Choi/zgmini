// R18: forensic comparison of two installed local translators. Read-only.
// All source text and translations are reported for human semantic review;
// a structurally valid draft must never be promoted to an automatic fact-check.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {boundedRead} from './sources.mjs';
import {readNewsDisplayCache} from './news-display-io-r1.mjs';
import {assessGovUkNewsRights} from './news-display-safe-preview-r12.mjs';
import {selectRelevantSourceExcerpt,validateTranslationDraft}
 from './news-display-translation-preview-r17.mjs';
import {visibleIranNewsItems,validNewsDisplayItem} from '../../lib/iran-progress/news-display-r1.mjs';

const OLLAMA='http://127.0.0.1:11434';
const MODELS=['qwen3:4b','gemma3:4b'];
const OUTPUT_SCHEMA={type:'object',additionalProperties:false,
 required:['titleKo','excerptKo'],properties:{titleKo:{type:'string'},excerptKo:{type:'string'}}};
const DOMAIN_TERMS=[
 {term:'deterrence',pattern:/\bdeterrence\b/i,correct:/억지력/},
 {term:'safeguards',pattern:/\bsafeguards\b/i,correct:/안전조치/},
 {term:'commercial ships',pattern:/\bcommercial ships\b/i,correct:/상선|상업용 선박/},
 {term:'DPRK',pattern:/\bDPRK\b/i,correct:/북한|조선민주주의인민공화국/},
];

export function assessTranslationTerminology(english,korean){
 if(typeof english!=='string'||typeof korean!=='string')return [];
 return DOMAIN_TERMS.filter(x=>x.pattern.test(english)&&!x.correct.test(korean)).map(x=>x.term);
}

export function inspectTranslationResponse(raw,sourceTitle,sourceExcerpt){
 let parsed;
 try{parsed=JSON.parse(raw);}catch{return {status:'INVALID_JSON',titleKo:null,excerptKo:null,terminologyWarnings:[]};}
 const titleKo=typeof parsed?.titleKo==='string'?parsed.titleKo.slice(0,600):null;
 const excerptKo=typeof parsed?.excerptKo==='string'?parsed.excerptKo.slice(0,1300):null;
 const structural=validateTranslationDraft(raw,{sourceTitle,sourceExcerpt});
 const terminologyWarnings=[
  ...assessTranslationTerminology(sourceTitle,titleKo).map(s=>'TITLE_'+s),
  ...assessTranslationTerminology(sourceExcerpt,excerptKo).map(s=>'EXCERPT_'+s),
 ];
 return {status:structural.status,failedTopic:structural.topic??null,
  titleKo,excerptKo,terminologyWarnings};
}

async function installedModels(fetcher){
 try{
  const response=await fetcher(`${OLLAMA}/api/tags`,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)return [];
  const available=new Set((await response.json()).models?.map(x=>x.name)??[]);
  return MODELS.filter(name=>available.has(name));
 }catch{return [];}
}

async function queryModel({model,sourceTitle,sourceExcerpt,fetcher}){
 const prompt=[
  '공식 정부 문서 한영 번역 검수 실험입니다. 아래 영어 2개 문구를 각각 빠짐없이 정확하게 한국어로 번역하십시오.',
  '절대로 새 이야기를 만들거나, 배경 설명을 보태거나, 요약하거나, 해석하지 마십시오.',
  '숫자(날짜·연도·회의 차수 포함)는 원문의 아라비아 숫자를 단 한 개도 생략하거나 바꾸지 마십시오.',
  '고유명사, 국가, 기관, 지명, 긍정/부정, 시제, 가능성, 인용의 원래 의미를 정확히 유지하십시오.',
  '용어집: deterrence=억지력; nuclear safeguards=핵 안전조치; commercial ships=상선;',
  'DPRK=북한; Strait of Hormuz=호르무즈 해협; UN Security Council=유엔 안전보장이사회.',
  '용어집 단어가 없는 원문에는 그 단어를 새로 쓰지 마십시오.',
  '영어 본문은 한 문장입니다. excerptKo는 그 문장의 번역이며 의견이나 요약이 아닙니다.',
  '출력은 titleKo와 excerptKo의 두 문자열만 포함한 JSON입니다.',
  `[원제목]\n${sourceTitle}\n[/원제목]`,
  `[관련 원문 1문장]\n${sourceExcerpt}\n[/관련 원문 1문장]`,
 ].join('\n');
 try{
  const response=await fetcher(`${OLLAMA}/api/chat`,{method:'POST',
   signal:AbortSignal.timeout(120000),headers:{'Content-Type':'application/json'},
   body:JSON.stringify({model,stream:false,think:false,format:OUTPUT_SCHEMA,
    options:{temperature:0,num_predict:540},messages:[{role:'user',content:prompt}]})});
  if(!response.ok)return {model,status:'MODEL_HTTP_FAILED',httpStatus:response.status};
  const data=await response.json();
  const inspected=inspectTranslationResponse(data.message?.content??'',sourceTitle,sourceExcerpt);
  return {model,...inspected};
 }catch{return {model,status:'MODEL_REQUEST_FAILED'};}
}

export async function compareKoreanIranNewsR18({dataDirectory,now=Date.now(),fetcher=fetch,
 modelsOverride,translate=queryModel}={}){
 if(typeof dataDirectory!=='string'||!path.isAbsolute(dataDirectory))throw Error('R18_DATA_DIRECTORY_INVALID');
 const ledger=path.join(dataDirectory,'iran.sqlite');
 if(!fs.existsSync(ledger)||!fs.lstatSync(ledger).isFile())throw Error('R18_SCORE_LEDGER_MISSING');
 const cache=readNewsDisplayCache(dataDirectory);
 if(!cache.items.every(item=>validNewsDisplayItem(item,now)))throw Error('R18_CACHE_INVALID');
 const visible=visibleIranNewsItems(cache.items,{now});
 const models=modelsOverride??await installedModels(fetcher);
 const results=[];
 for(const item of visible){
  const current={id:item.id,sourceUrl:item.sourceUrl,publishedAt:item.publishedAt,
   titleOriginal:item.title,summaryOriginal:item.summary};
  if(/[가-힣]/.test(item.title)&&!item.summary.includes('상세 내용은 원문에서 확인')){
   results.push({...current,status:'PREVIOUS_KOREAN_PRESERVED'});continue;
  }
  if(!models.length){results.push({...current,status:'LOCAL_MODEL_UNAVAILABLE'});continue;}
  try{
   const sourceUrl=new URL(item.sourceUrl);
   if(sourceUrl.protocol!=='https:'||sourceUrl.hostname!=='www.gov.uk'||
    !sourceUrl.pathname.startsWith('/government/')||sourceUrl.port||
    sourceUrl.username||sourceUrl.password)throw Error('UNTRUSTED_URL');
   const [api,page]=await Promise.all([
    boundedRead('https://www.gov.uk/api/content'+sourceUrl.pathname,{fetcher,maxBytes:4000000}),
    boundedRead(sourceUrl.href,{fetcher,maxBytes:3000000}),
   ]);
   if(api.status!=='COLLECTED'||page.status!=='COLLECTED'){
    results.push({...current,status:'SOURCE_UNAVAILABLE'});continue;
   }
   const source=JSON.parse(api.body);
   if(source.base_path!==sourceUrl.pathname||source.withdrawn===true||
    Date.parse(source.first_published_at??'')!==Date.parse(item.publishedAt)||
    source.title!==item.title){results.push({...current,status:'SOURCE_IDENTITY_CHANGED'});continue;}
   const rights=assessGovUkNewsRights(source,page.body);
   if(rights.status!=='RIGHTS_CROWN_TEXT_ONLY'){
    results.push({...current,status:rights.status});continue;
   }
   const excerpt=selectRelevantSourceExcerpt(source.details?.body??'');
   if(!excerpt){results.push({...current,status:'NO_COMPLETE_TOPIC_SENTENCE'});continue;}
   const translations=[];
   for(const model of models){
    const draft=await translate({model,sourceTitle:item.title,sourceExcerpt:excerpt,fetcher});
    translations.push({model,status:draft.status,titleKo:draft.titleKo??null,
     excerptKo:draft.excerptKo??null,failedTopic:draft.failedTopic??null,
     terminologyWarnings:draft.terminologyWarnings??[]});
   }
   results.push({...current,status:'COMPARE_DRAFTS_HUMAN_REVIEW_REQUIRED',sourceExcerpt:excerpt,translations});
  }catch{results.push({...current,status:'SOURCE_CHECK_FAILED'});}
 }
 return {status:'R18_DUAL_KOREAN_TRANSLATION_DIAGNOSTIC_ONLY',visibleCount:visible.length,
  installedComparedModels:models,comparedArticles:results.filter(r=>r.status==='COMPARE_DRAFTS_HUMAN_REVIEW_REQUIRED').length,
  preservedArticles:results.filter(r=>r.status==='PREVIOUS_KOREAN_PRESERVED').length,
  heldArticles:results.filter(r=>!['COMPARE_DRAFTS_HUMAN_REVIEW_REQUIRED','PREVIOUS_KOREAN_PRESERVED'].includes(r.status)).length,
  results,publication:'DISABLED',pcCacheWritten:false,d1Written:false,
  schedulerModified:false,scoreLedgerModified:false,
  note:'All model text is a diagnostic draft. A format PASS does not imply semantic accuracy.'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only')throw Error('R18_READ_ONLY_ONLY');
 const dataDirectory=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 try{
  const report=await compareKoreanIranNewsR18({dataDirectory});console.log(JSON.stringify(report));
  if(report.comparedArticles===0||report.installedComparedModels.length<2)process.exitCode=2;
 }catch(error){console.error(JSON.stringify({status:'STOP_R18_READ_ONLY',reason:error.message,
  publication:'DISABLED',pcCacheWritten:false,d1Written:false}));process.exitCode=1;}
}
