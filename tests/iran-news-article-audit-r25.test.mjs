import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectIranArticleR25,selectIranReviewCandidatesR25,
 auditIranArticleDetailsR25} from '../scripts/iran-progress/news-display-article-audit-r25.mjs';

const now=Date.parse('2026-10-27T12:00:00.000Z');
const gov={sourceId:'govuk',sourceUrl:'https://www.gov.uk/government/news/iran-briefing'};
const aj={sourceId:'aljazeera',sourceUrl:'https://www.aljazeera.com/news/2026/10/27/iran-briefing'};
const bbc={sourceId:'bbc-middle-east',sourceUrl:'https://www.bbc.com/news/articles/iran-briefing'};
const iaea={sourceId:'iaea-news',sourceUrl:'https://www.iaea.org/newscenter/news/iran-briefing'};
const paragraph=('Tehran and Iranian officials discussed Iran nuclear talks. ').repeat(7);
const articleHtml=({url=aj.sourceUrl,date='2026-10-27T08:30:00Z',body=paragraph,
 headline='New talks in Iran',includeSchema=true}={})=>`<!doctype html><html><head>
 <link href="${url}" rel="canonical">
 <meta content="${headline}" property="og:title">
 ${includeSchema?`<script type="application/ld+json">${JSON.stringify({
  '@context':'https://schema.org','@type':'NewsArticle',headline,datePublished:date,
 })}</script>`:`<meta content="${date}" property="article:published_time">`}
 </head><body><article><h1>${headline}</h1><p>${body}</p></article></body></html>`;
const govData=(other={})=>JSON.stringify({base_path:'/government/news/iran-briefing',
 first_published_at:'2026-10-27T08:00:00Z',public_updated_at:'2026-10-27T11:00:00Z',
 title:'Iran regional talks',details:{body:`<p>${paragraph}</p>`},...other});
const feedReport=(candidates=[gov,aj,bbc,iaea])=>({
 version:'IRAN_NEWS_MULTISOURCE_AUDIT_R24',sourceCount:4,sourcesFailed:0,
 sources:[gov,aj,bbc,iaea].map(s=>({sourceId:s.sourceId,status:'READ',
  queuedForReview:candidates.filter(c=>c.sourceId===s.sourceId).length})),
 candidates,
});

test('R25 uses government first_published_at and verifies article body scope without approving display',()=>{
 const result=inspectIranArticleR25(gov,govData(),{now});
 assert.equal(result.status,'ARTICLE_METADATA_REVIEWED');
 assert.equal(result.originalTitle,'Iran regional talks');
 assert.equal(result.publisherDeclaredPublishedAt,'2026-10-27T08:00:00.000Z');
 assert.equal(result.publicationDateEvidence,'GOVUK_CONTENT_API_FIRST_PUBLISHED_AT');
 assert.equal(result.scopeVerifiedFromArticle,true);
 assert.equal(result.articleBodyAccessible,true);
 assert.equal(result.originalPublicationIndependentlyVerified,false);
 assert.equal(result.rightsVerified,false);
 assert.equal(result.displayEligible,false);
 assert.equal(result.articleBodyEvidence,'GOVUK_CONTENT_API_BODY');
 assert.equal(Object.hasOwn(result,'fullBody'),false);
});

test('R25 never treats GOV.UK update timestamp as initial publication',()=>{
 const withoutFirst=JSON.parse(govData());
 delete withoutFirst.first_published_at;
 const result=inspectIranArticleR25(gov,withoutFirst,{now});
 assert.equal(result.status,'FIRST_PUBLICATION_UNVERIFIED');
 assert.equal(result.publisherDeclaredPublishedAt,null);
 const wrongPath=inspectIranArticleR25(gov,govData({base_path:'/government/news/other'}),{now});
 assert.equal(wrongPath.status,'PUBLISHER_IDENTITY_INVALID');
 const withdrawn=inspectIranArticleR25(gov,govData({withdrawn:true}),{now});
 assert.equal(withdrawn.status,'PUBLISHER_IDENTITY_INVALID');
});

test('R25 reports older fully readable stories outside the approved 30-day window',()=>{
 const old=inspectIranArticleR25(gov,govData({first_published_at:'2026-07-01T01:00:00Z'}),{now});
 assert.equal(old.status,'OUTSIDE_30_DAY_WINDOW');
 assert.equal(old.withinRetentionWindow,false);
 assert.equal(old.articleBodyAccessible,true);
 assert.equal(old.displayEligible,false);
});

test('R25 parses original English metadata from publisher JSON-LD and detects Iran in article',()=>{
 const result=inspectIranArticleR25(aj,articleHtml(),{now});
 assert.equal(result.status,'ARTICLE_METADATA_REVIEWED');
 assert.equal(result.originalTitle,'New talks in Iran');
 assert.equal(result.publicationDateEvidence,'PUBLISHER_JSON_LD');
 assert.equal(result.publisherDeclaredPublishedAt,'2026-10-27T08:30:00.000Z');
 assert.equal(result.scopeVerifiedFromArticle,true);
 assert.equal(result.rightsVerified,false);
});

test('R25 reads Al Jazeera editorial paragraphs without requiring a semantic article tag',()=>{
 const markup=articleHtml().replace('<article>',
  '<nav><p>Unrelated navigation and news links.</p></nav><div class="wysiwyg wysiwyg--all-content"><div>')
  .replace('</article>','</div></div>');
 const result=inspectIranArticleR25(aj,markup,{now});
 assert.equal(result.status,'ARTICLE_METADATA_REVIEWED');
 assert.equal(result.articleBodyEvidence,'PUBLISHER_EDITORIAL_CONTAINER_PARAGRAPHS');
 assert.equal(result.articleBodyAccessible,true);
 assert.equal(result.rightsVerified,false);
});

test('R25 reads official IAEA news and statement body containers with publisher date evidence',()=>{
 const sourceUrl='https://www.iaea.org/newscenter/statements/iran-director-statement';
 const date='2025-06-22T19:30+02:00';
 const markup=`<!doctype html><html><head><meta property="og:title" content="Iran director statement">
 <meta name="dcterms.date" content="${date}"></head><body>
 <time datetime="2025-06-22">22 June 2025</time>
 <div class="statement-body"><div class="field field--name-field-newsstory-body">
 <p>${paragraph}</p></div></div></body></html>`;
 const statement=inspectIranArticleR25({sourceId:'iaea-statements',sourceUrl},markup,{now});
 assert.equal(statement.status,'OUTSIDE_30_DAY_WINDOW');
 assert.equal(statement.publisherDeclaredPublishedAt,'2025-06-22T17:30:00.000Z');
 assert.equal(statement.publicationDateEvidence,'IAEA_DCTERMS_DATE_AND_VISIBLE_DATE');
 assert.equal(statement.articleBodyEvidence,'PUBLISHER_EDITORIAL_CONTAINER_PARAGRAPHS');
 assert.equal(statement.articleBodyAccessible,true);
 assert.equal(statement.displayEligible,false);
 const newsUrl='https://www.iaea.org/newscenter/news/iran-progress';
 const newsMarkup=markup.replace('statement-body','news-story-body');
 const news=inspectIranArticleR25({sourceId:'iaea-news',sourceUrl:newsUrl},newsMarkup,{now});
 assert.equal(news.status,'OUTSIDE_30_DAY_WINDOW');
 assert.equal(news.articleBodyAccessible,true);
 const mismatched=inspectIranArticleR25({sourceId:'iaea-statements',sourceUrl},
  markup.replace('datetime="2025-06-22"','datetime="2025-06-23"'),{now});
 assert.equal(mismatched.status,'FIRST_PUBLICATION_UNVERIFIED');
});

test('R25 accepts BBC publisher ReportageNewsArticle without assuming publishing rights',()=>{
 const markup=articleHtml({url:bbc.sourceUrl}).replace('NewsArticle','ReportageNewsArticle');
 const result=inspectIranArticleR25(bbc,markup,{now});
 assert.equal(result.status,'ARTICLE_METADATA_REVIEWED');
 assert.equal(result.publisherDeclaredPublishedAt,'2026-10-27T08:30:00.000Z');
 assert.equal(result.displayEligible,false);
});

test('R25 selects UN story body block over the separate summary article teaser',()=>{
 const un={sourceId:'un-middle-east',sourceUrl:'https://news.un.org/en/story/2026/10/1168654'};
 const story=articleHtml({url:un.sourceUrl,
  body:'A short unrelated introduction.'}).replace('</body>',
  `<div id="block-views-block-content-fields-block-body"><div class="block-content">`+
  `<p>${paragraph}</p><div><p>${paragraph}</p></div></div></div></body>`);
 const result=inspectIranArticleR25(un,story,{now});
 assert.equal(result.status,'ARTICLE_METADATA_REVIEWED');
 assert.equal(result.articleBodyEvidence,'UN_NEWS_STORY_BODY');
 assert.equal(result.scopeVerifiedFromArticle,true);
});

test('R25 parses fallback article published meta but rejects update-only and bare dates',()=>{
 const fallback=inspectIranArticleR25(aj,articleHtml({includeSchema:false}),{now});
 assert.equal(fallback.status,'ARTICLE_METADATA_REVIEWED');
 assert.equal(fallback.publicationDateEvidence,'PUBLISHER_HTML_META');
 const bare=inspectIranArticleR25(aj,articleHtml({date:'2026-10-27'}),{now});
 assert.equal(bare.status,'FIRST_PUBLICATION_UNVERIFIED');
 const future=inspectIranArticleR25(aj,articleHtml({date:'2026-10-28T08:00:00Z'}),{now});
 assert.equal(future.publisherDeclaredPublishedAt,null);
 const editedOnly=articleHtml().replace('datePublished','dateModified');
 assert.equal(inspectIranArticleR25(aj,editedOnly,{now}).status,
  'FIRST_PUBLICATION_UNVERIFIED');
});

test('R25 rejects page canonical mismatch and cannot verify a topic using headline alone',()=>{
 const wrong=inspectIranArticleR25(aj,articleHtml({url:'https://www.aljazeera.com/news/2026/10/27/other'}),{now});
 assert.equal(wrong.status,'CANONICAL_MISMATCH');
 const unrelated=('A meeting between regional officials on transport policy. ').repeat(7);
 const body=inspectIranArticleR25(aj,articleHtml({body:unrelated,headline:'Regional briefing'}),{now});
 assert.equal(body.status,'ARTICLE_OUT_OF_SCOPE');
 assert.equal(body.scopeVerifiedFromArticle,false);
 const short=inspectIranArticleR25(aj,articleHtml({body:'Iran talks.'}),{now});
 assert.equal(short.status,'ARTICLE_METADATA_REVIEWED');
 const empty=inspectIranArticleR25(aj,articleHtml({body:''}),{now});
 assert.equal(empty.status,'ARTICLE_BODY_UNVERIFIED');
});

test('R38 accepts primary plus secondary keywords without additional semantic ranking',()=>{
 const subjects=['Saudi','Saudi Arabia','Yemen','Yemeni','Houthis','사우디아라비아','예멘','후티'];
 for(const subject of subjects){
  const body=(`Regional authorities reported peace negotiations involving ${subject}. `).repeat(7);
  const result=inspectIranArticleR25(aj,articleHtml({body,headline:'Regional briefing'}),{now});
  assert.equal(result.status,'ARTICLE_METADATA_REVIEWED',subject);
  assert.equal(result.scopeVerifiedFromArticle,true,subject);
  assert.equal(result.displayEligible,false,subject);
 }
 const absentSecond=inspectIranArticleR25(aj,articleHtml({
  body:'Iran officials met for a regional briefing.',headline:'Regional briefing'}),{now});
 assert.equal(absentSecond.status,'ARTICLE_OUT_OF_SCOPE');
 const split=inspectIranArticleR25(aj,articleHtml({
  body:'Officials discussed a ceasefire.',headline:'Saudi regional briefing'}),{now});
 assert.equal(split.status,'ARTICLE_METADATA_REVIEWED');
});

test('R25 does not substitute unapproved aliases for the four user-approved topics',()=>{
 const body=('Tehran and IRGC officials met near Hormuz for regional discussions. ').repeat(7);
 const result=inspectIranArticleR25(aj,articleHtml({body,headline:'Iran briefing'}),{now});
 assert.equal(result.status,'ARTICLE_OUT_OF_SCOPE');
 assert.equal(result.scopeVerifiedFromArticle,false);
});

test('R25 rejects unapproved candidate domains and does not fetch invalid URLs',async()=>{
 const invalid={sourceId:'bbc-middle-east',sourceUrl:'https://www.bbc.com.evil.test/news/a'};
 assert.throws(()=>inspectIranArticleR25(invalid,articleHtml(),{now}),/R25_CANDIDATE_INVALID/);
 const report=await auditIranArticleDetailsR25({now,
  feedReport:feedReport([invalid]),
  fetcher:async()=>{throw Error('MUST_NOT_FETCH');}});
 assert.equal(report.articles[0].status,'CANDIDATE_URL_INVALID');
 assert.equal(report.articleFailures,1);
 assert.equal(report.displayEligible,0);
});

test('R25 round-robin review avoids first-source monopoly',()=>{
 const records=[...Array.from({length:5},(_,i)=>({...gov,sourceUrl:gov.sourceUrl+i})),aj,bbc];
 const selected=selectIranReviewCandidatesR25(records,3);
 assert.deepEqual(selected.map(c=>c.sourceId),['govuk','aljazeera','bbc-middle-east']);
 assert.throws(()=>selectIranReviewCandidatesR25(records,71),/R25_SELECTION_INVALID/);
});

test('R25 audits per-article failure, totals and read-only boundaries with bounded parallel workers',async()=>{
 const requests=[];
 const report=await auditIranArticleDetailsR25({now,feedReport:feedReport(),
  fetcher:async (url,options)=>{
   requests.push({url,redirect:options.redirect});
   if(url.includes('bbc.com'))return new Response('Paywall',{status:403});
   if(url.includes('iaea.org'))return new Response(articleHtml({
    url:iaea.sourceUrl,body:('IAEA monitored Iran safeguards. ').repeat(12),
   }));
   if(url.includes('/api/content/'))return new Response(govData());
   return new Response(articleHtml());
  },concurrency:2});
 assert.equal(report.articlesChecked,4);
 assert.equal(report.articlesUnchecked,0);
 assert.equal(report.metadataReviewed,3);
 assert.equal(report.articleFailures,1);
 assert.equal(report.status,'PARTIAL_AUDIT_REVIEW_REQUIRED');
 assert.ok(requests.every(request=>request.redirect==='manual'));
 assert.ok(requests.some(request=>request.url===
  'https://www.gov.uk/api/content/government/news/iran-briefing'));
 assert.equal(report.articles.find(a=>a.sourceId==='bbc-middle-east').httpStatus,403);
 assert.equal(report.sourceSummaries.find(s=>s.sourceId==='bbc-middle-east').fetchFailed,1);
 assert.equal(report.displayEligible,0);
 assert.equal(report.pcCacheWritten,false);
 assert.equal(report.d1Written,false);
 assert.equal(report.scoreLedgerModified,false);
 assert.equal(report.translationModified,false);
});

test('R25 explicitly reports unchecked articles when probe is budget-limited',async()=>{
 const report=await auditIranArticleDetailsR25({now,feedReport:feedReport(),maxArticles:2,
  fetcher:async url=>new Response(url.includes('api/content')?govData():articleHtml())});
 assert.equal(report.articlesChecked,2);
 assert.equal(report.articlesUnchecked,2);
 assert.equal(report.status,'PARTIAL_AUDIT_REVIEW_REQUIRED');
 assert.equal(report.totalCoverageProven,false);
});

test('R25 records a video as requiring its own workflow without claiming article body inspection',async()=>{
 const video={...aj,contentKind:'VIDEO_REQUIRES_SEPARATE_REVIEW'};
 const report=await auditIranArticleDetailsR25({now,feedReport:feedReport([video]),
  fetcher:async()=>{throw Error('VIDEO_MUST_NOT_FETCH_AS_ARTICLE');}});
 assert.equal(report.articles[0].status,'VIDEO_REQUIRES_SEPARATE_REVIEW');
 assert.equal(report.articlesChecked,0);
 assert.equal(report.videosClassified,1);
 assert.equal(report.articleFailures,0);
 assert.equal(report.metadataReviewed,0);
 assert.equal(report.displayEligible,0);
});
