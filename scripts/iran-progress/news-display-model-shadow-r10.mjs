// R10: full four-topic discovery and isolated local-Ollama quality/latency trial.
// Reading official sources and POSTing to LOCAL Ollama is permitted; no D1,
// cache, score ledger, schedule, launcher, or website publication writes.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {boundedRead} from './sources.mjs';
import {discoverGovUkNewsCandidates,matchesIranNewsDisplayKeywords} from './news-display-discover-r1.mjs';
import {kstDayWindow,kstNewsDay} from '../../lib/iran-progress/news-display-r1.mjs';

const OLLAMA_ORIGIN='http://127.0.0.1:11434';
const MODELS=['gemma3:4b','qwen3:4b'];
const MAX_SAMPLE_ARTICLES=2;
const MAX_MODEL_CALLS=4;
const STRUCTURED_RESULT={type:'object',additionalProperties:false,
 required:['summary','impact'],properties:{summary:{type:'string'},impact:{type:'string',enum:['positive','negative','neutral']}}};

export function plainNewsBody(html){
 if(typeof html!=='string')return '';
 return html.replace(/<\s*(?:script|style|noscript)\b[^>]*>[\s\S]*?<\/\s*(?:script|style|noscript)\s*>/gi,' ')
  .replace(/<[^>]*>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,c)=>{
   const n=c[0].toLowerCase()==='x'?parseInt(c.slice(1),16):parseInt(c,10);
   return n>0&&n<=0x10ffff?String.fromCodePoint(n):' ';
  }).replace(/&(amp|lt|gt|quot|apos|nbsp);/gi,(_,c)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[c.toLowerCase()])
  .replace(/\s+/g,' ').trim();
}
export function validateLocalModelDraft(message){
 if(typeof message!=='string'||message.length>2000)return {status:'INVALID_JSON'};
 let parsed;
 try{parsed=JSON.parse(message);}catch{return {status:'INVALID_JSON'};}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||
  Object.keys(parsed).sort().join(',')!=='impact,summary'||
  typeof parsed.summary!=='string'||parsed.summary.trim().length<20||
  parsed.summary.length>300||!/[가-힣]/.test(parsed.summary)||
  !['positive','negative','neutral'].includes(parsed.impact))return {status:'INVALID_DRAFT'};
 return {status:'VALID_SHADOW_DRAFT',summary:parsed.summary.trim(),impact:parsed.impact};
}
function localPrompt(article,body){
 return [
  '다음은 GOV.UK의 공식 발표야. 뉴스 표시를 위한 한국어 초안을 생성해.',
  '반드시 본문에 실제로 명시된 사실만 사용하고 추측·배경지식·정치적 평가·없는 수치를 추가하지 마.',
  '제목·설명·본문의 사실을 한국어 1~2문장, 60~180자 이내로 자연스럽게 요약해.',
  '영향 분류: positive=분쟁의 실제 휴전/종전/긴장완화 진전, negative=실제 군사확전/공격/긴장고조, neutral=그 외 또는 불확실.',
  '키워드 해당 여부는 이미 결정됐으니 임의로 뉴스를 제외하거나 중요도 등급을 만들지 마.',
  '응답은 JSON 스키마에 맞는 summary, impact 두 필드만 반환해.',
  `제목: ${article.title}`,
  `설명: ${article.sourceDescription??''}`,
  `공식 본문: ${body.slice(0,3000)}`,
 ].join('\n');
}
async function getModels(fetcher){
 try{
  const result=await boundedRead(`${OLLAMA_ORIGIN}/api/tags`,{fetcher,maxBytes:256000});
  if(result.status!=='COLLECTED')return [];
  const body=JSON.parse(result.body);
  return Array.isArray(body.models)?body.models.map(m=>m.name).filter(n=>typeof n==='string'):[];
 }catch{return [];}
}
async function sampleBody(article,fetcher){
 const contentUrl='https://www.gov.uk/api/content'+new URL(article.sourceUrl).pathname;
 try{
  const result=await boundedRead(contentUrl,{fetcher,maxBytes:4000000});
  if(result.status!=='COLLECTED')return {status:'BODY_UNAVAILABLE'};
  const content=JSON.parse(result.body);
  if(content.base_path!==new URL(article.sourceUrl).pathname||content.withdrawn===true)return {status:'BODY_METADATA_MISMATCH'};
  if(Date.parse(content.first_published_at??'')!==Date.parse(article.publishedAt))return {status:'BODY_DATE_MISMATCH'};
  const body=plainNewsBody(content.details?.body??'');
  if(!body)return {status:'BODY_UNAVAILABLE'};
  if(!matchesIranNewsDisplayKeywords([article.title,article.sourceDescription??'',body].join(' ')))return {status:'OUT_OF_SCOPE'};
  // Diagnostics only: a GOV.UK domain is not proof that EVERY passage is OGL.
  const thirdPartySignal=/(?:©|copyright|rights reserved|third.party|reproduced with permission|photo credit)/i.test(body);
  return {status:'BODY_AVAILABLE',body,documentType:content.document_type??null,thirdPartySignal};
 }catch{return {status:'BODY_UNAVAILABLE'};}
}
async function runModel(article,body,model,fetcher){
 const started=performance.now();
 try{
  const response=await fetcher(`${OLLAMA_ORIGIN}/api/chat`,{
   method:'POST',signal:AbortSignal.timeout(120000),
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({model,stream:false,think:false,format:STRUCTURED_RESULT,
    options:{temperature:0,num_predict:300},
    messages:[{role:'user',content:localPrompt(article,body)}]}),
  });
  const elapsedMs=Math.round(performance.now()-started);
  if(!response.ok)return {model,status:'MODEL_HTTP_FAILED',httpStatus:response.status,elapsedMs};
  const data=await response.json();
  const draft=validateLocalModelDraft(data.message?.content??'');
  return {model,status:draft.status,elapsedMs,impact:draft.impact??null,
   summary:draft.summary??null,evalCount:data.eval_count??null,
   promptEvalCount:data.prompt_eval_count??null};
 }catch{return {model,status:'MODEL_REQUEST_FAILED',elapsedMs:Math.round(performance.now()-started)};}
}
export async function runNewsModelShadowR10({now=Date.now(),fetcher=fetch}={}){
 const discovered=await discoverGovUkNewsCandidates({now,fetcher});
 const {start}=kstDayWindow(now,14);
 const current=discovered.candidates.filter(item=>kstNewsDay(Date.parse(item.publishedAt))>=start);
 const installed=await getModels(fetcher),tested=MODELS.filter(model=>installed.includes(model));
 const samples=[];
 // Sampling is deliberately capped; production must process the entire backlog.
 for(const article of current.slice(0,MAX_SAMPLE_ARTICLES)){
  const detail=await sampleBody(article,fetcher);
  const record={sourceUrl:article.sourceUrl,title:article.title,
   firstPublishedAt:article.publishedAt,bodyStatus:detail.status,
   documentType:detail.documentType??null,thirdPartySignal:detail.thirdPartySignal??null,results:[]};
  if(detail.status==='BODY_AVAILABLE'){
   for(const model of tested){
    if(samples.reduce((count,s)=>count+s.results.length,0)+record.results.length>=MAX_MODEL_CALLS)break;
    record.results.push(await runModel(article,detail.body,model,fetcher));
   }
  }
  samples.push(record);
 }
 const modelCalls=samples.flatMap(item=>item.results);
 return {status:'R10_SHADOW_ONLY_NO_PUBLICATION',nowKst:new Date(now+9*3600000).toISOString().slice(0,19).replace('T',' '),
  source:discovered.source,discoveryStatus:discovered.status,
  counts:discovered.counts,unique30DayCandidates:discovered.count,
  unique14DayCandidates:current.length,topics:'Iran OR Saudi OR Yemen OR Houthi',
  installedModels:installed.slice(0,10),testedModels:tested,
  modelCallCount:modelCalls.length,validModelCalls:modelCalls.filter(r=>r.status==='VALID_SHADOW_DRAFT').length,
  samples,rightsGate:'REQUIRES_PER_ARTICLE_NON_THIRD_PARTY_VERIFICATION',
  publication:'DISABLED_READ_ONLY',cacheModified:false,d1Written:false,
  scoreLedgerModified:false,schedulerModified:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only')throw Error('R10_SHADOW_READ_ONLY_ONLY');
 try{const result=await runNewsModelShadowR10();console.log(JSON.stringify(result));
  if(result.testedModels.length===0||result.modelCallCount>0&&result.validModelCalls===0)process.exitCode=2;
 }catch(error){console.error(JSON.stringify({status:'R10_SHADOW_FAILED',reason:error.message,publication:'DISABLED'}));process.exitCode=1;}
}
