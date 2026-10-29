import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {privateNewsReviewQueue} from '../scripts/iran-progress/ui-news-publication-gate-r1.mjs';
import {govUkR26Body,tasnimR26Body,collectR26SourceEvidence} from '../scripts/iran-progress/news-r26-source-evidence-r1.mjs';
import {matchR26ArticleEvidence} from '../scripts/iran-progress/news-r26-ollama-drafts-r1.mjs';

const now=Date.parse('2026-10-28T12:00:00.000Z');
const govUrl='https://www.gov.uk/government/speeches/iran-must-allow-the-return-of-iaea-inspectors-to-all-nuclear-sites';
const tasnimUrl='https://www.tasnimnews.ir/en/news/2026/10/27/3733799/president-urges-gas-cooperation-cites-iran-s-300-bcm-production-capacity';
const unUrl='https://news.un.org/en/story/2026/10/1168654';
const govTitle='Iran must allow the return of IAEA inspectors to all nuclear sites: UK statement at the UN Security Council';
const tasnimTitle='President Urges Gas Cooperation, Cites Iran’s 300-Bcm Production Capacity';
const govAt='2026-10-27T15:51:00.000Z',tasnimAt='2026-10-27T13:11:33.763Z';
const govBody='<p>At the United Nations Security Council, the United Kingdom called on Iran to permit inspectors access to nuclear facilities and said that monitoring arrangements must be restored. Officials asked for diplomacy and full cooperation with the IAEA.</p>';
const tasnimBody='The Iranian president outlined the country\'s gas output and urged regional energy cooperation. Officials discussed technical exchanges and a possible new consultation mechanism, but no binding agreement was announced in the article.';
function entry(sourceUrl,sourceId,originalTitle,at){return {
 id:createHash('sha256').update(sourceUrl).digest('hex'),sourceUrl,sourceId,originalTitle,
 publisherDeclaredPublishedAt:at,rightsVerified:false,displayEligible:false,
 reviewStatus:'ARTICLE_METADATA_REVIEWED'};}
const gov=entry(govUrl,'govuk',govTitle,govAt);
const tasnim=entry(tasnimUrl,'tasnim',tasnimTitle,tasnimAt);
const un=entry(unUrl,'un-middle-east','Yemen aid update','2026-10-23T12:45:15.000Z');
const queue=privateNewsReviewQueue({version:'IRAN_NEWS_COLLECTION_R26',updatedAt:now-1,
 items:[gov,tasnim,un]},{now});
const govApi={base_path:new URL(govUrl).pathname,title:govTitle,first_published_at:govAt,
 details:{body:govBody}};
const tasnimHtml=`<html><nav>Navigation links should never enter the summary.</nav>
<script type="application/ld+json">${JSON.stringify({'@type':'NewsArticle',
 headline:tasnimTitle,articleBody:tasnimBody})}</script></html>`;
const tasnimLiveHtml=`<html><nav>Navigation links should never enter the summary.</nav>
<article class="single-news panel-print-box">
 <h1 class="title">${tasnimTitle} </h1>
 <h3 class="lead text-justify">The Iranian president urged regional energy cooperation at the summit and discussed gas infrastructure.</h3>
 <div class="story" data-readmoretitle="Read more">
  <div class="hideTag"><a href="/en/service/1192/politics">Politics</a></div>
  <p>Officials discussed technical exchanges and a possible consultation mechanism, but no final agreement was announced.</p>
  <p>Iran's president urged members to expand cooperation in strategic management and technical operations.</p>
  <div><div aria-live="polite">&nbsp;</div></div>
 </div>
 <div class="footer" data-author-code="R42340/P" data-id-code="3733799">Article footer</div>
</article>
<section class="sidebar"><article class="box-item"><p>Unrelated sidebar claims must not be analyzed.</p></article></section>
</html>`;

test('GOV.UK Content API body extracted only when published date and title are exact',()=>{
 assert.ok(govUkR26Body({sourceId:gov.sourceId,sourceUrl:gov.sourceUrl,
  originalTitle:gov.originalTitle,publisherDeclaredPublishedAt:govAt},govApi).includes('IAEA'));
 const candidate=queue.reviewQueue.find(item=>item.sourceId==='govuk');
 assert.throws(()=>govUkR26Body(candidate,{...govApi,
  first_published_at:'2026-10-26T15:51:00.000Z'}),/NEWS_R26_GOVUK_METADATA_MISMATCH/);
 assert.throws(()=>govUkR26Body(candidate,{...govApi,
  title:'Some other story'}),/NEWS_R26_GOVUK_METADATA_MISMATCH/);
 assert.throws(()=>govUkR26Body(candidate,{...govApi,
  details:{body:'A short boilerplate sentence.'}}),/NEWS_R26_GOVUK_BODY_MISSING/);
});

test('Tasnim only accepts a unique NewsArticle body; page furniture and unrelated text are excluded',()=>{
 const candidate=queue.reviewQueue.find(item=>item.sourceId==='tasnim');
 assert.equal(tasnimR26Body(candidate,tasnimHtml),tasnimBody);
 assert.throws(()=>tasnimR26Body(candidate,'<html><main>'+tasnimBody+'</main></html>'),
  /NEWS_R26_TASNIM_ARTICLE_UNVERIFIED/);
 assert.throws(()=>tasnimR26Body(candidate,tasnimHtml.replace(tasnimTitle,'Different article')),
  /NEWS_R26_TASNIM_ARTICLE_UNVERIFIED/);
 assert.throws(()=>tasnimR26Body(candidate,tasnimHtml+tasnimHtml),
  /NEWS_R26_TASNIM_ARTICLE_UNVERIFIED/);
});

test('Tasnim live story markup is accepted with exact H1 and URL ID, excluding page furniture',()=>{
 const candidate=queue.reviewQueue.find(item=>item.sourceId==='tasnim');
 const text=tasnimR26Body(candidate,tasnimLiveHtml);
 assert.match(text,/Iranian president urged regional energy cooperation/);
 assert.match(text,/no final agreement was announced/);
 assert.doesNotMatch(text,/Navigation links|Unrelated sidebar|Article footer|Politics/);
 assert.throws(()=>tasnimR26Body(candidate,tasnimLiveHtml.replace(tasnimTitle,'Different headline')),
  /NEWS_R26_TASNIM_ARTICLE_UNVERIFIED/);
 assert.throws(()=>tasnimR26Body(candidate,tasnimLiveHtml.replace('data-id-code="3733799"','data-id-code="123"')),
  /NEWS_R26_TASNIM_ARTICLE_UNVERIFIED/);
 assert.throws(()=>tasnimR26Body(candidate,tasnimLiveHtml.replace('<div class="story"','<div class="not-story"')),
  /NEWS_R26_TASNIM_BODY_MISSING/);
 assert.throws(()=>tasnimR26Body(candidate,tasnimLiveHtml+tasnimLiveHtml),
  /NEWS_R26_TASNIM_ARTICLE_UNVERIFIED/);
});

test('source fetcher calls only allowlisted endpoints and explicitly forbids HTTP redirects',async()=>{
 const called=[];
 const fetched=await collectR26SourceEvidence(queue,{maxArticles:16,fetcher:async (url,options)=>{
  called.push(url);
  assert.equal(options.redirect,'error');
  assert.ok(options.signal);
  if(url==='https://www.gov.uk/api/content'+new URL(govUrl).pathname)
   return new Response(JSON.stringify(govApi),{status:200});
  if(url===tasnimUrl)return new Response(tasnimHtml,{status:200});
  throw Error('unexpected remote destination');
 }});
 assert.equal(called.length,2);
 assert.equal(fetched.report.requireSeparateEvidence,1);
 assert.equal(fetched.report.fetched,2);
 assert.equal(fetched.report.failed,0);
 assert.equal(fetched.report.publicWriteAttempted,false);
 assert.deepEqual(fetched.items.map(x=>x.sourceId).sort(),['govuk','tasnim']);
 const ready=matchR26ArticleEvidence(queue,fetched);
 assert.equal(ready.eligible.length,2);
});

test('403 and malformed articles remain private failures without guessed text',async()=>{
 const fetched=await collectR26SourceEvidence(queue,{fetcher:async ()=>
  new Response('Forbidden',{status:403})});
 assert.equal(fetched.items.length,0);
 assert.equal(fetched.failures.length,2);
 assert.equal(fetched.report.autoRightsPromotions,0);
 assert.equal(fetched.report.publicWriteAttempted,false);
});

test('fetch budget is bounded and leaves remaining candidates pending',async()=>{
 let called=0;
 const fetched=await collectR26SourceEvidence(queue,{maxArticles:1,fetcher:async()=>{
  called++;return new Response(JSON.stringify(govApi),{status:200});
 }});
 assert.equal(called,1);
 assert.equal(fetched.report.pendingFetch,1);
 assert.equal(fetched.items.length,1);
});
