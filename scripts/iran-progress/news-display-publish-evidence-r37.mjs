// R37: recheck the original articles behind the R36 private cache before publication.
// This is evidence gathering, not an approval receipt or a D1 publisher.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {auditIranArticleDetailsR25} from './news-display-article-audit-r25.mjs';
import {newsR24SourceUrl} from './news-display-multisource-audit-r24.mjs';
import {R36_ACTIVE_SOURCE_IDS} from './news-display-coverage-readonly-r36.mjs';
import {kstDayWindow,kstNewsDay} from '../../lib/iran-progress/news-display-r1.mjs';

const SHA256=/^[a-f0-9]{64}$/;
const MAX_FILE_BYTES=1024*1024;
const MAX_ITEMS=70;

export function loadR37CandidateCache(file){
 if(typeof file!=='string'||!path.isAbsolute(file))throw Error('R37_ABSOLUTE_INPUT_REQUIRED');
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<20||stat.size>MAX_FILE_BYTES)
  throw Error('R37_UNSAFE_CANDIDATE_FILE');
 const bytes=fs.readFileSync(file);
 let parsed;
 try{parsed=JSON.parse(bytes.toString('utf8'));}
 catch{throw Error('R37_CANDIDATE_JSON_INVALID');}
 return {cache:parsed,inputSha256:createHash('sha256').update(bytes).digest('hex')};
}

export function prepareR37Review(cache,{now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||cache?.version!=='IRAN_NEWS_COLLECTION_R26'||
  !Array.isArray(cache.items)||cache.items.length<1||cache.items.length>MAX_ITEMS)
  throw Error('R37_CACHE_FORMAT_INVALID');
 const active=new Set(R36_ACTIVE_SOURCE_IDS);
 const ids=new Set(),urls=new Set(),{start,end}=kstDayWindow(now,14);
 const items=cache.items.map(candidate=>{
  if(!candidate||!active.has(candidate.sourceId)||
   typeof candidate.sourceUrl!=='string'||
   newsR24SourceUrl(candidate.sourceId,candidate.sourceUrl)!==candidate.sourceUrl||
   typeof candidate.originalTitle!=='string'||candidate.originalTitle.trim().length<1||
   candidate.originalTitle.length>500||!SHA256.test(candidate.id??'')||
   candidate.reviewStatus!=='ARTICLE_METADATA_REVIEWED'||
   candidate.rightsVerified!==false||candidate.displayEligible!==false||
   typeof candidate.publisherDeclaredPublishedAt!=='string')
   throw Error('R37_CANDIDATE_CONTRACT_INVALID');
  const published=Date.parse(candidate.publisherDeclaredPublishedAt);
  if(!Number.isSafeInteger(published)||published>now||published<0||
   new Date(published).toISOString()!==candidate.publisherDeclaredPublishedAt)
   throw Error('R37_CANDIDATE_DATE_INVALID');
  if(ids.has(candidate.id)||urls.has(candidate.sourceUrl))throw Error('R37_DUPLICATE_CANDIDATE');
  ids.add(candidate.id);urls.add(candidate.sourceUrl);
  const day=kstNewsDay(published);
  return {...candidate,in14DayDisplayWindow:day>=start&&day<=end};
 });
 const candidates=items.map(({in14DayDisplayWindow,...candidate})=>candidate);
 const sources=R36_ACTIVE_SOURCE_IDS.map(sourceId=>({sourceId,
  status:'CACHE_OBSERVED',queuedForReview:items.filter(x=>x.sourceId===sourceId).length}));
 return {items,feedReport:{version:'IRAN_NEWS_MULTISOURCE_AUDIT_R24',
  sourceCount:7,sourcesFailed:0,sources,candidates},
  window:{start,end},privateCount:items.length,
  inDisplayWindow:items.filter(x=>x.in14DayDisplayWindow).length};
}

export async function runR37ArticleEvidence({cache,now=Date.now(),fetcher=fetch,
 auditor=auditIranArticleDetailsR25}={}){
 const prepared=prepareR37Review(cache,{now});
 const audit=await auditor({feedReport:prepared.feedReport,maxArticles:prepared.privateCount,
  concurrency:4,fetcher,now});
 if(audit?.version!=='IRAN_ARTICLE_DETAIL_AUDIT_R25'||
  !Array.isArray(audit.articles)||audit.articles.length!==prepared.privateCount)
  throw Error('R37_ARTICLE_AUDIT_CONTRACT_INVALID');
 const original=new Map(prepared.items.map(item=>[item.sourceUrl,item]));
 const checkedUrls=new Set();
 const articles=audit.articles.map(record=>{
  const cached=original.get(record.sourceUrl);
  if(!cached||checkedUrls.has(record.sourceUrl)||record.sourceId!==cached.sourceId)
   throw Error('R37_AUDIT_IDENTITY_MISMATCH');
  checkedUrls.add(record.sourceUrl);
  return {sourceId:cached.sourceId,sourceUrl:cached.sourceUrl,
   originalTitle:cached.originalTitle,
   publisherDeclaredPublishedAt:cached.publisherDeclaredPublishedAt,
   in14DayDisplayWindow:cached.in14DayDisplayWindow,
   auditStatus:record.status,
   originalTitleVerified:record.originalTitleVerified===true,
   articleBodyAccessible:record.articleBodyAccessible===true,
   bodyCharacterCount:record.bodyCharacterCount??0,
   publicationDateEvidence:record.publicationDateEvidence??null,
   publicationDateMatched:record.publisherDeclaredPublishedAt===cached.publisherDeclaredPublishedAt,
   rightsVerified:false,displayEligible:false,
   publicWritePerformed:false};
 });
 const verified=articles.filter(a=>a.in14DayDisplayWindow&&
  a.auditStatus==='ARTICLE_METADATA_REVIEWED'&&a.articleBodyAccessible&&
  a.publicationDateMatched);
 const bySource=R36_ACTIVE_SOURCE_IDS.map(sourceId=>({sourceId,
  privateCount:articles.filter(a=>a.sourceId===sourceId).length,
  recentCount:articles.filter(a=>a.sourceId===sourceId&&a.in14DayDisplayWindow).length,
  bodyAndDateVerified:verified.filter(a=>a.sourceId===sourceId).length}));
 return {version:'IRAN_NEWS_R37_PUBLISH_EVIDENCE_READONLY',
  status:'PUBLIC_REVIEW_INPUT_PENDING',checkedAt:new Date(now).toISOString(),
  recentWindowKst:prepared.window,privateCandidateCount:prepared.privateCount,
  in14DayDisplayWindow:prepared.inDisplayWindow,
  outsideDisplayWindow:prepared.privateCount-prepared.inDisplayWindow,
  articleBodyAndDateVerified:verified.length,bySource,articles,
  approvedPublicationItems:0,
  pcCacheWritten:false,d1Written:false,schedulerModified:false,
  scoreLedgerModified:false,publicCacheModified:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--audit-readonly')
   throw Error('R37_READ_ONLY_MODE_REQUIRED');
  const input=process.argv[3];
  const {cache,inputSha256}=loadR37CandidateCache(input);
  const report={...await runR37ArticleEvidence({cache}),candidateCacheSha256:inputSha256};
  // A report is written beside the script, never beside the PC operational cache.
  const output=path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),
   `IRAN_NEWS_R37_ARTICLE_EVIDENCE_${Date.now()}.json`);
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:report.status,reportFile:output,
   privateCandidateCount:report.privateCandidateCount,
   in14DayDisplayWindow:report.in14DayDisplayWindow,
   articleBodyAndDateVerified:report.articleBodyAndDateVerified,
   d1Written:false,publicCacheModified:false}));
 }catch(error){console.error(JSON.stringify({status:'STOP_R37_ARTICLE_EVIDENCE',
  reason:/^R37_[A-Z0-9_]+$/.test(error?.message)?error.message:'R37_UNCLASSIFIED_FAILURE',
  d1Written:false,publicCacheModified:false}));process.exitCode=2;}
}
