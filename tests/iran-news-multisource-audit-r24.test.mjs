import test from 'node:test';
import assert from 'node:assert/strict';
import {IRAN_GOVUK_R24_TOPIC_FEEDS,IRAN_ALJAZEERA_TOPIC_ARCHIVE_R32,
 IRAN_IAEA_OFFICIAL_HOME_R34,
 IRAN_MULTISOURCE_FEEDS_R24,
 newsR24SourceUrl,parseIranMultisourceFeedR24,
 auditIranMultisourceCollectionR24}
 from '../scripts/iran-progress/news-display-multisource-audit-r24.mjs';

const now=Date.parse('2026-10-27T06:00:00.000Z');
const sourceLinks={
 'iaea-news':'https://www.iaea.org/newscenter/news/iran-statement',
 'iaea-statements':'https://www.iaea.org/newscenter/statements/iran-update',
 'bbc-middle-east':'https://www.bbc.com/news/articles/iran-update',
 aljazeera:'https://www.aljazeera.com/news/2026/10/27/iran-update',
 'un-middle-east':'https://news.un.org/en/story/2026/10/iran-update',
};
const item=(link,title='Iran diplomats meet')=>
 `<item><title>${title}</title><link>${link}</link>`+
 '<pubDate>Tue, 27 Oct 2026 03:00:00 GMT</pubDate></item>';
const rss=entries=>`<rss><channel>${entries.join('')}</channel></rss>`;
const atom=`<feed><entry><title>Iran talks continue</title>`+
 '<updated>2026-10-27T03:00:00Z</updated>'+
 '<link rel="alternate" href="https://www.gov.uk/government/news/iran-talks-continue"/></entry></feed>';
const tasnim='<html><a href="/en/news/2026/10/27/987/iran-ceasefire-talks">Latest</a></html>';
const aljazeeraArchive='<html><a href="/news/2026/10/27/iran-update">Iran topic</a></html>';
const iaeaHomepage='<!doctype html><html><a href="/newscenter/news/new-science">News</a>'+
 '<a href="/newscenter/statements/director-general-statement-to-the-united-nations-security-council">Statement</a></html>';
const bodyFor=id=>id==='govuk'?atom:id==='tasnim'?tasnim:rss([item(sourceLinks[id])]);

test('R24 lists all existing seven sources as unpublished review candidates only',async()=>{
 const fetched=[];
 const result=await auditIranMultisourceCollectionR24({now,fetcher:async url=>{
  fetched.push(url);
  if(url===IRAN_IAEA_OFFICIAL_HOME_R34)return new Response(iaeaHomepage);
  const spec=IRAN_MULTISOURCE_FEEDS_R24.find(feed=>feed.url===url)??
   (IRAN_GOVUK_R24_TOPIC_FEEDS.includes(url)?IRAN_MULTISOURCE_FEEDS_R24.find(feed=>feed.id==='govuk'):
    url===IRAN_ALJAZEERA_TOPIC_ARCHIVE_R32?IRAN_MULTISOURCE_FEEDS_R24.find(feed=>feed.id==='aljazeera'):null);
  assert.ok(spec);
  return new Response(url===IRAN_ALJAZEERA_TOPIC_ARCHIVE_R32?aljazeeraArchive:bodyFor(spec.id));
 }});
 assert.equal(fetched.length,13);
 assert.equal(result.sourceCount,7);
 assert.equal(result.sourcesRead,7);
 assert.equal(result.sourcesFailed,0);
 assert.equal(result.candidatesFound,9);
 assert.equal(result.sources.find(s=>s.sourceId==='govuk').feedUrlsRead,4);
 assert.equal(result.sources.find(s=>s.sourceId==='aljazeera').feedUrlsRead,2);
 assert.equal(result.sources.find(s=>s.sourceId==='iaea-news').feedUrlsRead,2);
 assert.equal(result.sources.find(s=>s.sourceId==='iaea-statements').feedUrlsRead,2);
 assert.equal(result.status,'CANDIDATES_REQUIRE_REVIEW');
 assert.ok(result.candidates.every(c=>c.rightsVerified===false&&
  c.displayEligible===false&&c.originalPublicationVerified===false));
 assert.equal(result.displayEligible,0);
 assert.equal(result.pcCacheWritten,false);
 assert.equal(result.d1Written,false);
 assert.equal(result.scoreLedgerModified,false);
 assert.equal(result.translationModified,false);
 assert.equal(result.candidates.find(c=>c.sourceId==='govuk').feedPublishedAt,null);
 assert.equal(result.candidates.find(c=>c.sourceId==='tasnim').feedPublishedAt,null);
 assert.equal(result.candidates.find(c=>c.sourceId==='tasnim').feedTitle,null);
});

test('R24 does not conceal partial source failure or partial parsing',async()=>{
 const result=await auditIranMultisourceCollectionR24({now,fetcher:async url=>{
  if(url===IRAN_IAEA_OFFICIAL_HOME_R34)return new Response(iaeaHomepage);
  const spec=IRAN_MULTISOURCE_FEEDS_R24.find(feed=>feed.url===url)??
   (IRAN_GOVUK_R24_TOPIC_FEEDS.includes(url)?IRAN_MULTISOURCE_FEEDS_R24.find(feed=>feed.id==='govuk'):
    url===IRAN_ALJAZEERA_TOPIC_ARCHIVE_R32?IRAN_MULTISOURCE_FEEDS_R24.find(feed=>feed.id==='aljazeera'):null);
  if(spec.id==='aljazeera')return new Response('temporarily unavailable',{status:503});
  if(spec.id==='bbc-middle-east')return new Response(rss([
   item(sourceLinks['bbc-middle-east']),item('https://evil.example/article'),
  ]));
  return new Response(bodyFor(spec.id));
 }});
 assert.equal(result.status,'PARTIAL_SOURCE_FAILURE');
 assert.equal(result.sourcesFailed,2);
 assert.equal(result.sources.find(s=>s.sourceId==='aljazeera').status,'SOURCE_FAILED');
 assert.equal(result.sources.find(s=>s.sourceId==='bbc-middle-east').status,'PARSE_PARTIAL');
 assert.equal(result.sources.find(s=>s.sourceId==='bbc-middle-east').parsedEntries,1);
});

test('R34 finds fresh IAEA statements absent from stale RSS through official homepage only',async()=>{
 const url='https://www.iaea.org/newscenter/statements/director-general-statement-to-the-united-nations-security-council';
 const bad='https://evil.test/newscenter/statements/forged';
 const homepage=`<!doctype html><html><a href="/newscenter/statements/director-general-statement-to-the-united-nations-security-council">October 27</a>
 <a href="/newscenter/statements/director-general-statement-to-the-united-nations-security-council">Duplicated</a>
 <a href="${bad}">Untrusted</a><a href="/newscenter/news/another">Wrong section</a>
 <a href="/newscenter/statements/latest?token=bad">Query</a></html>`;
 const parsed=parseIranMultisourceFeedR24('iaea-statements','html',homepage);
 assert.equal(parsed.rawEntries,1);
 assert.deepEqual(parsed.records.map(x=>x.sourceUrl),[url]);
 assert.equal(parsed.records[0].feedPublishedAt,null);
 assert.equal(parsed.records[0].discoveryOrigin,'IAEA_OFFICIAL_HOMEPAGE_UNSCOPED_R34');
 const report=await auditIranMultisourceCollectionR24({now,
  feeds:IRAN_MULTISOURCE_FEEDS_R24.filter(s=>s.id==='iaea-statements'),
  fetcher:async target=>new Response(target===IRAN_IAEA_OFFICIAL_HOME_R34?
   homepage:rss([item(sourceLinks['iaea-statements'],'General update')]))});
 assert.equal(report.sources[0].feedUrlsRead,2);
 assert.equal(report.candidatesFound,1);
 assert.equal(report.candidates[0].sourceUrl,url);
 assert.equal(report.candidates[0].originalPublicationVerified,false);
 assert.equal(report.candidates[0].scopeVerifiedFromArticle,false);
 assert.equal(report.candidates[0].rightsVerified,false);
});

test('R24 deduplicates identical source URLs without conflating independent publishers',async()=>{
 const duplicateFeed=rss([item(sourceLinks['iaea-news']),item(sourceLinks['iaea-news'])]);
 const result=await auditIranMultisourceCollectionR24({now,
  feeds:IRAN_MULTISOURCE_FEEDS_R24.filter(s=>s.id==='iaea-news'),
  fetcher:async url=>new Response(url===IRAN_IAEA_OFFICIAL_HOME_R34?
   '<html><body>No current items</body></html>':duplicateFeed)});
 assert.equal(result.candidatesFound,1);
 assert.equal(result.sources[0].duplicates,1);
 assert.equal(result.sources[0].status,'READ');
});

test('R24 treats one failed GOV.UK topic feed as partial source coverage',async()=>{
 const report=await auditIranMultisourceCollectionR24({now,
  feeds:IRAN_MULTISOURCE_FEEDS_R24.filter(s=>s.id==='govuk'),
  fetcher:async url=>url===IRAN_GOVUK_R24_TOPIC_FEEDS[2]?
   new Response('temporary unavailable',{status:503}):new Response(atom)});
 assert.equal(report.sourcesRead,0);
 assert.equal(report.sourcesFailed,1);
 assert.equal(report.sources[0].status,'SOURCE_PARTIAL');
 assert.equal(report.sources[0].feedUrlsRead,3);
 assert.equal(report.sources[0].feedUrlsFailed,1);
 assert.equal(report.candidatesFound,1);
 assert.equal(report.status,'PARTIAL_SOURCE_FAILURE');
});

test('R24 treats RSS dates as unverified metadata and rejects unsafe links',()=>{
 const parsed=parseIranMultisourceFeedR24('bbc-middle-east','xml',rss([
  item('https://www.bbc.com/news/articles/iran-situation','Saudi and Iran resume talks'),
 ]));
 assert.equal(parsed.rawEntries,1);
 assert.equal(parsed.records[0].feedPublishedAt,'2026-10-27T03:00:00.000Z');
 assert.equal(parsed.records[0].timestampStatus,'FEED_DATE_NOT_ORIGIN_VERIFIED');
 assert.equal(newsR24SourceUrl('bbc-middle-east','https://www.bbc.com.evil.org/news/a'),null);
 assert.equal(newsR24SourceUrl('bbc-middle-east','http://www.bbc.com/news/a'),null);
 assert.equal(newsR24SourceUrl('un-middle-east',
  'https://news.un.org/feed/view/en/story/2026/10/1168654'),
  'https://news.un.org/en/story/2026/10/1168654');
 assert.equal(newsR24SourceUrl('un-middle-east',
  'https://un-news.example/feed/view/en/story/2026/10/1168654'),null);
 assert.equal(newsR24SourceUrl('bbc-middle-east','https://user@www.bbc.com/news/a'),null);
 assert.equal(newsR24SourceUrl('bbc-middle-east','https://www.bbc.com:8080/news/a'),null);
 assert.equal(newsR24SourceUrl('bbc-middle-east','https://www.bbc.com/news/a#test'),null);
 assert.equal(newsR24SourceUrl('iaea-news',
  'http://www.iaea.org/newscenter/news/iran-statement'),
  'https://www.iaea.org/newscenter/news/iran-statement');
 assert.equal(newsR24SourceUrl('bbc-middle-east',
  'https://www.bbc.co.uk/news/iran?at_medium=RSS&at_campaign=rss'),
  'https://www.bbc.co.uk/news/iran');
 assert.equal(newsR24SourceUrl('bbc-middle-east','http://www.bbc.com/news/a'),null);
});

test('R24 reads legitimate HTML doctype and official IAEA http feed links',()=>{
 const html='<!DOCTYPE html><html><a href="/en/news/2026/10/27/987/iran-talks">News</a></html>';
 const tasnimRecord=parseIranMultisourceFeedR24('tasnim','html',html);
 assert.equal(tasnimRecord.rawEntries,1);
 assert.equal(tasnimRecord.records[0].feedPublishedAt,null);
 assert.equal(tasnimRecord.records[0].feedTitle,null);
 const iaeaRecord=parseIranMultisourceFeedR24('iaea-news','xml',
  rss([item('http://www.iaea.org/newscenter/news/iran-statement')]));
 assert.equal(iaeaRecord.records[0].sourceUrl,
  'https://www.iaea.org/newscenter/news/iran-statement');
});

test('R24 supplements Al Jazeera RSS with article URL hints from its official Iran archive',async()=>{
 const archive=`<!doctype html><html><a href="/news/2026/10/27/iran-update">News</a>
 <a href="/news/2026/10/27/iran-update">Duplicate</a>
 <a href="https://evil.test/news/2026/10/27/iran-update">Not accepted</a>
 <a href="/video/2026/10/27/iran-update">Not a text article</a></html>`;
 const parsed=parseIranMultisourceFeedR24('aljazeera','html',archive);
 assert.equal(parsed.rawEntries,1);
 assert.equal(parsed.records[0].feedTitle,null);
 assert.equal(parsed.records[0].sourceUrl,sourceLinks.aljazeera);
 assert.equal(parsed.records[0].feedPublishedAt,null);
 assert.equal(parsed.records[0].timestampStatus,'ARTICLE_DETAIL_AND_FIRST_PUBLICATION_REQUIRED');
 const report=await auditIranMultisourceCollectionR24({now,
  feeds:IRAN_MULTISOURCE_FEEDS_R24.filter(spec=>spec.id==='aljazeera'),
  fetcher:async url=>new Response(url===IRAN_ALJAZEERA_TOPIC_ARCHIVE_R32?archive:rss([]))});
 assert.equal(report.sources[0].feedUrlsRead,2);
 assert.equal(report.sources[0].queuedForReview,1);
 assert.equal(report.candidates[0].scopeVerifiedFromArticle,false);
 assert.equal(report.candidates[0].rightsVerified,false);
});

test('R24 detects a topic in the RSS description even when headline lacks it',async()=>{
 const feed=rss([['<item><title>Regional talks resume</title>',
  '<link>https://www.iaea.org/newscenter/news/regional-talks</link>',
  '<description><![CDATA[<p>Officials discussed Iran and Saudi Arabia.</p>]]></description>',
  '<pubDate>Tue, 27 Oct 2026 03:00:00 GMT</pubDate></item>'].join('')]);
 const report=await auditIranMultisourceCollectionR24({now,
  feeds:IRAN_MULTISOURCE_FEEDS_R24.filter(s=>s.id==='iaea-news'),
  fetcher:async url=>new Response(url===IRAN_IAEA_OFFICIAL_HOME_R34?
   '<html><body>No current items</body></html>':feed)});
 assert.equal(report.sources[0].status,'READ');
 assert.equal(report.candidatesFound,1);
 assert.equal(report.candidates[0].scopeVerifiedFromArticle,false);
});

test('R24 rejects invalid source registries and malicious XML without changing operations',async()=>{
 await assert.rejects(auditIranMultisourceCollectionR24({now,
  feeds:[{id:'unapproved',url:'https://example.com/rss',kind:'xml'}],
  fetcher:async()=>{throw Error('MUST_NOT_FETCH');}}),/R24_SOURCE_REGISTRY_INVALID/);
 assert.throws(()=>parseIranMultisourceFeedR24('iaea-news','xml',
  '<!DOCTYPE rss [<!ENTITY x "attack">]><rss/>'),/R24_FEED_FORMAT_INVALID/);
});
