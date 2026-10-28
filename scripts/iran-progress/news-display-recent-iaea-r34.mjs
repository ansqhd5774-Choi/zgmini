// R34: one-time IAEA 27 October discovery/body probe, then optional private
// candidate collection. Never writes the public news cache, D1, scores or tasks.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {resolvePcProject} from './news-display-upgrade-r32.mjs';
import {planIranR34Upgrade,r34SafeInstallationTime}
 from './news-display-upgrade-r34.mjs';

export const R34_RECENT_STATEMENTS=Object.freeze([
 {day:'2026-10-27',url:'https://www.iaea.org/newscenter/statements/director-general-statement-to-the-united-nations-security-council'},
 {day:'2026-10-23',url:'https://www.iaea.org/newscenter/statements/director-general-statement-to-81st-session-of-the-un-general-assembly'},
]);
const R26_ALLOWED_SHA=Object.freeze([
 '3cc83460d196ab8d0c74329e5b5f1a30f4dda9723c2de1ffee0acc1dbc4487f8',
 'd23be30ee8c0bc7d8eef6865c129356fc0dcf306cd45e471d528b158ab0cf939',
]);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const checkedBytes=file=>{
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size===0||stat.size>1024*1024)
  throw Error('R34_INSTALLED_MODULE_UNSAFE');
 return fs.readFileSync(file);
};

export async function probeRecentIaeaR34({feedCollector,articleAuditor,now=Date.now()}={}){
 if(typeof feedCollector!=='function'||typeof articleAuditor!=='function'||
  !Number.isSafeInteger(now))throw Error('R34_PROBE_OPTIONS_INVALID');
 const feeds=[{id:'iaea-statements',url:'https://www.iaea.org/feeds/dgstatements',kind:'xml'}];
 const feed=await feedCollector({now,feeds});
 if(feed?.version!=='IRAN_NEWS_MULTISOURCE_AUDIT_R24'||
  !Array.isArray(feed.candidates)||!Array.isArray(feed.sources))
  throw Error('R34_FEED_REPORT_INVALID');
 const details=await articleAuditor({now,feedReport:feed,maxArticles:30});
 if(details?.version!=='IRAN_ARTICLE_DETAIL_AUDIT_R25'||
  !Array.isArray(details.articles))throw Error('R34_ARTICLE_REPORT_INVALID');
 const results=R34_RECENT_STATEMENTS.map(({day,url})=>{
  const discovered=feed.candidates.some(x=>x.sourceId==='iaea-statements'&&x.sourceUrl===url);
  const article=details.articles.find(x=>x.sourceId==='iaea-statements'&&x.sourceUrl===url);
  const verified=discovered&&article?.status==='ARTICLE_METADATA_REVIEWED'&&
   article.publisherDeclaredPublishedAt?.slice(0,10)===day&&
   article.withinRetentionWindow===true&&article.originalTitleVerified===true&&
   article.articleBodyAccessible===true&&article.scopeVerifiedFromArticle===true;
  return {sourceId:'iaea-statements',sourceUrl:url,expectedPublishedDay:day,
   discoveredFromPublisher:discovered,
   status:verified?'ARTICLE_METADATA_REVIEWED':article?.status??
    (discovered?'ARTICLE_NOT_CHECKED':'NOT_DISCOVERED'),
   publisherDeclaredPublishedAt:article?.publisherDeclaredPublishedAt??null,
   articleBodyAccessible:article?.articleBodyAccessible===true,
   bodyCharacterCount:article?.bodyCharacterCount??0,
   httpStatus:article?.httpStatus??null,withinRetentionWindow:article?.withinRetentionWindow??null,
   privatelyVerified:!!verified,rightsVerified:false,displayEligible:false};
 });
 return {version:'IRAN_NEWS_RECENT_IAEA_R34',
  status:results[0].privatelyVerified?'PASS_R34_27OCT_LIVE_ARTICLE_REVIEWED':
   'PARTIAL_R34_27OCT_NOT_AUTO_COLLECTED',
  publisherFeeds:feed.sources.map(x=>({sourceId:x.sourceId,status:x.status,
   feedUrlsRead:x.feedUrlsRead,feedUrlsFailed:x.feedUrlsFailed,
   queuedForReview:x.queuedForReview})),
  candidateCount:feed.candidates.length,results,
  pcCacheWritten:false,publicCacheModified:false,d1Written:false,
  schedulerModified:false,scoreLedgerModified:false,translationModified:false};
}

async function installedModules(bundleRoot){
 const projectRoot=resolvePcProject();
 const plan=planIranR34Upgrade({bundleRoot,projectRoot});
 if(plan.status!=='R34_ALREADY_INSTALLED')throw Error('R34_PC_NEW_DISCOVERY_NOT_INSTALLED');
 const scripts=path.join(projectRoot,'scripts','iran-progress');
 const {auditIranMultisourceCollectionR24}=await import(pathToFileURL(path.join(scripts,
  'news-display-multisource-audit-r24.mjs')).href);
 const {auditIranArticleDetailsR25}=await import(pathToFileURL(path.join(scripts,
  'news-display-article-audit-r25.mjs')).href);
 return {projectRoot,scripts,auditIranMultisourceCollectionR24,auditIranArticleDetailsR25};
}

async function collectOnePrivateCycle({bundleRoot,now=Date.now()}){
 if(!r34SafeInstallationTime(now))throw Error('R34_NEAR_SCHEDULE_WINDOW_WAIT');
 const {scripts}=await installedModules(bundleRoot);
 const collectorFile=path.join(scripts,'news-display-collection-r26.mjs');
 if(!R26_ALLOWED_SHA.includes(sha(checkedBytes(collectorFile))))
  throw Error('R34_R26_PRIVATE_COLLECTOR_IDENTITY_DRIFT');
 const {collectIranNewsR26,readIranCollectionR26}=await import(pathToFileURL(collectorFile).href);
 const dataDirectory=process.env.ZGMINI_IRAN_HOME??
  path.join(os.homedir(),'.zgmini','iran-progress-r13');
 const result=await collectIranNewsR26({dataDirectory,now,dryRun:false});
 if(result.written!==true||result.dryRun!==false||result.d1Written!==false||
  result.publicCacheModified!==false||result.scoreLedgerModified!==false||
  result.schedulerModified!==false)throw Error('R34_PRIVATE_COLLECTION_CONTRACT_INVALID');
 const cache=readIranCollectionR26(dataDirectory,{now});
 const recent=cache.items.find(x=>x.sourceId==='iaea-statements'&&
  x.sourceUrl===R34_RECENT_STATEMENTS[0].url);
 return {version:'IRAN_NEWS_R34_PRIVATE_COLLECT_ONCE',
  status:recent?'PASS_R34_27OCT_PRIVATE_CANDIDATE_SAVED':
   'PARTIAL_R34_27OCT_NOT_IN_PRIVATE_CACHE',
  candidatesSaved:result.candidatesSaved,newCandidates:result.newCandidates,
  recentStatementStored:!!recent,
  articleCoverage:result.articleCoverage??null,
  pcCacheWritten:true,publicCacheModified:false,d1Written:false,
  schedulerModified:false,scoreLedgerModified:false,translationModified:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2];
 if(process.argv.length!==3||!['--probe','--collect-once'].includes(mode)){
  console.error(JSON.stringify({status:'STOP_R34_MODE_INVALID'}));process.exitCode=2;
 }else{
  const bundleRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  try{
   let result;
   if(mode==='--probe'){
    const modules=await installedModules(bundleRoot);
    result=await probeRecentIaeaR34({
     feedCollector:modules.auditIranMultisourceCollectionR24,
     articleAuditor:modules.auditIranArticleDetailsR25});
   }else{
    if(process.env.ZGMINI_IRAN_NEWS_R34_COLLECT_APPROVED!=='YES')
     throw Error('R34_EXPLICIT_PRIVATE_COLLECT_APPROVAL_REQUIRED');
    result=await collectOnePrivateCycle({bundleRoot});
   }
   console.log(JSON.stringify(result));
   if(!result.status.startsWith('PASS_R34_'))process.exitCode=1;
  }catch(error){
   console.error(JSON.stringify({status:'STOP_R34',
    reason:/^R34_[A-Z0-9_]+$/.test(error?.message)?error.message:
     'R34_UNCLASSIFIED_FAILURE',d1Written:false,schedulerModified:false}));
   process.exitCode=2;
  }
 }
}
