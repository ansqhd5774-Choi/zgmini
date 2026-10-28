import test from 'node:test';
import assert from 'node:assert/strict';
import {auditIranNewsFullR40} from '../scripts/iran-progress/news-server-full-audit-r40.mjs';
import {IRAN_NEWS_SERVER_SHADOW_SOURCES}
 from '../worker/iran-news-server-shadow-r39.mjs';

const now=Date.parse('2026-10-29T03:00:00Z');
const urls={
 tasnim:i=>`https://www.tasnimnews.ir/en/news/2026/10/27/${200+i}/iran-ceasefire-talks`,
 govuk:i=>`https://www.gov.uk/government/news/iran-ceasefire-talks-${i}`,
 'guardian-iran':i=>`https://www.theguardian.com/world/2026/oct/27/iran-ceasefire-talks-${i}`,
 'dw-world':i=>`https://www.dw.com/en/iran-ceasefire-talks/a-${300+i}`,
 'bbc-middle-east':i=>`https://www.bbc.com/news/articles/ciran${i}`,
 aljazeera:i=>`https://www.aljazeera.com/news/2026/10/27/iran-ceasefire-talks-${i}`,
 'un-middle-east':i=>`https://news.un.org/en/story/2026/10/${1000+i}`,
};
function fakeReport(count=80){
 const candidates=Array.from({length:count},(_,i)=>{
  const sourceId=IRAN_NEWS_SERVER_SHADOW_SOURCES[i%7];
  return {sourceId,sourceUrl:urls[sourceId](i),contentKind:'UNKNOWN_OR_ARTICLE'};
 });
 return {version:'IRAN_NEWS_MULTISOURCE_AUDIT_R24',
  sourceCount:7,sourcesFailed:0,candidates,
  sources:IRAN_NEWS_SERVER_SHADOW_SOURCES.map(sourceId=>({sourceId,
   status:'READ',queuedForReview:candidates.filter(c=>c.sourceId===sourceId).length}))};
}
const markup=url=>`<!doctype html><html><head><link rel="canonical" href="${url}">`+
 `<script type="application/ld+json">${JSON.stringify({
  '@type':'NewsArticle',headline:'Iran ceasefire talks',
  datePublished:'2026-10-27T10:00:00Z',
  articleBody:'Iran and Saudi negotiators discussed the ceasefire.'})}</script>`+
 '</head><body><article><p>Iran and Saudi negotiators discussed the ceasefire.</p></article></body></html>';
function fetcher(requests,failedUrl=null){
 return async url=>{
  requests.push(url);
  if(url===failedUrl)return new Response('Not available',{status:503});
  if(url.startsWith('https://www.gov.uk/api/content/')){
   return new Response(JSON.stringify({base_path:url.replace('https://www.gov.uk/api/content',''),
    title:'Iran ceasefire talks',first_published_at:'2026-10-27T10:00:00Z',
    details:{body:'<p>Iran and Saudi negotiators discussed the ceasefire.</p>'}}));
  }
  return new Response(markup(url));
 };
}

test('R40 checks all 80 fixed candidates exactly once in four bounded read-only batches',async()=>{
 const requests=[],batches=[];
 const report=await auditIranNewsFullR40({now,fetcher:fetcher(requests),
  feedReport:fakeReport(),onBatch:b=>batches.push(b)});
 assert.equal(report.candidatesFound,80);
 assert.equal(report.candidatesInspected,80);
 assert.equal(report.candidatesUninspected,0);
 assert.equal(report.qualified14Days,80);
 assert.equal(report.articleFailures,0);
 assert.equal(report.status,'CANDIDATES_INSPECTED_REVIEW_REQUIRED');
 assert.equal(report.allSevenQualified14Days,true);
 assert.equal(report.articles.length,80);
 assert.equal(new Set(report.articles.map(item=>item.sourceUrl)).size,80);
 assert.equal(requests.length,80);
 assert.deepEqual(batches.map(batch=>batch.processed),[21,21,21,17]);
 assert.ok(batches.every(batch=>batch.requestCount<=21));
 assert.equal(report.d1Written,false);
 assert.equal(report.publicSnapshotModified,false);
 assert.equal(report.schedulerModified,false);
 assert.ok(report.articles.every(item=>item.bodyVerified&&item.twoStageKeywordsVerified&&
  !Object.hasOwn(item,'articleBody')&&!Object.hasOwn(item,'rawHtml')));
});

test('R40 records article errors without silently omitting the candidate',async()=>{
 const report=fakeReport(15),requests=[];
 const failed=report.candidates[3].sourceUrl;
 const result=await auditIranNewsFullR40({now,feedReport:report,
  fetcher:fetcher(requests,failed)});
 assert.equal(result.candidatesInspected,15);
 assert.equal(result.candidatesUninspected,0);
 assert.equal(result.articleFailures,1);
 assert.equal(result.qualified30Days,14);
 assert.equal(result.status,'PARTIAL_REVIEW_REQUIRED');
 assert.equal(result.articles.find(item=>item.sourceUrl===failed).status,'ARTICLE_FETCH_FAILED');
});

test('R40 refuses duplicate candidates and marks a bounded partial scan clearly',async()=>{
 const duplicate=fakeReport(8);
 duplicate.candidates.push({...duplicate.candidates[0]});
 await assert.rejects(auditIranNewsFullR40({now,feedReport:duplicate,
  fetcher:fetcher([])}),/R40_CANDIDATE_DUPLICATE_OR_INVALID/);
 const partial=await auditIranNewsFullR40({now,feedReport:fakeReport(26),
  fetcher:fetcher([]),maxCandidates:21});
 assert.equal(partial.candidatesInspected,21);
 assert.equal(partial.candidatesUninspected,5);
 assert.equal(partial.status,'PARTIAL_REVIEW_REQUIRED');
});

test('R40 preserves the R39 publisher host allowlist',async()=>{
 const report=fakeReport(1);
 report.candidates[0].sourceUrl='https://evil.example/news/iran-ceasefire';
 const output=await auditIranNewsFullR40({now,feedReport:report,
  fetcher:()=>{throw Error('MUST_NOT_BE_CALLED');}});
 assert.equal(output.articleFailures,1);
 assert.equal(output.articles[0].status,'CANDIDATE_URL_INVALID');
 assert.equal(output.d1Written,false);
});
