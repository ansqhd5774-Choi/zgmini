import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {NEWS_RIGHTS_SOURCES,validSourceRightsNews,sourceRightsAttribution} from '../lib/iran-progress/news-source-rights-r2.mjs';
import {buildIranNewsSnapshot,readIranNewsSnapshot,validNewsDisplayItem} from '../lib/iran-progress/news-display-r1.mjs';
import {RIGHTS_SOURCE,RIGHTS_POLICY_URL,toDisplayNewsItem,previewIranNewsRetention,EMPTY_IRAN_NEWS_CACHE} from '../scripts/iran-progress/news-display-r1.mjs';
import {parseReviewedNewsInput,APPROVED_INPUT_VERSION} from '../scripts/iran-progress/news-display-maintenance-r1.mjs';
import {storedIranNewsResponse} from '../worker/iran-news-display-public-r1.mjs';

const now=Date.parse('2026-10-28T10:00:00.000Z');
const publishedAt='2026-10-27T01:00:00.000Z';
const reviewedAt='2026-10-28T02:00:00.000Z';
const urls={
 'Tasnim':'https://www.tasnimnews.ir/en/news/2026/10/27/1234567/sample',
 'IAEA':'https://www.iaea.org/newscenter/news/iran-inspections',
 'UN':'https://news.un.org/en/story/2026/10/1111111',
 'BBC':'https://www.bbc.com/news/articles/csample2026',
};
const approved=source=>({
 source,sourceUrl:urls[source],publishedAt,title:'이란 관련 공식 발표',
 summary:'관계 기관은 핵시설 사찰과 관련된 논의를 진행했다고 발표했다.',impact:'neutral',
 rightsVerified:true,displayEligible:true,rightsReviewedAt:reviewedAt,
 editorialSummaryReviewed:true,...NEWS_RIGHTS_SOURCES[source],
 ...(['Tasnim','IAEA'].includes(source)?{sourceOriginalContentVerified:true,adaptationNotice:'한국어 번역·요약'}:{}),
 ...(source==='UN'?{sourceOriginalContentVerified:true,newsReuseScopeReviewed:true,
  unNoticeConfirmedAt:reviewedAt,adaptationNotice:'한국어 번역·요약'}:{}),
 ...(source==='BBC'?{independentFactsReviewed:true,sourceTextReused:false,
  corroboratingSourceUrl:'https://www.gov.uk/government/news/iran-talks'}:{}),
 ...(source==='BBC'?{}:{creatorCredit:source==='Tasnim'?'Tasnim News Agency':source}),
});
const gov=(n=0)=>({source:'GOV.UK',sourceUrl:`https://www.gov.uk/government/news/iran-${n}`,
 publishedAt,title:'UK statement on Iran',summary:'Government published a statement on Iran.',impact:'neutral',
 rightsVerified:true,rightsSource:RIGHTS_SOURCE,rightsPolicyUrl:RIGHTS_POLICY_URL});

test('per-source rights are reviewed individually and add exact attribution',()=>{
 for(const source of Object.keys(urls)){
  const candidate=approved(source);
  const item=toDisplayNewsItem(candidate,{now});
  assert.ok(item,source);
  assert.equal(validSourceRightsNews(item,now),true);
  assert.equal(validNewsDisplayItem(item,now),true);
  assert.equal(item.source,source);
  assert.equal(item.id,createHash('sha256').update(candidate.sourceUrl).digest('hex'));
  const attribution=sourceRightsAttribution(item,{now});
  assert.equal(attribution.url,NEWS_RIGHTS_SOURCES[source].rightsPolicyUrl);
  assert.ok(attribution.label.length>10);
 }
 const legacy=toDisplayNewsItem(gov(),{now});
 assert.ok(legacy);
 assert.equal(sourceRightsAttribution(legacy,{now}),null); // existing OGL footer stays in place
});

test('collector flags, source aliases, fake domains and invalid reviews never publish',()=>{
 const tasnim=approved('Tasnim');
 for(const changed of [
  {rightsVerified:false},{displayEligible:false},{rightsSource:'UNKNOWN'},
  {rightsPolicyUrl:'https://other.example/licence'},
  {sourceUrl:'https://www.tasnimnews.ir.evil.example/en/news/1'},
  {sourceUrl:'http://www.tasnimnews.ir/en/news/1'},
  {sourceUrl:'https://www.tasnimnews.ir/en/news/1#fragment'},
  {rightsReviewedAt:'2026-10-29T02:00:00.000Z'},
  {sourceOriginalContentVerified:false},{adaptationNotice:undefined},
  {creatorCredit:undefined},
  {editorialSummaryReviewed:false},{title:'Iran news'},{summary:'Article summary'},
 ]){
  const item={...tasnim,...changed};
  assert.equal(validSourceRightsNews(item,now),false,JSON.stringify(changed));
  assert.equal(toDisplayNewsItem(item,{now}),null);
 }
 assert.equal(toDisplayNewsItem({...tasnim,source:'Tasnim News Agency'},{now}),null);
 assert.equal(toDisplayNewsItem({...gov(),rightsVerified:false},{now}),null);
});

test('UN needs recorded news reuse and notice; BBC requires independent Korean facts',()=>{
 for(const changed of [
  {newsReuseScopeReviewed:false},{unNoticeConfirmedAt:undefined},
  {unNoticeConfirmedAt:'2026-10-29T02:00:00.000Z'},{sourceOriginalContentVerified:false},
  {unNoticeConfirmedAt:'2026-10-28T03:00:00.000Z'},
 ])assert.equal(toDisplayNewsItem({...approved('UN'),...changed},{now}),null);
 for(const changed of [
  {sourceTextReused:true},{independentFactsReviewed:false},
  {corroboratingSourceUrl:undefined},
  {corroboratingSourceUrl:'https://www.bbc.com/news/another'},
  {corroboratingSourceUrl:'https://bbc.co.uk/news/another'},
  {publicationMode:'LICENSED_KOREAN_ADAPTATION'},{title:'BBC reports Iran'},
 ])assert.equal(toDisplayNewsItem({...approved('BBC'),...changed},{now}),null);
});

test('legacy published GOV.UK remains readable but explicit private flags are blocked',()=>{
 const ready=toDisplayNewsItem(gov(),{now});
 assert.ok(validNewsDisplayItem(ready,now));
 assert.equal(validNewsDisplayItem({...ready,rightsVerified:false},now),false);
 assert.equal(validNewsDisplayItem({...ready,displayEligible:false},now),false);
});

test('explicit reviewed input can contain 27 mixed, rights-gated items without UI 9-cap',async()=>{
 const candidates=[
  ...Array.from({length:6},(_,i)=>gov(i)),
  ...Array.from({length:8},(_,i)=>({...approved('Tasnim'),sourceUrl:urls.Tasnim+i})),
  ...Array.from({length:9},(_,i)=>({...approved('UN'),sourceUrl:urls.UN+i})),
  ...Array.from({length:4},(_,i)=>({...approved('BBC'),sourceUrl:urls.BBC+i})),
 ];
 const reviewed=parseReviewedNewsInput(JSON.stringify({version:APPROVED_INPUT_VERSION,items:candidates}),{now});
 assert.equal(reviewed.length,27);
 const retention=previewIranNewsRetention(EMPTY_IRAN_NEWS_CACHE,reviewed,{now});
 assert.equal(retention.report.accepted,27);
 const snapshot=buildIranNewsSnapshot(retention.cache.items,{now});
 assert.equal(snapshot.itemCount,27);
 assert.equal(readIranNewsSnapshot(snapshot,{now}).itemCount,27);
 const db={prepare:()=>({bind:()=>({first:async()=>({body:JSON.stringify(snapshot),stored_at:now})})})};
 const response=await storedIranNewsResponse(new Request('https://zgmini.kr/api/outbreak-news/iran'),{db,now});
 assert.equal(response.status,200);
 assert.equal((await response.json()).itemCount,27);
});
