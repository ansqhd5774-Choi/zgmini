import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {tasnimEnglishStoryBody,directEnglishR41ArticleEvidenceR2}
 from '../scripts/iran-progress/tasnim-english-body-r2.mjs';
import {previewEnglishScoreEvidenceR2}
 from '../scripts/iran-progress/english-score-preview-r2.mjs';

const now=Date.parse('2026-10-31T08:00:00.000Z');
const sourceUrl='https://www.tasnimnews.ir/en/news/2026/10/29/3735037/iran-ready-to-defend-itself-keeps-door-open-to-diplomacy-fm';
const originalTitle='Iran ready to defend itself, keeps door open to diplomacy: FM';
const publishedAt='2026-10-29T03:00:00.000Z';
const id=createHash('sha256').update(sourceUrl).digest('hex');
const story='A source said Iran would keep diplomatic channels open while preparing for the next round of consultations.';
const second='Iran and regional representatives also discussed ways to avoid misunderstandings, but no ceasefire agreement was signed.';
const html=`<html><head><script type="application/ld+json">${JSON.stringify({
 '@type':'NewsArticle',headline:originalTitle,
})}</script></head><body><article class="single-news"><h3>${originalTitle}</h3>
 <nav><p>Related and trending news are excluded.</p></nav>
 <div class="story"><p>${story}</p><div><p>${second}</p></div></div>
 </article><footer><p>Footer should not be read.</p></footer></body></html>`;
const article={id,sourceUrl,sourceId:'tasnim',originalTitle,publishedAt};

test('Tasnim R2 uses only a unique article story with verified source identity',()=>{
 const body=tasnimEnglishStoryBody(article,html);
 assert.equal(body,story+' '+second);
 assert.ok(!body.includes('Related and trending'));
 assert.ok(!body.includes('Footer should not be read'));
 assert.throws(()=>tasnimEnglishStoryBody({...article,originalTitle:'Unrelated title'},html),
  /NEWS_R26_TASNIM_ARTICLE_UNVERIFIED/);
 assert.throws(()=>tasnimEnglishStoryBody({...article,
  sourceUrl:'https://example.org/story'},html),/NEWS_R26_SOURCE_URL_INVALID/);
 assert.throws(()=>tasnimEnglishStoryBody(article,html.replace('</article>',
  '<div class="story"><p>'+story+'</p><p>'+second+'</p></div></article>')),
  /IRAN_TASNIM_STORY_CONTAINER_AMBIGUOUS/);
 assert.throws(()=>tasnimEnglishStoryBody(article,html.replace(`<p>${second}</p>`,'')),
  /IRAN_TASNIM_STORY_BODY_MISSING/);
});

test('Tasnim R2 recovers only an approved and previously headline-verified body failure',async()=>{
 const requests=[];
 const result=await directEnglishR41ArticleEvidenceR2([article],{
  fetcher:async(url,options)=>{
   requests.push(url);
   assert.equal(options.redirect,'error');
   return new Response(html);
  },
 });
 assert.deepEqual(requests,[sourceUrl,sourceUrl]);
 assert.equal(result.items.length,1);
 assert.deepEqual(result.failures,[]);
 assert.equal(result.items[0].articleBody,story+' '+second);
 const invalid=await directEnglishR41ArticleEvidenceR2([article],{
  fetcher:async()=>new Response(html.replace(originalTitle,'Other headline')),
 });
 assert.equal(invalid.items.length,0);
 assert.equal(invalid.failures[0].reason,'NEWS_R26_TASNIM_ARTICLE_UNVERIFIED');
});

test('R2 PC preview stays shadow-only and does not persist full article prose',async()=>{
 const feed={version:'IRAN_NEWS_METADATA_R41',status:'READY',sourceCount:1,
  itemCount:1,displayDays:14,items:[{source:'Tasnim',title:originalTitle,
   sourceUrl,id,publishedAt}]};
 let calls=0;
 const result=await previewEnglishScoreEvidenceR2({now,
  fetchImpl:async()=>new Response(JSON.stringify(feed)),
  evidenceCollector:async(rows)=>{
   assert.equal(rows.length,1);
   return directEnglishR41ArticleEvidenceR2(rows,{fetcher:async()=>new Response(html)});
  },generator:async input=>{
   calls++;
   assert.equal(input.articleBody,story+' '+second);
   return {eventRule:'NONE',stageStatus:'NO_EVENT',supportingQuote:story};
  },
 });
 assert.equal(calls,1);
 assert.equal(result.modelCallsAttempted,1);
 assert.equal(result.modelCallsSucceeded,1);
 assert.equal(result.evidenceHeld,1);
 assert.equal(result.sourceUnavailable,0);
 assert.equal(result.r5ScoreChanges,0);
 assert.equal(result.publicWrite,false);
 assert.ok(!JSON.stringify(result).includes(story));
 assert.ok(!JSON.stringify(result).includes(second));
});

test('R2 launcher is ASCII CRLF and has no publication or scheduler commands',()=>{
 const bytes=fs.readFileSync(new URL('../scripts/iran-progress/IRAN_ENGLISH_SCORE_R2_PREVIEW.cmd',
  import.meta.url));
 const command=bytes.toString('ascii');
 assert.ok(bytes.every(byte=>byte<=127));
 assert.ok(command.includes('\r\n'));
 assert.match(command,/english-score-preview-r2\.mjs/);
 assert.doesNotMatch(command,/schtasks|wrangler|news-analysis-scheduled-r1\.mjs/i);
});
