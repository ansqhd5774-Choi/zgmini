// R26 private discovery -> individually reviewed news -> existing PC display publisher.
// This is an automatic *linker*, not an automatic rights/summary/impact approver.
// No collector, scoring, cron, D1 schema, or public reader contract is changed.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {privateNewsReviewQueueFile} from './ui-news-publication-gate-r1.mjs';
import {parseReviewedNewsInput,runIranNewsDisplayMaintenance} from './news-display-maintenance-r1.mjs';
import {toDisplayNewsItem} from './news-display-r1.mjs';

export const R26_REVIEW_SOURCE_MAP=Object.freeze({
 govuk:'GOV.UK',tasnim:'Tasnim','un-middle-east':'UN',
 'bbc-middle-east':'BBC','iaea-news':'IAEA','iaea-statements':'IAEA',
});

function inputMatchesCandidate(review,queueItem){
 return Boolean(queueItem&&review.source===R26_REVIEW_SOURCE_MAP[queueItem.sourceId]&&
  review.sourceUrl===queueItem.sourceUrl&&
  review.publishedAt===queueItem.publisherDeclaredPublishedAt);
}

/**
 * Reviewed records can flow into the existing PC publisher automatically, but
 * private R26 metadata is NEVER converted into a rights receipt on its own.
 */
export function linkR26ReviewedNews(reviewQueue,approved,{now=Date.now()}={}){
 if(!reviewQueue||reviewQueue.status!=='BLOCKED_PRIVATE_CANDIDATES'&&
    reviewQueue.status!=='NO_PRIVATE_CANDIDATES'||
    !Array.isArray(reviewQueue.reviewQueue)||!Array.isArray(approved)||
    !Number.isSafeInteger(now)||now<1)throw Error('NEWS_R26_LINK_INPUT_INVALID');
 const candidates=new Map(reviewQueue.reviewQueue.map(item=>[item.sourceUrl,item]));
 if(candidates.size!==reviewQueue.reviewQueue.length)throw Error('NEWS_R26_LINK_CANDIDATES_NOT_UNIQUE');
 const linked=[];
 const seen=new Set();
 for(const entry of approved){
  if(!entry||typeof entry.sourceUrl!=='string'||seen.has(entry.sourceUrl))
   throw Error('NEWS_R26_LINK_REVIEW_DUPLICATE_OR_INVALID');
  if(!toDisplayNewsItem(entry,{now}))throw Error('NEWS_R26_LINK_REVIEW_NOT_APPROVED');
  seen.add(entry.sourceUrl);
  const candidate=candidates.get(entry.sourceUrl);
  if(!inputMatchesCandidate(entry,candidate))throw Error('NEWS_R26_LINK_REVIEW_UNMATCHED');
  // A valid rights receipt alone does not authorize a different candidate.
  linked.push(entry);
 }
 const publicWindow=reviewQueue.reviewQueue.filter(item=>item.withinPublicWindow);
 return {
  linked,
  report:{
   sourceVersion:'IRAN_NEWS_COLLECTION_R26',
   candidateCount:reviewQueue.candidateCount,
   candidateWithin14Days:publicWindow.length,
   candidateOutside14Days:reviewQueue.candidateCount-publicWindow.length,
   reviewedMatched:linked.length,
   reviewedWithin14Days:linked.filter(item=>candidates.get(item.sourceUrl).withinPublicWindow).length,
   pendingReviewWithin14Days:publicWindow.filter(item=>!seen.has(item.sourceUrl)).length,
   autoRightsPromotions:0,
   status:linked.length?'REVIEWED_INPUT_LINKED':'WAITING_FOR_INDIVIDUAL_REVIEW',
  },
 };
}

function readReviewedInput(file,now){
 if(typeof file!=='string'||!path.isAbsolute(file))throw Error('NEWS_R26_REVIEW_PATH_INVALID');
 let stat;
 try{stat=fs.lstatSync(file);}catch{throw Error('NEWS_R26_REVIEW_UNAVAILABLE');}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>65536)
  throw Error('NEWS_R26_REVIEW_UNSAFE');
 return parseReviewedNewsInput(fs.readFileSync(file,'utf8'),{now});
}

export async function runR26ReviewedLink({candidateFile,reviewedFile=null,now=Date.now(),
 mode='dry-run',dataDirectory,remote=null,db=null}={}){
 if(!['dry-run','apply','publish'].includes(mode))throw Error('NEWS_R26_LINK_MODE_INVALID');
 const queue=privateNewsReviewQueueFile(candidateFile,{now});
 const reviewed=reviewedFile?readReviewedInput(reviewedFile,now):[];
 const {linked,report}=linkR26ReviewedNews(queue,reviewed,{now});
 if(mode!=='dry-run'&&!linked.length)throw Error('NEWS_R26_LINK_NO_APPROVED_INPUT');
 const result=await runIranNewsDisplayMaintenance({
  dataDirectory:dataDirectory??process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13'),
  incoming:linked,now,mode,remote,db,
 });
 return {link:report,cache:result};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 const flags=Object.fromEntries(args.map(arg=>{
  const index=arg.indexOf('=');
  if(index<3||!arg.startsWith('--'))throw Error('NEWS_R26_LINK_CLI_INVALID');
  return [arg.slice(2,index),arg.slice(index+1)];
 }));
 if(args.length<2||args.length>4||Object.keys(flags).length!==args.length||
    !flags.candidates||!flags.mode||
    !['dry-run','apply','publish'].includes(flags.mode)||
    (flags.mode!=='dry-run'&&!flags.reviewed)||
    Object.keys(flags).some(key=>!['candidates','reviewed','mode','data-directory'].includes(key)))
  throw Error('NEWS_R26_LINK_CLI_INVALID');
 try{
  const dataDirectory=flags['data-directory']??process.env.ZGMINI_IRAN_HOME??
   (flags.mode==='dry-run'?path.dirname(flags.candidates):path.join(os.homedir(),'.zgmini','iran-progress-r13'));
  if(flags.mode!=='dry-run'){
   const operationalMarker=path.join(dataDirectory,'iran.sqlite');
   if(!path.isAbsolute(dataDirectory)||!fs.existsSync(operationalMarker)||
      !fs.lstatSync(operationalMarker).isFile()||fs.lstatSync(operationalMarker).isSymbolicLink())
    throw Error('NEWS_R26_OPERATIONAL_DIR_UNVERIFIED');
  }
  let remote=null,db=null;
  if(flags.mode==='publish'){
   // Check every private/public join before loading any operational D1 credential.
   const checked=await runR26ReviewedLink({candidateFile:flags.candidates,
    reviewedFile:flags.reviewed,mode:'dry-run',dataDirectory});
   if(!checked.link.reviewedMatched)throw Error('NEWS_R26_LINK_NO_APPROVED_INPUT');
   const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
   const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
   const {client,credential}=await import('../pc-writer/d1.mjs');
   remote=client(config,credential(root));db=config.core;
  }
  const result=await runR26ReviewedLink({candidateFile:flags.candidates,
   reviewedFile:flags.reviewed,mode:flags.mode,dataDirectory,remote,db});
  console.log(JSON.stringify(result));
 }catch(error){console.error(JSON.stringify({status:'NEWS_R26_LINK_FAILED',reason:error.message}));process.exitCode=1;}
}
