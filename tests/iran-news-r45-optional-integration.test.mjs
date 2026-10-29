import test from 'node:test';
import assert from 'node:assert/strict';
import {IRAN_DISPLAY_FEEDS_R26,IRAN_DISPLAY_FEEDS_R45_OPTIONAL} from '../scripts/iran-progress/news-display-source-registry-r26.mjs';
import {auditIranMultisourceCollectionR24,newsR24SourceUrl} from '../scripts/iran-progress/news-display-multisource-audit-r24.mjs';
import {auditIranArticleDetailsR25} from '../scripts/iran-progress/news-display-article-audit-r25.mjs';
const now=Date.parse('2026-10-29T05:00:00Z');
const url='https://www.arabnews.com/middle-east/saudi-iran-ceasefire-talks-3008783';
const article='<!doctype html><html><head><meta property="og:title" content="Saudi and Iranian ceasefire talks"/><meta property="article:published_time" content="2026-10-28T07:00:00Z"/></head><body><div class="field-name-body"><p>Saudi and Iranian mediators opened negotiations for a ceasefire and a peace agreement.</p></div></body></html>';
const listing='<!doctype html><html><a href="'+url+'">latest</a><a href="'+url+'">duplicate</a><a href="/account">login</a></html>';
test('R45 preserves the existing seven scheduled private feeds',()=>{
 assert.equal(IRAN_DISPLAY_FEEDS_R26.length,7);
 assert.equal(IRAN_DISPLAY_FEEDS_R45_OPTIONAL.length,1);
 assert.equal(IRAN_DISPLAY_FEEDS_R45_OPTIONAL[0].id,'arabnews');
});
test('R45 optional Arab News discovery and R25 verification are metadata-only',async()=>{
 const fetcher=async target=>{
  if(target==='https://www.arabnews.com/middle-east')return new Response(listing,{status:200});
  if(target===url)return new Response(article,{status:200});
  throw Error('Unexpected request');
 };
 const feed=await auditIranMultisourceCollectionR24({now,feeds:IRAN_DISPLAY_FEEDS_R45_OPTIONAL,fetcher});
 assert.equal(feed.sourceCount,1);
 assert.equal(feed.candidates.length,1);
 assert.equal(feed.sourcesFailed,0);
 assert.equal(feed.candidates[0].originalPublicationVerified,false);
 assert.equal(newsR24SourceUrl('arabnews',url),url);
 const audited=await auditIranArticleDetailsR25({now,feedReport:feed,fetcher});
 assert.equal(audited.metadataReviewed,1);
 assert.equal(audited.articles[0].status,'ARTICLE_METADATA_REVIEWED');
 assert.equal(audited.articles[0].publisherDeclaredPublishedAt,'2026-10-28T07:00:00.000Z');
 assert.equal(audited.articles[0].rightsVerified,false);
 assert.equal(audited.d1Written,false);
 assert.equal(audited.pcCacheWritten,false);
});
test('R45 optional source URL must belong to original publisher article domain',()=>{
 assert.equal(newsR24SourceUrl('arabnews','https://evil.example/middle-east/iran-war-3008783'),null);
 assert.equal(newsR24SourceUrl('arabnews','https://www.arabnews.com/account/login'),null);
});
