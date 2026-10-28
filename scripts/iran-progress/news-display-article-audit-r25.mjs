// R25: inspect publisher-declared article metadata for R24 candidates.
// No publication, translation, scoring, database writes or article-body archiving.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {boundedRead} from './sources.mjs';
import {auditIranMultisourceCollectionR24,newsR24SourceUrl} from './news-display-multisource-audit-r24.mjs';
import {matchesIranTwoStageKeywordsR38} from './news-display-discover-r1.mjs';
import {kstDayWindow,kstNewsDay,NEWS_PC_RETENTION_DAYS} from '../../lib/iran-progress/news-display-r1.mjs';

const MAX_ARTICLES=70;
const MAX_CONCURRENCY=4;
const MAX_HTML_BYTES=2_500_000;
const MAX_API_BYTES=4_000_000;
const DATE_WITH_ZONE=/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/i;

function plain(value){
 return String(value??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/<(?:script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\s*(?:script|style|noscript|svg)>/gi,' ')
  .replace(/<[^>]*>/g,' ')
  .replace(/&#(x[\da-f]+|\d+);/gi,(_,code)=>{
   const number=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):parseInt(code,10);
   return number>0&&number<=0x10ffff?String.fromCodePoint(number):'';
  })
  .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/gi,entity=>({
   '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' ','&#39;':"'",
  })[entity.toLowerCase()]??entity)
  .replace(/\s+/g,' ').trim();
}

function attribute(tag,name){
 const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const match=tag.match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,'i'));
 return match?plain(match[1]??match[2]??match[3]):null;
}

function meta(html,allowed){
 for(const tag of html.match(/<meta\b[^>]*>/gi)??[]){
  const key=attribute(tag,'property')??attribute(tag,'name')??attribute(tag,'itemprop');
  if(key&&allowed.includes(key.toLowerCase())){
   const value=attribute(tag,'content');
   if(value)return value;
  }
 }
 return null;
}

function publisherTimestamp(raw,now){
 if(typeof raw!=='string'||!DATE_WITH_ZONE.test(raw.trim()))return null;
 const time=Date.parse(raw);
 if(!Number.isSafeInteger(time)||time>now+5*60_000||time<0)return null;
 return new Date(time).toISOString();
}

function articleSchemas(html){
 const found=[];
 for(const tag of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if(!/^application\/ld\+json(?:\s*;.*)?$/i.test(attribute(tag[1],'type')??''))continue;
  try{
   const json=JSON.parse(tag[2]);
   const nodes=[json];
   while(nodes.length){
    const value=nodes.pop();
    if(!value||typeof value!=='object')continue;
    if(Array.isArray(value)){nodes.push(...value);continue;}
    const types=Array.isArray(value['@type'])?value['@type']:[value['@type']];
    if(types.some(type=>typeof type==='string'&&
      /^(?:https?:\/\/schema\.org\/)?(?:newsarticle|reportagenewsarticle|article|reportagearticle|blogposting)$/i.test(type))){
     found.push(value);
    }
    if(value['@graph'])nodes.push(value['@graph']);
   }
  }catch{/* Malformed markup is not publication evidence. */}
 }
 return found;
}

function canonicalUrl(html,sourceId){
 const link=(html.match(/<link\b[^>]*>/gi)??[]).find(tag=>
  /(?:^|\s)rel\s*=\s*["']?canonical(?:["'\s>])/i.test(tag));
 const raw=link?attribute(link,'href'):null;
 return raw?newsR24SourceUrl(sourceId,raw):null;
}

function unStoryBodyParagraphs(html){
 // UN News exposes story body in this named block, outside its short <article> teaser.
 const marker=/<div\b[^>]*\bid=["']block-views-block-content-fields-block-body["'][^>]*>/i.exec(html);
 if(!marker)return '';
 const start=marker.index+marker[0].length;
 let level=1,end=html.length;
 for(const tag of html.slice(start).matchAll(/<\/?div\b[^>]*>/gi)){
  level+=/^<\/div\b/i.test(tag[0])?-1:1;
  if(level===0){end=start+tag.index;break;}
 }
 if(level!==0||end-start>200_000)return '';
 return [...html.slice(start,end).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)]
  .map(match=>match[1]).join(' ');
}

function publisherBodyParagraphs(html,containerClass){
 // Some publishers place their editorial text in a named div without <article>.
 // Restrict the scan to that exact publisher container, never the whole page.
 const marker=[...html.matchAll(/<div\b[^>]*>/gi)].find(match=>
  (attribute(match[0],'class')??'').split(/\s+/).includes(containerClass));
 if(!marker)return '';
 const start=marker.index+marker[0].length;
 let level=1,end=-1;
 for(const tag of html.slice(start).matchAll(/<\/?div\b[^>]*>/gi)){
  level+=/^<\/div\b/i.test(tag[0])?-1:1;
  if(level===0){end=start+tag.index;break;}
  if(tag.index>250_000)return '';
 }
 if(end<start||end-start>250_000)return '';
 return [...html.slice(start,end).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)]
  .map(match=>match[1]).join(' ');
}

function iaeaDeclaredDate(html){
 const declared=meta(html,['dcterms.date']);
 if(!declared)return null;
 // A publication-date hint must agree with IAEA's visible dated page metadata.
 const visible=html.match(/<time\b[^>]*\bdatetime\s*=\s*["'](\d{4}-\d{2}-\d{2})["']/i)?.[1];
 return visible===declared.slice(0,10)?declared:null;
}

function articleMarkup(html,sourceId,expectedUrl,now){
 if(typeof html!=='string'||html.length>MAX_HTML_BYTES||
  !/<html\b|<!doctype html/i.test(html))return {status:'ARTICLE_FORMAT_INVALID'};
 const canonical=canonicalUrl(html,sourceId);
 if(canonical&&canonical!==expectedUrl)return {status:'CANONICAL_MISMATCH'};
 const schema=articleSchemas(html)[0]??null;
 const rawTitle=schema?.headline??meta(html,['og:title','twitter:title'])??
  html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i)?.[1]??'';
 const title=plain(typeof rawTitle==='string'?rawTitle:'').slice(0,501);
 const rawDate=schema?.datePublished??meta(html,[
  'article:published_time','datepublished','date_published','pubdate'])??
  (sourceId.startsWith('iaea-')?iaeaDeclaredDate(html):null);
 const publishedAt=publisherTimestamp(rawDate,now);
 const semanticArticle=html.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i)?.[1]??'';
 // Body scope must not be passed by a title, navigation or teaser alone.
 const paragraphs=[...semanticArticle.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)]
  .map(match=>match[1]).join(' ');
 const unBody=sourceId==='un-middle-east'?unStoryBodyParagraphs(html):'';
 const editorialClass=sourceId==='aljazeera'?'wysiwyg--all-content':
  sourceId==='iaea-statements'?'statement-body':
  sourceId==='iaea-news'?'news-story-body':null;
 const editorialBody=editorialClass?publisherBodyParagraphs(html,editorialClass):'';
 const rawBody=typeof schema?.articleBody==='string'?schema.articleBody:
  unBody||editorialBody||paragraphs;
 const body=plain(rawBody);
 return assessedArticle({sourceId,sourceUrl:expectedUrl,title,publishedAt,
  dateEvidence:publishedAt?(schema?.datePublished?'PUBLISHER_JSON_LD':
   sourceId.startsWith('iaea-')&&iaeaDeclaredDate(html)===rawDate?
    'IAEA_DCTERMS_DATE_AND_VISIBLE_DATE':'PUBLISHER_HTML_META'):null,
  body,bodyEvidence:typeof schema?.articleBody==='string'?'SCHEMA_ARTICLE_BODY':
   unBody?'UN_NEWS_STORY_BODY':editorialBody?'PUBLISHER_EDITORIAL_CONTAINER_PARAGRAPHS':
    paragraphs?'SEMANTIC_ARTICLE_PARAGRAPHS':'NONE',now});
}

function assessedArticle({sourceId,sourceUrl,title,publishedAt,dateEvidence,body,bodyEvidence,now}){
 const titleVerified=!!title&&title.length<=500;
 const bodyVerified=body.trim().length>0;
 // Relevance requires only one primary and one secondary keyword across title/body.
 const scopeVerified=matchesIranTwoStageKeywordsR38([title,body].join(' '));
 const {start,end}=kstDayWindow(now,NEWS_PC_RETENTION_DAYS);
 const dateKey=publishedAt?kstNewsDay(Date.parse(publishedAt)):null;
 const withinRetentionWindow=dateKey===null?null:dateKey>=start&&dateKey<=end;
 const status=!titleVerified?'TITLE_UNVERIFIED':!publishedAt?'FIRST_PUBLICATION_UNVERIFIED':
  !bodyVerified?'ARTICLE_BODY_UNVERIFIED':!scopeVerified?'ARTICLE_OUT_OF_SCOPE':
   !withinRetentionWindow?'OUTSIDE_30_DAY_WINDOW':'ARTICLE_METADATA_REVIEWED';
 return {sourceId,sourceUrl,status,originalTitle:titleVerified?title:null,
  originalTitleVerified:titleVerified,publisherDeclaredPublishedAt:publishedAt,
  publicationDateEvidence:dateEvidence,originalPublicationIndependentlyVerified:false,
  withinRetentionWindow,
  articleBodyAccessible:bodyVerified,bodyCharacterCount:body.length,
  articleBodyEvidence:bodyEvidence,scopeVerifiedFromArticle:scopeVerified,
  rightsVerified:false,displayEligible:false,translationModified:false};
}

export function inspectIranArticleR25(candidate,body,{now=Date.now()}={}){
 const sourceId=candidate?.sourceId,sourceUrl=candidate?.sourceUrl;
 if(!Number.isSafeInteger(now)||!sourceId||typeof sourceUrl!=='string'||
  newsR24SourceUrl(sourceId,sourceUrl)!==sourceUrl)
  throw Error('R25_CANDIDATE_INVALID');
 if(sourceId==='govuk'){
  let content;
  try{content=typeof body==='string'?JSON.parse(body):body;}catch{return {sourceId,sourceUrl,status:'ARTICLE_FORMAT_INVALID'};}
  if(!content||content.base_path!==new URL(sourceUrl).pathname||
   content.withdrawn===true)return {sourceId,sourceUrl,status:'PUBLISHER_IDENTITY_INVALID'};
  const date=publisherTimestamp(content.first_published_at,now);
  const bodyText=plain(content.details?.body??'');
  return assessedArticle({sourceId,sourceUrl,title:plain(content.title),publishedAt:date,
   dateEvidence:date?'GOVUK_CONTENT_API_FIRST_PUBLISHED_AT':null,
   body:bodyText,bodyEvidence:'GOVUK_CONTENT_API_BODY',now});
 }
 return {sourceId,sourceUrl,...articleMarkup(body,sourceId,sourceUrl,now)};
}

export function selectIranReviewCandidatesR25(candidates,limit=MAX_ARTICLES){
 if(!Array.isArray(candidates)||!Number.isSafeInteger(limit)||limit<1||limit>MAX_ARTICLES)
  throw Error('R25_SELECTION_INVALID');
 // Round-robin avoids a single publisher consuming the whole audit budget.
 const grouped=new Map();
 for(const item of candidates){
  if(!item||!item.sourceId||!item.sourceUrl)continue;
  if(!grouped.has(item.sourceId))grouped.set(item.sourceId,[]);
  grouped.get(item.sourceId).push(item);
 }
 const selected=[];
 while(selected.length<limit){
  let added=0;
  for(const items of grouped.values()){
   if(items.length&&selected.length<limit){selected.push(items.shift());added++;}
  }
  if(!added)break;
 }
 return selected;
}

export async function auditIranArticleDetailsR25({now=Date.now(),fetcher=fetch,
 feedReport=null,maxArticles=MAX_ARTICLES,concurrency=MAX_CONCURRENCY}={}){
 if(!Number.isSafeInteger(now)||!Number.isSafeInteger(maxArticles)||maxArticles<1||
  maxArticles>MAX_ARTICLES||!Number.isSafeInteger(concurrency)||
  concurrency<1||concurrency>MAX_CONCURRENCY)throw Error('R25_OPTIONS_INVALID');
 const sourceReport=feedReport??await auditIranMultisourceCollectionR24({now,fetcher});
 if(sourceReport.version!=='IRAN_NEWS_MULTISOURCE_AUDIT_R24'||
  !Array.isArray(sourceReport.candidates))throw Error('R25_FEED_REPORT_INVALID');
 const selected=selectIranReviewCandidatesR25(sourceReport.candidates,maxArticles);
 const results=new Array(selected.length);
 let next=0;
 async function worker(){
  for(;;){
   const index=next++;
   if(index>=selected.length)return;
   const candidate=selected[index];
   const {sourceId,sourceUrl}=candidate;
   if(newsR24SourceUrl(sourceId,sourceUrl)!==sourceUrl){
    results[index]={sourceId,sourceUrl,status:'CANDIDATE_URL_INVALID'};
    continue;
   }
   if(candidate.contentKind==='VIDEO_REQUIRES_SEPARATE_REVIEW'){
    results[index]={sourceId,sourceUrl,status:'VIDEO_REQUIRES_SEPARATE_REVIEW',
     rightsVerified:false,displayEligible:false};
    continue;
   }
   const requestUrl=sourceId==='govuk'?
    `https://www.gov.uk/api/content${new URL(sourceUrl).pathname}`:sourceUrl;
   try{
    // The wrapper disables transparent off-domain redirects (including SSRF redirects).
    const safeFetcher=(url,options)=>fetcher(url,{...options,redirect:'manual'});
    const read=await boundedRead(requestUrl,{fetcher:safeFetcher,
     maxBytes:sourceId==='govuk'?MAX_API_BYTES:MAX_HTML_BYTES});
    results[index]=read.status==='COLLECTED'?
     inspectIranArticleR25(candidate,read.body,{now}):
     {sourceId,sourceUrl,status:'ARTICLE_FETCH_FAILED',httpStatus:read.httpStatus??null};
   }catch(error){
    results[index]={sourceId,sourceUrl,status:'ARTICLE_FETCH_FAILED',
     errorCode:/SOURCE_PAYLOAD_LIMIT/.test(String(error?.message))?'PAYLOAD_LIMIT':'READ_ERROR'};
   }
  }
 }
 await Promise.all(Array.from({length:Math.min(concurrency,selected.length)},()=>worker()));
 const sourceSummaries=sourceReport.sources.map(source=>{
  const inspected=results.filter(item=>item.sourceId===source.sourceId);
  return {sourceId:source.sourceId,feedStatus:source.status,
   candidatesFound:source.queuedForReview,
   articlesChecked:inspected.filter(item=>
    !['VIDEO_REQUIRES_SEPARATE_REVIEW','CANDIDATE_URL_INVALID'].includes(item.status)).length,
   videosClassified:inspected.filter(item=>item.status==='VIDEO_REQUIRES_SEPARATE_REVIEW').length,
   articlesUnchecked:source.queuedForReview-inspected.length,
   metadataReviewed:inspected.filter(item=>item.status==='ARTICLE_METADATA_REVIEWED').length,
   fetchFailed:inspected.filter(item=>item.status==='ARTICLE_FETCH_FAILED').length};
 });
 const processed=results.length,unreviewed=sourceReport.candidates.length-processed;
 const checked=results.filter(item=>
  !['VIDEO_REQUIRES_SEPARATE_REVIEW','CANDIDATE_URL_INVALID'].includes(item.status)).length;
 const videosClassified=results.filter(item=>item.status==='VIDEO_REQUIRES_SEPARATE_REVIEW').length;
 const reviewed=results.filter(item=>item.status==='ARTICLE_METADATA_REVIEWED').length;
 const failures=results.filter(item=>['ARTICLE_FETCH_FAILED','CANDIDATE_URL_INVALID',
  'ARTICLE_FORMAT_INVALID','PUBLISHER_IDENTITY_INVALID','CANONICAL_MISMATCH'].includes(item.status)).length;
 return {version:'IRAN_ARTICLE_DETAIL_AUDIT_R25',mode:'READ_ONLY',
  checkedAt:new Date(now).toISOString(),sourceCount:sourceReport.sourceCount,
  sourceFeedsFailed:sourceReport.sourcesFailed,candidatesFound:sourceReport.candidates.length,
  candidatesProcessed:processed,articlesChecked:checked,videosClassified,
  articlesUnchecked:unreviewed,metadataReviewed:reviewed,
  articleFailures:failures,status:sourceReport.sourcesFailed||failures||unreviewed?
   'PARTIAL_AUDIT_REVIEW_REQUIRED':'AUDIT_COMPLETE_REVIEW_REQUIRED',
  // Publisher metadata is evidence, not independent verification of real-world facts or reuse rights.
  displayEligible:0,totalCoverageProven:false,
  sourceSummaries,articles:results,
  pcCacheWritten:false,d1Written:false,schedulerModified:false,
  scoreLedgerModified:false,translationModified:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--probe')
  throw Error('R25_READ_ONLY_PROBE_REQUIRED');
 const report=await auditIranArticleDetailsR25();
 console.log(JSON.stringify(report));
 if(report.articleFailures||report.sourceFeedsFailed)process.exitCode=2;
}
