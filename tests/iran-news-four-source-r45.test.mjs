import test from 'node:test';
import assert from 'node:assert/strict';
import {IRAN_NEWS_R45_SOURCES,normalizeR45ArticleUrl,discoverR45ArticleUrls,
 inspectR45Article,probeIranFourPublishersR45} from '../scripts/iran-progress/news-four-source-probe-r45.mjs';
const now=Date.parse('2026-10-29T04:00:00Z');
const urls={
 reuters:'https://www.reuters.com/world/middle-east/iran-war-talks-2026-10-28/',
 ap:'https://apnews.com/article/iran-war-diplomacy-a1b2c3d4',
 arabnews:'https://www.arabnews.com/middle-east/iran-war-discussions-3008699',
 anadolu:'https://www.aa.com.tr/en/middle-east/iran-saudi-war-talks/4100729',
};
const page=(date='2026-10-28T10:00:00Z',body='Iran war talks continue')=>
 '<!doctype html><html><head><meta property="og:title" content="Iran peace negotiations"/>'+
 '<meta property="article:published_time" content="'+date+'"/></head><body><article><p>'+body+
 '</p></article></body></html>';
test('R45 only recognizes the four authorized publisher domains and article paths',()=>{
 assert.equal(IRAN_NEWS_R45_SOURCES.length,4);
 for(const s of IRAN_NEWS_R45_SOURCES){assert.equal(normalizeR45ArticleUrl(s.id,urls[s.id]),urls[s.id]);assert.equal(normalizeR45ArticleUrl(s.id,'https://evil.example/article/123'),null);}
 assert.equal(normalizeR45ArticleUrl('ap','https://apnews.com/hub/middle-east'),null);
 assert.equal(normalizeR45ArticleUrl('reuters','http://www.reuters.com/world/middle-east/iran-war-talks-2026-10-28/'),null);
});
test('R45 discovers distinct original article URLs, never navigation sections',()=>{
 for(const s of IRAN_NEWS_R45_SOURCES){const links=discoverR45ArticleUrls(s.id,'<!doctype html><html><a href="'+urls[s.id]+'">A</a><a href="'+urls[s.id]+'">dup</a><a href="/">home</a></html>');assert.deepEqual(links,[urls[s.id]]);}
});
test('R45 requires publisher date, article body and exact two-step keywords',()=>{
 for(const s of IRAN_NEWS_R45_SOURCES){
  assert.equal(inspectR45Article(s.id,urls[s.id],page(),{now}).status,'ARTICLE_METADATA_REVIEWED');
  assert.equal(inspectR45Article(s.id,urls[s.id],page('2026-10-01T10:00:00Z'),{now}).status,'OUTSIDE_14_DAY_WINDOW');
  assert.equal(inspectR45Article(s.id,urls[s.id],page('2026-10-28T10:00:00Z','Iran trade expands').replace('Iran peace negotiations','Iran trade update'),{now}).status,'ARTICLE_OUT_OF_SCOPE');
  assert.equal(inspectR45Article(s.id,urls[s.id],page('2026-10-28T10:00:00Z','Ukraine war expands'),{now}).status,'ARTICLE_METADATA_REVIEWED');
 }
});
test('R45 source errors are isolated and no mutations occur',async()=>{
 const get=(url)=>{
  const s=IRAN_NEWS_R45_SOURCES.find(s=>url===s.listing);
  if(s){
   if(s.id==='ap')return new Response('Blocked',{status:403});
   return new Response('<!doctype html><html><a href="'+urls[s.id]+'">article</a></html>',{status:200});
  }
  return new Response(page(),{status:200});
 };
 const r=await probeIranFourPublishersR45({fetcher:async url=>get(url),now});
 assert.equal(r.sourceCount,4);assert.equal(r.sources.find(s=>s.sourceId==='ap').status,'SOURCE_FAILED');
 assert.equal(r.sources.filter(s=>s.articleVerified===1).length,3);
 assert.equal(r.d1Written,false);assert.equal(r.pcCacheWritten,false);assert.equal(r.schedulerModified,false);
});
