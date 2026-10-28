import test from 'node:test';
import assert from 'node:assert/strict';
import {readOnlyAutoPublishPreflightR9} from '../scripts/iran-progress/news-display-auto-preflight-r9.mjs';
import {IRAN_GOVUK_NEWS_FEEDS} from '../scripts/iran-progress/news-display-discover-r1.mjs';

const now=Date.parse('2026-10-27T06:00:00Z');
const feed=(slug)=>`<feed><entry><title>Middle East briefing</title><updated>2026-10-27T04:00:00Z</updated><link href="https://www.gov.uk/government/news/${slug}"/></entry></feed>`;
const content=slug=>({base_path:'/government/news/'+slug,title:'Middle East briefing',description:'Government update on Saudi policy',
 first_published_at:'2026-10-26T03:00:00Z',document_type:'news_story',details:{body:'Yemen peace negotiations were discussed.'}});

test('R9 preflight fetches four feeds and sample APIs, only checks local Ollama tags',async()=>{
 const calls=[];
 const result=await readOnlyAutoPublishPreflightR9({now,fetcher:async url=>{
  calls.push(url);
  if(IRAN_GOVUK_NEWS_FEEDS.includes(url))return new Response(feed('brief-'+IRAN_GOVUK_NEWS_FEEDS.indexOf(url)),{status:200});
  if(url==='http://127.0.0.1:11434/api/tags')return new Response(JSON.stringify({models:[{name:'local-small:latest'}]}),{status:200});
  const slug=new URL(url).pathname.split('/').at(-1);
  return new Response(JSON.stringify(content(slug)),{status:200});
 }});
 assert.equal(result.status,'PASS_R9_READ_ONLY_SOURCE_AND_OLLAMA');
 assert.equal(result.feedSuccess,4);
 assert.equal(result.ollama.modelCount,1);
 assert.equal(result.samples.every(x=>x.status==='REVIEW_REQUIRED'),true);
 assert.equal(result.rightsStatus,'PER_ARTICLE_RIGHTS_NOT_AUTOMATICALLY_APPROVED');
 assert.equal(result.d1Written,false);
 assert.equal(result.cacheModified,false);
 assert.equal(result.ollamaInferenceExecuted,false);
 assert.equal(calls.some(x=>x.includes('/api/chat')),false);
});

test('R9 preflight preserves incomplete discovery and unavailable Ollama as review',async()=>{
 const result=await readOnlyAutoPublishPreflightR9({now,fetcher:async url=>{
  if(url===IRAN_GOVUK_NEWS_FEEDS[1]||url==='http://127.0.0.1:11434/api/tags')return new Response('unavailable',{status:503});
  return new Response('<feed></feed>',{status:200});
 }});
 assert.equal(result.status,'NEEDS_REVIEW_R9_READ_ONLY');
 assert.equal(result.feedFailure,1);
 assert.equal(result.ollama.status,'OFFLINE');
 assert.equal(result.scoreLedgerModified,false);
});
