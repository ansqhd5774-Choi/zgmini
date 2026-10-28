import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {auditPrivateNewsPublicationGate,auditPrivateNewsPublicationFile,
 privateNewsReviewQueue,privateNewsReviewQueueFile,SOURCE_RIGHTS_REVIEW,
 PRIVATE_CANDIDATE_BASENAME,PRIVATE_CANDIDATE_VERSION} from '../scripts/iran-progress/ui-news-publication-gate-r1.mjs';

const now=Date.parse('2026-10-28T10:00:00Z');
const candidate=(sourceId,title,publishedAt)=>{
 const url=`https://example.com/article/${sourceId}`;
 return {id:createHash('sha256').update(url).digest('hex'),sourceId,sourceUrl:url,
  originalTitle:title,publisherDeclaredPublishedAt:publishedAt,
  reviewStatus:'ARTICLE_METADATA_REVIEWED',rightsVerified:false,displayEligible:false};
};
const cache=(items)=>({version:PRIVATE_CANDIDATE_VERSION,updatedAt:now,items});

test('27 keyword-collected private candidates do not become 27 public news cards',()=>{
 const entries=Array.from({length:27},(_,i)=>candidate(
  i<9?'un-middle-east':i<17?'tasnim':i<23?'govuk':'bbc-middle-east',
  i%2?'General international talks':'Iran talks and inspection',
  i%3?'2026-10-27T03:00:00.000Z':'2026-10-12T03:00:00.000Z'));
 // Give each entry a unique, internally consistent original URL/ID.
 entries.forEach((entry,i)=>{
  entry.sourceUrl=`https://example.com/article/${i}`;
  entry.id=createHash('sha256').update(entry.sourceUrl).digest('hex');
 });
 const result=auditPrivateNewsPublicationGate(cache(entries),{now});
 assert.equal(result.candidateCount,27);
 assert.equal(result.within14DayWindow,18);
 assert.equal(result.within30DayWindow,27);
 assert.equal(result.publicReadyCount,0);
 assert.equal(result.titleKeywordMatches,14);
 assert.equal(result.sourceCounts['un-middle-east'],9);
 assert.equal(result.sourceCounts.tasnim,8);
 assert.equal(result.publicWriteAttempted,false);
});

test('invalid or secretly promoted rights flags fail closed',()=>{
 const item=candidate('govuk','Iran briefing','2026-10-27T03:00:00.000Z');
 for(const bad of [
  {...item,rightsVerified:true},{...item,displayEligible:true},
  {...item,id:'0'.repeat(64)},{...item,sourceUrl:'http://example.com/article/govuk'},
  {...item,publisherDeclaredPublishedAt:'2026-10-29T03:00:00.000Z'},
  {...item,sourceId:'unknown'}]){
  assert.throws(()=>auditPrivateNewsPublicationGate(cache([bad]),{now}),/UI_NEWS_CANDIDATE_INPUT_INVALID/);
 }
});

test('read-only file audit accepts exact basename without modifying it',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'zgmini-news-ui-'));
 try{
  const file=path.join(root,PRIVATE_CANDIDATE_BASENAME);
  const raw=JSON.stringify(cache([candidate('govuk','Iran update','2026-10-27T03:00:00.000Z')]));
  writeFileSync(file,raw);
  assert.equal(auditPrivateNewsPublicationFile(file,{now}).publicReadyCount,0);
  assert.equal(privateNewsReviewQueueFile(file,{now}).reviewQueue.length,1);
  assert.throws(()=>auditPrivateNewsPublicationFile(path.join(root,'wrong.json'),{now}),/PATH_INVALID/);
  assert.equal(readFileSync(file,'utf8'),raw);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('source-specific review queue is read-only and never grants rights',()=>{
 const entries=[
  candidate('govuk','Iran statement','2026-10-27T03:00:00.000Z'),
  candidate('iaea-news','Iran safeguards update','2026-10-27T04:00:00.000Z'),
  candidate('un-middle-east','Yemen talks','2026-10-27T05:00:00.000Z'),
  candidate('bbc-middle-east','Iran talks','2026-10-27T06:00:00.000Z'),
  candidate('aljazeera','Iran update','2026-10-27T07:00:00.000Z'),
  candidate('tasnim','Iran report','2026-10-12T07:00:00.000Z'),
 ];
 const before=JSON.stringify(entries);
 const result=privateNewsReviewQueue(cache(entries),{now});
 assert.equal(result.publicReadyCount,0);
 assert.equal(result.reviewQueue.length,6);
 assert.equal(result.reviewQueue[0].sourceId,'aljazeera');
 assert.equal(result.reviewQueue.at(-1).withinPublicWindow,false);
 for(const entry of result.reviewQueue){
  assert.equal(entry.status,'REVIEW_REQUIRED_NOT_PUBLISHABLE');
  assert.equal(entry.rightsReview,SOURCE_RIGHTS_REVIEW[entry.sourceId].review);
  assert.equal(entry.remainingChecks.length,5);
 }
 assert.equal(JSON.stringify(entries),before);
});
