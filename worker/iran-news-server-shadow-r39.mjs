// R39: isolated, read-only seven-publisher server probe. Not an active production route.
// Do not connect to D1, score inputs, queues, cron or the existing public snapshot.
import {auditIranMultisourceCollectionR24} from '../scripts/iran-progress/news-display-multisource-audit-r24.mjs';
import {auditIranArticleDetailsR25} from '../scripts/iran-progress/news-display-article-audit-r25.mjs';
import {kstDayWindow,kstNewsDay} from '../lib/iran-progress/news-display-r1.mjs';

export const IRAN_NEWS_SERVER_SHADOW_R39='IRAN_NEWS_SERVER_SHADOW_R39';
export const IRAN_NEWS_SERVER_SHADOW_SOURCES=Object.freeze([
 'tasnim','govuk','guardian-iran','dw-world','bbc-middle-east',
 'aljazeera','un-middle-east',
]);

const TRUSTED_HOSTS=new Set([
 'www.tasnimnews.ir','www.gov.uk','www.theguardian.com','rss.dw.com',
 'www.dw.com','feeds.bbci.co.uk','www.bbc.com','www.bbc.co.uk',
 'www.bbci.co.uk','www.aljazeera.com','news.un.org',
]);
const MAX_ARTICLES=21;
const DEFAULT_ARTICLES=14;
const HEADERS=Object.freeze({'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store'});

export function boundedIranNewsServerFetcherR39(fetcher=fetch){
 if(typeof fetcher!=='function')throw Error('R39_FETCHER_INVALID');
 let requests=0;
 const wrapped=async(url,options={})=>{
  let parsed;
  try{parsed=new URL(url);}catch{throw Error('R39_FETCH_URL_INVALID');}
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port||
   parsed.hash||!TRUSTED_HOSTS.has(parsed.hostname))
   throw Error('R39_UNTRUSTED_FETCH_DESTINATION');
  if(++requests>40)throw Error('R39_REQUEST_BUDGET_EXCEEDED');
  // No automatic redirect to an off-publisher host. A redirect is a source failure.
  return fetcher(parsed.href,{...options,redirect:'manual'});
 };
 return {fetcher:wrapped,requestCount:()=>requests};
}

export async function probeIranNewsServerR39({now=Date.now(),fetcher=fetch,
 maxArticles=DEFAULT_ARTICLES,concurrency=2}={}){
 if(!Number.isSafeInteger(now)||!Number.isSafeInteger(maxArticles)||
  maxArticles<1||maxArticles>MAX_ARTICLES||
  !Number.isSafeInteger(concurrency)||concurrency<1||concurrency>3)
  throw Error('R39_OPTIONS_INVALID');
 const limited=boundedIranNewsServerFetcherR39(fetcher);
 const feed=await auditIranMultisourceCollectionR24({now,fetcher:limited.fetcher});
 if(feed.sourceCount!==7||feed.sources.length!==7||
  feed.sources.some((entry,i)=>entry.sourceId!==IRAN_NEWS_SERVER_SHADOW_SOURCES[i]))
  throw Error('R39_SOURCE_REGISTRY_DRIFT');
 const audited=await auditIranArticleDetailsR25({now,fetcher:limited.fetcher,
  feedReport:feed,maxArticles,concurrency});
 const window=kstDayWindow(now,14);
 const publicCandidates=audited.articles.filter(article=>
  article.status==='ARTICLE_METADATA_REVIEWED').map(article=>{
   const day=kstNewsDay(Date.parse(article.publisherDeclaredPublishedAt));
   return {sourceId:article.sourceId,sourceUrl:article.sourceUrl,
    title:article.originalTitle,publishedAt:article.publisherDeclaredPublishedAt,
    within14Days:day>=window.start&&day<=window.end,
    titleVerified:article.originalTitleVerified,
    bodyVerified:article.articleBodyAccessible,
    twoStageKeywordsVerified:article.scopeVerifiedFromArticle};
  });
 const sources=IRAN_NEWS_SERVER_SHADOW_SOURCES.map(sourceId=>{
  const feedEntry=feed.sources.find(item=>item.sourceId===sourceId);
  const auditEntry=audited.sourceSummaries.find(item=>item.sourceId===sourceId);
  const qualified=publicCandidates.filter(item=>item.sourceId===sourceId);
  return {sourceId,feedStatus:feedEntry.status,
   candidatesFound:feedEntry.queuedForReview,
   articlesChecked:auditEntry?.articlesChecked??0,
   articlesUnchecked:auditEntry?.articlesUnchecked??0,
   articleFetchFailed:auditEntry?.fetchFailed??0,
   qualified30Days:qualified.length,
   qualified14Days:qualified.filter(item=>item.within14Days).length};
 });
 const allSevenQualified=sources.every(item=>item.qualified30Days>0);
 return {version:IRAN_NEWS_SERVER_SHADOW_R39,
  status:feed.sourcesFailed||audited.articleFailures||audited.articlesUnchecked||
   !allSevenQualified?'PARTIAL_REVIEW_REQUIRED':'REVIEW_REQUIRED',
  checkedAt:new Date(now).toISOString(),mode:'READ_ONLY',
  activeSourceCount:7,sourceFeedsFailed:feed.sourcesFailed,
  candidatesFound:feed.candidatesFound,articlesChecked:audited.articlesChecked,
  articlesUnchecked:audited.articlesUnchecked,articleFailures:audited.articleFailures,
  qualified30Days:publicCandidates.length,
  qualified14Days:publicCandidates.filter(item=>item.within14Days).length,
  sourcesWithQualified30Days:sources.filter(item=>item.qualified30Days>0).length,
  outgoingRequests:limited.requestCount(),sampleLimit:maxArticles,
  coverageProven:false,articleBodiesReturned:false,
  sourceFeedsUsePrimaryDiscoveryHint:true,
  originalPublicationIndependentlyVerified:false,
  publicationApproved:false,displayEligible:false,
  sources,articles:publicCandidates,
  d1Read:false,d1Written:false,publicSnapshotModified:false,
  pcCacheWritten:false,pcRunnerModified:false,schedulerModified:false,
  scoreLedgerModified:false,queueModified:false};
}

// A future independent Worker may expose this endpoint with a Cloudflare secret.
// Without the secret, even a direct HTTP invocation cannot trigger a source request.
export async function handleIranNewsShadowR39(request,{token,fetcher=fetch,
 now=Date.now()}={}){
 const url=new URL(request.url);
 if(url.pathname!=='/internal/iran-news-shadow-r39')
  return Response.json({status:'NOT_FOUND'},{status:404,headers:HEADERS});
 if(request.method!=='POST')
  return Response.json({status:'METHOD_NOT_ALLOWED'},{status:405,headers:HEADERS});
 if(typeof token!=='string'||token.length<32)
  return Response.json({status:'R39_DISABLED_NO_SECRET'},{status:503,headers:HEADERS});
 if(request.headers.get('authorization')!==`Bearer ${token}`)
  return Response.json({status:'UNAUTHORIZED'},{status:403,headers:HEADERS});
 try{return Response.json(await probeIranNewsServerR39({now,fetcher}),{headers:HEADERS});}
 catch{return Response.json({status:'R39_SOURCE_PROBE_FAILED',d1Written:false},
  {status:503,headers:HEADERS});}
}

export default Object.freeze({
 async fetch(request,env){
  return handleIranNewsShadowR39(request,{token:env?.IRAN_NEWS_SHADOW_TOKEN});
 },
});
