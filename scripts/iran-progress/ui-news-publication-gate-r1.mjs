// Read-only publication readiness audit for R26 private candidate metadata.
// This tool never promotes rights, creates summaries, or writes public news.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {kstDayWindow,kstNewsDay} from '../../lib/iran-progress/news-display-r1.mjs';

export const PRIVATE_CANDIDATE_VERSION='IRAN_NEWS_COLLECTION_R26';
export const PRIVATE_CANDIDATE_BASENAME='news-display-candidates-r26.json';
const SOURCES=['tasnim','govuk','iaea-news','iaea-statements',
 'bbc-middle-east','aljazeera','un-middle-east'];
// These are review pointers, not transferable publisher-wide permission receipts.
// Publication always requires a separate, article-specific rights decision.
export const SOURCE_RIGHTS_REVIEW=Object.freeze({
 govuk:{review:'OGL_PAGE_AND_THIRD_PARTY_CHECK',policyUrl:'https://www.gov.uk/help/terms-conditions'},
 'iaea-news':{review:'IAEA_AUTHORSHIP_ATTRIBUTION_CHECK',policyUrl:'https://www.iaea.org/about/terms-of-use'},
 'iaea-statements':{review:'IAEA_AUTHORSHIP_ATTRIBUTION_CHECK',policyUrl:'https://www.iaea.org/about/terms-of-use'},
 'un-middle-east':{review:'UN_NEWS_CREDIT_AND_NOTICE_CHECK',policyUrl:'https://www.un.org/en/about-us/copyright/'},
 'bbc-middle-east':{review:'BBC_SEPARATE_PERMISSION_CHECK',policyUrl:'https://downloads.bbc.co.uk/usingthebbc/bbc_terms_of_use.pdf'},
 aljazeera:{review:'ALJAZEERA_SEPARATE_PERMISSION_CHECK',policyUrl:'https://terms.aljazeera.net/'},
 tasnim:{review:'TASNIM_CC_BY_4_0_ARTICLE_AUTHORSHIP_CHECK',policyUrl:'https://www.tasnimnews.ir/en'},
});
const MAX_FILE_BYTES=1024*1024;
// Read-only title focus indicator mirroring the R26 collector's four topics.
// This never replaces the R25 article-body keyword check.
const titleMentionsApprovedTopic=text=>
 /\b(?:iran(?:ian)?s?|saudis?|yemen(?:is?)?|houthis?)\b|이란|사우디(?:아라비아)?|예멘|예맨|후티/i.test(text);

function validCandidate(item,now){
 if(!item||typeof item!=='object'||Array.isArray(item)||
  typeof item.sourceUrl!=='string'||typeof item.sourceId!=='string'||
  !SOURCES.includes(item.sourceId)||!/^[a-f0-9]{64}$/.test(item.id??'')||
  typeof item.originalTitle!=='string'||!item.originalTitle.trim()||
  item.originalTitle.length>500||item.reviewStatus!=='ARTICLE_METADATA_REVIEWED'||
  item.rightsVerified!==false||item.displayEligible!==false||
  typeof item.publisherDeclaredPublishedAt!=='string')return false;
 let url;
 try{url=new URL(item.sourceUrl);}catch{return false;}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||
  createHash('sha256').update(item.sourceUrl).digest('hex')!==item.id)return false;
 const published=Date.parse(item.publisherDeclaredPublishedAt);
 return Number.isSafeInteger(published)&&published<=now&&
  new Date(published).toISOString()===item.publisherDeclaredPublishedAt;
}

/**
 * Separates collection relevance from publication permission. Every R26 item is
 * private by contract, even if its title or article body matched a keyword.
 */
export function auditPrivateNewsPublicationGate(cache,{now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||now<1||cache?.version!==PRIVATE_CANDIDATE_VERSION||
  !Array.isArray(cache.items)||cache.items.length>700||
  (cache.items.length>0&&(!Number.isSafeInteger(cache.updatedAt)||
   cache.updatedAt<1||cache.updatedAt>now))||
  !cache.items.every(item=>validCandidate(item,now))||
  new Set(cache.items.map(item=>item.id)).size!==cache.items.length)
  throw Error('UI_NEWS_CANDIDATE_INPUT_INVALID');

 const visibleWindow=kstDayWindow(now,14);
 const retentionWindow=kstDayWindow(now,30);
 const sourceCounts=Object.fromEntries(SOURCES.map(source=>[source,0]));
 let inLast14Days=0,inLast30Days=0,titleKeywordMatches=0;
 for(const item of cache.items){
  sourceCounts[item.sourceId]++;
  const day=kstNewsDay(Date.parse(item.publisherDeclaredPublishedAt));
  if(day>=visibleWindow.start&&day<=visibleWindow.end)inLast14Days++;
  if(day>=retentionWindow.start&&day<=retentionWindow.end)inLast30Days++;
  if(titleMentionsApprovedTopic(item.originalTitle))titleKeywordMatches++;
 }
 return {
  status:cache.items.length?'BLOCKED_PRIVATE_CANDIDATES':'NO_PRIVATE_CANDIDATES',
  checkedAt:new Date(now).toISOString(),
  cacheUpdatedAt:Number.isSafeInteger(cache.updatedAt)?new Date(cache.updatedAt).toISOString():null,
  candidateCount:cache.items.length,
  within14DayWindow:inLast14Days,
  within30DayWindow:inLast30Days,
  sourceCounts,
  titleKeywordMatches,
  // Article body is not stored in the private candidate cache. A title-only
  // mismatch is not evidence that a verified body keyword was absent.
  titleFocusReviewNeeded:cache.items.length-titleKeywordMatches,
  rightsVerifiedCount:0,displayEligibleCount:0,
  publicReadyCount:0,publicWriteAttempted:false,
  nextGate:'ARTICLE_RIGHTS_SUMMARY_IMPACT_REVIEW',
 };
}

/**
 * Read-only per-article review queue. A keyword match or source policy does not
 * establish article-specific rights, accuracy, Korean summary, or impact.
 */
export function privateNewsReviewQueue(cache,{now=Date.now()}={}){
 const summary=auditPrivateNewsPublicationGate(cache,{now});
 const {start,end}=kstDayWindow(now,14);
 return {
  ...summary,
  reviewQueue:cache.items.map(item=>{
   const kstDay=kstNewsDay(Date.parse(item.publisherDeclaredPublishedAt));
   const policy=SOURCE_RIGHTS_REVIEW[item.sourceId];
   return {
    id:item.id,sourceId:item.sourceId,sourceUrl:item.sourceUrl,
    publisherHost:new URL(item.sourceUrl).hostname,
    originalTitle:item.originalTitle,publisherDeclaredPublishedAt:item.publisherDeclaredPublishedAt,
    kstDay,withinPublicWindow:kstDay>=start&&kstDay<=end,
    titleMentionsApprovedTopic:titleMentionsApprovedTopic(item.originalTitle),
    rightsReview:policy.review,rightsPolicyUrl:policy.policyUrl,
    status:'REVIEW_REQUIRED_NOT_PUBLISHABLE',
    remainingChecks:['ORIGINAL_ARTICLE_BODY_AND_TOPIC','PUBLISHER_DATE_AND_DUPLICATE',
     'ARTICLE_SPECIFIC_RIGHTS','INDEPENDENT_KOREAN_SUMMARY','REVIEWED_IMPACT'],
   };
  }).sort((a,b)=>Number(b.withinPublicWindow)-Number(a.withinPublicWindow)||
   b.publisherDeclaredPublishedAt.localeCompare(a.publisherDeclaredPublishedAt)||a.id.localeCompare(b.id)),
 };
}

function readPrivateNewsCandidateFile(file){
 if(typeof file!=='string'||!path.isAbsolute(file)||
  path.basename(file)!==PRIVATE_CANDIDATE_BASENAME)
  throw Error('UI_NEWS_CANDIDATE_PATH_INVALID');
 let stat;
 try{stat=fs.lstatSync(file);}catch{throw Error('UI_NEWS_CANDIDATE_FILE_UNAVAILABLE');}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_FILE_BYTES)
  throw Error('UI_NEWS_CANDIDATE_FILE_UNSAFE');
 let cache;
 try{cache=JSON.parse(fs.readFileSync(file,'utf8'));}
 catch{throw Error('UI_NEWS_CANDIDATE_JSON_INVALID');}
 return cache;
}

export function auditPrivateNewsPublicationFile(file,{now=Date.now()}={}){
 return auditPrivateNewsPublicationGate(readPrivateNewsCandidateFile(file),{now});
}

export function privateNewsReviewQueueFile(file,{now=Date.now()}={}){
 return privateNewsReviewQueue(readPrivateNewsCandidateFile(file),{now});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length<1||args.length>2||!args[0].startsWith('--input=')||
  (args.length===2&&args[1]!=='--review'))
  throw Error('UI_NEWS_EXPLICIT_INPUT_REQUIRED');
 try{console.log(JSON.stringify(args[1]==='--review'?
  privateNewsReviewQueueFile(args[0].slice(8)):
  auditPrivateNewsPublicationFile(args[0].slice(8))));}
 catch(error){
  console.error(JSON.stringify({status:'BLOCKED',reason:error.message}));
  process.exitCode=1;
 }
}
