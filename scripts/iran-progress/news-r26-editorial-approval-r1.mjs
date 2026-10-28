// Human editorial/rights decisions -> strictly validated R26 reviewed input.
// No AI draft, article keyword, or publisher-wide licence can approve itself.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {privateNewsReviewQueueFile} from './ui-news-publication-gate-r1.mjs';
import {R26_KOREAN_DRAFT_VERSION} from './news-r26-ollama-drafts-r1.mjs';
import {R26_REVIEW_SOURCE_MAP,linkR26ReviewedNews} from './news-r26-reviewed-link-r1.mjs';
import {NEWS_RIGHTS_SOURCES} from '../../lib/iran-progress/news-source-rights-r2.mjs';
import {RIGHTS_SOURCE,RIGHTS_POLICY_URL} from './news-display-r1.mjs';
import {APPROVED_INPUT_VERSION,parseReviewedNewsInput} from './news-display-maintenance-r1.mjs';

export const R26_EDITORIAL_DECISION_VERSION='IRAN_NEWS_EDITORIAL_DECISIONS_R1';
const IMPACTS=new Set(['positive','negative','neutral']);
const sha=text=>createHash('sha256').update(text).digest('hex');
const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const reviewer=value=>typeof value==='string'&&/^[^\r\n\u0000-\u001f]{3,80}$/.test(value.trim());
const reason=value=>typeof value==='string'&&value.trim().length>=12&&value.length<=500;
function instant(time,now){
 return typeof time==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(time)&&
  Number.isSafeInteger(Date.parse(time))&&Date.parse(time)>0&&Date.parse(time)<=now&&
  new Date(Date.parse(time)).toISOString()===time;
}

/** Immutable digest binds an approval decision to exact Korean text and source receipt. */
export function r26DraftFingerprint(draft){
 if(!draft||!isHash(draft.id)||!isHash(draft.sourceTextSha256)||
    typeof draft.sourceUrl!=='string'||typeof draft.title!=='string'||
    typeof draft.summary!=='string'||!IMPACTS.has(draft.suggestedImpact)||
    typeof draft.model!=='string'||typeof draft.promptVersion!=='string'||
    !Number.isSafeInteger(draft.generatedAt))throw Error('NEWS_R26_DRAFT_FINGERPRINT_INPUT_INVALID');
 return sha(JSON.stringify({id:draft.id,sourceUrl:draft.sourceUrl,
  sourceTextSha256:draft.sourceTextSha256,title:draft.title,summary:draft.summary,
  suggestedImpact:draft.suggestedImpact,model:draft.model,
  promptVersion:draft.promptVersion,generatedAt:draft.generatedAt}));
}

function cleanDrafts(queue,bundle,now){
 if(bundle?.version!==R26_KOREAN_DRAFT_VERSION||!Array.isArray(bundle.items)||
    bundle.items.length>100)throw Error('NEWS_R26_DRAFTS_FORMAT_INVALID');
 const candidates=new Map(queue.reviewQueue.map(item=>[item.id,item]));
 const items=new Map();
 for(const item of bundle.items){
  const candidate=candidates.get(item?.id);
  if(!candidate||items.has(item.id)||!candidate.withinPublicWindow||
     item.sourceUrl!==candidate.sourceUrl||item.sourceId!==candidate.sourceId||
     item.originalTitle!==candidate.originalTitle||
     item.publishedAt!==candidate.publisherDeclaredPublishedAt||
     item.rightsVerified!==false||item.displayEligible!==false||
     item.reviewStatus!=='PENDING_EDITORIAL_AND_RIGHTS_REVIEW'||
     !isHash(item.sourceTextSha256)||
     typeof item.title!=='string'||!/[가-힣]/.test(item.title)||
     typeof item.summary!=='string'||!/[가-힣]/.test(item.summary)||
     !Number.isSafeInteger(item.generatedAt)||item.generatedAt<=0||
     item.generatedAt>now)
   throw Error('NEWS_R26_DRAFTS_CANDIDATE_MISMATCH');
  r26DraftFingerprint(item);
  items.set(item.id,item);
 }
 return items;
}

function approveRecord(draft,decision,now){
 if(decision.draftSha256!==r26DraftFingerprint(draft)||
    decision.sourceUrl!==draft.sourceUrl||!reviewer(decision.reviewer)||
    !reason(decision.reviewNotes)||!instant(decision.reviewedAt,now)||
    Date.parse(decision.reviewedAt)<draft.generatedAt||
    decision.originalArticleReviewed!==true||
    decision.titleReviewed!==true||decision.factsReviewed!==true||
    decision.editorialSummaryReviewed!==true||decision.impactReviewed!==true||
    decision.rightsReviewed!==true||!IMPACTS.has(decision.impact))
  throw Error('NEWS_R26_EDITORIAL_APPROVAL_INCOMPLETE');
 const source=R26_REVIEW_SOURCE_MAP[draft.sourceId];
 const common={source,sourceUrl:draft.sourceUrl,publishedAt:draft.publishedAt,
  title:draft.title,summary:draft.summary,impact:decision.impact,
  rightsVerified:true,displayEligible:true,editorialSummaryReviewed:true,
  rightsReviewedAt:decision.reviewedAt};
 if(source==='GOV.UK'){
  if(decision.thirdPartyContentCleared!==true||decision.oglScopeReviewed!==true)
   throw Error('NEWS_R26_GOVUK_RIGHTS_UNVERIFIED');
  return {...common,rightsSource:RIGHTS_SOURCE,rightsPolicyUrl:RIGHTS_POLICY_URL};
 }
 const policy=NEWS_RIGHTS_SOURCES[source];
 if(!policy)throw Error('NEWS_R26_SOURCE_RIGHTS_UNSUPPORTED');
 const rec={...common,...policy};
 // Private receipts contain only validated rights fields, not UI label strings.
 delete rec.label;
 if(source==='Tasnim'||source==='IAEA'){
  if(decision.sourceOriginalContentVerified!==true||
     typeof decision.creatorCredit!=='string'||
     decision.creatorCredit.trim().length<2)
   throw Error('NEWS_R26_LICENSED_SOURCE_NOT_VERIFIED');
  return {...rec,sourceOriginalContentVerified:true,
   creatorCredit:decision.creatorCredit.trim(),adaptationNotice:'한국어 번역·요약'};
 }
 if(source==='UN'){
  if(decision.sourceOriginalContentVerified!==true||
     decision.newsReuseScopeReviewed!==true||
     !instant(decision.unNoticeConfirmedAt,now)||
     Date.parse(decision.unNoticeConfirmedAt)>Date.parse(decision.reviewedAt)||
     typeof decision.creatorCredit!=='string'||
     decision.creatorCredit.trim().length<2)
   throw Error('NEWS_R26_UN_NOTICE_UNVERIFIED');
  return {...rec,sourceOriginalContentVerified:true,newsReuseScopeReviewed:true,
   unNoticeConfirmedAt:decision.unNoticeConfirmedAt,creatorCredit:decision.creatorCredit.trim(),
   adaptationNotice:'한국어 번역·요약'};
 }
 if(source==='BBC'){
  // Publishing a translation of BBC text is never authorized by a draft.
  // Independent Korean wording and non-BBC corroboration require human review.
  if(decision.independentFactsReviewed!==true||decision.sourceTextReused!==false||
     typeof decision.corroboratingSourceUrl!=='string'||
     decision.independentKoreanCopyReviewed!==true||
     typeof decision.independentTitle!=='string'||
     !/[가-힣]/.test(decision.independentTitle)||
     typeof decision.independentSummary!=='string'||
     !/[가-힣]/.test(decision.independentSummary)||
     (decision.independentTitle===draft.title&&decision.independentSummary===draft.summary))
   throw Error('NEWS_R26_BBC_INDEPENDENCE_UNVERIFIED');
  return {...rec,title:decision.independentTitle,summary:decision.independentSummary,
   independentFactsReviewed:true,sourceTextReused:false,
   corroboratingSourceUrl:decision.corroboratingSourceUrl};
 }
 throw Error('NEWS_R26_SOURCE_RIGHTS_UNSUPPORTED');
}

/** Decision input is explicitly separate from model draft output. */
export function compileR26EditorialApprovals(queue,drafts,decisions,{now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||now<1||!queue||!Array.isArray(queue.reviewQueue)||
    decisions?.version!==R26_EDITORIAL_DECISION_VERSION||
    !Array.isArray(decisions.items)||decisions.items.length>100)
  throw Error('NEWS_R26_DECISION_INPUT_INVALID');
 const draftMap=cleanDrafts(queue,drafts,now),seen=new Set(),approved=[],denied=[];
 for(const decision of decisions.items){
  if(!decision||!isHash(decision.id)||seen.has(decision.id)||
     !['APPROVE','REJECT'].includes(decision.status))
   throw Error('NEWS_R26_DECISION_INVALID_OR_DUPLICATE');
  const draft=draftMap.get(decision.id);
  if(!draft)throw Error('NEWS_R26_DECISION_WITHOUT_MATCHING_DRAFT');
  seen.add(decision.id);
  if(decision.status==='REJECT'){
   if(!reason(decision.reviewNotes))throw Error('NEWS_R26_REJECTION_REASON_REQUIRED');
   denied.push({id:decision.id,reason:decision.reviewNotes.trim()});continue;
  }
  approved.push(approveRecord(draft,decision,now));
 }
 // Reuse both existing public-news validation and original R26 exact matching.
 const verified=parseReviewedNewsInput(JSON.stringify({version:APPROVED_INPUT_VERSION,
  items:approved}),{now});
 linkR26ReviewedNews(queue,verified,{now});
 return {version:APPROVED_INPUT_VERSION,items:verified,
  report:{drafts:draftMap.size,approved:verified.length,rejected:denied.length,
   pending:draftMap.size-seen.size,reviewed:seen.size,
   status:verified.length?'APPROVALS_READY_FOR_PC_LINK':'WAITING_FOR_EDITORIAL_APPROVAL',
   publicWriteAttempted:false}};
}

function privateFile(file,limit){
 if(typeof file!=='string'||!path.isAbsolute(file))throw Error('NEWS_R26_PRIVATE_FILE_PATH_REQUIRED');
 let stat;
 try{stat=fs.lstatSync(file);}catch{throw Error('NEWS_R26_PRIVATE_FILE_UNAVAILABLE');}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>limit)
  throw Error('NEWS_R26_PRIVATE_FILE_UNSAFE');
 try{return JSON.parse(fs.readFileSync(file,'utf8'));}
 catch{throw Error('NEWS_R26_PRIVATE_JSON_INVALID');}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const flags={};
 for(const arg of process.argv.slice(2)){
  const at=arg.indexOf('=');
  if(at<3||!arg.startsWith('--')||arg.slice(2,at) in flags)
   throw Error('NEWS_R26_EDITORIAL_CLI_INVALID');
  flags[arg.slice(2,at)]=arg.slice(at+1);
 }
 if(!flags.candidates||!flags.drafts||!['review-queue','dry-run','prepare'].includes(flags.mode)||
    Object.keys(flags).some(key=>!['candidates','drafts','decisions','mode','output'].includes(key))||
    flags.mode==='prepare'&&(!flags.decisions||!flags.output))
  throw Error('NEWS_R26_EDITORIAL_CLI_INVALID');
 try{
  const now=Date.now(),queue=privateNewsReviewQueueFile(flags.candidates,{now});
  const drafts=privateFile(flags.drafts,1024*1024);
  if(flags.mode==='review-queue'){
   const map=cleanDrafts(queue,drafts,now);
   console.log(JSON.stringify({version:'IRAN_NEWS_EDITORIAL_REVIEW_QUEUE_R1',
    items:[...map.values()].map(draft=>({id:draft.id,sourceId:draft.sourceId,
     sourceUrl:draft.sourceUrl,title:draft.title,summary:draft.summary,
     suggestedImpact:draft.suggestedImpact,draftSha256:r26DraftFingerprint(draft),
     status:'REQUIRES_INDEPENDENT_EDITORIAL_AND_RIGHTS_DECISION'})),
    publicWriteAttempted:false}));
  }else{
   const decisions=flags.decisions?privateFile(flags.decisions,256*1024):
    {version:R26_EDITORIAL_DECISION_VERSION,items:[]};
   const compiled=compileR26EditorialApprovals(queue,drafts,decisions,{now});
   if(flags.mode==='prepare'){
    if(!compiled.items.length)throw Error('NEWS_R26_NO_APPROVALS_TO_PREPARE');
    if(!path.isAbsolute(flags.output))throw Error('NEWS_R26_APPROVED_PATH_INVALID');
    const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
    const output=path.resolve(flags.output);
    if(output===repo||output.startsWith(repo+path.sep)||fs.existsSync(output))
     throw Error('NEWS_R26_APPROVED_FILE_MUST_BE_PRIVATE_AND_NEW');
    const fd=fs.openSync(output,'wx',0o600);
    try{fs.writeFileSync(fd,JSON.stringify({version:compiled.version,
     items:compiled.items},null,2),'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
   }
   console.log(JSON.stringify(compiled.report));
  }
 }catch(error){console.error(JSON.stringify({status:'NEWS_R26_EDITORIAL_FAILED',reason:error.message}));
  process.exitCode=1;}
}
