// Bounded, source-specific article-body retrieval for PRIVATE R26 Korean drafts.
// This reads public source pages only. It never edits collector state or grants rights.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {boundedRead} from './sources.mjs';
import {privateNewsReviewQueueFile} from './ui-news-publication-gate-r1.mjs';
import {R26_ARTICLE_EVIDENCE_VERSION,draftR26News} from './news-r26-ollama-drafts-r1.mjs';

const FETCHABLE=new Set(['govuk','tasnim']);
const MAX_ARTICLE_BYTES=1200000;
const ALLOWED_TASNIM_HOSTS=new Set(['www.tasnimnews.ir','tasnimnews.ir']);
const ISO_DATE=/^\d{4}-\d{2}-\d{2}T/;

function decodeHtmlEntities(s){
 return s.replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{
  const value=n[0].toLowerCase()==='x'?Number.parseInt(n.slice(1),16):Number.parseInt(n,10);
  return value>0&&value<=0x10ffff&&!(value>=0xd800&&value<=0xdfff)?String.fromCodePoint(value):'';
 }).replace(/&(amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|rdquo|ldquo|ndash|mdash);/gi,
  (_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',
   rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',ndash:'–',mdash:'—'})[n.toLowerCase()]);
}
function plainArticleBody(markup){
 if(typeof markup!=='string'||markup.length>MAX_ARTICLE_BYTES)return null;
 const noScripts=markup.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ')
  .replace(/<!--[^]*?-->/g,' ');
 const text=decodeHtmlEntities(noScripts.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
 return text.length>=120&&text.length<=18000?text:null;
}
function exactUrl(candidate){
 let url;
 try{url=new URL(candidate.sourceUrl);}catch{throw Error('NEWS_R26_SOURCE_URL_INVALID');}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash)
  throw Error('NEWS_R26_SOURCE_URL_INVALID');
 if(candidate.sourceId==='govuk'&&
    (url.hostname!=='www.gov.uk'||!url.pathname.startsWith('/government/')))
  throw Error('NEWS_R26_SOURCE_URL_INVALID');
 if(candidate.sourceId==='tasnim'&&
    (!ALLOWED_TASNIM_HOSTS.has(url.hostname)||
     !/^\/en\/news\/\d{4}\/\d{2}\/\d{2}\/\d+\/[a-z0-9-]+$/.test(url.pathname)))
  throw Error('NEWS_R26_SOURCE_URL_INVALID');
 return url;
}

/** GOV.UK structured content has body and first_published_at, not merely Atom update time. */
export function govUkR26Body(candidate,content){
 const url=exactUrl(candidate);
 if(candidate.sourceId!=='govuk'||content?.base_path!==url.pathname||content.withdrawn===true||
    typeof content.title!=='string'||content.title.trim()!==candidate.originalTitle||
    !ISO_DATE.test(content.first_published_at??'')||
    new Date(content.first_published_at).toISOString()!==candidate.publisherDeclaredPublishedAt)
  throw Error('NEWS_R26_GOVUK_METADATA_MISMATCH');
 const text=plainArticleBody(content.details?.body);
 if(!text)throw Error('NEWS_R26_GOVUK_BODY_MISSING');
 return text;
}

function jsonLdArticles(html){
 const found=[];
 for(const script of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  let parsed;
  try{parsed=JSON.parse(script[1].trim());}catch{continue;}
  const stack=[parsed];
  while(stack.length){
   const value=stack.pop();
   if(Array.isArray(value)){stack.push(...value);continue;}
   if(!value||typeof value!=='object')continue;
   if(Array.isArray(value['@graph']))stack.push(...value['@graph']);
   const types=Array.isArray(value['@type'])?value['@type']:[value['@type']];
   if(types.some(type=>['NewsArticle','Article'].includes(type)))found.push(value);
  }
 }
 return found;
}

/** Tasnim pages without an unambiguous articleBody are rejected, never scraped as navigation text. */
export function tasnimR26Body(candidate,html){
 exactUrl(candidate);
 if(candidate.sourceId!=='tasnim'||typeof html!=='string'||html.length>MAX_ARTICLE_BYTES)
  throw Error('NEWS_R26_TASNIM_BODY_INVALID');
 const found=jsonLdArticles(html).filter(article=>{
  const headline=decodeHtmlEntities(String(article.headline??'')).trim();
  return headline===candidate.originalTitle;
 });
 if(found.length!==1)throw Error('NEWS_R26_TASNIM_ARTICLE_UNVERIFIED');
 const article=found[0];
 if(typeof article.articleBody!=='string')throw Error('NEWS_R26_TASNIM_BODY_MISSING');
 const body=plainArticleBody(article.articleBody);
 if(!body)throw Error('NEWS_R26_TASNIM_BODY_MISSING');
 return body;
}

export async function collectR26SourceEvidence(reviewQueue,{fetcher=fetch,maxArticles=16}={}){
 if(!reviewQueue||!Array.isArray(reviewQueue.reviewQueue)||
    !Number.isInteger(maxArticles)||maxArticles<1||maxArticles>50)
  throw Error('NEWS_R26_SOURCE_QUEUE_INVALID');
 const publicCandidates=reviewQueue.reviewQueue.filter(item=>item.withinPublicWindow);
 const pending=publicCandidates.filter(item=>FETCHABLE.has(item.sourceId));
 const items=[],failures=[];
 for(const candidate of pending.slice(0,maxArticles)){
  try{
   const url=exactUrl(candidate);
   const target=candidate.sourceId==='govuk'?`https://www.gov.uk/api/content${url.pathname}`:url.href;
   // No cross-site redirects. Never retrieve a destination supplied by page content.
   const result=await boundedRead(target,{maxBytes:MAX_ARTICLE_BYTES,
    fetcher:(target,options)=>fetcher(target,{...options,redirect:'error'})});
   if(result.status!=='COLLECTED')throw Error('NEWS_R26_SOURCE_FETCH_FAILED');
   let articleBody;
   if(candidate.sourceId==='govuk'){
    let content;
    try{content=JSON.parse(result.body);}catch{throw Error('NEWS_R26_GOVUK_JSON_INVALID');}
    articleBody=govUkR26Body(candidate,content);
   }else articleBody=tasnimR26Body(candidate,result.body);
   items.push({sourceId:candidate.sourceId,sourceUrl:candidate.sourceUrl,
    originalTitle:candidate.originalTitle,publishedAt:candidate.publisherDeclaredPublishedAt,
    articleBody});
  }catch(error){failures.push({id:candidate.id,reason:error.message});}
 }
 return {version:R26_ARTICLE_EVIDENCE_VERSION,items,failures,report:{
  candidateWithin14Days:publicCandidates.length,
  eligibleForDirectFetch:pending.length,attempted:Math.min(pending.length,maxArticles),
  pendingFetch:Math.max(0,pending.length-maxArticles),
  requireSeparateEvidence:publicCandidates.length-pending.length,
  fetched:items.length,failed:failures.length,autoRightsPromotions:0,publicWriteAttempted:false,
 }};
}

function outsideRepoOutput(file){
 if(!file||!path.isAbsolute(file))throw Error('NEWS_R26_OUTPUT_PATH_INVALID');
 const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 const target=path.resolve(file);
 if(target===repo||target.startsWith(repo+path.sep)||fs.existsSync(target))
  throw Error('NEWS_R26_OUTPUT_MUST_BE_PRIVATE_AND_NEW');
 return target;
}

async function installedLocalModel(model,fetcher=fetch){
 if(!/^[a-zA-Z0-9_.:-]{2,80}$/.test(model))throw Error('NEWS_R26_MODEL_NAME_INVALID');
 const response=await fetcher('http://127.0.0.1:11434/api/tags',
  {signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw Error('NEWS_R26_OLLAMA_OFFLINE');
 const tags=await response.json();
 const item=tags.models?.find(entry=>entry.name===model);
 if(typeof item?.digest!=='string'||!item.digest)
  throw Error('NEWS_R26_OLLAMA_MODEL_NOT_INSTALLED');
 return item.digest;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const flags={};
 for(const arg of process.argv.slice(2)){
  const at=arg.indexOf('=');
  if(at<3||!arg.startsWith('--')||arg.slice(2,at) in flags)
   throw Error('NEWS_R26_SOURCE_CLI_INVALID');
  flags[arg.slice(2,at)]=arg.slice(at+1);
 }
 if(!flags.candidates||!['dry-run','generate'].includes(flags.mode)||
    Object.keys(flags).some(flag=>!['candidates','mode','output','model'].includes(flag))||
    flags.mode==='generate'&&!flags.output)
  throw Error('NEWS_R26_SOURCE_CLI_INVALID');
 try{
  const queue=privateNewsReviewQueueFile(flags.candidates),inWindow=queue.reviewQueue.filter(item=>item.withinPublicWindow);
  const fetchable=inWindow.filter(item=>FETCHABLE.has(item.sourceId));
  if(flags.mode==='dry-run'){
   console.log(JSON.stringify({status:'READ_ONLY_SOURCE_PREFLIGHT',inWindow:inWindow.length,
    directlyFetchable:fetchable.length,requireSeparateEvidence:inWindow.length-fetchable.length,
    sourceCalls:0,ollamaCalls:0,publicWriteAttempted:false}));
  }else{
   const output=outsideRepoOutput(flags.output);
   const evidence=await collectR26SourceEvidence(queue);
   if(!evidence.items.length)throw Error('NEWS_R26_NO_ARTICLE_BODIES_FETCHED');
   const model=flags.model??'gemma3:4b',modelDigest=await installedLocalModel(model);
   const draft=await draftR26News(queue,evidence,{model,modelDigest});
   const payload={...draft,sourceFetch:evidence.report,sourceFailures:evidence.failures};
   const fd=fs.openSync(output,'wx',0o600);
   try{fs.writeFileSync(fd,JSON.stringify(payload,null,2),'utf8');fs.fsyncSync(fd);}
   finally{fs.closeSync(fd);}
   console.log(JSON.stringify({status:draft.report.status,output,sourceFetch:evidence.report,
    draftCount:draft.items.length,draftFailures:draft.failures.length,
    rightsVerified:0,publicWriteAttempted:false}));
  }
 }catch(error){
  console.error(JSON.stringify({status:'NEWS_R26_SOURCE_CYCLE_FAILED',reason:error.message}));
  process.exitCode=1;
 }
}
