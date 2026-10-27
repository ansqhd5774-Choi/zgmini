// R17: existing published headlines -> source-anchored Korean translation preview.
// READ ONLY. In particular, do not alter the six-hour R15 hook, D1 or score data.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {boundedRead} from './sources.mjs';
import {readNewsDisplayCache} from './news-display-io-r1.mjs';
import {assessGovUkNewsRights} from './news-display-safe-preview-r12.mjs';
import {plainNewsBody} from './news-display-model-shadow-r10.mjs';
import {selectRelevantSourceExcerpt} from './news-display-safe-preview-r12.mjs';
export {selectRelevantSourceExcerpt} from './news-display-safe-preview-r12.mjs';
import {visibleIranNewsItems,validNewsDisplayItem} from '../../lib/iran-progress/news-display-r1.mjs';

const OLLAMA_URL='http://127.0.0.1:11434';
const PREFERRED_MODELS=['qwen3:4b','gemma3:4b'];
const TRANSLATION_FORMAT={type:'object',additionalProperties:false,
 required:['titleKo','excerptKo'],properties:{titleKo:{type:'string'},excerptKo:{type:'string'}}};
const COUNTRY_GUARDS=[
 ['Iran',/\biran(?:ian)?s?\b/i,/이란/],
 ['Saudi',/\bsaudis?\b/i,/사우디/],
 ['Yemen',/\byemen(?:is?)?\b/i,/예멘|예맨/],
 ['Houthi',/\bhouthis?\b/i,/후티/],
 ['Israel',/\bisrael(?:i)?s?\b/i,/이스라엘/],
 ['United States',/\b(?:united states|american(?:s)?|usa)\b|\bU\.S\.(?=\s|$)/i,/미국/],
 ['United Kingdom',/\b(?:united kingdom|britain|british|uk)\b/i,/영국/],
 ['Palestine',/\bpalestin(?:e|ian(?:s)?)\b/i,/팔레스타인/],
 ['Gaza',/\bgaza\b/i,/가자/],
 ['Hamas',/\bhamas\b/i,/하마스/],
 ['Russia',/\brussia(?:n)?s?\b/i,/러시아/],
 ['China',/\bchin(?:a|ese)\b/i,/중국/],
 ['Turkey',/\b(?:turkey|t(?:ü|u)rkiye|turkish)\b/i,/튀르키예|터키/],
];

export function validateTranslationDraft(raw,{sourceTitle,sourceExcerpt}={}){
 let parsed;
 try{parsed=typeof raw==='string'&&raw.length<=4000?JSON.parse(raw):null;}catch{return {status:'INVALID_JSON'};}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||
  Object.keys(parsed).sort().join(',')!=='excerptKo,titleKo'||
  typeof parsed.titleKo!=='string'||typeof parsed.excerptKo!=='string')
  return {status:'INVALID_FORMAT'};
 const titleKo=parsed.titleKo.trim(),excerptKo=parsed.excerptKo.trim();
 if(titleKo.length<5||titleKo.length>500||excerptKo.length<12||excerptKo.length>1000||
  !/[가-힣]/.test(titleKo)||!/[가-힣]/.test(excerptKo))return {status:'NOT_KOREAN_TEXT'};
 if(/[\r\n]/.test(titleKo+excerptKo)||/[<>]/.test(titleKo+excerptKo))
  return {status:'UNSAFE_FORMATTING'};
 const digitTokens=text=>(text.match(/\d+(?:[,.]\d+)*/g)??[]).sort().join('|');
 if(digitTokens(sourceTitle)!==digitTokens(titleKo)||
  digitTokens(sourceExcerpt)!==digitTokens(excerptKo))return {status:'NUMERIC_FACT_DRIFT'};
 for(const [label,english,korean] of COUNTRY_GUARDS){
  if(english.test(sourceTitle)!==korean.test(titleKo)||
   english.test(sourceExcerpt)!==korean.test(excerptKo))
   return {status:'NAMED_ACTOR_TRANSLATION_MISMATCH',topic:label};
 }
 return {status:'DRAFT_REQUIRES_HUMAN_REVIEW',titleKo,excerptKo};
}

async function availableOllamaModel(fetcher){
 try{
  const response=await fetcher(`${OLLAMA_URL}/api/tags`,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)return null;
  const tags=await response.json();
  const names=new Set((tags.models??[]).map(x=>x?.name));
  return PREFERRED_MODELS.find(name=>names.has(name))??null;
 }catch{return null;}
}

async function translateOne({sourceTitle,sourceExcerpt,model,fetcher}){
 const request={model,stream:false,think:false,format:TRANSLATION_FORMAT,
  options:{temperature:0,num_predict:450},messages:[{role:'user',content:[
   '당신은 영국 정부 공식 문서를 한국어로 옮기는 전문 번역가입니다.',
   '아래 영어 원제목과 관련 원문 발췌를 각각 충실하게 한국어로 직역에 가깝게 번역하십시오.',
   '뉴스를 새로 쓰거나 요약·배경 추가·정치적 해석·영향 판단을 하지 마십시오.',
   '원문에 없는 국가·사람·행위·날짜·수치·인과관계를 추가하지 마십시오.',
   '부정·인용·시제·조건·가능성을 바꾸지 마십시오. 숫자는 원문 표기를 유지하십시오.',
   'titleKo는 영어 제목의 번역, excerptKo는 발췌 한 문장의 번역입니다.',
   '정확히 JSON 필드 titleKo, excerptKo만 반환하십시오.',
   `영어 제목: ${sourceTitle}`,
   `관련 원문 발췌: ${sourceExcerpt}`,
  ].join('\n')}]};
 try{
  const response=await fetcher(`${OLLAMA_URL}/api/chat`,{method:'POST',
   signal:AbortSignal.timeout(120000),headers:{'Content-Type':'application/json'},
   body:JSON.stringify(request)});
  if(!response.ok)return {status:'LOCAL_MODEL_HTTP_FAILED'};
  const data=await response.json();
  return validateTranslationDraft(data.message?.content,{sourceTitle,sourceExcerpt});
 }catch{return {status:'LOCAL_MODEL_FAILED'};}
}

export async function previewKoreanPublishedIranNewsR17({dataDirectory,now=Date.now(),fetcher=fetch,
 translate=translateOne,modelOverride}={}){
 if(typeof dataDirectory!=='string'||!path.isAbsolute(dataDirectory))
  throw Error('R17_LOCAL_DATA_DIRECTORY_REQUIRED');
 const ledger=path.join(dataDirectory,'iran.sqlite');
 if(!fs.existsSync(ledger)||!fs.lstatSync(ledger).isFile())throw Error('R17_SCORE_LEDGER_NOT_FOUND');
 const cache=readNewsDisplayCache(dataDirectory);
 if(!cache.items.every(item=>validNewsDisplayItem(item,now)))throw Error('R17_CACHE_CONTRACT_INVALID');
 const visible=visibleIranNewsItems(cache.items,{now});
 const model=modelOverride===undefined?await availableOllamaModel(fetcher):modelOverride;
 const results=[];
 for(const item of visible){
  const current={id:item.id,sourceUrl:item.sourceUrl,publishedAt:item.publishedAt,
   originalTitle:item.title,currentSummary:item.summary};
  if(/[가-힣]/.test(item.title)&&!item.summary.includes('상세 내용은 원문에서 확인')){
   results.push({...current,status:'PREVIOUS_KOREAN_REVIEW_PRESERVED'});continue;
  }
  if(!model){results.push({...current,status:'NO_APPROVED_LOCAL_MODEL'});continue;}
  try{
   const sourceUrl=new URL(item.sourceUrl);
   if(sourceUrl.protocol!=='https:'||sourceUrl.hostname!=='www.gov.uk'||
    !sourceUrl.pathname.startsWith('/government/')||sourceUrl.port||
    sourceUrl.username||sourceUrl.password)throw Error('SOURCE_DOMAIN_INVALID');
   const pathname=sourceUrl.pathname;
   const [api,page]=await Promise.all([
    boundedRead('https://www.gov.uk/api/content'+pathname,{fetcher,maxBytes:4000000}),
    boundedRead(item.sourceUrl,{fetcher,maxBytes:3000000}),
   ]);
   if(api.status!=='COLLECTED'||page.status!=='COLLECTED'){
    results.push({...current,status:'SOURCE_UNAVAILABLE'});continue;
   }
   const content=JSON.parse(api.body);
   if(content.base_path!==pathname||content.withdrawn===true||
    Date.parse(content.first_published_at??'')!==Date.parse(item.publishedAt)||
    content.title!==item.title){
    results.push({...current,status:'SOURCE_IDENTITY_CHANGED'});continue;
   }
   const rights=assessGovUkNewsRights(content,page.body);
   if(rights.status!=='RIGHTS_CROWN_TEXT_ONLY'){
    results.push({...current,status:rights.status});continue;
   }
   const sourceExcerpt=selectRelevantSourceExcerpt(content.details?.body??'');
   if(!sourceExcerpt){results.push({...current,status:'NO_SHORT_RELEVANT_SOURCE_SENTENCE'});continue;}
   const drafted=await translate({sourceTitle:item.title,sourceExcerpt,model,fetcher});
   results.push({...current,sourceExcerpt,model,status:drafted.status,
    titleKo:drafted.titleKo??null,excerptKo:drafted.excerptKo??null,
    gateTopic:drafted.topic??null});
  }catch{results.push({...current,status:'TRANSLATION_SOURCE_CHECK_FAILED'});}
 }
 return {status:'R17_KOREAN_TRANSLATION_REVIEW_ONLY',source:'GOV.UK',
  model:model??null,visibleCount:visible.length,
  translatedDrafts:results.filter(x=>x.status==='DRAFT_REQUIRES_HUMAN_REVIEW').length,
  preservedKorean:results.filter(x=>x.status==='PREVIOUS_KOREAN_REVIEW_PRESERVED').length,
  heldCount:results.filter(x=>!['DRAFT_REQUIRES_HUMAN_REVIEW','PREVIOUS_KOREAN_REVIEW_PRESERVED'].includes(x.status)).length,
  results,publication:'DISABLED',pcCacheWritten:false,d1Written:false,
  schedulerModified:false,scoreLedgerModified:false,
  note:'Machine translations are drafts, not fact-checked or published. Existing public English headlines remain until explicit guarded migration.'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only')throw Error('R17_READ_ONLY_ONLY');
 const directory=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 try{const report=await previewKoreanPublishedIranNewsR17({dataDirectory:directory});
  console.log(JSON.stringify(report));if(report.translatedDrafts===0)process.exitCode=2;
 }catch(error){console.error(JSON.stringify({status:'STOP_R17_READ_ONLY',reason:error.message,
  pcCacheWritten:false,d1Written:false}));process.exitCode=1;}
}
