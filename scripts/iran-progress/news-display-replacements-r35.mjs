// R35: one-time private probe for actual 27 October Guardian and DW articles.
// The publisher RSS must DISCOVER the exact URL before R25 checks body/date.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolvePcProject} from './news-display-upgrade-r32.mjs';
import {planIranR35Upgrade,r35SafeInstallationTime}
 from './news-display-upgrade-r35.mjs';
import {IRAN_DISPLAY_FEEDS_R26} from './news-display-source-registry-r26.mjs';
import {auditIranMultisourceCollectionR24}
 from './news-display-multisource-audit-r24.mjs';
import {auditIranArticleDetailsR25} from './news-display-article-audit-r25.mjs';

export const R35_RECENT_ARTICLES=Object.freeze([
 Object.freeze({sourceId:'guardian-iran',day:'2026-10-27',
  url:'https://www.theguardian.com/global-development/2026/oct/27/fears-grow-for-iranian-athletes-on-death-row-as-mountaineer-latest-to-be-hanged'}),
 Object.freeze({sourceId:'dw-world',day:'2026-10-27',
  url:'https://www.dw.com/en/will-elections-in-israel-change-its-iran-approach/a-79776122'}),
]);
const R26_ALLOWED_SHA=Object.freeze([
 '3cc83460d196ab8d0c74329e5b5f1a30f4dda9723c2de1ffee0acc1dbc4487f8',
 'd23be30ee8c0bc7d8eef6865c129356fc0dcf306cd45e471d528b158ab0cf939',
]);
const NEW_R24_SHA='6140a4031cb0235f6360f5b05cceb916611d34c4b74a5279f446588ae4c8d6fa';
const NEW_R26_REGISTRY_SHA='87744873c87d7aaacb7d760f8a0613c8b971d1562a03857ca6dbd82583302790';
const R25_SHA='99858d37a345a49e6c464427beeb61c1da0a5bd671f712b8817e774234dfc985';
const sha=file=>{
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size===0||stat.size>1024*1024)
  throw Error('R35_MODULE_UNSAFE');
 return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
};

export async function probeReplacementSourcesR35({now=Date.now(),fetcher=fetch,
 feedCollector=auditIranMultisourceCollectionR24,
 articleAuditor=auditIranArticleDetailsR25}={}){
 if(!Number.isSafeInteger(now)||typeof fetcher!=='function')
  throw Error('R35_PROBE_OPTIONS_INVALID');
 const feeds=IRAN_DISPLAY_FEEDS_R26.filter(s=>R35_RECENT_ARTICLES.some(x=>x.sourceId===s.id));
 if(feeds.length!==2)throw Error('R35_REPLACEMENT_REGISTRY_INVALID');
 const feed=await feedCollector({now,feeds,fetcher});
 if(feed?.version!=='IRAN_NEWS_MULTISOURCE_AUDIT_R24'||
  !Array.isArray(feed.candidates)||!Array.isArray(feed.sources))
  throw Error('R35_FEED_REPORT_INVALID');
 const selected=feed.candidates.filter(candidate=>R35_RECENT_ARTICLES.some(x=>
  x.sourceId===candidate.sourceId&&x.url===candidate.sourceUrl));
 const details=selected.length?await articleAuditor({now,fetcher,
  feedReport:{...feed,candidates:selected},maxArticles:2}):{articles:[]};
 if(!Array.isArray(details.articles))throw Error('R35_ARTICLE_REPORT_INVALID');
 const results=R35_RECENT_ARTICLES.map(expected=>{
  const discovered=selected.some(x=>x.sourceId===expected.sourceId&&
   x.sourceUrl===expected.url);
  const article=details.articles.find(x=>x.sourceId===expected.sourceId&&
   x.sourceUrl===expected.url);
  const verified=discovered&&article?.status==='ARTICLE_METADATA_REVIEWED'&&
   article.publisherDeclaredPublishedAt?.slice(0,10)===expected.day&&
   article.withinRetentionWindow===true&&article.articleBodyAccessible===true&&
   article.originalTitleVerified===true&&article.scopeVerifiedFromArticle===true;
  return {sourceId:expected.sourceId,sourceUrl:expected.url,
   expectedPublishedDay:expected.day,discoveredFromPublisher:discovered,
   status:verified?'ARTICLE_METADATA_REVIEWED':article?.status??
    (discovered?'ARTICLE_NOT_CHECKED':'NOT_DISCOVERED'),
   publisherDeclaredPublishedAt:article?.publisherDeclaredPublishedAt??null,
   articleBodyAccessible:article?.articleBodyAccessible===true,
   bodyCharacterCount:article?.bodyCharacterCount??0,
   httpStatus:article?.httpStatus??null,errorCode:article?.errorCode??null,
   withinRetentionWindow:article?.withinRetentionWindow??null,
   privatelyVerified:!!verified,rightsVerified:false,displayEligible:false};
 });
 return {version:'IRAN_NEWS_TWO_REPLACEMENTS_R35',
  status:results.every(x=>x.privatelyVerified)?
   'PASS_R35_TWO_27OCT_ARTICLES_REVIEWED':'PARTIAL_R35_REPLACEMENT_SOURCE_UNVERIFIED',
  publisherFeeds:feed.sources.map(s=>({sourceId:s.sourceId,status:s.status,
   feedUrlsRead:s.feedUrlsRead,feedUrlsFailed:s.feedUrlsFailed,
   queuedForReview:s.queuedForReview})),
  candidatesFound:feed.candidatesFound,results,
  pcCacheWritten:false,publicCacheModified:false,d1Written:false,
  schedulerModified:false,scoreLedgerModified:false,translationModified:false};
}

function bundleIdentity(bundleRoot){
 const base=path.join(bundleRoot,'scripts','iran-progress');
 for(const [file,expected] of [
  ['news-display-multisource-audit-r24.mjs',NEW_R24_SHA],
  ['news-display-source-registry-r26.mjs',NEW_R26_REGISTRY_SHA],
  ['news-display-article-audit-r25.mjs',R25_SHA],
 ])if(sha(path.join(base,file))!==expected)throw Error('R35_PACKAGE_CONTENT_DRIFT');
}

async function collectOnePrivateCycle({bundleRoot,now=Date.now()}){
 if(!r35SafeInstallationTime(now))throw Error('R35_NEAR_SCHEDULE_WINDOW_WAIT');
 const projectRoot=resolvePcProject();
 const plan=planIranR35Upgrade({bundleRoot,projectRoot,now});
 if(plan.status!=='R35_ALREADY_INSTALLED')throw Error('R35_REPLACEMENTS_NOT_INSTALLED');
 const file=path.join(projectRoot,'scripts','iran-progress',
  'news-display-collection-r26.mjs');
 if(!R26_ALLOWED_SHA.includes(sha(file)))throw Error('R35_COLLECTOR_IDENTITY_DRIFT');
 const {collectIranNewsR26,readIranCollectionR26}=await import(pathToFileURL(file).href);
 const dataDirectory=process.env.ZGMINI_IRAN_HOME??
  path.join(os.homedir(),'.zgmini','iran-progress-r13');
 const result=await collectIranNewsR26({dataDirectory,now,dryRun:false});
 if(result.written!==true||result.dryRun!==false||result.sourceCount!==7||
  result.d1Written!==false||result.publicCacheModified!==false||
  result.scoreLedgerModified!==false||result.schedulerModified!==false)
  throw Error('R35_PRIVATE_COLLECTION_CONTRACT_INVALID');
 const cache=readIranCollectionR26(dataDirectory,{now});
 const retained=R35_RECENT_ARTICLES.map(article=>({sourceId:article.sourceId,
  sourceUrl:article.url,saved:cache.items.some(x=>x.sourceId===article.sourceId&&
   x.sourceUrl===article.url&&x.publisherDeclaredPublishedAt.startsWith(article.day))}));
 return {version:'IRAN_NEWS_PRIVATE_COLLECT_R35',
  status:retained.every(x=>x.saved)?'PASS_R35_TWO_PRIVATE_ARTICLES_SAVED':
   'PARTIAL_R35_PRIVATE_ARTICLES_NOT_SAVED',
  retained,candidatesSaved:result.candidatesSaved,
  sourcesFailed:result.sourcesFailed,articleFailures:result.articleFailures,
  newCandidates:result.newCandidates,pcCacheWritten:true,
  publicCacheModified:false,d1Written:false,schedulerModified:false,
  scoreLedgerModified:false,translationModified:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2];
 if(process.argv.length!==3||!['--probe','--collect-once'].includes(mode)){
  console.error('STOP_R35_MODE_INVALID');process.exitCode=2;
 }else{
  try{
   const bundleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
   bundleIdentity(bundleRoot);
   let result;
   if(mode==='--probe')result=await probeReplacementSourcesR35();
   else{
    if(process.env.ZGMINI_IRAN_NEWS_R35_COLLECT_APPROVED!=='YES')
     throw Error('R35_EXPLICIT_PRIVATE_COLLECT_APPROVAL_REQUIRED');
    result=await collectOnePrivateCycle({bundleRoot});
   }
   console.log(JSON.stringify(result));
   if(!result.status.startsWith('PASS_R35_'))process.exitCode=1;
  }catch(error){
   console.error(JSON.stringify({status:'STOP_R35',
    reason:/^R35_[A-Z0-9_]+$/.test(error?.message)?error.message:
     'R35_UNCLASSIFIED_FAILURE',d1Written:false,schedulerModified:false}));
   process.exitCode=2;
  }
 }
}
