// Read-only diagnosis of why the permitted GOV.UK article fails R1 model validation.
// Outputs only structural metrics and fixed reason codes; never source/model prose.
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT='E:\\ZGmini\\projects\\iran-news-analysis-r1-56eec668';
const SOURCE=path.join(ROOT,'scripts','iran-progress','news-r41-auto-interpret-r1.mjs');
const MODEL='gemma3:4b';
const report={version:'IRAN_NEWS_ANALYSIS_R1_OUTPUT_AUDIT',
 at:new Date().toISOString(),taskChanges:0,d1Writes:0,scoreChanges:0,
 collectorChanges:0,attempts:[]};
const numerals=value=>new Set(String(value).match(/\d+(?:[.,]\d+)*(?:\s?%|kg|km|bn|m)?/gi)??[]);
const metrics=(draft,originalTitle,articleBody)=>{
 const errors=[];
 if(!draft||typeof draft!=='object'||Array.isArray(draft))
  return {type:'NOT_OBJECT',errors:['NOT_OBJECT']};
 const keys=Object.keys(draft);
 if(keys.sort().join(',')!=='impact,interpretationKo,summaryKo,supportingQuotes,titleKo')
  errors.push('FIELD_SET');
 for(const [name,min,max] of [['titleKo',8,180],['summaryKo',45,750],
  ['interpretationKo',25,550]]){
  const value=draft[name];
  if(typeof value!=='string')errors.push(`${name}_NOT_STRING`);
  else{
   if(!/[가-힣]/.test(value))errors.push(`${name}_NO_KOREAN`);
   if(value.trim().length<min)errors.push(`${name}_TOO_SHORT`);
   if(value.length>max)errors.push(`${name}_TOO_LONG`);
  }
 }
 if(typeof draft.summaryKo==='string'&&typeof draft.interpretationKo==='string'&&
  /상세.{0,12}원문.{0,10}확인|자세한 내용은|관련 내용을 언급했습니다/.test(
   draft.summaryKo+' '+draft.interpretationKo))errors.push('GENERIC_UNHELPFUL_SUMMARY');
 if(!['positive','negative','neutral'].includes(draft.impact))errors.push('IMPACT_INVALID');
 const quotes=draft.supportingQuotes;
 if(!Array.isArray(quotes)||quotes.length<1||quotes.length>3)errors.push('QUOTE_LIST_INVALID');
 else if(quotes.some(q=>typeof q!=='string'||q.length<12||q.length>400||
  !articleBody.includes(q)))errors.push('QUOTE_NOT_VERBATIM');
 const allowed=numerals(originalTitle+' '+articleBody);
 let newNumerals=0;
 for(const value of numerals([draft.titleKo,draft.summaryKo,draft.interpretationKo].join(' ')))
  if(!allowed.has(value))newNumerals++;
 if(newNumerals)errors.push('NEW_NUMBER');
 return {type:'OBJECT',keyCount:keys.length,errors,
  titleChars:typeof draft.titleKo==='string'?draft.titleKo.length:null,
  summaryChars:typeof draft.summaryKo==='string'?draft.summaryKo.length:null,
  interpretationChars:typeof draft.interpretationKo==='string'?
   draft.interpretationKo.length:null,
  quoteCount:Array.isArray(quotes)?quotes.length:null,
  verbatimQuoteCount:Array.isArray(quotes)?quotes.filter(q=>
   typeof q==='string'&&q.length>=12&&q.length<=400&&articleBody.includes(q)).length:null,
  newNumerals};
};

try{
 if(process.argv.length!==2)throw Error('ARGS_INVALID');
 const {validateR41MetadataFeed,directR41ArticleEvidence,
  generateR41ModelAnalysis}=await import(pathToFileURL(SOURCE));
 const feedResponse=await fetch('https://zgmini.kr/api/outbreak-news/iran/r41',
  {signal:AbortSignal.timeout(20000)});
 if(!feedResponse.ok)throw Error('FEED_FETCH_FAILED');
 const candidate=validateR41MetadataFeed(await feedResponse.json())
  .find(article=>article.sourceId==='govuk');
 if(!candidate)throw Error('GOVUK_NOT_FOUND');
 const evidence=await directR41ArticleEvidence([candidate]);
 const articleBody=evidence.items?.[0]?.articleBody;
 if(typeof articleBody!=='string'||articleBody.length<120)
  throw Error('GOVUK_BODY_UNAVAILABLE');
 report.eligibleArticleCount=1;
 report.bodyChars=articleBody.length;
 try{
  const generated=await generateR41ModelAnalysis({originalTitle:candidate.originalTitle,
   articleBody},{model:MODEL,fetcher:async(url,options)=>{
    const request=JSON.parse(options.body);
    const attempt={sequence:report.attempts.length+1,
     format:request.format==='json'?'JSON':'JSON_SCHEMA',
     numPredict:request.options?.num_predict,
     correctiveHintIncluded:request.prompt.includes('CORRECTION REQUIRED')};
    report.attempts.push(attempt);
    try{
     const response=await fetch(url,options);
     attempt.httpStatus=response.status;
     let envelope;
     try{envelope=await response.clone().json();}catch{
      attempt.response='NON_JSON_ENVELOPE';return response;
     }
     if(!response.ok){
      attempt.response='HTTP_ERROR';
      attempt.repeatLimitError=typeof envelope?.error==='string'&&
       /prediction aborted, token repeat limit reached/i.test(envelope.error);
      return response;
     }
     attempt.doneReason=typeof envelope?.done_reason==='string'?
      envelope.done_reason.slice(0,32):null;
     attempt.evalCount=Number.isInteger(envelope?.eval_count)?envelope.eval_count:null;
     try{
      const draft=JSON.parse(envelope.response);
      attempt.output=metrics(draft,candidate.originalTitle,articleBody);
     }catch{attempt.response='MODEL_OUTPUT_JSON_PARSE_FAILED';}
     return response;
    }catch(error){
     attempt.response='FETCH_EXCEPTION';
     attempt.exceptionName=error?.name==='TimeoutError'?'TIMEOUT':'OTHER';
     throw error;
    }
   }});
  report.analysisResult='VALIDATED';
  report.impact=generated.impact;
 }catch(error){
  report.analysisResult='FAILED';
  report.reason=/^[A-Z][A-Z0-9_]{1,79}$/.test(error?.message)?
   error.message:'GENERATION_FAILURE';
 }
 report.status='DIAGNOSTIC_COMPLETED';
}catch(error){
 report.status='DIAGNOSTIC_BLOCKED';
 report.reason=/^[A-Z][A-Z0-9_]{1,79}$/.test(error?.message)?
  error.message:'UNKNOWN_FAILURE';
 process.exitCode=1;
}
console.log(JSON.stringify(report,null,2));
