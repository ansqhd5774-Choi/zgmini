// R40: exhaustively inspect a bounded, fixed R24 candidate snapshot in small batches.
// Development-only read path: never attach this loop to one Cloudflare Worker request.
// No D1, public snapshot, cron, PC runner, queue or score modifications.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
import {auditIranMultisourceCollectionR24,IRAN_MULTISOURCE_FEEDS_R24} from './news-display-multisource-audit-r24.mjs';
import {auditIranArticleDetailsR25} from './news-display-article-audit-r25.mjs';
import {boundedIranNewsServerFetcherR39,
 IRAN_NEWS_SERVER_SHADOW_SOURCES} from '../../worker/iran-news-server-shadow-r39.mjs';
import {kstDayWindow,kstNewsDay} from '../../lib/iran-progress/news-display-r1.mjs';

export const IRAN_NEWS_FULL_AUDIT_R40='IRAN_NEWS_FULL_AUDIT_R40';
const MAX_BATCH_SIZE=21;
const MAX_CANDIDATES=250;

function summarizeSource(report,entries,sourceId,window){
 const origin=report.sources.find(item=>item.sourceId===sourceId);
 const relevant=entries.filter(item=>item.sourceId===sourceId);
 const qualified=relevant.filter(item=>item.status==='ARTICLE_METADATA_REVIEWED');
 return {sourceId,feedStatus:origin?.status??'MISSING',
  candidatesFound:origin?.queuedForReview??0,
  inspected:relevant.length,
  qualified30Days:qualified.length,
  qualified14Days:qualified.filter(item=>{
   const published=Date.parse(item.publisherDeclaredPublishedAt);
   const day=Number.isFinite(published)?kstNewsDay(published):null;
   return day!==null&&day>=window.start&&day<=window.end;
  }).length,
  requestFailures:relevant.filter(item=>item.status==='ARTICLE_FETCH_FAILED').length};
}

export async function auditIranNewsFullR40({now=Date.now(),fetcher=fetch,
 feedReport=null,batchSize=MAX_BATCH_SIZE,maxCandidates=MAX_CANDIDATES,
 concurrency=3,onBatch=null}={}){
 if(!Number.isSafeInteger(now)||!Number.isSafeInteger(batchSize)||batchSize<1||
  batchSize>MAX_BATCH_SIZE||!Number.isSafeInteger(maxCandidates)||
  maxCandidates<1||maxCandidates>MAX_CANDIDATES||
  !Number.isSafeInteger(concurrency)||concurrency<1||concurrency>3||
  (onBatch!==null&&typeof onBatch!=='function'))throw Error('R40_OPTIONS_INVALID');
 const feeds=feedReport??await auditIranMultisourceCollectionR24({
  now,fetcher:boundedIranNewsServerFetcherR39(fetcher).fetcher,
  // R40 is the immutable seven-source archival audit. R45 private sources
  // have their own audit; do not change original 39-row evidence.
  feeds:IRAN_MULTISOURCE_FEEDS_R24.filter(item=>IRAN_NEWS_SERVER_SHADOW_SOURCES.includes(item.id)),
 });
 if(feeds.version!=='IRAN_NEWS_MULTISOURCE_AUDIT_R24'||
  !Array.isArray(feeds.candidates)||!Array.isArray(feeds.sources)||
  feeds.sources.length!==IRAN_NEWS_SERVER_SHADOW_SOURCES.length||
  feeds.sources.some((source,i)=>source.sourceId!==IRAN_NEWS_SERVER_SHADOW_SOURCES[i]))
  throw Error('R40_SOURCE_REGISTRY_INVALID');
 const seen=new Set();
 for(const item of feeds.candidates){
  const key=`${item?.sourceId}:${item?.sourceUrl}`;
  if(!item?.sourceId||!item?.sourceUrl||seen.has(key))throw Error('R40_CANDIDATE_DUPLICATE_OR_INVALID');
  seen.add(key);
 }
 const candidates=feeds.candidates.slice(0,maxCandidates),entries=[],batches=[];
 for(let start=0;start<candidates.length;start+=batchSize){
  const group=candidates.slice(start,start+batchSize);
  const limited=boundedIranNewsServerFetcherR39(fetcher);
  const batchFeed={...feeds,candidates:group,
   sources:feeds.sources.map(source=>({...source,
    queuedForReview:group.filter(item=>item.sourceId===source.sourceId).length}))};
  const checked=await auditIranArticleDetailsR25({now,fetcher:limited.fetcher,
   feedReport:batchFeed,maxArticles:group.length,concurrency});
  entries.push(...checked.articles);
  const batch={batchIndex:batches.length+1,candidateStart:start,
   candidates:group.length,processed:checked.candidatesProcessed,
   requestCount:limited.requestCount(),articleFailures:checked.articleFailures};
  batches.push(batch);
  if(onBatch)await onBatch({...batch});
 }
 const counts={};
 for(const item of entries)counts[item.status]=(counts[item.status]??0)+1;
 const window=kstDayWindow(now,14);
 const sources=IRAN_NEWS_SERVER_SHADOW_SOURCES.map(sourceId=>
  summarizeSource(feeds,entries,sourceId,window));
 const articleFailures=entries.filter(item=>[
  'ARTICLE_FETCH_FAILED','CANDIDATE_URL_INVALID','ARTICLE_FORMAT_INVALID',
  'PUBLISHER_IDENTITY_INVALID','CANONICAL_MISMATCH',
 ].includes(item.status)).length;
 const skipped=feeds.candidates.length-entries.length;
 const sourceFeedsFailed=feeds.sourcesFailed;
 const allSevenQualified14Days=sources.every(item=>item.qualified14Days>0);
 return {version:IRAN_NEWS_FULL_AUDIT_R40,checkedAt:new Date(now).toISOString(),
  mode:'READ_ONLY_DEVELOPMENT_CLI',
  status:sourceFeedsFailed||articleFailures||skipped?
   'PARTIAL_REVIEW_REQUIRED':'CANDIDATES_INSPECTED_REVIEW_REQUIRED',
  sourceCount:sources.length,candidatesFound:feeds.candidates.length,
  candidatesInspected:entries.length,candidatesUninspected:skipped,
  articleFailures,sourceFeedsFailed,
  qualified30Days:entries.filter(item=>item.status==='ARTICLE_METADATA_REVIEWED').length,
  qualified14Days:sources.reduce((sum,item)=>sum+item.qualified14Days,0),
  allSevenQualified14Days,sourceStatusCounts:counts,
  sourceSummary:sources,batches,
  // URLs, source-declared publication times and validation statuses only; no article text.
  articles:entries.map(item=>({sourceId:item.sourceId,sourceUrl:item.sourceUrl,
   status:item.status,title:item.originalTitle??null,
   publisherDeclaredPublishedAt:item.publisherDeclaredPublishedAt??null,
   bodyVerified:item.articleBodyAccessible===true,
   twoStageKeywordsVerified:item.scopeVerifiedFromArticle===true})),
  coverageProven:false,originalPublicationIndependentlyVerified:false,
  publicationApproved:false,displayEligible:false,
  d1Read:false,d1Written:false,publicSnapshotModified:false,
  pcRunnerModified:false,schedulerModified:false,
  scoreLedgerModified:false,queueModified:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!['--live','--live-save-evidence'].includes(process.argv[2])||process.argv.length!==3)
  throw Error('R40_EXPLICIT_READ_ONLY_LIVE_MODE_REQUIRED');
 const report=await auditIranNewsFullR40({onBatch:b=>
  console.error(`R40_Batch ${b.batchIndex}: inspected=${b.processed}, failed=${b.articleFailures}`)});
 if(process.argv[2]==='--live-save-evidence'){
  const target=new URL('../../docs/IRAN_NEWS_R40_FULL_AUDIT_20261029.json',import.meta.url);
  // Evidence is immutable: a second run must not overwrite the first scan.
  await writeFile(target,`${JSON.stringify(report,null,2)}\n`,{flag:'wx'});
  console.log(JSON.stringify({savedTo:fileURLToPath(target),
   candidatesInspected:report.candidatesInspected,status:report.status}));
 }else console.log(JSON.stringify(report));
 if(report.articleFailures||report.sourceFeedsFailed||report.candidatesUninspected)process.exitCode=2;
}
