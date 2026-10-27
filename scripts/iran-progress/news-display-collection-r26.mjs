// R26: independent PC article-discovery cache. Never publish unlicensed articles
// or modify the R3/R5 score ledger, the approved display cache, or D1.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditIranMultisourceCollectionR24,newsR24SourceUrl} from './news-display-multisource-audit-r24.mjs';
import {auditIranArticleDetailsR25} from './news-display-article-audit-r25.mjs';
import {kstDayWindow,kstNewsDay} from '../../lib/iran-progress/news-display-r1.mjs';

export const NEWS_COLLECTION_R26_VERSION='IRAN_NEWS_COLLECTION_R26';
export const NEWS_COLLECTION_R26_FILE='news-display-candidates-r26.json';
const MAX_ITEMS=700;
const MAX_FILE_BYTES=1024*1024;
const WINDOWS_RETRY_MS=[25,50,100,200,400,800];
const empty=()=>({version:NEWS_COLLECTION_R26_VERSION,items:[]});
const articleId=url=>createHash('sha256').update(url).digest('hex');

function candidateValid(item,now){
 if(!item||typeof item!=='object'||Array.isArray(item)||
  !/^[a-f0-9]{64}$/.test(item.id??'')||
  newsR24SourceUrl(item.sourceId,item.sourceUrl)!==item.sourceUrl||
  articleId(item.sourceUrl)!==item.id||
  typeof item.originalTitle!=='string'||!item.originalTitle.trim()||item.originalTitle.length>500||
  typeof item.publisherDeclaredPublishedAt!=='string')return false;
 const when=Date.parse(item.publisherDeclaredPublishedAt);
 return Number.isSafeInteger(when)&&when<=now&&
  new Date(when).toISOString()===item.publisherDeclaredPublishedAt&&
  item.reviewStatus==='ARTICLE_METADATA_REVIEWED'&&
  item.rightsVerified===false&&item.displayEligible===false;
}

function cacheFile(dataDirectory){
 if(typeof dataDirectory!=='string'||!path.isAbsolute(dataDirectory)||
  !fs.existsSync(dataDirectory)||!fs.statSync(dataDirectory).isDirectory())
  throw Error('R26_PC_DATA_DIRECTORY_INVALID');
 const target=path.join(dataDirectory,NEWS_COLLECTION_R26_FILE);
 if(fs.existsSync(target)){
  const stat=fs.lstatSync(target);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_FILE_BYTES)
   throw Error('R26_PC_CANDIDATE_CACHE_UNSAFE');
 }
 return target;
}

function replaceCandidateCache(staged,file){
 let attempt=0;
 for(;;){
  try{return fs.renameSync(staged,file);}
  catch(error){
   if(process.platform!=='win32'||!['EACCES','EPERM','EBUSY'].includes(error?.code)||
    attempt>=WINDOWS_RETRY_MS.length)throw error;
   Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,WINDOWS_RETRY_MS[attempt++]);
  }
 }
}

export function readIranCollectionR26(dataDirectory,{now=Date.now()}={}){
 const file=cacheFile(dataDirectory);
 if(!fs.existsSync(file))return empty();
 let cache;
 try{cache=JSON.parse(fs.readFileSync(file,'utf8'));}
 catch{throw Error('R26_PC_CANDIDATE_CACHE_INVALID');}
 if(cache?.version!==NEWS_COLLECTION_R26_VERSION||!Array.isArray(cache.items)||
  cache.items.length>MAX_ITEMS||!cache.items.every(item=>candidateValid(item,now))||
  new Set(cache.items.map(item=>item.id)).size!==cache.items.length)
  throw Error('R26_PC_CANDIDATE_CACHE_INVALID');
 return cache;
}

export function planIranCollectionR26({before,feedReport,articleReport,now=Date.now()}={}){
 if(before?.version!==NEWS_COLLECTION_R26_VERSION||!Array.isArray(before.items)||
  !before.items.every(item=>candidateValid(item,now))||
  feedReport?.version!=='IRAN_NEWS_MULTISOURCE_AUDIT_R24'||
  articleReport?.version!=='IRAN_ARTICLE_DETAIL_AUDIT_R25'||
  !Array.isArray(feedReport.sources)||!Array.isArray(articleReport.articles))
  throw Error('R26_COLLECTION_INPUT_INVALID');
 const {start,end}=kstDayWindow(now,30);
 const retained=before.items.filter(item=>{
  const day=kstNewsDay(Date.parse(item.publisherDeclaredPublishedAt));
  return day>=start&&day<=end;
 });
 const byId=new Map(retained.map(item=>[item.id,item]));
 let verifiedThisRun=0;
 for(const article of articleReport.articles){
  if(article.status!=='ARTICLE_METADATA_REVIEWED')continue;
  const item={id:articleId(article.sourceUrl),sourceId:article.sourceId,
   sourceUrl:article.sourceUrl,originalTitle:article.originalTitle,
   publisherDeclaredPublishedAt:article.publisherDeclaredPublishedAt,
   reviewStatus:'ARTICLE_METADATA_REVIEWED',rightsVerified:false,displayEligible:false};
  if(!candidateValid(item,now))throw Error('R26_REVIEWED_ARTICLE_CONTRACT_INVALID');
  verifiedThisRun++;
  byId.set(item.id,item);
 }
 const items=[...byId.values()].sort((a,b)=>
  b.publisherDeclaredPublishedAt.localeCompare(a.publisherDeclaredPublishedAt)||a.id.localeCompare(b.id));
 if(items.length>MAX_ITEMS)throw Error('R26_CANDIDATE_CAPACITY_REQUIRES_REVIEW');
 const partial=feedReport.sourcesFailed>0||articleReport.articleFailures>0||
  articleReport.articlesUnchecked>0;
 const freshIds=new Set(before.items.map(item=>item.id));
 return {cache:{version:NEWS_COLLECTION_R26_VERSION,updatedAt:now,items},
  report:{status:partial?'PARTIAL_COLLECTION_REVIEW_REQUIRED':'COLLECTION_REVIEW_READY',
   checkedAt:new Date(now).toISOString(),sourceCount:feedReport.sourceCount,
   sourcesFailed:feedReport.sourcesFailed,feedStatuses:feedReport.sources.map(({sourceId,status,
    feedUrlsRead,feedUrlsFailed,queuedForReview})=>({sourceId,status,feedUrlsRead,feedUrlsFailed,queuedForReview})),
   discovered:feedReport.candidatesFound,articleChecked:articleReport.articlesChecked,
   articlesUnchecked:articleReport.articlesUnchecked,articleFailures:articleReport.articleFailures,
   metadataReviewed:verifiedThisRun,newCandidates:items.filter(item=>!freshIds.has(item.id)).length,
   expiredCandidates:before.items.length-retained.length,candidatesSaved:items.length,
   publication:'NOT_AUTHORIZED',rightsVerified:0,displayEligible:0,
   scoreLedgerModified:false,publicCacheModified:false,d1Written:false,
   schedulerModified:false,translationModified:false}};
}

export async function collectIranNewsR26({dataDirectory,now=Date.now(),fetcher=fetch,
 dryRun=true,feedCollector=auditIranMultisourceCollectionR24,
 articleAuditor=auditIranArticleDetailsR25}={}){
 if(!Number.isSafeInteger(now)||typeof dryRun!=='boolean')throw Error('R26_OPTIONS_INVALID');
 const file=cacheFile(dataDirectory);
 // The approved score DB is only a marker. Never open it or write into it.
 const ledger=fs.lstatSync(path.join(dataDirectory,'iran.sqlite'));
 if(!ledger.isFile()||ledger.isSymbolicLink())throw Error('R26_SCORE_LEDGER_IDENTITY_INVALID');
 const before=readIranCollectionR26(dataDirectory,{now});
 const feedReport=await feedCollector({now,fetcher});
 if(feedReport?.version!=='IRAN_NEWS_MULTISOURCE_AUDIT_R24'||
  !Array.isArray(feedReport.candidates)||!feedReport.sourcesRead&&
  !feedReport.sources.some(source=>source.feedUrlsRead>0))
  throw Error('R26_ALL_FEEDS_FAILED_PRESERVE_CACHE');
 // Give genuinely new URLs first access to the bounded R25 article budget.
 const seen=new Set(before.items.map(item=>item.sourceUrl));
 const candidates=[...feedReport.candidates].sort((a,b)=>Number(seen.has(a.sourceUrl))-Number(seen.has(b.sourceUrl)));
 const articleReport=await articleAuditor({now,fetcher,
  feedReport:{...feedReport,candidates}});
 const planned=planIranCollectionR26({before,feedReport,articleReport,now});
 if(dryRun)return {...planned.report,dryRun:true,written:false};
 const staged=file+'.next';
 if(fs.existsSync(staged))throw Error('R26_STAGING_ALREADY_EXISTS');
 fs.writeFileSync(staged,JSON.stringify(planned.cache),{flag:'wx'});
 try{replaceCandidateCache(staged,file);}
 catch{throw Error('R26_CACHE_WRITE_OUTCOME_UNCERTAIN');}
 if(JSON.stringify(readIranCollectionR26(dataDirectory,{now}))!==JSON.stringify(planned.cache))
  throw Error('R26_CACHE_READBACK_FAILED');
 return {...planned.report,dryRun:false,written:true};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode]=process.argv.slice(2);
 if(process.argv.length!==3||!['--dry-run','--collect'].includes(mode))
  throw Error('R26_EXPLICIT_MODE_REQUIRED');
 if(mode==='--collect'&&process.env.ZGMINI_IRAN_NEWS_R26_APPROVED!=='YES')
  throw Error('R26_COLLECTION_APPROVAL_REQUIRED');
 const dataDirectory=process.env.ZGMINI_IRAN_HOME??
  path.join(os.homedir(),'.zgmini','iran-progress-r13');
 try{console.log(JSON.stringify(await collectIranNewsR26({dataDirectory,
  dryRun:mode==='--dry-run'})));}
 catch(error){console.error(JSON.stringify({status:'STOP_R26_COLLECTION',
  reason:/^R26_[A-Z0-9_]+$/.test(error?.message)?error.message:'R26_UNCLASSIFIED_FAILURE',
  scoreLedgerModified:false,d1Written:false}));process.exitCode=1;}
}
