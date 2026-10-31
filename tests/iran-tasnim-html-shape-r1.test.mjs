import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {inspectTasnimHtmlShape,runTasnimHtmlShape} from
 '../scripts/iran-progress/tasnim-html-shape-r1.mjs';

const now=Date.parse('2026-10-31T08:00:00.000Z');
const title='Iranian foreign ministry urges Qatar to uphold mediation';
const sourceUrl='https://www.tasnimnews.ir/en/news/2026/10/29/3735037/iran-ready-to-defend-itself-keeps-door-open-to-diplomacy-fm';
const confidentialText='Sample article body that must never be printed or saved';
const html=`<!doctype html><html><head><meta name="description" content="Official reported developments">
 <script type="application/ld+json">${JSON.stringify({
  '@context':'https://schema.org','@type':'NewsArticle',headline:title,
  description:'Short article metadata only',
 })}</script></head><body><article class="news-details">
 <div id="story-content" class="article-text"><p>${confidentialText}</p></div>
 </article></body></html>`;

test('diagnostic identifies missing JSON-LD articleBody and only returns structural tokens',()=>{
 const shape=inspectTasnimHtmlShape(html,{title});
 assert.equal(shape.jsonLdArticles,1);
 assert.equal(shape.exactHeadlineMatches,1);
 assert.deepEqual(shape.bodyFields,[{type:'undefined',chars:null}]);
 assert.deepEqual(shape.candidateContainers,[
  'article:news-details','div:article-text.story-content',
 ]);
 assert.equal(shape.articleTags,1);
 assert.equal(shape.paragraphTags,1);
 assert.equal(shape.hasMetaDescription,true);
 assert.ok(!JSON.stringify(shape).includes(confidentialText));
 assert.ok(!JSON.stringify(shape).includes('Short article metadata only'));
});

test('PC Tasnim shape check reads only exact source article and never modifies R5',async()=>{
 const item={source:'Tasnim',sourceUrl,id:createHash('sha256').update(sourceUrl).digest('hex'),
  title,publishedAt:'2026-10-29T03:00:00.000Z'};
 const feed={version:'IRAN_NEWS_METADATA_R41',status:'READY',sourceCount:1,
  itemCount:1,displayDays:14,items:[item]};
 const requests=[];
 const result=await runTasnimHtmlShape({now,
  fetchImpl:async url=>{
   assert.equal(url,'https://zgmini.kr/api/outbreak-news/iran/r41');
   return new Response(JSON.stringify(feed));
  },articleFetcher:async(url,options)=>{
   requests.push(url);
   assert.equal(options.redirect,'error');
   return new Response(html);
  },
 });
 assert.deepEqual(requests,[sourceUrl]);
 assert.equal(result.tasnimChecked,1);
 assert.equal(result.articles[0].status,'HTML_SHAPE_READ');
 assert.equal(result.articles[0].exactHeadlineMatches,1);
 assert.equal(result.articleBodyPersisted,false);
 assert.equal(result.ollamaCalls,0);
 assert.equal(result.r5ScoreChanges,0);
 assert.equal(result.publicWrite,false);
 assert.ok(!JSON.stringify(result).includes(confidentialText));
});

test('diagnostic skips unsupported source host and CMD is ASCII, CRLF and read-only',async()=>{
 const badUrl='https://example.org/news/sample';
 const badItem={source:'Tasnim',sourceUrl:badUrl,
  id:createHash('sha256').update(badUrl).digest('hex'),title,
  publishedAt:'2026-10-29T03:00:00.000Z'};
 const feed={version:'IRAN_NEWS_METADATA_R41',status:'READY',sourceCount:1,
  itemCount:1,displayDays:14,items:[badItem]};
 const report=await runTasnimHtmlShape({now,
  fetchImpl:async()=>new Response(JSON.stringify(feed)),
  articleFetcher:async()=>{throw Error('Must not visit unsupported hosts');},
 });
 assert.equal(report.tasnimChecked,0);
 const bytes=fs.readFileSync(new URL('../scripts/iran-progress/IRAN_TASNIM_HTML_SHAPE_R1.cmd',
  import.meta.url));
 const code=bytes.toString('ascii');
 assert.ok(bytes.every(byte=>byte<=127));
 assert.ok(code.includes('\r\n'));
 assert.match(code,/tasnim-html-shape-r1\.mjs/);
 assert.doesNotMatch(code,/schtasks|wrangler|news-analysis-scheduled/i);
});
