import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {privateNewsReviewQueue} from '../scripts/iran-progress/ui-news-publication-gate-r1.mjs';
import {NEWS_RIGHTS_SOURCES} from '../lib/iran-progress/news-source-rights-r2.mjs';
import {linkR26ReviewedNews,runR26ReviewedLink} from '../scripts/iran-progress/news-r26-reviewed-link-r1.mjs';

const now=Date.parse('2026-10-28T12:00:00.000Z');
const base={
 govuk:'https://www.gov.uk/government/news/iran-security-update',
 tasnim:'https://www.tasnimnews.ir/en/news/2026/10/27/1234567/iran-security-update',
 'un-middle-east':'https://news.un.org/en/story/2026/10/1168654',
};
const day={govuk:'2026-10-27T15:51:00.000Z',
 tasnim:'2026-10-27T12:06:34.000Z','un-middle-east':'2026-10-08T12:45:15.000Z'};
function candidate(sourceId){
 const url=base[sourceId];
 return {id:createHash('sha256').update(url).digest('hex'),sourceId,
  sourceUrl:url,originalTitle:'Iran security update',
  publisherDeclaredPublishedAt:day[sourceId],
  rightsVerified:false,displayEligible:false,reviewStatus:'ARTICLE_METADATA_REVIEWED'};
}
const candidates=[candidate('govuk'),candidate('tasnim'),candidate('un-middle-east')];
function collection(items=candidates){return {version:'IRAN_NEWS_COLLECTION_R26',updatedAt:now-1000,items};}
const govApproved={source:'GOV.UK',sourceUrl:base.govuk,publishedAt:day.govuk,
 title:'이란 안보 상황에 관한 영국 정부 발표',summary:'영국 정부가 이란 관련 안보 상황을 공식 발표했습니다.',
 impact:'neutral',rightsVerified:true,rightsSource:'GOV_UK_OGL_V3',
 rightsPolicyUrl:'https://www.gov.uk/help/reuse-govuk-content'};
const tasnimApproved={source:'Tasnim',sourceUrl:base.tasnim,publishedAt:day.tasnim,
 title:'이란 안보 관련 타스님 통신 보도',summary:'타스님 통신은 이란의 안보 관련 움직임을 보도했습니다.',
 impact:'neutral',rightsVerified:true,displayEligible:true,editorialSummaryReviewed:true,
 ...NEWS_RIGHTS_SOURCES.Tasnim,rightsReviewedAt:'2026-10-28T11:00:00.000Z',
 sourceOriginalContentVerified:true,adaptationNotice:'한국어 번역·요약',creatorCredit:'Tasnim News Agency'};

test('private R26 candidates alone do not acquire rights or publishability',()=>{
 const q=privateNewsReviewQueue(collection(),{now});
 const {linked,report}=linkR26ReviewedNews(q,[],{now});
 assert.equal(linked.length,0);
 assert.deepEqual({total:report.candidateCount,within:report.candidateWithin14Days,
  old:report.candidateOutside14Days,pending:report.pendingReviewWithin14Days},
 {total:3,within:2,old:1,pending:2});
 assert.equal(report.autoRightsPromotions,0);
 assert.equal(report.status,'WAITING_FOR_INDIVIDUAL_REVIEW');
});

test('valid reviewed GOV.UK and Tasnim records link automatically to exact R26 records',()=>{
 const q=privateNewsReviewQueue(collection(),{now});
 const {linked,report}=linkR26ReviewedNews(q,[govApproved,tasnimApproved],{now});
 assert.equal(linked.length,2);
 assert.equal(report.reviewedWithin14Days,2);
 assert.equal(report.pendingReviewWithin14Days,0);
 assert.equal(report.autoRightsPromotions,0);
 assert.equal(report.status,'REVIEWED_INPUT_LINKED');
});

test('an independently approved but mismatched article cannot be linked to another R26 item',()=>{
 const q=privateNewsReviewQueue(collection(),{now});
 assert.throws(()=>linkR26ReviewedNews(q,[{...govApproved,
  publishedAt:'2026-10-26T15:51:00.000Z'}],{now}),/NEWS_R26_LINK_REVIEW_UNMATCHED/);
 assert.throws(()=>linkR26ReviewedNews(q,[{...govApproved,
  sourceUrl:'https://www.gov.uk/government/news/another-iran-update'}],{now}),/NEWS_R26_LINK_REVIEW_UNMATCHED/);
});

test('no unreviewed or malformed Tasnim/BBC/UN news may pass by flags alone',()=>{
 const q=privateNewsReviewQueue(collection(),{now});
 assert.throws(()=>linkR26ReviewedNews(q,[{...tasnimApproved,
  editorialSummaryReviewed:false}],{now}),/NEWS_R26_LINK_REVIEW_NOT_APPROVED/);
 assert.throws(()=>linkR26ReviewedNews(q,[{...govApproved,rightsVerified:false}],{now}),
  /NEWS_R26_LINK_REVIEW_NOT_APPROVED/);
 assert.throws(()=>linkR26ReviewedNews(q,[govApproved,govApproved],{now}),
  /NEWS_R26_LINK_REVIEW_DUPLICATE_OR_INVALID/);
});

test('reviewed R26 records are dry-run first, applied only on explicit apply, with existing cache',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r26-link-test-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const candidateFile=path.join(directory,'news-display-candidates-r26.json');
 const reviewedFile=path.join(directory,'approved.json');
 fs.writeFileSync(candidateFile,JSON.stringify(collection()),'utf8');
 fs.writeFileSync(reviewedFile,JSON.stringify({version:'IRAN_NEWS_REVIEWED_INPUT_R1',
  items:[govApproved,tasnimApproved]}),'utf8');

 const dry=await runR26ReviewedLink({candidateFile,reviewedFile,now,mode:'dry-run',dataDirectory:directory});
 assert.equal(dry.link.reviewedMatched,2);
 assert.equal(dry.cache.written,false);
 assert.equal(fs.existsSync(path.join(directory,'news-display-r1.json')),false);

 const applied=await runR26ReviewedLink({candidateFile,reviewedFile,now,mode:'apply',dataDirectory:directory});
 assert.equal(applied.cache.written,true);
 assert.equal(applied.cache.after,2);
 const saved=JSON.parse(fs.readFileSync(path.join(directory,'news-display-r1.json'),'utf8'));
 assert.equal(saved.items.length,2);
 assert.deepEqual(saved.items.map(item=>item.source).sort(),['GOV.UK','Tasnim']);

 const same=await runR26ReviewedLink({candidateFile,reviewedFile,now,mode:'dry-run',dataDirectory:directory});
 assert.equal(same.cache.after,2);
});

test('no --apply without independently approved input; private input remains unchanged',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r26-link-block-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const candidateFile=path.join(directory,'news-display-candidates-r26.json');
 const raw=JSON.stringify(collection());
 fs.writeFileSync(candidateFile,raw,'utf8');
 await assert.rejects(()=>runR26ReviewedLink({candidateFile,now,mode:'apply',dataDirectory:directory}),
  /NEWS_R26_LINK_NO_APPROVED_INPUT/);
 assert.equal(fs.readFileSync(candidateFile,'utf8'),raw);
 assert.equal(fs.existsSync(path.join(directory,'news-display-r1.json')),false);
});
