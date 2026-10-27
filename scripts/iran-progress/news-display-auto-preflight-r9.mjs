// R9: read-only readiness inventory for four-topic news auto-publication.
// No D1, SQLite, cache, task, launcher or model inference writes.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {boundedRead} from './sources.mjs';
import {IRAN_GOVUK_NEWS_FEEDS,IRAN_GOVUK_NEWS_KEYWORDS,
 parseGovUkNewsCandidates,govUkContentCandidate} from './news-display-discover-r1.mjs';

const OLLAMA_TAGS='http://127.0.0.1:11434/api/tags';
const KST_MS=9*3600000;

export async function readOnlyAutoPublishPreflightR9({now=Date.now(),fetcher=fetch}={}){
 const feeds=await Promise.all(IRAN_GOVUK_NEWS_FEEDS.map(async(url,i)=>{
  try{
   const response=await boundedRead(url,{fetcher,maxBytes:1000000});
   if(response.status!=='COLLECTED')return {keyword:IRAN_GOVUK_NEWS_KEYWORDS[i],status:'SOURCE_FAILED',httpStatus:response.httpStatus??null};
   const items=parseGovUkNewsCandidates(response.body);
   return {keyword:IRAN_GOVUK_NEWS_KEYWORDS[i],status:'COLLECTED',count:items.length,first:items[0]??null};
  }catch{return {keyword:IRAN_GOVUK_NEWS_KEYWORDS[i],status:'SOURCE_FAILED',httpStatus:null};}
 }));
 const samples=await Promise.all(feeds.map(async info=>{
  if(info.status!=='COLLECTED'||!info.first)return {keyword:info.keyword,status:'NO_SAMPLE'};
  const article=info.first,apiUrl='https://www.gov.uk/api/content'+new URL(article.sourceUrl).pathname;
  try{
   const response=await boundedRead(apiUrl,{fetcher,maxBytes:4000000});
   if(response.status!=='COLLECTED')return {keyword:info.keyword,status:'CONTENT_API_FAILED',httpStatus:response.httpStatus??null};
   const content=JSON.parse(response.body),check=govUkContentCandidate(article,content,{now});
   return {keyword:info.keyword,status:check.status,documentType:typeof content.document_type==='string'?content.document_type.slice(0,60):null};
  }catch{return {keyword:info.keyword,status:'CONTENT_API_FAILED',httpStatus:null};}
 }));
 let ollama={status:'OFFLINE',modelCount:0,models:[]};
 try{
  const response=await boundedRead(OLLAMA_TAGS,{fetcher,maxBytes:256000});
  if(response.status==='COLLECTED'){
   const payload=JSON.parse(response.body),models=Array.isArray(payload.models)?payload.models:[];
   ollama={status:'ONLINE',modelCount:models.length,
    models:models.slice(0,20).map(m=>typeof m.name==='string'?m.name.slice(0,100):'UNKNOWN')};
  }
 }catch{} // A missing Ollama service must never start or install one.
 const feedSuccess=feeds.filter(f=>f.status==='COLLECTED').length;
 const feedFailure=feeds.length-feedSuccess;
 const allReady=feedFailure===0&&ollama.status==='ONLINE'&&ollama.modelCount>0;
 return {status:allReady?'PASS_R9_READ_ONLY_SOURCE_AND_OLLAMA':'NEEDS_REVIEW_R9_READ_ONLY',
  readOnly:true,atKst:new Date(now+KST_MS).toISOString().slice(0,19).replace('T',' '),
  mode:'CANDIDATE_DISCOVERY_ONLY',feedSuccess,feedFailure,
  feeds:feeds.map(({keyword,status,count,httpStatus})=>({keyword,status,count:count??0,httpStatus:httpStatus??null})),
  samples,ollama,rightsStatus:'PER_ARTICLE_RIGHTS_NOT_AUTOMATICALLY_APPROVED',
  d1Written:false,cacheModified:false,scoreLedgerModified:false,schedulerModified:false,ollamaInferenceExecuted:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only')throw Error('R9_READ_ONLY_ONLY');
 try{const result=await readOnlyAutoPublishPreflightR9();console.log(JSON.stringify(result));
  if(result.status!=='PASS_R9_READ_ONLY_SOURCE_AND_OLLAMA')process.exitCode=2;
 }catch(error){console.error(JSON.stringify({status:'STOP_R9_READ_ONLY',reason:error.message,readOnly:true}));process.exitCode=1;}
}
