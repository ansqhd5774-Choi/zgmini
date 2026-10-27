import test from 'node:test';
import assert from 'node:assert/strict';
import {IRAN_GOVUK_NEWS_FEEDS} from '../scripts/iran-progress/news-display-discover-r1.mjs';
import {auditGovUkFeedCoverageR23,auditPublishedGovUkBodiesR23}
 from '../scripts/iran-progress/news-display-source-audit-r23.mjs';

const now=Date.parse('2026-10-27T06:00:00Z');
const entry=(slug,updated)=>`<entry><title>${slug}</title><updated>${updated}</updated>`+
 `<link rel="alternate" href="https://www.gov.uk/government/news/${slug}"/></entry>`;
const feed=entries=>`<feed>${entries.join('')}</feed>`;

test('R23 detects second-page results without declaring global completeness',async()=>{
 const requests=[];
 const result=await auditGovUkFeedCoverageR23({now,fetcher:async url=>{
  requests.push(url);
  if(url===IRAN_GOVUK_NEWS_FEEDS[0])
   return new Response(feed(Array.from({length:20},(_,i)=>entry(`iran-topic-${i}`,'2026-10-26T01:00:00Z'))));
  if(url===IRAN_GOVUK_NEWS_FEEDS[0]+'&page=2')
   return new Response(feed(Array.from({length:20},(_,i)=>entry(`iran-older-${i}`,'2026-09-20T01:00:00Z'))));
  if(IRAN_GOVUK_NEWS_FEEDS.includes(url))
   return new Response(feed([entry(`other-${IRAN_GOVUK_NEWS_FEEDS.indexOf(url)}`,'2026-10-26T01:00:00Z')]));
  throw Error('UNEXPECTED_URL');
 }});
 assert.equal(result.status,'COVERAGE_BOUNDARY_OBSERVED');
 assert.equal(result.firstPageUnique,23);
 assert.equal(result.scannedPageUnique,43);
 assert.equal(result.additionalUrls,20);
 assert.equal(result.feeds[0].stopReason,'OLDER_UPDATED_PAGE_BOUNDARY');
 assert.equal(result.completenessProven,false);
 assert.equal(requests.length,5);
 assert.equal(result.d1Written,false);
 assert.equal(result.scoreLedgerModified,false);
});

test('R23 refuses to call an incomplete page fetch fully collected',async()=>{
 const result=await auditGovUkFeedCoverageR23({now,fetcher:async url=>{
  if(url===IRAN_GOVUK_NEWS_FEEDS[0])return new Response(feed(Array.from({length:20},(_,i)=>entry(`iran-topic-${i}`,'2026-10-26T01:00:00Z'))));
  if(url===IRAN_GOVUK_NEWS_FEEDS[0]+'&page=2')return new Response('FAIL',{status:503});
  return new Response(feed([]));
 }});
 assert.equal(result.status,'PARTIAL_SOURCE_FAILURE');
 assert.equal(result.feeds[0].stopReason,'FEED_READ_FAILED');
});

test('R23 treats dropped entries from a full Atom page as incomplete',async()=>{
 const result=await auditGovUkFeedCoverageR23({now,fetcher:async url=>{
  if(url===IRAN_GOVUK_NEWS_FEEDS[0])return new Response(feed([
   ...Array.from({length:19},(_,i)=>entry(`iran-${i}`,'2026-10-26T01:00:00Z')),
   '<entry><title>missing source</title><updated>2026-10-26T01:00:00Z</updated></entry>',
  ]));
  return new Response(feed([]));
 }});
 assert.equal(result.status,'PARTIAL_SOURCE_FAILURE');
 assert.equal(result.feeds[0].stopReason,'FEED_PARSE_PARTIAL');
});

test('R23 independently checks real content existence and first publication',async()=>{
 const items=[
  {source:'GOV.UK',sourceUrl:'https://www.gov.uk/government/news/a',publishedAt:'2026-10-26T01:00:00.000Z'},
  {source:'GOV.UK',sourceUrl:'https://www.gov.uk/government/news/b',publishedAt:'2026-10-26T01:00:00.000Z'},
 ];
 const result=await auditPublishedGovUkBodiesR23({items,fetcher:async url=>{
  const matched=/\/government\/news\/(a|b)$/.exec(url);
  assert.ok(matched);
  return new Response(JSON.stringify({base_path:`/government/news/${matched[1]}`,
   first_published_at:matched[1]==='a'?'2026-10-26T01:00:00Z':'2026-10-25T01:00:00Z',
   description:'Official statement',details:{body:'<p>Officials discussed Iran with Saudi Arabia.</p>'}}));
 }});
 assert.equal(result.checkedCount,2);
 assert.equal(result.bodyAvailable,1);
 assert.equal(result.records[0].topicInBody,true);
 assert.equal(result.records[1].status,'OFFICIAL_METADATA_MISMATCH');
 assert.equal(result.d1Written,false);
});

test('R23 skips unsafe URLs and rejects invalid bounded input',async()=>{
 const result=await auditPublishedGovUkBodiesR23({items:[
  {source:'GOV.UK',sourceUrl:'https://example.com/government/news/story',publishedAt:'2026-10-26T01:00:00.000Z'},
 ],fetcher:async()=>{throw Error('FETCH_MUST_NOT_RUN');}});
 assert.equal(result.records[0].status,'SOURCE_IDENTITY_INVALID');
 await assert.rejects(auditGovUkFeedCoverageR23({now,maxPages:9}),/R23_AUDIT_BOUNDS_INVALID/);
});
