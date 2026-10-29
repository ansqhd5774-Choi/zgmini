// R45: explicit READ-ONLY PC audit for approved optional news sources.
// Independent of the scheduled seven-source runner, score DB and public D1.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {IRAN_DISPLAY_FEEDS_R45_OPTIONAL}
 from './news-display-source-registry-r26.mjs';
import {auditIranMultisourceCollectionR24}
 from './news-display-multisource-audit-r24.mjs';
import {auditIranArticleDetailsR25}
 from './news-display-article-audit-r25.mjs';
import {kstDayWindow,kstNewsDay} from '../../lib/iran-progress/news-display-r1.mjs';

export async function auditIranOptionalSourcesR45({now=Date.now(),fetcher=fetch}={}){
 if(!Number.isSafeInteger(now))throw Error('R45_OPTIONAL_TIME_INVALID');
 const feeds=await auditIranMultisourceCollectionR24({
  now,fetcher,feeds:IRAN_DISPLAY_FEEDS_R45_OPTIONAL,
 });
 const articles=await auditIranArticleDetailsR25({now,fetcher,feedReport:feeds});
 const window=kstDayWindow(now,14);
 const verified=articles.articles.filter(a=>a.status==='ARTICLE_METADATA_REVIEWED');
 const recent=verified.filter(a=>{
  const parsed=Date.parse(a.publisherDeclaredPublishedAt);
  const day=Number.isFinite(parsed)?kstNewsDay(parsed):null;
  return day!==null&&day>=window.start&&day<=window.end;
 });
 const outcomes=Object.fromEntries([...new Set(articles.articles.map(a=>a.status))]
  .map(status=>[status,articles.articles.filter(a=>a.status===status).length]));
 return {version:'IRAN_NEWS_R45_OPTIONAL_PRIVATE_PROBE',
  status:feeds.sourcesFailed||articles.articleFailures?'PARTIAL':'READ_ONLY_REVIEW_REQUIRED',
  checkedAt:new Date(now).toISOString(),
  sources:feeds.sources.map(s=>({sourceId:s.sourceId,status:s.status,
   feedUrlsRead:s.feedUrlsRead,feedUrlsFailed:s.feedUrlsFailed,candidates:s.queuedForReview})),
  candidatesDiscovered:feeds.candidates.length,articleOutcomes:outcomes,
  metadataReviewed:verified.length,eligible14Day:recent.length,
  articles:verified.map(a=>({sourceId:a.sourceId,
   sourceUrl:a.sourceUrl,originalTitle:a.originalTitle,
   publisherDeclaredPublishedAt:a.publisherDeclaredPublishedAt,
   bodyVerified:a.articleBodyAccessible===true,
   twoStageKeywordsVerified:a.scopeVerifiedFromArticle===true,
   rightsVerified:false,displayEligible:false})),
  pcCacheWritten:false,remoteD1Written:false,publicSnapshotModified:false,
  schedulerModified:false,scoreLedgerModified:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--probe')
  throw Error('R45_OPTIONAL_READ_ONLY_PROBE_REQUIRED');
 console.log(JSON.stringify(await auditIranOptionalSourcesR45()));
}
