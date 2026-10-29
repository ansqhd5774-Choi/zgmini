// Independent, bounded Ollama R1 diagnostic. No writes, task changes or D1 publication.
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT='E:\\ZGmini\\projects\\iran-news-analysis-r1-56eec668';
const SOURCE=path.join(ROOT,'scripts','iran-progress','news-r41-auto-interpret-r1.mjs');
const ENDPOINT='http://127.0.0.1:11434';
const MODEL='gemma3:4b';
const safeMessage=value=>String(value??'').replace(/[A-Z]:\\[^\s,"']+/gi,'[LOCAL_PATH]')
 .replace(/\/(?:home|Users|root|tmp)\/[^\s,"']+/g,'[LOCAL_PATH]')
 .replace(/(?:api[_-]?key|password|token)\s*[:=]\s*[^\s,"']+/gi,'[SECRET]')
 .replace(/[\r\n\t]+/g,' ').slice(0,260);
function failureKind(value){
 const text=String(value??'').toLowerCase();
 if(/out of memory|not enough memory|insufficient memory|failed to allocate|allocation failed|vram|cuda.*memory/.test(text))return 'MEMORY';
 if(/runner|model loading|load model|model load|llama.*error|terminated|gpu driver/.test(text))return 'RUNNER_OR_MODEL_LOAD';
 if(/schema|json|format|grammar/.test(text))return 'STRUCTURED_FORMAT';
 if(/context|token limit|too many tokens/.test(text))return 'CONTEXT';
 if(/busy|overload|timeout|timed out/.test(text))return 'BUSY_OR_TIMEOUT';
 return 'UNCLASSIFIED';
}
async function getApi(route,timeout=7000){
 try{
  const res=await fetch(ENDPOINT+route,{signal:AbortSignal.timeout(timeout)});
  const body=await res.text();
  return {status:res.status,data:res.ok?JSON.parse(body):null,
   failure:res.ok?undefined:safeMessage(body)};
 }catch(error){return {status:'FETCH_FAILED',failure:safeMessage(error.message)};}
}
async function postProbe(label,request,timeout=90000){
 try{
  const res=await fetch(ENDPOINT+'/api/generate',{method:'POST',
   headers:{'content-type':'application/json'},body:JSON.stringify(request),
   signal:AbortSignal.timeout(timeout)});
  const body=await res.text();
  if(!res.ok){
   let reason=body;
   try{reason=JSON.parse(body).error??body;}catch{}
   return {name:label,httpStatus:res.status,result:'MODEL_SERVER_ERROR',
    category:failureKind(reason),details:safeMessage(reason)};
  }
  let parsed;
  try{parsed=JSON.parse(body);}catch{}
  return {name:label,httpStatus:res.status,
   result:typeof parsed?.response==='string'?'RESPONSE_RECEIVED':'RESPONSE_INVALID',
   responseChars:parsed?.response?.length??0};
 }catch(error){return {name:label,result:'REQUEST_FAILED',
  category:failureKind(error.message),details:safeMessage(error.message)};}
}
const basic={model:MODEL,stream:false,options:{temperature:0,num_predict:80}};
const fullSchema={type:'object',additionalProperties:false,
 required:['titleKo','summaryKo','interpretationKo','impact','supportingQuotes'],
 properties:{titleKo:{type:'string'},summaryKo:{type:'string'},
  interpretationKo:{type:'string'},impact:{type:'string',enum:['positive','negative','neutral']},
  supportingQuotes:{type:'array',minItems:1,maxItems:3,items:{type:'string'}}}};
const report={version:'IRAN_NEWS_ANALYSIS_R1_OLLAMA_DIAGNOSTIC',
 timestamp:new Date().toISOString(),scope:'OLLAMA_AND_GOVUK_ONLY',
 localChanges:0,taskChanges:0,r5ScoreChanges:0,d1Writes:0,
 ram:{totalGiB:Number((os.totalmem()/2**30).toFixed(2)),
  freeGiB:Number((os.freemem()/2**30).toFixed(2))},steps:[]};
try{
 if(process.argv.length!==2)throw Error('DIAGNOSTIC_ARGS_INVALID');
 const version=await getApi('/api/version');
 report.steps.push({name:'OLLAMA_VERSION',httpStatus:version.status,
  version:version.data?.version??null,failure:version.failure});
 const tags=await getApi('/api/tags');
 const model=tags.data?.models?.find(item=>item.name===MODEL);
 report.steps.push({name:'MODEL_INSTALLED',httpStatus:tags.status,
  installed:!!model,digestPrefix:model?.digest?.slice(0,12)??null,
  sizeGiB:model?Number((model.size/2**30).toFixed(2)):null,failure:tags.failure});
 const ps=await getApi('/api/ps');
 report.steps.push({name:'LOADED_MODELS',httpStatus:ps.status,
  models:ps.data?.models?.map(item=>({name:item.name,
   memoryGiB:Number(((item.size_vram??0)/2**30).toFixed(2))}))??[],
  failure:ps.failure});
 if(!model){report.status='BLOCKED_MODEL_NOT_AVAILABLE';}
 else{
  const plain=await postProbe('PLAIN_GENERATE',{
   ...basic,prompt:'Reply with the word OK only.'},45000);
  report.steps.push(plain);
  if(plain.httpStatus===200){
   const schema=await postProbe('STRUCTURED_SCHEMA_GENERATE',{
    ...basic,options:{temperature:0,num_predict:150},format:fullSchema,
    prompt:'Return a JSON object with Korean titleKo, summaryKo and interpretationKo, neutral impact and one supportingQuotes string.'},60000);
   report.steps.push(schema);
   if(schema.httpStatus===200){
    const {validateR41MetadataFeed,directR41ArticleEvidence,generateR41ModelAnalysis}=await import(pathToFileURL(SOURCE));
    const feedResult=await fetch('https://zgmini.kr/api/outbreak-news/iran/r41',
     {signal:AbortSignal.timeout(15000)});
    if(!feedResult.ok)throw Error('GOVUK_FEED_UNAVAILABLE');
    const articles=validateR41MetadataFeed(await feedResult.json());
    const candidate=articles.find(item=>item.sourceId==='govuk');
    if(!candidate){report.steps.push({name:'FULL_R1_GOVUK',result:'NO_GOVUK_ARTICLE'});}
    else{
     const evidence=await directR41ArticleEvidence([candidate]);
     const body=evidence.items?.[0]?.articleBody;
     if(!body){report.steps.push({name:'FULL_R1_GOVUK',result:'NO_VERIFIED_BODY',
      reason:evidence.failures?.[0]?.reason??null});}
     else{
      let captured=null;
      try{
       const generated=await generateR41ModelAnalysis({originalTitle:candidate.originalTitle,
        articleBody:body},{model:MODEL,fetcher:async(url,options)=>{
         const response=await fetch(url,options);
         if(!response.ok){
          const raw=await response.clone().text();
          let message=raw;
          try{message=JSON.parse(raw).error??raw;}catch{}
          captured={category:failureKind(message),details:safeMessage(message)};
         }
         return response;
        }});
       report.steps.push({name:'FULL_R1_GOVUK',result:'VALIDATED_KOREAN_ANALYSIS',
        impact:generated.impact});
      }catch(error){report.steps.push({name:'FULL_R1_GOVUK',result:'FAILED',
       reason:safeMessage(error.message),...captured});}
     }
    }
   }
  }
  report.status='DIAGNOSTIC_COMPLETED';
 }
}catch(error){report.status='DIAGNOSTIC_FAILED';report.failure=safeMessage(error.message);}
console.log(JSON.stringify(report,null,2));
if(!['DIAGNOSTIC_COMPLETED','BLOCKED_MODEL_NOT_AVAILABLE'].includes(report.status))
 process.exitCode=1;
