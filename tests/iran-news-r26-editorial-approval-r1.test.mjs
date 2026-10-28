import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {privateNewsReviewQueue} from '../scripts/iran-progress/ui-news-publication-gate-r1.mjs';
import {r26DraftFingerprint,compileR26EditorialApprovals,
 R26_EDITORIAL_DECISION_VERSION} from '../scripts/iran-progress/news-r26-editorial-approval-r1.mjs';
import {parseReviewedNewsInput} from '../scripts/iran-progress/news-display-maintenance-r1.mjs';
import {linkR26ReviewedNews} from '../scripts/iran-progress/news-r26-reviewed-link-r1.mjs';

const now=Date.parse('2026-10-28T12:00:00.000Z');
const generatedAt=now-7200000,reviewedAt=new Date(now-3600000).toISOString();
const urls={
 govuk:'https://www.gov.uk/government/news/iran-security-update',
 tasnim:'https://www.tasnimnews.ir/en/news/2026/10/27/1234567/iran-talks',
 'un-middle-east':'https://news.un.org/en/story/2026/10/1168654',
 'bbc-middle-east':'https://www.bbc.co.uk/news/articles/c9p8g7e4k2xjo',
};
const date='2026-10-27T11:00:00.000Z';
const items=Object.entries(urls).map(([sourceId,sourceUrl])=>({
 id:createHash('sha256').update(sourceUrl).digest('hex'),sourceId,sourceUrl,
 originalTitle:'Iran news source report',publisherDeclaredPublishedAt:date,
 rightsVerified:false,displayEligible:false,reviewStatus:'ARTICLE_METADATA_REVIEWED',
}));
const queue=privateNewsReviewQueue({version:'IRAN_NEWS_COLLECTION_R26',
 updatedAt:now-30000,items},{now});
const drafts={version:'IRAN_NEWS_KOREAN_DRAFT_R1',createdAt:generatedAt,
 items:items.map(entry=>({id:entry.id,sourceId:entry.sourceId,
 sourceUrl:entry.sourceUrl,originalTitle:entry.originalTitle,
 publishedAt:entry.publisherDeclaredPublishedAt,
 sourceTextSha256:createHash('sha256').update('private source text '+entry.id).digest('hex'),
 title:'이란 관련 주요 안보 상황 보고',
 summary:'이란 관련 안보 상황에 대한 공식 발표와 지역 움직임이 보도됐다. 당사자들의 입장을 구분할 필요가 있다.',
 suggestedImpact:'neutral',model:'gemma3:4b',modelDigest:'sha256:local',
 promptVersion:'IRAN_NEWS_KOREAN_EDITOR_R1',generatedAt,
 rightsVerified:false,displayEligible:false,
 reviewStatus:'PENDING_EDITORIAL_AND_RIGHTS_REVIEW'})),
};
const draft=sourceId=>drafts.items.find(x=>x.sourceId===sourceId);
function decision(sourceId,rest={}){
 const d=draft(sourceId);
 return {id:d.id,sourceUrl:d.sourceUrl,draftSha256:r26DraftFingerprint(d),
  reviewer:'기사 검토 담당자',reviewNotes:'원문 본문, 한국어 요약, 출처별 이용조건을 개별 확인함',
  reviewedAt,status:'APPROVE',originalArticleReviewed:true,titleReviewed:true,
  factsReviewed:true,editorialSummaryReviewed:true,impactReviewed:true,
  rightsReviewed:true,impact:'neutral',...rest};
}
const decisions=items=>({version:R26_EDITORIAL_DECISION_VERSION,items});

test('no decisions means zero approved records, never automatic promotion',()=>{
 const out=compileR26EditorialApprovals(queue,drafts,decisions([]),{now});
 assert.equal(out.report.pending,4);
 assert.equal(out.report.approved,0);
 assert.equal(out.report.publicWriteAttempted,false);
 assert.equal(out.items.length,0);
});

test('article-specific GOV.UK OGL and Tasnim CC BY approval compile into existing publisher input',()=>{
 const gov=decision('govuk',{thirdPartyContentCleared:true,oglScopeReviewed:true});
 const tasnim=decision('tasnim',{sourceOriginalContentVerified:true,
  creatorCredit:'Tasnim News Agency'});
 const compiled=compileR26EditorialApprovals(queue,drafts,decisions([gov,tasnim]),{now});
 assert.equal(compiled.report.approved,2);
 assert.equal(compiled.items.find(x=>x.source==='GOV.UK').rightsSource,'GOV_UK_OGL_V3');
 assert.equal(compiled.items.find(x=>x.source==='Tasnim').rightsSource,'TASNIM_CC_BY_4_0');
 const parsed=parseReviewedNewsInput(JSON.stringify({version:compiled.version,
  items:compiled.items}),{now});
 assert.equal(linkR26ReviewedNews(queue,parsed,{now}).linked.length,2);
});

test('GOV.UK third-party exclusion and Tasnim original authorship cannot be skipped',()=>{
 assert.throws(()=>compileR26EditorialApprovals(queue,drafts,
  decisions([decision('govuk')]),{now}),/NEWS_R26_GOVUK_RIGHTS_UNVERIFIED/);
 assert.throws(()=>compileR26EditorialApprovals(queue,drafts,
  decisions([decision('tasnim',{creatorCredit:'Tasnim News Agency'})]),{now}),
  /NEWS_R26_LICENSED_SOURCE_NOT_VERIFIED/);
});

test('UN news requires separate notice confirmation not just a source credit',()=>{
 const withoutNotice=decision('un-middle-east',{
  sourceOriginalContentVerified:true,newsReuseScopeReviewed:true,
  creatorCredit:'United Nations News'});
 assert.throws(()=>compileR26EditorialApprovals(queue,drafts,
  decisions([withoutNotice]),{now}),/NEWS_R26_UN_NOTICE_UNVERIFIED/);
 const withNotice={...withoutNotice,unNoticeConfirmedAt:new Date(now-5400000).toISOString()};
 const out=compileR26EditorialApprovals(queue,drafts,decisions([withNotice]),{now});
 assert.equal(out.items[0].rightsSource,'UN_NEWS_NOTICE_REVIEWED');
});

test('BBC needs independent Korean rewriting and independent corroboration',()=>{
 const base=decision('bbc-middle-east',{
  independentFactsReviewed:true,sourceTextReused:false,
  independentKoreanCopyReviewed:true,
  corroboratingSourceUrl:'https://www.gov.uk/government/news/iran-security-update',
 });
 assert.throws(()=>compileR26EditorialApprovals(queue,drafts,
  decisions([base]),{now}),/NEWS_R26_BBC_INDEPENDENCE_UNVERIFIED/);
 const completed={...base,independentTitle:'스리랑카 해역 선원 구조 상황 별도 확인',
  independentSummary:'영국 정부가 별도로 확인한 선원 구조 관련 사실을 정리했다. 구조 상황의 확인 범위는 독립적인 발표 내용에 한정한다.'};
 const out=compileR26EditorialApprovals(queue,drafts,decisions([completed]),{now});
 assert.equal(out.items[0].source,'BBC');
 assert.equal(out.items[0].title,completed.independentTitle);
 assert.equal(out.items[0].sourceTextReused,false);
});

test('draft text, source receipt and decisions are bound by exact digest',()=>{
 const gov=decision('govuk',{thirdPartyContentCleared:true,oglScopeReviewed:true});
 assert.throws(()=>compileR26EditorialApprovals(queue,drafts,
  decisions([{...gov,draftSha256:'0'.repeat(64)}]),{now}),
  /NEWS_R26_EDITORIAL_APPROVAL_INCOMPLETE/);
 const modified={...drafts,items:drafts.items.map(item=>item.sourceId==='govuk'?
  {...item,summary:'비공개 초안의 한국어 요약을 사후 변경함'}:item)};
 assert.throws(()=>compileR26EditorialApprovals(queue,modified,
  decisions([gov]),{now}),/NEWS_R26_EDITORIAL_APPROVAL_INCOMPLETE/);
 assert.throws(()=>compileR26EditorialApprovals(queue,drafts,
  decisions([gov,gov]),{now}),/NEWS_R26_DECISION_INVALID_OR_DUPLICATE/);
});

test('rejected articles stay out of approved output',()=>{
 const gov=decision('govuk',{status:'REJECT',reviewNotes:'원문 사실과 요약의 의미가 충분히 일치하지 않아 보류'});
 const out=compileR26EditorialApprovals(queue,drafts,decisions([gov]),{now});
 assert.equal(out.report.rejected,1);
 assert.equal(out.report.approved,0);
 assert.equal(out.report.pending,3);
});
